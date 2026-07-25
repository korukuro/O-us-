import {
  SignInButton,
  UserButton,
  SignedIn,
  SignedOut,
} from "@clerk/clerk-react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../convex/_generated/api";
import { useStoreUser } from "./hooks/useStoreUser";
import { useState } from "react";

export default function App() {
  return (
    <div style={{ padding: 40, fontFamily: "system-ui", maxWidth: 560 }}>
      <h1>O(us)</h1>
      <SignedOut>
        <SignInButton mode="modal" />
      </SignedOut>
      <SignedIn>
        <Dashboard />
      </SignedIn>
    </div>
  );
}

function Dashboard() {
  useStoreUser();
  const rooms = useQuery(api.rooms.myRooms);
  const createRoom = useMutation(api.rooms.create);
  const joinRoom = useMutation(api.rooms.join);

  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [msg, setMsg] = useState("");

  const handleCreate = async () => {
    if (!name.trim()) return;
    const { code } = await createRoom({ name: name.trim() });
    setMsg(`Created! Invite code: ${code}`);
    setName("");
  };

  const handleJoin = async () => {
    try {
      await joinRoom({ code });
      setMsg("Joined!");
      setCode("");
    } catch (e) {
      setMsg(e.message);
    }
  };

  return (
    <div>
      <UserButton />

      <h2>Your rooms</h2>
      {rooms === undefined && <p>Loading…</p>}
      {rooms?.length === 0 && <p>No rooms yet. Create one below.</p>}
      <ul>
        {rooms?.map((r) => (
          <li key={r._id}>
            <b>{r.name}</b> — code {r.code} — {r.myXp} XP
          </li>
        ))}
      </ul>

      <h3>Create a room</h3>
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Room name"
      />
      <button onClick={handleCreate}>Create</button>

      <h3>Join a room</h3>
      <input
        value={code}
        onChange={(e) => setCode(e.target.value)}
        placeholder="6-char code"
      />
      <button onClick={handleJoin}>Join</button>

      {msg && <p style={{ marginTop: 16 }}>{msg}</p>}
    </div>
  );
}