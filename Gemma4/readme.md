# Testing Gemma 4 locally

Google Gemma 4 is a family of open artificial intelligence models designed to run locally with full privacy, efficiency, and multimodal support (text, image, and audio in smaller sizes).
Sizes and Hardware Requirements

• E2B / E4B: Edge models for mobile phones, IoT devices, and entry-level PCs; require 5 GB of RAM or more.
• 12B: Mid-range model ideal for standard laptops with 16 GB of RAM.
• 26B (MoE): Mixture of Experts model optimized for desktops with 16–20 GB of RAM or a dedicated GPU.
• ​​31B: The most advanced flagship version, requiring at least 20 GB of RAM or a powerful dedicated GPU.

Here in this POC I am testing the 12B model

## Setup

1. Download and install [Ollama](https://ollama.com/download) for Windows, macOS, or Linux.
2. Open your system's terminal or command prompt.
3. Download and run the default model by typing:

```
ollama run gemma4
```

4. To download a specific version (such as the 31B variant), use:

```
ollama run gemma4:31b
```

## My test results, perceptions and conclusions:

The model works well using just Ollama, but for basic tasks—such as reading or writing files—the raw model falls short; it simply answers your questions. If you want it to access the file system, you need to use an orchestrator with agents and scripts, such as Claude, OpenCode, or LM Studio by Bionic.

Another failure was using the VS Code "Continue" extension; the files ended up with a lot of strange symbols in the code (with absolutely no formatting:

```
"conts mock: { key: "/bike")
```

I noticed that OpenCode works and responds to simple queries, but it freezes up when I ask it to implement something; I don't think OpenCode is very good for running local models—it seems to handle too many tasks simultaneously, consuming a lot of GPU and RAM.

Things started working much better with LM Studio; I granted full read/write access to the system, and it built the entire site in just under two hours. My Dell G15 gaming laptop sounded like it was about to take off (loud fan noise), and here is the result:
