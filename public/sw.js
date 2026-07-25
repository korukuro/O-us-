// public/sw.js — runs in the background, even when the app is closed

self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data.json();
  } catch {
    data = { title: "O(us)", body: event.data?.text() || "" };
  }

  event.waitUntil(
    self.registration.showNotification(data.title || "O(us)", {
      body: data.body || "",
      icon: "/favicon.svg",
      badge: "/favicon.svg",
      data: { url: data.url || "/" },
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
      for (const client of list) {
        if ("focus" in client) return client.focus();
      }
      return clients.openWindow(event.notification.data?.url || "/");
    })
  );
});