const express = require('express');
const router = express.Router();
const QuestionSet = require('../models/QuestionSet');

// 1. Lấy danh sách tất cả bộ đề
router.get('/sets', async (req, res) => {
  try {
    const sets = await QuestionSet.find().select('title description createdAt');
    res.json(sets);
  } catch (err) {
    res.status(500).json({ error: 'Lỗi server' });
  }
});

// 2. Lấy chi tiết 1 bộ đề
router.get('/sets/:id', async (req, res) => {
  try {
    const set = await QuestionSet.findById(req.params.id);
    res.json(set);
  } catch (err) {
    res.status(500).json({ error: 'Không tìm thấy bộ đề' });
  }
});

// 3. Tạo bộ đề mới
router.post('/sets', async (req, res) => {
  try {
    const newSet = new QuestionSet(req.body);
    await newSet.save();
    res.json({ message: 'Tạo bộ đề thành công', set: newSet });
  } catch (err) {
    res.status(500).json({ error: 'Lỗi khi lưu bộ đề' });
  }
});

// 4. Sửa bộ đề
router.put('/sets/:id', async (req, res) => {
  try {
    const updatedSet = await QuestionSet.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json({ message: 'Cập nhật thành công', set: updatedSet });
  } catch (err) {
    res.status(500).json({ error: 'Lỗi khi cập nhật' });
  }
});

module.exports = router;