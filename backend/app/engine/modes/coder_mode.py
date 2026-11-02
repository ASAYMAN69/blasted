"""Code Reviewer / Self-Healing Runner mode (coder). Implement per TASK 04."""
from backend.app.engine.modes.base import Mode, Verification


class CoderMode:
    name = "coder"
    input_schema = {
        "type": "object",
        "properties": {
            "file": {"type": "string", "title": "Source file"},
            "test": {"type": ["string", "null"], "title": "Test file (optional)"},
            "goal": {"type": "string", "title": "Expected behavior"},
        },
        "required": ["file", "goal"],
    }

    def build_plan_prompt(self, task) -> str:
        raise NotImplementedError("TASK 04")

    def build_code_prompt(self, task, plan: str) -> str:
        raise NotImplementedError("TASK 04")

    def verify(self, execution) -> Verification:
        raise NotImplementedError("TASK 04")
