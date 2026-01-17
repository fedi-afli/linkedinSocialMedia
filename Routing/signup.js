const express = require('express');
const router = express.Router();
const User = require('../models/User');
const bcrypt = require('bcryptjs'); 
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { sendVerificationEmail } = require('./email');
const multer = require('multer'); 
const path = require('path');
const fs = require('fs'); 

// --- MULTER CONFIGURATION ---
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        
        const uploadPath = path.join(__dirname, '../uploads/profile-pictures');

        
        if (!fs.existsSync(uploadPath)) {
            fs.mkdirSync(uploadPath, { recursive: true });
        }

        cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
        // 3. Generate unique filename
        const uniqueSuffix = Date.now() + '-' + crypto.randomBytes(4).toString('hex');
        const ext = path.extname(file.originalname);
        cb(null, `profile-${uniqueSuffix}${ext}`);
    }
});

const upload = multer({ 
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // Limit to 5MB
    fileFilter: (req, file, cb) => {
        // Optional: Reject non-image files
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Only image files are allowed!'), false);
        }
    }
}).single('profilePicture');

// Helper function to delete file if it exists
const deleteFile = (filePath) => {
    if (!filePath) return;
    // Resolve the full path to ensure we find the file
    // Assuming uploads is in the root or adjacent to routes, adjust path.join as needed.
    // Since req.file.path usually gives 'uploads/filename', we can use it directly relative to root.
    fs.unlink(filePath, (err) => {
        if (err) console.error("Failed to delete file:", err);
    });
};

// --- SIGNUP ROUTE ---
router.post('/', upload, async (req, res) => { 
    // Data fields are now in req.body. File is in req.file.
    const { 
        username, 
        email,
        gender, 
        password, 
        dateOfBirth, 
        description,
        location // <--- 1. Get location from body
    } = req.body;

    // Determine the path for the profile picture
    const profilePicturePath = req.file 
        ? `/uploads/profile-pictures/${req.file.filename}` 
        : '/uploads/default-avatars/default.png'; 

    // Guard to ensure we only send one response from this handler
    let responded = false;
    const sendOnce = (fn) => {
        if (responded) return;
        responded = true;
        return fn();
    };

    // 1. VALIDATION CHECK
    // Added !location here since it is required in your HTML form
    if (!username || !email || !password || !dateOfBirth || !gender ) {
        // FIX: Delete file if uploaded because validation failed
        if (req.file) deleteFile(req.file.path);
        return sendOnce(() => res.status(400).json({ message: 'All required fields (including location) must be provided.' }));
    }
        
    try {
        // 2. EXISTING USER CHECK
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            if (req.file) deleteFile(req.file.path);
            return sendOnce(() => res.status(409).json({ message: 'User already exists' }));
        }

        // Generate verification token and hash password
        const verificationToken = crypto.randomBytes(32).toString('hex');
        const hashedPassword = await bcrypt.hash(password, 10); 

        // Create new user with all profile data
        const userData = {
    username,
    email,
    gender,
    password: hashedPassword,
    isVerified: false,
    verificationToken,
    profilePicture: profilePicturePath,
    dateOfBirth: new Date(dateOfBirth),
    description: description || ''
};
if (typeof location === 'string' && location.trim().length > 0) {
    userData.location = location;
}
        const user = new User(userData);

        await user.save();
        
        const verifyURL = `${process.env.BASE_URL}/verify/${verificationToken}`;
        try {
            await sendVerificationEmail(email, verifyURL);
            return sendOnce(() => res.status(201).json({
                message: 'Signup successful. Please verify your email.',
                profilePicture: profilePicturePath
            }));
        } catch (mailErr) {
            console.error('❌ Failed to send verification email:', mailErr);
            // Attempt to clean up the created user and uploaded file
            try {
                await User.deleteOne({ _id: user._id });
            } catch (delErr) {
                console.error('❌ Failed to delete user after email failure:', delErr);
            }
            if (req.file) deleteFile(req.file.path);
            return sendOnce(() => res.status(500).json({ message: 'Could not send verification email. Please try again later.' }));
        }
        
    } catch (err) {
        // Clean up file on ANY error
        if (req.file) deleteFile(req.file.path);

        if (err instanceof multer.MulterError) {
             return sendOnce(() => res.status(400).json({ message: `Upload error: ${err.message}` }));
        }
        
        if (err.code === 11000) { 
            return sendOnce(() => res.status(400).json({ message: 'Email or Username already in use.' }));
        }
        
        console.error("❌ CRITICAL SERVER ERROR:", err); 
        return sendOnce(() => res.status(500).json({ message: 'Server error' }));
    }
});
module.exports = router;