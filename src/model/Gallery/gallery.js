import mongoose from "mongoose";

const gallerySchema = new mongoose.Schema({
    galleryImages: {
        type: Array,
    },

    youtubeVideo: {
        type: [String],
    },

    imageCaption : {
        type : String
    },

    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    }
},{timestamps: true});

const Gallery = mongoose.model("Gallery", gallerySchema);

export default Gallery;