const express = require('express');
const router = express.Router();
const User = require('../models/User');
const path = require('path');


async function sendVerificationPage(res, filename) {
    try {
        res.status(200).render('verification_pages/' + filename);
    } catch (error) {
        console.error("Error rendering verification page:", error);
        res.status(500).send('<h1>Server Error: Page Not Found</h1>');
    }
}

router.get('/:token', async (req, res) => {
    try {
        const user = await User.findOne({ verificationToken: req.params.token });

        if (!user) {
      
            return sendVerificationPage(res, 'failure'); 
        }

        user.isVerified = true;
        user.verificationToken = undefined;
        await user.save();

       
        return sendVerificationPage(res, 'success');

    } catch (err) {
        console.error("Verification processing error:", err);
     
        return sendVerificationPage(res, 'failure'); 
    }
});

module.exports = router;