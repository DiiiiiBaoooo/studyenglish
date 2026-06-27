const mongoose = require('mongoose');

const TopicSchema = new mongoose.Schema({
  name: { type: String, required: true }, // VD: "Animals", "Fruits"
  words: { type: [String], required: true, default: [] }
});

const WordBoardSetSchema = new mongoose.Schema({
  title: { type: String, required: true }, // VD: "Từ vựng chủ đề: Động vật & Trái cây"
  description: String,
  duration: { type: Number, default: 180 }, // 3 phút, có thể cài đặt lại lúc chơi
  wordsPerBoard: { type: Number, default: 10 }, // số từ hiển thị mỗi lượt
  topics: [TopicSchema],
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('WordBoardSet', WordBoardSetSchema);
