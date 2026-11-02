"""File Fixer mode (fix, light). Implement per TASK 06."""
from backend.app.engine.modes.base import Mode, Verification


class FixMode:
    name = "fix"
    input_schema = {
        "type": "object",
        "properties": {
            "file": {"type": "string", "title": "File to fix"},
            "error": {"type": ["string", "null"], "title": "Observed error"},
            "desired": {"type": "string", "title": "Desired behavior"},
        },
        "required": ["file", "desired"],
    }

    def build_plan_prompt(self, task) -> str:
        raise NotImplementedError("TASK 06")

    def build_code_prompt(self, task, plan: str) -> str:
        raise NotImplementedError("TASK 06")

    def verify(self, execution) -> Verification:
        raise NotImplementedError("TASK 06")
