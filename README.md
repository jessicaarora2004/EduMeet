# EduMeet - AI-Powered Virtual Classroom

A full-stack video conferencing platform built for teachers with real-time AI features.

## Features
-  Live video/audio calling (Agora RTC)
-  Real-time speech-to-text transcription
-  AI-generated lecture summaries and homework (Groq LLaMA 3.1)
-  Live AI quiz with real-time leaderboard (Socket.io)
- Shared notes and file sharing (PDF, Word, Excel, PPT)
- JWT authentication with Teacher/Student roles

## Tech Stack
**Frontend:** React, Vite, React Router, Axios, Socket.io-client, Agora RTC SDK

**Backend:** Node.js, Express, MongoDB, Mongoose, Socket.io, Multer, JWT, bcryptjs

**AI:** Groq API (LLaMA 3.1), Web Speech API

## Setup

### Backend
```bash
cd server
npm install
npm run dev
```

### Frontend
```bash
cd client
npm install
npm run dev
```

### Environment Variables
Create `server/.env`:
```
MONGO_URI=mongodb://localhost:27017/edumeet
JWT_SECRET=your_secret
PORT=5000
AGORA_APP_ID=your_agora_app_id
AGORA_CERTIFICATE=your_agora_certificate
GROQ_API_KEY=your_groq_api_key
```
