import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Mic, MicOff, User } from 'lucide-react';
import { toast } from 'sonner';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const VoiceInterface = ({ onArtifactReady, currentProject, onProjectStart }) => {
  const [isActive, setIsActive] = useState(false);
  const [transcript, setTranscript] = useState([]);
  const [isInitializing, setIsInitializing] = useState(false);
  const scrollRef = useRef(null);

  // Note: Full Google Gemini Live API integration would require:
  // 1. WebSocket connection to Gemini Live API
  // 2. Web Audio API for microphone capture and playback
  // 3. Real-time transcription handling
  // 4. Function calling for artifact generation
  //
  // For this MVP, we'll provide a simplified placeholder that demonstrates the UI
  // The actual Gemini Live API requires client-side SDK integration

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [transcript]);

  const handleStartConversation = async () => {
    setIsInitializing(true);

    try {
      // Create a project if one doesn't exist
      if (!currentProject) {
        const response = await axios.post(`${API}/projects`, {
          name: 'Voice Project',
          description: 'Created via voice mode',
          mode: 'voice'
        });
        onProjectStart(response.data);
      }

      // Request microphone permission
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      setIsActive(true);
      setIsInitializing(false);
      
      // Add welcome message
      setTranscript([{
        role: 'assistant',
        text: "Hello! I'm your AI Architect. I'm here to help you design your software project. Tell me about your idea, and I can create vision documents, use cases, and prototypes for you.",
        timestamp: new Date()
      }]);

      toast.success('Voice mode activated');

      // Note: Actual Gemini Live API integration would go here
      // This would include:
      // - WebSocket connection to Gemini
      // - Audio streaming setup
      // - Real-time transcription
      // - Function calling for generateArtifact

      // For demo purposes, we'll simulate the conversation flow
      setTimeout(() => {
        setTranscript(prev => [...prev, {
          role: 'user',
          text: 'I want to build a task management app for remote teams',
          timestamp: new Date()
        }]);
      }, 3000);

      setTimeout(() => {
        setTranscript(prev => [...prev, {
          role: 'assistant',
          text: "That sounds like a great idea! A task management app for remote teams would be very useful. Let me ask you a few questions to better understand your vision. What are the key features you'd like to include? For example, task assignment, progress tracking, team collaboration?",
          timestamp: new Date()
        }]);
      }, 5000);

    } catch (error) {
      console.error('Error starting voice mode:', error);
      toast.error('Failed to access microphone');
      setIsInitializing(false);
    }
  };

  const handleEndConversation = () => {
    setIsActive(false);
    toast.info('Voice mode ended');
  };

  const handleGenerateArtifact = async (type) => {
    if (!currentProject) return;

    try {
      // Get conversation context
      const context = transcript
        .map(t => `${t.role}: ${t.text}`)
        .join('\n');

      // Call backend to generate artifact
      const response = await axios.post(`${API}/voice/generate-artifact`, {
        project_id: currentProject.id,
        artifact_type: type,
        context: context
      });

      onArtifactReady({
        type: type,
        content: response.data.content
      });

      // Add confirmation to transcript
      setTranscript(prev => [...prev, {
        role: 'assistant',
        text: `I've generated the ${type} document for you. You can view it on the right panel.`,
        timestamp: new Date()
      }]);

      toast.success(`${type} document generated`);
    } catch (error) {
      console.error('Error generating artifact:', error);
      toast.error('Failed to generate artifact');
    }
  };

  return (
    <div className="h-full flex flex-col">
      {/* Conversation Display */}
      <ScrollArea className="flex-1 p-6" ref={scrollRef}>
        {transcript.length === 0 && !isActive ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center max-w-md">
              <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center mx-auto mb-6">
                <Mic className="w-10 h-10 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-slate-900 mb-3" style={{ fontFamily: 'Space Grotesk' }}>
                Voice Mode
              </h3>
              <p className="text-slate-600 mb-6 leading-relaxed">
                Have a natural conversation with your AI Architect. Describe your ideas, ask questions, and request artifacts in real-time.
              </p>
              <div className="space-y-2 text-left bg-blue-50 rounded-lg p-4 border border-blue-100">
                <p className="text-sm text-slate-700">
                  <strong>Try saying:</strong>
                </p>
                <ul className="text-sm text-slate-600 space-y-1 ml-4">
                  <li>• "I want to build a fitness tracking app"</li>
                  <li>• "Can you create the vision document?"</li>
                  <li>• "Show me some use cases for this"</li>
                </ul>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-4" data-testid="voice-transcript">
            {transcript.map((item, index) => (
              <div
                key={index}
                className={`flex ${item.role === 'user' ? 'justify-end' : 'justify-start'} animate-fade-in`}
              >
                <div
                  className={`max-w-[80%] rounded-xl p-4 ${
                    item.role === 'user'
                      ? 'bg-blue-600 text-white'
                      : 'bg-white border border-slate-200 text-slate-900'
                  }`}
                >
                  <div className="flex items-start space-x-2">
                    {item.role === 'assistant' && (
                      <div className="flex-shrink-0 w-6 h-6 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
                        <span className="text-white text-xs">AI</span>
                      </div>
                    )}
                    <p className="text-sm leading-relaxed">{item.text}</p>
                    {item.role === 'user' && (
                      <div className="flex-shrink-0 w-6 h-6 rounded-full bg-white/20 flex items-center justify-center">
                        <User className="w-3 h-3 text-white" />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </ScrollArea>

      {/* Controls */}
      <div className="p-6 border-t border-slate-200 bg-white">
        {!isActive ? (
          <Button
            onClick={handleStartConversation}
            disabled={isInitializing}
            className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-medium h-12"
            data-testid="start-conversation-button"
          >
            {isInitializing ? (
              <span>Initializing...</span>
            ) : (
              <>
                <Mic className="w-5 h-5 mr-2" />
                Start Conversation
              </>
            )}
          </Button>
        ) : (
          <div className="space-y-3">
            <Button
              onClick={handleEndConversation}
              variant="destructive"
              className="w-full h-12 font-medium"
              data-testid="end-conversation-button"
            >
              <MicOff className="w-5 h-5 mr-2" />
              End Conversation
            </Button>
            
            {/* Quick Actions for Demo */}
            <div className="grid grid-cols-3 gap-2">
              <Button
                onClick={() => handleGenerateArtifact('vision')}
                variant="outline"
                size="sm"
                className="text-xs"
              >
                Generate Vision
              </Button>
              <Button
                onClick={() => handleGenerateArtifact('usecases')}
                variant="outline"
                size="sm"
                className="text-xs"
              >
                Generate Use Cases
              </Button>
              <Button
                onClick={() => handleGenerateArtifact('prototype')}
                variant="outline"
                size="sm"
                className="text-xs"
              >
                Generate Prototype
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default VoiceInterface;
