// Custom service-worker code compiled by next-pwa (customWorkerDir = "worker").
// Handles Web Push delivery: shows a notification and focuses the app on click.

self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch (e) {
    data = { title: "EXP Calendar", body: event.data ? event.data.text() : "" };
  }
  const title = data.title || "EXP Calendar";
  const options = {
    body: data.body || "",
    tag: "exp-calendar",
    renotify: true
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
      for (const client of list) {
        if ("focus" in client) return client.focus();
      }
      if (self.clients.openWindow) return self.clients.openWindow("/calendar");
    })
  );
});
