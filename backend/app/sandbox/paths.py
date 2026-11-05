"""Shared path-safety helpers for the sandbox subsystem."""


def _safe_filename(name: str) -> str:
    if not isinstance(name, str) or not name:
        raise ValueError("empty filename")
    if "/" in name or "\\" in name:
        raise ValueError(f"unsafe filename (path separator): {name!r}")
    base = name
    if base in ("", ".", "..") or base.startswith("."):
        raise ValueError(f"unsafe filename: {name!r}")
    return base
