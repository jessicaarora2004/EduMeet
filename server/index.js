import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import { createServer } from 'http';
import { Server } from 'socket.io';
import agoraRoutes from './routes/agora.js';
import aiRoutes from './routes/ai.js';
import fileRoutes from './routes/files.js';
import { fileURLToPath } from 'url';
import path from 'path';

dotenv.config();

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: 'http://localhost:5173',
    methods: ['GET', 'POST']
  }
});

// Middleware
app.use(cors({ origin: 'http://localhost:5173' }));
app.use(express.json());
app.use('/api/agora', agoraRoutes);
// Test route
app.get('/', (req, res) => {
  res.json({ message: 'EduMeet server is running!' });
});
app.use('/api/ai', aiRoutes);

// Socket.io
io.on('connection', (socket) => {
  console.log('A user connected:', socket.id);

  // Join a room
  socket.on('join-room', (roomId) => {
    socket.join(roomId);
    console.log(`User joined room: ${roomId}`);
  });

  // Teacher starts quiz
  socket.on('start-quiz', ({ roomId, questions }) => {
    io.to(roomId).emit('quiz-started', { questions });
  });

  // Student submits answer
  socket.on('submit-score', ({ roomId, studentName, score, total }) => {
    io.to(roomId).emit('score-update', { studentName, score, total });
  });

  // Teacher ends quiz
  socket.on('end-quiz', (roomId) => {
    io.to(roomId).emit('quiz-ended');
  });

  // Notes sharing
socket.on('send-note', ({ roomId, note }) => {
  io.to(roomId).emit('new-note', note);
});

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});
// Connect to MongoDB and start server
const PORT = process.env.PORT || 5000;

mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log('MongoDB connected');
    httpServer.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  })
  .catch((err) => console.log('MongoDB error:', err));
// Add this import at the top
import authRoutes from './routes/auth.js';

// Add this below the test route
app.use('/api/auth', authRoutes);
// Add at top with other imports
import roomRoutes from './routes/room.js';

// Add below the auth route
app.use('/api/rooms', roomRoutes);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// serve uploads folder statically — add this after app.use(express.json())
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// add with other routes
app.use('/api/files', fileRoutes);