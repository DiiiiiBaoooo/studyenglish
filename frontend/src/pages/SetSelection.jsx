import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';

export default function SetSelection() {
  const [sets, setSets] = useState([]);

  // 🌟 Khai báo biến môi trường giống như bên AdminDashboard
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

  useEffect(() => {
    const fetchSets = async () => {
      try {
        // 🌟 Cập nhật đường dẫn gọi API
        const res = await axios.get(`${API_URL}/sets`);
        setSets(res.data);
      } catch (error) {
        console.error('Lỗi khi tải danh sách bộ đề:', error);
      }
    };
    fetchSets();
  }, [API_URL]); // Thêm API_URL vào dependency array cho chuẩn React hook

  return (
    <div style={{ padding: '40px', textAlign: 'center', maxWidth: '800px', margin: '0 auto' }}>
      <h1 style={{ fontFamily: "'Baloo 2', sans-serif", color: '#2F6B4F', fontSize: '40px' }}>
        📚 Chọn Bộ Đề
      </h1>
      <p style={{ marginBottom: '30px', fontWeight: '600', color: '#6b6258' }}>
        Hãy chọn một bộ đề để bắt đầu trò chơi sắp xếp câu!
      </p>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px', justifyContent: 'center' }}>
        {sets.length === 0 ? (
          <p>Chưa có bộ đề nào. <Link to="/admin">Vào trang quản lý để tạo mới.</Link></p>
        ) : (
          sets.map((set) => (
            <Link 
              key={set._id} 
              to={`/play/${set._id}`}
              style={{
                display: 'block',
                background: '#fff',
                padding: '20px 30px',
                borderRadius: '16px',
                boxShadow: '0 4px 0 rgba(0,0,0,0.12)',
                border: '2px solid #f0e6d2',
                color: '#2F6B4F',
                fontFamily: "'Baloo 2', sans-serif",
                fontSize: '20px',
                fontWeight: 'bold',
                transition: 'transform 0.1s'
              }}
              onMouseOver={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
              onMouseOut={(e) => e.currentTarget.style.transform = 'translateY(0)'}
            >
              ⭐ {set.title}
            </Link>
          ))
        )}
      </div>
      
      <div style={{ marginTop: '50px', display: 'flex', justifyContent: 'center', gap: '24px', flexWrap: 'wrap' }}>
        <Link to="/admin" style={{ color: '#E8A33D', fontWeight: 'bold' }}>⚙️ Đi đến Trang Quản Trị</Link>
        <Link to="/tugofwar" style={{ color: '#6A8FE0', fontWeight: 'bold' }}>🪢 Chơi Kéo Co Trả Lời Câu Hỏi</Link>
        <Link to="/wordboard" style={{ color: '#9b6b1f', fontWeight: 'bold' }}>🎯 Chơi Chọn Từ Theo Chủ Đề</Link>
        <Link to="/guesspicture" style={{ color: '#2F6B4F', fontWeight: 'bold' }}>🖼️ Chơi Nhìn Hình Đoán Từ</Link>
      </div>
    </div>
  );
}