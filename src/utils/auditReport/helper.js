import fs from "fs";


/**
 * Convert a file from disk to base64 (existing)
 */
export const toBase64File = (filePath) => {
  const img = fs.readFileSync(filePath);
  const base64 = img.toString("base64");
  const ext = filePath.split(".").pop();
  return `data:image/${ext};base64,${base64}`;
};

/**
 * Convert a file buffer (from multer memory storage) to base64
 */
// export const bufferToBase64 = (file) => {
//   if (!file) return null;

//   const mimeType = file.mimetype || "image/png"; // fallback to png
//   const base64 = file.buffer.toString("base64");

//   return `data:${mimeType};base64,${base64}`;
// };