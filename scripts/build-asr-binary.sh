#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
SCRIPT_PATH="$ROOT_DIR/electron/main/scripts/transcribe_subtitle.py"

if [[ ! -f "$SCRIPT_PATH" ]]; then
  echo "script not found: $SCRIPT_PATH" >&2
  exit 1
fi

PY_BIN="${PY_BIN:-python3}"
if ! command -v "$PY_BIN" >/dev/null 2>&1; then
  echo "python not found: $PY_BIN" >&2
  exit 1
fi

BUILD_ROOT="$(mktemp -d /tmp/eno_asr_build_XXXXXX)"
cleanup() {
  rm -rf "$BUILD_ROOT"
}
trap cleanup EXIT

"$PY_BIN" -m venv "$BUILD_ROOT/venv"
source "$BUILD_ROOT/venv/bin/activate"

pip install -U pip
pip install pyinstaller faster-whisper

PLAT="$("$PY_BIN" - <<'PY'
import platform
m = {'Darwin':'darwin', 'Linux':'linux', 'Windows':'win32'}
print(f"{m.get(platform.system(), platform.system().lower())}-{platform.machine().lower()}")
PY
)"

OUT_DIR="$ROOT_DIR/bin/asr/$PLAT"
mkdir -p "$OUT_DIR"

pyinstaller --noconfirm --onefile \
  --name transcribe-subtitle \
  --collect-data faster_whisper \
  --collect-data onnxruntime \
  --hidden-import faster_whisper.vad \
  --distpath "$OUT_DIR" \
  --workpath "$BUILD_ROOT/work" \
  --specpath "$BUILD_ROOT/spec" \
  "$SCRIPT_PATH"

if [[ "$(uname -s)" != "MINGW64_NT"* && "$(uname -s)" != "CYGWIN_NT"* ]]; then
  chmod +x "$OUT_DIR/transcribe-subtitle" || true
fi

echo "built: $OUT_DIR"
