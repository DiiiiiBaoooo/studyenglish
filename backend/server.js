require('dotenv').config(); // 👈 Phải có dòng này trên cùng
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

// Import routes
const apiRoutes = require('./routes/api');
const tugOfWarRoutes = require('./routes/tugofwar');

const app = express();
app.use(cors());
app.use(express.json());

// Kết nối MongoDB thông qua biến môi trường
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('✅ Đã kết nối MongoDB'))
  .catch(err => console.error('❌ Lỗi kết nối MongoDB:', err));

// Sử dụng Routes
app.use('/api', apiRoutes);
app.use('/api/tugofwar', tugOfWarRoutes);

// Lấy PORT từ file .env, nếu không có thì mặc định dùng 5000
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server chạy tại http://localhost:${PORT}`));