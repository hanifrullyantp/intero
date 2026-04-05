/** Short synthetic "ting" — works without audio file (browser autoplay rules still apply). */
export function playSyntheticTing(volume = 0.25) {
  try {
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    const g = ctx.createGain();
    g.connect(ctx.destination);
    g.gain.value = volume;
    const o = ctx.createOscillator();
    o.type = "sine";
    o.frequency.setValueAtTime(880, ctx.currentTime);
    o.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.08);
    o.connect(g);
    o.start(ctx.currentTime);
    o.stop(ctx.currentTime + 0.12);
    o.onended = () => ctx.close();
  } catch {
    /* ignore */
  }
}

export function playTingFromUrl(url: string | null, volume = 0.4) {
  if (!url) {
    playSyntheticTing(volume);
    return;
  }
  const abs = url.startsWith("http") ? url : `${window.location.origin}${url}`;
  const a = new Audio(abs);
  a.volume = volume;
  void a.play().catch(() => playSyntheticTing(volume));
}
