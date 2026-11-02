"""Chart Anything mode (chart). Implement per TASK 05."""
from backend.app.engine.modes.base import Mode, Verification


class ChartMode:
    name = "chart"
    input_schema = {
        "type": "object",
        "properties": {
            "data": {"type": "string", "title": "CSV/JSON data"},
            "request": {"type": "string", "title": "What to visualize"},
            "format": {"type": "string", "enum": ["png", "html"], "default": "png"},
        },
        "required": ["data", "request"],
    }

    def build_plan_prompt(self, task) -> str:
        raise NotImplementedError("TASK 05")

    def build_code_prompt(self, task, plan: str) -> str:
        raise NotImplementedError("TASK 05")

    def verify(self, execution) -> Verification:
        raise NotImplementedError("TASK 05")
