export default function HowItWorks({ onClose }) {
  return (
    <div onClick={onClose} style={{
      position: "fixed", inset: 0, background: "rgba(23,19,37,.5)",
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: 16, zIndex: 70,
    }}>
      <div onClick={(e) => e.stopPropagation()} className="card" style={{
        width: "100%", maxWidth: 460,
        maxHeight: "88vh", overflowY: "auto",
        overflowX: "hidden",
      }}>
        <div style={{
          position: "sticky", top: 0, zIndex: 1,
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "18px 22px 12px",
          background: "var(--paper)",
          borderBottom: "2px solid rgba(23,19,37,.12)",
        }}>
          <div style={{ fontFamily: "'Baloo 2'", fontWeight: 800, fontSize: 26 }}>How O(us) works</div>
          <button className="btn ghost tiny" onClick={onClose}>✕</button>
        </div>

        <div style={{ padding: "16px 22px 22px" }}>
          <Section title="🎯 The daily plan">
          Each day you pick which problems to commit to and <b>lock them in</b>. Once locked,
          you can <b>add more</b> but never remove — no lowering the bar on yourself.
          Your streak only counts on days you <b>clear your locked plan</b>.
        </Section>

        <Section title="🔥 Streaks">
          Clear your locked plan today and your streak goes up by one.
          Miss a day and it resets — unless you have a <b>freeze token</b>,
          which saves your streak for one missed day. You earn freeze tokens over time.
          Streaks are counted in your own timezone, so a late-night solve still counts for today.
        </Section>

        <Section title="⭐ XP & levels">
          You earn XP for every first solve, based on difficulty:
          <div style={{ display: "flex", gap: 8, margin: "8px 0", flexWrap: "wrap" }}>
            <Pill bg="#7BE495">Easy · +10</Pill>
            <Pill bg="#FFC93C">Medium · +25</Pill>
            <Pill bg="#FF6B9D">Hard · +50</Pill>
          </div>
          As your XP grows you climb complexity levels — from <b>O(1)</b> all the way up to <b>O(2ⁿ)</b>.
          Higher is better here (unlike real Big-O).
        </Section>

        <Section title="🔁 Revisiting">
          You can redo a problem you've already solved — useful when you're brushing up.
          Revisits update your notes but <b>don't give XP again</b>, so nobody farms
          Two Sum for points.
        </Section>

        <Section title="⇄ In sync">
          When two people in the room have both solved the same problem, you're “in sync” on it.
          That <b>unlocks each other's notes</b> — before that, someone's takeaway stays hidden
          until you solve it too, so no spoilers. Hit the sync target for a bonus.
        </Section>

        <Section title="🎲 Dares">
          Challenge someone to a specific problem. They get notified — even with the app closed —
          and can <b>accept or decline</b>. You get notified back when they clear it or pass.
        </Section>

        <Section title="🔒 Notes stay hidden until you earn them">
          You can see <b>that</b> someone solved a problem, but their written takeaway is
          blurred until you solve it yourself. Practice first, spoilers later.
        </Section>

        <Section title="🔔 Notifications">
          Turn on notifications to get pinged for dares and an evening nudge if your plan's
          still open. On iPhone, add the app to your home screen first (Share → Add to Home Screen).
        </Section>

        <div style={{ textAlign: "center", marginTop: 8, opacity: 0.5, fontSize: 12 }}>
          Now go grind. O(us).
        </div>
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ fontFamily: "'Baloo 2'", fontWeight: 800, fontSize: 16, marginBottom: 4 }}>{title}</div>
      <div style={{ fontSize: 13.5, lineHeight: 1.5, opacity: 0.85 }}>{children}</div>
    </div>
  );
}

function Pill({ bg, children }) {
  return (
    <span style={{
      background: bg, border: "2.5px solid #171325", borderRadius: 9,
      padding: "1px 9px", fontSize: 12, fontWeight: 700,
    }}>
      {children}
    </span>
  );
}