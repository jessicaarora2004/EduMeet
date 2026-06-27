import express from 'express';
import {
  createRoom,
  joinRoom,
  getRoom,
  getMyRooms,
  endRoom
} from '../controllers/roomController.js';
import auth from '../middleware/auth.js';

const router = express.Router();

router.post('/create', auth, createRoom);
router.post('/join', auth, joinRoom);
router.get('/my-rooms', auth, getMyRooms);
router.get('/:id', auth, getRoom);
router.put('/end/:id', auth, endRoom);

export default router;