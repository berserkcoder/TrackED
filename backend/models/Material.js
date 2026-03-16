const mongoose = require('mongoose');

const materialSchema = new mongoose.Schema(
  {
    container: { type: mongoose.Schema.Types.ObjectId, ref: 'Container', required: true },
    originalName: { type: String, required: true },
    filename: { type: String, required: true }, // stored filename
    filePath: { type: String, required: true },
    extractedText: { type: String, default: '' },
    pageCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Material', materialSchema);
