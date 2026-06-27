import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import './WordBoardGame.css';

const shuffleArray = (arr) => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

export default function WordBoardGame() {
  const { setId } = useParams();
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

  const [setData, setSetData] = useState(null);
  const [loadError, setLoadError] = useState(false);
  const [phase, setPhase] = useState('setup');

  const [duration, setDuration] = useState(180);
  const [timeLeft, setTimeLeft] = useState(180);

  const [activeTopic, setActiveTopic] = useState(null);
  // board: { id, word, topicIdx, found, rotate }
  const [board, setBoard] = useState([]);
  const [score, setScore] = useState(0);
  const [wrongCount, setWrongCount] = useState(0);
  const [wrongId, setWrongId] = useState(null);
  const [roundsCleared, setRoundsCleared] = useState(0);
  const [correctFlash, setCorrectFlash] = useState(null); // id vừa chọn đúng

  const idCnt = useRef(0);
  const wrongTimer = useRef(null);
  const flashTimer = useRef(null);
  const nextTopicTimer = useRef(null);

  // Tải bộ đề
  useEffect(() => {
    axios.get(`${API_URL}/wordboard/sets/${setId}`)
      .then(r => { setSetData(r.data); setDuration(r.data.duration || 180); })
      .catch(() => setLoadError(true));
  }, [setId, API_URL]);

  // Đồng hồ
  useEffect(() => {
    if (phase !== 'playing') return;
    if (timeLeft <= 0) { setPhase('finished'); return; }
    const id = setTimeout(() => setTimeLeft(t => t - 1), 1000);
    return () => clearTimeout(id);
  }, [phase, timeLeft]);

  useEffect(() => () => {
    clearTimeout(wrongTimer.current);
    clearTimeout(flashTimer.current);
    clearTimeout(nextTopicTimer.current);
  }, []);

  // Xây bảng mới: N từ cố định, trộn từ tất cả chủ đề (ưu tiên mỗi chủ đề góp ít nhất 1 từ)
  const buildBoard = useCallback((topics, perBoard) => {
    const topicOrder = shuffleArray(topics.map((_, i) => i));
    const used = new Set();
    const slots = [];

    // Bước 1: lấy 1 từ đại diện mỗi chủ đề (xoay vòng ngẫu nhiên các chủ đề) cho tới khi đủ N
    for (const ti of topicOrder) {
      if (slots.length >= perBoard) break;
      const candidates = shuffleArray(topics[ti].words || []);
      const word = candidates.find(w => !used.has(w));
      if (word) { slots.push({ word, topicIdx: ti }); used.add(word); }
    }

    // Bước 2: nếu chưa đủ N, lấy thêm từ ngẫu nhiên (có thể trùng chủ đề) cho đủ
    if (slots.length < perBoard) {
      const allWords = topics.flatMap((t, ti) => (t.words || []).map(w => ({ word: w, topicIdx: ti })));
      const extras = shuffleArray(allWords.filter(w => !used.has(w.word)));
      let i = 0;
      while (slots.length < perBoard && i < extras.length) {
        const cand = extras[i++];
        if (!used.has(cand.word)) { slots.push(cand); used.add(cand.word); }
      }
    }

    const final = shuffleArray(slots).slice(0, perBoard);
    return final.map(s => ({
      id: ++idCnt.current,
      word: s.word,
      topicIdx: s.topicIdx,
      found: false,
      rotate: (Math.random() - 0.5) * 6, // nghiêng nhẹ cho sinh động, không phá vỡ bố cục lưới
    }));
  }, []);

  // Chọn 1 chủ đề còn từ chưa khoanh trên bảng (tránh lặp lại đúng chủ đề vừa hỏi nếu còn lựa chọn khác)
  const pickAvailableTopic = useCallback((currentBoard, topics, avoidIdx) => {
    const unfound = currentBoard.filter(b => !b.found);
    if (unfound.length === 0) return null; // tất cả đã khoanh hết → báo hiệu cần bảng mới

    const distinctIdx = new Set(unfound.map(b => b.topicIdx));
    let pool = unfound;
    if (avoidIdx != null && distinctIdx.size > 1) {
      pool = unfound.filter(b => b.topicIdx !== avoidIdx);
    }
    const pick = pool[Math.floor(Math.random() * pool.length)];
    return { ...topics[pick.topicIdx], idx: pick.topicIdx };
  }, []);

  const startGame = () => {
    if (!setData?.topics?.length) { alert('Bộ đề chưa có chủ đề!'); return; }
    if (!setData.topics.some(t => t.words?.length)) { alert('Chưa có từ nào!'); return; }

    setScore(0); setWrongCount(0); setRoundsCleared(0);
    setWrongId(null); setCorrectFlash(null);
    setTimeLeft(Number(duration) || 180);

    const newBoard = buildBoard(setData.topics, setData.wordsPerBoard || 10);
    setBoard(newBoard);
    setActiveTopic(pickAvailableTopic(newBoard, setData.topics, null));
    setPhase('playing');
  };

  const handleWordClick = (item) => {
    if (phase !== 'playing' || item.found) return;

    if (item.topicIdx === activeTopic.idx) {
      // Đúng! → khoanh tròn từ này, giữ nguyên bảng
      const newBoard = board.map(b => b.id === item.id ? { ...b, found: true } : b);
      setBoard(newBoard);
      setScore(s => s + 1);
      setCorrectFlash(item.id);
      clearTimeout(flashTimer.current);
      flashTimer.current = setTimeout(() => setCorrectFlash(null), 800);

      // Đổi sang chủ đề khác sau 1 nhịp ngắn
      clearTimeout(nextTopicTimer.current);
      nextTopicTimer.current = setTimeout(() => {
        const next = pickAvailableTopic(newBoard, setData.topics, activeTopic.idx);
        if (next === null) {
          // Tất cả từ trên bảng đã bị khoanh hết → load bảng từ mới
          const nb = buildBoard(setData.topics, setData.wordsPerBoard || 10);
          setBoard(nb);
          setActiveTopic(pickAvailableTopic(nb, setData.topics, null));
          setRoundsCleared(r => r + 1);
        } else {
          setActiveTopic(next);
        }
      }, 600);

    } else {
      // Sai
      setWrongCount(w => w + 1);
      clearTimeout(wrongTimer.current);
      setWrongId(item.id);
      wrongTimer.current = setTimeout(() => setWrongId(null), 430);
    }
  };

  const handleRestart = () => {
    clearTimeout(wrongTimer.current);
    clearTimeout(flashTimer.current);
    clearTimeout(nextTopicTimer.current);
    setPhase('setup');
  };

  if (loadError) return (
    <div className="stage"><p style={{ textAlign: 'center', marginTop: 50 }}>
      ❌ Không tìm thấy bộ đề. <Link to="/wordboard">Quay lại</Link>
    </p></div>
  );
  if (!setData) return <div style={{ textAlign: 'center', marginTop: 50 }}>Đang tải...</div>;

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const timeLabel = `${minutes}:${seconds.toString().padStart(2, '0')}`;
  const foundCount = board.filter(b => b.found).length;
  const totalOnBoard = board.length;

  // Màu riêng cho từng topic khi đã tìm
  const TOPIC_COLORS = ['#7effa0', '#7dd3fc', '#fde68a', '#f9a8d4', '#c4b5fd', '#6ee7b7', '#fdba74'];

  return (
    <div className="stage wb-stage">
      <header className="title-block">
        <h1>🎯 Chọn Từ Theo Chủ Đề</h1>
        <p>{setData.title}</p>
        <div className="pencil-divider"></div>
      </header>

      {/* SETUP */}
      {phase === 'setup' && (
        <div className="wb-setup-card">
          {setData.description && <p className="wb-setup-desc">{setData.description}</p>}
          <div className="input-group small">
            <label>⏱️ Thời gian chơi (giây):</label>
            <input type="number" min="30" className="wb-admin-input"
              value={duration} onChange={e => setDuration(e.target.value)} />
          </div>
          <p className="wb-setup-rule">
            📜 Luật chơi: Bảng đen hiện <strong>{setData.wordsPerBoard || 10} từ cố định</strong> trộn từ mọi chủ đề.
            Phía trên hiện <strong>1 chủ đề</strong> — hãy tìm và bấm đúng từ thuộc chủ đề đó để khoanh tròn lại.
            Chọn đúng → bảng giữ nguyên, chỉ đổi sang chủ đề khác. Khi <strong>tất cả từ trên bảng đã được khoanh hết</strong>
            → mới chuyển sang bảng từ mới. Cố gắng trong <strong>{duration}s</strong>!
          </p>
          <button className="wb-start-btn" onClick={startGame}>🚀 Bắt Đầu Chơi!</button>
          <div className="wb-setup-footer"><Link to="/wordboard">⬅️ Chọn bộ đề khác</Link></div>
        </div>
      )}

      {/* PLAYING */}
      {phase === 'playing' && activeTopic && (
        <>
          <div className="wb-topbar">
            <div className="pill wb-timer-pill">⏱️ {timeLabel}</div>
            <div className="pill wb-score-pill">✅ {score}</div>
            {wrongCount > 0 && <div className="pill wb-wrong-pill">❌ {wrongCount}</div>}
            <div className="pill wb-progress-pill">📋 {foundCount}/{totalOnBoard}</div>
          </div>

          {/* Banner chủ đề */}
          <div className="wb-topic-banner">
            <span className="wb-topic-label">Tìm từ thuộc chủ đề:</span>
            <span className="wb-topic-name" key={activeTopic.name}>{activeTopic.name}</span>
          </div>

          {/* BẢNG ĐEN */}
          <div className="wb-chalkboard">
            <div className="wb-chalk-frame">
              <div className="wb-chalk-surface">
                {board.map(item => {
                  const foundColor = item.found
                    ? TOPIC_COLORS[item.topicIdx % TOPIC_COLORS.length]
                    : null;
                  return (
                    <button
                      key={item.id}
                      className={[
                        'wb-chalk-word',
                        item.found ? 'wb-chalk-found' : '',
                        wrongId === item.id ? 'wb-chalk-wrong' : '',
                        correctFlash === item.id ? 'wb-chalk-correct' : '',
                      ].join(' ')}
                      style={{
                        '--r': `${item.rotate}deg`,
                        '--found-color': foundColor,
                      }}
                      onClick={() => handleWordClick(item)}
                      disabled={item.found}
                    >
                      <span className="wb-chalk-word-text">{item.word}</span>
                      {item.found && <span className="wb-chalk-circle" />}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Legend topics */}
          <div className="wb-legend">
            {setData.topics.map((t, i) => {
              const onBoard = board.some(b => b.topicIdx === i);
              if (!onBoard) return null;
              const isDone = !board.some(b => b.topicIdx === i && !b.found);
              return (
                <span key={i} className={`wb-legend-chip ${activeTopic.idx === i ? 'wb-legend-active' : ''} ${isDone ? 'wb-legend-done' : ''}`}
                  style={{ '--chip-color': TOPIC_COLORS[i % TOPIC_COLORS.length] }}>
                  {isDone ? '✓ ' : ''}{t.name}
                </span>
              );
            })}
          </div>
        </>
      )}

      {/* FINISHED */}
      {phase === 'finished' && (
        <div className="wb-final-screen">
          <div className="wb-trophy">⏰</div>
          <h2>Hết giờ rồi!</h2>
          <p className="wb-final-score">
            ✅ Đúng: <strong>{score}</strong> &nbsp;|&nbsp;
            ❌ Sai: <strong>{wrongCount}</strong> &nbsp;|&nbsp;
            🔁 Bảng hoàn thành: <strong>{roundsCleared}</strong>
          </p>
          <div className="wb-final-actions">
            <button className="btn-reset" onClick={handleRestart}>🔄 Chơi Lại</button>
            <Link to="/wordboard"><button className="btn-next">📋 Bộ Đề Khác</button></Link>
          </div>
        </div>
      )}
    </div>
  );
}
