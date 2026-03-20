# 🔒 VaultClip

![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)
![Build](https://img.shields.io/badge/build-passing-brightgreen.svg)
![AI Powered](https://img.shields.io/badge/AI-Google%20Gemini-orange.svg)

**Secure. Fast. Burn-After-Reading.** VaultClip is a highly secure, full-stack web application designed for sharing sensitive text and files. Engineered with a "Zero-Trace" philosophy, it allows users to share data that self-destructs after being read or after a set time limit. 

Enhanced with **Google Gemini 2.5 AI**, VaultClip not only secures your data but also smartly processes it through Text Summarization, Code Explanation, and Image OCR.

---

## 🚀 Core Features

### 🛡️ Security & Privacy
* **Burn-After-Reading:** Data is permanently wiped from the database the moment it is accessed by the receiver.
* **Time-Bomb Expiry:** Option to set self-destruct timers (1 Hour or 24 Hours) for delayed viewing.
* **Password Protection:** Add an optional secondary layer of password encryption to locked vaults.
* **Automated Cleanup:** Ephemeral disk management ensures server storage is never cluttered with old files.

### 🧠 AI Integrations (Powered by Google Gemini)
* **Smart Image OCR:** Instantly extract copyable text from uploaded images (JPG, PNG) using Gemini Vision.
* **Code Formatter & Explainer:** Automatically detects code snippets and formats them. Users can ask AI to explain or debug the code in one click.
* **Text Summarization:** One-click AI insights for long, sensitive documents or text dumps.

### ⚡ Premium UI/UX
* **Live Countdown Timers:** Receivers see a live ticking clock (e.g., `⏳ 0h 59m 59s`) for time-restricted files.
* **Progressive Upload Bar:** Smooth, real-time progress indicators for large file uploads.
* **Smart Drag & Drop:** Intuitive drop zones with automatic file-type detection and icon rendering.
* **Local Vault History:** Browser-based local storage keeps track of recent pins and links, allowing users to clear history or remove individual logs instantly.
* **Cold-Start Optimization:** An "Invisible Wake-up Call" automatically pings the backend the moment the frontend loads, eliminating cloud server sleep delays.

---

## 💻 Tech Stack

**Frontend (Client-Side):**
* **Framework:** React.js (Vite)
* **Styling:** Tailwind CSS (Dark/Light Mode)
* **Animations:** Canvas-Confetti
* **Hosting:** Vercel (Global Edge CDN)

**Backend (Server-Side):**
* **Runtime:** Node.js & Express.js
* **Middleware:** Multer (File Handling), CORS, Dotenv
* **AI Engine:** `@google/generative-ai`
* **Hosting:** Render Web Services

**Database:**
* **Database:** MongoDB Atlas (NoSQL)
* **ODM:** Mongoose (Schema Validation)

---

## 📁 Folder Structure

```text
VaultClip/
├── backend/
│   ├── uploads/            # Temporary storage for encrypted files
│   ├── models/             # MongoDB Mongoose Schemas
│   ├── .env                # Secret Keys (MongoDB, Gemini API)
│   ├── server.js           # Core Express server & API routes
│   └── package.json        
└── frontend/
    ├── public/             # Static assets & Manifest
    ├── src/
    │   ├── assets/         
    │   ├── App.jsx         # Main React Component & UI Logic
    │   ├── index.css       # Tailwind directives
    │   └── main.jsx        # React DOM Root
    ├── vite.config.js      
    └── package.json


## ⚙️ Local Setup & Installation

Follow these steps to run VaultClip locally on your machine.

 Prerequisites
  Node.js installed (v18+ recommended)
  MongoDB Atlas Cluster URL
  Google Gemini API Key

1. Clone the Repository
 git clone [https://github.com/your-username/SecureShare.git](https://github.com/your-username/SecureShare.git)
 cd SecureShare

2. Backend Setup
 cd backend
 npm install

## Create a .env file in the backend directory and add your secrets:
 PORT=5000
 MONGO_URI=your_mongodb_connection_string
 GEMINI_API_KEY=your_gemini_api_key

## Start the server:
 node server.js

3. Frontend Setup
Open a new terminal window:
 cd frontend
 npm install

4. Start the Vite development server:
 npm run dev

📡 API Endpoints Overview

Method       |       Endpoint              |     Description
             |                             | 
GET          |    /api/wakeup              |   Cold-start optimization ping to awake the server
POST         |    /api/send                |   "Uploads file/text, encrypts, and returns a 6-digit PIN"
POST         |    /api/receive             |   "Validates PIN, fetches data, and triggers the Burn protocol"
GET          |    /api/download-file/:pin  |   Serves the secure file download to the client
POST         |    /api/process-with-ai     |   Sends decrypted text to Gemini AI for insights
GET          |    /api/ocr/:pin            |   Triggers Gemini Vision to extract text from a secure image


👨‍💻 Developed By Abhay