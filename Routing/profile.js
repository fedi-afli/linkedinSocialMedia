const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const User = require('../models/User');
const Connection = require('../models/connection');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const crypto = require('crypto');

// Helper function to check if profile is complete
function isProfileComplete(user) {
    if (!user) {
        return {
            isComplete: false,
            missingFields: ['Profile not loaded']
        };
    }

    const requiredFields = [
        { field: 'headline', label: 'Headline' },
        { field: 'bio', label: 'Bio' },
        { field: 'work', label: 'Current Work' },
        { field: 'experiences', label: 'Work Experience' }
    ];

    const missingFields = [];

    requiredFields.forEach(item => {
        if (item.field === 'experiences') {
            if (!user.experiences || user.experiences.length === 0) {
                missingFields.push(item.label);
            }
        } else {
            if (!user[item.field] || (typeof user[item.field] === 'string' && user[item.field].trim() === '')) {
                missingFields.push(item.label);
            }
        }
    });

    return {
        isComplete: missingFields.length === 0,
        missingFields: missingFields
    };
}

// Helper function to check connection status between two users
async function getConnectionStatus(currentUserId, profileUserId) {
    try {
        const connection = await Connection.findOne({
            $or: [
                { requester: currentUserId, receiver: profileUserId },
                { requester: profileUserId, receiver: currentUserId }
            ]
        });

        if (!connection) {
            return { status: 'none', connection: null };
        }

        const isRequester = connection.requester.toString() === currentUserId.toString();

        return {
            status: connection.status,
            connection: connection,
            isRequester: isRequester
        };
    } catch (error) {
        console.error('Error checking connection status:', error);
        return { status: 'none', connection: null };
    }
}

// Helper: Delete File
const deleteFile = (filePath) => {
    if (!filePath) return;
    fs.unlink(filePath, (err) => {
        if (err) console.error("Failed to delete file:", err);
    });
};

// --- MULTER CONFIG FOR RESUMES ---
const resumeStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadPath = 'uploads/resumes/';
        fs.mkdirSync(uploadPath, { recursive: true });
        cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + crypto.randomBytes(4).toString('hex');
        cb(null, 'resume-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const uploadResume = multer({
    storage: resumeStorage,
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        if (file.mimetype === 'application/pdf') {
            cb(null, true);
        } else {
            cb(new Error('Invalid format. Only PDF files are allowed!'), false);
        }
    }
}).single('resume');

// --- MULTER CONFIG FOR PROFILE PICTURES ---
const profilePicStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadPath = 'uploads/profile-pictures/';
        // Ensure folder exists
        fs.mkdirSync(uploadPath, { recursive: true });
        cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + crypto.randomBytes(4).toString('hex');
        cb(null, 'profile-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const uploadProfilePic = multer({
    storage: profilePicStorage,
    limits: { fileSize: 5 * 1024 * 1024 }, // Limit to 5MB
    fileFilter: (req, file, cb) => {
        const allowedTypes = /jpeg|jpg|png|gif|webp/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);

        if (extname && mimetype) {
            return cb(null, true);
        } else {
            cb(new Error('Invalid format. Only images (JPEG, JPG, PNG, GIF, WEBP) are allowed!'));
        }
    }
}).single('profilePicture'); // Expecting form field name 'profilePicture'


// --- ROUTES ---

// Load own profile page
router.get("/", auth, async (req, res) => {
    let user;
    let currentUser;

    try {
        user = await User.findById(req.user.id);
        currentUser = user;
    } catch (err) {
        console.error(err);
        return res.status(500).render('error_page', { message: 'Failed to load profile' });
    }

    if (!user) {
        return res.status(404).render('error_page', { message: 'User not found' });
    }

    const profileStatus = isProfileComplete(user);

    res.render("profile", {
        user: user,
        currentUser: currentUser,
        profileStatus: profileStatus,
        isOwnProfile: true
    });
});

// Load other user's profile page
router.get("/:username", auth, async (req, res) => {
    let user;
    let currentUser;
    let connectionStatus = { status: 'none', connection: null };

    try {
        user = await User.findOne({ username: req.params.username });

        if (!user) {
            return res.status(404).render('error_page', { message: 'User not found' });
        }
        user.profileViews = user.profileViews + 1;
        user.save();
        currentUser = await User.findById(req.user.id);

        if (!currentUser) {
            return res.render('login');
        }

        connectionStatus = await getConnectionStatus(req.user.id, user._id);

    } catch (err) {
        console.error("Error in profile route:", err);
        return res.status(500).render('error_page', { message: 'Failed to load profile' });
    }

    res.render("profile", {
        user: user,
        currentUser: currentUser,
        profileStatus: isProfileComplete(user),
        isOwnProfile: req.user.id === user._id.toString(),
        connectionStatus: connectionStatus
    });
});

// PUT - Update profile details
router.put("/update", auth, async (req, res) => {
    try {
        const { headline, work, bio, experiences } = req.body;
        const userId = req.user.id;

        if (!headline || !work || !bio) {
            return res.status(400).json({
                success: false,
                message: 'Headline, work, and bio are required'
            });
        }

        const updateData = {
            headline: headline.trim(),
            work: work.trim(),
            bio: bio.trim()
        };

        if (experiences && Array.isArray(experiences)) {
            updateData.experiences = experiences.map(exp => ({
                title: exp.title?.trim() || '',
                company: exp.company?.trim() || '',
                location: exp.location?.trim() || '',
                startDate: exp.startDate ? new Date(exp.startDate) : null,
                endDate: exp.endDate ? new Date(exp.endDate) : null,
                current: exp.current || false,
                description: exp.description?.trim() || ''
            })).filter(exp => exp.title && exp.company);
        }

        const updatedUser = await User.findByIdAndUpdate(
            userId,
            updateData,
            { new: true, runValidators: true }
        );

        if (!updatedUser) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        const profileStatus = isProfileComplete(updatedUser);

        res.json({
            success: true,
            message: 'Profile updated successfully',
            user: updatedUser,
            profileStatus: profileStatus
        });

    } catch (error) {
        console.error('Profile update error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update profile: ' + error.message
        });
    }
});

// POST - Upload Resume
router.post('/uploadresume', auth, uploadResume, async (req, res) => {
    if (!req.file) {
        return res.status(400).json({
            success: false,
            message: 'No file uploaded. Please select a PDF file.'
        });
    }

    const userId = req.user.id;

    try {
        const user = await User.findById(userId);

        if (!user) {
            deleteFile(req.file.path);
            return res.status(404).json({ success: false, message: 'User not found.' });
        }

        if (user.resume && typeof user.resume === 'string') {
            const oldPathRelative = user.resume.startsWith('/')
                ? user.resume.substring(1)
                : user.resume;
            deleteFile(oldPathRelative);
        }

        const newresume = `/uploads/resumes/${req.file.filename}`;
        user.resume = newresume;
        await user.save();

        return res.status(200).json({
            success: true,
            message: 'Resume uploaded successfully!',
            resume: newresume
        });

    } catch (err) {
        if (req.file) deleteFile(req.file.path);
        if (err instanceof multer.MulterError) {
            return res.status(400).json({ success: false, message: `Upload error: ${err.message}` });
        }
        console.error("❌ RESUME UPLOAD ERROR:", err);
        return res.status(500).json({ success: false, message: 'Server error during resume upload.' });
    }
});

// POST - Upload Profile Picture
router.post('/upload-profile-picture', auth, uploadProfilePic, async (req, res) => {
    // 1. VALIDATION: Check if file exists
    if (!req.file) {
        return res.status(400).json({
            success: false,
            message: 'No file uploaded. Please select an image file.'
        });
    }

    const userId = req.user.id;

    try {
        // 2. FIND USER
        const user = await User.findById(userId);

        if (!user) {
            deleteFile(req.file.path); // Clean up the orphan file
            return res.status(404).json({ success: false, message: 'User not found.' });
        }

        // 3. SMART CLEANUP: Delete the OLD profile picture if it exists and isn't a default
        if (user.profilePicture && typeof user.profilePicture === 'string') {
            // Check if it's not a default avatar (adjust logic based on your default paths)
            const isDefault = user.profilePicture.includes('default-avatars') || user.profilePicture.includes('ui-avatars.com');
            
            if (!isDefault) {
                // Remove the leading slash if stored as '/uploads/...'
                const oldPathRelative = user.profilePicture.startsWith('/')
                    ? user.profilePicture.substring(1)
                    : user.profilePicture;

                deleteFile(oldPathRelative);
            }
        }

        // 4. UPDATE USER RECORD
        // Save path relative to server root
        const newProfilePicPath = `/uploads/profile-pictures/${req.file.filename}`;

        user.profilePicture = newProfilePicPath;
        await user.save();

        return res.status(200).json({
            success: true,
            message: 'Profile picture updated successfully!',
            profilePicture: newProfilePicPath
        });

    } catch (err) {
        // 5. ERROR HANDLING
        if (req.file) deleteFile(req.file.path);

        if (err instanceof multer.MulterError) {
            return res.status(400).json({ success: false, message: `Upload error: ${err.message}` });
        }

        console.error("❌ PROFILE PICTURE UPLOAD ERROR:", err);
        return res.status(500).json({ success: false, message: 'Server error during profile picture upload.' });
    }
});

module.exports = router;