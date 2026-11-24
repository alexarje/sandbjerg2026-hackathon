#!/usr/bin/env bash
set -euo pipefail

project_root="$(cd "$(dirname "$0")/../.." && pwd)"
source_audio="$(mktemp --suffix=.mp3)"
mkdir -p "$project_root/presentation/audio"

"$project_root/.venv/bin/edge-tts" --voice en-GB-SoniaNeural --rate=-10% \
  --text "$(tail -n +3 "$project_root/presentation/narrative.md")" --write-media "$source_audio"
duration="$(ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "$source_audio")"
tempo="$(awk -v duration="$duration" 'BEGIN { printf "%.6f", duration / 60 }')"
ffmpeg -nostdin -y -i "$source_audio" -af "atempo=$tempo,apad,atrim=duration=60" \
  -codec:a libmp3lame -b:a 128k "$project_root/presentation/audio/narrative.mp3"