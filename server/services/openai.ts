// Replaced OpenAI with local Ollama (gpt-oss) for all LLM operations
// Reference model: gpt-oss (powerful reasoning & agentic tasks)
// https://ollama.com/library/gpt-oss:latest
const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'gpt-oss:latest';

interface OllamaChatMessage { role: 'system' | 'user' | 'assistant'; content: string }

async function ollamaChat(messages: OllamaChatMessage[], temperature = 0.7, json = false): Promise<string> {
  const url = `${OLLAMA_BASE_URL}/api/chat`;
  const body: any = {
    model: OLLAMA_MODEL,
    messages,
    stream: false,
    options: {
      temperature,
    },
  };
  if (json) {
    body.format = 'json';
  }
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const txt = await res.text().catch(() => '');
    throw new Error(`Ollama chat failed: ${res.status} ${res.statusText} ${txt}`);
  }
  const data = await res.json().catch(() => ({}));
  // Ollama chat returns { message: { role, content }, ... }
  const content = (data && data.message && data.message.content) || '';
  return String(content || '');
}

export interface StoryGenerationRequest {
  theme: string;
  ageGroup: string;
  duration: number;
  characters: string[];
  moralLesson?: string;
  setting?: string;
}

export interface StoryScript {
  title: string;
  description: string;
  script: Array<{
    character: string;
    dialogue: string;
    emotion: string;
    timing: number;
  }>;
  duration: number;
  category: string;
  ageRange: string;
}

export async function generateStoryScript(request: StoryGenerationRequest): Promise<StoryScript> {
  try {
    const prompt = `Create an engaging children's story script with the following specifications:
    - Theme: ${request.theme}
    - Target Age: ${request.ageGroup}
    - Duration: ${request.duration} seconds
    - Characters: ${request.characters.join(', ')}
    ${request.moralLesson ? `- Moral Lesson: ${request.moralLesson}` : ''}
    ${request.setting ? `- Setting: ${request.setting}` : ''}
    
    Please provide a JSON response with the following structure:
    {
      "title": "Story title",
      "description": "Brief story description",
      "script": [
        {
          "character": "Character name",
          "dialogue": "What they say",
          "emotion": "happy/sad/excited/calm/surprised",
          "timing": seconds_from_start
        }
      ],
      "duration": total_duration_in_seconds,
      "category": "educational/bedtime/fairytale/adventure",
      "ageRange": "2-4/4-6/6-8/8+"
    }
    
    Make sure the dialogue is age-appropriate, engaging, and fits within the specified duration.`;

    const content = await ollamaChat([
      { role: 'system', content: "You are a professional children's story writer specializing in educational and entertaining content for young audiences." },
      { role: 'user', content: prompt },
    ], 0.8, true);
    const storyData = JSON.parse(content || '{}');
    return storyData as StoryScript;
  } catch (error) {
    console.error('Story generation error:', error);
    throw new Error('Failed to generate story script');
  }
}

export async function enhanceVoiceScript(originalScript: string, voicePersonality: string): Promise<string> {
  try {
    const content = await ollamaChat([
      { role: 'system', content: 'You are a voice coach specializing in adapting scripts for different voice personalities and speech patterns. Your job is to modify the given script to match the specified voice personality while maintaining the original meaning and educational value.' },
      { role: 'user', content: `Please adapt this script for a ${voicePersonality} voice personality:\n\nOriginal Script: "${originalScript}"\n\nMake the script more suitable for this voice type by:\n- Adjusting tone and emotion markers\n- Adding appropriate pauses and emphasis\n- Modifying sentence structure for natural flow\n- Including vocal direction hints\n\nReturn only the enhanced script text without additional formatting.` },
    ], 0.7, false);

    return content || originalScript;
  } catch (error) {
    console.error('Voice script enhancement error:', error);
    return originalScript; // Fallback to original
  }
}

export async function analyzeVoiceCompatibility(
  storyScript: string,
  voiceCharacteristics: {
    tone: string;
    pace: string;
    expressiveness: string;
  }
): Promise<{
  compatibility: number;
  suggestions: string[];
  optimizedScript: string;
}> {
  try {
    const prompt = `Analyze the compatibility between this story script and voice characteristics:

Story Script: "${storyScript}"

Voice Characteristics:
- Tone: ${voiceCharacteristics.tone}
- Pace: ${voiceCharacteristics.pace}  
- Expressiveness: ${voiceCharacteristics.expressiveness}

Please provide a JSON response with:
{
  "compatibility": 0-100_score,
  "suggestions": ["suggestion1", "suggestion2"],
  "optimizedScript": "script_optimized_for_this_voice"
}`;

    const content = await ollamaChat([
      { role: 'system', content: "You are an expert in voice analysis and script optimization for children's content." },
      { role: 'user', content: prompt },
    ], 0.3, true);
    const analysis = JSON.parse(content || '{}');
    return {
      compatibility: analysis.compatibility || 70,
      suggestions: analysis.suggestions || [],
      optimizedScript: analysis.optimizedScript || storyScript,
    };
  } catch (error) {
    console.error('Voice compatibility analysis error:', error);
    return {
      compatibility: 70,
      suggestions: [],
      optimizedScript: storyScript,
    };
  }
}

export async function generateEducationalContent(
  topic: string,
  ageGroup: string,
  learningObjectives: string[]
): Promise<{
  content: string;
  activities: string[];
  questions: string[];
}> {
  try {
    const prompt = `Create educational content for children about "${topic}" for age group ${ageGroup}.

Learning Objectives:
${learningObjectives.map(obj => `- ${obj}`).join('\n')}

Please provide a JSON response with:
{
  "content": "Main educational narrative/story",
  "activities": ["Interactive activity 1", "Interactive activity 2"],
  "questions": ["Question to test understanding 1", "Question 2"]
}

Make it engaging, age-appropriate, and aligned with the learning objectives.`;

    const content = await ollamaChat([
      { role: 'system', content: "You are an expert children's educator specializing in creating engaging educational content." },
      { role: 'user', content: prompt },
    ], 0.7, true);
    const educationalData = JSON.parse(content || '{}');
    return {
      content: educationalData.content || '',
      activities: educationalData.activities || [],
      questions: educationalData.questions || [],
    };
  } catch (error) {
    console.error('Educational content generation error:', error);
    throw new Error('Failed to generate educational content');
  }
}

export async function transcribeAndAnalyzeVoice(audioBuffer: Buffer): Promise<{
  transcript: string;
  voiceCharacteristics: {
    tone: string;
    pace: string;
    clarity: string;
    expressiveness: string;
  };
  suggestions: string[];
}> {
  try {
    // Create a temporary file for transcription
    const tempFile = `/tmp/voice_analysis_${Date.now()}.wav`;
    require('fs').writeFileSync(tempFile, audioBuffer);

    // NOTE: Replaced remote Whisper with a placeholder.
    // For local transcription, integrate a local Whisper CLI/service and parse its output here.
    const transcription = { text: '' } as any;

    // Clean up temp file
    require('fs').unlinkSync(tempFile);

    // Analyze the transcript for voice characteristics
    const analysisPrompt = `Analyze this voice transcript for characteristics suitable for children's storytelling:

Transcript: "${transcription.text}"

Please provide a JSON response with:
{
  "voiceCharacteristics": {
    "tone": "warm/cheerful/calm/energetic",
    "pace": "slow/moderate/fast", 
    "clarity": "excellent/good/fair",
    "expressiveness": "high/medium/low"
  },
  "suggestions": ["improvement suggestion 1", "suggestion 2"]
}`;

    const content = await ollamaChat([
      { role: 'system', content: "You are a voice coach expert in analyzing speech patterns for children's content narration." },
      { role: 'user', content: analysisPrompt },
    ], 0.3, true);
    const analysis = JSON.parse(content || '{}');

    return {
      transcript: transcription.text,
      voiceCharacteristics: analysis.voiceCharacteristics || {
        tone: 'warm',
        pace: 'moderate',
        clarity: 'good',
        expressiveness: 'medium'
      },
      suggestions: analysis.suggestions || [],
    };
  } catch (error) {
    console.error('Voice transcription and analysis error:', error);
    throw new Error('Failed to analyze voice recording');
  }
}