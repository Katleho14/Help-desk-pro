// seed.js
// Run with: node seed.js

import mongoose from "mongoose";
import dotenv from "dotenv";
import User from '../backend/models/user.js';
import bcrypt from "bcrypt";

dotenv.config();

const users = [
  {
    email: "admin@example.com",
    password: await bcrypt.hash("admin123", 10),
    role: "admin",
    skills: ["review",
  "support",
  "moderation",
  "conflict resolution",
  "community management",
  "communication",
  "ticket handling",
  "issue tracking",
  "report analysis",
  "user guidance",
  "policy enforcement",

  // Core Web & Programming Languages
  "javascript",
  "typescript",
  "java",
  "html",
  "css",
  "tailwind css"]
  },
  {
    email: "moderator@example.com",
    password: await bcrypt.hash("mod123", 10),
    role: "moderator",
    skills:[
  // Moderator / Support
  "review",
  "support",
  "moderation",
  "conflict resolution",
  "community management",
  "communication",
  "ticket handling",
  "issue tracking",
  "report analysis",
  "user guidance",
  "policy enforcement",

  // Core Web & Programming Languages
  "javascript",
  "typescript",
  "java",
  "html",
  "css",
  "tailwind css"
]

  },
  {
    email: "user@example.com",
    password: await bcrypt.hash("user123", 10),
    role: "user",
    skills: ["ask"]
  }
];

async function seed() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    await User.deleteMany({});
    await User.insertMany(users);
    console.log("Seeded admin, moderator, and user!");
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

seed();
