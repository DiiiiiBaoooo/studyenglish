import { BrowserRouter, Routes, Route } from 'react-router-dom';
import SetSelection from './pages/SetSelection';
import AdminDashboard from './pages/AdminDashboard';
import GameView from './pages/GameView';
import TugOfWarSelection from './pages/TugOfWarSelection';
import TugOfWarAdmin from './pages/TugOfWarAdmin';
import TugOfWarGame from './pages/TugOfWarGame';
import WordBoardSelection from './pages/WordBoardSelection';
import WordBoardAdmin from './pages/WordBoardAdmin';
import WordBoardGame from './pages/WordBoardGame';

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
        <Route path="/wordboard" element={<WordBoardSelection />} />
        <Route path="/wordboard/admin" element={<WordBoardAdmin />} />
        <Route path="/wordboard/play/:setId" element={<WordBoardGame />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;