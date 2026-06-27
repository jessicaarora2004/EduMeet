import express from 'express';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import auth from '../middleware/auth.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '../uploads'));
  },
  filename: (req, file, cb) => {
    const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, unique + path.extname(file.originalname));
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    const allowed = /pdf|jpeg|jpg|png|xlsx|xls|docx|doc|pptx|ppt/;
    const ext = allowed.test(path.extname(file.originalname).toLowerCase());
    if (ext) cb(null, true);
    else cb(new Error('File type not supported'));
  }
});

const router = express.Router();

router.post('/upload', auth, upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: 'No file uploaded' });
  }
  const fileUrl = `http://localhost:5000/uploads/${req.file.filename}`;
  res.status(200).json({
    url: fileUrl,
    originalName: req.file.originalname,
    mimetype: req.file.mimetype,
    size: req.file.size
  });
});

export default router;