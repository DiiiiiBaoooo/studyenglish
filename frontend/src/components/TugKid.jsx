// Một bé hoạt hình đơn giản, tay đang vươn sang phải để nắm dây kéo co.
// Đội B sẽ dùng chung component này nhưng được lật ngược (scaleX(-1)) ở component cha
// để tay tự động vươn sang trái — không cần vẽ thêm bản lật riêng.
export default function TugKid({
  skin = '#ffd9b3',
  hair = '#231f1a',
  hairStyle = 'spiky', // spiky | curly | wavy | headband | shortcurl | pigtail
  shirt = '#f4c430',
  pants = '#3c8a55',
  shoe = '#2c6f4f',
  glasses = null,
  headband = null,
}) {
  return (
    <svg className="tug-kid" viewBox="0 0 100 130" xmlns="http://www.w3.org/2000/svg">
      {/* chân sau (trụ, chống lưng lại) */}
      <path d="M40 74 L26 100 L20 122 L30 124 L42 100 L48 76 Z" fill={pants} />
      <ellipse cx="23" cy="123" rx="9" ry="5" fill={shoe} />

      {/* chân trước (gập, dồn lực) */}
      <path d="M50 74 L64 96 L74 118 L66 124 L54 100 L44 76 Z" fill={pants} />
      <ellipse cx="70" cy="121" rx="9" ry="5" fill={shoe} />

      {/* tay sau (nắm dây gần) */}
      <path d="M40 46 Q58 56 70 78" stroke={skin} strokeWidth="11" fill="none" strokeLinecap="round" />
      <circle cx="70" cy="78" r="7" fill={skin} />

      {/* thân áo */}
      <path d="M32 40 Q28 58 36 76 L56 76 Q62 58 58 40 Q46 30 32 40 Z" fill={shirt} />

      {/* tay trước (nắm dây xa hơn, đè lên thân) */}
      <path d="M54 44 Q74 52 86 70" stroke={skin} strokeWidth="11" fill="none" strokeLinecap="round" />
      <circle cx="86" cy="70" r="7" fill={skin} />

      {/* đầu */}
      <circle cx="45" cy="24" r="18" fill={skin} />

      {/* các kiểu tóc */}
      {hairStyle === 'spiky' && (
        <path d="M24 18 Q22 2 36 4 Q40 -4 48 4 Q56 -2 60 8 Q66 4 64 16 Q56 6 45 8 Q34 6 24 18 Z" fill={hair} />
      )}
      {hairStyle === 'curly' && (
        <>
          <circle cx="27" cy="16" r="9" fill={hair} />
          <circle cx="36" cy="8" r="10" fill={hair} />
          <circle cx="48" cy="6" r="10" fill={hair} />
          <circle cx="58" cy="12" r="9" fill={hair} />
          <circle cx="63" cy="22" r="7" fill={hair} />
        </>
      )}
      {hairStyle === 'wavy' && (
        <path d="M24 20 Q20 0 38 2 Q44 -6 54 0 Q64 2 62 16 Q58 6 50 10 Q44 2 36 8 Q28 6 24 20 Z" fill={hair} />
      )}
      {hairStyle === 'headband' && (
        <>
          <path d="M24 16 Q22 0 40 2 Q46 -6 56 2 Q66 0 64 14 Q56 4 45 6 Q34 4 24 16 Z" fill={hair} />
          <rect x="22" y="14" width="46" height="9" rx="4" fill={headband || '#3fa66a'} />
        </>
      )}
      {hairStyle === 'shortcurl' && (
        <>
          <circle cx="30" cy="14" r="8" fill={hair} />
          <circle cx="40" cy="6" r="9" fill={hair} />
          <circle cx="52" cy="5" r="9" fill={hair} />
          <circle cx="62" cy="14" r="8" fill={hair} />
        </>
      )}
      {hairStyle === 'pigtail' && (
        <>
          <path d="M25 18 Q24 2 40 2 Q50 -4 58 4 Q64 2 62 14 Q54 4 45 6 Q35 4 25 18 Z" fill={hair} />
          <circle cx="68" cy="6" r="7" fill={hair} />
          <path d="M68 6 Q78 10 74 22" stroke={hair} strokeWidth="6" fill="none" strokeLinecap="round" />
          <circle cx="68" cy="2" r="4" fill="#f4b400" />
        </>
      )}

      {/* kính (nếu có) */}
      {glasses && (
        <g stroke={glasses} strokeWidth="2.5" fill="none">
          <circle cx="37" cy="25" r="8" />
          <circle cx="55" cy="25" r="8" />
          <line x1="45" y1="25" x2="47" y2="25" />
        </g>
      )}

      {/* mặt */}
      <circle cx="37" cy="24" r="3.6" fill="#2b2320" />
      <circle cx="55" cy="24" r="3.6" fill="#2b2320" />
      <circle cx="29" cy="32" r="4" fill="#ffb3b3" opacity="0.6" />
      <circle cx="61" cy="32" r="4" fill="#ffb3b3" opacity="0.6" />
      <path d="M36 36 Q45 44 54 36 Q45 40 36 36 Z" fill="#7a3b3b" />
    </svg>
  );
}
