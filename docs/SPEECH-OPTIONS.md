# Speech recognition options — checked 27 October 2026

The app currently uses browser speech recognition. The rounded Pip composer has an accessible microphone control and a stop state. This UI change is not a new transcription model. Microphone activation and real speech must be tested by a person in Safari; no background recording is used.

## Options worth benchmarking

- **faster-whisper, multilingual small, CPU INT8**: practical first candidate for the existing 4-vCPU, 16-GiB, no-GPU Devlab. The official README supports CPU INT8 and reports a small-model CPU benchmark around 1.5 GB RAM; that benchmark used eight i7-12700K threads, not our machine. It does not establish our latency or Hinglish accuracy. https://github.com/SYSTRAN/faster-whisper
- **whisper.cpp**: C/C++ runtime with CPU support and Apple Silicon acceleration options, suitable for testing a local Mac version. A Mac-only service would not automatically serve public hackathon users. https://github.com/ggml-org/whisper.cpp
- **Whisper large-v3-turbo**: multilingual, MIT-licensed model with fewer decoder layers than large-v3. Its model card describes a speed/quality tradeoff. Do not assume a larger model gives acceptable interactive latency on the CPU-only Devlab. https://huggingface.co/openai/whisper-large-v3-turbo

## Before switching

Use consented sample clips: English with Indian accents, Hindi/English switching, filler words, pauses, technical terms, names, dates and corrections. Measure cold/warm latency, peak memory, errors in dates/names, silent-audio hallucinations and concurrent requests on our actual machine. Use speech detection and duration/size limits; keep the unedited transcript available. Optional cleanup must preserve meaning, uncertainty and dates, never rewrite a student's intent. Show editable text before sending or saving. No model guarantees correct interpretation of mispronunciation.

A self-hosted model avoids per-transcription API charges, but downloads, storage and compute still use resources. Integration needs an authenticated bounded upload endpoint, supported Safari recording format, a private worker, temporary-audio deletion and honest fallback. It is a separate remaining milestone, not an installed or benchmarked capability.
