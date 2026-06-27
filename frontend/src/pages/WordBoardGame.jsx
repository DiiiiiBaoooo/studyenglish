import { useEffect, useState, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import './WordBoardGame.css';

const shuffleArray = (array) => {
  const newArr = [...array];
  for (let i = newArr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArr[i], newArr[j]] = [newArr[j], newArr[i]];
  }
  return newArr;
};

// Lấy `count` phần tử từ pool (không lặp lại nếu pool đủ lớn, lặp lại tuần hoàn nếu cần nhiều hơn)
const pickItems = (pool, count) => {
  if (!pool || pool.length === 0 || count <= 0) return [];
  const shuffled = shuffleArray(pool);
  if (count <= shuffled.length) return shuffled.slice(0, count);
  const result = [...shuffled];
  while (result.length < count) {
    result.push(shuffled[result.length % shuffled.length]);
  }
  return result.slice(0, count);
};

const randomBetween = (min, max) => min + Math.floor(Math.random() * (max - min + 1));

export default function WordBoardGame() {
  const { setId } = useParams();
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

  const [setData, setSetData] = useState(null);
  const [loadError, setLoadError] = useState(false);

  // phase: 'setup' | 'playing' | 'finished'
  const [phase, setPhase] = useState('setup');

  const [duration, setDuration] = useState(180);
  const [timeLeft, setTimeLeft] = useState(180);

  const [activeTopic, setActiveTopic] = useState(null);
  const [board, setBoard] = useState([]);
  const [score, setScore] = useState(0);
  const [wrongCount, setWrongCount] = useState(0);
  const [wrongId, setWrongId] = useState(null);
  const [roundsCleared, setRoundsCleared] = useState(0);

  const topicQueueRef = useRef([]);
  const topicPosRef = useRef(0);
  const idCounterRef = useRef(0);
  const refillTimerRef = useRef(null);
  const wrongTimerRef = useRef(null);

  // 1. Tải bộ đề
  useEffect(() => {
    const fetchSet = async () => {
      try {
        const res = await axios.get(`${API_URL}/wordboard/sets/${setId}`);
        setSetData(res.data);
        setDuration(res.data.duration || 180);
      } catch (error) {
        console.error('Lỗi tải bộ đề:', error);
        setLoadError(true);
      }
    };
    fetchSet();
  }, [setId, API_URL]);

  // 2. Đồng hồ đếm ngược
  useEffect(() => {
    if (phase !== 'playing') return;
    if (timeLeft <= 0) {
      const t = setTimeout(() => setPhase('finished'), 0);
      return () => clearTimeout(t);
    }
    const id = setTimeout(() => setTimeLeft(t => t - 1), 1000);
    return () => clearTimeout(id);
  }, [phase, timeLeft]);

  // Dọn dẹp các timer khi unmount
  useEffect(() => {
    return () => {
      clearTimeout(refillTimerRef.current);
      clearTimeout(wrongTimerRef.current);
    };
  }, []);

  const pickNextTopicIndex = (topicsArr) => {
    if (topicPosRef.current >= topicQueueRef.current.length) {
      topicQueueRef.current = shuffleArray(topicsArr.map((_, i) => i));
      topicPosRef.current = 0;
    }
    const idx = topicQueueRef.current[topicPosRef.current];
    topicPosRef.current += 1;
    return idx;
  };

  const buildRound = () => {
    const topicsArr = setData.topics;
    const perBoard = Number(setData.wordsPerBoard) || 10;
    const activeIdx = pickNextTopicIndex(topicsArr);
    const topic = topicsArr[activeIdx];

    let matchWords;
    let distractorItems = [];

    if (topicsArr.length <= 1) {
      matchWords = pickItems(topic.words, perBoard);
    } else {
      const maxM = Math.max(1, Math.min(6, topic.words.length, perBoard - 1));
      const minM = Math.min(3, maxM);
      const matchesCount = randomBetween(minM, maxM);
      matchWords = pickItems(topic.words, matchesCount);

      const otherWords = topicsArr
        .filter((_, i) => i !== activeIdx)
        .flatMap(t => t.words.map(w => ({ word: w, topic: t.name })));
      const distractorsCount = perBoard - matchWords.length;
      distractorItems = pickItems(otherWords, distractorsCount).map(o => ({
        word: o.word, topic: o.topic, isMatch: false
      }));
    }

    const matchItems = matchWords.map(w => ({ word: w, topic: topic.name, isMatch: true }));
    const newBoard = shuffleArray([...matchItems, ...distractorItems]).map(item => ({
      id: ++idCounterRef.current,
      word: item.word,
      topic: item.topic,
      isMatch: item.isMatch,
      found: false
    }));

    return { topic, newBoard };
  };

  const startGame = () => {
    if (!setData || !setData.topics || setData.topics.length === 0) {
      alert('Bộ đề này chưa có chủ đề nào! Hãy thêm chủ đề ở Trang quản trị.');
      return;
    }
    const hasWords = setData.topics.some(t => t.words && t.words.length > 0);
    if (!hasWords) {
      alert('Các chủ đề trong bộ đề này chưa có từ nào!');
      return;
    }
    topicQueueRef.current = [];
    topicPosRef.current = 0;
    setScore(0);
    setWrongCount(0);
    setRoundsCleared(0);
    setWrongId(null);
    setTimeLeft(Number(duration) || 180);

    const { topic, newBoard } = buildRound();
    setActiveTopic(topic);
    setBoard(newBoard);
    setPhase('playing');
  };

  const refillBoard = () => {
    const { topic, newBoard } = buildRound();
    setActiveTopic(topic);
    setBoard(newBoard);
    setRoundsCleared(r => r + 1);
  };

  const triggerWrongFlash = (id) => {
    clearTimeout(wrongTimerRef.current);
    setWrongId(id);
    wrongTimerRef.current = setTimeout(() => setWrongId(null), 420);
  };

  const handleWordClick = (item) => {
    if (phase !== 'playing' || item.found) return;

    if (item.isMatch) {
      const updatedBoard = board.map(b => (b.id === item.id ? { ...b, found: true } : b));
      setBoard(updatedBoard);
      setScore(s => s + 1);

      const remainingMatches = updatedBoard.filter(b => b.isMatch && !b.found).length;
      if (remainingMatches === 0) {
        clearTimeout(refillTimerRef.current);
        refillTimerRef.current = setTimeout(() => refillBoard(), 700);
      }
    } else {
      setWrongCount(w => w + 1);
      triggerWrongFlash(item.id);
    }
  };

  const handleRestart = () => {
    clearTimeout(refillTimerRef.current);
    clearTimeout(wrongTimerRef.current);
    setPhase('setup');
  };

  if (loadError) {
    return (
      <div className="stage">
        <p style={{ textAlign: 'center', marginTop: 50 }}>
          ❌ Không tìm thấy bộ đề. <Link to="/wordboard">Quay lại danh sách</Link>
        </p>
      </div>
    );
  }

  if (!setData) {
    return <div style={{ textAlign: 'center', marginTop: '50px' }}>Đang tải dữ liệu...</div>;
  }

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const timeLabel = `${minutes}:${seconds.toString().padStart(2, '0')}`;

  return (
    <div className="stage wb-stage">
      <header className="title-block">
        <h1>🎯 Chọn Từ Theo Chủ Đề</h1>
        <p>{setData.title}</p>
        <div className="pencil-divider"></div>
      </header>

      {phase === 'setup' && (
        <div className="wb-setup-card">
          {setData.description && <p className="wb-setup-desc">{setData.description}</p>}

          <div className="input-group small">
            <label>⏱️ Thời gian chơi (giây):</label>
            <input
              type="number"
              min="30"
              className="wb-admin-input"
              value={duration}
              onChange={e => setDuration(e.target.value)}
            />
          </div>

          <p className="wb-setup-rule">
            📜 Luật chơi: Trên cùng sẽ hiện <strong>1 chủ đề</strong>. Bảng dưới có {setData.wordsPerBoard || 10} từ trộn lẫn —
            hãy bấm chọn đúng những từ thuộc chủ đề đó (sẽ được khoanh tròn lại). Chọn đúng hết, bảng sẽ tự đổi
            sang 10 từ mới với chủ đề khác. Cố tìm được nhiều từ nhất trong <strong>{duration}s</strong> nhé!
          </p>

          <button className="wb-start-btn" onClick={startGame}>🚀 Bắt Đầu Chơi!</button>
          <div className="wb-setup-footer">
            <Link to="/wordboard">⬅️ Chọn bộ đề khác</Link>
          </div>
        </div>
      )}

      {phase === 'playing' && activeTopic && (
        <>
          <div className="wb-topbar">
            <div className="pill wb-timer-pill">
              <span className="emoji">⏱️</span> {timeLabel}
            </div>
            <div className="pill score wb-score-pill">
              <span className="emoji">✅</span> {score}
            </div>
          </div>

          <div className="wb-topics-row">
            {setData.topics.map((t, i) => (
              <span
                key={i}
                className={`wb-topic-chip ${t.name === activeTopic.name ? 'wb-topic-active' : ''}`}
              >
                {t.name}
              </span>
            ))}
          </div>

          <p className="wb-instruction">
            👉 Hãy chọn các từ thuộc chủ đề: <strong>{activeTopic.name}</strong>
          </p>

          <div className="wb-board">
            {board.map(item => (
              <button
                key={item.id}
                className={`wb-card ${item.found ? 'wb-found' : ''} ${wrongId === item.id ? 'wb-wrong' : ''}`}
                disabled={item.found}
                onClick={() => handleWordClick(item)}
              >
                <span className="wb-word">{item.word}</span>
                {item.found && (
                  <svg className="wb-circle-svg" viewBox="0 0 200 90" preserveAspectRatio="none">
                    <path
                      className="wb-circle-path"
                      d="M14 46 C10 18, 50 5, 100 6 C155 7, 193 21, 188 47 C185 76, 145 91, 100 89 C46 91, 11 75, 14 46 Z"
                    />
                  </svg>
                )}
              </button>
            ))}
          </div>
        </>
      )}

      {phase === 'finished' && (
        <div className="wb-final-screen">
          <div className="wb-trophy">⏰</div>
          <h2>Hết giờ rồi!</h2>
          <p className="wb-final-score">
            ✅ Tìm đúng: <strong>{score}</strong> từ &nbsp;|&nbsp; ❌ Chọn sai: <strong>{wrongCount}</strong> lần
            &nbsp;|&nbsp; 🔁 Số bảng đã hoàn thành: <strong>{roundsCleared}</strong>
          </p>
          <div className="wb-final-actions">
            <button className="btn-reset" onClick={handleRestart}>🔄 Chơi Lại</button>
            <Link to="/wordboard"><button className="btn-next">📋 Chọn Bộ Đề Khác</button></Link>
          </div>
        </div>
      )}
    </div>
  );
}
