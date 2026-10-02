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

<img width="1434" height="843" alt="opencode_ollama4" src="https://github.com/user-attachments/assets/df3e5b0d-14f4-4a06-be21-8e8440f5b629" />

### The website: Bike shop

Here I ask to implement a website for me, passing some images for reference and a simple prompt:

<img width="1912" height="844" alt="input1" src="https://github.com/user-attachments/assets/9b0cc7d6-a469-4e87-8fee-01d2b1f1e5c8" />

<img width="1910" height="593" alt="input2" src="https://github.com/user-attachments/assets/f226f813-6976-462e-9992-accd0026ba7d" />

<img width="1175" height="427" alt="simple_prompt" src="https://github.com/user-attachments/assets/edc28530-8c11-4bbf-86e4-61d420119400" />

Things started working much better with LM Studio; I granted full read/write access to the system, and it built the entire site in just under two hours. My Dell G15 gaming laptop sounded like it was about to take off (loud fan noise), and here is the result:

<img width="749" height="933" alt="Captura de tela 2026-10-02 122029" src="https://github.com/user-attachments/assets/205219c4-9102-409b-8143-9319e7b480ee" />

<img width="1901" height="890" alt="result_code" src="https://github.com/user-attachments/assets/d25b77d0-24d3-497f-a1f4-e6a9d1b7fa0d" />

<img width="1899" height="942" alt="result" src="https://github.com/user-attachments/assets/e12d9b88-1fe8-46a8-be3a-06df374c20ec" />

It isn't 100% functional yet—there are several bugs, such as incorrect product searches and some UI glitches—but these are just minor tweaks I’ll need to make to get the site fully polished.
I believe that implementing a few agents and capabilities will make Gemma4 extremely powerful; plus, since everything runs locally, it’s easy for us engineers to implement tools, fine-tune the system, and so on.

