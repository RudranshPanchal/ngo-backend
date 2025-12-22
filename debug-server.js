import express from "express";
import dotenv from "dotenv";

dotenv.config();

const app = express();

// Basic middleware
app.use(express.json());

// Simple test route
app.get('/', (req, res) => {
  res.json({
    message: 'Debug server is running',
    timestamp: new Date().toISOString(),
    env: process.env.NODE_ENV || 'development'
  });
});

// Error handling
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({
    error: 'Server Error',
    message: err.message
  });
});

const PORT = process.env.PORT || 3003;

app.listen(PORT, () => {
  console.log(`Debug server running on port ${PORT}`);
}).on('error', (err) => {
  console.error('Server startup error:', err);
});