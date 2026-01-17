const mongoose = require('mongoose');

const PostSchema = new mongoose.Schema({
   
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User', 
        required: true
    },
    content: {
        type: String,
        
    },
   
    image: {
        type: String 
    },


    likes: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        }
    ],
  
    comments: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Comment'
        }
    ]
}, { timestamps: true }); 

PostSchema.pre('validate', function(next) {
    const hasContent = this.content && this.content.trim().length > 0;
    const hasImage = this.image && this.image.trim().length > 0;

    if (!hasContent && !hasImage) {
       
        next(new Error('Post must contain either text or an image.'));
    } else {
        next();
    }
});

module.exports = mongoose.model('Post', PostSchema);