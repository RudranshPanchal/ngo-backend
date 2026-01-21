import cloudinary from "../config/cloudinary.js";
import fs from "fs";

export const uploadToCloudinary = (file, folder) => {
  return new Promise((resolve, reject) => {
    if (!file) return resolve(null);

    // 1. Handle Buffer (MemoryStorage)
    if (file.buffer) {
      const dataUri = `data:${file.mimetype};base64,${file.buffer.toString("base64")}`;

      const uploadOptions = {
        folder,
        resource_type: file.mimetype === "application/pdf" ? "image" : "auto",
        access_mode: "public",
      };

      if (file.mimetype === "application/pdf") {
        uploadOptions.flags = "attachment";
      }

      cloudinary.uploader.upload(dataUri, uploadOptions, (error, result) => {
        if (error) {
          console.error("Cloudinary Upload ERROR:", error);
          return reject(error);
        }
        console.log("Cloudinary upload successful:", result.secure_url);
        resolve(result.secure_url);
      });
    } 
    // 2. Handle Path (DiskStorage)
    else if (file.path) {
      const uploadOptions = {
        folder,
        resource_type: "auto",
        access_mode: "public",
      };

      if (file.mimetype === "application/pdf") {
        uploadOptions.resource_type = "image";
        uploadOptions.flags = "attachment";
      }

      cloudinary.uploader.upload(file.path, uploadOptions, (error, result) => {
        if (error) {
          console.error("Cloudinary Upload ERROR (Path):", error);
          return reject(error);
        }
        
        // Optional: Delete local file after upload
        try {
          fs.unlinkSync(file.path);
        } catch (e) {
          console.error("Failed to delete local file:", e);
        }

        console.log("Cloudinary upload successful (Path):", result.secure_url);
        resolve(result.secure_url);
      });
    } else {
      resolve(null);
    }
  });
};
