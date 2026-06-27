const cloudinary = require('cloudinary').v2;

// Cấu hình lấy từ biến môi trường (.env) — xem backend/.env.example
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

module.exports = cloudinary;
