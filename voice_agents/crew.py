from crewai import Agent, Task, Crew
import yaml
import os
from .tools import ElevenLabsTool, AudioProcessingTool, QualityControlTool


AUDIO_ENGINEER_PROMPT = (
    "Provider lock: This pipeline is ElevenLabs-only for TTS/cloning. Do not invoke or suggest any other TTS providers.\n\n"
    "Inputs: raw_audio_path (wav/mp3/etc).\n\n"
    "Steps:\n"
    "- Resample to 16 kHz mono if needed.\n"
    "- VAD trim long silences (e.g., Silero VAD) while preserving natural micro-pauses.\n"
    "- Light denoise (do not over-suppress; avoid metallic artifacts).\n"
    "- Loudness normalize to about −20 LUFS (true peak ≤ −2 dBFS).\n"
    "- Diarize and keep the dominant speaker only (merge their segments in timestamp order).\n"
    "- Export a single WAV file at 16 kHz mono.\n\n"
    "Quality bar (must pass):\n"
    "- No clipping, no music/FX, no other speakers.\n"
    "- Background noise minimized; speech intelligible.\n"
    "- Consistent loudness across the file.\n\n"
    "If input is unusable: Return a clear error with brief reason (e.g., ‘multi-speaker overlap everywhere’, ‘<10s usable speech’).\n\n"
    "Output (strict): Return only a JSON object: {\"clean_wav_path\": \"/abs/path/to/cleaned_single_speaker.wav\"}"
)

SYNTHESIS_SPECIALIST_PROMPT = (
    "Provider lock: Use ElevenLabs API only for TTS/synthesis.\n\n"
    "Inputs: voice_id, text, mode, defaults { stability, dialogue_stability, similarity_boost, style, speed }.\n\n"
    "Initial settings: if mode == dialogue use dialogue_stability, else stability.\n"
    "Use provided similarity_boost, style, speed.\n\n"
    "Generation rules:\n"
    "- Keep timbre close to reference.\n"
    "- Respect punctuation; split very long text into sentence-sized chunks.\n"
    "- Never leak raw API responses; return only audio result path and settings used.\n"
    "- Cache: if (voice_id, text, settings) seen, return cached path.\n"
    "- On QC retry: adjust only requested knobs within caps.\n\n"
    "Output (strict): {\n  \"gen_wav_path\": \"/abs/path/to/generated.wav\",\n  \"settings_used\": {\n    \"stability\": 0.55,\n    \"similarity_boost\": 0.7,\n    \"style\": 0.0,\n    \"speed\": 1.0\n  },\n  \"was_cached\": false\n}"
)

QC_LISTENER_PROMPT = (
    "Inputs: text, gen_wav_path, ref_voice_wav, gates { max_wer, min_cosine }, retry caps { stability_cap, similarity_cap, cosine_bump_stability, cosine_bump_similarity }.\n\n"
    "Checks: ASR WER vs text; speaker similarity cosine(ref, gen).\n\n"
    "Decision: PASS if WER ≤ max_wer AND cosine ≥ min_cosine.\n"
    "Else, if no prior retry: request ONE retry with bumps within caps.\n\n"
    "Output (strict): {\n  \"decision\": \"pass\",\n  \"metrics\": { \"wer\": 0.06, \"speaker_cosine\": 0.88, \"transcript\": \"...\" },\n  \"final_wav_path\": \"/abs/path/to/accepted.wav\",\n  \"retries_used\": 0,\n  \"notes\": \"short rationale\"\n}"
)


def build_voice_crew(context: dict) -> Crew:
    # If YAML configs exist, prefer them
    config_dir = os.path.join(os.path.dirname(__file__), 'config')
    agents_yml = os.path.join(config_dir, 'agents.yaml')
    tasks_yml = os.path.join(config_dir, 'tasks.yaml')
    agents_cfg = None
    tasks_cfg = None
    if os.path.exists(agents_yml):
        with open(agents_yml, 'r') as f:
            agents_cfg = yaml.safe_load(f)
    if os.path.exists(tasks_yml):
        with open(tasks_yml, 'r') as f:
            tasks_cfg = yaml.safe_load(f)
    audio_engineer = Agent(
        **({
            'role': 'Audio Engineer',
            'goal': 'Produce a clean, normalized, single-speaker WAV from raw upload, ready for ElevenLabs.',
            'backstory': (
                "You’re a meticulous audio engineer. You trim silence and noise, fix loudness, and ensure only the target speaker remains. "
                "You avoid over-processing.\n\n" + AUDIO_ENGINEER_PROMPT
            ),
        } if agents_cfg is None else agents_cfg.get('audio_engineer', {})),
        allow_delegation=False,
        verbose=False,
        tools=[AudioProcessingTool()],
    )

    synth = Agent(
        **({
            'role': 'Synthesis Specialist',
            'goal': 'Generate natural speech from text using ElevenLabs only, tuning stability/similarity/style/speed.',
            'backstory': (
                "You know how ElevenLabs parameters impact emotion, consistency, and latency. Start with sensible defaults and adjust only when QC requests.\n\n"
                + SYNTHESIS_SPECIALIST_PROMPT
            ),
        } if agents_cfg is None else agents_cfg.get('synthesis_specialist', {})),
        allow_delegation=False,
        verbose=False,
        tools=[ElevenLabsTool()],
    )

    qc = Agent(
        **({
            'role': 'QC Listener',
            'goal': 'Approve or fail a generated clip by checking intelligibility and voice fidelity; single auto-retry if needed.',
            'backstory': (
                "You run ASR and speaker-embedding checks, then decide pass/fail using thresholds.\n\n" + QC_LISTENER_PROMPT
            ),
        } if agents_cfg is None else agents_cfg.get('qc_listener', {})),
        allow_delegation=False,
        verbose=False,
        tools=[QualityControlTool()],
    )

    t1_desc = (
        "Task 1 — Preprocess & Single-Speaker\n"
        "INPUT: raw_audio_path (absolute path).\n\n"
        "STEPS:\n"
        "1) Resample to 16 kHz mono if needed.\n"
        "2) Trim long silences with VAD; keep natural micro-pauses.\n"
        "3) Apply light denoise; avoid artifacts.\n"
        "4) Loudness normalize to about −20 LUFS (TP ≤ −2 dBFS).\n"
        "5) Diarize; keep only the dominant speaker. Merge segments in order.\n"
        "6) Export a single, clean WAV at 16 kHz mono.\n\n"
        "QUALITY BAR: No other speakers/music; intelligible speech; consistent loudness.\n\n"
        "IF UNUSABLE: Return a clear error message with a brief reason."
    )
    t1 = Task(
        agent=audio_engineer,
        description=(t1_desc if tasks_cfg is None else tasks_cfg['audio_preprocessing_for_elevenlabs']['description']).format(**context),
        context=context,
        expected_output=(
            '{"clean_wav_path": "/abs/path/to/cleaned_single_speaker.wav"}'
            if tasks_cfg is None else tasks_cfg['audio_preprocessing_for_elevenlabs']['expected_output']
        ),
    )

    t2_desc = (
        "Task 2 — ElevenLabs Synthesis\n"
        "INPUTS: clean_wav_path, voice_id, text, mode, defaults { stability, dialogue_stability, similarity_boost, style, speed }.\n\n"
        "RULES: ElevenLabs-only; initial settings based on mode; use similarity_boost/style/speed; split very long text; cache by (voice_id, text, settings)."
    )
    t2_expected = (
        '{\n  "gen_wav_path": "/abs/path/to/generated.wav",\n'
        '  "settings_used": {"stability": 0.55, "similarity_boost": 0.7, "style": 0.0, "speed": 1.0},\n'
        '  "was_cached": false\n}'
    )
    t2 = Task(
        agent=synth,
        description=(t2_desc if tasks_cfg is None else tasks_cfg['elevenlabs_tts_generation']['description']).format(**context),
        context=context,
        depends_on=[t1],
        expected_output=(t2_expected if tasks_cfg is None else tasks_cfg['elevenlabs_tts_generation']['expected_output']),
    )

    t3_desc = (
        "Task 3 — QC & Single Retry\n"
        "INPUTS: text, gen_wav_path, ref_voice_wav, max_wer, min_cosine, cosine_bump_stability, cosine_bump_similarity, stability_cap, similarity_cap.\n\n"
        "CHECKS: ASR->WER vs text; speaker similarity cosine(ref, gen).\n"
        "DECISION: PASS if WER ≤ max_wer AND cosine ≥ min_cosine; else single retry with small bumps within caps, then re-evaluate."
    )
    t3_expected = (
        '{\n  "decision": "pass",\n  "metrics": { "wer": 0.06, "speaker_cosine": 0.88, "transcript": "the recognized text here" },\n'
        '  "final_wav_path": "/abs/path/to/accepted.wav",\n  "retries_used": 0,\n  "notes": "short rationale"\n}'
    )
    t3 = Task(
        agent=qc,
        description=(t3_desc if tasks_cfg is None else tasks_cfg['audio_quality_control_with_auto_retry']['description']).format(**context),
        context=context,
        depends_on=[t2],
        expected_output=(t3_expected if tasks_cfg is None else tasks_cfg['audio_quality_control_with_auto_retry']['expected_output']),
    )

    return Crew(agents=[audio_engineer, synth, qc], tasks=[t1, t2, t3], process="sequential")

