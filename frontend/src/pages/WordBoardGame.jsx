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

// Sinh vị trí ngẫu nhiên không chồng chéo
const generatePositions = (count, bw, bh) => {
  const W = 130, H = 48, PX = 12, PY = 12;
  const pos = [];
  let tries = 0;
  while (pos.length < count && tries < 3000) {
    tries++;
    const x = PX + Math.random() * (bw - W - PX * 2);
    const y = PY + Math.random() * (bh - H - PY * 2);
    const rotate = (Math.random() - 0.5) * 10;
    if (!pos.some(p => Math.abs(p.x - x) < W + 10 && Math.abs(p.y - y) < H + 10))
      pos.push({ x, y, rotate });
  }
  // fallback lưới nếu không đủ chỗ
  while (pos.length < count) {
    const col = pos.length % 4, row = Math.floor(pos.length / 4);
    pos.push({ x: PX + col * (W + 10), y: PY + row * (H + 12), rotate: (Math.random() - 0.5) * 5 });
  }
  return pos;
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
  // board: { id, word, topicIdx, found, pos }
  // found lưu tên topic đã chọn đúng để tô màu riêng
  const [board, setBoard] = useState([]);
  const [score, setScore] = useState(0);
  const [wrongCount, setWrongCount] = useState(0);
  const [wrongId, setWrongId] = useState(null);
  const [roundsCleared, setRoundsCleared] = useState(0);
  const [correctFlash, setCorrectFlash] = useState(null); // id vừa chọn đúng

  const boardRef = useRef(null);
  const topicQueueRef = useRef([]);
  const topicPosRef = useRef(0);
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

  // Lấy chủ đề tiếp theo (shuffle luân phiên)
  const pickNextTopic = useCallback((topics) => {
    if (topicPosRef.current >= topicQueueRef.current.length) {
      topicQueueRef.current = shuffleArray(topics.map((_, i) => i));
      topicPosRef.current = 0;
    }
    return topicQueueRef.current[topicPosRef.current++];
  }, []);

  // Xây bảng mới: mỗi topic góp 1 từ, tổng = wordsPerBoard
  const buildBoard = useCallback((topics, perBoard) => {
    const boardEl = boardRef.current;
    const bw = boardEl ? boardEl.offsetWidth : 680;
    const bh = boardEl ? boardEl.offsetHeight : 420;

    // Mỗi topic 1 từ đại diện (shuffle nội bộ)
    const slots = [];
    topics.forEach((t, ti) => {
      const word = shuffleArray(t.words)[0];
      if (word) slots.push({ word, topicIdx: ti });
    });

    // Thêm từ nhiễu từ các topic (chọn ngẫu nhiên) cho đủ perBoard
    const allWords = topics.flatMap((t, ti) => t.words.map(w => ({ word: w, topicIdx: ti })));
    const used = new Set(slots.map(s => s.word));
    const extras = shuffleArray(allWords.filter(w => !used.has(w.word)));
    let i = 0;
    while (slots.length < perBoard && i < extras.length) {
      slots.push(extras[i++]);
    }

    const shuffled = shuffleArray(slots);
    const positions = generatePositions(shuffled.length, bw, bh);
    return shuffled.map((s, idx) => ({
      id: ++idCnt.current,
      word: s.word,
      topicIdx: s.topicIdx,
      found: false,       // false = chưa tìm, hoặc topicIdx khi đã tìm đúng
      pos: positions[idx] || { x: 10, y: 10, rotate: 0 },
    }));
  }, []);

  const startGame = () => {
    if (!setData?.topics?.length) { alert('Bộ đề chưa có chủ đề!'); return; }
    if (!setData.topics.some(t => t.words?.length)) { alert('Chưa có từ nào!'); return; }

    topicQueueRef.current = [];
    topicPosRef.current = 0;
    setScore(0); setWrongCount(0); setRoundsCleared(0);
    setWrongId(null); setCorrectFlash(null);
    setTimeLeft(Number(duration) || 180);

    const newBoard = buildBoard(setData.topics, setData.wordsPerBoard || 10);
    setBoard(newBoard);

    const tIdx = pickNextTopic(setData.topics);
    setActiveTopic({ ...setData.topics[tIdx], idx: tIdx });
    setPhase('playing');
  };

  // Đổi sang chủ đề tiếp theo (không rebuild bảng)
  const advanceTopic = useCallback((currentBoard, topics) => {
    // Kiểm tra còn từ nào chưa tìm của các topic khác không
    const foundTopics = new Set(currentBoard.filter(b => b.found).map(b => b.topicIdx));

    // Còn topic nào chưa có từ được tìm không?
    const remaining = topics.filter((_, i) => !foundTopics.has(i) && currentBoard.some(b => b.topicIdx === i && !b.found));

    if (remaining.length === 0) {
      // Hết tất cả → build bảng mới
      return null; // signal rebuild
    }

    const tIdx = pickNextTopic(topics);
    return { ...topics[tIdx], idx: tIdx };
  }, [pickNextTopic]);

  const handleWordClick = (item) => {
    if (phase !== 'playing' || item.found) return;

    if (item.topicIdx === activeTopic.idx) {
      // Đúng!
      const newBoard = board.map(b => b.id === item.id ? { ...b, found: true } : b);
      setBoard(newBoard);
      setScore(s => s + 1);
      setCorrectFlash(item.id);
      clearTimeout(flashTimer.current);
      flashTimer.current = setTimeout(() => setCorrectFlash(null), 800);

      // Đổi chủ đề sau 600ms
      clearTimeout(nextTopicTimer.current);
      nextTopicTimer.current = setTimeout(() => {
        const next = advanceTopic(newBoard, setData.topics);
        if (next === null) {
          // Rebuild bảng mới
          const nb = buildBoard(setData.topics, setData.wordsPerBoard || 10);
          setBoard(nb);
          const tIdx = pickNextTopic(setData.topics);
          setActiveTopic({ ...setData.topics[tIdx], idx: tIdx });
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
            📜 Luật chơi: Bảng đen hiện các từ. Phía trên hiện <strong>1 chủ đề</strong> — hãy tìm
            và bấm đúng từ thuộc chủ đề đó. Chọn đúng → giữ nguyên bảng, đổi sang chủ đề khác.
            Chọn hết tất cả → bảng mới. Cố gắng trong <strong>{duration}s</strong>!
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
          <div className="wb-chalkboard" ref={boardRef}>
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
                        left: item.pos.x,
                        top: item.pos.y,
                        transform: `rotate(${item.pos.rotate}deg)`,
                        '--r': `${item.pos.rotate}deg`,
                        '--found-color': foundColor,
                      }}
                      onClick={() => handleWordClick(item)}
                      disabled={item.found}
                    >
                      {item.word}
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
              const isDone = board.some(b => b.topicIdx === i && b.found);
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
