interface ScoreCircleProps {
  score: number;
}

export function ScoreCircle({ score }: ScoreCircleProps) {
  const color =
    score >= 80 ? '#34d399' : score >= 60 ? '#fbbf24' : score >= 40 ? '#fb923c' : '#f87171';

  return (
    <div className="relative flex h-24 w-24 items-center justify-center">
      <svg viewBox="0 0 36 36" className="h-full w-full -rotate-90">
        <circle cx="18" cy="18" r="15.9" fill="none" stroke="#1e293b" strokeWidth="2.5" />
        <circle
          cx="18"
          cy="18"
          r="15.9"
          fill="none"
          stroke={color}
          strokeWidth="2.5"
          strokeDasharray={`${score} ${100 - score}`}
          strokeLinecap="round"
        />
      </svg>
      <span className="absolute text-lg font-bold" style={{ color }}>
        {score}
      </span>
    </div>
  );
}
