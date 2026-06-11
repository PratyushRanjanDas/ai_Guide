import { marked } from 'marked';

export async function initChat() {
  const API_URL = import.meta.env.VITE_API_URL || '';
  console.log("Initializing Full-Screen Study Buddy with History...");

  const sendBtn = document.getElementById('send-btn');
  const input = document.getElementById('chat-input');
  const messagesDiv = document.getElementById('chat-messages');
  const sessionList = document.getElementById('session-list');
  const newChatBtn = document.getElementById('new-chat-btn');
  const micBtn = document.getElementById('mic-btn');
  const attachBtn = document.getElementById('attach-btn');
  const pdfUpload = document.getElementById('pdf-upload');

  const token = localStorage.getItem('token');
  if (!token) {
    console.error("No auth token found, please log in.");
    return;
  }
  let currentSessionId = localStorage.getItem('studySessionId');
  let sessions = [];

  // Init
  await fetchSessions();
  if (!currentSessionId && sessions.length === 0) {
    await createNewSession();
  } else if (!currentSessionId && sessions.length > 0) {
    await switchSession(sessions[0].id);
  } else {
    // We have an ID, make sure it exists, otherwise fallback
    const exists = sessions.find(s => s.id === currentSessionId);
    if (exists) {
      await switchSession(currentSessionId);
    } else if (sessions.length > 0) {
      await switchSession(sessions[0].id);
    } else {
      await createNewSession();
    }
  }

  // Bindings
  newChatBtn.addEventListener('click', createNewSession);
  sendBtn.addEventListener('click', sendMessage);
  input.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') sendMessage();
  });

  // --- PDF Upload Logic ---
  attachBtn.addEventListener('click', () => {
    if (currentSessionId) {
      pdfUpload.click();
    } else {
      alert("Please start a session first!");
    }
  });

  pdfUpload.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    attachBtn.classList.add('active'); // Pulse animation while uploading
    const formData = new FormData();
    formData.append('file', file);

    const loadingId = appendMessage('assistant', `Extracting text from ${file.name}...`);

    try {
      const res = await fetch(`${API_URL}/api/chat/${currentSessionId}/upload`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
      });
      const data = await res.json();
      
      if (data.success) {
        document.getElementById(loadingId).innerHTML = `<strong>Study Buddy</strong><br/>✅ Successfully uploaded and read <em>${file.name}</em>! You can now ask me questions about it.`;
      } else {
        document.getElementById(loadingId).innerHTML = `<strong>Error</strong><br/>Failed to process ${file.name}.`;
      }
    } catch(err) {
      console.error(err);
      document.getElementById(loadingId).innerHTML = `<strong>Error</strong><br/>Upload failed.`;
    } finally {
      attachBtn.classList.remove('active');
      pdfUpload.value = ''; // Reset input
    }
  });

  // --- Voice Interaction (Speech-to-Text) ---
  let recognition = null;
  let isRecording = false;

  if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = true; // Show text instantly as you speak

    recognition.onstart = () => {
      isRecording = true;
      micBtn.classList.add('active');
      input.placeholder = "Listening...";
    };

    recognition.onresult = (event) => {
      let interimTranscript = '';
      let finalTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript;
        } else {
          interimTranscript += event.results[i][0].transcript;
        }
      }
      
      // Inject transcribed text directly into the input box
      input.value = finalTranscript || interimTranscript;
    };

    recognition.onend = () => {
      isRecording = false;
      micBtn.classList.remove('active');
      input.placeholder = "Ask a question about discrete math, history, science...";
      
      // Auto-send if we actually captured speech
      if (input.value.trim().length > 0) {
        sendMessage();
      }
    };

    recognition.onerror = (event) => {
      console.error("Speech recognition error:", event.error);
      isRecording = false;
      micBtn.classList.remove('active');
      input.placeholder = "Ask a question about discrete math, history, science...";
    };

    micBtn.addEventListener('click', () => {
      if (isRecording) {
        recognition.stop();
      } else {
        input.value = '';
        recognition.start();
      }
    });
  } else {
    // Hide mic button if browser doesn't support Web Speech API (like Firefox)
    micBtn.style.display = 'none';
    console.warn("Speech Recognition API is not supported in this browser.");
  }

  // --- Functions ---
  
  async function fetchSessions() {
    try {
      const res = await fetch(`${API_URL}/api/chat`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      sessions = await res.json();
      renderSessionList();
    } catch(err) {
      console.error("Failed to load sessions", err);
    }
  }

  function renderSessionList() {
    sessionList.innerHTML = '';
    sessions.forEach(session => {
      const el = document.createElement('div');
      el.className = `session-item ${session.id === currentSessionId ? 'active' : ''}`;
      el.textContent = session.title;
      el.addEventListener('click', () => switchSession(session.id));
      sessionList.appendChild(el);
    });
  }

  async function switchSession(id) {
    currentSessionId = id;
    localStorage.setItem('studySessionId', id);
    renderSessionList(); // Update active state
    messagesDiv.innerHTML = '<div class="message assistant"><strong>Study Buddy</strong><br/>Loading...</div>';

    try {
      const res = await fetch(`${API_URL}/api/chat/${id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const sessionData = await res.json();
      
      messagesDiv.innerHTML = ''; // Clear loading
      
      if (!sessionData.messages || sessionData.messages.length === 0) {
        // Show default greeting
        appendMessage('assistant', "Hi! I'm your AI Study Buddy. What topic would you like to explore today?");
      } else {
        sessionData.messages.forEach(msg => {
          appendMessage(msg.role.toLowerCase() === 'user' ? 'user' : 'assistant', msg.content);
        });
      }
    } catch(err) {
      console.error("Failed to load session details", err);
      messagesDiv.innerHTML = '<div class="message assistant"><strong>Error</strong><br/>Could not load messages.</div>';
    }
  }

  async function createNewSession() {
    try {
      const res = await fetch(`${API_URL}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ title: "New Chat" })
      });
      const data = await res.json();
      await fetchSessions(); // Refresh list to get new session
      await switchSession(data.id);
    } catch(err) {
      console.error("Failed to create session", err);
    }
  }

  async function sendMessage() {
    const text = input.value.trim();
    if (!text || !currentSessionId) return;

    input.value = '';
    appendMessage('user', text);
    const loadingId = appendMessage('assistant', '...');

    try {
      const response = await fetch(`${API_URL}/api/chat/${currentSessionId}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ content: text })
      });
      const data = await response.json();
      
      const loadingEl = document.getElementById(loadingId);
      if (loadingEl) {
        let contentHtml = marked.parse(data.aiMessage.content);
        loadingEl.innerHTML = `<strong>Study Buddy</strong><div style="margin-top:0.5rem">${contentHtml}</div>`;
        if (window.MathJax) {
          window.MathJax.typesetPromise([loadingEl]).catch(err => console.log(err));
        }
      }

      // Automatically rename the session if it's brand new
      const sessionIndex = sessions.findIndex(s => s.id === currentSessionId);
      if (sessionIndex !== -1 && sessions[sessionIndex].title === 'New Chat') {
        const newTitle = text.length > 25 ? text.substring(0, 25) + '...' : text;
        sessions[sessionIndex].title = newTitle;
        renderSessionList();
        
        // Persist new title to backend
        fetch(`${API_URL}/api/chat/${currentSessionId}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ title: newTitle })
        }).catch(err => console.error("Failed to rename session:", err));
      }

    } catch (error) {
      console.error("Chat error:", error);
      const loadingEl = document.getElementById(loadingId);
      if (loadingEl) loadingEl.innerHTML = `<strong>Error</strong><br/>Failed to get response.`;
    }
  }

  function appendMessage(role, content) {
    const el = document.createElement('div');
    el.className = `message ${role}`;
    el.id = 'msg-' + Date.now() + Math.random().toString(36).substr(2, 9);
    
    if (role === 'assistant' && content !== '...') {
        let contentHtml = marked.parse(content);
        el.innerHTML = `<strong>Study Buddy</strong><div style="margin-top:0.5rem">${contentHtml}</div>`;
        if (window.MathJax) {
            setTimeout(() => window.MathJax.typesetPromise([el]).catch(e => console.log(e)), 10);
        }
    } else if (role === 'assistant' && content === '...') {
        el.innerHTML = `<strong>Study Buddy</strong><div style="margin-top:0.5rem">${content}</div>`;
    } else {
        el.innerHTML = `<strong>You</strong><br/>${content}`;
    }
    
    messagesDiv.appendChild(el);
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
    return el.id;
  }
}
