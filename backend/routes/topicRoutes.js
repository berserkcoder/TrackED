const express = require('express');
const router = express.Router();
const Topic = require('../models/Topic');
const Container = require('../models/Container');
const { protect } = require('../middleware/authMiddleware');

router.use(protect);

// GET /api/topics/:containerId
router.get('/:containerId', async (req, res) => {
  const container = await Container.findOne({ _id: req.params.containerId, owner: req.user._id });
  if (!container) return res.status(404).json({ message: 'Container not found' });
  const topics = await Topic.find({ container: container._id }).sort({ order: 1 });
  res.json(topics);
});

// POST /api/topics/:containerId — manually add topic
router.post('/:containerId', async (req, res) => {
  const container = await Container.findOne({ _id: req.params.containerId, owner: req.user._id });
  if (!container) return res.status(404).json({ message: 'Container not found' });
  const { title } = req.body;
  if (!title) return res.status(400).json({ message: 'Topic title required' });
  const count = await Topic.countDocuments({ container: container._id });
  const topic = await Topic.create({
    container: container._id,
    title,
    source: 'manual',
    order: count,
  });
  res.status(201).json(topic);
});

// PUT /api/topics/item/:id — update title or order
router.put('/item/:id', async (req, res) => {
  const topic = await Topic.findById(req.params.id);
  if (!topic) return res.status(404).json({ message: 'Topic not found' });
  const container = await Container.findOne({ _id: topic.container, owner: req.user._id });
  if (!container) return res.status(403).json({ message: 'Unauthorized' });
  if (req.body.title) topic.title = req.body.title;
  if (req.body.order !== undefined) topic.order = req.body.order;
  await topic.save();
  res.json(topic);
});

// PUT /api/topics/reorder/:containerId — bulk reorder
router.put('/reorder/:containerId', async (req, res) => {
  const container = await Container.findOne({ _id: req.params.containerId, owner: req.user._id });
  if (!container) return res.status(404).json({ message: 'Container not found' });
  const { orderedIds } = req.body; // array of topic IDs in new order
  if (!Array.isArray(orderedIds)) return res.status(400).json({ message: 'orderedIds must be array' });
  const ops = orderedIds.map((id, index) =>
    Topic.findByIdAndUpdate(id, { order: index })
  );
  await Promise.all(ops);
  res.json({ message: 'Reordered' });
});

// DELETE /api/topics/item/:id
router.delete('/item/:id', async (req, res) => {
  const topic = await Topic.findById(req.params.id);
  if (!topic) return res.status(404).json({ message: 'Topic not found' });
  const container = await Container.findOne({ _id: topic.container, owner: req.user._id });
  if (!container) return res.status(403).json({ message: 'Unauthorized' });
  await topic.deleteOne();
  res.json({ message: 'Topic deleted' });
});

module.exports = router;
