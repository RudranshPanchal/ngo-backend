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
 * @param {Object|Buffer} file 
 * @param {String} folder 
 */
export const uploadToCloudinary = (file, folder) => {
  return new Promise((resolve, reject) => {
    if (!file) return resolve(null);

    // 1. Handle Raw Buffer (e.g. PDF generation)
    if (Buffer.isBuffer(file)) {
      const dataUri = `data:application/pdf;base64,${file.toString("base64")}`;
      const uploadOptions = {
        folder,
        resource_type: "raw"
      };

      cloudinary.uploader.upload(dataUri, uploadOptions, (error, result) => {
        if (error) {
          console.error(" Cloudinary Upload ERROR (Buffer):", error);
          return reject(error);
        }
        resolve(result.secure_url);
      });
    }
    // 2. Handle Multer File with Buffer (MemoryStorage)
    else if (file.buffer && file.mimetype) {
      const dataUri = `data:${file.mimetype};base64,${file.buffer.toString("base64")}`;
      const uploadOptions = {
        folder,
        resource_type: file.mimetype === "application/pdf" ? "raw" : "auto"
      };

      cloudinary.uploader.upload(dataUri, uploadOptions, (error, result) => {
        if (error) {
          console.error(" Cloudinary Upload ERROR (Memory):", error);
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
        resource_type: "auto"
      };

      cloudinary.uploader.upload(file.path, uploadOptions, (error, result) => {
        if (error) {
          console.error(" Cloudinary Upload ERROR (Path):", error);
          return reject(error);
        }

        try {
          if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
        } catch (e) {
          console.error("Failed to delete local file:", e);
        }

        console.log("Cloudinary upload successful (Path):", result.secure_url);
        resolve(result.secure_url);
      });
    }
    else if (typeof file === 'object' && (file.buffer || file instanceof Uint8Array)) {
      try {
        const buf = Buffer.from(file.buffer || file);
        const dataUri = `data:application/pdf;base64,${buf.toString("base64")}`;
        const uploadOptions = {
          folder,
          resource_type: "auto"
        };
        cloudinary.uploader.upload(dataUri, uploadOptions, (error, result) => {
          if (error) {
            console.error("Cloudinary Upload ERROR ", error);
            return reject(error);
          }
          resolve(result.secure_url);
        });
      } catch (e) { reject(e); }
    }
    else {
      resolve(null);
    }
  });
};

export const uploadBufferWithPublicId = (buffer, fileName, folder) => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: folder,
        resource_type: "auto",
        public_id: fileName,
      },
      (error, result) => {
        if (error) return reject(error);
        resolve(result.secure_url);
      }
    );
    uploadStream.end(buffer);
  });
};