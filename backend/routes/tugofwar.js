const express = require('express');
const router = express.Router();
const TugOfWarSet = require('../models/TugOfWarSet');

// 1. Lấy danh sách tất cả bộ đề kéo co (không kèm chi tiết câu hỏi cho nhẹ)
router.get('/sets', async (req, res) => {
  try {
    const sets = await TugOfWarSet.find().select('title description duration winPulls questions createdAt');
    // Trả thêm số lượng câu hỏi để hiển thị ở danh sách
    const result = sets.map(s => ({
      _id: s._id,
      title: s.title,
      description: s.description,
      duration: s.duration,
      winPulls: s.winPulls,
      questionCount: s.questions.length,
      createdAt: s.createdAt
    }));
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: 'Lỗi server' });
  }
});

// 2. Lấy chi tiết 1 bộ đề kéo co
router.get('/sets/:id', async (req, res) => {
  try {
    const set = await TugOfWarSet.findById(req.params.id);
    if (!set) return res.status(404).json({ error: 'Không tìm thấy bộ đề' });
    res.json(set);
  } catch (err) {
    res.status(500).json({ error: 'Không tìm thấy bộ đề' });
  }
});

// 3. Tạo bộ đề kéo co mới
router.post('/sets', async (req, res) => {
  try {
    const newSet = new TugOfWarSet(req.body);
    await newSet.save();
    res.json({ message: 'Tạo bộ đề kéo co thành công', set: newSet });
  } catch (err) {
    res.status(500).json({ error: 'Lỗi khi lưu bộ đề' });
  }
});

// 4. Sửa bộ đề kéo co
router.put('/sets/:id', async (req, res) => {
  try {
    const updatedSet = await TugOfWarSet.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json({ message: 'Cập nhật thành công', set: updatedSet });
  } catch (err) {
    res.status(500).json({ error: 'Lỗi khi cập nhật' });
  }
});

// 5. Xoá bộ đề kéo co
router.delete('/sets/:id', async (req, res) => {
  try {
    await TugOfWarSet.findByIdAndDelete(req.params.id);
    res.json({ message: 'Đã xoá bộ đề' });
  } catch (err) {
    res.status(500).json({ error: 'Lỗi khi xoá' });
  }
});

module.exports = router;
