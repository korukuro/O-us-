import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";

// base64 → Uint8Array, required format for the applicationServerKey
function urlBase64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const arr = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
  return arr;
}

export function usePush() {
  const save = useMutation(api.subscriptions.saveSubscription);
  const [status, setStatus] = useState("idle"); // idle | working | on | denied | unsupported

  const enable = async () => {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      setStatus("unsupported");
      return;
    }
    setStatus("working");
    try {
      const reg = await navigator.serviceWorker.ready;

      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setStatus("denied");
        return;
      }

      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(
          import.meta.env.VITE_VAPID_PUBLIC_KEY
        ),
      });

      await save({ subscription: JSON.stringify(sub) });
      setStatus("on");
    } catch (e) {
      console.error("push enable failed", e);
      setStatus("idle");
    }
  };

  return { status, enable };
}