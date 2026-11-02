"""Executable mode definitions. FROZEN: the base protocol + registry.

Mode implementations (csv/coder/chart/fix) live beside this file and implement `Mode`.
"""
from backend.app.engine.modes.base import Mode, Verification
from backend.app.engine.modes.csv_mode import CsvMode
from backend.app.engine.modes.coder_mode import CoderMode
from backend.app.engine.modes.chart_mode import ChartMode
from backend.app.engine.modes.fix_mode import FixMode

MODE_REGISTRY: dict[str, type[Mode]] = {
    "csv": CsvMode,
    "coder": CoderMode,
    "chart": ChartMode,
    "fix": FixMode,
}

__all__ = ["Mode", "Verification", "MODE_REGISTRY"]
