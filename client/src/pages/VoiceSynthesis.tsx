import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import VoiceSynthesisPanel from '@/components/voice/VoiceSynthesisPanel';
import { AudioWaveform, Cpu, Cloud } from 'lucide-react';

export const VoiceSynthesis = () => {
  return (
    <div className="container mx-auto px-4 py-8 space-y-8">
      {/* Header */}
      <div className="text-center space-y-4">
        <div className="flex items-center justify-center gap-3">
          <div className="p-3 bg-primary/10 rounded-full">
            <AudioWaveform className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
            Voice Synthesis Lab
          </h1>
        </div>
        <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
          Advanced real-time voice synthesis using VITS models. Transform any text into speech with your family's voices.
        </p>
      </div>

      {/* Features Overview */}
      <div className="grid md:grid-cols-3 gap-6 mb-8">
        <Card className="text-center">
          <CardHeader>
            <div className="mx-auto w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mb-2">
              <Cpu className="h-6 w-6 text-blue-600" />
            </div>
            <CardTitle className="text-lg">Real-Time Processing</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Fast VITS model inference with async task processing and live progress tracking
            </p>
          </CardContent>
        </Card>

        <Card className="text-center">
          <CardHeader>
            <div className="mx-auto w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mb-2">
              <AudioWaveform className="h-6 w-6 text-green-600" />
            </div>
            <CardTitle className="text-lg">Voice Preservation</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Maintains original accent and emotion characteristics from your voice samples
            </p>
          </CardContent>
        </Card>

        <Card className="text-center">
          <CardHeader>
            <div className="mx-auto w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mb-2">
              <Cloud className="h-6 w-6 text-purple-600" />
            </div>
            <CardTitle className="text-lg">Batch Processing</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Process multiple texts simultaneously with intelligent task management
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Panel */}
      <VoiceSynthesisPanel />
    </div>
  );
};

export default VoiceSynthesis;