import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Copy, RefreshCw } from 'lucide-react';

type AgentInfo = {
  key: string;
  role: string;
  goal?: string;
  backstory?: string;
};

type VoiceInfo = {
  id: string;
  name: string;
  category?: string | null;
  preview_url?: string | null;
};

export default function VoiceAgents() {
  const [voiceFilter, setVoiceFilter] = useState('');

  const {
    data: agents = [],
    isLoading: agentsLoading,
    refetch: refetchAgents,
  } = useQuery<AgentInfo[]>({
    queryKey: ['/api/agents'],
    queryFn: async () => {
      const res = await fetch('/api/agents', { credentials: 'include' });
      if (!res.ok) return [];
      return res.json();
    },
  });

  const {
    data: voices = [],
    isLoading: voicesLoading,
    refetch: refetchVoices,
  } = useQuery<VoiceInfo[]>({
    queryKey: ['/api/voices'],
    queryFn: async () => {
      const res = await fetch('/api/voices', { credentials: 'include' });
      if (!res.ok) return [];
      return res.json();
    },
  });

  const filteredVoices = useMemo(() => {
    const q = voiceFilter.trim().toLowerCase();
    if (!q) return voices;
    return voices.filter(v =>
      v.name.toLowerCase().includes(q) || v.id.toLowerCase().includes(q)
    );
  }, [voices, voiceFilter]);

  const copyToClipboard = (text: string) => {
    try {
      navigator.clipboard.writeText(text);
    } catch {}
  };

  return (
    <div className="container mx-auto px-4 py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Voice Agents</h1>
          <p className="text-muted-foreground text-sm">Inspect available agent roles and ElevenLabs voices</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="gap-2" onClick={() => { refetchAgents(); refetchVoices(); }}>
            <RefreshCw className="h-4 w-4" /> Refresh
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Agents</CardTitle>
            <CardDescription>Loaded from YAML config or defaults</CardDescription>
          </CardHeader>
          <CardContent>
            {agentsLoading ? (
              <p className="text-sm text-muted-foreground">Loading agents…</p>
            ) : agents.length === 0 ? (
              <p className="text-sm text-muted-foreground">No agents found.</p>
            ) : (
              <div className="space-y-4">
                {agents.map((agent) => (
                  <div key={agent.key} className="rounded-md border p-4">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary">{agent.key}</Badge>
                        <span className="font-medium">{agent.role}</span>
                      </div>
                    </div>
                    {agent.goal && (
                      <p className="text-sm text-muted-foreground mb-2 line-clamp-2">{agent.goal}</p>
                    )}
                    {agent.backstory && (
                      <p className="text-xs text-muted-foreground/80 line-clamp-3">{agent.backstory}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Voices</CardTitle>
            <CardDescription>From ElevenLabs (provider-locked)</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="mb-4">
              <Input
                placeholder="Search voices by name or ID…"
                value={voiceFilter}
                onChange={(e) => setVoiceFilter(e.target.value)}
              />
            </div>

            {voicesLoading ? (
              <p className="text-sm text-muted-foreground">Loading voices…</p>
            ) : filteredVoices.length === 0 ? (
              <p className="text-sm text-muted-foreground">No voices found.</p>
            ) : (
              <div className="space-y-4">
                {filteredVoices.map((voice) => (
                  <div key={voice.id} className="rounded-md border p-4">
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <div className="font-medium">{voice.name}</div>
                        <div className="text-xs text-muted-foreground break-all">{voice.id}</div>
                      </div>
                      <Button variant="outline" size="icon" onClick={() => copyToClipboard(voice.id)} title="Copy voice ID">
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                    {voice.preview_url && (
                      <div className="mt-3">
                        <audio controls src={voice.preview_url} className="w-full" />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Separator />
      <div className="text-xs text-muted-foreground">
        Provider lock in effect: ElevenLabs-only for TTS and cloning.
      </div>
    </div>
  );
}


