const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const pdfParse = require('pdf-parse');
const axios = require('axios');
const Material = require('../models/Material');
const Topic = require('../models/Topic');
const Container = require('../models/Container');
const { protect } = require('../middleware/authMiddleware');

// Multer storage config
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, '../uploads');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname.replace(/\s+/g, '_')}`);
  },
});
const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') cb(null, true);
    else cb(new Error('Only PDF files are allowed'), false);
  },
  limits: { fileSize: 20 * 1024 * 1024 }, // 20MB
});

router.use(protect);

// POST /api/materials/upload/:containerId
router.post('/upload/:containerId', upload.single('pdf'), async (req, res) => {
  const container = await Container.findOne({ _id: req.params.containerId, owner: req.user._id });
  if (!container) return res.status(404).json({ message: 'Container not found' });
  if (!req.file) return res.status(400).json({ message: 'No file uploaded' });

  // Parse PDF
  const dataBuffer = fs.readFileSync(req.file.path);
  const pdfData = await pdfParse(dataBuffer);

  const material = await Material.create({
    container: container._id,
    originalName: req.file.originalname,
    filename: req.file.filename,
    filePath: req.file.path,
    extractedText: pdfData.text,
    pageCount: pdfData.numpages,
  });

  // Call Python AI service to extract topics
  try {
    const aiResponse = await axios.post(`${process.env.AI_SERVICE_URL}/extract-topics`, {
      text: pdfData.text.substring(0, 15000), // limit text to first 15k chars
      containerId: container._id.toString(),
    });
    const aiTopics = aiResponse.data.topics || [];

    // Insert topics (skip duplicates by title)
    const existingTopics = await Topic.find({ container: container._id });
    const existingTitles = existingTopics.map((t) => t.title.toLowerCase());
    const newTopics = aiTopics
      .filter((t) => !existingTitles.includes(t.toLowerCase()))
      .map((t, i) => ({
        container: container._id,
        title: t,
        source: 'ai',
        order: existingTopics.length + i,
      }));
    if (newTopics.length > 0) await Topic.insertMany(newTopics);
  } catch (aiErr) {
    console.error('AI service error (topics):', aiErr.message);
    // Non-blocking — material is still saved
  }

  res.status(201).json(material);
});

// GET /api/materials/:containerId
router.get('/:containerId', async (req, res) => {
  const container = await Container.findOne({ _id: req.params.containerId, owner: req.user._id });
  if (!container) return res.status(404).json({ message: 'Container not found' });
  const materials = await Material.find({ container: container._id }).select('-extractedText');
  res.json(materials);
});

// DELETE /api/materials/file/:id
router.delete('/file/:id', async (req, res) => {
  const material = await Material.findById(req.params.id);
  if (!material) return res.status(404).json({ message: 'Material not found' });
  // Verify ownership via container
  const container = await Container.findOne({ _id: material.container, owner: req.user._id });
  if (!container) return res.status(403).json({ message: 'Unauthorized' });
  if (fs.existsSync(material.filePath)) fs.unlinkSync(material.filePath);
  await material.deleteOne();
  res.json({ message: 'Material deleted' });
});

module.exports = router;
