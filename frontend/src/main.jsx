import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  // Tạm tắt StrictMode nếu bạn thấy animation chạy 2 lần trong quá trình dev
  // <React.StrictMode>
    <App />
  // </React.StrictMode>,
);