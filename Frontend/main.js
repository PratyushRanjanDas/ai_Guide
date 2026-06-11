import './style.css';
import { initChat } from './src/chat.js';

const appEl = document.querySelector('#app');

function renderAuth() {
  appEl.innerHTML = `
    <div class="auth-container glass-panel">
      <div class="auth-box">
        <h1 class="auth-title">Welcome to AI Study Buddy</h1>
        <p class="auth-subtitle">Log in or sign up to continue</p>
        
        <form id="auth-form" class="auth-form">
          <input type="text" id="auth-name" placeholder="Your Name (for signup only)" style="display: none;" />
          <input type="email" id="auth-email" placeholder="Email" required />
          <input type="password" id="auth-password" placeholder="Password" required />
          <button type="submit" class="btn btn-full">Log In</button>
        </form>
        
        <div class="auth-toggle">
          <p>Don't have an account? <a href="#" id="toggle-auth">Sign Up</a></p>
        </div>
        <p id="auth-error" class="error-msg"></p>
      </div>
    </div>
  `;

  let isLogin = true;
  const form = document.getElementById('auth-form');
  const nameInput = document.getElementById('auth-name');
  const toggleBtn = document.getElementById('toggle-auth');
  const errorMsg = document.getElementById('auth-error');
  const submitBtn = form.querySelector('button[type="submit"]');
  const toggleText = document.querySelector('.auth-toggle p');

  toggleBtn.addEventListener('click', (e) => {
    e.preventDefault();
    isLogin = !isLogin;
    nameInput.style.display = isLogin ? 'none' : 'block';
    if (!isLogin) nameInput.required = true;
    else nameInput.required = false;
    
    submitBtn.textContent = isLogin ? 'Log In' : 'Sign Up';
    toggleText.innerHTML = isLogin 
      ? `Don't have an account? <a href="#" id="toggle-auth">Sign Up</a>` 
      : `Already have an account? <a href="#" id="toggle-auth">Log In</a>`;
      
    // Re-attach listener
    document.getElementById('toggle-auth').addEventListener('click', arguments.callee);
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    errorMsg.textContent = "";
    const email = document.getElementById('auth-email').value;
    const password = document.getElementById('auth-password').value;
    const name = nameInput.value;

    const endpoint = isLogin ? '/api/auth/login' : '/api/auth/register';
    const body = isLogin ? { email, password } : { name, email, password };

    try {
      const res = await fetch(`http://localhost:5001${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      const data = await res.json();
      if (res.ok) {
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        renderApp();
      } else {
        errorMsg.textContent = data.error || "Authentication failed.";
      }
    } catch (err) {
      errorMsg.textContent = "Server error. Please try again.";
    }
  });
}

export function renderApp() {
  appEl.innerHTML = `
    <div class="app-layout">
      <aside class="sidebar glass-panel">
        <button id="new-chat-btn" class="btn btn-full">+ New Chat</button>
        <div id="session-list" class="session-list">
          <div class="session-item">Loading history...</div>
        </div>
        <div class="sidebar-footer">
          <button id="logout-btn" class="btn btn-full btn-danger">Log Out</button>
        </div>
      </aside>
      
      <div class="main-content">
        <header class="app-header">
          <h1>AI Study Buddy</h1>
          <p>Your dedicated, full-screen study companion.</p>
        </header>
        
        <main class="chat-container glass-panel">
          <div class="chat-messages" id="chat-messages">
            <!-- Messages will be injected here -->
          </div>
          
          <div class="chat-input-area">
            <input type="file" id="pdf-upload" accept="application/pdf" style="display: none;" />
            <button id="attach-btn" class="btn mic-btn" title="Upload PDF Notes">📎</button>
            <button id="mic-btn" class="btn mic-btn" title="Click to speak">🎤</button>
            <input type="text" id="chat-input" placeholder="Ask a question about discrete math, history, science..." autocomplete="off" />
            <button id="send-btn" class="btn">Send</button>
          </div>
        </main>
      </div>
    </div>
  `;

  // Handle Logout
  document.getElementById('logout-btn').addEventListener('click', () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    renderAuth();
  });

  // Initialize the Chat logic on the new DOM structure
  initChat();
}

// Initial Routing
if (localStorage.getItem('token')) {
  renderApp();
} else {
  renderAuth();
}
