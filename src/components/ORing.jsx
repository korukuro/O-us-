export default function ORing({ size = 92, pct = 0.4, tint = "#FFC93C", awake = true, thin = false }) {
  const sw = thin ? 3 : 5;
  const prog = thin ? 6 : 9;
  const r = size / 2 - (thin ? 5 : 7);
  const c = 2 * Math.PI * r;
  const paper = "#FFFCF2";
  const ink = "#171325";

  return (
    <div style={{ position: "relative", width: size, height: size, flex: "none" }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={size / 2} cy={size / 2} r={r} fill={paper} stroke={ink} strokeWidth={sw} />
        <circle
          cx={size / 2} cy={size / 2} r={r} fill="none" stroke={tint}
          strokeWidth={prog} strokeLinecap="round"
          strokeDasharray={`${c * pct} ${c}`}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          style={{ transition: "stroke-dasharray .6s cubic-bezier(.34,1.56,.64,1)" }}
        />
        <circle
          cx={size / 2} cy={size / 2} r={r} fill="none" stroke={ink}
          strokeWidth={thin ? 1.5 : 2.5}
          strokeDasharray={`${c * pct} ${c}`}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          style={{ transition: "stroke-dasharray .6s cubic-bezier(.34,1.56,.64,1)" }}
        />
      </svg>
      <div style={{
        position: "absolute", inset: 0, display: "flex",
        alignItems: "center", justifyContent: "center", gap: size * 0.11,
      }}>
        {[0, 1].map((i) => (
          <div key={i} style={{
            width: size * 0.17,
            height: awake ? size * 0.17 : Math.max(2, size * 0.04),
            background: ink, borderRadius: "50%",
            display: "flex", alignItems: "center", justifyContent: "center",
            transition: "height .15s ease",
          }}>
            {awake && (
              <div style={{
                width: size * 0.085, height: size * 0.085,
                background: paper, borderRadius: "50%",
              }} />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}