import {
  SignInButton,
  UserButton,
  SignedIn,
  SignedOut,
} from "@clerk/clerk-react";
import { useQuery } from "convex/react";
import { api } from "../convex/_generated/api";
import { useStoreUser } from "./hooks/useStoreUser";

export default function App() {
  return (
    <div style={{ padding: 40, fontFamily: "system-ui" }}>
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
  const me = useQuery(api.users.current);

  return (
    <div>
      <UserButton />
      {me === undefined && <p>Loading…</p>}
      {me === null && <p>Signed in, but no Convex user yet…</p>}
      {me && (
        <div>
          <p>Convex user created ✓</p>
          <p>Name: {me.name}</p>
          <p>Timezone: {me.tz}</p>
        </div>
      )}
    </div>
  );
}