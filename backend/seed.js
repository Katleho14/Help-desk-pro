// seed.js
// Run with: node seed.js

import mongoose from "mongoose";
import dotenv from "dotenv";
import bcrypt from "bcrypt";
import User from "./models/user.js"; // adjust path if needed

dotenv.config();

async function seed() {
  try {
    // 1️⃣ Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI);
    console.log("MongoDB connected ✅");

    // 2️⃣ Delete all existing users
    await User.deleteMany({});
    console.log("Existing users deleted ✅");

    // 3️⃣ Hash passwords
    const adminPassword = await bcrypt.hash("admin123", 10);
    const modPassword = await bcrypt.hash("mod123", 10);
    const userPassword = await bcrypt.hash("user123", 10);

    // 4️⃣ Create users
    const users = [
      {
        email: "admin@example.com",
        password: adminPassword,
        role: "admin",
        skills: [
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
          "javascript",
          "typescript",
          "java",
          "html",
          "css",
          "tailwind css"
        ]
      },
      {
        email: "moderator@example.com",
        password: modPassword,
        role: "moderator",
        skills: [
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
        password: userPassword,
        role: "user",
        skills: ["ask"]
      }
    ];

    // 5️⃣ Insert new users
    await User.insertMany(users);
    console.log("Seeded admin, moderator, and user ✅");

    // 6️⃣ Exit
    process.exit(0);
  } catch (err) {
    console.error("Seeding error:", err);
    process.exit(1);
  }
}

seed();
