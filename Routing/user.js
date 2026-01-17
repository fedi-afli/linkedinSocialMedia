const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User'); 
const Post = require('../models/Post');
const auth = require('../middleware/auth');
const Connection = require('../models/connection');


router.get("/search/:username", auth, async (req, res) => {
    console.log("SEARCH USERS CALLED with username:", req.params.username, "user:", req.user ? req.user.username : "no user");
    try {
        const searchUsername = req.params.username;

        const users = await User.find({
            username: { $regex: searchUsername, $options: "i" }
        }).select("username profilePicture");

        res.status(200).json({
            success: true,
            users
        });
        
    } catch (error) {
        console.error("Search users error:", error);
        res.status(500).json({ message: "Server error." });
    }
});

router.post('/connection/:userID', auth, async (req, res) => {
    const requesterId = req.user.id;
    const receiverId = req.params.userID;

    console.log('Connection request:', { requesterId, receiverId });

    try {
        // Check if connection already exists
        let connection = await Connection.findOne({
            $or: [
                { requester: requesterId, receiver: receiverId },
                { requester: receiverId, receiver: requesterId }
            ]
        });

        if (connection) {
            console.log('Connection already exists');
            return res.status(400).json({ message: "Connection request already exists." });
        }

        // Create new connection request
        connection = new Connection({
            requester: requesterId,
            receiver: receiverId
        });

        await connection.save();
        console.log('Connection saved:', connection._id);
        res.status(200).json({ success: true, message: "Connection request sent." });

    } catch (error) {
        console.error('Connection error:', error);
        res.status(500).json({ message: "Server error." });
    }
        
});

// Accept connection request
router.post('/connection/accept/:connectionId', auth, async (req, res) => {
    try {
        console.log('Accept connection request for:', req.params.connectionId);
        
        const connection = await Connection.findById(req.params.connectionId).populate('requester', 'isBlocked');
        console.log('Connection found:', connection);
        
        if (!connection) {
            return res.status(404).json({ success: false, message: "Connection request not found." });
        }

        // Check if current user is the receiver
        if (connection.receiver.toString() !== req.user.id) {
            return res.status(403).json({ success: false, message: "Not authorized to accept this request." });
        }

        // Check if the requester is blocked
        console.log('Requester data:', connection.requester);
        if (connection.requester && connection.requester.isBlocked) {
            console.log('Requester is blocked!');
            return res.status(403).json({ 
                success: false,
                message: "This user has been blocked by an admin.",
                isBlocked: true
            });
        }

        connection.status = 'accepted';
        await connection.save();

        res.status(200).json({ success: true, message: "Connection request accepted." });
    } catch (error) {
        console.error('Accept connection error:', error);
        res.status(500).json({ success: false, message: "Server error.", error: error.message });
    }
});

// Decline connection request
router.post('/connection/decline/:connectionId', auth, async (req, res) => {
    try {
        const connection = await Connection.findById(req.params.connectionId);
        
        if (!connection) {
            return res.status(404).json({ message: "Connection request not found." });
        }

        // Check if current user is the receiver
        if (connection.receiver.toString() !== req.user.id) {
            return res.status(403).json({ message: "Not authorized to decline this request." });
        }

        await Connection.findByIdAndDelete(req.params.connectionId);

        res.status(200).json({ success: true, message: "Connection request declined." });
    } catch (error) {
        console.error('Decline connection error:', error);
        res.status(500).json({ message: "Server error." });
    }
});


// Get notifications (pending connection requests) for current user
router.get('/notifications', auth, async (req, res) => {
    try {
        const userId = req.user.id;
        
        // Find all pending connection requests where current user is the receiver
        const notifications = await Connection.find({
            receiver: userId,
            status: 'pending'
        }).populate('requester', 'username profilePicture');
        
        res.status(200).json({ 
            success: true, 
            notifications: notifications 
        });
    } catch (error) {
        console.error('Get notifications error:', error);
        res.status(500).json({ message: "Server error." });
    }
});


router.get("/profileviews", auth, async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select('profileViews');
        res.status(200).json({ 
            success: true, 
            profileViews: user.profileViews 
        });
    } catch (error) {
        console.error("Get profile views error:", error);
        res.status(500).json({ message: "Server error." });
    }
});


router.get("/connection/count", auth, async (req, res) => {
     console.log('Updating connections count from server...');
    try {
        let connection = await Connection.find({
            $and: [
                { status: 'accepted' },
                { $or: [
                    { requester: req.user.id },
                    { receiver: req.user.id }
                ] }
            ],
})
        console.log('Connections found:', connection.length);
        res.status(200).json({ 
            success: true, 
            connectionsCount: connection.length   
        });
    } catch (error) {
        console.error("Get connetions count error:", error);
        res.status(500).json({ message: "Server error. connetions count error" });
    }
});

router.put('/:id/block-status', auth, async (req, res) => {
    try {
        
        const currentUser = await User.findById(req.user.id);
        if (!currentUser.isAdmin) {
            return res.status(403).json({ message: "Not authorized. Admins only." });
        }

        
        const targetUserId = req.params.id;
        const { isBlocked } = req.body;

        const updatedUser = await User.findByIdAndUpdate(
            targetUserId, 
            { isBlocked: isBlocked }, 
            { new: true } 
        );

        if (!updatedUser) {
            return res.status(404).json({ message: "User not found" });
        }

        res.json({ 
            success: true, 
            message: `User ${isBlocked ? 'blocked' : 'unblocked'} successfully.` 
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server error" });
    }
});






module.exports = router;