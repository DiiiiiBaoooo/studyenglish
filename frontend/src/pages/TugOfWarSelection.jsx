import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import './TugOfWarSelection.css';

export default function TugOfWarSelection() {
  const [sets, setSets] = useState([]);
  const [loading, setLoading] = useState(true);
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

  useEffect(() => {
    const fetchSets = async () => {
      try {
        const res = await axios.get(`${API_URL}/tugofwar/sets`);
        setSets(res.data);
      } catch (error) {
        console.error('Lỗi khi tải danh sách bộ đề kéo co:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchSets();
  }, [API_URL]);

  return (
    <div className="tow-select-container">
      <header className="tow-select-header">
        <h1>🪢 Kéo Co Trả Lời Câu Hỏi</h1>
        <p>Chọn một bộ đề để chia 2 đội và bắt đầu kéo co!</p>
        <div className="pencil-divider"></div>
      </header>

      <div className="tow-select-grid">
        {loading ? (
          <p className="tow-empty">Đang tải...</p>
        ) : sets.length === 0 ? (
          <p className="tow-empty">
            Chưa có bộ đề nào. <Link to="/tugofwar/admin">Vào trang quản lý để tạo mới.</Link>
          </p>
        ) : (
          sets.map(set => (
            <Link key={set._id} to={`/tugofwar/play/${set._id}`} className="tow-card">
              <div className="tow-card-icon">🪢</div>
              <div className="tow-card-title">{set.title}</div>
              {set.description && <div className="tow-card-desc">{set.description}</div>}
              <div className="tow-card-meta">
                <span className="tow-badge">📝 {set.questionCount} câu</span>
                <span className="tow-badge">⏱️ {set.duration}s</span>
                <span className="tow-badge">🏆 {set.winPulls} lần kéo</span>
              </div>
            </Link>
          ))
        )}
      </div>

      <div className="tow-select-footer">
        <Link to="/tugofwar/admin" className="tow-link-admin">⚙️ Đi đến Trang Quản Trị Kéo Co</Link>
        <Link to="/" className="tow-link-home">📚 Quay lại trò chơi Sắp Xếp Câu</Link>
      </div>
    </div>
  );
}
