import { GoogleGenerativeAI } from "@google/generative-ai";
import "dotenv/config";

const apiKey = process.env.GEMINI_API_KEY;

let genAI = null;
if (apiKey) {
  genAI = new GoogleGenerativeAI(apiKey);
} else {
  console.warn("⚠️ GEMINI_API_KEY is not set in the .env file!");
}

// Define the core personality and rules for the AI
const SYSTEM_INSTRUCTION = `
You are a helpful, encouraging, and highly intelligent academic mentor. Your goal is to help the student learn and understand their material as efficiently as possible.
- Provide clear, direct answers and excellent summaries when the student asks for them. Do not force them to guess or use Socratic questioning unless they specifically ask to be quizzed.
- Explain complex concepts simply using analogies.
- Be highly supportive and engaging.
- You are strictly limited to academic and educational topics. If the user tries to talk about video games, movies, pop culture, general chit-chat, or anything unrelated to studying, you MUST firmly refuse to answer and redirect them back to their academic goals.
`;

/**
 * Sends a new message to the Gemini API, taking previous chat history into account.
 * 
 * @param {string} userMessage - The new message from the user
 * @param {Array} previousMessages - Array of previous messages from our database
 * @returns {string} - The AI's response text
 */
export async function getStudyBuddyResponse(userMessage, previousMessages = [], sessionContext = null) {
  if (!genAI) {
    throw new Error("GEMINI_API_KEY is missing from the .env file. Please add it to use the AI features.");
  }

  const model = genAI.getGenerativeModel({
    model: "gemini-2.5-flash",
    systemInstruction: SYSTEM_INSTRUCTION,
  });

  const history = previousMessages.map(msg => ({
    role: msg.role === 'USER' ? 'user' : 'model',
    parts: [{ text: msg.content }]
  }));

  if (sessionContext) {
    history.unshift({
      role: 'user',
      parts: [{ text: `[SYSTEM NOTIFICATION: The user has uploaded the following documents for context. Use them to answer their questions: \n\n${sessionContext}]` }]
    });
    history.splice(1, 0, {
      role: 'model',
      parts: [{ text: `Understood. I have read the uploaded documents and will use them to help the user study.` }]
    });
  }

  let retries = 3;
  let delay = 1000; // 1 second initial delay

  while (retries > 0) {
    try {
      // Start a chat session with the historical context
      const chat = model.startChat({
        history,
      });

      // Send the new message and await the response
      const result = await chat.sendMessage(userMessage);
      const responseText = result.response.text();
      
      return responseText;
    } catch (error) {
      console.error(`Gemini API Error (Retries left: ${retries - 1}):`, error.message || error);
      
      retries -= 1;
      if (retries === 0) {
        throw new Error("Failed to generate AI response after multiple attempts.");
      }
      
      // Wait before retrying (exponential backoff)
      await new Promise(resolve => setTimeout(resolve, delay));
      delay *= 2; // Double the delay
    }
  }
}
