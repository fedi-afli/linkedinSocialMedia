require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const cookieParser = require('cookie-parser');



const app = express();
const PORT = process.env.PORT || 3000;
const User = require('./models/User');
const Post = require('./models/Post');

// ---- EJS Setup ----
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'frontend'));

// ---- Middleware ----
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ---- MongoDB Connection ----
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('✅ Connected to MongoDB'))
  .catch(err => console.error('❌ Mongo error:', err));

// ---- Import Routes ----
const signupRoute = require('./Routing/signup');
const signinRoute = require('./Routing/signin');
const verifyRoute = require('./Routing/verify');
const logoutRoute = require('./Routing/logout');
const auth = require('./middleware/auth');
const userRoute = require('./Routing/user');
const profileRoute = require('./Routing/profile');
const jobsRoute = require('./Routing/jobs');
const messagesRoute = require('./Routing/messaging');
const mainRoute = require('./Routing/main');
const postRoute = require('./Routing/post');
const generateResume = require('./Routing/generateResume');
const passwordRoute = require('./Routing/password');

// ---- Use API Routes ----
app.use('/signup', signupRoute);
app.use('/signin', signinRoute);
app.use('/verify', verifyRoute);
app.use('/logout', logoutRoute);

app.use('/jobs', jobsRoute);
app.use('/messages', messagesRoute);
app.use('/profile', profileRoute);
app.use('/user', userRoute);
app.use('/post', postRoute);
app.use('/password', passwordRoute);
app.use('/', generateResume);



app.use('/main', mainRoute);


// ---- Static Files (place AFTER routes) ----
app.use(express.static(path.join(__dirname, 'public')));
// Serve uploaded files (profile pictures, default avatars)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.all("/",auth, (req, res) => {
  res.redirect("main")
})
// ---- 404 Not Found Page ----
app.use((req, res) => {
  res.status(404).render('404_page');
});

// ---- Error Page (500) ----
const errorRouter = require('./Routing/error');
app.use(errorRouter);

// ---- Start Server ----
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});

// Add error handlers to debug crashes
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});
