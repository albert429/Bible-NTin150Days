export type Verse = { number: number; text: string; heading?: string };
export type Passage = {
  book: string;
  chapter: number;
  start: number;
  end: number;
  verses?: Verse[];
};
export type Day = { day: number; verseCount: number; passages: Passage[] };

// Public Scripture only. Personal progress stays in the existing storage module.
// A shared pending request survives component unmounts and React Strict Mode.
export function createReadingsClient(
  fetcher: typeof fetch = fetch,
  timeoutMs = 15000,
) {
  const cache = new Map<string, Day | Day[]>();
  const pending = new Map<string, Promise<Day | Day[]>>();
  function load(key: string): Promise<Day | Day[]> {
    const cached = cache.get(key);
    if (cached) return Promise.resolve(cached);
    const existing = pending.get(key);
    if (existing) return existing;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    const request = Promise.resolve()
      .then(async () => {
        const response = await fetcher(`/readings/${key}.json`, {
          signal: controller.signal,
        });
        if (!response.ok) throw new Error("HTTP " + response.status);
        const data = await response.json();
        const validDay = (day: Day) =>
          day && Number.isInteger(day.day) && Array.isArray(day.passages);
        if (
          key === "plan"
            ? !Array.isArray(data) ||
              data.length !== 150 ||
              !data.every(validDay)
            : !validDay(data) || data.day !== Number(key)
        )
          throw new Error("Invalid reading");
        cache.set(key, data);
        return data;
      })
      .catch(() => {
        throw new Error(
          key === "plan"
            ? "تعذر تحميل خطة القراءة. تحقق من الاتصال وحاول مرة أخرى."
            : "تعذر تحميل القراءة. تحقق من الاتصال وحاول مرة أخرى.",
        );
      })
      .finally(() => {
        clearTimeout(timeout);
        pending.delete(key);
      });
    pending.set(key, request);
    return request;
  }
  return {
    load,
    peek: (key: string) => cache.get(key),
  };
}
export const readings = createReadingsClient();
