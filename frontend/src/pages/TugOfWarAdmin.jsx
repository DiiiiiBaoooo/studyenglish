import { useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import './TugOfWarAdmin.css';

const emptyOptionDraft = ['', '', '', ''];

export default function TugOfWarAdmin() {
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [duration, setDuration] = useState(90);
  const [winPulls, setWinPulls] = useState(5);
  const [questions, setQuestions] = useState([]);

  // Form thêm câu hỏi mới
  const [qType, setQType] = useState('multiple_choice'); // 'multiple_choice' | 'essay'
  const [qText, setQText] = useState('');
  const [options, setOptions] = useState(emptyOptionDraft);
  const [correctOptionIdx, setCorrectOptionIdx] = useState(0);
  const [essayAnswer, setEssayAnswer] = useState('');

  const resetQuestionForm = () => {
    setQText('');
    setOptions(emptyOptionDraft);
    setCorrectOptionIdx(0);
    setEssayAnswer('');
  };

  const handleAddQuestion = () => {
    if (!qText.trim()) {
      alert('Vui lòng nhập nội dung câu hỏi!');
      return;
    }

    if (qType === 'multiple_choice') {
      const filledOptions = options.map(o => o.trim()).filter(Boolean);
      if (filledOptions.length < 2) {
        alert('Câu trắc nghiệm cần ít nhất 2 lựa chọn!');
        return;
      }
      const correctAnswer = options[correctOptionIdx]?.trim();
      if (!correctAnswer) {
        alert('Vui lòng chọn đáp án đúng hợp lệ!');
        return;
      }
      setQuestions([...questions, {
        type: 'multiple_choice',
        question: qText.trim(),
        options: filledOptions,
        correctAnswer
      }]);
    } else {
      if (!essayAnswer.trim()) {
        alert('Vui lòng nhập đáp án đúng cho câu tự luận!');
        return;
      }
      setQuestions([...questions, {
        type: 'essay',
        question: qText.trim(),
        options: [],
        correctAnswer: essayAnswer.trim()
      }]);
    }

    resetQuestionForm();
  };

  const handleOptionChange = (idx, value) => {
    const next = [...options];
    next[idx] = value;
    setOptions(next);
  };

  const handleSaveSet = async () => {
    if (!title.trim() || questions.length === 0) {
      alert('Vui lòng nhập tên bộ đề và ít nhất 1 câu hỏi!');
      return;
    }
    try {
      await axios.post(`${API_URL}/tugofwar/sets`, {
        title: title.trim(),
        description: description.trim(),
        duration: Number(duration) || 90,
        winPulls: Number(winPulls) || 5,
        questions
      });
      alert('🎉 Đã lưu bộ đề kéo co thành công!');
      setTitle('');
      setDescription('');
      setDuration(90);
      setWinPulls(5);
      setQuestions([]);
    } catch (error) {
      console.error(error);
      alert('❌ Có lỗi xảy ra khi lưu bộ đề.');
    }
  };

  return (
    <div className="tow-admin-container">
      <div className="tow-admin-header">
        <h2>🪢 Quản lý bộ đề Kéo co</h2>
        <div className="tow-admin-header-actions">
          <Link to="/tugofwar"><button className="btn-home">📋 Danh sách</button></Link>
          <Link to="/"><button className="btn-home">🏠 Trang chủ</button></Link>
        </div>
      </div>

      <div className="tow-admin-card">
        <div className="input-group">
          <label>Tên bộ đề:</label>
          <input
            className="tow-admin-input"
            placeholder="VD: Kéo co Unit 5: Thì hiện tại tiếp diễn"
            value={title}
            onChange={e => setTitle(e.target.value)}
          />
        </div>

        <div className="input-group">
          <label>Mô tả (không bắt buộc):</label>
          <input
            className="tow-admin-input"
            placeholder="VD: Ôn tập từ vựng và ngữ pháp Unit 5"
            value={description}
            onChange={e => setDescription(e.target.value)}
          />
        </div>

        <div className="tow-settings-row">
          <div className="input-group small">
            <label>⏱️ Thời gian 1 trận (giây):</label>
            <input
              type="number"
              min="10"
              className="tow-admin-input"
              value={duration}
              onChange={e => setDuration(e.target.value)}
            />
          </div>
          <div className="input-group small">
            <label>🏆 Số lần kéo lệch để thắng:</label>
            <input
              type="number"
              min="1"
              className="tow-admin-input"
              value={winPulls}
              onChange={e => setWinPulls(e.target.value)}
            />
          </div>
        </div>
      </div>

      <div className="tow-admin-card">
        <label className="section-label">Thêm câu hỏi mới:</label>

        <div className="qtype-toggle">
          <button
            type="button"
            className={`qtype-btn ${qType === 'multiple_choice' ? 'active' : ''}`}
            onClick={() => setQType('multiple_choice')}
          >
            🔘 Trắc nghiệm
          </button>
          <button
            type="button"
            className={`qtype-btn ${qType === 'essay' ? 'active' : ''}`}
            onClick={() => setQType('essay')}
          >
            ✍️ Tự luận
          </button>
        </div>

        <div className="input-group">
          <label>Nội dung câu hỏi:</label>
          <input
            className="tow-admin-input"
            placeholder="VD: Chọn từ đúng: She ___ to school every day."
            value={qText}
            onChange={e => setQText(e.target.value)}
          />
        </div>

        {qType === 'multiple_choice' ? (
          <div className="options-box">
            <label>Các lựa chọn (chọn nút tròn để đánh dấu đáp án đúng):</label>
            {options.map((opt, idx) => (
              <div className="option-row" key={idx}>
                <button
                  type="button"
                  className={`option-radio ${correctOptionIdx === idx ? 'checked' : ''}`}
                  onClick={() => setCorrectOptionIdx(idx)}
                  title="Đánh dấu là đáp án đúng"
                >
                  {correctOptionIdx === idx ? '✓' : ''}
                </button>
                <input
                  className="tow-admin-input"
                  placeholder={`Lựa chọn ${idx + 1}`}
                  value={opt}
                  onChange={e => handleOptionChange(idx, e.target.value)}
                />
              </div>
            ))}
          </div>
        ) : (
          <div className="input-group">
            <label>Đáp án đúng (học sinh phải gõ đúng nội dung này):</label>
            <input
              className="tow-admin-input"
              placeholder="VD: goes"
              value={essayAnswer}
              onChange={e => setEssayAnswer(e.target.value)}
            />
          </div>
        )}

        <button className="btn-add-q" onClick={handleAddQuestion}>+ Thêm câu hỏi vào bộ đề</button>

        {questions.length > 0 && (
          <ul className="question-list">
            {questions.map((q, idx) => (
              <li key={idx} className="question-item">
                <span className="question-text">
                  <strong>Câu {idx + 1} {q.type === 'multiple_choice' ? '🔘' : '✍️'}:</strong> {q.question}
                  <br />
                  <span className="question-answer">Đáp án: {q.correctAnswer}</span>
                </span>
                <button
                  className="btn-delete"
                  onClick={() => setQuestions(questions.filter((_, i) => i !== idx))}
                >
                  Xóa
                </button>
              </li>
            ))}
          </ul>
        )}

        <button className="btn-save" onClick={handleSaveSet}>💾 Lưu Bộ Đề Kéo Co Này</button>
      </div>
    </div>
  );
}
