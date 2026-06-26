const mongoose = require('mongoose');

const TugQuestionSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['multiple_choice', 'essay'], // trắc nghiệm hoặc tự luận
    required: true,
    default: 'multiple_choice'
  },
  question: { type: String, required: true },
  options: { type: [String], default: [] }, // chỉ dùng cho trắc nghiệm
  correctAnswer: { type: String, required: true } // đáp án đúng (text)
});

const TugOfWarSetSchema = new mongoose.Schema({
  title: { type: String, required: true }, // VD: "Kéo co Unit 3: Thì hiện tại đơn"
  description: String,
  duration: { type: Number, default: 90 }, // thời gian 1 trận (giây), có thể cài đặt lại lúc chơi
  winPulls: { type: Number, default: 5 }, // số lần kéo lệch để thắng tuyệt đối
  questions: [TugQuestionSchema],
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('TugOfWarSet', TugOfWarSetSchema);
