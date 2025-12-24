import multer from 'multer';
import path from 'path';

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/');
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  fileFilter: function (req, file, cb) {
    // Check if file is an image
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'), false);
    }
  },
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit 
  }
});

// PDF upload configuration
const pdfUpload = multer({
  storage: storage,
  fileFilter: function (req, file, cb) {
    // Check if file is a PDF
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are allowed!'), false);
    }
  },
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit for PDFs
  }
});

// Memory storage for Cloudinary uploads
const memoryStorage = multer.memoryStorage();

// Cloudinary upload configuration for images
const cloudinaryUpload = multer({
  storage: memoryStorage,
  fileFilter: function (req, file, cb) {
    // Check if file is an image
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'), false);
    }
  },
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  }
});

// Cloudinary upload configuration for images only
const cloudinaryImageUpload = multer({
  storage: memoryStorage,
  fileFilter: function (req, file, cb) {
    // Check if file is an image only
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'), false);
    }
  },
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit for images
  }
});

// Cloudinary upload configuration for PDFs
const cloudinaryPdfUpload = multer({
  storage: memoryStorage,
  fileFilter: function (req, file, cb) {
    // Check if file is a PDF
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are allowed!'), false);
    }
  },
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit for PDFs
  }
});

// Cloudinary upload configuration for both images and PDFs
const cloudinaryMixedUpload = multer({
  storage: memoryStorage,
  fileFilter: function (req, file, cb) {
    // Check if file is an image or PDF
    if (file.mimetype.startsWith('image/') || file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only image and PDF files are allowed!'), false);
    }
  },
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit for mixed files
  }
});

// Helper function to get local file URL
const getLocalFileUrl = (file) => {
  const base = process.env.BACKEND_PUBLIC_URL || "http://localhost:3000";
  if (!file) return null;
  // Return the local file path that can be served statically
  return `${base}/uploads/${file.filename}`;
};

export { getLocalFileUrl, upload, pdfUpload, cloudinaryUpload, cloudinaryPdfUpload, cloudinaryImageUpload, cloudinaryMixedUpload };