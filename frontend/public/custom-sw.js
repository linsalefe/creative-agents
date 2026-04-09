// Handler de push notifications
self.addEventListener("push", (event) => {
  const data = event.data ? event.data.json() : {};

  const title = data.title || "Creative Machine";
  const options = {
    body: data.body || "Você tem uma atualização!",
    icon: "/icons/icon-192.png",
    badge: "/icons/icon-192.png",
    vibrate: [100, 50, 100],
    data: {
      url: data.url || "/dashboard",
    },
    actions: data.actions || [],
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// Ao clicar na notificação, abre o app na página correta
self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const url = event.notification.data?.url || "/dashboard";

  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      // Se já tem uma aba aberta, foca nela
      for (const client of clientList) {
        if (client.url.includes("creative.cenatdata.online") && "focus" in client) {
          client.navigate(url);
          return client.focus();
        }
      }
      // Senão, abre nova aba
      return clients.openWindow(url);
    })
  );
});
