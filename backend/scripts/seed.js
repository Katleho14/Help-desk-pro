// seed.js
// Run with: node seed.js

import mongoose from "mongoose";
import dotenv from "dotenv";
import User from "./models/user.js";
import bcrypt from "bcrypt";

dotenv.config();

const users = [
  {
    email: "admin@example.com",
    password: await bcrypt.hash("admin123", 10),
    role: "admin",
    skills: ["manage", "support"]
  },
  {
    email: "moderator@example.com",
    password: await bcrypt.hash("mod123", 10),
    role: "moderator",
    skills: ["review", "support"]
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
    await mongoose.connect(process.env.MONGO_URL);
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
