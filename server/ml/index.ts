// ML Services Entry Point
import { VoiceProcessor } from './voice/voiceProcessor';

export class MLService {
  private static voiceProcessor: VoiceProcessor;

  static async initialize() {
    // Initialize voice processor
    this.voiceProcessor = new VoiceProcessor();
    await this.voiceProcessor.initialize();
  }

  static getVoiceProcessor(): VoiceProcessor {
    if (!this.voiceProcessor) {
      throw new Error('ML Service not initialized. Call initialize() first.');
    }
    return this.voiceProcessor;
  }
}

export default MLService;