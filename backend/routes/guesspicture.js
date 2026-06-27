const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const multer = require('multer');
const streamifier = require('streamifier');
const cloudinary = require('../config/cloudinary');
const GuessPicture = require('../models/GuessPicture');

// Nhận file ảnh trong RAM (không lưu tạm ra ổ đĩa) rồi đẩy thẳng lên Cloudinary
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // tối đa 5MB / ảnh
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith('image/')) {
      return cb(new Error('Chỉ được upload file ảnh!'));
    }
    cb(null, true);
  }
});

const uploadBufferToCloudinary = (buffer) => {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder: 'studyenglish/guesspicture' },
      (err, result) => (err ? reject(err) : resolve(result))
    );
    streamifier.createReadStream(buffer).pipe(stream);
  });
};

// 1. Lấy toàn bộ kho ảnh (dùng cho trang quản lý)
router.get('/', async (req, res) => {
  try {
    const items = await GuessPicture.find().sort({ createdAt: -1 });
    res.json(items);
  } catch (err) {
    res.status(500).json({ error: 'Lỗi server' });
  }
});

// 2. Lấy 1 cặp hình/đáp án NGẪU NHIÊN để chơi — không cần chọn bộ đề
//    query ?exclude=id1,id2,... để tránh lặp lại các từ vừa hỏi trong phiên chơi hiện tại
router.get('/random', async (req, res) => {
  try {
    const total = await GuessPicture.countDocuments();
    if (total === 0) {
      return res.status(404).json({ error: 'Kho ảnh đang trống! Hãy thêm ảnh ở trang quản lý.' });
    }

    const excludeRaw = (req.query.exclude || '').toString();
    const excludeIds = excludeRaw
      .split(',')
      .map(s => s.trim())
      .filter(id => mongoose.Types.ObjectId.isValid(id));

    let match = {};
    if (excludeIds.length && excludeIds.length < total) {
      match = { _id: { $nin: excludeIds.map(id => new mongoose.Types.ObjectId(id)) } };
    }

    let sample = await GuessPicture.aggregate([
      { $match: match },
      { $sample: { size: 1 } }
    ]);

    // Nếu đã hỏi hết toàn bộ kho (hoặc match rỗng) → lấy ngẫu nhiên lại từ đầu (vòng lặp)
    if (sample.length === 0) {
      sample = await GuessPicture.aggregate([{ $sample: { size: 1 } }]);
    }

    res.json(sample[0]);
  } catch (err) {
    res.status(500).json({ error: 'Lỗi server' });
  }
});

// 3. Thêm 1 thẻ mới (ảnh + đáp án)
router.post('/', upload.single('image'), async (req, res) => {
  try {
    const { answer } = req.body;
    if (!answer || !answer.trim()) {
      return res.status(400).json({ error: 'Thiếu đáp án (từ tiếng Anh)!' });
    }
    if (!req.file) {
      return res.status(400).json({ error: 'Thiếu file ảnh!' });
    }

    const result = await uploadBufferToCloudinary(req.file.buffer);

    const newItem = new GuessPicture({
      answer: answer.trim(),
      imageUrl: result.secure_url,
      publicId: result.public_id,
    });
    await newItem.save();

    res.json({ message: 'Đã thêm từ mới', item: newItem });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Lỗi khi upload ảnh lên Cloudinary' });
  }
});

// 4. Sửa 1 thẻ (đổi đáp án và/hoặc thay ảnh mới)
router.put('/:id', upload.single('image'), async (req, res) => {
  try {
    const item = await GuessPicture.findById(req.params.id);
    if (!item) return res.status(404).json({ error: 'Không tìm thấy' });

    if (req.body.answer && req.body.answer.trim()) {
      item.answer = req.body.answer.trim();
    }

    if (req.file) {
      const result = await uploadBufferToCloudinary(req.file.buffer);
      const oldPublicId = item.publicId;
      item.imageUrl = result.secure_url;
      item.publicId = result.public_id;
      // Xoá ảnh cũ trên Cloudinary sau khi đã có ảnh mới, tránh mất ảnh nếu lỗi giữa đường
      cloudinary.uploader.destroy(oldPublicId).catch(() => {});
    }

    await item.save();
    res.json({ message: 'Cập nhật thành công', item });
  } catch (err) {
    res.status(500).json({ error: 'Lỗi khi cập nhật' });
  }
});

// 5. Xoá 1 thẻ
router.delete('/:id', async (req, res) => {
  try {
    const item = await GuessPicture.findById(req.params.id);
    if (!item) return res.status(404).json({ error: 'Không tìm thấy' });

    await cloudinary.uploader.destroy(item.publicId).catch(() => {});
    await GuessPicture.findByIdAndDelete(req.params.id);

    res.json({ message: 'Đã xoá' });
  } catch (err) {
    res.status(500).json({ error: 'Lỗi khi xoá' });
  }
});

// Bắt lỗi riêng từ multer (file quá lớn, không phải ảnh, v.v.) để trả JSON thay vì HTML
router.use((err, req, res, next) => {
  if (err) {
    return res.status(400).json({ error: err.message || 'Lỗi khi xử lý file ảnh' });
  }
  next();
});

module.exports = router;
