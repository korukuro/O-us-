import {
  SignInButton, UserButton, SignedIn, SignedOut,
} from "@clerk/clerk-react";
import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "../convex/_generated/api";
import { useStoreUser } from "./hooks/useStoreUser";
import { parseProblemUrl } from "./lib/parseProblemUrl";
import ORing from "./components/ORing";
import Confetti from "./components/Confetti";
import { useState, useEffect, useRef } from "react";
import { usePush } from "./hooks/usePush";

function cleanError(e) {
  const raw = e?.message || String(e);
  // Convex wraps thrown errors; pull out just the human message
  const m = raw.match(/Uncaught Error:\s*(.+?)(?:\s+at handler|$)/);
  return m ? m[1].trim() : raw;
}
function formatTime(ms) {
  return new Date(ms).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

const DIFF_COLOR = { easy: "#7BE495", medium: "#FFC93C", hard: "#FF6B9D" };
const LEVELS = [
  { at: 0, big: "O(1)", tint: "#9BE7C4" },
  { at: 60, big: "O(log n)", tint: "#7FD1FF" },
  { at: 150, big: "O(n)", tint: "#FFC93C" },
  { at: 300, big: "O(n log n)", tint: "#FF9F4D" },
  { at: 550, big: "O(n²)", tint: "#FF6B9D" },
  { at: 900, big: "O(2ⁿ)", tint: "#B77BFF" },
];
function levelFor(xp) {
  let i = 0;
  for (let k = 0; k < LEVELS.length; k++) if (xp >= LEVELS[k].at) i = k;
  const cur = LEVELS[i], next = LEVELS[i + 1];
  const pct = next ? (xp - cur.at) / (next.at - cur.at) : 1;
  return { ...cur, next, pct: Math.max(0.05, Math.min(1, pct)) };
}
const REACTIONS = ["🔥", "🧠", "😭", "💀"];

export default function App() {
  return (
    <div style={{ minHeight: "100vh", padding: 14 }}>
      <SignedOut>
        <div style={{ maxWidth: 420, margin: "80px auto", textAlign: "center" }}>
          <div style={{ display: "flex", justifyContent: "center", marginBottom: 16 }}>
            <ORing size={90} pct={0.72} tint="#FFC93C" />
          </div>
          <h1 style={{ fontFamily: "'Baloo 2'", fontSize: 44, margin: "0 0 4px" }}>
            O<span style={{ opacity: 0.8 }}>(us)</span>
          </h1>
          <p style={{ opacity: 0.6, marginBottom: 24 }}>grind the sheet together</p>
          <SignInButton mode="modal">
            <button className="btn">Sign in to start</button>
          </SignInButton>
        </div>
      </SignedOut>
      <SignedIn>
        <Main />
      </SignedIn>
    </div>
  );
}

function Main() {
  useStoreUser();
  const [activeRoom, setActiveRoom] = useState(null);
  if (activeRoom) return <Room roomId={activeRoom} onBack={() => setActiveRoom(null)} />;
  return <RoomList onOpen={setActiveRoom} />;
}

function RoomList({ onOpen }) {
  const rooms = useQuery(api.rooms.myRooms);
  const createRoom = useMutation(api.rooms.create);
  const joinRoom = useMutation(api.rooms.join);
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [msg, setMsg] = useState("");

  return (
    <div style={{ maxWidth: 560, margin: "0 auto" }}>
      <header style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 18 }}>
        <ORing size={44} pct={0.72} tint="#FFC93C" />
        <h1 style={{ fontFamily: "'Baloo 2'", fontSize: 34, margin: 0, flex: 1 }}>
          O<span style={{ opacity: 0.8 }}>(us)</span>
        </h1>
        <UserButton />
      </header>

      <div className="card" style={{ padding: 16, marginBottom: 14 }}>
        <h2 style={{ fontFamily: "'Baloo 2'", marginTop: 0 }}>Your rooms</h2>
        {rooms === undefined && <p>Loading…</p>}
        {rooms?.length === 0 && <p style={{ opacity: 0.6 }}>No rooms yet. Create or join one below.</p>}
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {rooms?.map((r) => (
            <button key={r._id} className="btn ghost" style={{ textAlign: "left" }}
              onClick={() => onOpen(r._id)}>
              <b>{r.name}</b> · code {r.code} · {r.myXp} XP
            </button>
          ))}
        </div>
      </div>

      <div className="card" style={{ padding: 16, marginBottom: 14 }}>
        <h3 style={{ fontFamily: "'Baloo 2'", marginTop: 0 }}>Create a room</h3>
        <div style={{ display: "flex", gap: 8 }}>
          <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Room name" />
          <button className="btn" onClick={async () => {
            if (!name.trim()) return;
            try {
              const { code } = await createRoom({ name: name.trim() });
              setMsg(`Created! Code: ${code}`); setName("");
            } catch (e) { setMsg(cleanError(e)); }
          }}>Create</button>
        </div>
      </div>

      <div className="card" style={{ padding: 16 }}>
        <h3 style={{ fontFamily: "'Baloo 2'", marginTop: 0 }}>Join a room</h3>
        <div style={{ display: "flex", gap: 8 }}>
          <input className="input" value={code} onChange={(e) => setCode(e.target.value)} placeholder="6-char code" />
          <button className="btn" onClick={async () => {
            try { await joinRoom({ code }); setMsg("Joined!"); setCode(""); }
            catch (e) { setMsg(cleanError(e)); }
          }}>Join</button>
        </div>
      </div>

      {msg && <p style={{ marginTop: 12, fontWeight: 700 }}>{msg}</p>}
    </div>
  );
}

function Room({ roomId, onBack }) {
  const me = useQuery(api.users.current);
  const myUserId = me?._id;
  const problems = useQuery(api.problems.list, { roomId });
  const feed = useQuery(api.feed.list, { roomId });
  const members = useQuery(api.rooms.members, { roomId });
  const sync = useQuery(api.problems.syncStatus, { roomId });
  const plan = useQuery(api.plans.today, { roomId });
  const solvedIds = useQuery(api.problems.mySolvedIds, { roomId });
  const { status: pushStatus, enable: enablePush } = usePush();
  const sendPush = useAction(api.push.sendToUser);
  const declineDare = useMutation(api.dares.decline);
  const updateProblem = useMutation(api.problems.update);
  const removeProblem = useMutation(api.problems.remove);
  const [editing, setEditing] = useState(null); // the problem being edited

  const addProblem = useMutation(api.problems.add);
  const logSolve = useMutation(api.solves.log);
  const sendMessage = useMutation(api.solves.sendMessage);
  const toggleReaction = useMutation(api.reactions.toggle);
  const setPlanProblems = useMutation(api.plans.setProblems);
  const lockPlan = useMutation(api.plans.lock);
  const throwDare = useMutation(api.dares.throwDare);
  const acceptDare = useMutation(api.dares.accept);
  const solvedSet = new Set(solvedIds || []);
  const unsolvedProblems = (problems || []).filter((p) => !solvedSet.has(p._id));
  const solvedProblems = (problems || []).filter((p) => solvedSet.has(p._id));
  const dares = (feed || []).filter((e) => e.kind === "dare");
  const board = [...(members || [])].sort((a, b) => b.xp - a.xp);
  const myMember = members?.find((m) => m.userId === myUserId);
  const myLevel = myMember ? levelFor(myMember.xp) : null;
  const pendingDares = dares.filter((e) => !e.done && e.dareStatus !== "declined");

  const [tab, setTab] = useState("feed");
  const [url, setUrl] = useState("");
  const [title, setTitle] = useState("");
  const [difficulty, setDifficulty] = useState("medium");
  const [topics, setTopics] = useState("");
  const [draft, setDraft] = useState("");
  const [confetti, setConfetti] = useState(0);
  const [toast, setToast] = useState(null);
  const [seenCount, setSeenCount] = useState(0);
  const bottom = useRef(null);
  const parsed = parseProblemUrl(url);

  const flash = (m) => { setToast(m); setTimeout(() => setToast(null), 3000); };
  useEffect(() => { if (tab === "feed") bottom.current?.scrollIntoView({ behavior: "smooth" }); }, [feed?.length, tab]);
  useEffect(() => {
    if (tab === "feed" && feed) setSeenCount(feed.length);
  }, [tab, feed?.length]);
  const unread = feed ? Math.max(0, feed.length - seenCount) : 0;


  const handleAdd = async () => {
    const finalTitle = title.trim() || parsed?.title;
    if (!finalTitle) { flash("Need a title or a valid URL"); return; }
    try {
      await addProblem({
        roomId, title: finalTitle, slug: parsed?.slug || "",
        url: url.trim() || undefined, platform: parsed?.platform || "custom",
        difficulty, topics: topics.split(",").map((t) => t.trim()).filter(Boolean),
      });
      setUrl(""); setTitle(""); setTopics(""); flash("Added ✓");
    } catch (e) { flash(cleanError(e)); }
  };

  const handleSolve = async (problemId) => {
    const takeaway = prompt("One-line takeaway (optional):") ?? undefined;
    try {
      const { gained } = await logSolve({ roomId, problemId, takeaway });
      setConfetti((c) => c + 1);
      flash(gained > 0 ? `Solved! +${gained} XP` : "Revisited ✓");
    } catch (e) { flash(cleanError(e)); }
  };

  const handleDare = async (problemId, problemTitle) => {
    const others = (members || []).filter((m) => m.userId !== myUserId);
    if (others.length === 0) { flash("Nobody else to dare"); return; }
    let target = others[0];
    if (others.length > 1) {
      const names = others.map((o, i) => `${i}: ${o.name}`).join("\n");
      const pick = prompt(`Dare who? Enter a number:\n${names}`);
      const idx = parseInt(pick, 10);
      if (isNaN(idx) || !others[idx]) return;
      target = others[idx];
    }
    try {
      await throwDare({ roomId, targetId: target.userId, problemId });
      await sendPush({
        userId: target.userId,
        title: "You've been dared 🎯",
        body: `${me?.name || "Someone"} dares you: ${problemTitle}`,
      });
      flash(`Dared ${target.name}`);
    } catch (e) { flash(cleanError(e)); }
  };

  const handleRemove = async (problemId, problemTitle) => {
    if (!confirm(`Remove "${problemTitle}" from the bank?`)) return;
    try {
      await removeProblem({ problemId });
      flash("Removed");
    } catch (e) { flash(cleanError(e)); }
  };

  const saveEdit = async () => {
    if (!editing) return;
    try {
      await updateProblem({
        problemId: editing._id,
        title: editing.title.trim(),
        difficulty: editing.difficulty,
        topics: (editing.topicsStr || "").split(",").map((t) => t.trim()).filter(Boolean),
      });
      setEditing(null);
      flash("Updated ✓");
    } catch (e) { flash(cleanError(e)); }
  };

  const reactionBar = (e) => (
    <div style={{ display: "flex", gap: 5, marginTop: 9 }}>
      {REACTIONS.map((emoji) => {
        const found = e.reactions?.find((r) => r.emoji === emoji);
        const count = found?.count || 0;
        const mine = e.mineReacted?.includes(emoji);
        return (
          <button key={emoji} onClick={() => toggleReaction({ eventId: e._id, emoji })}
            style={{
              fontSize: 14, background: mine ? "#FFE58A" : "#FFFCF2",
              border: "2.5px solid #171325", borderRadius: 10, padding: "1px 7px", cursor: "pointer",
            }}>
            {emoji}{count > 0 ? ` ${count}` : ""}
          </button>
        );
      })}
    </div>
  );

  return (
    <div style={{ maxWidth: 1120, margin: "0 auto" }}>
      {confetti > 0 && <Confetti key={confetti} seed={confetti} />}

      <header style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14, flexWrap: "wrap" }}>
        <button className="btn ghost tiny" onClick={onBack}>← rooms</button>
        <ORing size={42} pct={0.72} tint="#FFC93C" />
        <h1 style={{ fontFamily: "'Baloo 2'", fontSize: 30, margin: 0, flex: 1 }}>
          O<span style={{ opacity: 0.8 }}>(us)</span>
        </h1>
        <button className="btn ghost tiny" onClick={enablePush} disabled={pushStatus === "on"}>
          {pushStatus === "on" ? "🔔 on"
            : pushStatus === "working" ? "…"
            : pushStatus === "denied" ? "🔕 blocked"
            : pushStatus === "unsupported" ? "🔕 n/a"
            : "🔔 notify me"}
        </button>
        <UserButton />
      </header>

      <div className="room-grid">
        {/* RAIL */}
        <aside className="room-rail">
          {myMember && myLevel && (
            <div className="card" style={{ padding: 14, display: "flex", gap: 12, alignItems: "center", background: "#CFE4FF" }}>
              <ORing size={80} pct={myLevel.pct} tint={myLevel.tint} awake={(plan?.done || 0) > 0} />
              <div>
                <div style={{ fontFamily: "'Baloo 2'", fontWeight: 800, fontSize: 20 }}>You</div>
                <div style={{ fontSize: 13, opacity: 0.75 }}>{myLevel.big}</div>
                <div style={{ fontSize: 11, opacity: 0.6, marginTop: 3 }}>
                  {myMember.xp} XP · 🔥 {myMember.streak}d · ✅ {myMember.solved} solved
                </div>
              </div>
            </div>
          )}

          <div className="card rail-standings" style={{ padding: 13 }}>
            <div style={{ fontFamily: "'Baloo 2'", fontWeight: 800, fontSize: 16, marginBottom: 8 }}>Standings</div>
            {board.map((m, i) => {
              const lv = levelFor(m.xp);
              return (
                <div key={m.userId} style={{
                  display: "flex", alignItems: "center", gap: 9, padding: "7px 0",
                  borderTop: i === 0 ? "none" : "2px dashed rgba(23,19,37,.13)",
                }}>
                  <span style={{ fontFamily: "'Baloo 2'", fontWeight: 800, opacity: 0.5, width: 14 }}>{i + 1}</span>
                  <ORing size={34} pct={lv.pct} tint={lv.tint} thin />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: 14 }}>{m.name}</div>
                    <div style={{ fontSize: 10.5, opacity: 0.55 }}>{lv.big} · 🔥{m.streak}</div>
                  </div>
                  <div style={{ fontFamily: "'Baloo 2'", fontWeight: 800, fontSize: 15 }}>{m.xp}</div>
                </div>
              );
            })}
          </div>

          {plan && (
            <div className="card" style={{ padding: 13, background: "#FFF0B8" }}>
              <div style={{ fontFamily: "'Baloo 2'", fontWeight: 800, fontSize: 16 }}>Today's plan</div>
              {plan.locked ? (
                <>
                  <div style={{ fontFamily: "'Baloo 2'", fontWeight: 800, fontSize: 28, marginTop: 4 }}>
                    {plan.done}<span style={{ fontSize: 16, opacity: 0.45 }}>/{plan.target}</span>
                  </div>
                  <div style={{ fontSize: 11.5, opacity: 0.7 }}>Locked. Add more any time; can't remove.</div>
                </>
              ) : (
                <>
                  <div style={{ fontSize: 13, margin: "4px 0 8px" }}>{plan.problemIds.length} picked</div>
                  <button className="btn tiny" disabled={plan.problemIds.length === 0}
                    onClick={() => lockPlan({ roomId })}
                    style={{ background: "#7BE495" }}>Lock the day</button>
                </>
              )}
            </div>
          )}

          {sync && (
            <div className="card" style={{ padding: 13, background: "#DDF3FF" }}>
              <div style={{ fontFamily: "'Baloo 2'", fontWeight: 800, fontSize: 16 }}>In sync</div>
              <div style={{ fontFamily: "'Baloo 2'", fontWeight: 800, fontSize: 26 }}>
                {sync.syncedCount}<span style={{ fontSize: 15, opacity: 0.45 }}>/{sync.target}</span>
              </div>
              <div style={{ fontSize: 11.5, opacity: 0.7 }}>
                {sync.bonusActive ? "Bonus active 🎉" : "Both solved the same problem."}
              </div>
            </div>
          )}
        </aside>

        {/* MAIN */}
        <main style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button className={`btn ${tab === "feed" ? "" : "ghost"} tiny`} onClick={() => setTab("feed")}>
              Feed
              {tab !== "feed" && unread > 0 && (
                <span style={{ marginLeft: 6, background: "#FF6B9D", color: "#171325", border: "2px solid #171325", borderRadius: 10, fontSize: 11, fontWeight: 800, padding: "0 6px" }}>
                  {unread}
                </span>
              )}
            </button>
            <button className={`btn ${tab === "bank" ? "" : "ghost"} tiny`} onClick={() => setTab("bank")}>
              Problems ({unsolvedProblems.length})
            </button>
            <button className={`btn ${tab === "solved" ? "" : "ghost"} tiny`} onClick={() => setTab("solved")}>
              Solved ({solvedProblems.length})
            </button>
            <button className={`btn ${tab === "dares" ? "" : "ghost"} tiny`} onClick={() => setTab("dares")}>
              Dares
              {pendingDares.some((d) => d.targetId === myUserId) && (
                <span style={{ marginLeft: 6, background: "#FF6B9D", color: "#171325", border: "2px solid #171325", borderRadius: 10, fontSize: 11, fontWeight: 800, padding: "0 6px" }}>
                  {pendingDares.filter((d) => d.targetId === myUserId).length}
                </span>
              )}
            </button>
          </div>

          {tab === "feed" && (
            <>
              <div className="feed-scroll">
                {feed === undefined && <p>Loading…</p>}
                {feed?.map((e) => {
                  if (e.kind === "solve") return (
                    <div key={e._id} className="card" style={{ padding: 12, background: "#F2F8FF", animation: "rise .34s cubic-bezier(.34,1.56,.64,1)" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                        <b>{e.authorName}</b>
                        <span style={{ background: DIFF_COLOR[e.difficulty], border: "2.5px solid #171325", borderRadius: 9, padding: "1px 9px", fontSize: 12, fontWeight: 700 }}>{e.difficulty}</span>
                        <span style={{ fontSize: 10, opacity: 0.45, marginLeft: "auto" }}>{formatTime(e._creationTime)}</span>
                      </div>
                      <div style={{ fontFamily: "'Baloo 2'", fontWeight: 800, fontSize: 18, marginTop: 6 }}>
                        {e.problemUrl ? <a href={e.problemUrl} target="_blank" rel="noreferrer">{e.problemTitle}</a> : e.problemTitle}
                      </div>
                      {e.locked
                        ? e.hasTakeaway && <div style={{ opacity: 0.5, fontSize: 12, marginTop: 4 }}>🔒 solve it to read the takeaway</div>
                        : e.takeaway && <div style={{ fontSize: 13, opacity: 0.7, marginTop: 4 }}>“{e.takeaway}”</div>}
                      {reactionBar(e)}
                    </div>
                  );
                  if (e.kind === "text") {
                    const mine = e.userId === myUserId;
                    return (
                      <div key={e._id} style={{ display: "flex", justifyContent: mine ? "flex-end" : "flex-start" }}>
                        <div className="card" style={{
                          padding: "9px 13px", maxWidth: "78%",
                          background: mine ? "#CFE4FF" : "#FFFCF2",
                          borderBottomRightRadius: mine ? 6 : 20,
                          borderBottomLeftRadius: mine ? 20 : 6,
                        }}>
                          {!mine && <div style={{ fontSize: 11, fontWeight: 700, opacity: 0.6, marginBottom: 2 }}>{e.authorName}</div>}
                          <div style={{ fontSize: 14 }}>{e.body}</div>
                          <div style={{ fontSize: 10, opacity: 0.45, marginTop: 3, textAlign: "right" }}>
                            {formatTime(e._creationTime)}
                          </div>
                          {reactionBar(e)}
                        </div>
                      </div>
                    );
                  }
                  if (e.kind === "dare") {
                    const forMe = e.targetId === myUserId;
                    return (
                      <div key={e._id} className="card" style={{ padding: 12, background: "#FFE9F2" }}>
                        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", opacity: 0.6 }}>
                          {e.authorName} → {e.targetName}
                        </div>
                        <div style={{ fontFamily: "'Baloo 2'", fontWeight: 800, fontSize: 18, marginTop: 2 }}>{e.problemTitle}</div>
                        {e.dareStatus === "declined" ? (
                          <div style={{ color: "#B0741F", fontWeight: 700, marginTop: 6 }}>declined 🙅</div>
                        ) : e.done ? (
                          <div style={{ color: "#2E9E63", fontWeight: 700, marginTop: 6 }}>cleared ✓</div>
                        ) : forMe ? (
                          <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
                            <button className="btn tiny" onClick={() => acceptDare({ eventId: e._id })}>Take it on</button>
                            <button className="btn ghost tiny" onClick={() => declineDare({ eventId: e._id })}>Decline</button>
                          </div>
                        ) : (
                          <div style={{ opacity: 0.6, fontWeight: 700, marginTop: 6 }}>pending…</div>
                        )}
                      </div>
                    );
                  }
                  if (e.kind === "system") return (
                    <div key={e._id} style={{ display: "flex", justifyContent: "center" }}>
                      <span style={{ background: "#B77BFF", border: "3px solid #171325", borderRadius: 14, boxShadow: "4px 4px 0 #171325", padding: "7px 16px", fontFamily: "'Baloo 2'", fontWeight: 800, fontSize: 14, animation: "stamp .4s cubic-bezier(.34,1.56,.64,1)" }}>{e.body}</span>
                    </div>
                  );
                  return null;
                })}
                <div ref={bottom} />
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <input className="input" value={draft} onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter" && draft.trim()) { sendMessage({ roomId, body: draft }); setDraft(""); } }}
                  placeholder="say something…" />
                <button className="btn" onClick={() => { if (draft.trim()) { sendMessage({ roomId, body: draft }); setDraft(""); } }}>Send</button>
              </div>
            </>
          )}

          {tab === "bank" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <div className="card" style={{ padding: 14 }}>
                <div style={{ fontFamily: "'Baloo 2'", fontWeight: 800, fontSize: 18, marginBottom: 8 }}>Add a problem</div>
                <input className="input" style={{ marginBottom: 6 }} value={url}
                  onChange={(e) => { setUrl(e.target.value); const q = parseProblemUrl(e.target.value); if (q && !title.trim()) setTitle(q.title); }}
                  placeholder="Paste LeetCode / GfG link" />
                {parsed && <small style={{ opacity: 0.7 }}>read as: {parsed.title} on {parsed.platform}</small>}
                <input className="input" style={{ margin: "6px 0" }} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title" />
                <div style={{ display: "flex", gap: 8, marginBottom: 6 }}>
                  {["easy", "medium", "hard"].map((d) => (
                    <button key={d} onClick={() => setDifficulty(d)}
                      style={{ flex: 1, fontFamily: "inherit", fontWeight: 700, padding: 8, cursor: "pointer",
                        border: "3px solid #171325", borderRadius: 13, boxShadow: "3px 3px 0 #171325",
                        background: difficulty === d ? DIFF_COLOR[d] : "#FFFCF2" }}>{d}</button>
                  ))}
                </div>
                <input className="input" style={{ marginBottom: 8 }} value={topics} onChange={(e) => setTopics(e.target.value)} placeholder="topics, comma, separated" />
                <button className="btn" onClick={handleAdd}>Add to bank</button>
              </div>

              {unsolvedProblems.map((p) => {
                const inPlan = plan?.problemIds.includes(p._id);
                return (
                  <div key={p._id} className="card" style={{ padding: 12, display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
                    <div style={{ flex: 1, minWidth: 180 }}>
                      <div style={{ fontFamily: "'Baloo 2'", fontWeight: 800, fontSize: 17 }}>
                        {p.url ? <a href={p.url} target="_blank" rel="noreferrer">{p.title}</a> : p.title}
                      </div>
                      <div style={{ display: "flex", gap: 6, alignItems: "center", marginTop: 5, flexWrap: "wrap" }}>
                        <span style={{ background: DIFF_COLOR[p.difficulty], border: "2.5px solid #171325", borderRadius: 8, padding: "0 7px", fontSize: 11, fontWeight: 700 }}>{p.difficulty}</span>
                        <span style={{ fontSize: 11, opacity: 0.6 }}>added by {p.addedByName}</span>
                        {inPlan && <span style={{ fontSize: 11, fontWeight: 700, background: "#FFF0B8", border: "2px solid #171325", borderRadius: 8, padding: "0 6px" }}>in plan</span>}
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                      <button className="btn tiny" onClick={() => handleSolve(p._id)}>Nuked</button>
                      {plan && !inPlan && <button className="btn ghost tiny" onClick={() => setPlanProblems({ roomId, problemIds: [...(plan.problemIds || []), p._id] })}>+ plan</button>}
                      {plan && inPlan && !plan.locked && <button className="btn ghost tiny" onClick={() => setPlanProblems({ roomId, problemIds: plan.problemIds.filter((id) => id !== p._id) })}>− plan</button>}
                      {members && members.length > 1 && <button className="btn ghost tiny" onClick={() => handleDare(p._id, p.title)}>dare</button>}
                      {p.addedBy === myUserId && (
                        <>
                          <button className="btn ghost tiny" onClick={() => setEditing({ ...p, topicsStr: (p.topics || []).join(", ") })}>edit</button>
                          <button className="btn ghost tiny" onClick={() => handleRemove(p._id, p.title)}>✕</button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {tab === "solved" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {solvedProblems.length === 0 && <p style={{ opacity: 0.6 }}>Nothing solved yet. Go nuke a problem.</p>}
              {solvedProblems.map((p) => {
                const inPlan = plan?.problemIds.includes(p._id);
                return (
                  <div key={p._id} className="card" style={{ padding: 12, background: "#F1FBF4", display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
                    <div style={{ flex: 1, minWidth: 180 }}>
                      <div style={{ fontFamily: "'Baloo 2'", fontWeight: 800, fontSize: 17 }}>
                        {p.url ? <a href={p.url} target="_blank" rel="noreferrer">{p.title}</a> : p.title}
                      </div>
                      <div style={{ display: "flex", gap: 6, alignItems: "center", marginTop: 5, flexWrap: "wrap" }}>
                        <span style={{ background: DIFF_COLOR[p.difficulty], border: "2.5px solid #171325", borderRadius: 8, padding: "0 7px", fontSize: 11, fontWeight: 700 }}>{p.difficulty}</span>
                        <span style={{ fontSize: 11, fontWeight: 700, color: "#2E9E63" }}>✓ solved</span>
                        {inPlan && <span style={{ fontSize: 11, fontWeight: 700, background: "#FFF0B8", border: "2px solid #171325", borderRadius: 8, padding: "0 6px" }}>in plan</span>}
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                      <button className="btn ghost tiny" onClick={() => handleSolve(p._id)}>revisit</button>
                      {plan && !inPlan && <button className="btn ghost tiny" onClick={() => setPlanProblems({ roomId, problemIds: [...(plan.problemIds || []), p._id] })}>+ plan</button>}
                      {members && members.length > 1 && <button className="btn ghost tiny" onClick={() => handleDare(p._id, p.title)}>dare</button>}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {tab === "dares" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {dares.length === 0 && <p style={{ opacity: 0.6 }}>No dares yet. Throw one from the Problems tab.</p>}
              {dares.map((e) => {
                const forMe = e.targetId === myUserId;
                return (
                  <div key={e._id} className="card" style={{ padding: 12, background: "#FFE9F2" }}>
                    <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", opacity: 0.6 }}>
                      {e.authorName} → {e.targetName}
                    </div>
                    <div style={{ fontFamily: "'Baloo 2'", fontWeight: 800, fontSize: 18, marginTop: 2 }}>{e.problemTitle}</div>
                    {e.dareStatus === "declined" ? (
                      <div style={{ color: "#B0741F", fontWeight: 700, marginTop: 6 }}>declined 🙅</div>
                    ) : e.done ? (
                      <div style={{ color: "#2E9E63", fontWeight: 700, marginTop: 6 }}>cleared ✓</div>
                    ) : forMe ? (
                      <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
                        <button className="btn tiny" onClick={() => acceptDare({ eventId: e._id })}>Take it on</button>
                        <button className="btn ghost tiny" onClick={() => declineDare({ eventId: e._id })}>Decline</button>
                      </div>
                    ) : (
                      <div style={{ opacity: 0.6, fontWeight: 700, marginTop: 6 }}>pending…</div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </main>
      </div>
          {editing && (
        <div onClick={() => setEditing(null)} style={{
          position: "fixed", inset: 0, background: "rgba(23,19,37,.4)",
          display: "flex", alignItems: "center", justifyContent: "center", padding: 18, zIndex: 50,
        }}>
          <div className="card" onClick={(ev) => ev.stopPropagation()} style={{ padding: 18, width: "100%", maxWidth: 400 }}>
            <div style={{ fontFamily: "'Baloo 2'", fontWeight: 800, fontSize: 22, marginBottom: 10 }}>Edit problem</div>
            <input className="input" style={{ marginBottom: 8 }} value={editing.title}
              onChange={(ev) => setEditing({ ...editing, title: ev.target.value })} placeholder="Title" />
            <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
              {["easy", "medium", "hard"].map((d) => (
                <button key={d} onClick={() => setEditing({ ...editing, difficulty: d })}
                  style={{ flex: 1, fontFamily: "inherit", fontWeight: 700, padding: 8, cursor: "pointer",
                    border: "3px solid #171325", borderRadius: 13, boxShadow: "3px 3px 0 #171325",
                    background: editing.difficulty === d ? DIFF_COLOR[d] : "#FFFCF2" }}>{d}</button>
              ))}
            </div>
            <input className="input" style={{ marginBottom: 12 }} value={editing.topicsStr || ""}
              onChange={(ev) => setEditing({ ...editing, topicsStr: ev.target.value })} placeholder="topics, comma, separated" />
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <button className="btn ghost tiny" onClick={() => setEditing(null)}>Cancel</button>
              <button className="btn tiny" onClick={saveEdit}>Save</button>
            </div>
          </div>
        </div>
      )}
      {toast && (
        <div style={{ position: "fixed", left: "50%", bottom: 26, transform: "translateX(-50%)", zIndex: 60,
          background: "#7BE495", border: "3px solid #171325", borderRadius: 16, boxShadow: "5px 5px 0 #171325",
          padding: "12px 22px", fontFamily: "'Baloo 2'", fontWeight: 800, fontSize: 16, animation: "rise .4s cubic-bezier(.34,1.56,.64,1)" }}>
          {toast}
        </div>
      )}
    </div>
  );
}