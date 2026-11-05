"""Executable mode definitions. Base protocol + registry.

Mode implementations (csv/coder/chart/fix/vector*) live beside this file and
implement `Mode` or `PipelineMode`.
"""
from backend.app.engine.modes.base import Mode, Verification
from backend.app.engine.modes.chart_mode import ChartMode
from backend.app.engine.modes.coder_mode import CoderMode
from backend.app.engine.modes.csv_mode import CsvMode
from backend.app.engine.modes.fix_mode import FixMode
from backend.app.engine.modes.vector1 import Vector1Mode
from backend.app.engine.modes.vector3 import Vector3Mode
from backend.app.engine.modes.vector4 import Vector4Mode
from backend.app.engine.modes.vector5 import Vector5Mode
from backend.app.engine.modes.vector6 import Vector6Mode

MODE_REGISTRY: dict[str, type[Mode]] = {
    "csv": CsvMode,
    "coder": CoderMode,
    "chart": ChartMode,
    "fix": FixMode,
    "data-analyst": Vector1Mode,
    "invoice-reconciler": Vector3Mode,
    "research-synthesizer": Vector4Mode,
    "incident-investigator": Vector5Mode,
    "data-pipeline": Vector6Mode,
}

__all__ = ["Mode", "Verification", "MODE_REGISTRY"]
