const express = require('express');
const router = express.Router();
const Container = require('../models/Container');
const Material = require('../models/Material');
const Topic = require('../models/Topic');
const Test = require('../models/Test');
const TestResult = require('../models/TestResult');
const { protect } = require('../middleware/authMiddleware');

// All routes protected
router.use(protect);

// GET /api/containers
router.get('/', async (req, res) => {
  const containers = await Container.find({ owner: req.user._id }).sort({ createdAt: -1 });
  res.json(containers);
});

// POST /api/containers
router.post('/', async (req, res) => {
  const { title, description, color } = req.body;
  if (!title) return res.status(400).json({ message: 'Title is required' });
  const container = await Container.create({
    owner: req.user._id,
    title,
    description,
    color: color || '#6366f1',
  });
  res.status(201).json(container);
});

// GET /api/containers/:id
router.get('/:id', async (req, res) => {
  const container = await Container.findOne({ _id: req.params.id, owner: req.user._id });
  if (!container) return res.status(404).json({ message: 'Container not found' });
  res.json(container);
});

// PUT /api/containers/:id
router.put('/:id', async (req, res) => {
  const container = await Container.findOne({ _id: req.params.id, owner: req.user._id });
  if (!container) return res.status(404).json({ message: 'Container not found' });
  const { title, description, color } = req.body;
  if (title) container.title = title;
  if (description !== undefined) container.description = description;
  if (color) container.color = color;
  await container.save();
  res.json(container);
});

// DELETE /api/containers/:id — cascades deletes
router.delete('/:id', async (req, res) => {
  const container = await Container.findOne({ _id: req.params.id, owner: req.user._id });
  if (!container) return res.status(404).json({ message: 'Container not found' });
  await Material.deleteMany({ container: container._id });
  await Topic.deleteMany({ container: container._id });
  await Test.deleteMany({ container: container._id });
  await TestResult.deleteMany({ container: container._id });
  await container.deleteOne();
  res.json({ message: 'Container deleted' });
});

module.exports = router;
