const mongoose = require('mongoose');

const topicSchema = new mongoose.Schema(
  {
    container: { type: mongoose.Schema.Types.ObjectId, ref: 'Container', required: true },
    title: { type: String, required: true, trim: true },
    source: { type: String, enum: ['ai', 'manual'], default: 'manual' },
    order: { type: Number, default: 0 },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Topic', topicSchema);
