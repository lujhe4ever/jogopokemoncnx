const status = document.querySelector<HTMLParagraphElement>("#status");

async function boot() {
  const health = await fetch("/api/health");
  const protocol = location.protocol === "https:" ? "wss" : "ws";
  const socket = new WebSocket(`${protocol}://${location.host}/ws`);
  socket.addEventListener("message", () => {
    if (status)
      status.textContent = `HTTP ${String(health.status)}; WebSocket conectado`;
    socket.close();
  });
}

void boot().catch((error: unknown) => {
  if (status)
    status.textContent =
      error instanceof Error ? error.message : "Falha no boot";
});
