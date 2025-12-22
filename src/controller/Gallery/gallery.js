import Gallery from "../../model/Gallery/gallery.js";
import { uploadToCloudinary } from "../../utils/uploader.js";

export const createGallery = async (req, res) => {
    try {
        const { youtubeVideo } = req.body;
        const files = req.files;
        const {imageCaption} = req.body
        // Convert youtubeVideo to array if it's a single string
        const youtubeVideos = Array.isArray(youtubeVideo) ? youtubeVideo : [youtubeVideo];

        // Upload images to Cloudinary
        const galleryImages = [];
        for (const file of files) {
            try {
                const imageUrl = await uploadToCloudinary(file, 'gallery');
                if (imageUrl) {
                    galleryImages.push(imageUrl);
                }
            } catch (error) {
                console.error('Error uploading image:', error);
                return res.status(500).json({
                    success: false,
                    message: 'Error uploading images to Cloudinary',
                    error: error.message
                });
            }
        }

        // Create gallery entry
        const gallery = new Gallery({
            galleryImages,
            youtubeVideo: youtubeVideos,
            imageCaption,
            createdBy: req.user._id
        });

        await gallery.save();

        res.status(201).json({
            success: true,
            message: "Gallery created successfully",
            data: gallery
        });

    } catch (error) {
        console.error("Error creating gallery:", error);
        res.status(500).json({
            success: false,
            message: "Internal server error",
            error: error.message
        });
    }
}

export const getAllGallery = async (req, res) => {
    try {
        // Get all galleries and populate createdBy field
        const galleries = await Gallery.find()
            .populate('createdBy', 'name email role')
            .sort({ createdAt: -1 });

        res.status(200).json({
            success: true,
            message: "Galleries retrieved successfully",
            data: galleries
        });

    } catch (error) {
        console.error("Error fetching galleries:", error);
        res.status(500).json({
            success: false,
            message: "Internal server error",
            error: error.message
        });
    }
}

export const deleteGallery = async (req, res) => {
    try {
        const { id } = req.params;
        if (!id) {
            return res.status(400).json({ success: false, message: "Gallery id is required" });
        }

        const deleted = await Gallery.findByIdAndDelete(id);
        if (!deleted) {
            return res.status(404).json({ success: false, message: "Gallery not found" });
        }
        return res.status(200).json({ success: true, message: "Gallery deleted successfully" });
    } catch (error) {
        console.error("Error deleting gallery:", error);
        return res.status(500).json({ success: false, message: "Internal server error", error: error.message });
    }
}