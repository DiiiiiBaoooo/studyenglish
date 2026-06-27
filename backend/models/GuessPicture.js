const mongoose = require('mongoose');

// Mỗi document = 1 "thẻ" gồm 1 hình + 1 đáp án (từ tiếng Anh).
// Không có khái niệm "bộ đề" — khi chơi sẽ lấy ngẫu nhiên từ toàn bộ kho này.
const GuessPictureSchema = new mongoose.Schema({
  answer: { type: String, required: true, trim: true }, // VD: "elephant"
  imageUrl: { type: String, required: true }, // secure_url trả về từ Cloudinary
  publicId: { type: String, required: true }, // public_id trên Cloudinary (để xoá/thay ảnh)
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('GuessPicture', GuessPictureSchema);
