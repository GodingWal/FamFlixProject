import OpenAI from "openai";
import fs from "fs";

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const openai = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY 
});

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

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "You are a professional children's story writer specializing in educational and entertaining content for young audiences."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      response_format: { type: "json_object" },
      temperature: 0.8,
    });

    const storyData = JSON.parse(response.choices[0].message.content || '{}');
    return storyData as StoryScript;
  } catch (error) {
    console.error('Story generation error:', error);
    throw new Error('Failed to generate story script');
  }
}

export async function enhanceVoiceScript(originalScript: string, voicePersonality: string): Promise<string> {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `You are a voice coach specializing in adapting scripts for different voice personalities and speech patterns. Your job is to modify the given script to match the specified voice personality while maintaining the original meaning and educational value.`
        },
        {
          role: "user",
          content: `Please adapt this script for a ${voicePersonality} voice personality:

Original Script: "${originalScript}"

Make the script more suitable for this voice type by:
- Adjusting tone and emotion markers
- Adding appropriate pauses and emphasis
- Modifying sentence structure for natural flow
- Including vocal direction hints

Return only the enhanced script text without additional formatting.`
        }
      ],
      temperature: 0.7,
    });

    return response.choices[0].message.content || originalScript;
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

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "You are an expert in voice analysis and script optimization for children's content."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      response_format: { type: "json_object" },
      temperature: 0.3,
    });

    const analysis = JSON.parse(response.choices[0].message.content || '{}');
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

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "You are an expert children's educator specializing in creating engaging educational content."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      response_format: { type: "json_object" },
      temperature: 0.7,
    });

    const educationalData = JSON.parse(response.choices[0].message.content || '{}');
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
    fs.writeFileSync(tempFile, audioBuffer);

    const transcription = await openai.audio.transcriptions.create({
      file: fs.createReadStream(tempFile),
      model: "whisper-1",
      response_format: "verbose_json",
    });

    // Clean up temp file
    fs.unlinkSync(tempFile);

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

    const analysisResponse = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "You are a voice coach expert in analyzing speech patterns for children's content narration."
        },
        {
          role: "user",
          content: analysisPrompt
        }
      ],
      response_format: { type: "json_object" },
      temperature: 0.3,
    });

    const analysis = JSON.parse(analysisResponse.choices[0].message.content || '{}');

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