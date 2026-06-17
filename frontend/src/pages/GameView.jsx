import { useEffect, useState, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import './GameView.css';

const shuffleArray = (array) => {
  const newArr = [...array];
  for (let i = newArr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArr[i], newArr[j]] = [newArr[j], newArr[i]];
  }
  return newArr;
};

const COLOR_CLASSES = ['c0', 'c1', 'c2', 'c3', 'c4'];

export default function GameView() {
  const { setId } = useParams();
  const [questions, setQuestions] = useState([]);
  const [qIndex, setQIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [gameFinished, setGameFinished] = useState(false);
  const [answered, setAnswered] = useState(false);
  const [feedback, setFeedback] = useState({ text: '', status: '' });

  // Refs quản lý DOM thật để tối ưu hiệu ứng nảy (không dùng State để tránh re-render liên tục)
  const wordBankRef = useRef(null);
  const answerZoneRef = useRef(null);
  const rafId = useRef(null);
  const cardsData = useRef([]); // Lưu trạng thái vật lý của các chữ
  const placedWords = useRef([]); // Lưu các chữ người dùng đã kéo vào ô đáp án

  // 1. Lấy dữ liệu từ Backend
  useEffect(() => {
    const fetchSet = async () => {
      try {
        const res = await axios.get(`http://localhost:5000/api/sets/${setId}`);
        setQuestions(shuffleArray(res.data.questions));
      } catch (error) {
        console.error("Lỗi tải bộ đề:", error);
      }
    };
    fetchSet();
  }, [setId]);

  // 2. Game Engine: Render chữ, hiệu ứng nảy và kéo thả
  useEffect(() => {
    if (questions.length === 0 || gameFinished) return;

    // Reset trạng thái màn chơi mới
    cancelAnimationFrame(rafId.current);
    cardsData.current = [];
    placedWords.current = [];
    setAnswered(false);
    setFeedback({ text: '', status: '' });

    const currentQuestion = questions[qIndex];
    const shuffledWords = shuffleArray(currentQuestion.words);

    const bankEl = wordBankRef.current;
    const answerEl = answerZoneRef.current;
    
    // Xóa chữ cũ và hiển thị lại placeholder
    bankEl.innerHTML = '';
    answerEl.innerHTML = '<span class="placeholder" id="answerPlaceholder">Kéo thả các từ xuống đây...</span>';
    answerEl.className = 'answer-zone';

    // Đợi 1 nhịp để DOM có kích thước chuẩn rồi mới tạo thẻ
    setTimeout(() => {
      const bankRect = bankEl.getBoundingClientRect();

      // Hàm xử lý kéo thả (Drag & Drop)
      const attachDragHandlers = (card) => {
        const el = card.el;

        const onPointerDown = (e) => {
          if (card.placed || answerEl.classList.contains('correct') || answerEl.classList.contains('incorrect')) return;
          e.preventDefault();
          card.dragging = true;
          el.classList.add('dragging');
          el.setPointerCapture(e.pointerId);

          const elRect = el.getBoundingClientRect();
          const offsetX = e.clientX - elRect.left;
          const offsetY = e.clientY - elRect.top;

          const onPointerMove = (ev) => {
            const azRect = answerEl.getBoundingClientRect();
            const over = ev.clientX >= azRect.left && ev.clientX <= azRect.right && 
                         ev.clientY >= azRect.top && ev.clientY <= azRect.bottom;
            
            over ? answerEl.classList.add('drag-over') : answerEl.classList.remove('drag-over');

            const parentRect = el.parentElement.getBoundingClientRect();
            el.style.left = (ev.clientX - parentRect.left - offsetX) + 'px';
            el.style.top = (ev.clientY - parentRect.top - offsetY) + 'px';
          };

          const onPointerUp = (ev) => {
            el.releasePointerCapture(e.pointerId);
            el.removeEventListener('pointermove', onPointerMove);
            el.removeEventListener('pointerup', onPointerUp);
            card.dragging = false;
            el.classList.remove('dragging');
            answerEl.classList.remove('drag-over');

            const azRect = answerEl.getBoundingClientRect();
            const over = ev.clientX >= azRect.left && ev.clientX <= azRect.right && 
                         ev.clientY >= azRect.top && ev.clientY <= azRect.bottom;

            if (over) {
              // Thả vào vùng đáp án
              card.placed = true;
              el.classList.add('placed');
              el.style.left = '0'; el.style.top = '0';
              
              const placeholder = answerEl.querySelector('#answerPlaceholder');
              if (placeholder) placeholder.style.display = 'none';
              
              answerEl.appendChild(el);
              placedWords.current.push(card);

              // Click để trả về
              el.onclick = () => {
                if (answerEl.classList.contains('correct') || answerEl.classList.contains('incorrect')) return;
                card.placed = false;
                el.classList.remove('placed');
                const bRect = bankEl.getBoundingClientRect();
                card.x = 10 + Math.random() * Math.max(10, bRect.width - card.w - 20);
                card.y = 10 + Math.random() * Math.max(10, bRect.height - card.h - 20);
                el.style.left = card.x + 'px'; el.style.top = card.y + 'px';
                bankEl.appendChild(el);
                placedWords.current = placedWords.current.filter(c => c.id !== card.id);
                if (placedWords.current.length === 0 && placeholder) placeholder.style.display = 'block';
              };
            } else {
              // Thả ra ngoài -> Nảy về Bank
              const bRect = bankEl.getBoundingClientRect();
              card.x = Math.max(6, Math.min(el.getBoundingClientRect().left - bRect.left, bRect.width - card.w - 6));
              card.y = Math.max(6, Math.min(el.getBoundingClientRect().top - bRect.top, bRect.height - card.h - 6));
              if (el.parentElement !== bankEl) bankEl.appendChild(el);
              el.style.left = card.x + 'px'; el.style.top = card.y + 'px';
            }
          };

          el.addEventListener('pointermove', onPointerMove);
          el.addEventListener('pointerup', onPointerUp);
        };
        el.addEventListener('pointerdown', onPointerDown);
      };

      // Tạo các thẻ DOM cho từng chữ
      shuffledWords.forEach((word, idx) => {
        const el = document.createElement('div');
        el.className = `word-card ${COLOR_CLASSES[idx % COLOR_CLASSES.length]}`;
        el.textContent = word;
        bankEl.appendChild(el);

        const w = el.offsetWidth;
        const h = el.offsetHeight;
        const maxX = Math.max(10, bankRect.width - w - 10);
        const maxY = Math.max(10, bankRect.height - h - 10);
        const angle = Math.random() * Math.PI * 2;
        const speed = 0.5 + Math.random() * 1.3;

        const card = {
          id: `card_${idx}_${Math.random().toString(36).slice(2)}`,
          text: word, el, w, h,
          x: 10 + Math.random() * maxX,
          y: 10 + Math.random() * maxY,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          placed: false, dragging: false
        };

        el.style.left = card.x + 'px';
        el.style.top = card.y + 'px';
        
        attachDragHandlers(card);
        cardsData.current.push(card);
      });

      // Vòng lặp Animation (Bóng nảy)
      const animate = () => {
        const currentBankRect = bankEl.getBoundingClientRect();
        cardsData.current.forEach(card => {
          if (card.placed || card.dragging) return;
          card.x += card.vx;
          card.y += card.vy;

          const maxX = currentBankRect.width - card.w - 6;
          const maxY = currentBankRect.height - card.h - 6;

          if (card.x <= 6) { card.x = 6; card.vx = Math.abs(card.vx); }
          if (card.x >= maxX) { card.x = maxX; card.vx = -Math.abs(card.vx); }
          if (card.y <= 6) { card.y = 6; card.vy = Math.abs(card.vy); }
          if (card.y >= maxY) { card.y = maxY; card.vy = -Math.abs(card.vy); }

          card.el.style.left = card.x + 'px';
          card.el.style.top = card.y + 'px';
        });
        rafId.current = requestAnimationFrame(animate);
      };
      rafId.current = requestAnimationFrame(animate);
    }, 50);

    // Dọn dẹp bộ nhớ khi unmount hoặc chuyển câu
    return () => cancelAnimationFrame(rafId.current);
  }, [qIndex, questions, gameFinished]);

  // 3. Xử lý logic Nút bấm
  const handleCheck = () => {
    if (placedWords.current.length === 0) {
      setFeedback({ text: "Kéo thả vài chữ xuống hộp đã nhé! 🧐", status: '' });
      return;
    }

    const correctSentence = questions[qIndex].words.join(' ');
    const userSentence = placedWords.current.map(c => c.text).join(' ');

    setAnswered(true);
    if (userSentence === correctSentence) {
      setScore(s => s + 1);
      setFeedback({ text: "🎉 Chính xác! Giỏi quá!", status: 'correct' });
      answerZoneRef.current.classList.add('correct');
    } else {
      setFeedback({ text: `❌ Sai rồi. Đáp án đúng là: ${correctSentence}`, status: 'incorrect' });
      answerZoneRef.current.classList.add('incorrect');
    }
  };

  const handleNext = () => {
    if (qIndex + 1 >= questions.length) {
      setGameFinished(true);
    } else {
      setQIndex(qIndex + 1);
    }
  };

  if (questions.length === 0) return <div style={{textAlign: 'center', marginTop: '50px'}}>Đang tải dữ liệu...</div>;

  return (
    <div className="stage">
      <header className="title-block">
        <h1>🌟 Arrange the Sentence</h1>
        <p>Bắt các chữ đang lơ lửng và xếp thành câu đúng nhé!</p>
        <div className="pencil-divider"></div>
      </header>

      <div className="topbar">
        <div className="pill progress"><span className="emoji">📘</span> Câu {qIndex + 1} / {questions.length}</div>
        <div className="pill score"><span className="emoji">⭐</span> Điểm: {score}</div>
      </div>

      {!gameFinished ? (
        <>
          <div className="word-bank" ref={wordBankRef}></div>
          <div className="answer-zone-label">👉 THẢ CHỮ VÀO ĐÂY ĐỂ XẾP CÂU</div>
          <div className="answer-zone" ref={answerZoneRef}></div>
          
          <div className={`feedback ${feedback.status}`}>{feedback.text}</div>

          <div className="controls">
            {!answered ? (
              <button className="btn-check" onClick={handleCheck}>✅ Kiểm tra</button>
            ) : (
              <button className="btn-next" onClick={handleNext}>➡️ Câu tiếp theo</button>
            )}
          </div>
          <footer className="hint">Mẹo: Kéo chữ lơ lửng vào ô, click vào chữ trong ô nếu muốn bỏ nó ra!</footer>
        </>
      ) : (
        <div className="final-screen">
          <h2>🏆 Hoàn thành! Điểm của bạn: {score} / {questions.length}</h2>
          {score === questions.length ? <p>Điểm tuyệt đối! Bạn quá đỉnh! 🌟</p> : <p>Làm tốt lắm! Hãy tiếp tục luyện tập nhé.</p>}
          <br/>
          <Link to="/">
            <button>⬅️ Quay lại danh sách bộ đề</button>
          </Link>
        </div>
      )}
    </div>
  );
}