import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import './WordBoardSelection.css';

export default function WordBoardSelection() {
  const [sets, setSets] = useState([]);
  const [loading, setLoading] = useState(true);
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

  useEffect(() => {
    const fetchSets = async () => {
      try {
        const res = await axios.get(`${API_URL}/wordboard/sets`);
        setSets(res.data);
      } catch (error) {
        console.error('Lỗi khi tải danh sách bộ đề:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchSets();
  }, [API_URL]);

  return (
    <div className="wb-select-container">
      <header className="wb-select-header">
        <h1>🎯 Chọn Từ Theo Chủ Đề</h1>
        <p>Chọn một bộ đề để bắt đầu — tìm và khoanh tròn đúng từ thuộc chủ đề!</p>
        <div className="pencil-divider"></div>
      </header>

      <div className="wb-select-grid">
        {loading ? (
          <p className="wb-empty">Đang tải...</p>
        ) : sets.length === 0 ? (
          <p className="wb-empty">
            Chưa có bộ đề nào. <Link to="/wordboard/admin">Vào trang quản lý để tạo mới.</Link>
          </p>
        ) : (
          sets.map(set => (
            <Link key={set._id} to={`/wordboard/play/${set._id}`} className="wb-card-link">
              <div className="wb-card-icon">🎯</div>
              <div className="wb-card-title">{set.title}</div>
              {set.description && <div className="wb-card-desc">{set.description}</div>}
              <div className="wb-card-meta">
                <span className="wb-badge">🏷️ {set.topicCount} chủ đề</span>
                <span className="wb-badge">📝 {set.wordCount} từ</span>
                <span className="wb-badge">⏱️ {set.duration}s</span>
              </div>
            </Link>
          ))
        )}
      </div>

      <div className="wb-select-footer">
        <Link to="/wordboard/admin" className="wb-link-admin">⚙️ Đi đến Trang Quản Trị</Link>
        <Link to="/" className="wb-link-home">📚 Trò chơi Sắp Xếp Câu</Link>
        <Link to="/tugofwar" className="wb-link-tow">🪢 Trò chơi Kéo Co</Link>
      </div>
    </div>
  );
}
