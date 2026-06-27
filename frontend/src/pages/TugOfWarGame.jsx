import { useEffect, useState, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import './TugOfWarGame.css';

const shuffleArray = (array) => {
  const newArr = [...array];
  for (let i = newArr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArr[i], newArr[j]] = [newArr[j], newArr[i]];
  }
  return newArr;
};

const checkAnswer = (question, rawAnswer) => {
  if (question.type === 'multiple_choice') {
    return rawAnswer === question.correctAnswer;
  }
  return rawAnswer.toString().trim().toLowerCase() === question.correctAnswer.trim().toLowerCase();
};

const MAX_OFFSET = 42; // % lệch tối đa của nút thắt dây khỏi tâm (50%)

export default function TugOfWarGame() {
  const { setId } = useParams();
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

  const [setData, setSetData] = useState(null);
  const [loadError, setLoadError] = useState(false);

  // phase: 'setup' | 'playing' | 'finished'
  const [phase, setPhase] = useState('setup');

  // Cài đặt trận đấu (có thể điều chỉnh trước khi bắt đầu)
  const [teamAName, setTeamAName] = useState('Đội Đỏ');
  const [teamBName, setTeamBName] = useState('Đội Xanh');
  const [duration, setDuration] = useState(90);
  const [winPulls, setWinPulls] = useState(5);

  const [timeLeft, setTimeLeft] = useState(90);

  // Mỗi đội có hàng đợi câu hỏi riêng, làm độc lập với đội kia
  const [currentQ, setCurrentQ] = useState({ A: null, B: null });
  const [scoreA, setScoreA] = useState(0);
  const [scoreB, setScoreB] = useState(0);
  const [locked, setLocked] = useState({ A: false, B: false });
  const [essayInputs, setEssayInputs] = useState({ A: '', B: '' });
  const [feedback, setFeedback] = useState({ A: null, B: null }); // 'correct' | 'wrong' | null mỗi đội
  const [winner, setWinner] = useState(null); // 'A' | 'B' | 'draw' | null

  const [leanTeam, setLeanTeam] = useState(null);
  const [shakeTeam, setShakeTeam] = useState(null);
  const [pullPopKey, setPullPopKey] = useState({ A: 0, B: 0 });

  const scoreARef = useRef(0);
  const scoreBRef = useRef(0);
  const poolsRef = useRef({ A: [], B: [] });
  const qIndexRef = useRef({ A: 0, B: 0 });
  const advanceTimerRefs = useRef({ A: null, B: null });

  useEffect(() => { scoreARef.current = scoreA; }, [scoreA]);
  useEffect(() => { scoreBRef.current = scoreB; }, [scoreB]);

  // 1. Tải bộ đề
  useEffect(() => {
    const fetchSet = async () => {
      try {
        const res = await axios.get(`${API_URL}/tugofwar/sets/${setId}`);
        setSetData(res.data);
        setDuration(res.data.duration || 90);
        setWinPulls(res.data.winPulls || 5);
      } catch (error) {
        console.error('Lỗi tải bộ đề kéo co:', error);
        setLoadError(true);
      }
    };
    fetchSet();
  }, [setId, API_URL]);

  // 2. Đồng hồ đếm ngược
  useEffect(() => {
    if (phase !== 'playing' || winner) return;
    if (timeLeft <= 0) {
      const diff = scoreARef.current - scoreBRef.current;
      setWinner(diff > 0 ? 'A' : diff < 0 ? 'B' : 'draw');
      setPhase('finished');
      return;
    }
    const id = setTimeout(() => setTimeLeft(t => t - 1), 1000);
    return () => clearTimeout(id);
  }, [phase, timeLeft, winner]);

  // Dọn dẹp các timer chuyển câu khi unmount
  useEffect(() => {
    const timers = advanceTimerRefs.current;
    return () => {
      clearTimeout(timers.A);
      clearTimeout(timers.B);
    };
  }, []);

  const startGame = () => {
    if (!setData || !setData.questions || setData.questions.length === 0) {
      alert('Bộ đề này chưa có câu hỏi nào! Hãy thêm câu hỏi ở Trang quản trị.');
      return;
    }
    const qs = setData.questions;
    poolsRef.current = { A: shuffleArray(qs), B: shuffleArray(qs) };
    qIndexRef.current = { A: 0, B: 0 };
    setCurrentQ({ A: poolsRef.current.A[0], B: poolsRef.current.B[0] });
    setScoreA(0);
    setScoreB(0);
    setLocked({ A: false, B: false });
    setEssayInputs({ A: '', B: '' });
    setFeedback({ A: null, B: null });
    setWinner(null);
    setLeanTeam(null);
    setShakeTeam(null);
    setTimeLeft(Number(duration) || 90);
    setPhase('playing');
  };

  const advanceQuestion = (team) => {
    const idxObj = qIndexRef.current;
    let nextIdx = idxObj[team] + 1;
    let pool = poolsRef.current[team];
    if (nextIdx >= pool.length) {
      pool = shuffleArray(setData.questions);
      poolsRef.current[team] = pool;
      nextIdx = 0;
    }
    idxObj[team] = nextIdx;
    setCurrentQ(prev => ({ ...prev, [team]: pool[nextIdx] }));
    setLocked(prev => ({ ...prev, [team]: false }));
    setEssayInputs(prev => ({ ...prev, [team]: '' }));
    setFeedback(prev => ({ ...prev, [team]: null }));
  };

  const scheduleAdvance = (team, delay) => {
    clearTimeout(advanceTimerRefs.current[team]);
    advanceTimerRefs.current[team] = setTimeout(() => advanceQuestion(team), delay);
  };

  const triggerPull = (team) => {
    setLeanTeam(team);
    setTimeout(() => setLeanTeam(null), 650);
    setPullPopKey(prev => ({ ...prev, [team]: prev[team] + 1 }));
  };

  const triggerShake = (team) => {
    setShakeTeam(team);
    setTimeout(() => setShakeTeam(null), 500);
  };

  const handleSubmitAnswer = (team, rawAnswer) => {
    if (winner || phase !== 'playing' || locked[team]) return;
    const q = currentQ[team];
    if (!q) return;
    if (!rawAnswer || !rawAnswer.toString().trim()) return;

    const isCorrect = checkAnswer(q, rawAnswer);

    if (isCorrect) {
      const newScoreA = team === 'A' ? scoreA + 1 : scoreA;
      const newScoreB = team === 'B' ? scoreB + 1 : scoreB;
      if (team === 'A') setScoreA(newScoreA); else setScoreB(newScoreB);
      setLocked(prev => ({ ...prev, [team]: true }));
      setFeedback(prev => ({ ...prev, [team]: 'correct' }));
      triggerPull(team);

      const target = Number(winPulls) || 5;
      if (Math.abs(newScoreA - newScoreB) >= target) {
        clearTimeout(advanceTimerRefs.current.A);
        clearTimeout(advanceTimerRefs.current.B);
        setTimeout(() => {
          setWinner(newScoreA > newScoreB ? 'A' : 'B');
          setPhase('finished');
        }, 900);
      } else {
        scheduleAdvance(team, 1100);
      }
    } else {
      setLocked(prev => ({ ...prev, [team]: true }));
      setFeedback(prev => ({ ...prev, [team]: 'wrong' }));
      triggerShake(team);
      scheduleAdvance(team, 1600);
    }
  };

  const handleRestart = () => {
    clearTimeout(advanceTimerRefs.current.A);
    clearTimeout(advanceTimerRefs.current.B);
    setPhase('setup');
    setWinner(null);
  };

  if (loadError) {
    return (
      <div className="stage">
        <p style={{ textAlign: 'center', marginTop: 50 }}>
          ❌ Không tìm thấy bộ đề. <Link to="/tugofwar">Quay lại danh sách</Link>
        </p>
      </div>
    );
  }

  if (!setData) {
    return <div style={{ textAlign: 'center', marginTop: '50px' }}>Đang tải dữ liệu...</div>;
  }

  // Vị trí nút thắt dây dựa vào hiệu số điểm 2 đội
  const diff = scoreA - scoreB;
  const target = Number(winPulls) || 5;
  const offset = Math.max(-MAX_OFFSET, Math.min(MAX_OFFSET, (diff / target) * MAX_OFFSET));
  const knotLeft = 50 - offset; // diff dương -> Đội A (trái) thắng thế -> nút dịch về trái
  const ticks = Array.from({ length: target }, (_, i) => i + 1);

  // Render khối câu hỏi + đáp án của 1 đội (dùng chung cho cả 2 panel A/B)
  const renderTeamBody = (team, question) => (
    <>
      <div className="tow-team-question">
        <span className="tow-qtype-badge">
          {question.type === 'multiple_choice' ? '🔘 Trắc nghiệm' : '✍️ Tự luận'}
        </span>
        <p>{question.question}</p>
      </div>

      {question.type === 'multiple_choice' ? (
        <div className="tow-team-options">
          {question.options.map((opt, i) => (
            <button
              key={i}
              className="tow-option-card"
              disabled={locked[team] || !!winner}
              onClick={() => handleSubmitAnswer(team, opt)}
            >
              {opt}
            </button>
          ))}
        </div>
      ) : (
        <div className="tow-essay-row">
          <input
            className="tow-essay-input"
            placeholder="Nhập câu trả lời..."
            value={essayInputs[team]}
            disabled={locked[team] || !!winner}
            onChange={e => setEssayInputs(prev => ({ ...prev, [team]: e.target.value }))}
            onKeyDown={e => e.key === 'Enter' && handleSubmitAnswer(team, essayInputs[team])}
          />
          <button
            className="tow-essay-submit"
            disabled={locked[team] || !!winner}
            onClick={() => handleSubmitAnswer(team, essayInputs[team])}
          >
            Trả lời
          </button>
        </div>
      )}

      {feedback[team] && (
        <div className={`tow-team-feedback ${feedback[team]}`}>
          {feedback[team] === 'correct'
            ? '✅ Chính xác! Kéo dây 1 bước!'
            : `❌ Sai rồi! Đáp án: ${question.correctAnswer}`}
        </div>
      )}
    </>
  );

  return (
    <div className="stage tow-stage">
      <header className="title-block">
        <h1>🪢 Kéo Co Trả Lời Câu Hỏi</h1>
        <p>{setData.title}</p>
        <div className="pencil-divider"></div>
      </header>

      {phase === 'setup' && (
        <div className="tow-setup-card">
          {setData.description && <p className="tow-setup-desc">{setData.description}</p>}

          <div className="tow-setup-row">
            <div className="input-group small">
              <label>🔴 Tên Đội A:</label>
              <input className="tow-admin-input" value={teamAName} onChange={e => setTeamAName(e.target.value)} />
            </div>
            <div className="input-group small">
              <label>🔵 Tên Đội B:</label>
              <input className="tow-admin-input" value={teamBName} onChange={e => setTeamBName(e.target.value)} />
            </div>
          </div>

          <div className="tow-setup-row">
            <div className="input-group small">
              <label>⏱️ Thời gian trận (giây):</label>
              <input type="number" min="10" className="tow-admin-input" value={duration} onChange={e => setDuration(e.target.value)} />
            </div>
            <div className="input-group small">
              <label>🏆 Số lần kéo lệch để thắng:</label>
              <input type="number" min="1" className="tow-admin-input" value={winPulls} onChange={e => setWinPulls(e.target.value)} />
            </div>
          </div>

          <p className="tow-setup-rule">
            📜 Luật chơi: Mỗi đội có câu hỏi riêng và trả lời độc lập với đội kia. Trả lời đúng sẽ kéo dây về phía đội mình 1 bước,
            trả lời sai sẽ chuyển sang câu khác. Đội nào kéo lệch <strong>{winPulls}</strong> bước trước sẽ thắng ngay.
            Nếu hết <strong>{duration}s</strong> mà chưa đội nào thắng, đội đang kéo dây về phía mình nhiều hơn sẽ thắng.
          </p>

          <button className="tow-start-btn" onClick={startGame}>🚀 Bắt Đầu Kéo Co!</button>
          <div className="tow-setup-footer">
            <Link to="/tugofwar">⬅️ Chọn bộ đề khác</Link>
          </div>
        </div>
      )}

      {phase === 'playing' && currentQ.A && currentQ.B && (
        <>
          <div className="tow-topbar-mini">
            <div className={`tow-timer-pill ${timeLeft <= 10 ? 'tow-timer-warning' : ''}`}>
              <span className="emoji">⏱️</span> {timeLeft}s
            </div>
          </div>

          <div className="tow-duel">
            {/* ---------- Panel Đội A (trái) ---------- */}
            <div className={`tow-team-panel tow-team-panel-a ${shakeTeam === 'A' ? 'tow-team-shake' : ''} ${locked.A ? 'tow-locked' : ''}`}>
              <div className="tow-team-panel-header">
                <span className="tow-team-avatar">🙂</span>
                <span className="tow-team-panel-name">{teamAName}</span>
                <span className="tow-team-panel-score">{scoreA}</span>
              </div>
              {renderTeamBody('A', currentQ.A)}
            </div>

            {/* ---------- Dải kéo co ở giữa (ảnh thật, không phải SVG) ---------- */}
            <div className="tow-center-col">
              <div className="tow-arena">
                <div className={`tow-end tow-end-a ${leanTeam === 'A' ? 'tow-group-pull' : ''} ${shakeTeam === 'A' ? 'tow-group-shake' : ''}`}>
                  <img src="/tow-team-left.png" alt={teamAName} className="tow-kid-photo" />
                </div>

                <div className="tow-track">
                  {ticks.map(i => (
                    <div key={`ta-${i}`} className="tow-tick" style={{ left: `${50 - (i / target) * MAX_OFFSET}%` }} />
                  ))}
                  {ticks.map(i => (
                    <div key={`tb-${i}`} className="tow-tick" style={{ left: `${50 + (i / target) * MAX_OFFSET}%` }} />
                  ))}
                  <div className="tow-center-line" />
                  <div className="tow-rope-line" />
                  <img
                    src="/tow-ribbon.png"
                    alt="ruy băng"
                    className={`tow-knot ${leanTeam ? 'tow-knot-pulling' : ''}`}
                    style={{ left: `${knotLeft}%` }}
                  />
                </div>

                <div className={`tow-end tow-end-b ${leanTeam === 'B' ? 'tow-group-pull' : ''} ${shakeTeam === 'B' ? 'tow-group-shake' : ''}`}>
                  <img src="/tow-team-right.png" alt={teamBName} className="tow-kid-photo" />
                </div>

                {pullPopKey.A > 0 && (
                  <span key={`popA-${pullPopKey.A}`} className="tow-pop tow-pop-a">+1</span>
                )}
                {pullPopKey.B > 0 && (
                  <span key={`popB-${pullPopKey.B}`} className="tow-pop tow-pop-b">+1</span>
                )}
              </div>
            </div>

            {/* ---------- Panel Đội B (phải) ---------- */}
            <div className={`tow-team-panel tow-team-panel-b ${shakeTeam === 'B' ? 'tow-team-shake' : ''} ${locked.B ? 'tow-locked' : ''}`}>
              <div className="tow-team-panel-header">
                <span className="tow-team-panel-score">{scoreB}</span>
                <span className="tow-team-panel-name">{teamBName}</span>
                <span className="tow-team-avatar">🙂</span>
              </div>
              {renderTeamBody('B', currentQ.B)}
            </div>
          </div>
        </>
      )}

      {phase === 'finished' && (
        <div className="tow-final-screen">
          <div className="tow-trophy">{winner === 'draw' ? '🤝' : '🏆'}</div>
          <h2>
            {winner === 'draw'
              ? 'Hòa! Hai đội ngang sức ngang tài!'
              : `${winner === 'A' ? teamAName : teamBName} Thắng Cuộc!`}
          </h2>
          <p className="tow-final-score">
            🔴 {teamAName} <strong>{scoreA}</strong> — <strong>{scoreB}</strong> {teamBName} 🔵
          </p>
          <div className="tow-final-actions">
            <button className="btn-reset" onClick={handleRestart}>🔄 Chơi Lại</button>
            <Link to="/tugofwar"><button className="btn-next">📋 Chọn Bộ Đề Khác</button></Link>
          </div>
        </div>
      )}
    </div>
  );
}
