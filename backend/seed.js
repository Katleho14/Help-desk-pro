// seed.js - Database seeding script
// Run with: node seed.js

import mongoose from "mongoose";
import dotenv from "dotenv";
import bcrypt from "bcrypt";
import User from "./models/user.js";

// Load environment variables
dotenv.config();

// User data to seed
const userData = [
  {
    email: "admin@example.com",
    password: "admin123",
    role: "admin",
    skills: [
      "system administration",
      "user management",
      "database management",
      "security oversight",
      "policy enforcement",
      "content moderation",
      "technical support",
      "team leadership",
      "project management",
      "conflict resolution",
      "javascript",
      "typescript",
      "node.js",
      "mongodb",
      "react",
      "html",
      "css",
      "tailwind css"
    ]
  },
  {
    email: "moderator@example.com", 
    password: "mod123",
    role: "moderator",
    skills: [
      "content moderation",
      "community management",
      "user support",
      "conflict resolution",
      "report handling",
      "policy enforcement",
      "communication",
      "escalation management",
      "quality assurance",
      "training assistance",
      "javascript",
      "react",
      "html",
      "css",
      "customer service"
    ]
  },
  {
    email: "user@example.com",
    password: "user123", 
    role: "user",
    skills: [
      "general inquiries",
      "feedback submission",
      "community participation",
      "basic troubleshooting"
    ]
  },
  {
    email: "john.admin@company.com",
    password: "secure123",
    role: "admin",
    skills: [
      "full stack development",
      "devops",
      "system architecture",
      "team management",
      "code review",
      "javascript",
      "typescript",
      "python",
      "docker",
      "kubernetes",
      "aws"
    ]
  },
  {
    email: "sarah.mod@company.com",
    password: "moderator456",
    role: "moderator", 
    skills: [
      "community building",
      "content curation",
      "user onboarding",
      "social media management",
      "analytics",
      "marketing",
      "communication"
    ]
  },
  {
    email: "mike.user@company.com",
    password: "password789",
    role: "user",
    skills: [
      "web development",
      "frontend design",
      "ui/ux",
      "javascript",
      "react",
      "vue.js",
      "figma",
      "photoshop"
    ]
  }
];

async function hashPassword(password) {
  try {
    return await bcrypt.hash(password, 12); // Increased salt rounds for better security
  } catch (error) {
    console.error(`Error hashing password: ${error.message}`);
    throw error;
  }
}

async function createUser(userData) {
  try {
    const hashedPassword = await hashPassword(userData.password);
    
    return {
      email: userData.email,
      password: hashedPassword,
      role: userData.role,
      skills: userData.skills,
      createdAt: new Date()
    };
  } catch (error) {
    console.error(`Error creating user data for ${userData.email}: ${error.message}`);
    throw error;
  }
}

async function seedDatabase() {
  let connection;
  
  try {
    // Connect to MongoDB
    console.log('🔌 Connecting to MongoDB...');
    connection = await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ MongoDB connected successfully');
    
    // Check if users collection exists and get count
    const existingUserCount = await User.countDocuments();
    console.log(`📊 Found ${existingUserCount} existing users`);
    
    if (existingUserCount > 0) {
      console.log('🗑️  Clearing existing users...');
      const deleteResult = await User.deleteMany({});
      console.log(`✅ Deleted ${deleteResult.deletedCount} existing users`);
    }
    
    // Prepare user data with hashed passwords
    console.log('🔐 Hashing passwords and preparing user data...');
    const usersToCreate = [];
    
    for (const user of userData) {
      console.log(`   Processing ${user.email}...`);
      const processedUser = await createUser(user);
      usersToCreate.push(processedUser);
    }
    
    // Insert new users
    console.log('👥 Creating new users...');
    const createdUsers = await User.insertMany(usersToCreate);
    console.log(`✅ Successfully created ${createdUsers.length} users`);
    
    // Display summary
    console.log('\n📋 SEEDING SUMMARY:');
    console.log('==================');
    
    const roleCount = {
      admin: createdUsers.filter(u => u.role === 'admin').length,
      moderator: createdUsers.filter(u => u.role === 'moderator').length,
      user: createdUsers.filter(u => u.role === 'user').length
    };
    
    console.log(`👑 Admins: ${roleCount.admin}`);
    console.log(`🛡️  Moderators: ${roleCount.moderator}`);
    console.log(`👤 Users: ${roleCount.user}`);
    console.log(`📧 Total: ${createdUsers.length}`);
    
    console.log('\n🔑 LOGIN CREDENTIALS:');
    console.log('====================');
    userData.forEach(user => {
      console.log(`${user.role.toUpperCase().padEnd(9)} | ${user.email.padEnd(25)} | ${user.password}`);
    });
    
    console.log('\n🎉 Database seeding completed successfully!');
    
  } catch (error) {
    console.error('❌ Seeding failed:', error.message);
    
    if (error.code === 11000) {
      console.error('💡 Duplicate key error - user with this email already exists');
    }
    
    if (error.name === 'ValidationError') {
      console.error('💡 Validation error:', error.errors);
    }
    
    process.exit(1);
    
  } finally {
    // Close database connection
    if (connection) {
      await mongoose.connection.close();
      console.log('🔌 Database connection closed');
    }
    
    process.exit(0);
  }
}

// Handle process termination
process.on('SIGINT', async () => {
  console.log('\n⚠️  Process interrupted. Closing database connection...');
  await mongoose.connection.close();
  process.exit(0);
});

process.on('unhandledRejection', (error) => {
  console.error('❌ Unhandled Promise Rejection:', error);
  process.exit(1);
});

// Start seeding
console.log('🌱 Starting database seeding process...\n');
seedDatabase();
