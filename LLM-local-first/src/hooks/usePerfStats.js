import { useEffect, useState } from "react";

const initialPerfStats = {
  fps: 0,
  lastLatencyMs: null,
  tokensPerSecond: null,
  generationMs: 0,
  tokensGenerated: 0,
  modelLoadProgress: 0,
  modelLoadLabel: "",
  jsHeapUsedMB: null,
  jsHeapTotalMB: null,
  storageUsedMB: null,
  storageQuotaMB: null,
};

export const usePerfStats = () => {
  const [perfStats, setPerfStats] = useState(initialPerfStats);

  useEffect(() => {
    let frame = 0;
    let last = performance.now();
    let rafId = null;

    const tick = (now) => {
      frame += 1;
      const delta = now - last;
      if (delta >= 500) {
        const fps = Math.round((frame / delta) * 1000);
        setPerfStats((prev) => ({ ...prev, fps }));
        frame = 0;
        last = now;
      }
      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);
    return () => {
      if (rafId) {
        cancelAnimationFrame(rafId);
      }
    };
  }, []);

  useEffect(() => {
    let intervalId = null;
    const poll = async () => {
      const next = {};
      if (performance && performance.memory) {
        const { usedJSHeapSize, totalJSHeapSize } = performance.memory;
        next.jsHeapUsedMB = Math.round(usedJSHeapSize / (1024 * 1024));
        next.jsHeapTotalMB = Math.round(totalJSHeapSize / (1024 * 1024));
      }
      if (navigator.storage && navigator.storage.estimate) {
        try {
          const estimate = await navigator.storage.estimate();
          if (typeof estimate.usage === "number") {
            next.storageUsedMB = Math.round(estimate.usage / (1024 * 1024));
          }
          if (typeof estimate.quota === "number") {
            next.storageQuotaMB = Math.round(estimate.quota / (1024 * 1024));
          }
        } catch (error) {
          // Ignore estimation errors.
        }
      }
      if (Object.keys(next).length) {
        setPerfStats((prev) => ({ ...prev, ...next }));
      }
    };

    intervalId = window.setInterval(poll, 1500);
    poll();
    return () => {
      if (intervalId) {
        window.clearInterval(intervalId);
      }
    };
  }, []);

  return { perfStats, setPerfStats };
};
