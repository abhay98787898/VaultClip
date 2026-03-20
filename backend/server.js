// backend/server.js
require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcrypt');
// NEW: Added for AI integration
const { GoogleGenerativeAI } = require("@google/generative-ai");

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());
app.use('/download', express.static(path.join(__dirname, 'uploads')));

// MongoDB Connection Link
const MONGO_URI = process.env.MONGO_URI;

mongoose.connect(MONGO_URI)
    .then(() => console.log("✅ Connected to MongoDB Atlas!"))
    .catch(err => console.error("❌ MongoDB connection error:", err));

// --- NEW: Initialize Gemini AI ---
// CRITICAL: Get your own API Key from Google AI Studio
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

// Database Schema
const clipSchema = new mongoose.Schema({
    pin: { type: String, required: true, unique: true },
    type: { type: String, required: true },
    textData: { type: String },
    fileName: { type: String },
    savedFileName: { type: String },
    password: { type: String, default: "" },
    expiryMode: { type: String, default: "burn" },
    createdAt: { type: Date, default: Date.now, expires: '24h' }
});

const Clip = mongoose.model('Clip', clipSchema);

const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, 'uploads/'),
    filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname)
});
const upload = multer({ storage });

const generateUniquePin = async () => {
    let pin;
    let isUnique = false;
    while (!isUnique) {
        pin = Math.floor(100000 + Math.random() * 900000).toString();
        const existingClip = await Clip.findOne({ pin });
        if (!existingClip) isUnique = true;
    }
    return pin;
};

// --- API ROUTES ---

// 1. SEND API
app.post('/api/send', upload.single('file'), async (req, res) => {
    try {
        const { type, textData, password, expiryMode } = req.body;
        const pin = await generateUniquePin();

        let hashedPassword = "";
        if (password && password.trim() !== "") {
            const salt = await bcrypt.genSalt(10);
            hashedPassword = await bcrypt.hash(password, salt);
        }

        const newClip = new Clip({ pin, type, textData, password: hashedPassword, expiryMode: expiryMode || "burn" });

        if (type === 'file' && req.file) {
            newClip.fileName = req.file.originalname;
            newClip.savedFileName = req.file.filename;
        }

        await newClip.save();
        res.status(200).json({ message: "Saved!", pin: pin });
    } catch (error) {
        res.status(500).json({ error: "Server Error" });
    }
});

// 2. RECEIVE API
app.post('/api/receive', async (req, res) => {
    try {
        const { pin, password } = req.body;
        const clip = await Clip.findOne({ pin });

        if (!clip) return res.status(404).json({ error: "Invalid PIN or data burned." });

        if (clip.password && clip.password !== "") {
            if (!password || password.trim() === "") return res.status(200).json({ requiresPassword: true, type: clip.type, fileName: clip.fileName || "Secret Text" });
            const isMatch = await bcrypt.compare(password, clip.password);
            if (!isMatch) return res.status(401).json({ error: "Incorrect Password!" });
        }

        res.status(200).json({
            type: clip.type,
            textData: clip.textData,
            fileName: clip.fileName,
            fileUrl: clip.type === 'file' ? `http://localhost:5000/api/download-file/${clip.pin}` : null,
            expiryMode: clip.expiryMode, // NEW: Bheja taaki timer chal sake
            createdAt: clip.createdAt    // NEW: Bheja taaki timer calculate ho
        });

        if (clip.expiryMode === "burn" && clip.type === 'text') {
            await Clip.deleteOne({ pin });
            console.log(`[BURN] Text record for PIN ${pin} destroyed.`);
        }
    } catch (error) {
        res.status(500).json({ error: "Server Error" });
    }
});

// 3. DOWNLOAD API
app.get('/api/download-file/:pin', async (req, res) => {
    try {
        const pin = req.params.pin;
        const clip = await Clip.findOne({ pin });
        if (!clip || clip.type !== 'file') return res.status(404).send("File not found.");
        const filePath = path.join(__dirname, 'uploads', clip.savedFileName);

        if (fs.existsSync(filePath)) {
            res.download(filePath, clip.fileName, async (err) => {
                if (!err && clip.expiryMode === "burn") {
                    fs.unlinkSync(filePath);
                    await Clip.deleteOne({ pin });
                    console.log(`[BURN] File downloaded and destroyed.`);
                }
            });
        } else { res.status(404).send("File missing."); }
    } catch (error) { res.status(500).send("Server Error"); }
});

// --- NEW: SMART AI PROCESSING API (Updated to take direct text) ---
app.post('/api/process-with-ai', async (req, res) => {
    try {
        const { textData } = req.body;

        if (!textData || textData.trim() === "") {
            return res.status(400).json({ error: "No text to process." });
        }

        const prompt = `Analyze the following text. 
        First, automatically detect if it is programming code or natural language.
        
        If it is natural language (like English, Hinglish, etc): 
        Provide a concise, stylish "TL;DR" summary of max 2-3 lines.
        
        If it is programming code:
        Identify the language, explain the core logic clearly, and if there are obvious bugs, briefly point them out. Keep it formatted neatly.
        
        Output only the result, no introductory text.
        
        Original Text:
        ---
        ${textData}
        ---`;

        console.log(`[AI] Processing text with Gemini...`);
        const result = await model.generateContent(prompt);
        const responseText = result.response.text();

        res.status(200).json({ aiResult: responseText });

    } catch (error) {
        console.error("AI processing error:", error);
        res.status(500).json({ error: "Failed to connect to AI server." });
    }
});

// --- NEW: SMART IMAGE OCR API (Gemini Vision) ---
app.get('/api/ocr/:pin', async (req, res) => {
    try {
        const pin = req.params.pin;
        const clip = await Clip.findOne({ pin });

        if (!clip || clip.type !== 'file') return res.status(404).json({ error: "Image not found." });

        const filePath = path.join(__dirname, 'uploads', clip.savedFileName);
        if (!fs.existsSync(filePath)) return res.status(404).json({ error: "Image file is missing." });

        // Image ko Gemini ke samajhne layk format (Base64) mein convert karna
        const mimeType = clip.savedFileName.toLowerCase().endsWith('png') ? 'image/png' : 'image/jpeg';
        const imagePart = {
            inlineData: {
                data: Buffer.from(fs.readFileSync(filePath)).toString("base64"),
                mimeType: mimeType
            }
        };

        const prompt = "Extract all readable text from this image exactly as it is written. Only output the extracted text, no introductory lines.";

        console.log(`[AI] Running OCR on Image for PIN ${pin}...`);
        const result = await model.generateContent([prompt, imagePart]);
        const responseText = result.response.text();

        res.status(200).json({ extractedText: responseText });
    } catch (error) {
        console.error("OCR error:", error);
        res.status(500).json({ error: "Failed to read image text." });
    }
});

app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));