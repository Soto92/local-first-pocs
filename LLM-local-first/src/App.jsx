import { useEffect, useRef, useState } from "react";
import { CreateMLCEngine } from "@mlc-ai/web-llm";
import "./App.css";

const MODELS = [
  {
    id: "Llama-3.2-1B-Instruct-q4f16_1-MLC",
    label: "Llama 3.2 1B Instruct (q4f16_1)",
  },
  {
    id: "Llama-3.2-1B-Instruct-q4f32_1-MLC",
    label: "Llama 3.2 1B Instruct (q4f32_1)",
  },
];

const DEFAULT_PROMPT =
  "Explain in 3 bullet points what a local-first app means on the frontend.";

const createId = () => {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `chat-${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

const createConversation = () => ({
  id: createId(),
  title: "New chat",
  messages: [],
});

const STORAGE_KEY = "localchat:v1";

const readStoredState = () => {
  try {
    if (typeof window === "undefined") {
      return null;
    }
    const stored = window.localStorage?.getItem(STORAGE_KEY);
    if (!stored) {
      return null;
    }
    const parsed = JSON.parse(stored);
    if (
      parsed &&
      Array.isArray(parsed.conversations) &&
      parsed.conversations.length > 0
    ) {
      return parsed;
    }
  } catch (error) {
    // Ignore invalid storage.
  }
  return null;
};

const App = () => {
  const engineRef = useRef(null);
  const initialConversationRef = useRef(null);
  const storedStateRef = useRef(null);

  if (!initialConversationRef.current) {
    initialConversationRef.current = createConversation();
  }
  if (storedStateRef.current === null) {
    storedStateRef.current = readStoredState();
  }

  const storedState = storedStateRef.current;

  const [modelId, setModelId] = useState(MODELS[0].id);
  const [loadedModelId, setLoadedModelId] = useState(null);
  const [supportsWebGPU, setSupportsWebGPU] = useState(true);
  const [status, setStatus] = useState("Ready to load a model.");
  const [isLoading, setIsLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [prompt, setPrompt] = useState(DEFAULT_PROMPT);
  const [systemInfoOpen, setSystemInfoOpen] = useState(false);
  const [systemInfo, setSystemInfo] = useState({
    userAgent: "Unknown",
    language: "Unknown",
    platform: "Unknown",
    deviceMemory: null,
    hardwareConcurrency: null,
    connection: null,
    gpu: null,
    gpuLimits: null,
  });
  const [perfStats, setPerfStats] = useState({
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
  });
  const [conversations, setConversations] = useState(() =>
    storedState?.conversations?.length
      ? storedState.conversations
      : [initialConversationRef.current],
  );
  const [activeConversationId, setActiveConversationId] = useState(() => {
    if (storedState?.conversations?.length) {
      return storedState.activeConversationId || storedState.conversations[0].id;
    }
    return initialConversationRef.current.id;
  });

  useEffect(() => {
    setSupportsWebGPU(Boolean(navigator.gpu));
  }, []);

  useEffect(() => {
    try {
      const payload = JSON.stringify({
        conversations,
        activeConversationId,
      });
      window.localStorage?.setItem(STORAGE_KEY, payload);
    } catch (error) {
      // Ignore storage errors (quota, privacy mode, etc.)
    }
  }, [conversations, activeConversationId]);

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

  const handleModelChange = (event) => {
    const nextModel = event.target.value;
    setModelId(nextModel);
    if (loadedModelId && loadedModelId !== nextModel) {
      engineRef.current = null;
      setLoadedModelId(null);
      setStatus("Model changed. Load again to use it.");
    }
  };

  const loadModel = async () => {
    if (!supportsWebGPU) {
      setStatus("WebGPU is not available in this browser.");
      return;
    }

    if (isLoading) {
      return;
    }

    setIsLoading(true);
    setStatus("Downloading model and preparing engine...");
    setPerfStats((prev) => ({
      ...prev,
      modelLoadProgress: 0,
      modelLoadLabel: "Starting...",
    }));

    try {
      const engine = await CreateMLCEngine(modelId, {
        initProgressCallback: (progress) => {
          const label = progress?.text ?? "Loading...";
          const pct =
            typeof progress?.progress === "number"
              ? ` ${Math.round(progress.progress * 100)}%`
              : "";
          setStatus(`${label}${pct}`);
          setPerfStats((prev) => ({
            ...prev,
            modelLoadProgress:
              typeof progress?.progress === "number" ? progress.progress : 0,
            modelLoadLabel: label,
          }));
        },
      });

      engineRef.current = engine;
      setLoadedModelId(modelId);
      setStatus("Model loaded. Ready to generate.");
      setPerfStats((prev) => ({
        ...prev,
        modelLoadProgress: 1,
        modelLoadLabel: "Complete",
      }));
    } catch (error) {
      const message = error?.message ?? "Failed to load model.";
      setStatus(`Error: ${message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const activeConversation = conversations.find(
    (conversation) => conversation.id === activeConversationId,
  );

  const updateConversation = (conversationId, updater) => {
    setConversations((prev) =>
      prev.map((conversation) =>
        conversation.id === conversationId
          ? updater(conversation)
          : conversation,
      ),
    );
  };

  const startNewConversation = () => {
    const next = createConversation();
    setConversations((prev) => [next, ...prev]);
    setActiveConversationId(next.id);
    setPrompt("");
  };

  const appendMessage = (conversationId, message) => {
    updateConversation(conversationId, (conversation) => {
      const nextMessages = [...conversation.messages, message];
      const nextTitle =
        conversation.title === "New chat" && message.role === "user"
          ? message.content.slice(0, 32)
          : conversation.title;
      return { ...conversation, messages: nextMessages, title: nextTitle };
    });
  };

  const updateLastAssistantMessage = (conversationId, content) => {
    updateConversation(conversationId, (conversation) => {
      const nextMessages = [...conversation.messages];
      if (nextMessages.length === 0) {
        return conversation;
      }
      const lastIndex = nextMessages.length - 1;
      nextMessages[lastIndex] = {
        ...nextMessages[lastIndex],
        content,
      };
      return { ...conversation, messages: nextMessages };
    });
  };

  const generate = async () => {
    if (!activeConversation) {
      setStatus("Create a chat to start.");
      return;
    }

    if (!engineRef.current) {
      setStatus("Load a model before generating.");
      return;
    }

    if (!prompt.trim()) {
      setStatus("Write a prompt before generating.");
      return;
    }

    setIsGenerating(true);
    setStatus("Generating response...");
    const generationStart = performance.now();
    let firstTokenAt = null;
    let tokenCount = 0;
    setPerfStats((prev) => ({
      ...prev,
      generationMs: 0,
      tokensGenerated: 0,
    }));
    const userMessage = {
      role: "user",
      content: prompt.trim(),
    };
    appendMessage(activeConversation.id, userMessage);
    appendMessage(activeConversation.id, {
      role: "assistant",
      content: "",
    });
    setPrompt("");

    try {
      const conversationMessages = [
        {
          role: "system",
          content: "You are a concise and helpful assistant. Reply in English.",
        },
        ...activeConversation.messages,
        userMessage,
      ];
      const stream = await engineRef.current.chat.completions.create({
        messages: conversationMessages,
        temperature: 0.7,
        stream: true,
      });

      let answer = "";
      for await (const chunk of stream) {
        const delta = chunk.choices?.[0]?.delta?.content ?? "";
        if (delta) {
          tokenCount += delta.trim().length
            ? delta.trim().split(/\s+/).length
            : 0;
        }
        if (!firstTokenAt && delta) {
          firstTokenAt = performance.now();
          setPerfStats((prev) => ({
            ...prev,
            lastLatencyMs: Math.round(firstTokenAt - generationStart),
          }));
        }
        answer += delta;
        setPerfStats((prev) => ({
          ...prev,
          tokensGenerated: tokenCount,
          generationMs: Math.round(performance.now() - generationStart),
        }));
        updateLastAssistantMessage(activeConversation.id, answer);
      }

      const totalMs = performance.now() - generationStart;
      const tps = totalMs > 0 ? (tokenCount / totalMs) * 1000 : null;
      setPerfStats((prev) => ({
        ...prev,
        tokensPerSecond: tps ? Math.round(tps * 10) / 10 : prev.tokensPerSecond,
      }));
      setStatus("Done.");
    } catch (error) {
      const message = error?.message ?? "Failed to generate.";
      setStatus(`Error: ${message}`);
    } finally {
      setIsGenerating(false);
    }
  };

  const clearConversation = () => {
    if (!activeConversation) {
      return;
    }
    updateConversation(activeConversation.id, (conversation) => ({
      ...conversation,
      title: "New chat",
      messages: [],
    }));
    setStatus("Cleared. Ready to generate.");
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    if (!isGenerating) {
      generate();
    }
  };

  const handleComposerKeyDown = (event) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      if (!isGenerating) {
        generate();
      }
    }
  };

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-name">LocalChat</div>
          <span className="brand-tag">Local-first LLM</span>
        </div>

        <div className="sidebar-block">
          <label className="field">
            <span>Model</span>
            <select value={modelId} onChange={handleModelChange}>
              {MODELS.map((model) => (
                <option key={model.id} value={model.id}>
                  {model.label}
                </option>
              ))}
            </select>
          </label>

          <button
            className="primary"
            type="button"
            onClick={loadModel}
            disabled={isLoading || isGenerating}
          >
            {loadedModelId === modelId ? "Reload model" : "Load model"}
          </button>

          <div className="status">
            <span className="dot" aria-hidden="true" />
            <span>{status}</span>
          </div>

          <button
            type="button"
            className="link-button"
            onClick={() => setSystemInfoOpen((prev) => !prev)}
          >
            {systemInfoOpen ? "Hide system infos" : "System infos"}
          </button>

          {systemInfoOpen && (
            <div className="system-panel">
              <div className="system-grid">
                <div>
                  <span className="system-label">Network</span>
                  <div className="system-value">
                    {systemInfo.connection
                      ? `${systemInfo.connection.effectiveType ?? "Unknown"} · ${
                          systemInfo.connection.downlink ?? "?"
                        } Mbps · ${systemInfo.connection.rtt ?? "?"} ms`
                      : "Unknown"}
                  </div>
                </div>
                <div>
                  <span className="system-label">GPU</span>
                  <div className="system-value">
                    {systemInfo.gpu
                      ? systemInfo.gpu.description ||
                        `${systemInfo.gpu.vendor ?? ""} ${
                          systemInfo.gpu.device ?? ""
                        }`.trim() ||
                        "Unknown"
                      : "Unknown"}
                  </div>
                </div>
                <div>
                  <span className="system-label">WebGPU Memory</span>
                  <div className="system-value">
                    Not exposed (using limits below)
                  </div>
                </div>
                <div>
                  <span className="system-label">Max Buffer</span>
                  <div className="system-value">
                    {systemInfo.gpuLimits?.maxBufferSize
                      ? `${Math.round(
                          systemInfo.gpuLimits.maxBufferSize / (1024 * 1024),
                        )} MB`
                      : "Unknown"}
                  </div>
                </div>
                <div>
                  <span className="system-label">Max Storage Buffer</span>
                  <div className="system-value">
                    {systemInfo.gpuLimits?.maxStorageBufferBindingSize
                      ? `${Math.round(
                          systemInfo.gpuLimits.maxStorageBufferBindingSize /
                            (1024 * 1024),
                        )} MB`
                      : "Unknown"}
                  </div>
                </div>
              </div>
              <div className="system-meta">
                <span className="system-label">User Agent</span>
                <div className="system-value system-wrap">
                  {systemInfo.userAgent}
                </div>
              </div>
              <div className="system-metrics">
                <div>
                  <span className="system-label">FPS</span>
                  <div className="system-value">{perfStats.fps}</div>
                </div>
                <div>
                  <span className="system-label">Latency (ms)</span>
                  <div className="system-value">
                    {perfStats.lastLatencyMs ?? "—"}
                  </div>
                </div>
                <div>
                  <span className="system-label">Tokens / sec</span>
                  <div className="system-value">
                    {perfStats.tokensPerSecond ?? "—"}
                  </div>
                </div>
                <div>
                  <span className="system-label">Gen Time (ms)</span>
                  <div className="system-value">{perfStats.generationMs}</div>
                </div>
                <div>
                  <span className="system-label">Tokens Gen</span>
                  <div className="system-value">
                    {perfStats.tokensGenerated}
                  </div>
                </div>
                <div>
                  <span className="system-label">Model Load</span>
                  <div className="system-value">
                    {perfStats.modelLoadLabel
                      ? `${perfStats.modelLoadLabel} ${
                          Math.round(perfStats.modelLoadProgress * 100) || 0
                        }%`
                      : "—"}
                  </div>
                </div>
                <div>
                  <span className="system-label">JS Heap (MB)</span>
                  <div className="system-value">
                    {perfStats.jsHeapUsedMB ?? "—"} /
                    {perfStats.jsHeapTotalMB ?? "—"}
                  </div>
                </div>
                <div>
                  <span className="system-label">Storage (MB)</span>
                  <div className="system-value">
                    {perfStats.storageUsedMB ?? "—"} /
                    {perfStats.storageQuotaMB ?? "—"}
                  </div>
                </div>
              </div>
            </div>
          )}

          {!supportsWebGPU && (
            <p className="warning">
              This browser does not support WebGPU. Use a recent Chrome or Edge.
            </p>
          )}
        </div>

        <div className="sidebar-block">
          <button
            type="button"
            className="ghost"
            onClick={startNewConversation}
          >
            New chat
          </button>

          <div className="conversation-list">
            {conversations.length === 0 && (
              <p className="conversation-empty">No conversations yet.</p>
            )}
            {conversations.map((conversation) => (
              <button
                key={conversation.id}
                type="button"
                className={
                  conversation.id === activeConversationId
                    ? "conversation-item active"
                    : "conversation-item"
                }
                onClick={() => setActiveConversationId(conversation.id)}
              >
                <span>{conversation.title}</span>
                <small>{conversation.messages.length} messages</small>
              </button>
            ))}
          </div>
        </div>
      </aside>

      <main className="chat">
        <header className="chat-header">
          <div>
            <h1>{activeConversation?.title ?? "New chat"}</h1>
            <p>Chat locally with your chosen model.</p>
          </div>
          <button
            type="button"
            className="ghost"
            onClick={clearConversation}
            disabled={!activeConversation || isGenerating}
          >
            Clear chat
          </button>
        </header>

        <div className="messages">
          {(activeConversation?.messages ?? []).map((message, index) => (
            <div
              key={`${message.role}-${index}`}
              className={
                message.role === "user" ? "message user" : "message assistant"
              }
            >
              <div className="bubble">{message.content || "..."}</div>
            </div>
          ))}
          {(activeConversation?.messages ?? []).length === 0 && (
            <div className="messages-empty">
              Start a conversation by sending a prompt.
            </div>
          )}
        </div>

        <form className="composer" onSubmit={handleSubmit}>
          <textarea
            value={prompt}
            onChange={(event) => setPrompt(event.target.value)}
            onKeyDown={handleComposerKeyDown}
            rows={3}
            placeholder="Send a message..."
          />
          <button
            type="submit"
            className="primary"
            disabled={isLoading || isGenerating || !loadedModelId}
          >
            {isGenerating ? "Generating..." : "Send"}
          </button>
        </form>
      </main>
    </div>
  );
};

export default App;
