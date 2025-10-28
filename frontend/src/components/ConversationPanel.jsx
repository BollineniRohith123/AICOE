import React, { useState, useEffect, useRef } from 'react';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import AgentTimeline from './AgentTimeline';
import VoiceInterface from './VoiceInterface';
import AgentVisualizer from './AgentVisualizer';
import axios from 'axios';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;
const WS_URL = BACKEND_URL.replace('https://', 'wss://').replace('http://', 'ws://');

const ConversationPanel = ({
  mode,
  onModeChange,
  isProcessing,
  onProjectStart,
  onArtifactReady,
  onWorkflowComplete,
  currentProject
}) => {
  const [projectBrief, setProjectBrief] = useState('');
  const [agentStates, setAgentStates] = useState({
    pm: 'pending',
    ba: 'pending',
    ux: 'pending',
    ui: 'pending'
  });
  const [agentMessages, setAgentMessages] = useState([]);
  const [websocket, setWebsocket] = useState(null);
  const [aiStatus, setAiStatus] = useState('idle');

  const handleStartProject = async () => {
    if (!projectBrief.trim()) {
      toast.error('Please enter a project brief');
      return;
    }

    try {
      const response = await axios.post(`${API}/projects`, {
        name: 'New Project',
        description: projectBrief,
        mode: 'text'
      });

      const project = response.data;
      onProjectStart(project);

      const ws = new WebSocket(`${WS_URL}/api/ws/workflow/${project.id}`);

      ws.onopen = () => {
        console.log('WebSocket connected');
        ws.send(JSON.stringify({
          action: 'start_workflow',
          brief: projectBrief
        }));
        setAiStatus('working');
      };

      ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        handleWebSocketMessage(data);
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        toast.error('Connection error');
      };

      ws.onclose = () => {
        console.log('WebSocket disconnected');
      };

      setWebsocket(ws);
    } catch (error) {
      console.error('Error starting project:', error);
      toast.error('Failed to start project');
    }
  };

  const handleWebSocketMessage = (data) => {
    switch (data.type) {
      case 'agent_status':
        setAgentStates(prev => ({
          ...prev,
          [data.agent_role]: data.status
        }));
        if (data.status === 'in_progress') {
          setAiStatus('working');
        }
        break;

      case 'agent_message':
        setAgentMessages(prev => [...prev, {
          role: data.agent_role,
          name: data.agent_name,
          message: data.message,
          timestamp: new Date()
        }]);
        break;

      case 'handoff':
        break;

      case 'artifact_ready':
        onArtifactReady({
          type: data.artifact_type,
          content: data.content
        });
        break;

      case 'workflow_complete':
        setAiStatus('idle');
        onWorkflowComplete();
        break;

      case 'error':
        toast.error(data.message);
        setAiStatus('idle');
        break;
    }
  };

  useEffect(() => {
    return () => {
      if (websocket) {
        websocket.close();
      }
    };
  }, [websocket]);

  return (
    <div className="h-full flex flex-col">
      <div className="p-6 border-b border-slate-200 bg-white">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-900" style={{ fontFamily: 'Space Grotesk' }}>
              AICOE Genesis
            </h1>
            <p className="text-sm text-slate-600 mt-1">AI-Powered Software Design Partner</p>
          </div>
          <AgentVisualizer status={aiStatus} />
        </div>

        <div className="flex items-center space-x-3 bg-slate-100 p-3 rounded-lg">
          <span className={`text-sm font-medium ${mode === 'text' ? 'text-slate-900' : 'text-slate-500'}`}>
            Text Mode
          </span>
          <Switch
            checked={mode === 'voice'}
            onCheckedChange={(checked) => onModeChange(checked ? 'voice' : 'text')}
            disabled={isProcessing}
            data-testid="mode-toggle-switch"
          />
          <span className={`text-sm font-medium ${mode === 'voice' ? 'text-slate-900' : 'text-slate-500'}`}>
            Voice Mode
          </span>
        </div>
      </div>

      <div className="flex-1 overflow-hidden">
        {mode === 'text' ? (
          <div className="h-full flex flex-col">
            {!currentProject ? (
              <div className="p-6">
                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-100">
                  <h3 className="text-lg font-semibold text-slate-900 mb-2">Start Your Project</h3>
                  <p className="text-sm text-slate-600 mb-4">
                    Describe your software idea, and our AI team will transform it into a complete design with vision document, use cases, and interactive prototype.
                  </p>
                  <Textarea
                    value={projectBrief}
                    onChange={(e) => setProjectBrief(e.target.value)}
                    placeholder="Example: An app to track personal reading habits and share recommendations with friends..."
                    className="min-h-[150px] mb-4 bg-white"
                    data-testid="project-brief-input"
                  />
                  <Button
                    onClick={handleStartProject}
                    className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-medium"
                    data-testid="start-project-button"
                  >
                    Start Project
                  </Button>
                </div>
              </div>
            ) : (
              <AgentTimeline
                agentStates={agentStates}
                agentMessages={agentMessages}
              />
            )}
          </div>
        ) : (
          <VoiceInterface
            onArtifactReady={onArtifactReady}
            currentProject={currentProject}
            onProjectStart={onProjectStart}
          />
        )}
      </div>
    </div>
  );
};

export default ConversationPanel;
