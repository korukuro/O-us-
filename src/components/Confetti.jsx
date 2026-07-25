import { useMemo } from "react";

export default function Confetti({ seed }) {
  const bits = useMemo(
    () => Array.from({ length: 46 }, (_, i) => ({
      id: i,
      left: Math.random() * 100,
      delay: Math.random() * 0.35,
      dur: 1.5 + Math.random() * 1.1,
      rot: Math.random() * 360,
      drift: (Math.random() - 0.5) * 160,
      color: ["#FF6B9D", "#FFC93C", "#7BE495", "#7FD1FF", "#B77BFF"][i % 5],
      w: 8 + Math.random() * 8,
    })),
    [seed]
  );
  return (
    <div style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 50, overflow: "hidden" }} aria-hidden="true">
      {bits.map((b) => (
        <span key={b.id} style={{
          position: "absolute", top: -20, left: `${b.left}%`,
          width: b.w, height: b.w * 1.4, background: b.color,
          border: "2px solid #171325", borderRadius: 3,
          animation: `fall ${b.dur}s linear ${b.delay}s forwards`,
          "--rot": `${b.rot}deg`, "--drift": `${b.drift}px`,
        }} />
      ))}
    </div>
  );
}