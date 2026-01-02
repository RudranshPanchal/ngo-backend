import cloudinary from "../config/cloudinary.js";

export const uploadToCloudinary = (file, folder) => {
  return new Promise((resolve, reject) => {
    if (!file || !file.buffer) return resolve(null);

    const dataUri =
      `data:${file.mimetype};base64,${file.buffer.toString("base64")}`;

    cloudinary.uploader.upload(
      dataUri,
      {
        folder,
        resource_type:
          file.mimetype === "application/pdf" ? "raw" : "image",
      },
      (error, result) => {
        if (error) {
          console.error("Cloudinary Upload ERROR:", error);
          return reject(error);
        }
        resolve(result.secure_url);
      }
    );
  });
};
