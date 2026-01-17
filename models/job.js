const mongoose = require('mongoose');

const jobSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  company: {
    type: String,
    required: true,
    trim: true
  },
  location: {
    type: String,
    required: true, 
    trim: true
  },
  type: {
    type: String,
    enum: ['Full-time', 'Part-time', 'Contract', 'Freelance', 'Internship'],
    default: 'Full-time'
  },
  description: {
    type: String,
    default :'no description provided',
    
  },
  postedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  applicants: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    appliedAt: {
      type: Date,
      default: Date.now
    },
    status: {
        type: String,
        enum: ['pending', 'reviewed', 'rejected', 'accepted'],
        default: 'pending'
    }
  }],
  isActive: {
    type: Boolean,
    default: true
  }
}, { timestamps: true });


jobSchema.index({ title: 'text', company: 'text', location: 'text' });

const Job = mongoose.model('Job', jobSchema);

module.exports = Job;