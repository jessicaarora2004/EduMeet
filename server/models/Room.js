import mongoose from 'mongoose';

const roomSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  teacher: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  students: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  code: {
    type: String,
    unique: true,
    required: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  transcript: {
    type: String,
    default: ''
  },
  summary: {
    type: String,
    default: ''
  },
  homework: {
    type: String,
    default: ''
  },
  notes: [{
    author: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    content: String,
    createdAt: { type: Date, default: Date.now }
  }],
  quiz: {
    questions: [{
      question: String,
      options: [String],
      correctAnswer: Number
    }],
    isActive: { type: Boolean, default: false },
    scores: [{
      student: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      score: Number,
      total: Number
    }]
  }
}, { timestamps: true });

export default mongoose.model('Room', roomSchema);