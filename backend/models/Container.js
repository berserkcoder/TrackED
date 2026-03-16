const mongoose = require('mongoose');

const containerSchema = new mongoose.Schema(
  {
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    color: { type: String, default: '#6366f1' }, // accent color for card
  },
  { timestamps: true }
);

module.exports = mongoose.model('Container', containerSchema);
