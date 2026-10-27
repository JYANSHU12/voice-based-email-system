# Voice-Based Email System for Visually Challenged People

An accessible, voice-guided web application designed to empower visually challenged and elderly individuals to send, receive, and listen to emails independently using intuitive speech commands and text-to-speech (TTS) audio feedback.

---

## 📌 Problem Statement & Objectives

### The Problem
Traditional email clients rely on complex graphical interfaces, dense text layouts, and precise mouse/keyboard interactions. For visually impaired individuals or elderly users with declining eyesight, navigating these platforms is cumbersome, frustrating, and often impossible without third-party assistance, compromising personal privacy and independence.

### Project Objectives
- **Empower Independence:** Provide an assistive email management tool operable via voice and auditory prompts.
- **Natural Dictation:** Enable users to dictate email addresses, subjects, and email contents using natural speech recognition.
- **Auditory Feedback:** Automatically read system prompts, status updates, and received inbox messages aloud using clear text-to-speech synthesis.
- **Secure Communication:** Support secure SMTP and IMAP connections using Gmail App Passwords, keeping user authentication safe without persisting credentials on servers.

---

## 🚀 Key Features

- 🎙️ **Voice-Driven Navigation & Input:**
  - Integrated with the **Web Speech API** (`SpeechRecognition` / `webkitSpeechRecognition`).
  - Intelligent email normalization (`cleanSpokenEmail`) converts spoken phrases (e.g., *"john at the rate gmail dot com"*) into standardized email formatting (`john@gmail.com`).
- 🔊 **Comprehensive Text-to-Speech (TTS):**
  - Integrated with the **SpeechSynthesis API** (`window.speechSynthesis`).
  - Auditory prompts welcome the user, announce active microphone states, and confirm captured speech.
  - Instant speech cancellation with the `Escape` key.
- 📬 **Inbox Reading Aloud:**
  - Retrieves the latest emails using secure **IMAP4_SSL**.
  - Decodes complex MIME structures, handles diverse character sets, and strips HTML markup into clean, readable text.
  - Reads sender details, subjects, and email bodies out loud sequentially.
- ✉️ **Voice-Assisted Email Composition & Sending:**
  - Dictate recipient address, subject line, and body message via voice or manual input.
  - Dispatches emails reliably using secure **SMTP with STARTTLS**.
- ♿ **Accessible UI/UX Design:**
  - High-contrast color palette with large accessible buttons and keyboard navigation.
  - Animated pulsing audio indicators when listening or reading aloud.
  - Real-time status banner for users with partial vision.

---

## 🛠️ Technologies & Libraries

### Frontend
- **Framework:** React 18.2.0
- **HTTP Client:** Axios 1.6.7
- **Speech APIs:**
  - `SpeechRecognition` / `webkitSpeechRecognition` (Speech-to-Text)
  - `SpeechSynthesisUtterance` / `window.speechSynthesis` (Text-to-Speech)
- **Styling:** Custom accessible CSS with high-contrast elements and CSS keyframe animations.

### Backend
- **Framework:** Python 3 (Flask 3.0.2)
- **CORS Support:** Flask-CORS 4.0.0
- **Environment Management:** python-dotenv 1.0.1
- **Protocols & Built-in Modules:**
  - `smtplib`: SMTP protocol client with STARTTLS support.
  - `imaplib`: IMAP4 protocol client with SSL/TLS encryption.
  - `email`: RFC 822/2822 email message parsing, MIME multipart generation, and header decoding.
  - `re`: Regular expressions for HTML tag sanitization and speech normalization.

---

## 📂 Project Structure

```text
voice-email-system/
├── backend/
│   ├── app.py                  # Flask REST API endpoints (/api/send-email, /api/read-emails, /api/health)
│   ├── email_service.py        # Core email handler (SMTP sending, IMAP fetching, MIME decoding)
│   └── requirements.txt        # Backend Python dependencies
├── frontend/
│   ├── public/
│   │   └── index.html          # HTML entry point with metadata and root element
│   ├── src/
│   │   ├── App.css             # High-contrast, accessible styling & animations
│   │   ├── App.js              # Main React component (Speech recognition, TTS, and state management)
│   │   └── index.js            # React DOM mounting
│   └── package.json            # Frontend dependencies and npm scripts
├── .env.example                # Sample environment configuration template
├── .gitignore                  # Git ignore rules for Python, Node, OS, and secret files
└── README.md                   # Comprehensive project documentation
```

---

## ⚙️ Prerequisites

Before running the application, make sure you have the following installed:

1. **Python 3.9+** ([Download Python](https://www.python.org/downloads/))
2. **Node.js 18+ & npm** ([Download Node.js](https://nodejs.org/))
3. **Google Chrome** or **Microsoft Edge** (Required for Web Speech API speech recognition support)
4. **Google Account with 2-Step Verification:**
   - Standard Google account passwords will not work due to Google security policies.
   - You must generate a 16-character **Google App Password**.

---

## 🔐 Gmail App Password Setup

To send and read emails securely with Gmail:

1. Go to your **Google Account Security Settings**: [https://myaccount.google.com/security](https://myaccount.google.com/security).
2. Ensure **2-Step Verification** is turned **ON**.
3. Under *2-Step Verification*, scroll down to **App Passwords** (or search for "App passwords" in the search bar).
4. Create an app name (e.g., `Voice Email System`) and click **Create**.
5. Copy the generated 16-character passcode (e.g., `abcd efgh ijkl mnop`).
6. Enable IMAP in your Gmail account:
   - Open Gmail in your browser -> **Settings (gear icon)** -> **See all settings** -> **Forwarding and POP/IMAP** -> Select **Enable IMAP** -> Click **Save Changes**.
7. Use your full email address and this 16-character passcode when logging into the application.

---

## 📥 Installation & Setup

### 1. Clone the Repository
```bash
git clone https://github.com/<your-username>/voice-based-email-system.git
cd voice-based-email-system
```

### 2. Configure Environment Variables (Optional)
Copy the example environment file:
```bash
cp .env.example .env
```
*(The defaults are already configured for localhost:5000 and Gmail SMTP/IMAP).*

---

### 3. Backend Setup

Navigate to the `backend` directory:
```bash
cd backend
```

Create and activate a virtual environment:
- **Windows (PowerShell):**
  ```powershell
  python -m venv .venv
  .venv\Scripts\Activate.ps1
  ```
- **macOS / Linux:**
  ```bash
  python3 -m venv .venv
  source .venv/bin/activate
  ```

Install dependencies:
```bash
pip install -r requirements.txt
```

Start the Flask server:
```bash
python app.py
```
*The backend API will run on `http://localhost:5000`.*

---

### 4. Frontend Setup

Open a new terminal window and navigate to the `frontend` directory:
```bash
cd frontend
```

Install Node dependencies:
```bash
npm install
```

Start the React development server:
```bash
npm start
```
*The web interface will automatically open in your browser at `http://localhost:3000`.*

---

## 🗣️ How It Works

### 1. Voice Recognition Workflow
```
[User clicks Speak / Dictate]
         │
         ▼
[Text-To-Speech prompts: "Listening for..."]
         │
         ▼
[Microphone turns ON (Web Speech API)]
         │
         ▼
[Transcript captured & normalized] ──> [Email syntax formatting (cleanSpokenEmail)]
         │
         ▼
[Input field populated & auditory confirmation spoken]
```

### 2. Text-to-Speech Auditory Workflow
- **Welcome Message:** Automatically announces instructions when the page loads.
- **Action Confirmation:** Confirms every button press, form field entry, and server response with spoken audio.
- **Email Dictation:** Reads out each field after capture to let visually impaired users verify input before sending.
- **Interruption Support:** Pressing the `Escape` key immediately stops ongoing speech playback.

### 3. Email Sending & Fetching
- **Sending (`/api/send-email`):** Connects to `smtp.gmail.com:587`, establishes a TLS handshake, authenticates with your App Password, and transmits MIME multipart messages.
- **Reading (`/api/read-emails`):** Establishes an SSL session with `imap.gmail.com:993`, fetches the latest unread or recent messages, extracts decoded headers, strips HTML tags, and returns JSON-formatted email objects to the frontend.

---

## 🖼️ Application Preview

*(Screenshots will be added here)*

| Login Screen | Voice Dashboard | Email Reading |
| :---: | :---: | :---: |
| ![Login Screen Placeholder](https://via.placeholder.com/400x250?text=Voice+Login+Screen) | ![Dashboard Placeholder](https://via.placeholder.com/400x250?text=Voice+Email+Dashboard) | ![Inbox Reader Placeholder](https://via.placeholder.com/400x250?text=Voice+Inbox+Reader) |

---

## 🔮 Future Enhancements

- 🌐 **Multi-Language Support:** Expand speech recognition and synthesis to support Spanish, French, Hindi, and other regional languages.
- 🤖 **AI Email Summarization:** Integrate LLMs to summarize lengthy email chains into quick, concise audio summaries.
- 📎 **Voice Attachment Handling:** Add voice-guided file attachment and download capabilities.
- 🎙️ **Full Voice-Controlled Wake Word:** Introduce continuous hotword detection (e.g., *"Hey Assistant, check my mail"*) for hands-free operation.

---

## 📄 License

This project is licensed under the [MIT License](LICENSE) - see the LICENSE file for details.
