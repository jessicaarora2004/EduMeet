import Room from '../models/Room.js';
import crypto from 'crypto';

// Generate unique 6-character room code
const generateCode = () => crypto.randomBytes(3).toString('hex').toUpperCase();

// Create a room (teacher only)
export const createRoom = async (req, res) => {
  try {
    if (req.user.role !== 'teacher') {
      return res.status(403).json({ message: 'Only teachers can create rooms' });
    }

    const { title } = req.body;
    const code = generateCode();

    const room = await Room.create({
      title,
      teacher: req.user.id,
      code
    });

    res.status(201).json(room);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// Join a room (student)
export const joinRoom = async (req, res) => {
  try {
    const { code } = req.body;

    const room = await Room.findOne({ code, isActive: true });
    if (!room) {
      return res.status(404).json({ message: 'Room not found or inactive' });
    }

    if (!room.students.includes(req.user.id)) {
      room.students.push(req.user.id);
      await room.save();
    }

    res.status(200).json(room);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// Get room by ID
export const getRoom = async (req, res) => {
  try {
    const room = await Room.findById(req.params.id)
      .populate('teacher', 'name email')
      .populate('students', 'name email');

    if (!room) {
      return res.status(404).json({ message: 'Room not found' });
    }

    res.status(200).json(room);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// Get all rooms for logged in teacher
export const getMyRooms = async (req, res) => {
  try {
    const rooms = await Room.find({ teacher: req.user.id })
      .sort({ createdAt: -1 });

    res.status(200).json(rooms);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// End a room (teacher only)
export const endRoom = async (req, res) => {
  try {
    const room = await Room.findById(req.params.id);

    if (!room) {
      return res.status(404).json({ message: 'Room not found' });
    }

    if (room.teacher.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    room.isActive = false;
    await room.save();

    res.status(200).json({ message: 'Room ended', room });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};