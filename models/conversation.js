const mongoose = require('mongoose');

const conversationSchema = new mongoose.Schema(
  {
    users: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
      }
    ],


  },
  {
    timestamps: true
  }
);

module.exports = mongoose.models.Conversation || mongoose.model('Conversation', conversationSchema);
