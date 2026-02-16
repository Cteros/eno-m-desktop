#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import json
import os
import sys
import tempfile
import traceback
import urllib.request
import argparse
import multiprocessing
import re
from pathlib import Path


def log(message: str):
    print(f"[subtitle] {message}", file=sys.stderr, flush=True)


def zh_ratio(text: str) -> float:
    if not text:
        return 0.0
    zh = len(re.findall(r"[\u4e00-\u9fff]", text))
    return zh / max(1, len(text))


def download_audio(url: str, dest_path: str):
    req = urllib.request.Request(
        url,
        headers={
            "User-Agent": "Mozilla/5.0",
            "Referer": "https://www.bilibili.com/",
        },
    )
    with urllib.request.urlopen(req, timeout=120) as resp:
        with open(dest_path, "wb") as f:
            f.write(resp.read())

def resolve_model_repo(model_name: str) -> str:
    name = (model_name or "").strip()
    mapping = {
        "large-v3": "Systran/faster-whisper-large-v3",
        "distil-large-v3": "Systran/faster-distil-whisper-large-v3",
        "medium": "Systran/faster-whisper-medium",
        "small": "Systran/faster-whisper-small",
    }
    return mapping.get(name, name)


def ensure_local_model(model_name: str, model_root: str):
    repo_id = resolve_model_repo(model_name)
    model_root_path = Path(model_root).expanduser().resolve()
    model_root_path.mkdir(parents=True, exist_ok=True)

    # 模型目录按 repo 名隔离，避免冲突
    safe_name = repo_id.replace("/", "__")
    local_dir = model_root_path / safe_name

    if local_dir.exists() and any(local_dir.iterdir()):
        log(f"use local model: {local_dir}")
        return str(local_dir)

    log(f"downloading model to local: {local_dir}")
    from huggingface_hub import snapshot_download  # type: ignore
    snapshot_download(
        repo_id=repo_id,
        local_dir=str(local_dir),
        local_dir_use_symlinks=False,
        resume_download=True,
    )
    log("model download completed")
    return str(local_dir)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--input", dest="input_path", default="", help="JSON payload file path")
    args, _unknown = parser.parse_known_args()

    raw = ""
    if args.input_path:
        with open(args.input_path, "r", encoding="utf-8") as f:
            raw = f.read().strip()
    else:
        try:
            raw = sys.stdin.read().strip()
        except Exception:
            raw = ""

    if not raw:
        print(json.dumps({"success": False, "error": "empty payload"}, ensure_ascii=False))
        return

    payload = json.loads(raw)

    song_id = str(payload.get("song_id") or "").strip()
    audio_url = str(payload.get("audio_url") or "").strip()
    language = str(payload.get("language") or "zh").strip() or "zh"
    model_name = str(payload.get("model") or "distil-large-v3").strip() or "distil-large-v3"
    device = str(payload.get("device") or "auto").strip() or "auto"
    compute_type = str(payload.get("compute_type") or "int8").strip() or "int8"
    model_root = str(payload.get("model_root") or "").strip()

    if not song_id:
        print(json.dumps({"success": False, "error": "song_id is required"}, ensure_ascii=False))
        return
    if not audio_url:
        print(json.dumps({"success": False, "error": "audio_url is required"}, ensure_ascii=False))
        return
    log(f"request song_id={song_id} model={model_name} language={language}")

    tmp_path = ""
    try:
        with tempfile.NamedTemporaryFile(prefix="eno_subtitle_", suffix=".m4s", delete=False) as tmp:
            tmp_path = tmp.name
        log("downloading audio...")
        download_audio(audio_url, tmp_path)
        log("audio downloaded, start transcribing...")
        from faster_whisper import WhisperModel  # type: ignore
        model_path_or_name = model_name
        if model_root:
            try:
                model_path_or_name = ensure_local_model(model_name, model_root)
            except Exception as model_err:
                log(f"local model prepare failed, fallback to hub name: {model_err}")
                model_path_or_name = model_name

        model = WhisperModel(model_path_or_name, device=device, compute_type=compute_type)
        def run_transcribe(vad_filter: bool, force_zh_prompt: bool):
            kwargs = {
                "language": language,
                "task": "transcribe",
                "vad_filter": vad_filter,
                "beam_size": 1,
                "word_timestamps": False,
                "condition_on_previous_text": False,
            }
            if force_zh_prompt and language.startswith("zh"):
                kwargs["initial_prompt"] = "以下是中文歌曲歌词，请按中文转写。"
            return model.transcribe(
                tmp_path,
                **kwargs,
            )

        try:
            # 歌词场景默认关闭 VAD，避免切分过碎影响识别
            segments, info = run_transcribe(vad_filter=False, force_zh_prompt=False)
        except Exception as vad_err:
            message = str(vad_err)
            if "silero_vad_v6.onnx" in message or "NO_SUCHFILE" in message:
                log("vad model missing, fallback to vad_filter=False")
                segments, info = run_transcribe(vad_filter=False, force_zh_prompt=False)
            else:
                raise
        total = float(getattr(info, "duration", 0) or 0)
        lines = []
        last_percent = -1
        for seg in segments:
            text = (seg.text or "").strip()
            start = float(getattr(seg, "start", 0) or 0)
            end = float(getattr(seg, "end", 0) or 0)
            if text and end > start:
                lines.append({
                    "from": start,
                    "to": end,
                    "content": text,
                })
            if total > 0:
                percent = int(min(100, max(0, (end / total) * 100)))
                if percent >= last_percent + 5:
                    log(f"transcribing... {percent}%")
                    last_percent = percent

        # 中文场景下英文/乱码概率高时，带中文提示词再重试一次
        merged_text = "".join(item.get("content", "") for item in lines)
        ratio = zh_ratio(merged_text)
        if language.startswith("zh") and lines and ratio < 0.15:
            log(f"low zh ratio ({ratio:.2f}), retry with zh prompt")
            segments2, _info2 = run_transcribe(vad_filter=False, force_zh_prompt=True)
            lines2 = []
            for seg in segments2:
                text = (seg.text or "").strip()
                start = float(getattr(seg, "start", 0) or 0)
                end = float(getattr(seg, "end", 0) or 0)
                if text and end > start:
                    lines2.append({
                        "from": start,
                        "to": end,
                        "content": text,
                    })
            merged_text2 = "".join(item.get("content", "") for item in lines2)
            ratio2 = zh_ratio(merged_text2)
            log(f"retry zh ratio={ratio2:.2f}")
            if ratio2 > ratio:
                lines = lines2
                log("use retry result")
                ratio = ratio2

        # 中文任务的兜底门槛：占比过低视为失败，避免写入错误缓存
        if language.startswith("zh"):
            final_text = "".join(item.get("content", "") for item in lines)
            final_ratio = zh_ratio(final_text)
            if final_ratio < 0.15:
                log(f"final zh ratio too low ({final_ratio:.2f}), skip cache")
                print(json.dumps({
                    "success": False,
                    "error": "识别结果非中文（可能是英文/日文歌曲或人声过弱），建议切换模型或关闭中文强制模式",
                }, ensure_ascii=False))
                return

        log("transcribe finished")
        log(f"done lines={len(lines)}")
        print(json.dumps({"success": True, "lines": lines}, ensure_ascii=False))
    except Exception as e:
        print(
            json.dumps(
                {
                    "success": False,
                    "error": str(e),
                    "trace": traceback.format_exc(limit=2),
                },
                ensure_ascii=False,
            )
        )
    finally:
        try:
            if tmp_path and os.path.exists(tmp_path):
                os.remove(tmp_path)
        except Exception:
            pass


if __name__ == "__main__":
    multiprocessing.freeze_support()
    main()
