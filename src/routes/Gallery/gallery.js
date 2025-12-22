import express from "express";
import { createGallery, getAllGallery, deleteGallery } from "../../controller/Gallery/gallery.js";
import { cloudinaryImageUpload } from "../../utils/multer.js";
import { requireAdminOrVolunteer, requireAuth } from "../../middleware/auth.js";

const galleryRouter = express.Router();

// Create gallery with cloudinary image upload
galleryRouter.post(
  "/createGallery",
  requireAuth,
  requireAdminOrVolunteer,
  cloudinaryImageUpload.array("galleryImages", 10),
  createGallery
);

// Get all
galleryRouter.get("/getAllGallery", getAllGallery);

// Delete
galleryRouter.delete(
  "/deleteGallery/:id",
  requireAuth,
  requireAdminOrVolunteer,
  deleteGallery
);

export default galleryRouter;
