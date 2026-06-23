/**
 * Runs `fn` over `items` with at most `concurrency` in flight at once.
 * Used for the inline campaign-send path so 200 sequential Resend API
 * calls (each a network round trip) don't turn into a multi-minute loop
 * that risks hitting a serverless function's execution time limit.
 */
export async function mapWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  fn: (item: T) => Promise<R>
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let nextIndex = 0;

  async function worker() {
    while (true) {
      const current = nextIndex++;
      if (current >= items.length) return;
      results[current] = await fn(items[current]);
    }
  }

  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, worker));
  return results;
}
