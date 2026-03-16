const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const router = express.Router();

const generateToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '7d' });

// @route POST /api/auth/register
router.post('/register', async (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password)
    return res.status(400).json({ message: 'All fields required' });
  const exists = await User.findOne({ email });
  if (exists) return res.status(400).json({ message: 'Email already in use' });
  const user = await User.create({ name, email, password });
  res.status(201).json({
    _id: user._id,
    name: user.name,
    email: user.email,
    token: generateToken(user._id),
  });
});

// @route POST /api/auth/login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email });
  if (!user || !(await user.matchPassword(password)))
    return res.status(401).json({ message: 'Invalid email or password' });
  res.json({
    _id: user._id,
    name: user.name,
    email: user.email,
    token: generateToken(user._id),
  });
});

// @route GET /api/auth/me
const { protect } = require('../middleware/authMiddleware');
router.get('/me', protect, (req, res) => {
  res.json({
    _id: req.user._id,
    name: req.user.name,
    email: req.user.email,
  });
});

module.exports = router;
