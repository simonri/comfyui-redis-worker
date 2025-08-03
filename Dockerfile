# Stage 1: Base image with common dependencies
FROM nvidia/cuda:12.4.1-cudnn-devel-ubuntu22.04 AS base

# Environment variables
ENV DEBIAN_FRONTEND=noninteractive \
    PIP_PREFER_BINARY=1 \
    PYTHONUNBUFFERED=1 \
    CMAKE_BUILD_PARALLEL_LEVEL=8 \
    PIP_NO_INPUT=1 \
    PYTHONDONTWRITEBYTECODE=1

# Install system dependencies - kept in a single RUN to reduce layers
RUN apt-get update && apt-get install -y \
    python3.11 \
    python3-pip \
    git \
    wget \
    curl \
    libgl1 \
    ffmpeg \
    libfreetype6 \
    libfreetype6-dev \
    libfontconfig1 \
    libtcmalloc-minimal4 \
    && ln -sf /usr/bin/python3.11 /usr/bin/python \
    && ln -sf /usr/bin/pip3 /usr/bin/pip \
    && apt-get autoremove -y \
    && apt-get clean -y \
    && rm -rf /var/lib/apt/lists/* \
    && rm -rf /var/cache/apt/*

# Install uv (latest) using official installer and create isolated venv
RUN wget -qO- https://astral.sh/uv/install.sh | sh \
    && ln -s /root/.local/bin/uv /usr/local/bin/uv \
    && ln -s /root/.local/bin/uvx /usr/local/bin/uvx \
    && uv venv /opt/venv

# Use the virtual environment for all subsequent commands
ENV PATH="/opt/venv/bin:${PATH}"

# Install Python dependencies (including triton moved from start.sh)
RUN uv pip install comfy-cli pip setuptools wheel triton runpod requests

# Install ComfyUI - this is a heavy step but should be cached
RUN /usr/bin/yes | comfy --workspace /comfyui install --cuda-version 12.6 --nvidia --version nightly

# Support for the network volume
COPY comfyui/extra_model_paths.yaml /comfyui/

# Add scripts - grouped to improve caching
COPY scripts/comfy-node-install.sh /usr/local/bin/comfy-node-install
COPY scripts/comfy-manager-set-mode.sh /usr/local/bin/comfy-manager-set-mode
RUN chmod +x /usr/local/bin/comfy-node-install /usr/local/bin/comfy-manager-set-mode

# Install custom nodes (moved earlier for better caching)
RUN comfy-node-install \
    comfyui_essentials \
    comfyui-videohelpersuite \
    comfyui-impact-pack \
    comfyui-frame-interpolation \
    comfyui-easy-use \
    comfyui-kjnodes \
    rgthree-comfy \
    ComfyUI-Crystools \
    comfyui-impact-subpack \
    comfyui-inpaint-cropandstitch \
    https://github.com/M1kep/ComfyLiterals \
    https://github.com/JPS-GER/ComfyUI_JPS-Nodes.git

# Set network mode to private
RUN comfy-manager-set-mode private

# Add optimized start script
COPY comfyui/start.sh /start.sh
RUN chmod +x /start.sh

# Set working directory
WORKDIR /comfyui

# Add healthcheck
HEALTHCHECK --interval=30s --timeout=30s --start-period=60s --retries=3 \
    CMD curl -f http://localhost:8188/system_stats || exit 1

# Expose port
EXPOSE 8188

# Start container
CMD ["/start.sh"]