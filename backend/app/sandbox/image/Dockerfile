FROM python:3.11-slim

# Base image for sandboxed task execution (non-root, no network, read-only rootfs).
WORKDIR /workspace

COPY requirements.txt /tmp/requirements.txt
RUN pip install --no-cache-dir -r /tmp/requirements.txt \
    && useradd --create-home --shell /usr/sbin/nologin runner

USER runner

# The runner script is injected per-task by SandboxManager; keep an entrypoint that
# executes the submitted script in a controlled way.
ENTRYPOINT ["python", "-u", "/workspace/task.py"]
