import express from 'express';
import { generateToken } from '../controllers/agoraController.js';
import auth from '../middleware/auth.js';

const router = express.Router();

router.post('/token', auth, generateToken);

export default router;