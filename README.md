# AI Study Buddy & Productivity Platform (AIG)

A highly interactive, AI-driven full-stack web application designed to act as a centralized, intelligent workspace for students. 


## Overview
Traditional digital learning tools often lack interactivity, forcing students to manually search through lengthy PDF documents to find answers. This project solves that by integrating a conversational AI tutor directly into your study workflow. 

Users can create secure accounts, organize study sessions by subject, and upload course materials (like PDFs). The AI comprehends these uploaded documents and acts as a contextual tutor, providing instant summaries, analogies, and direct answers without ever leaving the study environment.

## Key Features
* **Intelligent PDF Context**: Upload your textbooks and notes. The AI automatically extracts the text and uses it as grounded context for your conversation.
* **Conversational AI Tutor**: Powered by the Google Gemini 2.5 Flash model, acting as an interactive Socratic tutor or a direct study assistant based on your prompt preferences.
* **Secure Authentication**: Full user verification system utilizing JSON Web Tokens (JWT) and `bcryptjs` password hashing.
* **Rich Markdown & Math Support**: Beautifully renders AI responses using `marked` and MathJax for complex LaTeX mathematical equations.
* **Voice Interaction**: Built-in Web Speech API support allows you to ask questions hands-free using your microphone.
* **Premium Glassmorphism UI**: A distraction-free, modern, dark-themed aesthetic.

## Tech Stack
* **Frontend**: HTML5, Vanilla CSS (Glassmorphism design), JavaScript (ES6+), Vite build tool.
* **Backend**: Node.js, Express.js.
* **Database**: MySQL managed via Prisma ORM.
* **AI Integration**: `@google/generative-ai` SDK.
* **Authentication**: `jsonwebtoken`, `bcryptjs`.
* **File Processing**: `multer`, `pdf-parse`.

## Getting Started

### Prerequisites
* Node.js (v18 or higher)
* MySQL Database
* Google Gemini API Key

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/PratyushRanjanDas/ai_Guide.git
   cd ai_Guide
   ```

2. **Setup the Backend**
   ```bash
   cd Backend
   npm install
   
   # Create a .env file based on the environment variables needed:
   # DATABASE_URL="mysql://user:password@localhost:3306/study_buddy"
   # GEMINI_API_KEY="your_google_api_key"
   # JWT_SECRET="your_secure_random_string"
   
   npx prisma generate
   npx prisma db push
   npm run dev
   ```

3. **Setup the Frontend**
   ```bash
   cd ../Frontend
   npm install
   npm run dev
   ```

4. **Open in Browser**
   Navigate to `http://localhost:5173` (or the port Vite provides) to start studying!

## Architecture
The system follows a client-server model. The frontend handles the interactive UI and communicates with the Node.js REST API. The backend processes PDF uploads in-memory, updates the MySQL database via Prisma, and orchestrates calls to the Gemini LLM by injecting the user's chat history and PDF context into the prompt structure.

## Future Scope
* Multi-modal support (images, audio lectures).
* Automated quiz generation from PDFs.
* Calendar and task integration.
* Peer collaboration and sharing.
