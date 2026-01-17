require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');
const bcryptjs = require('bcryptjs');

async function addUser() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB');

    // Hash password
    const hashedPassword = await bcryptjs.hash('99016887', 10);

    // Create new user
    const newUser = new User({
      username: 'aflif_edi',
      email: 'aflifedi28@gmail.com',
      password: hashedPassword,
      gender: 'Male',
      dateOfBirth: new Date('1995-01-01'),
      profilePicture: '/uploads/default-avatars/default.png',
      headline: 'Welcome to SocialSphere',
      work: 'SocialSphere User',
      bio: 'Just joined the platform. Excited to connect with amazing people!',
      experiences: [],
      isVerified: true,
      likedPosts: []
    });

    await newUser.save();
    console.log('✅ User created successfully!');
    console.log(`
📧 Email: aflifedi28@gmail.com
🔐 Password: 99016887
👤 Username: aflif_edi
    `);

    await mongoose.connection.close();
  } catch (error) {
    console.error('❌ Error adding user:', error);
    process.exit(1);
  }
}

addUser();
