// models/User.js (Example Schema Update)

const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    email: { type: String, required: true, unique: true },
    gender: { type: String, required: true },
    password: { type: String, required: true },
    isVerified: { type: Boolean, default: false },
    isAdmin: { type: Boolean, default: false ,required: true},
    isBlocked: { type: Boolean, default: false ,required: true},
    verificationToken: String,
    passwordChangeToken :String,
    passwordChangeExpires: Date,
    
 
    location : {type: String, 
        default: "Location not set" ,
        required: true}, 
    profilePicture: { 
        type: String, 
        default: '/uploads/default-avatars/default.png' 
    },
    dateOfBirth: { 
        type: Date,
        required: true 
    },
    
   
    headline: { 
        type: String, 
        default: '',
        maxlength: 220
    },
    bio: { 
        type: String, 
        default: '',
        maxlength: 2600
    },
    work: { 
        type: String, 
        default: '',
        maxlength: 500
    },
    experiences: [
        {
            title: { type: String, required: true },
            company: { type: String, required: true },
            location: { type: String },
            startDate: { type: Date, required: true },
            endDate: { type: Date },
            current: { type: Boolean, default: false },
            description: { type: String }
        }
    ],
    
    

    
 

    resume: {
        type: String,
        default: null
    },
    profileViews: { 
        type: Number, 
        default: 0 
    }

});

module.exports = mongoose.model('User', UserSchema);