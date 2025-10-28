import React, { useState, useEffect, useRef } from 'react';
import ConversationPanel from './ConversationPanel';
import Canvas from './Canvas';
import { Toaster, toast } from 'sonner';

const MainInterface = () => {
  const [mode, setMode] = useState('text'); // 'text' or 'voice'
  const [currentProject, setCurrentProject] = useState(null);
  const [artifacts, setArtifacts] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleProjectStart = (project) => {
    setCurrentProject(project);
    setIsProcessing(true);
  };

  const handleArtifactReady = (artifact) => {
    setArtifacts(prev => {
      const existing = prev.find(a => a.type === artifact.type);
      if (existing) {
        return prev.map(a => a.type === artifact.type ? artifact : a);
      }
      return [...prev, artifact];
    });
  };

  const handleWorkflowComplete = () => {
    setIsProcessing(false);
    toast.success('Workflow completed successfully!');
  };

  const handleModeChange = (newMode) => {
    if (isProcessing) {
      toast.error('Cannot change mode while processing');
      return;
    }
    setMode(newMode);
    setCurrentProject(null);
    setArtifacts([]);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <Toaster position="top-right" richColors />
      
      {/* Main Container */}
      <div className="flex h-screen">
        {/* Left Panel - Conversation */}
        <div className="w-1/2 border-r border-slate-200 bg-white/50 backdrop-blur-sm">
          <ConversationPanel
            mode={mode}
            onModeChange={handleModeChange}
            isProcessing={isProcessing}
            onProjectStart={handleProjectStart}
            onArtifactReady={handleArtifactReady}
            onWorkflowComplete={handleWorkflowComplete}
            currentProject={currentProject}
          />
        </div>

        {/* Right Panel - Canvas */}
        <div className="w-1/2 bg-white/70 backdrop-blur-sm">
          <Canvas artifacts={artifacts} mode={mode} />
        </div>
      </div>
    </div>
  );
};

export default MainInterface;
