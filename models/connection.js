const mongoose = require('mongoose');

const connectionSchema = new mongoose.Schema(
  {
    requester: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },

    receiver: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },

    status: {
      type: String,
      enum: ['pending', 'accepted', 'rejected',],
      default: 'pending'
    }
  },
  {
    timestamps: true
  }
);





connectionSchema.pre('save', function (next) {
  if (this.requester.equals(this.receiver)) {
    return next(new Error('Cannot create connection with yourself'));
  }
  next();
});

module.exports = mongoose.model('Connection', connectionSchema);
