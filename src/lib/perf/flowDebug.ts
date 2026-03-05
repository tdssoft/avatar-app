const isDev = import.meta.env.DEV;

let requestCount = 0;
let minuteWindowStart = Date.now();

export const flowDebugStart = (label: string) => {
  if (!isDev) return 0;
  requestCount += 1;

  const now = Date.now();
  if (now - minuteWindowStart >= 60_000) {
    console.groupCollapsed("[flowDebug] requests/min");
    console.info(`flow refresh requests in previous minute: ${requestCount}`);
    console.groupEnd();
    minuteWindowStart = now;
    requestCount = 1;
  }

  return performance.now();
};

export const flowDebugEnd = (label: string, startMark: number) => {
  if (!isDev || !startMark) return;
  const durationMs = Math.round(performance.now() - startMark);
  console.info(`[flowDebug] ${label} finished in ${durationMs}ms`);
};

