const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const auth = require('../middleware/auth');
const Post = require('../models/Post');
const Comment = require('../models/comment');
const User = require('../models/User');

router.post('/like/:postId', auth, async (req, res) => {
    try {
        const userId = req.user.id;
        const postId = req.params.postId;

        const post = await Post.findById(postId);
        if (!post) {
            return res.status(404).json({ message: "Post not found." });
        }

        const isLiked = post.likes.some(id => id.toString() === userId);

        if (isLiked) {
            post.likes = post.likes.filter(id => id.toString() !== userId);
        } else {
            post.likes.push(userId);
        }

        await post.save();

        res.status(200).json({
            success: true,
            liked: !isLiked,
            likesCount: post.likes.length
        });

    } catch (error) {
        res.status(500).json({ message: "Server error." });
    }
});

router.get('/likes/:postId', auth, async (req, res) => {
    try {
        const userId = req.user.id;
        const postId = req.params.postId;

        const post = await Post.findById(postId);
        if (!post) {
            return res.status(404).json({ message: "Post not found." });
        }

        const isLiked = post.likes.some(id => id.toString() === userId);

        res.status(200).json({
            success: true,
            likesCount: post.likes.length,
            isLiked: isLiked
        });

    } catch (error) {
        res.status(500).json({ message: "Server error." });
    }
});

router.post('/comment/:postId', auth, async (req, res) => {
    try {
        const userId = req.user.id;
        const postId = req.params.postId;
        const { text } = req.body;

        if (!text || text.trim().length === 0) {
            return res.status(400).json({ message: "Comment text is required." });
        }

        const post = await Post.findById(postId);
        if (!post) {
            return res.status(404).json({ message: "Post not found." });
        }

        const comment = new Comment({
            post: postId,
            user: userId,
            text: text.trim()
        });

        await comment.save();

        post.comments.push(comment._id);
        await post.save();

        await comment.populate('user', 'username profilePicture');

        res.status(201).json({
            success: true,
            comment: {
                _id: comment._id,
                text: comment.text,
                date: comment.date,
                user: {
                    _id: comment.user._id,
                    username: comment.user.username,
                    profilePicture: comment.user.profilePicture
                }
            }
        });

    } catch (error) {
        res.status(500).json({ message: "Server error." });
    }
});

router.delete('/comment/:commentId', auth, async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        const commentId = req.params.commentId;
        let addedString=""

        if(user.isAdmin){
            addedString="(Admin privileges)"
        }    

        const comment = await Comment.findById(commentId);
        if (!comment) {
            return res.status(404).json({ success: false,message: "Comment not found." });
        }

        if (comment.user.toString() !== user.id.toString() && !user.isAdmin) {
            return res.status(403).json({ success: false, message: "Not authorized to delete this comment." });
        }

        const post = await Post.findById(comment.post);
        if (post) {
            post.comments = post.comments.filter(id => id.toString() !== commentId);
            await post.save();
        }

        await Comment.findByIdAndDelete(commentId);

        res.status(200).json({
            success: true,
            message: "Comment deleted successfully."+addedString
        });

    } catch (error) {
        res.status(500).json({ message: "Server error." });
    }
});

router.get('/comments/count/:postId', async (req, res) => {
    try {
        const postId = req.params.postId;

        const post = await Post.findById(postId);
        if (!post) {
            return res.status(404).json({ message: "Post not found." });
        }

        const commentsCount = await Comment.countDocuments({ post: postId });

        res.status(200).json({
            success: true,
            count: commentsCount
        });

    } catch (error) {
        res.status(500).json({ message: "Server error." });
    }
});

router.get('/comments/:postId', auth, async (req, res) => {
    try {
        const postId = req.params.postId;

        const post = await Post.findById(postId);
        if (!post) {
            return res.status(404).json({ message: "Post not found." });
        }

        const comments = await Comment.find({ post: postId })
            .populate('user', 'username profilePicture')
            .sort({ date: 1 });

        res.status(200).json({
            success: true,
            comments: comments.map(comment => ({
                _id: comment._id,
                text: comment.text,
                date: comment.date,
                user: {
                    _id: comment.user._id,
                    username: comment.user.username,
                    profilePicture: comment.user.profilePicture
                }
            }))
        });

    } catch (error) {
        res.status(500).json({ message: "Server error." });
    }
});

const multer = require('multer');
const path = require('path');

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/')
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname)); 
    }
});

const upload = multer({ storage: storage });

router.post('/save',auth,upload.single('image'), async (req, res) => {
    console.log("Create Post Request Received");
    try {

        if (!req.user || !req.user.id) {
            return res.status(401).json({ message: "Unauthorized" });
        }

        const userId = req.user.id;
        const { content } = req.body; 
        const imageFile = req.file;   

        if ((!content || content.trim().length === 0) && !imageFile) {
            return res.status(400).json({ message: "Post must contain text or an image." });
        }

        let imagePath = null;
        if (imageFile) {
            imagePath = `/uploads/${imageFile.filename}`;
        }

        const newPost = new Post({
            user: userId,
            content: content ? content.trim() : '', 
            image: imagePath,
            likes: [],
            comments: []
        });

        await newPost.save();

        await newPost.populate('user', 'username profilePicture');

        res.status(201).json({
            success: true,
            post: newPost 
        });

    } catch (error) {
        console.error("Create Post Error:", error);
        res.status(500).json({ message: "Server error." });
    }
});

const fs = require('fs');

router.delete('/:postId', auth, async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        const postId = req.params.postId;

        const post = await Post.findById(postId);

        if (!post) {
            return res.status(404).json({ message: "Post not found." });
        }

        if (post.user.toString() !== user._id.toString() && !user.isAdmin) {
            return res.status(403).json({ message: "Not authorized to delete this post." });
        }

        if (post.image) {
            const imagePath = path.join(__dirname, '..', post.image); 
            if (fs.existsSync(imagePath)) {
                fs.unlink(imagePath, (err) => {
                    if (err) console.error("Failed to delete local image:", err);
                });
            }
        }

        await Comment.deleteMany({ post: postId });

        await post.deleteOne();

        res.status(200).json({
            success: true,
            message: "Post deleted successfully."
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server error." });
    }
});

module.exports = router;
