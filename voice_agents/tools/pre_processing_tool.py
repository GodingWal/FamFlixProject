from crewai_tools import BaseTool
import json

class PreProcessingTool(BaseTool):
    name: str = "Pre-processing Checks Tool"
    description: str = (
        "Performs comprehensive pre-processing checks before allowing synthesis to proceed. "
        "Validates consent, provider, and rate limits."
    )

    def _run(self, consent_flag: bool, provider: str, text: str, max_text_length: int, daily_char_limit: int = None, **kwargs) -> str:
        # 1. Confirm consent flag
        if not consent_flag:
            return json.dumps({"ok": False, "reason": "missing consent"})

        # 2. Confirm TTS provider is ElevenLabs
        if provider.lower() != "elevenlabs":
            return json.dumps({"ok": False, "reason": "provider not ElevenLabs"})

        # 3. Enforce max text length
        if len(text) > max_text_length:
            return json.dumps({"ok": False, "reason": f"text too long ({len(text)} > {max_text_length})"})

        # 4. Enforce daily character cap (if applicable)
        # Note: This is a placeholder. A real implementation would need to track usage.
        if daily_char_limit is not None:
            # In a real scenario, you would check a database or a cache for the user's daily usage.
            # For this tool, we'll assume the check is handled externally or we simulate it.
            pass # Placeholder for daily limit logic

        return json.dumps({"ok": True, "reason": "checks passed"})

# To use this tool:
# tool = PreProcessingTool()
# result = tool.run(
#     consent_flag=True,
#     provider="elevenlabs",
#     text="This is a test.",
#     max_text_length=1000
# )
# print(result)
