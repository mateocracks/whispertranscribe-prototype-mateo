# Local Whisper API

Small **localhost-only** server that accepts audio uploads, runs **Whisper** on your Mac, and returns transcripts. The browser cannot run Whisper itself; this process bridges your UI to the CLI.

## Which Whisper do I have?

Run these in Terminal:

```bash
which whisper
whisper --help
```

- If `which whisper` prints a path (often inside a Python venv or conda env), you likely have **OpenAI Whisper** (`pip install openai-whisper`). Use profile **`openai`** in `whisper.config.json` (default).

If `whisper` is not found, try **whisper.cpp**:

```bash
which whisper-cli
which main
```

- **whisper.cpp** builds often expose a binary like `whisper-cli` or `main`. Flags differ from OpenAI’s CLI. Set `"profile": "whisperCpp"` in `whisper.config.json` and fill `whisperCpp.modelPath` with the path to your `.bin` model file.

## Environment overrides

| Variable | Purpose |
|----------|---------|
| `WHISPER_PROFILE` | `openai` or `whisperCpp` (overrides `profile` in JSON) |
| `WHISPER_COMMAND` | Full path or name of the binary (overrides `command` for the active profile) |
| `WHISPER_CPP_MODEL` | Path to ggml model when using whisper.cpp (overrides `modelPath`) |

The OpenAI `whisper` CLI only accepts **one** `--output_format` value (`txt`, `vtt`, `json`, `all`, …). This project uses **`all`** so you get `.json`, `.txt`, `.vtt`, and other formats in one run. If you customize `args` in `whisper.config.json`, do not pass comma-separated formats like `json,vtt,txt`—that will fail on current Whisper builds.

## Run

From the **repository root** (not inside `server/`):

```bash
npm run server
```

Default bind: `http://127.0.0.1:8787` (not reachable from other machines).

## Endpoints

- `GET /api/health` — server up, Whisper command resolution status.
- `POST /api/transcribe` — `multipart/form-data` with field `file` (audio). Optional fields: `model` (default `base`), `language` (ISO code, e.g. `en`; omit for auto-detect on OpenAI Whisper).
- `GET /api/jobs/:id` — job status, log lines, and result when `status` is `done`.

## Python venv

If Whisper only works after `source venv/bin/activate`, either:

1. Start the API from that activated shell (`npm run server`), or  
2. Set `WHISPER_COMMAND` to the full path to the venv’s `whisper` executable.

## Security

Do **not** expose this port to the internet. It runs arbitrary transcription workloads and writes temp files on your machine.
