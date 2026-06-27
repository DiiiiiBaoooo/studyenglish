import { useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import './WordBoardAdmin.css';

export default function WordBoardAdmin() {
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [duration, setDuration] = useState(180);
  const [wordsPerBoard, setWordsPerBoard] = useState(10);
  const [topics, setTopics] = useState([]);

  // Form thêm chủ đề mới
  const [topicName, setTopicName] = useState('');
  const [topicWordsRaw, setTopicWordsRaw] = useState('');

  const handleAddTopic = () => {
    if (!topicName.trim()) {
      alert('Vui lòng nhập tên chủ đề!');
      return;
    }
    const words = topicWordsRaw
      .split(/[\n,]+/)
      .map(w => w.trim())
      .filter(Boolean);

    if (words.length === 0) {
      alert('Vui lòng nhập ít nhất 1 từ cho chủ đề này!');
      return;
    }

    setTopics([...topics, { name: topicName.trim(), words }]);
    setTopicName('');
    setTopicWordsRaw('');
  };

  const handleSaveSet = async () => {
    if (!title.trim() || topics.length === 0) {
      alert('Vui lòng nhập tên bộ đề và ít nhất 1 chủ đề!');
      return;
    }
    if (topics.length < 2) {
      const ok = confirm('Bộ đề chỉ có 1 chủ đề — sẽ không có từ "gây nhiễu" để phân biệt. Bạn vẫn muốn lưu?');
      if (!ok) return;
    }
    try {
      await axios.post(`${API_URL}/wordboard/sets`, {
        title: title.trim(),
        description: description.trim(),
        duration: Number(duration) || 180,
        wordsPerBoard: Number(wordsPerBoard) || 10,
        topics
      });
      alert('🎉 Đã lưu bộ đề thành công!');
      setTitle('');
      setDescription('');
      setDuration(180);
      setWordsPerBoard(10);
      setTopics([]);
    } catch (error) {
      console.error(error);
      alert('❌ Có lỗi xảy ra khi lưu bộ đề.');
    }
  };

  return (
    <div className="wb-admin-container">
      <div className="wb-admin-header">
        <h2>🎯 Quản lý bộ đề Chọn Từ Theo Chủ Đề</h2>
        <div className="wb-admin-header-actions">
          <Link to="/wordboard"><button className="btn-home">📋 Danh sách</button></Link>
          <Link to="/"><button className="btn-home">🏠 Trang chủ</button></Link>
        </div>
      </div>

      <div className="wb-admin-card">
        <div className="input-group">
          <label>Tên bộ đề:</label>
          <input
            className="wb-admin-input"
            placeholder="VD: Từ vựng chủ đề Động vật & Trái cây"
            value={title}
            onChange={e => setTitle(e.target.value)}
          />
        </div>

        <div className="input-group">
          <label>Mô tả (không bắt buộc):</label>
          <input
            className="wb-admin-input"
            placeholder="VD: Ôn từ vựng lớp 6 - Unit 3, 4"
            value={description}
            onChange={e => setDescription(e.target.value)}
          />
        </div>

        <div className="wb-settings-row">
          <div className="input-group small">
            <label>⏱️ Thời gian chơi (giây):</label>
            <input
              type="number"
              min="30"
              className="wb-admin-input"
              value={duration}
              onChange={e => setDuration(e.target.value)}
            />
          </div>
          <div className="input-group small">
            <label>🔢 Số từ hiển thị mỗi lượt:</label>
            <input
              type="number"
              min="4"
              max="20"
              className="wb-admin-input"
              value={wordsPerBoard}
              onChange={e => setWordsPerBoard(e.target.value)}
            />
          </div>
        </div>
      </div>

      <div className="wb-admin-card">
        <label className="section-label">Thêm chủ đề mới:</label>

        <div className="input-group">
          <label>Tên chủ đề:</label>
          <input
            className="wb-admin-input"
            placeholder="VD: Animals (Động vật)"
            value={topicName}
            onChange={e => setTopicName(e.target.value)}
          />
        </div>

        <div className="input-group">
          <label>Danh sách từ (mỗi từ 1 dòng, hoặc cách nhau bằng dấu phẩy):</label>
          <textarea
            className="wb-admin-textarea"
            placeholder={'cat\ndog\nelephant\ntiger\nrabbit'}
            value={topicWordsRaw}
            onChange={e => setTopicWordsRaw(e.target.value)}
            rows={5}
          />
        </div>

        <button className="btn-add-topic" onClick={handleAddTopic}>+ Thêm chủ đề vào bộ đề</button>

        {topics.length > 0 && (
          <ul className="topic-list">
            {topics.map((t, idx) => (
              <li key={idx} className="topic-item">
                <div className="topic-item-info">
                  <strong>🏷️ {t.name}</strong>
                  <span className="topic-word-count">{t.words.length} từ</span>
                  <div className="topic-word-preview">{t.words.join(', ')}</div>
                </div>
                <button
                  className="btn-delete"
                  onClick={() => setTopics(topics.filter((_, i) => i !== idx))}
                >
                  Xóa
                </button>
              </li>
            ))}
          </ul>
        )}

        <button className="btn-save" onClick={handleSaveSet}>💾 Lưu Bộ Đề Này</button>
      </div>
    </div>
  );
}
