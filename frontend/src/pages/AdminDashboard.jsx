import { useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import './AdminDashboard.css';

export default function AdminDashboard() {
  const [title, setTitle] = useState('');
  const [questions, setQuestions] = useState([]);
  const [newSentence, setNewSentence] = useState(''); 

  const handleAddQuestion = () => {
    if (!newSentence.trim()) return;
    
    // Tự động tách chữ qua dấu cách và bỏ khoảng trắng thừa
    const wordsArray = newSentence.trim().split(/\s+/);
    
    setQuestions([...questions, { 
      words: wordsArray, 
      type: 'affirmative'
    }]);
    setNewSentence('');
  };

  const handleSaveSet = async () => {
    if (!title.trim() || questions.length === 0) {
      alert('Vui lòng nhập tên bộ đề và ít nhất 1 câu hỏi!');
      return;
    }

    try {
      await axios.post('http://localhost:5000/api/sets', {
        title,
        questions
      });
      alert('🎉 Đã lưu bộ đề thành công!');
      setTitle('');
      setQuestions([]);
    } catch (error) {
      console.error(error);
      alert('❌ Có lỗi xảy ra khi lưu bộ đề.');
    }
  };

  return (
    <div className="admin-container">
      <div className="admin-header">
        <h2>🛠 Quản lý bộ đề</h2>
        <Link to="/" className="btn-home">
          <button className="btn-home">🏠 Trang chủ</button>
        </Link>
      </div>
      
      <div className="admin-card">
        <div className="input-group">
          <label>Tên bộ đề (Chủ đề bài học):</label>
          <input 
            className="admin-input"
            placeholder="VD: Unit 1: Thì Tương lai gần (Be going to)" 
            value={title} 
            onChange={e => setTitle(e.target.value)} 
          />
        </div>

        <label style={{ display: 'block', fontWeight: '700', marginBottom: '8px', color: '#6b6258' }}>
          Thêm câu hỏi mới:
        </label>
        <div className="add-question-box">
          <input 
            className="admin-input"
            placeholder="Nhập 1 câu hoàn chỉnh (VD: I am going to play football)" 
            value={newSentence} 
            onChange={e => setNewSentence(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleAddQuestion()} 
          />
          <button className="btn-add" onClick={handleAddQuestion}>
            + Thêm câu
          </button>
        </div>

        {questions.length > 0 && (
          <ul className="question-list">
            {questions.map((q, idx) => (
              <li key={idx} className="question-item">
                <span className="question-text">
                  <strong>Câu {idx + 1}:</strong> {q.words.join(' ')} 
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

        <button className="btn-save" onClick={handleSaveSet}>
          💾 Lưu Bộ Đề Này
        </button>
      </div>
    </div>
  );
}