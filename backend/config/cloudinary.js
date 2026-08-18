const cloudinary = require("cloudinary").v2;

const isCloudinaryConfigured = () => {
  return Boolean(
    (process.env.CLOUDINARY_CLOUD_NAME &&
      process.env.CLOUDINARY_API_KEY &&
      process.env.CLOUDINARY_API_SECRET) ||
      process.env.CLOUDINARY_URL
  );
};

if (isCloudinaryConfigured()) {
  if (process.env.CLOUDINARY_URL) {
    cloudinary.config();
  } else {
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
      secure: true,
    });
  }
}

/**
 * Uploads a file buffer (from multer memoryStorage) directly to Cloudinary.
 * @param {Buffer} buffer - File buffer from req.file.buffer
 * @param {Object} options - Cloudinary upload options (folder, resource_type, etc.)
 * @returns {Promise<Object>} Cloudinary upload result object containing secure_url
 */
const uploadBufferToCloudinary = (buffer, options = {}) => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: "talentera",
        resource_type: "auto",
        ...options,
      },
      (error, result) => {
        if (error) return reject(error);
        resolve(result);
      }
    );
    uploadStream.end(buffer);
  });
};

module.exports = {
  cloudinary,
  isCloudinaryConfigured,
  uploadBufferToCloudinary,
};
