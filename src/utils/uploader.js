// import cloudinary from "../config/cloudinary.js";

// export const uploadToCloudinary = (file, folder) => {
//   return new Promise((resolve, reject) => {
//     if (!file || !file.buffer) return resolve(null);

//     const dataUri =
//       `data:${file.mimetype};base64,${file.buffer.toString("base64")}`;

//     cloudinary.uploader.upload(
//       dataUri,
//       {
//         folder,
//         resource_type:
//           file.mimetype === "application/pdf" ? "raw" : "image",
//       },
//       (error, result) => {
//         if (error) {
//           console.error("Cloudinary Upload ERROR:", error);
//           return reject(error);
//         }
//         resolve(result.secure_url);
//       }
//     );
//   });
// };
import cloudinary from "../config/cloudinary.js";
import fs from "fs";

/**
 * @param {Object|Buffer} file - Ya toh Multer ki file object ya fir raw Buffer
 * @param {String} folder - Cloudinary folder ka naam
 */
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
    
    let dataUri;
    let options = { folder };

    // 1. Agar ye PDF Buffer hai (Jo verifyDonationPayment se aayega)
    if (Buffer.isBuffer(file)) {
      dataUri = `data:application/pdf;base64,${file.toString("base64")}`;
      options.resource_type = "raw"; // PDF ke liye 'raw' zaroori hai
      options.format = "pdf";
    } 
    // 2. Agar ye Normal File hai (Jo Multer/Frontend se aayegi)
    else if (file && file.buffer) {
      dataUri = `data:${file.mimetype};base64,${file.buffer.toString("base64")}`;
      options.resource_type = file.mimetype === "application/pdf" ? "raw" : "image";
    } 
    else {
      return resolve(null);
    }

    // Cloudinary Upload Call
    cloudinary.uploader.upload(dataUri, options, (error, result) => {
      if (error) {
        console.error("❌ Cloudinary Upload ERROR:", error);
        return reject(error);
      }
      resolve(result.secure_url);
    });
  });
};