import React from 'react';
import { Bot } from 'lucide-react';

const AgentVisualizer = ({ status }) => {
  const getVisualizerState = () => {
    switch (status) {
      case 'working':
        return {
          color: 'bg-blue-500',
          pulse: true,
          text: 'AI Working...'
        };
      case 'listening':
        return {
          color: 'bg-blue-500',
          pulse: true,
          text: 'Listening...'
        };
      case 'thinking':
        return {
          color: 'bg-indigo-500',
          pulse: false,
          text: 'Thinking...'
        };
      case 'speaking':
        return {
          color: 'bg-blue-500',
          pulse: true,
          text: 'Speaking...'
        };
      case 'user_speaking':
        return {
          color: 'bg-red-500',
          pulse: true,
          text: 'Capturing audio...'
        };
      default:
        return {
          color: 'bg-slate-400',
          pulse: false,
          text: 'Ready'
        };
    }
  };

  const state = getVisualizerState();

  return (
    <div className="flex items-center space-x-3" data-testid="agent-visualizer">
      <div className="relative">
        <div
          className={`w-12 h-12 rounded-full ${state.color} flex items-center justify-center ${
            state.pulse ? 'animate-pulse' : ''
          }`}
        >
          <Bot className="w-6 h-6 text-white" />
        </div>
        {state.pulse && (
          <div className={`absolute inset-0 rounded-full ${state.color} opacity-25 animate-ping`} />
        )}
      </div>
      <span className="text-sm font-medium text-slate-700" data-testid="agent-status-text">
        {state.text}
      </span>
    </div>
  );
};

export default AgentVisualizer;
