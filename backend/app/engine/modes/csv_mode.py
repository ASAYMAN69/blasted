"""CSV Analyst mode (csv). Implement per TASK 03."""
from backend.app.engine.modes.base import Mode, Verification


class CsvMode:
    name = "csv"
    input_schema = {
        "type": "object",
        "properties": {
            "file": {"type": "string", "title": "Uploaded CSV"},
            "question": {"type": "string", "title": "Question in plain English"},
        },
        "required": ["file", "question"],
    }

    def build_plan_prompt(self, task) -> str:
        raise NotImplementedError("TASK 03")

    def build_code_prompt(self, task, plan: str) -> str:
        raise NotImplementedError("TASK 03")

    def verify(self, execution) -> Verification:
        raise NotImplementedError("TASK 03")
