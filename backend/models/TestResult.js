const mongoose = require('mongoose');

const testResultSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    test: { type: mongoose.Schema.Types.ObjectId, ref: 'Test', required: true },
    container: { type: mongoose.Schema.Types.ObjectId, ref: 'Container', required: true },
    topic: { type: mongoose.Schema.Types.ObjectId, ref: 'Topic', default: null },
    score: { type: Number, required: true },
    totalQuestions: { type: Number, required: true },
    percentage: { type: Number, required: true },
    answers: [{ questionIndex: Number, selected: Number, correct: Boolean }],
  },
  { timestamps: true }
);

module.exports = mongoose.model('TestResult', testResultSchema);
