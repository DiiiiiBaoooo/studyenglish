import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { cldUrl } from '../utils/cloudinary';
import './GuessPictureAdmin.css';

export default function GuessPictureAdmin() {
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

  const [items, setItems] = useState([]);
  const [loadingList, setLoadingList] = useState(true);

  const [answer, setAnswer] = useState('');
  const [imageFile, setImageFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [editingId, setEditingId] = useState(null); // null = đang thêm mới
  const [saving, setSaving] = useState(false);

  const fileInputRef = useRef(null);
  const objectUrlRef = useRef(null); // để revoke khi đổi ảnh/preview

  useEffect(() => {
    const fetchItems = async () => {
      try {
        const res = await axios.get(`${API_URL}/guesspicture`);
        setItems(res.data);
      } catch (err) {
        console.error('Lỗi khi tải kho ảnh:', err);
      } finally {
        setLoadingList(false);
      }
    };
    fetchItems();
  }, [API_URL]);

  // Dọn object URL cũ khi component unmount
  useEffect(() => () => {
    if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
  }, []);

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    const url = URL.createObjectURL(file);
    objectUrlRef.current = url;
    setImageFile(file);
    setPreviewUrl(url);
  };

  const resetForm = () => {
    setAnswer('');
    setImageFile(null);
    if (objectUrlRef.current) { URL.revokeObjectURL(objectUrlRef.current); objectUrlRef.current = null; }
    setPreviewUrl(null);
    setEditingId(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleEdit = (item) => {
    setEditingId(item._id);
    setAnswer(item.answer);
    setImageFile(null);
    if (objectUrlRef.current) { URL.revokeObjectURL(objectUrlRef.current); objectUrlRef.current = null; }
    setPreviewUrl(item.imageUrl); // hiện ảnh hiện có làm preview, chỉ đổi khi chọn file mới
    if (fileInputRef.current) fileInputRef.current.value = '';
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSubmit = async () => {
    if (!answer.trim()) {
      alert('Vui lòng nhập đáp án (từ tiếng Anh)!');
      return;
    }
    if (!editingId && !imageFile) {
      alert('Vui lòng chọn hình ảnh!');
      return;
    }

    const formData = new FormData();
    formData.append('answer', answer.trim());
    if (imageFile) formData.append('image', imageFile);

    setSaving(true);
    try {
      if (editingId) {
        const res = await axios.put(`${API_URL}/guesspicture/${editingId}`, formData);
        setItems(prev => prev.map(it => it._id === editingId ? res.data.item : it));
        alert('✅ Đã cập nhật!');
      } else {
        const res = await axios.post(`${API_URL}/guesspicture`, formData);
        setItems(prev => [res.data.item, ...prev]);
        alert('🎉 Đã thêm từ mới vào kho!');
      }
      resetForm();
    } catch (err) {
      console.error(err);
      alert(`❌ ${err.response?.data?.error || 'Có lỗi xảy ra, vui lòng thử lại.'}`);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (item) => {
    if (!confirm(`Xoá thẻ "${item.answer}" khỏi kho?`)) return;
    try {
      await axios.delete(`${API_URL}/guesspicture/${item._id}`);
      setItems(prev => prev.filter(it => it._id !== item._id));
      if (editingId === item._id) resetForm();
    } catch (err) {
      console.error('Lỗi khi xoá:', err);
      alert('❌ Lỗi khi xoá.');
    }
  };

  return (
    <div className="gp-admin-container">
      <div className="gp-admin-header">
        <h2>🖼️ Quản lý Kho Ảnh — Nhìn Hình Đoán Từ</h2>
        <div className="gp-admin-header-actions">
          <Link to="/guesspicture"><button className="btn-home">🎮 Chơi ngay</button></Link>
          <Link to="/"><button className="btn-home">🏠 Trang chủ</button></Link>
        </div>
      </div>

      <div className="gp-admin-card">
        <label className="section-label">
          {editingId ? '✏️ Sửa thẻ đã chọn' : '➕ Thêm thẻ mới (1 hình + 1 đáp án)'}
        </label>

        <div className="input-group">
          <label>Đáp án (từ tiếng Anh):</label>
          <input
            className="gp-admin-input"
            placeholder="VD: elephant"
            value={answer}
            onChange={e => setAnswer(e.target.value)}
          />
        </div>

        <div className="input-group">
          <label>Hình ảnh {editingId && '(để trống nếu giữ ảnh cũ)'}:</label>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="gp-file-input"
            onChange={handleFileChange}
          />
        </div>

        {previewUrl && (
          <div className="gp-preview-wrap">
            <img src={cldUrl(previewUrl, 'w_240,h_180,c_fill,q_auto,f_auto')} alt="Xem trước" className="gp-preview" onError={(e) => { e.currentTarget.src = previewUrl; }} />
          </div>
        )}

        <div className="gp-form-actions">
          <button className="btn-save" onClick={handleSubmit} disabled={saving}>
            {saving ? '⏳ Đang lưu...' : editingId ? '💾 Cập nhật' : '➕ Thêm vào kho'}
          </button>
          {editingId && (
            <button className="btn-cancel" onClick={resetForm} disabled={saving}>✖ Hủy</button>
          )}
        </div>
      </div>

      <div className="gp-admin-card">
        <label className="section-label">📦 Kho ảnh hiện có ({items.length} thẻ)</label>

        {loadingList ? (
          <p className="gp-empty">Đang tải...</p>
        ) : items.length === 0 ? (
          <p className="gp-empty">Chưa có thẻ nào. Hãy thêm thẻ đầu tiên ở trên!</p>
        ) : (
          <div className="gp-grid">
            {items.map(item => (
              <div key={item._id} className="gp-item-card">
                <img
                  className="gp-item-thumb"
                  src={cldUrl(item.imageUrl, 'w_200,h_150,c_fill,q_auto,f_auto')}
                  alt={item.answer}
                  loading="lazy"
                />
                <div className="gp-item-answer">{item.answer}</div>
                <div className="gp-item-actions">
                  <button className="btn-edit" onClick={() => handleEdit(item)}>✏️ Sửa</button>
                  <button className="btn-delete" onClick={() => handleDelete(item)}>🗑️ Xoá</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
