import {
  SignInButton,
  UserButton,
  SignedIn,
  SignedOut,
} from "@clerk/clerk-react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../convex/_generated/api";
import { useStoreUser } from "./hooks/useStoreUser";
import { parseProblemUrl } from "./lib/parseProblemUrl";
import { useState } from "react";

export default function App() {
  return (
    <div style={{ padding: 40, fontFamily: "system-ui", maxWidth: 640 }}>
      <h1>O(us)</h1>
      <SignedOut>
        <SignInButton mode="modal" />
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

  if (activeRoom) {
    return <Room roomId={activeRoom} onBack={() => setActiveRoom(null)} />;
  }
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
    <div>
      <UserButton />
      <h2>Your rooms</h2>
      {rooms === undefined && <p>Loading…</p>}
      {rooms?.length === 0 && <p>No rooms yet.</p>}
      <ul>
        {rooms?.map((r) => (
          <li key={r._id}>
            <button onClick={() => onOpen(r._id)}>
              {r.name} — code {r.code}
            </button>
          </li>
        ))}
      </ul>

      <h3>Create</h3>
      <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Room name" />
      <button onClick={async () => {
        if (!name.trim()) return;
        const { code } = await createRoom({ name: name.trim() });
        setMsg(`Created! Code: ${code}`);
        setName("");
      }}>Create</button>

      <h3>Join</h3>
      <input value={code} onChange={(e) => setCode(e.target.value)} placeholder="6-char code" />
      <button onClick={async () => {
        try { await joinRoom({ code }); setMsg("Joined!"); setCode(""); }
        catch (e) { setMsg(e.message); }
      }}>Join</button>

      {msg && <p>{msg}</p>}
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

  const addProblem = useMutation(api.problems.add);
  const logSolve = useMutation(api.solves.log);
  const sendMessage = useMutation(api.solves.sendMessage);
  const toggleReaction = useMutation(api.reactions.toggle);
  const setPlanProblems = useMutation(api.plans.setProblems);
  const lockPlan = useMutation(api.plans.lock);
  const throwDare = useMutation(api.dares.throwDare);
  const acceptDare = useMutation(api.dares.accept);

  const [url, setUrl] = useState("");
  const [title, setTitle] = useState("");
  const [difficulty, setDifficulty] = useState("medium");
  const [topics, setTopics] = useState("");
  const [draft, setDraft] = useState("");
  const [msg, setMsg] = useState("");

  const parsed = parseProblemUrl(url);

  const handleAdd = async () => {
    const finalTitle = title.trim() || parsed?.title;
    if (!finalTitle) { setMsg("Need a title or a valid URL"); return; }
    try {
      await addProblem({
        roomId, title: finalTitle, slug: parsed?.slug || "",
        url: url.trim() || undefined, platform: parsed?.platform || "custom",
        difficulty, topics: topics.split(",").map((t) => t.trim()).filter(Boolean),
      });
      setUrl(""); setTitle(""); setTopics(""); setMsg("Added ✓");
    } catch (e) { setMsg(e.message); }
  };

  const handleSolve = async (problemId) => {
    const takeaway = prompt("One-line takeaway (optional):") ?? undefined;
    try {
      const { gained } = await logSolve({ roomId, problemId, takeaway });
      setMsg(`Solved! +${gained} XP`);
    } catch (e) { setMsg(e.message); }
  };

  const handleDare = async (problemId, problemTitle) => {
    const others = (members || []).filter((m) => m.userId !== myUserId);
    if (others.length === 0) { setMsg("Nobody else in the room to dare"); return; }
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
      setMsg(`Dared ${target.name} to do ${problemTitle}`);
    } catch (e) { setMsg(e.message); }
  };

  return (
    <div>
      <button onClick={onBack}>← rooms</button>

      <div style={{ display: "flex", gap: 40, alignItems: "flex-start" }}>
        {/* LEFT: plan + problem bank */}
        <div style={{ flex: 1 }}>
          <h2>Today's plan</h2>
          {plan && (
            <div style={{ background: "#ffd", padding: 10, marginBottom: 12 }}>
              {plan.locked ? (
                <>
                  <b>{plan.done}/{plan.target} done</b> (locked)
                  <div style={{ fontSize: 12 }}>Add more any time; can't remove.</div>
                </>
              ) : (
                <>
                  <b>{plan.problemIds.length} picked</b> — not locked
                  <button
                    disabled={plan.problemIds.length === 0}
                    onClick={() => lockPlan({ roomId })}
                    style={{ marginLeft: 8 }}>
                    Lock the day
                  </button>
                </>
              )}
            </div>
          )}

          {sync && (
            <div style={{ background: "#def", padding: 8, marginBottom: 12 }}>
              <b>In sync: {sync.syncedCount}/{sync.target}</b>
              {sync.bonusActive && " — bonus active 🎉"}
              <div style={{ fontSize: 12 }}>Problems 2+ of you have both solved.</div>
            </div>
          )}

          <h2>Problem bank</h2>
          {problems === undefined && <p>Loading…</p>}
          <ul>
            {problems?.map((p) => (
              <li key={p._id}>
                {p.url ? <a href={p.url} target="_blank" rel="noreferrer">{p.title}</a> : p.title}
                {" — "}{p.difficulty} — added by {p.addedByName}{" "}
                <button onClick={() => handleSolve(p._id)}>Log solve</button>
                {plan && !plan.problemIds.includes(p._id) && (
                  <button onClick={() => setPlanProblems({
                    roomId,
                    problemIds: [...(plan.problemIds || []), p._id],
                  })}>+ plan</button>
                )}
                {plan && plan.problemIds.includes(p._id) && !plan.locked && (
                  <button onClick={() => setPlanProblems({
                    roomId,
                    problemIds: plan.problemIds.filter((id) => id !== p._id),
                  })}>− unplan</button>
                )}
                {plan?.problemIds.includes(p._id) && <span> [in plan]</span>}
                {members && members.length > 1 && (
                  <button onClick={() => handleDare(p._id, p.title)}>dare</button>
                )}
              </li>
            ))}
          </ul>

          <h3>Add a problem</h3>
          <input value={url} style={{ width: "100%" }}
            onChange={(e) => {
              setUrl(e.target.value);
              const q = parseProblemUrl(e.target.value);
              if (q && !title.trim()) setTitle(q.title);
            }}
            placeholder="Paste LeetCode / GfG link" />
          {parsed && <small>read as: {parsed.title} on {parsed.platform}</small>}
          <br />
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title" />
          <select value={difficulty} onChange={(e) => setDifficulty(e.target.value)}>
            <option value="easy">Easy</option>
            <option value="medium">Medium</option>
            <option value="hard">Hard</option>
          </select>
          <input value={topics} onChange={(e) => setTopics(e.target.value)} placeholder="topics" />
          <button onClick={handleAdd}>Add</button>
        </div>

        {/* RIGHT: feed */}
        <div style={{ flex: 1 }}>
          <h2>Feed</h2>
          {feed === undefined && <p>Loading…</p>}
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {feed?.map((e) => {
              const reactionBar = (
                <div style={{ display: "flex", gap: 4, marginTop: 4 }}>
                  {["🔥", "🧠", "😭", "💀"].map((emoji) => {
                    const found = e.reactions?.find((r) => r.emoji === emoji);
                    const count = found?.count || 0;
                    const mine = e.mineReacted?.includes(emoji);
                    return (
                      <button key={emoji}
                        onClick={() => toggleReaction({ eventId: e._id, emoji })}
                        style={{ fontWeight: mine ? "bold" : "normal" }}>
                        {emoji}{count > 0 ? ` ${count}` : ""}
                      </button>
                    );
                  })}
                </div>
              );

              if (e.kind === "solve") return (
                <div key={e._id} style={{ background: "#eef", padding: 8 }}>
                  <b>{e.authorName}</b> solved <b>{e.problemTitle}</b> ({e.difficulty})
                  {e.locked
                    ? e.hasTakeaway && <div style={{ opacity: 0.5 }}>🔒 solve it to read the takeaway</div>
                    : e.takeaway && <div>“{e.takeaway}”</div>}
                  {reactionBar}
                </div>
              );
              if (e.kind === "text") return (
                <div key={e._id} style={{ padding: 8 }}>
                  <b>{e.authorName}:</b> {e.body}
                  {reactionBar}
                </div>
              );
              if (e.kind === "dare") return (
                <div key={e._id} style={{ background: "#fde", padding: 8 }}>
                  <b>{e.authorName}</b> dared <b>{e.targetName}</b>: {e.problemTitle}
                  {e.done ? (
                    <span> — cleared ✓</span>
                  ) : e.targetId === myUserId ? (
                    <button onClick={() => acceptDare({ eventId: e._id })}
                      style={{ marginLeft: 8 }}>Take it on</button>
                  ) : (
                    <span> — pending…</span>
                  )}
                  {reactionBar}
                </div>
              );
              if (e.kind === "system") return (
                <div key={e._id} style={{ textAlign: "center", color: "#777" }}>{e.body}</div>
              );
              return null;
            })}
          </div>

          <div style={{ marginTop: 12 }}>
            <input value={draft} onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && draft.trim()) {
                  sendMessage({ roomId, body: draft });
                  setDraft("");
                }
              }}
              placeholder="message…" />
          </div>
        </div>
      </div>

      {msg && <p>{msg}</p>}
    </div>
  );
}