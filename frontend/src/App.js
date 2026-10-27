import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import './App.css';

const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

// Helper to normalize spoken email addresses
function cleanSpokenEmail(raw) {
  if (!raw) return '';
  return raw
    .toLowerCase()
    .replace(/\s+at the rate\s+|\s+at\s+/g, '@')
    .replace(/\s+dot\s+/g, '.')
    .replace(/\s+dash\s+/g, '-')
    .replace(/\s+underscore\s+/g, '_')
    .replace(/\s+/g, '')
    .trim();
}

function App() {
  const [credentials, setCredentials] = useState({ email: '', password: '' });
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isVerifyingLogin, setIsVerifyingLogin] = useState(false);
  const [loginError, setLoginError] = useState('');

  const [listeningFor, setListeningFor] = useState(null);
  const [statusMessage, setStatusMessage] = useState('Ready');
  const [isSpeaking, setIsSpeaking] = useState(false);

  const [emails, setEmails] = useState([]);
  const [isLoadingEmails, setIsLoadingEmails] = useState(false);
  const [readingEmailIndex, setReadingEmailIndex] = useState(null);

  const [formData, setFormData] = useState({ recipient: '', subject: '', body: '' });
  const [isSending, setIsSending] = useState(false);

  const recognitionRef = useRef(null);
  const readingQueueRef = useRef({ cancelled: false });

  // Text-To-Speech helper
  const speak = (text, onEndCallback = null) => {
    if (!('speechSynthesis' in window)) {
      setStatusMessage(text);
      if (onEndCallback) onEndCallback();
      return;
    }

    window.speechSynthesis.cancel();
    setIsSpeaking(true);
    setStatusMessage(`Speaking: "${text}"`);

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.95;

    utterance.onend = () => {
      setIsSpeaking(false);
      if (onEndCallback) {
        onEndCallback();
      }
    };

    utterance.onerror = (e) => {
      setIsSpeaking(false);
      console.warn("SpeechSynthesis error:", e);
      if (onEndCallback) {
        onEndCallback();
      }
    };

    window.speechSynthesis.speak(utterance);
  };

  const stopSpeaking = () => {
    readingQueueRef.current.cancelled = true;
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    setIsSpeaking(false);
    setReadingEmailIndex(null);
    setStatusMessage("Speech stopped.");
  };

  // Welcome announcement on initial load
  useEffect(() => {
    speak("Welcome to the Voice Based Email System. Please log in using your email and app password.");

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        stopSpeaking();
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  // Voice input recognition helper
  const startVoiceInput = (field) => {
    if (!SpeechRecognition) {
      const msg = "Speech recognition is not supported in this browser. Please use Google Chrome or Microsoft Edge.";
      speak(msg);
      alert(msg);
      return;
    }

    // Stop ongoing recognition if any
    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort();
      } catch (err) {
        // ignore
      }
    }

    const fieldLabels = {
      loginEmail: 'email address',
      loginPassword: 'app password',
      recipient: 'recipient email',
      subject: 'email subject',
      body: 'message body'
    };

    const friendlyName = fieldLabels[field] || field;

    // Prompt user FIRST via TTS, and ONLY start microphone after TTS finishes speaking
    speak(`Listening for ${friendlyName}. Speak now.`, () => {
      try {
        const recognition = new SpeechRecognition();
        recognition.lang = 'en-US';
        recognition.interimResults = false;
        recognition.maxAlternatives = 1;
        recognitionRef.current = recognition;

        setListeningFor(field);
        setStatusMessage(`Microphone active: Speak ${friendlyName}...`);

        recognition.onresult = (event) => {
          let transcript = event.results[0][0].transcript || '';
          transcript = transcript.trim();

          if (field === 'loginEmail' || field === 'recipient') {
            transcript = cleanSpokenEmail(transcript);
          } else if (field === 'loginPassword') {
            transcript = transcript.replace(/\s+/g, '');
          }

          if (field === 'loginEmail') {
            setCredentials((prev) => ({ ...prev, email: transcript }));
          } else if (field === 'loginPassword') {
            setCredentials((prev) => ({ ...prev, password: transcript }));
          } else if (field === 'recipient' || field === 'subject' || field === 'body') {
            setFormData((prev) => ({ ...prev, [field]: transcript }));
          }

          setListeningFor(null);
          speak(`Captured ${friendlyName}: ${transcript}`);
        };

        recognition.onerror = (event) => {
          console.warn("Speech recognition error:", event.error);
          setListeningFor(null);
          if (event.error !== 'aborted') {
            speak(`Sorry, could not catch that for ${friendlyName}. Please try again or type directly.`);
          }
        };

        recognition.onend = () => {
          setListeningFor(null);
        };

        recognition.start();
      } catch (e) {
        console.error("Failed to start speech recognition:", e);
        setListeningFor(null);
        speak("Could not access microphone.");
      }
    });
  };

  // Test and log in
  const handleLogin = async (e) => {
    if (e) e.preventDefault();
    setLoginError('');

    if (!credentials.email || !credentials.password) {
      const err = "Please enter both Email and App Password.";
      setLoginError(err);
      speak(err);
      return;
    }

    setIsVerifyingLogin(true);
    speak("Verifying credentials with email server...");

    try {
      const response = await axios.post('http://localhost:5000/api/read-emails', {
        email: credentials.email,
        password: credentials.password,
        limit: 1
      });

      if (response.data.status === 'success') {
        setIsLoggedIn(true);
        speak("Logged in successfully. Welcome to your voice email dashboard.");
      } else {
        const msg = response.data.message || "Failed to log in. Check your credentials.";
        setLoginError(msg);
        speak(msg);
      }
    } catch (err) {
      const msg = err.response?.data?.message || "Could not connect to backend server. Make sure the backend is running.";
      setLoginError(msg);
      speak(msg);
    } finally {
      setIsVerifyingLogin(false);
    }
  };

  const handleQuickLogin = () => {
    if (!credentials.email || !credentials.password) {
      const err = "Please enter both Email and App Password.";
      setLoginError(err);
      speak(err);
      return;
    }
    setIsLoggedIn(true);
    speak("Logged in without verification. You can fetch emails or compose a message.");
  };

  const handleLogout = () => {
    stopSpeaking();
    setIsLoggedIn(false);
    setEmails([]);
    setFormData({ recipient: '', subject: '', body: '' });
    speak("You have logged out.");
  };

  // Fetch Emails
  const handleFetchEmails = async () => {
    stopSpeaking();
    setIsLoadingEmails(true);
    speak("Fetching your latest emails from server.");

    try {
      const response = await axios.post('http://localhost:5000/api/read-emails', {
        email: credentials.email,
        password: credentials.password,
        limit: 5
      });

      if (response.data.status === 'success') {
        const fetched = response.data.emails || [];
        setEmails(fetched);
        if (fetched.length === 0) {
          speak("Inbox is empty. No emails found.");
        } else {
          speak(`Fetched ${fetched.length} emails successfully. Click Read Emails Aloud to listen to them.`);
        }
      } else {
        const msg = response.data.message || "Failed to fetch emails.";
        speak(msg);
      }
    } catch (err) {
      const msg = err.response?.data?.message || "Error connecting to server to fetch emails.";
      speak(msg);
    } finally {
      setIsLoadingEmails(false);
    }
  };

  // Send Email
  const handleSendEmail = async (e) => {
    if (e) e.preventDefault();
    stopSpeaking();

    if (!formData.recipient) {
      speak("Please provide a recipient email address.");
      return;
    }

    setIsSending(true);
    speak("Sending email now.");

    try {
      const response = await axios.post('http://localhost:5000/api/send-email', {
        ...credentials,
        ...formData
      });

      if (response.data.status === 'success') {
        speak("Email sent successfully!");
        setFormData({ recipient: '', subject: '', body: '' });
      } else {
        const msg = response.data.message || "Failed to send email.";
        speak(msg);
      }
    } catch (err) {
      const msg = err.response?.data?.message || "Error occurred while sending email.";
      speak(msg);
    } finally {
      setIsSending(false);
    }
  };

  // Sequential readout of emails
  const readOutEmails = () => {
    stopSpeaking();
    if (emails.length === 0) {
      speak("No emails to read. Please fetch your emails first.");
      return;
    }

    readingQueueRef.current.cancelled = false;

    const readIndex = (idx) => {
      if (readingQueueRef.current.cancelled || idx >= emails.length) {
        setReadingEmailIndex(null);
        if (!readingQueueRef.current.cancelled && idx >= emails.length) {
          speak("Finished reading all emails.");
        }
        return;
      }

      setReadingEmailIndex(idx);
      const mail = emails[idx];
      const mailText = `Email ${idx + 1} of ${emails.length}. From ${mail.sender}. Subject: ${mail.subject}. Content: ${mail.body || 'No text content'}.`;

      speak(mailText, () => {
        if (!readingQueueRef.current.cancelled) {
          setTimeout(() => {
            readIndex(idx + 1);
          }, 800);
        }
      });
    };

    readIndex(0);
  };

  const readSingleEmail = (mail, idx) => {
    stopSpeaking();
    setReadingEmailIndex(idx);
    const mailText = `Email from ${mail.sender}. Subject: ${mail.subject}. Content: ${mail.body || 'No text content'}`;
    speak(mailText, () => {
      setReadingEmailIndex(null);
    });
  };

  return (
    <div className="container">
      <header>
        <h1>Voice-Based Email System</h1>
        <p className="subtitle">Voice-assisted accessibility email client for everyone</p>

        {/* Global Voice Status Indicator */}
        <div className={`status-bar ${listeningFor ? 'listening' : ''} ${isSpeaking ? 'speaking' : ''}`}>
          <div className="status-text">
            {listeningFor && <span>🎙️ <strong>Listening for {listeningFor}...</strong></span>}
            {!listeningFor && isSpeaking && <span>🔊 <strong>Reading aloud...</strong></span>}
            {!listeningFor && !isSpeaking && <span>⚡ {statusMessage}</span>}
          </div>
          <div className="status-actions">
            {isSpeaking && (
              <button className="btn-small danger" onClick={stopSpeaking} title="Press Escape to stop">
                ⏹️ Stop Speech (Esc)
              </button>
            )}
          </div>
        </div>
      </header>

      {!isLoggedIn ? (
        <div className="card">
          <h2>Login to Your Email</h2>

          <div className="info-box">
            <p><strong>Note for Gmail users:</strong></p>
            <p>1. Enable 2-Step Verification in your Google Account security settings.</p>
            <p>2. Generate an <strong>App Password</strong> (16 letters) and use it below instead of your normal account password.</p>
          </div>

          {loginError && <div className="error-banner">{loginError}</div>}

          <form onSubmit={handleLogin}>
            <div className="form-group">
              <label htmlFor="login-email">Your Email Address:</label>
              <div className="input-with-button">
                <input
                  id="login-email"
                  type="email"
                  placeholder="e.g. user@gmail.com"
                  value={credentials.email}
                  onChange={(e) => setCredentials({ ...credentials, email: e.target.value })}
                  required
                />
                <button
                  type="button"
                  className={`voice-btn ${listeningFor === 'loginEmail' ? 'active' : ''}`}
                  onClick={() => startVoiceInput('loginEmail')}
                  title="Speak your email"
                >
                  🎙️ Speak
                </button>
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="login-password">App Password (16 characters):</label>
              <div className="input-with-button">
                <input
                  id="login-password"
                  type="password"
                  placeholder="16-character app password"
                  value={credentials.password}
                  onChange={(e) => setCredentials({ ...credentials, password: e.target.value })}
                  required
                />
                <button
                  type="button"
                  className={`voice-btn ${listeningFor === 'loginPassword' ? 'active' : ''}`}
                  onClick={() => startVoiceInput('loginPassword')}
                  title="Speak password"
                >
                  🎙️ Speak
                </button>
              </div>
            </div>

            <div className="button-row">
              <button type="submit" className="primary" disabled={isVerifyingLogin}>
                {isVerifyingLogin ? "Verifying..." : "Verify & Log In"}
              </button>
              <button type="button" className="secondary" onClick={handleQuickLogin}>
                Quick Log In
              </button>
            </div>
          </form>
        </div>
      ) : (
        <div className="dashboard">
          <div className="dashboard-header">
            <div className="user-badge">
              Logged in as: <strong>{credentials.email}</strong>
            </div>
            <button className="btn-small secondary" onClick={handleLogout}>
              Log Out
            </button>
          </div>

          {/* Compose Email Card */}
          <div className="card">
            <h2>Compose Email</h2>
            <form onSubmit={handleSendEmail}>
              <div className="form-group">
                <label htmlFor="recipient">Recipient Email:</label>
                <div className="input-with-button">
                  <input
                    id="recipient"
                    type="email"
                    placeholder="recipient@example.com"
                    value={formData.recipient}
                    onChange={(e) => setFormData({ ...formData, recipient: e.target.value })}
                    required
                  />
                  <button
                    type="button"
                    className={`voice-btn ${listeningFor === 'recipient' ? 'active' : ''}`}
                    onClick={() => startVoiceInput('recipient')}
                  >
                    🎙️ Speak
                  </button>
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="subject">Subject:</label>
                <div className="input-with-button">
                  <input
                    id="subject"
                    type="text"
                    placeholder="Email subject..."
                    value={formData.subject}
                    onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                    required
                  />
                  <button
                    type="button"
                    className={`voice-btn ${listeningFor === 'subject' ? 'active' : ''}`}
                    onClick={() => startVoiceInput('subject')}
                  >
                    🎙️ Speak
                  </button>
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="body">Message Body:</label>
                <div className="input-with-button">
                  <textarea
                    id="body"
                    placeholder="Speak or type your message here..."
                    value={formData.body}
                    onChange={(e) => setFormData({ ...formData, body: e.target.value })}
                    rows="4"
                    required
                  />
                  <button
                    type="button"
                    className={`voice-btn ${listeningFor === 'body' ? 'active' : ''}`}
                    onClick={() => startVoiceInput('body')}
                  >
                    🎙️ Speak
                  </button>
                </div>
              </div>

              <div className="button-row">
                <button type="submit" className="primary" disabled={isSending}>
                  {isSending ? "Sending..." : "📤 Send Email"}
                </button>
                <button
                  type="button"
                  className="secondary"
                  onClick={() => setFormData({ recipient: '', subject: '', body: '' })}
                >
                  Clear Form
                </button>
              </div>
            </form>
          </div>

          {/* Inbox Controls Card */}
          <div className="card">
            <h2>Inbox Controls</h2>
            <div className="button-row">
              <button onClick={handleFetchEmails} disabled={isLoadingEmails}>
                {isLoadingEmails ? "Fetching..." : "📥 Fetch Recent Emails"}
              </button>
              <button className="secondary" onClick={readOutEmails} disabled={emails.length === 0}>
                🔊 Read All Aloud
              </button>
              {isSpeaking && (
                <button className="danger" onClick={stopSpeaking}>
                  ⏹️ Stop Speech
                </button>
              )}
            </div>

            <div className="email-list">
              {emails.length === 0 ? (
                <p style={{ color: '#888', fontStyle: 'italic', textAlign: 'center', marginTop: '20px' }}>
                  No emails loaded. Click "Fetch Recent Emails" to retrieve messages from your inbox.
                </p>
              ) : (
                emails.map((mail, idx) => (
                  <div
                    key={mail.id || idx}
                    className={`email-item ${readingEmailIndex === idx ? 'reading' : ''}`}
                  >
                    <div className="email-item-header">
                      <div className="email-sender">From: {mail.sender}</div>
                      <button
                        className="btn-small voice-btn"
                        onClick={() => readSingleEmail(mail, idx)}
                        title="Read this email aloud"
                      >
                        🔊 Read Aloud
                      </button>
                    </div>
                    <div className="email-subject">Subject: {mail.subject}</div>
                    <p className="email-body">{mail.body || '(No body text)'}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
