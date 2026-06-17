import { BrowserRouter, Routes, Route } from 'react-router-dom';
import SetSelection from './pages/SetSelection';
import AdminDashboard from './pages/AdminDashboard';
import GameView from './pages/GameView';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<SetSelection />} />
        <Route path="/admin" element={<AdminDashboard />} />
        <Route path="/play/:setId" element={<GameView />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;