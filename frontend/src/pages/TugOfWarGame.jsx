import { useEffect, useState, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import TugKid from '../components/TugKid';
import './TugOfWarGame.css';

const shuffleArray = (array) => {
  const newArr = [...array];
  for (let i = newArr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArr[i], newArr[j]] = [newArr[j], newArr[i]];
  }
  return newArr;
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
  const [pool, setPool] = useState([]);
  const [, setPoolIndex] = useState(0);
  const [currentQuestion, setCurrentQuestion] = useState(null);

  const [scoreA, setScoreA] = useState(0);
  const [scoreB, setScoreB] = useState(0);
  const [locked, setLocked] = useState({ A: false, B: false });
  const [essayInputs, setEssayInputs] = useState({ A: '', B: '' });
  const [feedback, setFeedback] = useState(null); // { team, status }
  const [winner, setWinner] = useState(null); // 'A' | 'B' | 'draw' | null

  const [leanTeam, setLeanTeam] = useState(null);
  const [shakeTeam, setShakeTeam] = useState(null);
  const [pullPopKey, setPullPopKey] = useState({ A: 0, B: 0 });

  const scoreARef = useRef(0);
  const scoreBRef = useRef(0);
  const advanceTimerRef = useRef(null);

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

  // Dọn dẹp timer chuyển câu khi unmount
  useEffect(() => {
    return () => { if (advanceTimerRef.current) clearTimeout(advanceTimerRef.current); };
  }, []);

  const startGame = () => {
    if (!setData || !setData.questions || setData.questions.length === 0) {
      alert('Bộ đề này chưa có câu hỏi nào! Hãy thêm câu hỏi ở Trang quản trị.');
      return;
    }
    const shuffled = shuffleArray(setData.questions);
    setPool(shuffled);
    setPoolIndex(0);
    setCurrentQuestion(shuffled[0]);
    setScoreA(0);
    setScoreB(0);
    setLocked({ A: false, B: false });
    setEssayInputs({ A: '', B: '' });
    setFeedback(null);
    setWinner(null);
    setLeanTeam(null);
    setShakeTeam(null);
    setTimeLeft(Number(duration) || 90);
    setPhase('playing');
  };

  const goToNextQuestion = () => {
    setFeedback(null);
    setLocked({ A: false, B: false });
    setEssayInputs({ A: '', B: '' });

    setPoolIndex(prevIdx => {
      let nextIdx = prevIdx + 1;
      let usePool = pool;
      if (nextIdx >= pool.length) {
        usePool = shuffleArray(setData.questions);
        setPool(usePool);
        nextIdx = 0;
      }
      setCurrentQuestion(usePool[nextIdx]);
      return nextIdx;
    });
  };

  const scheduleNextQuestion = () => {
    if (advanceTimerRef.current) clearTimeout(advanceTimerRef.current);
    advanceTimerRef.current = setTimeout(() => {
      goToNextQuestion();
    }, 1400);
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

  const checkAnswer = (question, rawAnswer) => {
    if (question.type === 'multiple_choice') {
      return rawAnswer === question.correctAnswer;
    }
    return rawAnswer.toString().trim().toLowerCase() === question.correctAnswer.trim().toLowerCase();
  };

  const handleSubmitAnswer = (team, rawAnswer) => {
    if (winner || phase !== 'playing' || locked[team] || !currentQuestion) return;
    if (!rawAnswer || !rawAnswer.toString().trim()) return;

    const isCorrect = checkAnswer(currentQuestion, rawAnswer);

    if (isCorrect) {
      const newScoreA = team === 'A' ? scoreA + 1 : scoreA;
      const newScoreB = team === 'B' ? scoreB + 1 : scoreB;
      setScoreA(newScoreA);
      setScoreB(newScoreB);
      setLocked({ A: true, B: true });
      setFeedback({ team, status: 'correct' });
      triggerPull(team);

      const target = Number(winPulls) || 5;
      if (Math.abs(newScoreA - newScoreB) >= target) {
        if (advanceTimerRef.current) clearTimeout(advanceTimerRef.current);
        setTimeout(() => {
          setWinner(newScoreA > newScoreB ? 'A' : 'B');
          setPhase('finished');
        }, 900);
      } else {
        scheduleNextQuestion();
      }
    } else {
      const nextLocked = { ...locked, [team]: true };
      setLocked(nextLocked);
      setFeedback({ team, status: 'wrong' });
      triggerShake(team);
      if (nextLocked.A && nextLocked.B) {
        scheduleNextQuestion();
      }
    }
  };

  const handleRestart = () => {
    if (advanceTimerRef.current) clearTimeout(advanceTimerRef.current);
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
            📜 Luật chơi: trả lời đúng câu hỏi sẽ kéo dây về phía đội mình 1 bước. Đội nào kéo lệch <strong>{winPulls}</strong> bước trước sẽ thắng ngay.
            Nếu hết <strong>{duration}s</strong> mà chưa đội nào thắng, đội đang kéo dây về phía mình nhiều hơn sẽ thắng.
          </p>

          <button className="tow-start-btn" onClick={startGame}>🚀 Bắt Đầu Kéo Co!</button>
          <div className="tow-setup-footer">
            <Link to="/tugofwar">⬅️ Chọn bộ đề khác</Link>
          </div>
        </div>
      )}

      {phase === 'playing' && currentQuestion && (
        <>
          <div className="tow-topbar">
            <div className={`pill score tow-pill-a`}><span className="emoji">🔴</span> {teamAName}: {scoreA}</div>
            <div className={`pill tow-timer-pill ${timeLeft <= 10 ? 'tow-timer-warning' : ''}`}>
              <span className="emoji">⏱️</span> {timeLeft}s
            </div>
            <div className={`pill score tow-pill-b`}><span className="emoji">🔵</span> {teamBName}: {scoreB}</div>
          </div>

          <div className="tow-arena">
            <div className="tow-end tow-end-a">
              <div className={`tow-kid-row ${leanTeam === 'A' ? 'tow-group-pull' : ''} ${shakeTeam === 'A' ? 'tow-group-shake' : ''}`}>
                <TugKid hairStyle="spiky" hair="#231f1a" skin="#ffd9b3" shirt="#f4c430" pants="#3c8a55" shoe="#2c6f4f" />
                <TugKid hairStyle="curly" hair="#7a4a2b" skin="#ffd9b3" shirt="#4fb6e0" pants="#7c7c86" shoe="#2c6f8e" glasses="#3fae5c" />
                <TugKid hairStyle="wavy" hair="#c2611a" skin="#ffe0bd" shirt="#f4c430" pants="#3a3a3a" shoe="#7a4a2b" />
              </div>
              <div className="tow-end-label">{teamAName}</div>
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
              <div className={`tow-knot ${leanTeam ? 'tow-knot-pulling' : ''}`} style={{ left: `${knotLeft}%` }}>🎀</div>
            </div>

            <div className="tow-end tow-end-b">
              <div className={`tow-kid-row tow-mirror ${leanTeam === 'B' ? 'tow-group-pull' : ''} ${shakeTeam === 'B' ? 'tow-group-shake' : ''}`}>
                <TugKid hairStyle="headband" hair="#5b3a22" headband="#3fa66a" skin="#ffd9b3" shirt="#3fae5c" pants="#c0392b" shoe="#1f3b57" />
                <TugKid hairStyle="shortcurl" hair="#1c1c1c" skin="#ffd9b3" shirt="#8b2e3a" pants="#1f3b57" shoe="#111111" glasses="#d23c3c" />
                <TugKid hairStyle="pigtail" hair="#f1c233" skin="#ffe0bd" shirt="#d23c3c" pants="#2e7d52" shoe="#d23c3c" />
              </div>
              <div className="tow-end-label">{teamBName}</div>
            </div>

            {pullPopKey.A > 0 && (
              <span key={`popA-${pullPopKey.A}`} className="tow-pop tow-pop-a">+1</span>
            )}
            {pullPopKey.B > 0 && (
              <span key={`popB-${pullPopKey.B}`} className="tow-pop tow-pop-b">+1</span>
            )}
          </div>

          <div className="tow-question-card">
            <span className="tow-qtype-badge">
              {currentQuestion.type === 'multiple_choice' ? '🔘 Trắc nghiệm' : '✍️ Tự luận'}
            </span>
            <h3>{currentQuestion.question}</h3>
          </div>

          <div className="tow-panels">
            {/* Đội A */}
            <div className={`tow-panel tow-panel-a ${shakeTeam === 'A' ? 'tow-shake' : ''} ${locked.A ? 'tow-locked' : ''}`}>
              <div className="tow-panel-header">
                <span className="tow-panel-team">🔴 {teamAName}</span>
                {feedback?.team === 'A' && (
                  <span className={`tow-panel-status ${feedback.status}`}>
                    {feedback.status === 'correct' ? '✅ Chính xác!' : '❌ Sai rồi'}
                  </span>
                )}
              </div>

              {currentQuestion.type === 'multiple_choice' ? (
                <div className="tow-options">
                  {currentQuestion.options.map((opt, i) => (
                    <button
                      key={i}
                      className="tow-option-btn tow-option-a"
                      disabled={locked.A || !!winner}
                      onClick={() => handleSubmitAnswer('A', opt)}
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
                    value={essayInputs.A}
                    disabled={locked.A || !!winner}
                    onChange={e => setEssayInputs(prev => ({ ...prev, A: e.target.value }))}
                    onKeyDown={e => e.key === 'Enter' && handleSubmitAnswer('A', essayInputs.A)}
                  />
                  <button
                    className="tow-essay-submit tow-essay-submit-a"
                    disabled={locked.A || !!winner}
                    onClick={() => handleSubmitAnswer('A', essayInputs.A)}
                  >
                    Trả lời
                  </button>
                </div>
              )}
            </div>

            {/* Đội B */}
            <div className={`tow-panel tow-panel-b ${shakeTeam === 'B' ? 'tow-shake' : ''} ${locked.B ? 'tow-locked' : ''}`}>
              <div className="tow-panel-header">
                <span className="tow-panel-team">🔵 {teamBName}</span>
                {feedback?.team === 'B' && (
                  <span className={`tow-panel-status ${feedback.status}`}>
                    {feedback.status === 'correct' ? '✅ Chính xác!' : '❌ Sai rồi'}
                  </span>
                )}
              </div>

              {currentQuestion.type === 'multiple_choice' ? (
                <div className="tow-options">
                  {currentQuestion.options.map((opt, i) => (
                    <button
                      key={i}
                      className="tow-option-btn tow-option-b"
                      disabled={locked.B || !!winner}
                      onClick={() => handleSubmitAnswer('B', opt)}
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
                    value={essayInputs.B}
                    disabled={locked.B || !!winner}
                    onChange={e => setEssayInputs(prev => ({ ...prev, B: e.target.value }))}
                    onKeyDown={e => e.key === 'Enter' && handleSubmitAnswer('B', essayInputs.B)}
                  />
                  <button
                    className="tow-essay-submit tow-essay-submit-b"
                    disabled={locked.B || !!winner}
                    onClick={() => handleSubmitAnswer('B', essayInputs.B)}
                  >
                    Trả lời
                  </button>
                </div>
              )}
            </div>
          </div>

          {feedback && (
            <div className={`tow-feedback ${feedback.status === 'correct' ? 'correct' : 'incorrect'}`}>
              {feedback.status === 'correct'
                ? `🎉 ${feedback.team === 'A' ? teamAName : teamBName} trả lời đúng, kéo dây 1 bước!`
                : `❌ ${feedback.team === 'A' ? teamAName : teamBName} trả lời sai!${locked.A && locked.B ? ' Cả hai đội đều sai, sang câu khác...' : ''}`}
            </div>
          )}
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
