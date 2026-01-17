const express = require('express');
const router = express.Router();
const User = require('../models/User');
const bcrypt = require('bcryptjs'); 
const jwt = require('jsonwebtoken');

router.post('/', async (req, res) => {
    const { email, password } = req.body;

    try {
        const user = await User.findOne({ email });

        if (!user) 
            return res.status(401).json({ message: 'Invalid credentials or user not registred' });
        const isMatch = await bcrypt.compare(password, user.password)
        if (!isMatch) 
            return res.status(401).json({ message: 'Invalid credentials' });

        if (!user.isVerified)
            return res.status(403).json({ message: 'Please verify your email first' });
        
        if (user.isBlocked)
            return res.status(403).json({ message: 'Your account has been suspended by an admin.' });

        
        const token = jwt.sign(
            { id: user._id, email: user.email },
            process.env.JWT_SECRET,
            { expiresIn: '1h' }
        );

        res.cookie('jwt', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production', 
            maxAge: 3600000, 
            sameSite: 'strict',
        });
        return res.redirect('/');
    

    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router;
