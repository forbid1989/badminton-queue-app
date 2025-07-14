export function getTimeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  const intervals: [number, string][] = [
    [60, "second"],
    [60, "minute"],
    [24, "hour"],
    [30, "day"],
    [12, "month"],
    [Infinity, "year"],
  ];

  let time = seconds;
  let unit = "second";

  for (const [threshold, nextUnit] of intervals) {
    if (time < threshold) break;
    time = Math.floor(time / threshold);
    unit = nextUnit;
  }

  return `${time} ${unit}${time !== 1 ? "s" : ""} ago`;
}
