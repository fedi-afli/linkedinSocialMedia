require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');
const Post = require('./models/Post');
const bcryptjs = require('bcryptjs');

const SAMPLE_USERS = [
  {
    username: 'sarah_jenkins',
    email: 'sarah@techgiant.com',
    password: 'password123',
    gender: 'Female',
    profilePicture: 'https://i.pravatar.cc/150?img=33',
    dateOfBirth: new Date('1990-05-15'),
    headline: 'Recruiter at TechGiant | Hiring Senior Frontend Engineers 🚀',
    work: 'TechGiant Inc.',
    bio: 'Passionate about connecting talented engineers with exciting opportunities. 5+ years of experience in tech recruitment. Let\'s connect!',
    experiences: [
      {
        title: 'Senior Recruiter',
        company: 'TechGiant Inc.',
        location: 'San Francisco, CA',
        startDate: new Date('2020-01-15'),
        endDate: null,
        current: true,
        description: 'Recruiting senior software engineers and building great teams'
      },
      {
        title: 'HR Specialist',
        company: 'StartupXYZ',
        location: 'Remote',
        startDate: new Date('2018-06-01'),
        endDate: new Date('2019-12-31'),
        current: false,
        description: 'Handled recruitment and employee relations'
      }
    ],
    isVerified: true
  },
  {
    username: 'david_cho',
    email: 'david@cybersec.com',
    password: 'password123',
    gender: 'Male',
    profilePicture: 'https://i.pravatar.cc/150?img=59',
    dateOfBirth: new Date('1988-08-22'),
    headline: 'Cybersecurity Analyst | Securing the Future 🔐',
    work: 'SecureNet Solutions',
    bio: 'Cybersecurity expert with 8+ years of experience. Passionate about secure coding, penetration testing, and protecting digital assets. CISSP certified.',
    experiences: [
      {
        title: 'Senior Cybersecurity Analyst',
        company: 'SecureNet Solutions',
        location: 'New York, NY',
        startDate: new Date('2019-03-01'),
        endDate: null,
        current: true,
        description: 'Leading security initiatives and conducting vulnerability assessments'
      },
      {
        title: 'Cybersecurity Engineer',
        company: 'TechDefense Corp',
        location: 'Boston, MA',
        startDate: new Date('2016-07-15'),
        endDate: new Date('2019-02-28'),
        current: false,
        description: 'Implemented security protocols and managed incident response'
      }
    ],
    isVerified: true
  },
  {
    username: 'emma_wilson',
    email: 'emma@designstudio.com',
    password: 'password123',
    gender: 'Female',
    profilePicture: 'https://i.pravatar.cc/150?img=47',
    dateOfBirth: new Date('1995-03-10'),
    headline: 'UX/UI Designer | Creating Beautiful Digital Experiences ✨',
    work: 'DesignStudio Creative',
    bio: 'Product designer obsessed with user-centered design. Experienced in Figma, prototyping, and user research. Believe great design is invisible.',
    experiences: [
      {
        title: 'Lead UX/UI Designer',
        company: 'DesignStudio Creative',
        location: 'Los Angeles, CA',
        startDate: new Date('2021-02-01'),
        endDate: null,
        current: true,
        description: 'Lead design team and establish design systems for enterprise clients'
      },
      {
        title: 'Product Designer',
        company: 'AppFlow Inc.',
        location: 'Remote',
        startDate: new Date('2019-05-20'),
        endDate: new Date('2021-01-31'),
        current: false,
        description: 'Designed mobile and web applications for SaaS platform'
      }
    ],
    isVerified: true
  },
  {
    username: 'alex_patel',
    email: 'alex@fullstack.dev',
    password: 'password123',
    gender: 'Male',
    profilePicture: 'https://i.pravatar.cc/150?img=12',
    dateOfBirth: new Date('1992-11-30'),
    headline: 'Full Stack Developer | JavaScript Enthusiast | Open Source Contributor',
    work: 'TechInnovate Labs',
    bio: 'Full stack developer with 7+ years of experience. Expert in JavaScript, React, Node.js, and MongoDB. Active open source contributor. Always learning!',
    experiences: [
      {
        title: 'Senior Full Stack Developer',
        company: 'TechInnovate Labs',
        location: 'Seattle, WA',
        startDate: new Date('2020-06-01'),
        endDate: null,
        current: true,
        description: 'Building scalable web applications and mentoring junior developers'
      },
      {
        title: 'Full Stack Developer',
        company: 'CodeWorks Studio',
        location: 'Remote',
        startDate: new Date('2017-08-15'),
        endDate: new Date('2020-05-31'),
        current: false,
        description: 'Developed full stack web applications for various startups'
      }
    ],
    isVerified: true
  },
  {
    username: 'jessica_brown',
    email: 'jessica@dataai.com',
    password: 'password123',
    gender: 'Female',
    profilePicture: 'https://i.pravatar.cc/150?img=71',
    dateOfBirth: new Date('1993-07-18'),
    headline: 'Data Scientist | AI/ML Enthusiast | Building Intelligent Solutions 🤖',
    work: 'AI Innovations Inc.',
    bio: 'Data scientist passionate about machine learning and artificial intelligence. Skilled in Python, TensorFlow, and data visualization. Published researcher.',
    experiences: [
      {
        title: 'Senior Data Scientist',
        company: 'AI Innovations Inc.',
        location: 'Austin, TX',
        startDate: new Date('2021-01-15'),
        endDate: null,
        current: true,
        description: 'Leading ML projects and developing predictive models'
      },
      {
        title: 'Data Scientist',
        company: 'Analytics Plus',
        location: 'Chicago, IL',
        startDate: new Date('2018-09-01'),
        endDate: new Date('2020-12-31'),
        current: false,
        description: 'Built machine learning models for business intelligence'
      }
    ],
    isVerified: true
  },
  {
    username: 'michael_torres',
    email: 'michael@devops.io',
    password: 'password123',
    gender: 'Male',
    profilePicture: 'https://i.pravatar.cc/150?img=23',
    dateOfBirth: new Date('1989-12-05'),
    headline: 'DevOps Engineer | Cloud Architect | AWS Certified ☁️',
    work: 'CloudScale Systems',
    bio: 'DevOps engineer with 9+ years of experience in cloud infrastructure. AWS Solutions Architect certified. Expertise in Kubernetes, Docker, and IaC.',
    experiences: [
      {
        title: 'DevOps Lead',
        company: 'CloudScale Systems',
        location: 'Denver, CO',
        startDate: new Date('2019-04-01'),
        endDate: null,
        current: true,
        description: 'Managing cloud infrastructure and leading DevOps team'
      },
      {
        title: 'Cloud Engineer',
        company: 'InfrastructurePro',
        location: 'Remote',
        startDate: new Date('2016-02-20'),
        endDate: new Date('2019-03-31'),
        current: false,
        description: 'Designed and maintained AWS infrastructure for multiple clients'
      }
    ],
    isVerified: true
  }
];

const SAMPLE_POSTS = [
  {
    userIndex: 0,
    content: "We are looking for Senior Frontend Engineers! 🚀\nIf you love React, TypeScript, and building scalable UI, send me a DM or apply below.\n\n#hiring #techjobs #remote",
    image: "/uploads/post_photo-1498050108023-c5249f4df085.avif"
  },
  {
    userIndex: 1,
    content: "Just finished a deep dive into the new authentication protocols for 2024. The shift towards passkeys is inevitable. What is everyone's take on removing passwords entirely? 🔐",
    image: "/uploads/post_photo-1517694712202-14dd9538aa97.avif"
  },
  {
    userIndex: 2,
    content: "Excited to announce my latest project! A beautiful dashboard redesign that improves user engagement by 40%. The attention to detail in UI design really makes a difference. ✨",
    image: "/uploads/post_photo-1552664730-d307ca884978.avif"
  },
  {
    userIndex: 3,
    content: "Tips for better JavaScript: Always use const by default, let when you need reassignment. Avoid var! Also, understand the event loop - it's crucial for async programming. ⚡",
    image: "/uploads/post_photo-1498050108023-c5249f4df085.avif"
  },
  {
    userIndex: 4,
    content: "Just deployed a machine learning model that predicts customer churn with 92% accuracy! The combination of XGBoost and feature engineering made all the difference. 📊",
    image: "/uploads/post_photo-1552664730-d307ca884978.avif"
  },
  {
    userIndex: 5,
    content: "Infrastructure as Code is a game-changer! Terraform + AWS makes deployment so much smoother. No more manual configurations and click-ops. DevOps best practices FTW! 🚀",
    image: "/uploads/post_photo-1517694712202-14dd9538aa97.avif"
  },
  {
    userIndex: 0,
    content: "Amazing collaboration with our engineering team this week! We shipped 5 new features and fixed critical performance issues. Team work makes the dream work! 💪",
    image: "/uploads/post_photo-1552664730-d307ca884978.avif"
  },
  {
    userIndex: 2,
    content: "Design tip: Always test your UI with real data, not dummy content. Real data reveals edge cases and improves your design decisions. 🎨",
    image: "/uploads/post_photo-1498050108023-c5249f4df085.avif"
  },
  {
    userIndex: 3,
    content: "Open source contribution of the day: Fixed a critical bug in a popular npm package used by thousands of developers. Contributing to the community feels amazing! 💪",
    image: "/uploads/post_photo-1517694712202-14dd9538aa97.avif"
  },
  {
    userIndex: 4,
    content: "Data quality is everything in ML. Spent the whole day cleaning and normalizing datasets. Garbage in, garbage out! #DataScience #MachineLearning",
    image: "/uploads/post_photo-1552664730-d307ca884978.avif"
  }
];

async function seedDatabase() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB');

    // Clear existing data
    await User.deleteMany({});
    await Post.deleteMany({});
    console.log('🗑️ Cleared existing users and posts');

    // Create new users with hashed passwords
    const usersWithHashedPasswords = await Promise.all(
      SAMPLE_USERS.map(async (user) => ({
        ...user,
        password: await bcryptjs.hash(user.password, 10)
      }))
    );

    const createdUsers = await User.insertMany(usersWithHashedPasswords);
    console.log(`✅ Created ${createdUsers.length} users`);

    // Create posts linked to different users
    const postsToCreate = SAMPLE_POSTS.map((post) => ({
      user: createdUsers[post.userIndex]._id,
      content: post.content,
      image: post.image,
      likes: [],
      createdAt: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000) // Random dates within last 7 days
    }));

    const createdPosts = await Post.insertMany(postsToCreate);
    console.log(`✅ Created ${createdPosts.length} posts`);

    // Display created data
    console.log('\n📋 Created Users:');
    createdUsers.forEach((user, i) => {
      console.log(`${i + 1}. @${user.username} (${user.email})`);
    });

    console.log('\n📝 Created Posts:');
    createdPosts.forEach((post, i) => {
      const author = createdUsers.find(u => u._id.equals(post.user));
      console.log(`${i + 1}. By @${author.username}: "${post.content.substring(0, 40)}..."`);
    });

    await mongoose.connection.close();
    console.log('\n✅ Database seeding complete!');
  } catch (error) {
    console.error('❌ Error seeding database:', error);
    process.exit(1);
  }
}

seedDatabase();
