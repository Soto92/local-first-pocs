import { useRef, useState } from "react";
import { CreateMLCEngine } from "@mlc-ai/web-llm";
import "./App.css";
import { DEFAULT_PROMPT, MODELS } from "./constants";
import { useConversations } from "./hooks/useConversations";
import { usePerfStats } from "./hooks/usePerfStats";
import { useSystemInfo } from "./hooks/useSystemInfo";

const App = () => {
  const engineRef = useRef(null);
  const [modelId, setModelId] = useState(MODELS[0].id);
  const [loadedModelId, setLoadedModelId] = useState(null);
  const [status, setStatus] = useState("Ready to load a model.");
  const [isLoading, setIsLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [prompt, setPrompt] = useState(DEFAULT_PROMPT);
  const [systemInfoOpen, setSystemInfoOpen] = useState(false);
  const { systemInfo, supportsWebGPU } = useSystemInfo();
  const { perfStats, setPerfStats } = usePerfStats();
  const {
    conversations,
    activeConversationId,
    setActiveConversationId,
    activeConversation,
    startNewConversation,
    appendMessage,
    updateLastAssistantMessage,
    clearConversation,
  } = useConversations();

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

  const handleClearConversation = () => {
    clearConversation();
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
            onClick={() => {
              startNewConversation();
              setPrompt("");
            }}
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
            onClick={handleClearConversation}
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
