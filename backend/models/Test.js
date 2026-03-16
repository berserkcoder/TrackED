const mongoose = require('mongoose');

const questionSchema = new mongoose.Schema({
  questionText: { type: String, required: true },
  options: [{ type: String }], // array of 4 option strings
  correctAnswer: { type: Number, required: true }, // index 0-3
  explanation: { type: String, default: '' },
});

const testSchema = new mongoose.Schema(
  {
    container: { type: mongoose.Schema.Types.ObjectId, ref: 'Container', required: true },
    topic: { type: mongoose.Schema.Types.ObjectId, ref: 'Topic', default: null },
    questions: [questionSchema],
  },
  { timestamps: true }
);

module.exports = mongoose.model('Test', testSchema);
