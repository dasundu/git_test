self.addEventListener("push", (event) => {
  let data = {};
  try { data = event.data ? event.data.json() : {}; } catch (e) {}
  event.waitUntil(
    self.registration.showNotification(data.title || "TruckMarket PH", {
      body: data.body || "",
      data: { link: data.link || "/" },
      icon: "/icon.svg",
      badge: "/icon.svg",
    })
  );
});
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const link = (event.notification.data && event.notification.data.link) || "/";
  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
      for (const c of list) { if ("focus" in c) { c.navigate(link); return c.focus(); } }
      return clients.openWindow(link);
    })
  );
});
