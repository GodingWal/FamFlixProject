import sys
import torch
import json
import whisperx

# Load audio path from CLI args
audio_path = sys.argv[1]

device = "cuda" if torch.cuda.is_available() else "cpu"
batch_size = 16
compute_type = "float16" if device == "cuda" else "float32"

# Load WhisperX model
model = whisperx.load_model("large-v2", device, compute_type=compute_type)

# Transcribe audio
audio = whisperx.load_audio(audio_path)
result = model.transcribe(audio, batch_size=batch_size)

# Align with word timestamps
model_a, metadata = whisperx.load_align_model(language_code=result["language"], device=device)
result_aligned = whisperx.align(result["segments"], model_a, metadata, audio, device, return_char_alignments=False)

# Load and run speaker diarization
diarize_model = whisperx.DiarizationPipeline(use_auth_token=True, device=device)
diarize_segments = diarize_model(audio)

# Assign speaker labels to each word segment
speaker_segments = whisperx.assign_word_speakers(diarize_segments, result_aligned["word_segments"])

# Group by speaker
speakers = {}
for seg in speaker_segments:
    speaker = seg["speaker"]
    if speaker not in speakers:
        speakers[speaker] = {"segments": []}
    
    # Join text per speaker segment
    speakers[speaker]["segments"].append({
        "start": seg["start"],
        "end": seg["end"],
        "text": seg["word"],
        "speaker": speaker
    })

# Combine all text
full_text = ' '.join([seg["word"] for seg in speaker_segments])

# Final output
output = {
    "speakers": speakers,
    "fullText": full_text
}

print(json.dumps(output))
