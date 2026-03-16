const express = require('express');
const router = express.Router();
const axios = require('axios');
const Test = require('../models/Test');
const TestResult = require('../models/TestResult');
const Material = require('../models/Material');
const Container = require('../models/Container');
const Topic = require('../models/Topic');
const { protect } = require('../middleware/authMiddleware');

router.use(protect);

// POST /api/tests/generate/:containerId — generate test for whole container
// POST /api/tests/generate/:containerId?topicId=xxx — generate test for a specific topic
router.post('/generate/:containerId', async (req, res) => {
  const container = await Container.findOne({ _id: req.params.containerId, owner: req.user._id });
  if (!container) return res.status(404).json({ message: 'Container not found' });

  // Get all extracted text from container's materials
  const materials = await Material.find({ container: container._id });
  if (!materials.length) return res.status(400).json({ message: 'No materials uploaded yet' });
  const fullText = materials.map((m) => m.extractedText).join('\n\n').substring(0, 20000);

  let topicTitle = null;
  let topicId = req.query.topicId || null;
  if (topicId) {
    const topic = await Topic.findById(topicId);
    topicTitle = topic ? topic.title : null;
  }

  // Call Python AI service
  const aiResponse = await axios.post(`${process.env.AI_SERVICE_URL}/generate-test`, {
    text: fullText,
    topic: topicTitle,
    numQuestions: parseInt(req.body.numQuestions) || 10,
  });
  const questions = aiResponse.data.questions;
  if (!questions || !questions.length)
    return res.status(502).json({ message: 'AI service returned no questions' });

  const test = await Test.create({
    container: container._id,
    topic: topicId || null,
    questions,
  });
  res.status(201).json(test);
});

// GET /api/tests/:containerId — list all tests for container
router.get('/:containerId', async (req, res) => {
  const container = await Container.findOne({ _id: req.params.containerId, owner: req.user._id });
  if (!container) return res.status(404).json({ message: 'Container not found' });
  const tests = await Test.find({ container: container._id })
    .populate('topic', 'title')
    .sort({ createdAt: -1 });
  res.json(tests);
});

// GET /api/tests/single/:testId — get a specific test
router.get('/single/:testId', async (req, res) => {
  const test = await Test.findById(req.params.testId).populate('topic', 'title');
  if (!test) return res.status(404).json({ message: 'Test not found' });
  // Verify ownership
  const container = await Container.findOne({ _id: test.container, owner: req.user._id });
  if (!container) return res.status(403).json({ message: 'Unauthorized' });
  res.json(test);
});

// POST /api/tests/submit/:testId — submit answers and save result
router.post('/submit/:testId', async (req, res) => {
  const test = await Test.findById(req.params.testId);
  if (!test) return res.status(404).json({ message: 'Test not found' });
  const container = await Container.findOne({ _id: test.container, owner: req.user._id });
  if (!container) return res.status(403).json({ message: 'Unauthorized' });

  const { answers } = req.body; // array of { questionIndex, selected }
  if (!Array.isArray(answers)) return res.status(400).json({ message: 'answers must be array' });

  let score = 0;
  const gradedAnswers = answers.map(({ questionIndex, selected }) => {
    const correct = test.questions[questionIndex]?.correctAnswer === selected;
    if (correct) score++;
    return { questionIndex, selected, correct };
  });

  const totalQuestions = test.questions.length;
  const percentage = Math.round((score / totalQuestions) * 100);

  const result = await TestResult.create({
    user: req.user._id,
    test: test._id,
    container: test.container,
    topic: test.topic,
    score,
    totalQuestions,
    percentage,
    answers: gradedAnswers,
  });

  res.status(201).json({ score, totalQuestions, percentage, resultId: result._id, answers: gradedAnswers });
});

module.exports = router;
