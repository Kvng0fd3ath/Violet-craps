/**
 * Experimental, on-device reader for two separated light dice with dark pips.
 * A suggestion only: lighting, backgrounds and camera angle can cause mistakes.
 */
export function detectDice(image: Pick<ImageData, "data" | "width" | "height">): [number, number] | null {
  const { data, width: w, height: h } = image;
  if (w < 1 || h < 1 || data.length !== w * h * 4) return null;
  const count = w * h;
  const light = new Uint8Array(count);
  const seen = new Uint8Array(count);
  for (let i = 0; i < count; i++) {
    const r = data[i * 4], g = data[i * 4 + 1], b = data[i * 4 + 2];
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    light[i] = (r + g + b) / 3 >= 150 && max - min < 75 ? 1 : 0;
  }
  const queue = new Int32Array(count);
  const boxes: { x: number; y: number; right: number; bottom: number; area: number }[] = [];
  for (let i = 0; i < count; i++) {
    if (!light[i] || seen[i]) continue;
    let head = 0, tail = 0, left = w, right = 0, top = h, bottom = 0;
    queue[tail++] = i; seen[i] = 1;
    while (head < tail) {
      const p = queue[head++], x = p % w, y = Math.floor(p / w);
      left = Math.min(left, x); right = Math.max(right, x); top = Math.min(top, y); bottom = Math.max(bottom, y);
      for (const n of [x > 0 ? p - 1 : -1, x + 1 < w ? p + 1 : -1, y > 0 ? p - w : -1, y + 1 < h ? p + w : -1]) {
        if (n >= 0 && light[n] && !seen[n]) { seen[n] = 1; queue[tail++] = n; }
      }
    }
    const bw = right - left + 1, bh = bottom - top + 1;
    if (bw < 24 || bh < 24 || bw > w * 0.6 || bh > h * 0.8 || bw / bh < 0.55 || bw / bh > 1.8 || tail / (bw * bh) < 0.32) continue;
    boxes.push({ x: left, y: top, right, bottom, area: tail });
  }
  // Ambiguous scenes should be corrected manually rather than guessed.
  if (boxes.length !== 2) return null;
  boxes.sort((a, b) => a.x - b.x);
  const values: number[] = [];
  for (const box of boxes) {
    const bw = box.right - box.x + 1, bh = box.bottom - box.y + 1;
    const visited = new Uint8Array(count);
    let pips = 0;
    for (let y = box.y; y <= box.bottom; y++) for (let x = box.x; x <= box.right; x++) {
      const i = y * w + x;
      const dark = (p: number) => (data[p * 4] + data[p * 4 + 1] + data[p * 4 + 2]) / 3 < 105;
      if (visited[i] || !dark(i)) continue;
      let head = 0, tail = 0, touchesEdge = false;
      queue[tail++] = i; visited[i] = 1;
      while (head < tail) {
        const p = queue[head++], px = p % w, py = Math.floor(p / w);
        if (px === box.x || px === box.right || py === box.y || py === box.bottom) touchesEdge = true;
        for (const n of [px > box.x ? p - 1 : -1, px < box.right ? p + 1 : -1, py > box.y ? p - w : -1, py < box.bottom ? p + w : -1]) {
          if (n >= 0 && !visited[n] && dark(n)) { visited[n] = 1; queue[tail++] = n; }
        }
      }
      const area = tail / (bw * bh);
      if (!touchesEdge && area >= 0.0015 && area <= 0.09) pips++;
    }
    if (pips < 1 || pips > 6) return null;
    values.push(pips);
  }
  return [values[0], values[1]];
}
