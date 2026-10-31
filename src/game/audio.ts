// Tiny Web Audio synth: no asset files needed.
let ctx: AudioContext | null = null;
export let muted = localStorage.getItem("ok-muted") === "1";

export function setMuted(m: boolean) {
  muted = m;
  try { localStorage.setItem("ok-muted", m ? "1" : "0"); } catch { /* ignore */ }
}

export function beep(freq: number, dur = 0.12, type: OscillatorType = "sine", vol = 0.06, to?: number) {
  if (muted) return;
  try {
    ctx ??= new AudioContext();
    if (ctx.state === "suspended") void ctx.resume();
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, ctx.currentTime);
    if (to) o.frequency.exponentialRampToValueAtTime(to, ctx.currentTime + dur);
    g.gain.setValueAtTime(vol, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + dur);
    o.connect(g).connect(ctx.destination);
    o.start();
    o.stop(ctx.currentTime + dur);
  } catch { /* audio unavailable */ }
}
