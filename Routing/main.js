
const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const User = require('../models/User');
const Post = require('../models/Post');



router.get('/', auth, async (req, res) => {
   try {
     const user = await User.findById(req.user.id).lean();
     if (!user) return res.render('login');
    
      
     const posts = await Post.find()
       .populate('user', 'username profilePicture')
       .sort({ createdAt: -1 })
       .lean();
    
     return res.render('main', { user, posts });
   } catch (err) {
     console.error('Failed to load main page:', err);
     return res.render('main', { user: null, posts: [] });
   }
 });




 module.exports = router;