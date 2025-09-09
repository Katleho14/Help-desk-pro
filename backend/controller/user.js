import bcrypt from "bcrypt"; // Fixed typo: brcypt -> bcrypt
import jwt from "jsonwebtoken";
import User from "../models/user.js";
import { inngest } from "../inngest/client.js";

export const signup = async (req, res) => {
  const { email, password, skills = [] } = req.body;
  try {
    // Validate input
    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: "User already exists" });
    }

    // Check if there are any users in the database
    const userCount = await User.countDocuments();
    // If no users exist, the first one to sign up becomes an admin
    const role = userCount === 0 ? "admin" : "user";

    const hashed = await bcrypt.hash(password, 10); // Fixed typo
    const user = await User.create({
      email,
      password: hashed,
      skills,
      role, // Assign the determined role
    });

    // Fire inngest event
    try {
      await inngest.send({
        name: "user/signup",
        data: {
          email,
        },
      });
    } catch (inngestError) {
      console.error("Inngest error:", inngestError);
      // Continue even if inngest fails
    }

    const token = jwt.sign(
      { _id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '24h' } // Add token expiration
    );

    // Remove password from response
    const userResponse = {
      _id: user._id,
      email: user.email,
      role: user.role,
      skills: user.skills,
      createdAt: user.createdAt
    };

    res.json({ user: userResponse, token });
  } catch (error) {
    console.error("Signup error:", error);
    res.status(500).json({ error: "Signup failed", details: error.message });
  }
};

export const login = async (req, res) => {
  const { email, password } = req.body;

  try {
    // Validate input
    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ error: "Invalid credentials" }); // Don't reveal if user exists
    }

    const isMatch = await bcrypt.compare(password, user.password); // Fixed typo

    if (!isMatch) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const token = jwt.sign(
      { _id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '24h' } // Add token expiration
    );

    // Remove password from response
    const userResponse = {
      _id: user._id,
      email: user.email,
      role: user.role,
      skills: user.skills,
      createdAt: user.createdAt
    };

    res.json({ user: userResponse, token });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ error: "Login failed", details: error.message });
  }
};

export const logout = async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: "No token provided" });
    }

    const token = authHeader.split(" ")[1];
    if (!token) {
      return res.status(401).json({ error: "Invalid token format" });
    }

    jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
      if (err) {
        return res.status(401).json({ error: "Invalid token" });
      }
    });
    
    res.json({ message: "Logout successful" }); // Fixed typo: successfully -> successful
  } catch (error) {
    console.error("Logout error:", error);
    res.status(500).json({ error: "Logout failed", details: error.message });
  }
};

export const updateUser = async (req, res) => {
  const { skills = [], role, email } = req.body;
  try {
    if (req.user?.role !== "admin") {
      return res.status(403).json({ error: "Forbidden" });
    }

    if (!email) {
      return res.status(400).json({ error: "Email is required" });
    }

    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ error: "User not found" });

    await User.updateOne(
      { email },
      { skills: skills.length ? skills : user.skills, role }
    );
    return res.json({ message: "User updated successfully" });
  } catch (error) {
    console.error("Update user error:", error);
    res.status(500).json({ error: "Update failed", details: error.message });
  }
};

export const getUsers = async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ error: "Forbidden" });
    }

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 5;

    const users = await User.find()
      .select("-password")
      .limit(limit)
      .skip((page - 1) * limit)
      .exec();

    const count = await User.countDocuments();
    
    return res.json({
      users,
      pages: Math.ceil(count / limit),
      page: page,
    });
  } catch (error) {
    console.error("Get users error:", error);
    res.status(500).json({ error: "Fetching users failed", details: error.message });
  }
};