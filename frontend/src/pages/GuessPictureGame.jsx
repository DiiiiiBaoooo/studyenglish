import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { cldUrl } from '../utils/cloudinary';
import './GuessPictureGame.css';

const GAME_DURATION = 120; // Cố định 2 phút cho mỗi lượt chơi
const MAX_RECENT_EXCLUDE = 12; // Nhớ tối đa bao nhiêu từ vừa hỏi để tránh lặp lại gần nhau

const shuffleArray = (arr) => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

// Trả về 1 cách xáo trộn 4 miếng [0,1,2,3] -> đảm bảo gần như luôn khác thứ tự gốc
const makeShuffledPieces = () => {
  let order = shuffleArray([0, 1, 2, 3]);
  if (order.join() === '0,1,2,3') order = shuffleArray(order);
  return order;
};

// Toạ độ background-position cho từng miếng gốc (0: trên-trái, 1: trên-phải, 2: dưới-trái, 3: dưới-phải)
const PIECE_POSITIONS = ['0% 0%', '100% 0%', '0% 100%', '100% 100%'];

const normalize = (s) => s.toString().trim().toLowerCase().replace(/\s+/g, ' ');

const answerHint = (answer) =>
  answer
    .split(' ')
    .map(w => w.split('').map(() => '_').join(' '))
    .join('   ');

export default function GuessPictureGame() {
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

  const [phase, setPhase] = useState('setup'); // 'setup' | 'playing' | 'finished'
  const [poolCount, setPoolCount] = useState(null);
  const [poolError, setPoolError] = useState(null);

  const [timeLeft, setTimeLeft] = useState(GAME_DURATION);
  const [currentItem, setCurrentItem] = useState(null);
  const [pieceOrder, setPieceOrder] = useState([0, 1, 2, 3]);
  const [loadingNext, setLoadingNext] = useState(false);

  const [inputValue, setInputValue] = useState('');
  const [feedback, setFeedback] = useState(null); // null | 'correct' | 'wrong' | 'skipped'

  const [score, setScore] = useState(0);
  const [wrongCount, setWrongCount] = useState(0);
  const [skipCount, setSkipCount] = useState(0);

  const recentIds = useRef([]);
  const advanceTimer = useRef(null);
  const wrongTimer = useRef(null);
  const inputRef = useRef(null);

  // Kiểm tra nhanh kho ảnh có sẵn từ chưa (để cảnh báo trước khi chơi)
  useEffect(() => {
    axios.get(`${API_URL}/guesspicture`)
      .then(res => setPoolCount(res.data.length))
      .catch(() => setPoolError('Không kết nối được tới server.'));
  }, [API_URL]);

  // Đồng hồ đếm ngược 2 phút
  useEffect(() => {
    if (phase !== 'playing') return;
    if (timeLeft <= 0) { setPhase('finished'); return; }
    const id = setTimeout(() => setTimeLeft(t => t - 1), 1000);
    return () => clearTimeout(id);
  }, [phase, timeLeft]);

  // Dọn timer khi unmount
  useEffect(() => () => {
    clearTimeout(advanceTimer.current);
    clearTimeout(wrongTimer.current);
  }, []);

  // Tự focus vào ô nhập mỗi khi có từ mới
  useEffect(() => {
    if (phase === 'playing' && currentItem && !loadingNext) {
      inputRef.current?.focus();
    }
  }, [currentItem, phase, loadingNext]);

  const fetchNextWord = useCallback(async () => {
    setLoadingNext(true);
    setFeedback(null);
    setInputValue('');
    try {
      const res = await axios.get(`${API_URL}/guesspicture/random`, {
        params: { exclude: recentIds.current.join(',') }
      });
      const item = res.data;
      recentIds.current = [...recentIds.current, item._id].slice(-MAX_RECENT_EXCLUDE);
      setCurrentItem(item);
      setPieceOrder(makeShuffledPieces());
    } catch (err) {
      console.error('Lỗi khi tải từ tiếp theo:', err);
      alert('❌ Kho ảnh đang trống hoặc mất kết nối. Quay về màn hình bắt đầu.');
      setPhase('setup');
    } finally {
      setLoadingNext(false);
    }
  }, [API_URL]);

  const startGame = () => {
    if (!poolCount) {
      alert('Kho ảnh chưa có thẻ nào! Hãy thêm ảnh ở trang quản lý trước.');
      return;
    }
    clearTimeout(advanceTimer.current);
    clearTimeout(wrongTimer.current);
    recentIds.current = [];
    setScore(0);
    setWrongCount(0);
    setSkipCount(0);
    setCurrentItem(null);
    setTimeLeft(GAME_DURATION);
    setPhase('playing');
    fetchNextWord();
  };

  const handleCheck = () => {
    if (!currentItem || loadingNext || feedback === 'correct' || feedback === 'skipped') return;
    if (!inputValue.trim()) return;

    const isCorrect = normalize(inputValue) === normalize(currentItem.answer);
    if (isCorrect) {
      setFeedback('correct');
      setScore(s => s + 1);
      clearTimeout(advanceTimer.current);
      advanceTimer.current = setTimeout(fetchNextWord, 900);
    } else {
      setWrongCount(w => w + 1);
      setFeedback('wrong');
      clearTimeout(wrongTimer.current);
      wrongTimer.current = setTimeout(() => setFeedback(null), 500);
    }
  };

  const handleSkip = () => {
    if (!currentItem || loadingNext || feedback === 'correct') return;
    setSkipCount(s => s + 1);
    setFeedback('skipped');
    clearTimeout(advanceTimer.current);
    advanceTimer.current = setTimeout(fetchNextWord, 1500);
  };

  const handleRestart = () => {
    clearTimeout(advanceTimer.current);
    clearTimeout(wrongTimer.current);
    setPhase('setup');
    setCurrentItem(null);
  };

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const timeLabel = `${minutes}:${seconds.toString().padStart(2, '0')}`;

  return (
    <div className="stage gp-stage">
      <header className="title-block">
        <h1>🖼️ Nhìn Hình Đoán Từ</h1>
        <p>Ảnh sẽ bị xáo trộn 4 phần — đoán đúng từ tiếng Anh trong hình!</p>
        <div className="pencil-divider"></div>
      </header>

      {/* SETUP */}
      {phase === 'setup' && (
        <div className="gp-setup-card">
          <p className="gp-setup-rule">
            📜 Luật chơi: Mỗi lượt, hình sẽ được <strong>cắt thành 4 phần và xáo trộn vị trí</strong>.
            Hãy nhìn hình và gõ đúng <strong>từ tiếng Anh</strong> vào ô bên dưới. Đoán đúng → tự chuyển
            sang hình khác ngay, không cần chọn bộ đề. Bạn có đúng <strong>2 phút</strong> để đoán được
            càng nhiều từ càng tốt!
          </p>

          {poolError ? (
            <p className="gp-pool-warning">❌ {poolError}</p>
          ) : poolCount === null ? (
            <p className="gp-pool-info">Đang kiểm tra kho ảnh...</p>
          ) : poolCount === 0 ? (
            <p className="gp-pool-warning">
              ⚠️ Kho ảnh chưa có thẻ nào. <Link to="/guesspicture/admin">Vào trang quản lý để thêm ảnh.</Link>
            </p>
          ) : (
            <p className="gp-pool-info">📦 Kho hiện có <strong>{poolCount}</strong> từ để đoán.</p>
          )}

          <button className="gp-start-btn" onClick={startGame} disabled={!poolCount}>
            🚀 Bắt Đầu Chơi!
          </button>

          <div className="gp-setup-footer">
            <Link to="/guesspicture/admin">🖼️ Quản lý kho ảnh</Link>
            <Link to="/">📚 Trò chơi Sắp Xếp Câu</Link>
            <Link to="/tugofwar">🪢 Trò chơi Kéo Co</Link>
            <Link to="/wordboard">🎯 Trò chơi Chọn Từ Theo Chủ Đề</Link>
          </div>
        </div>
      )}

      {/* PLAYING */}
      {phase === 'playing' && (
        <>
          <div className="gp-topbar">
            <div className={`pill gp-timer-pill ${timeLeft <= 10 ? 'gp-timer-warning' : ''}`}>
              <span className="emoji">⏱️</span> {timeLabel}
            </div>
            <div className="pill score"><span className="emoji">✅</span> {score}</div>
            {wrongCount > 0 && <div className="pill gp-wrong-pill"><span className="emoji">❌</span> {wrongCount}</div>}
            {skipCount > 0 && <div className="pill gp-skip-pill"><span className="emoji">⏭️</span> {skipCount}</div>}
          </div>

          <div className={`gp-puzzle-wrap ${feedback === 'wrong' ? 'gp-shake' : ''}`}>
            {!currentItem ? (
              <div className="gp-puzzle gp-puzzle-loading">⏳ Đang tải hình...</div>
            ) : (
              <div className="gp-puzzle">
                {pieceOrder.map((pieceIdx, slot) => (
                  <div
                    key={slot}
                    className="gp-piece"
                    style={{
                      backgroundImage: `url(${cldUrl(currentItem.imageUrl, 'w_600,h_450,c_fill,q_auto,f_auto')})`,
                      backgroundPosition: PIECE_POSITIONS[pieceIdx],
                    }}
                  />
                ))}
              </div>
            )}
          </div>

          {currentItem && (
            <p className="gp-hint">💡 Gợi ý độ dài: <span className="gp-hint-dashes">{answerHint(currentItem.answer)}</span></p>
          )}

          <div className="gp-answer-row">
            <input
              ref={inputRef}
              type="text"
              className="gp-answer-input"
              placeholder="Nhập từ tiếng Anh..."
              value={inputValue}
              disabled={loadingNext || feedback === 'correct' || feedback === 'skipped'}
              onChange={e => setInputValue(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleCheck()}
            />
            <button
              className="btn-check"
              onClick={handleCheck}
              disabled={loadingNext || feedback === 'correct' || feedback === 'skipped'}
            >
              ✅ Kiểm tra
            </button>
            <button
              className="gp-skip-btn"
              onClick={handleSkip}
              disabled={loadingNext || feedback === 'correct'}
            >
              ⏭️ Bỏ qua
            </button>
          </div>

          {feedback && (
            <div className={`feedback gp-feedback-${feedback}`}>
              {feedback === 'correct' && '🎉 Chính xác!'}
              {feedback === 'wrong' && '❌ Sai rồi, thử lại nhé!'}
              {feedback === 'skipped' && currentItem && `🙈 Đáp án là: ${currentItem.answer}`}
            </div>
          )}
        </>
      )}

      {/* FINISHED */}
      {phase === 'finished' && (
        <div className="final-screen">
          <div className="gp-trophy">⏰</div>
          <h2>Hết giờ rồi!</h2>
          <p className="gp-final-score">
            ✅ Đúng: <strong>{score}</strong> &nbsp;|&nbsp;
            ❌ Sai: <strong>{wrongCount}</strong> &nbsp;|&nbsp;
            ⏭️ Bỏ qua: <strong>{skipCount}</strong>
          </p>
          <div className="controls">
            <button className="btn-reset" onClick={handleRestart}>🔄 Chơi Lại</button>
            <Link to="/guesspicture/admin"><button className="btn-next">🖼️ Quản Lý Kho Ảnh</button></Link>
          </div>
        </div>
      )}
    </div>
  );
}
