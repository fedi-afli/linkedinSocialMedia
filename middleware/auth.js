const jwt = require('jsonwebtoken');
const path = require("path");
const User = require('../models/User');

const auth = async (req, res, next) => {
    console.log("AUTH MIDDLEWARE CALLED for path:", req.path, "method:", req.method);
    
    const token = req.cookies.jwt; 

    if (!token) {
        if (req.path.startsWith('/api/') || req.path.startsWith('/user/search/')) {
            return res.status(401).json({ message: "No token provided, please log in." });
        }
        return res.render('login', { message: "" });
    }

    try {
      
        const verified = jwt.verify(token, process.env.JWT_SECRET);
        
      
        const user = await User.findById(verified.id);
      
        
        if (user && user.isBlocked) {
            console.log("Blocked user attempted access:", user.username);
           
            res.clearCookie('jwt');
          
           
            if (req.path.startsWith('/api/') || req.path.startsWith('/user/') || req.path.startsWith('/post/')) {
                return res.status(403).json({ 
                    success: false,
                    message: "Your account has been suspended by an admin.",
                    isBlocked: true
                });
            }

          
            return res.render('login', { message: "Your account has been suspended by an admin." });
        }
        
        req.user = verified;
        next(); 
    } catch (err) {
   
        if (req.path.startsWith('/api/')) {
            return res.status(403).json({ message: "Invalid token." });
        }
        return res.render('login', { message: "" });
    }
};

module.exports = auth;
