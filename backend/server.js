const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config();

const app = express();

// Middleware
app.use(cors({ origin: 'http://localhost:5173', credentials: true }));
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Routes
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/containers', require('./routes/containerRoutes'));
app.use('/api/materials', require('./routes/materialRoutes'));
app.use('/api/topics', require('./routes/topicRoutes'));
app.use('/api/tests', require('./routes/testRoutes'));
app.use('/api/progress', require('./routes/progressRoutes'));

// Error handler
app.use((err, req, res, next) => {
  const status = err.statusCode || 500;
  res.status(status).json({ message: err.message || 'Server Error' });
});

// Connect DB and start server
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log('MongoDB connected');
    app.listen(process.env.PORT || 5000, () =>
      console.log(`Server running on port ${process.env.PORT || 5000}`)
    );
  })
  .catch((err) => {
    console.error('DB connection error:', err.message);
    process.exit(1);
  });
