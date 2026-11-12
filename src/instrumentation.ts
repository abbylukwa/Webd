export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { ensureHeartbeat } = await import("./lib/beast/heartbeat");
    ensureHeartbeat();
  }
}
