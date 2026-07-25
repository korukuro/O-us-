import { useEffect, useState } from "react";
import { useConvexAuth, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";

export function useStoreUser() {
  const { isAuthenticated } = useConvexAuth();
  const [userId, setUserId] = useState(null);
  const store = useMutation(api.users.store);

  useEffect(() => {
    if (!isAuthenticated) return;
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    store({ tz }).then(setUserId);
  }, [isAuthenticated, store]);

  return userId;
}