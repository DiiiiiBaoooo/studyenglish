const express = require('express');
const router = express.Router();
const WordBoardSet = require('../models/WordBoardSet');

// 1. Lấy danh sách tất cả bộ đề (không cần trả hết từng từ cho nhẹ)
router.get('/sets', async (req, res) => {
  try {
    const sets = await WordBoardSet.find().select('title description duration wordsPerBoard topics createdAt');
    const result = sets.map(s => ({
      _id: s._id,
      title: s.title,
      description: s.description,
      duration: s.duration,
      wordsPerBoard: s.wordsPerBoard,
      topicCount: s.topics.length,
      wordCount: s.topics.reduce((sum, t) => sum + t.words.length, 0),
      createdAt: s.createdAt
    }));
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: 'Lỗi server' });
  }
});

// 2. Lấy chi tiết 1 bộ đề
router.get('/sets/:id', async (req, res) => {
  try {
    const set = await WordBoardSet.findById(req.params.id);
    if (!set) return res.status(404).json({ error: 'Không tìm thấy bộ đề' });
    res.json(set);
  } catch (err) {
    res.status(500).json({ error: 'Không tìm thấy bộ đề' });
  }
});

// 3. Tạo bộ đề mới
router.post('/sets', async (req, res) => {
  try {
    const newSet = new WordBoardSet(req.body);
    await newSet.save();
    res.json({ message: 'Tạo bộ đề thành công', set: newSet });
  } catch (err) {
    res.status(500).json({ error: 'Lỗi khi lưu bộ đề' });
  }
});

// 4. Sửa bộ đề
router.put('/sets/:id', async (req, res) => {
  try {
    const updatedSet = await WordBoardSet.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json({ message: 'Cập nhật thành công', set: updatedSet });
  } catch (err) {
    res.status(500).json({ error: 'Lỗi khi cập nhật' });
  }
});

// 5. Xoá bộ đề
router.delete('/sets/:id', async (req, res) => {
  try {
    await WordBoardSet.findByIdAndDelete(req.params.id);
    res.json({ message: 'Đã xoá bộ đề' });
  } catch (err) {
    res.status(500).json({ error: 'Lỗi khi xoá' });
  }
});

module.exports = router;
