const express = require('express');
const router = express.Router();
const TestResult = require('../models/TestResult');
const Container = require('../models/Container');
const { protect } = require('../middleware/authMiddleware');

router.use(protect);

// GET /api/progress/:containerId — get all results for a container
router.get('/:containerId', async (req, res) => {
  const container = await Container.findOne({ _id: req.params.containerId, owner: req.user._id });
  if (!container) return res.status(404).json({ message: 'Container not found' });

  const results = await TestResult.find({ user: req.user._id, container: container._id })
    .populate('topic', 'title')
    .populate('test', 'createdAt')
    .sort({ createdAt: -1 });

  // Summary stats
  const totalTests = results.length;
  const avgPercentage = totalTests
    ? Math.round(results.reduce((sum, r) => sum + r.percentage, 0) / totalTests)
    : 0;
  const bestScore = totalTests ? Math.max(...results.map((r) => r.percentage)) : 0;

  res.json({ results, summary: { totalTests, avgPercentage, bestScore } });
});

// GET /api/progress/global — progress across all containers
router.get('/global/summary', async (req, res) => {
  const results = await TestResult.find({ user: req.user._id })
    .populate('container', 'title color')
    .sort({ createdAt: -1 });

  // Group by container
  const byContainer = {};
  results.forEach((r) => {
    const cid = r.container._id.toString();
    if (!byContainer[cid]) {
      byContainer[cid] = { container: r.container, results: [] };
    }
    byContainer[cid].results.push(r);
  });

  const summary = Object.values(byContainer).map(({ container, results }) => ({
    container,
    totalTests: results.length,
    avgPercentage: Math.round(results.reduce((s, r) => s + r.percentage, 0) / results.length),
    bestScore: Math.max(...results.map((r) => r.percentage)),
    lastTaken: results[0]?.createdAt,
  }));

  res.json(summary);
});

module.exports = router;
