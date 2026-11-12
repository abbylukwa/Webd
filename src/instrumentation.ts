export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { ensureWorkLoop } = await import("./lib/beast/heartbeat");
    ensureWorkLoop();
  }
}
