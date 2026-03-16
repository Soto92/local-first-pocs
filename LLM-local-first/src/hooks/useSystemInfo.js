import { useEffect, useState } from "react";

const initialSystemInfo = {
  userAgent: "Unknown",
  language: "Unknown",
  platform: "Unknown",
  deviceMemory: null,
  hardwareConcurrency: null,
  connection: null,
  gpu: null,
  gpuLimits: null,
};

export const useSystemInfo = () => {
  const [supportsWebGPU, setSupportsWebGPU] = useState(true);
  const [systemInfo, setSystemInfo] = useState(initialSystemInfo);

  useEffect(() => {
    setSupportsWebGPU(Boolean(navigator.gpu));
  }, []);

  useEffect(() => {
    const connection =
      navigator.connection ||
      navigator.mozConnection ||
      navigator.webkitConnection;
    setSystemInfo((prev) => ({
      ...prev,
      userAgent: navigator.userAgent ?? "Unknown",
      language: navigator.language ?? "Unknown",
      platform: navigator.platform ?? "Unknown",
      deviceMemory: navigator.deviceMemory ?? null,
      hardwareConcurrency: navigator.hardwareConcurrency ?? null,
      connection: connection
        ? {
            effectiveType: connection.effectiveType,
            downlink: connection.downlink,
            rtt: connection.rtt,
            saveData: connection.saveData,
          }
        : null,
    }));
  }, []);

  useEffect(() => {
    const loadGpuInfo = async () => {
      if (!navigator.gpu) {
        return;
      }
      try {
        const adapter = await navigator.gpu.requestAdapter();
        if (!adapter) {
          return;
        }
        const info = adapter.info || {};
        setSystemInfo((prev) => ({
          ...prev,
          gpu: {
            vendor: info.vendor ?? "Unknown",
            architecture: info.architecture ?? "Unknown",
            device: info.device ?? "Unknown",
            description: info.description ?? "Unknown",
          },
          gpuLimits: adapter.limits
            ? {
                maxBufferSize: adapter.limits.maxBufferSize,
                maxStorageBufferBindingSize:
                  adapter.limits.maxStorageBufferBindingSize,
                maxComputeWorkgroupStorageSize:
                  adapter.limits.maxComputeWorkgroupStorageSize,
              }
            : null,
        }));
      } catch (error) {
        setSystemInfo((prev) => ({ ...prev, gpu: { error: "Unavailable" } }));
      }
    };

    loadGpuInfo();
  }, []);

  return { systemInfo, supportsWebGPU };
};
