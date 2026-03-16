# Local-First LLM in the Browser

This project is a local-first LLM playground that runs entirely in the client browser. It prioritizes offline-first UX by loading a small model from the app bundle and running inference with WebGPU. The current setup uses WebLLM for text generation and serves the model files from `public/` so the app can run without external downloads.

## Demo

https://github.com/user-attachments/assets/af48a22e-288a-4b3a-8fb9-fc37067d814b

## What’s included

- React + Rsbuild + Rspack frontend
- WebLLM integration with streaming responses
- Local model assets under `public/models/`
- Simple UI for model load, prompt, and generation

## Setup

Install the dependencies:

```bash
npm install
```

## Get started

Start the dev server, and the app will be available at [http://localhost:3000](http://localhost:3000).

```bash
npm run dev
```

Build the app for production:

```bash
npm run build
```

Preview the production build locally:

```bash
npm run preview
```

## Notes on local-first LLMs

- The first load can be heavy because the model weights are large.
- WebGPU is required for best performance. Use a recent Chrome or Edge.
- Keeping models in `public/` avoids external downloads but increases repo size.

## Tradeoffs: transformers.js vs WebLLM vs llama.cpp

### transformers.js

Pros:

- Simple API and broad model support.
- Easy to integrate into frontend apps.
- Can run on CPU or WebGPU depending on backend.

Cons:

- Performance varies widely by model and backend.
- Larger models can be slow or memory-heavy in the browser.
- Some advanced features require additional setup or conversion.

### WebLLM

Pros:

- Fast inference with WebGPU.
- Optimized for in-browser LLM chat flows.
- Prebuilt model libs simplify deployment.

Cons:

- Limited to supported/converted models.
- WebGPU availability is required for best results.
- Bundling models locally increases app size.

### llama.cpp (WASM)

Pros:

- Strong GGUF ecosystem and model compatibility.
- Runs without GPU requirements (CPU-only possible).
- Useful for broad model experimentation.

Cons:

- WASM performance can be slower than WebGPU.
- Larger binary and memory footprint in the browser.
- More manual setup for quantization and model hosting.

## Models

If you want to add more MLC models for WebLLM, check the MLC model listings on Hugging Face:
[https://huggingface.co/models?library=mlc-llm](https://huggingface.co/models?library=mlc-llm)

## Learn more

- Rsbuild documentation: [https://rsbuild.rs](https://rsbuild.rs)
- Rsbuild GitHub repository: [https://github.com/web-infra-dev/rsbuild](https://github.com/web-infra-dev/rsbuild)
