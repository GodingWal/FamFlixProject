import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import useVoiceSynthesis from '@/hooks/useVoiceSynthesis';
import { Mic, Upload, Play, Square, Trash2, Download, AlertCircle, CheckCircle, AudioWaveform } from 'lucide-react';

export const VoiceSynthesisPanel = () => {
  const { toast } = useToast();
  const {
    isServiceHealthy,
    isCheckingHealth,
    synthesize,
    isSynthesizing,
    currentTaskId,
    taskStatus,
    tasks,
    isLoadingTasks,
    deleteTask,
    isDeleting,
    uploadSample,
    isUploading,
    batchSynthesize,
    isBatchProcessing,
    clearCurrentTask
  } = useVoiceSynthesis();

  const [text, setText] = useState('');
  const [voiceSample, setVoiceSample] = useState('');
  const [quality, setQuality] = useState<'low' | 'standard' | 'high'>('standard');
  const [preserveAccent, setPreserveAccent] = useState(true);
  const [preserveEmotion, setPreserveEmotion] = useState(true);
  const [batchTexts, setBatchTexts] = useState<string>('');

  const handleSynthesize = () => {
    if (!text.trim() || !voiceSample.trim()) {
      toast({
        title: "Missing Information",
        description: "Please provide both text and voice sample path.",
        variant: "destructive"
      });
      return;
    }

    synthesize({
      text: text.trim(),
      voice_sample: voiceSample.trim(),
      quality,
      preserve_accent: preserveAccent,
      preserve_emotion: preserveEmotion
    });

    toast({
      title: "Synthesis Started",
      description: "Your voice synthesis request has been queued.",
    });
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      uploadSample(file);
      toast({
        title: "Uploading Sample",
        description: `Uploading ${file.name}...`,
      });
    }
  };

  const handleBatchSynthesize = () => {
    const texts = batchTexts.split('\n').filter(t => t.trim());
    if (texts.length === 0 || !voiceSample.trim()) {
      toast({
        title: "Missing Information",
        description: "Please provide texts and voice sample for batch processing.",
        variant: "destructive"
      });
      return;
    }

    const requests = texts.map(text => ({
      text: text.trim(),
      voice_sample: voiceSample.trim(),
      quality,
      preserve_accent: preserveAccent,
      preserve_emotion: preserveEmotion
    }));

    batchSynthesize({
      requests,
      batch_name: `Batch_${new Date().toISOString().split('T')[0]}`
    });

    toast({
      title: "Batch Processing Started",
      description: `Processing ${requests.length} synthesis requests.`,
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-500';
      case 'failed': return 'bg-red-500';
      case 'processing': return 'bg-blue-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle className="h-4 w-4" />;
      case 'failed': return <AlertCircle className="h-4 w-4" />;
      case 'processing': return <Play className="h-4 w-4" />;
      default: return <Square className="h-4 w-4" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Service Status */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Mic className="h-5 w-5" />
                Voice Synthesis Service
              </CardTitle>
              <CardDescription>
                Real-time voice synthesis using VITS models
              </CardDescription>
            </div>
            <Badge 
              variant={isServiceHealthy ? "default" : "destructive"}
              className={isServiceHealthy ? "bg-green-500" : ""}
            >
              {isCheckingHealth ? "Checking..." : isServiceHealthy ? "Healthy" : "Offline"}
            </Badge>
          </div>
        </CardHeader>
      </Card>

      {/* Single Synthesis */}
      <Card>
        <CardHeader>
          <CardTitle>Voice Synthesis</CardTitle>
          <CardDescription>
            Convert text to speech using your voice sample
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="text">Text to Synthesize</Label>
            <Textarea
              id="text"
              placeholder="Enter the text you want to convert to speech..."
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="voice-sample">Voice Sample Path</Label>
            <Input
              id="voice-sample"
              placeholder="Path to voice sample file (e.g., samples/voice.wav)"
              value={voiceSample}
              onChange={(e) => setVoiceSample(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Quality</Label>
              <Select value={quality} onValueChange={(value: 'low' | 'standard' | 'high') => setQuality(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="standard">Standard</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Preserve Accent</Label>
              <div className="flex items-center space-x-2">
                <Switch
                  checked={preserveAccent}
                  onCheckedChange={setPreserveAccent}
                />
                <span className="text-sm text-muted-foreground">
                  {preserveAccent ? "Enabled" : "Disabled"}
                </span>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Preserve Emotion</Label>
              <div className="flex items-center space-x-2">
                <Switch
                  checked={preserveEmotion}
                  onCheckedChange={setPreserveEmotion}
                />
                <span className="text-sm text-muted-foreground">
                  {preserveEmotion ? "Enabled" : "Disabled"}
                </span>
              </div>
            </div>
          </div>

          <div className="flex gap-2">
            <Button 
              onClick={handleSynthesize}
              disabled={isSynthesizing || !isServiceHealthy}
              className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white"
            >
              <Mic className="h-4 w-4 mr-2" />
              {isSynthesizing ? "Synthesizing..." : "Start Synthesis"}
            </Button>
            
            <div className="relative">
              <input
                type="file"
                accept="audio/*"
                onChange={handleFileUpload}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
              <Button variant="outline" disabled={isUploading}>
                <Upload className="h-4 w-4 mr-2" />
                {isUploading ? "Uploading..." : "Upload Sample"}
              </Button>
            </div>
          </div>

          {/* Current Task Status */}
          {currentTaskId && taskStatus && (
            <Card className="bg-gradient-to-r from-purple-50 to-indigo-50 border-indigo-200">
              <CardContent className="pt-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <AudioWaveform className="h-4 w-4 text-indigo-600 animate-pulse" />
                      <span className="text-sm font-medium">Current Task</span>
                    </div>
                    <Badge className={`${getStatusColor(taskStatus.status)} text-white`}>
                      <div className="flex items-center gap-1">
                        {getStatusIcon(taskStatus.status)}
                        {taskStatus.status}
                      </div>
                    </Badge>
                  </div>
                  
                  <div className="text-xs text-muted-foreground">
                    Task ID: {currentTaskId}
                  </div>
                  
                  {taskStatus.progress !== undefined && (
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span>Progress</span>
                        <span>{taskStatus.progress}%</span>
                      </div>
                      <Progress value={taskStatus.progress} className="h-2" />
                    </div>
                  )}
                  
                  {taskStatus.error && (
                    <div className="text-xs text-red-500 bg-red-50 p-2 rounded">
                      Error: {taskStatus.error}
                    </div>
                  )}
                  
                  {taskStatus.output_path && (
                    <div className="flex items-center gap-2">
                      <Button size="sm" variant="outline">
                        <Download className="h-3 w-3 mr-1" />
                        Download
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline" 
                        onClick={clearCurrentTask}
                      >
                        Clear
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </CardContent>
      </Card>

      {/* Batch Synthesis */}
      <Card>
        <CardHeader>
          <CardTitle>Batch Synthesis</CardTitle>
          <CardDescription>
            Process multiple texts with the same voice sample
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="batch-texts">Texts (one per line)</Label>
            <Textarea
              id="batch-texts"
              placeholder="Enter multiple texts, one per line..."
              value={batchTexts}
              onChange={(e) => setBatchTexts(e.target.value)}
              rows={5}
            />
          </div>

          <Button 
            onClick={handleBatchSynthesize}
            disabled={isBatchProcessing || !isServiceHealthy}
            className="w-full"
          >
            {isBatchProcessing ? "Processing Batch..." : "Start Batch Synthesis"}
          </Button>
        </CardContent>
      </Card>

      {/* Task List */}
      <Card>
        <CardHeader>
          <CardTitle>Active Tasks</CardTitle>
          <CardDescription>
            Monitor and manage your synthesis tasks
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoadingTasks ? (
            <div className="text-center py-4 text-muted-foreground">
              Loading tasks...
            </div>
          ) : tasks.length === 0 ? (
            <div className="text-center py-4 text-muted-foreground">
              No active tasks
            </div>
          ) : (
            <div className="space-y-2">
              {tasks.map((task) => (
                <Card key={task.task_id} className="p-3">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Badge className={getStatusColor(task.status)}>
                          <div className="flex items-center gap-1">
                            {getStatusIcon(task.status)}
                            {task.status}
                          </div>
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {task.task_id}
                        </span>
                      </div>
                      {task.progress !== undefined && (
                        <Progress value={task.progress} className="h-1 w-24" />
                      )}
                    </div>
                    
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => deleteTask(task.task_id)}
                      disabled={isDeleting}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default VoiceSynthesisPanel;