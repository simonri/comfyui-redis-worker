#!/usr/bin/env bash

# Use libtcmalloc for better memory management
TCMALLOC="$(ldconfig -p | grep -Po "libtcmalloc.so.\d" | head -n 1)"
export LD_PRELOAD="${TCMALLOC}"

# Export environment variable for ComfyUI
export change_preview_method="true"

# Serve the API and don't shutdown the container
if [ "$SERVE_API_LOCALLY" == "true" ]; then
  echo "worker-comfy: Starting ComfyUI (serve api locally)"
  # exec python /comfyui/main.py --disable-auto-launch --disable-metadata --listen &
  exec python /comfyui/main.py --disable-auto-launch --disable-metadata --listen

  # echo "worker-comfy: Starting RunPod Handler"
  # python -u /rp_handler.py --rp_serve_api --rp_api_host=0.0.0.0
else
  echo "worker-comfy: Starting ComfyUI"
  python /comfyui/main.py --disable-auto-launch --disable-metadata --listen

  # echo "worker-comfy: Starting RunPod Handler"
  # python -u /rp_handler.py
fi