import express from 'express';
import { generateSummary, generateQuiz } from '../controllers/aiController.js';
import auth from '../middleware/auth.js';

const router = express.Router();

router.post('/summary', auth, generateSummary);
router.post('/quiz', auth, generateQuiz);

export default router;