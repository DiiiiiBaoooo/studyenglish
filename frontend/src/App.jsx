import { BrowserRouter, Routes, Route } from 'react-router-dom';
import SetSelection from './pages/SetSelection';
import AdminDashboard from './pages/AdminDashboard';
import GameView from './pages/GameView';
import TugOfWarSelection from './pages/TugOfWarSelection';
import TugOfWarAdmin from './pages/TugOfWarAdmin';
import TugOfWarGame from './pages/TugOfWarGame';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<SetSelection />} />
        <Route path="/admin" element={<AdminDashboard />} />
        <Route path="/play/:setId" element={<GameView />} />
        <Route path="/tugofwar" element={<TugOfWarSelection />} />
        <Route path="/tugofwar/admin" element={<TugOfWarAdmin />} />
        <Route path="/tugofwar/play/:setId" element={<TugOfWarGame />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;