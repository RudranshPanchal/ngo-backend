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

/**
 * @param {Object|Buffer} file - Ya toh Multer ki file object ya fir raw Buffer
 * @param {String} folder - Cloudinary folder ka naam
 */
export const uploadToCloudinary = (file, folder) => {
  return new Promise((resolve, reject) => {
    
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