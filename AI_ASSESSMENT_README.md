# Talentera AI Video Verification & Interactive Q&A Assessment System

The **AI Video Verification & Interactive Communication Assessment** system integrates live webcam streaming, liveness detection, MediaRecorder video/audio capture, Web Speech API live Speech-to-Text (STT), client-side proctoring, and server-side LLM response evaluation against healthcare RCM communication rubrics.

---

## 🏗️ Architecture & Component Overview

```
[Candidate Browser]
   ├── MediaDevices API (getUserMedia webcam/mic stream)
   ├── Liveness Verification Engine (head/eye gesture check)
   ├── MediaRecorder API (chunked WebM video recording)
   ├── Web Speech API (real-time live STT transcripts)
   └── Anti-Cheat Monitor (visibilitychange & blur detection)
          │
          ▼ HTTP POST /api/candidate/ai-video/assess (Multipart Video + JSON payload)
[Node.js / Express Backend]
   ├── Multer Middleware (Video storage to Cloudinary / Local Disk)
   ├── aiAssessment.js (LLM Rubric Evaluator: GPT-4o-mini / Heuristic Engine)
   └── MongoDB (Candidate Profile Stage 5 Score Storage)
```

---

## 🔑 Environment Variables Configuration

In `backend/.env`, configure the following keys:

```env
# Server Port & JWT Auth
PORT=5000
JWT_SECRET=your_jwt_secret_key_here
MONGO_URI=mongodb://localhost:27017/talentera

# AI Rubric Evaluation Pipeline (Optional - falls back to heuristic engine if omitted)
OPENAI_API_KEY=sk-proj-your-openai-api-key-here

# Video Cloud Storage (Optional - falls back to local disk uploads if omitted)
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

---

## 🚀 Local Development & Execution

### 1. Backend Setup & Run

```bash
cd backend
npm install
npm run dev
# Server starts at http://localhost:5000
```

### 2. Frontend Setup & Run

```bash
cd frontend
npm install
npm run dev
# Frontend runs at http://localhost:5173
```

---

## 💻 Main Website Embedding & Integration Guide

To embed the **AI Video & Communication Assessment** into any main website page or candidate dashboard, import and render `<AiVideoAssessment />`:

```jsx
import React from "react";
import AiVideoAssessment from "./components/AiVideoAssessment.jsx";

export default function CandidateAssessmentPage() {
  const handleSaved = (data) => {
    console.log("Assessment completed successfully:", data.evaluation);
  };

  return (
    <div className="container" style={{ padding: "32px 16px" }}>
      <h2>Stage 5: Live Video & Communication Assessment</h2>
      <AiVideoAssessment onSaved={handleSaved} />
    </div>
  );
}
```

---

## 🛡️ Proctoring & Liveness Rules

1. **Liveness Check**: Candidate must validate webcam stream and confirm face alignment before Q&A recording begins.
2. **Tab Switch & Focus Detection**: Detects `visibilitychange` (`hidden`) and `blur` events, logging proctoring flags that adjust score penalties.
3. **Rubric Evaluation**: Evaluates Communication Clarity, Technical RCM Accuracy, Professional Tone, and Fluency.
