const mongoose = require('mongoose');

const QuestionSchema = new mongoose.Schema({
  words: { type: [String], required: true }, // VD: ["She", "is", "going"]
  type: { type: String, enum: ['affirmative', 'negative', 'question'] }
});

const QuestionSetSchema = new mongoose.Schema({
  title: { type: String, required: true }, // Tên bộ đề (VD: "Unit 1: Be going to")
  description: String,
  questions: [QuestionSchema],
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('QuestionSet', QuestionSetSchema);