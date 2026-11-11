/** Wait for a new throw, then require three stable, identical readings. */
export class ScanTracker {
  private previous: Uint8Array | null = null;
  private armed = false;
  private candidate = "";
  private stable = 0;

  reset() {
    this.previous = null;
    this.armed = false;
    this.candidate = "";
    this.stable = 0;
  }

  next(image: Pick<ImageData, "data" | "width" | "height">, read: () => [number, number] | null): [number, number] | null {
    const pixels = image.width * image.height;
    // Sampling every fourth pixel makes motion checks inexpensive.
    const sample = new Uint8Array(Math.ceil(pixels / 4));
    let changed = 0;
    for (let i = 0, j = 0; i < pixels; i += 4, j++) {
      const p = i * 4;
      sample[j] = (image.data[p] + image.data[p + 1] + image.data[p + 2]) / 3;
      if (this.previous && Math.abs(sample[j] - this.previous[j]) > 30) changed++;
    }
    const moved = this.previous !== null && this.previous.length === sample.length && changed / sample.length > 0.008;
    this.previous = sample;
    if (moved) { this.armed = true; this.candidate = ""; this.stable = 0; return null; }
    if (!this.armed) return null;
    const result = read();
    if (!result) { this.candidate = ""; this.stable = 0; return null; }
    const key = result.join(",");
    this.stable = key === this.candidate ? this.stable + 1 : 1;
    this.candidate = key;
    if (this.stable < 3) return null;
    this.reset();
    return result;
  }
}
