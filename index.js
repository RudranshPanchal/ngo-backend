// import express from "express";
// import dotenv from "dotenv";
// import cors from "cors";
// import path from "path";
// import { fileURLToPath } from 'url';
// import { createServer } from 'http';
// import { Server } from 'socket.io';
// import mongoose from 'mongoose';
// import connectDB from "./src/db/connection.js";
// import authRouter from "./src/routes/Auth/auth.js";
// import galleryRouter from "./src/routes/Gallery/gallery.js";
// import donationRouter from "./src/routes/Donation/donation.js";
// import volunteerRouter from "./src/routes/Volunteer/volunteer.js";
// import beneficiaryRouter from "./src/routes/Beneficiary/beneficiary.js";
// import memberRouter from "./src/routes/Member/member.js";
// import certificateRouter from "./src/routes/Certificate/certificate.js";
// import donorRouter from "./src/routes/Donor/donor.js";

// const __filename = fileURLToPath(import.meta.url);
// const __dirname = path.dirname(__filename);

// dotenv.config();
// const app = express();
// const server = createServer(app);
// const io = new Server(server, {
//   cors: {
//     origin: "*",
//     methods: ["GET", "POST"]
//   }
// });

// app.use(cors({
//   origin: [
//     "https://orbosis-ngo-frontend-hazel.vercel.app",
//     "http://localhost:3000",
//     "http://localhost:3001",
//     "http://localhost:5173"
//   ],
//   credentials: true
// }));
// app.use(express.json({ limit: '10mb' }));
// app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// // Request logging middleware
// app.use((req, res, next) => {
//   console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
//   next();
// });

// // Serve static files from uploads directory
// app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// // Make io available to routes
// app.set('io', io);

// // Root route
// app.get('/', (req, res) => {
//   res.json({
//     message: 'OrbosisNGO Backend API is running!',
//     status: 'Active',
//     endpoints: {
//       auth: '/api/auth',
//       gallery: '/api/gallery',
//       donation: '/api/donation',
//       volunteer: '/api/volunteer',
//       beneficiary: '/api/beneficiary',
//       member: '/api/member',
//       certificate: '/api/certificate'
//     }
//   });
// });

// // Health check endpoint
// app.get('/health', (req, res) => {
//   res.json({
//     status: 'OK',
//     timestamp: new Date().toISOString(),
//     uptime: process.uptime(),
//     memory: process.memoryUsage(),
//     database: mongoose.connection.readyState === 1 ? 'Connected' : 'Disconnected'
//   });
// });

// // Test endpoint
// app.get('/test', async (req, res) => {
//   try {
//     const mongoose = await import('mongoose');
//     res.json({
//       message: 'Test endpoint working',
//       database: mongoose.default.connection.readyState === 1 ? 'Connected' : 'Disconnected',
//       timestamp: new Date()
//     });
//   } catch (error) {
//     res.status(500).json({ error: error.message });
//   }
// });

// // Test registration endpoint
// app.post('/test-register', async (req, res) => {
//   try {
//     const User = (await import('./src/model/Auth/auth.js')).default;
//     const bcrypt = (await import('bcrypt')).default;

//     const { fullName, email, password } = req.body;

//     if (!fullName || !email || !password) {
//       return res.status(400).json({ message: 'Missing required fields' });
//     }

//     const hash = await bcrypt.hash(password, 10);
//     const memberId = 'test' + Date.now();

//     const user = await User.create({
//       fullName,
//       email,
//       password: hash,
//       memberId,
//       role: 'donor'
//     });

//     res.json({
//       message: 'Test registration successful',
//       userId: user._id,
//       memberId: user.memberId
//     });
//   } catch (error) {
//     console.error('Test registration error:', error);
//     res.status(500).json({
//       error: error.message,
//       stack: error.stack
//     });
//   }
// });

// app.use("/api/auth", authRouter);
// app.use("/api/gallery", galleryRouter);
// // Test donation endpoint
// app.post('/test-donation', async (req, res) => {
//   try {
//     console.log('Test donation called with:', req.body);
//     const { amount, modeofDonation } = req.body;

//     if (!amount || !modeofDonation) {
//       return res.status(400).json({ message: 'Missing required fields' });
//     }

//     res.json({
//       message: 'Test donation successful',
//       received: { amount, modeofDonation },
//       timestamp: new Date()
//     });
//   } catch (error) {
//     console.error('Test donation error:', error);
//     res.status(500).json({ error: error.message });
//   }
// });
// app.get("/data",async(req,res)=>{
//   console.log("ggggg")
//   res.json({
//       message: 'Test donation successful',
//     });
// })
// // Check donations endpoint
// app.get('/check-donations', async (req, res) => {
//   try {
//     const Donation = (await import('./src/model/Donation/donation.js')).default;
//     const donations = await Donation.find().sort({ createdAt: -1 }).limit(10);
//     res.json({
//       message: 'Recent donations',
//       count: donations.length,
//       donations: donations.map(d => ({
//         _id: d._id,
//         amount: d.amount,
//         modeofDonation: d.modeofDonation,
//         donorName: d.donorName,
//         paymentStatus: d.paymentStatus,
//         createdAt: d.createdAt
//       }))
//     });
//   } catch (error) {
//     res.status(500).json({ error: error.message });
//   }
// });

// app.use("/api/donation", donationRouter);
// app.use("/api/volunteer", volunteerRouter);
// app.use("/api/beneficiary", beneficiaryRouter);
// app.use("/api/member", memberRouter);
// app.use("/api/certificate", certificateRouter);
// app.use("/api/donor", donorRouter);

// // Global error handling middleware
// app.use((err, req, res, next) => {
//   console.error('Global error handler:', {
//     message: err.message,
//     stack: err.stack,
//     url: req.url,
//     method: req.method,
//     timestamp: new Date().toISOString()
//   });

//   res.status(500).json({
//     message: 'Internal Server Error',
//     error: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong',
//     timestamp: new Date().toISOString()
//   });
// });

// // 404 handler
// app.use((req, res) => {
//   res.status(404).json({
//     message: 'Route not found',
//     path: req.originalUrl,
//     method: req.method
//   });
// });

// // Socket.IO connection handling
// io.on('connection', (socket) => {
//   console.log('User connected:', socket.id);

//   socket.on('join-donor-room', (userId) => {
//     socket.join(`donor-${userId}`);
//     console.log(`User ${userId} joined donor room`);
//   });

//   socket.on('disconnect', () => {
//     console.log('User disconnected:', socket.id);
//   });
// });

// connectDB();

// const PORT = process.env.PORT || 3000;
// server.listen(PORT, () => {
//   const actualPort = server.address().port;
//   console.log(` Server running on port ${actualPort}`);
// });

import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import { createServer } from "http";
import { Server } from "socket.io";
import mongoose from "mongoose";
import connectDB from "./src/db/connection.js";
import authRouter from "./src/routes/Auth/auth.js";
import galleryRouter from "./src/routes/Gallery/gallery.js";
import donationRouter from "./src/routes/Donation/donation.js";
import volunteerRouter from "./src/routes/Volunteer/volunteer.js";
import beneficiaryRouter from "./src/routes/Beneficiary/beneficiary.js";
import memberRouter from "./src/routes/Member/member.js";
import certificateRouter from "./src/routes/Certificate/certificate.js";
import donorRouter from "./src/routes/Donor/donor.js";
import fundRaisingrout from "./src/routes/fundRaisingrout/fundRaisingrout.js";
import auditReportRoutes from "./src/routes/AuditReport/report.routes.js";
import auditPdfRoutes from "./src/routes/AuditReport/pdf.routes.js";
import eventRouter from "./src/routes/Event/event.js";
import { log } from "console";
import notificationRouter from "./src/routes/Notification/notification.js";
import taskRouter from "./src/routes/Task/task.js";
import fundraiserRoutes from "./src/routes/Fundraiser/fundraiser.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();
const app = express();
const server = createServer(app);

const allowedOrigins = [
  "https://ngo-frontend-44nf.onrender.com", // ✅ Render frontend
  "https://orbosis-ngo-frontend-hazel.vercel.app",
  "http://localhost:5173",
  "http://localhost:5174",
  "http://localhost:3000",
  "http://localhost:3001",
];

app.use(
  cors({
    origin: function (origin, callback) {
      // Allow Postman / server-to-server
      if (!origin) return callback(null, true);

      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      } else {
        console.error("❌ CORS BLOCKED:", origin);
        return callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);
const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ["GET", "POST"],
    credentials: true,
  },
});

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use("/api/fundraiser", fundraiserRoutes);

// Request logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

app.use((req, res, next) => {
  console.log("REQ:", req.method, req.url, req.body);
  next();
});

// Serve static files from uploads directory
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Make io available to routes
app.set("io", io);

// Root route
app.get("/", (req, res) => {
  res.json({
    message: "OrbosisNGO Backend API is running!",
    status: "Active",
    endpoints: {
      auth: "/api/auth",
      gallery: "/api/gallery",
      donation: "/api/donation",
      volunteer: "/api/volunteer",
      beneficiary: "/api/beneficiary",
      member: "/api/member",
      certificate: "/api/certificate",
      fundraising: "/api/fundraising",
    },
  });
});

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({
    status: "OK",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    database:
      mongoose.connection.readyState === 1 ? "Connected" : "Disconnected",
  });
});

// Test endpoint
app.get("/test", async (req, res) => {
  try {
    const mongoose = await import("mongoose");
    res.json({
      message: "Test endpoint working",
      database:
        mongoose.default.connection.readyState === 1
          ? "Connected"
          : "Disconnected",
      timestamp: new Date(),
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Test registration endpoint
app.post("/test-register", async (req, res) => {
  try {
    const User = (await import("./src/model/Auth/auth.js")).default;
    const bcrypt = (await import("bcrypt")).default;

    const { fullName, email, password } = req.body;

    if (!fullName || !email || !password) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    const hash = await bcrypt.hash(password, 10);
    const memberId = "test" + Date.now();

    const user = await User.create({
      fullName,
      email,
      password: hash,
      memberId,
      role: "donor",
    });

    res.json({
      message: "Test registration successful",
      userId: user._id,
      memberId: user.memberId,
    });
  } catch (error) {
    console.error("Test registration error:", error);
    res.status(500).json({
      error: error.message,
      stack: error.stack,
    });
  }
});

app.use("/api/auth", authRouter);
app.use("/api/gallery", galleryRouter);
// Test donation endpoint
app.post("/test-donation", async (req, res) => {
  try {
    console.log("Test donation called with:", req.body);
    const { amount, modeofDonation } = req.body;

    if (!amount || !modeofDonation) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    res.json({
      message: "Test donation successful",
      received: { amount, modeofDonation },
      timestamp: new Date(),
    });
  } catch (error) {
    console.error("Test donation error:", error);
    res.status(500).json({ error: error.message });
  }
});
app.get("/data", async (req, res) => {
  console.log("data", req.body);
  res.json({
    message: "Test donation successful",
  });
});

// Events
app.use("/api/event", eventRouter);
app.use("/api/notification", notificationRouter);
app.use("/api/task", taskRouter);

// Audit Report
app.use("/api/report", auditReportRoutes);
app.use("/api/report", auditPdfRoutes);

// Check donations endpoint
app.get("/check-donations", async (req, res) => {
  try {
    const Donation = (await import("./src/model/Donation/donation.js")).default;
    const donations = await Donation.find().sort({ createdAt: -1 }).limit(10);
    res.json({
      message: "Recent donations",
      count: donations.length,
      donations: donations.map((d) => ({
        _id: d._id,
        amount: d.amount,
        modeofDonation: d.modeofDonation,
        donorName: d.donorName,
        paymentStatus: d.paymentStatus,
        createdAt: d.createdAt,
      })),
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.use("/api/donation", donationRouter);
app.use("/api/volunteer", volunteerRouter);
app.use("/api/beneficiary", beneficiaryRouter);
app.use("/api/member", memberRouter);
app.use("/api/certificate", certificateRouter);
app.use("/api/donor", donorRouter);
// fundraising
app.use("/api/fundraising", fundRaisingrout);

// Global error handling middleware
app.use((err, req, res, next) => {
  console.error("Global error handler:", {
    message: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    timestamp: new Date().toISOString(),
  });

  res.status(500).json({
    message: "Internal Server Error",
    error:
      process.env.NODE_ENV === "development"
        ? err.message
        : "Something went wrong",
    timestamp: new Date().toISOString(),
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    message: "Route not found",
    path: req.originalUrl,
    method: req.method,
  });
});

io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  // ✅ DONOR ROOM (already hai)
  socket.on("join-donor-room", (userId) => {
    socket.join(`donor-${userId}`);
    console.log(`User ${userId} joined donor room`);
  });

  // ✅ ADMIN ROOM (NEW – YAHI ADD KARNA THA)
  socket.on("join-admin-room", () => {
    socket.join("admins");
    console.log("Admin joined admin room");
  });

  // ✅ VOLUNTEER ROOM
  socket.on("join-volunteer-room", (userId) => {
    socket.join(`volunteer-${userId}`);
    console.log(`Volunteer ${userId} joined room: volunteer-${userId}`);
  });

  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);
  });
});

// Serve generated PDF folder
app.use("/pdf", express.static(path.join(__dirname, "pdf")));

connectDB();

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log("port---", PORT);

  const actualPort = server.address().port;
  console.log(` Server running on port ${actualPort}`);
});
