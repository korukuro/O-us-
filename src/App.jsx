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
  const problems = useQuery(api.problems.list, { roomId });
  const addProblem = useMutation(api.problems.add);

  const [url, setUrl] = useState("");
  const [title, setTitle] = useState("");
  const [difficulty, setDifficulty] = useState("medium");
  const [topics, setTopics] = useState("");
  const [msg, setMsg] = useState("");

  const parsed = parseProblemUrl(url);

  const handleAdd = async () => {
    const finalTitle = title.trim() || parsed?.title;
    if (!finalTitle) { setMsg("Need a title or a valid URL"); return; }
    try {
      await addProblem({
        roomId,
        title: finalTitle,
        slug: parsed?.slug || "",
        url: url.trim() || undefined,
        platform: parsed?.platform || "custom",
        difficulty,
        topics: topics.split(",").map((t) => t.trim()).filter(Boolean),
      });
      setUrl(""); setTitle(""); setTopics(""); setMsg("Added ✓");
    } catch (e) {
      setMsg(e.message);
    }
  };

  return (
    <div>
      <button onClick={onBack}>← rooms</button>
      <h2>Problem bank</h2>

      {problems === undefined && <p>Loading…</p>}
      {problems?.length === 0 && <p>Empty. Add the first problem.</p>}
      <ul>
        {problems?.map((p) => (
          <li key={p._id}>
            {p.url ? <a href={p.url} target="_blank" rel="noreferrer">{p.title}</a> : p.title}
            {" — "}{p.difficulty} — {p.platform} — added by {p.addedByName}
            {p.topics.length > 0 && ` — [${p.topics.join(", ")}]`}
          </li>
        ))}
      </ul>

      <h3>Add a problem</h3>
      <div>
        <input
          value={url}
          onChange={(e) => {
            setUrl(e.target.value);
            const q = parseProblemUrl(e.target.value);
            if (q && !title.trim()) setTitle(q.title);
          }}
          placeholder="Paste LeetCode / GfG link"
          style={{ width: "100%" }}
        />
        {parsed && <small>read as: {parsed.title} on {parsed.platform}</small>}
      </div>
      <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title" />
      <select value={difficulty} onChange={(e) => setDifficulty(e.target.value)}>
        <option value="easy">Easy</option>
        <option value="medium">Medium</option>
        <option value="hard">Hard</option>
      </select>
      <input value={topics} onChange={(e) => setTopics(e.target.value)} placeholder="topics, comma, separated" />
      <button onClick={handleAdd}>Add</button>

      {msg && <p>{msg}</p>}
    </div>
  );
}