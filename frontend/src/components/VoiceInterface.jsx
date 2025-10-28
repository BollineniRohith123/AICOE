import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Mic, MicOff, User, Radio } from 'lucide-react';
import { toast } from 'sonner';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

class RealtimeAudioChat {
  constructor() {
    this.peerConnection = null;
    this.dataChannel = null;
    this.audioElement = null;
    this.onTranscriptUpdate = null;
    this.onStatusUpdate = null;
  }

  async init() {
    try {
      // Get session from backend
      const tokenResponse = await fetch(`${API}/realtime/session`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        }
      });
      const data = await tokenResponse.json();
      
      if (!data.client_secret?.value) {
        throw new Error("Failed to get session token");
      }

      // Create and set up WebRTC peer connection
      this.peerConnection = new RTCPeerConnection();
      this.setupAudioElement();
      await this.setupLocalAudio();
      this.setupDataChannel();

      // Create and send offer
      const offer = await this.peerConnection.createOffer();
      await this.peerConnection.setLocalDescription(offer);

      // Send offer to backend and get answer
      const response = await fetch(`${API}/realtime/negotiate`, {
        method: "POST",
        body: offer.sdp,
        headers: {
          "Content-Type": "application/sdp"
        }
      });

      const { sdp: answerSdp } = await response.json();
      const answer = {
        type: "answer",
        sdp: answerSdp
      };

      await this.peerConnection.setRemoteDescription(answer);
      console.log("WebRTC connection established");
      
      if (this.onStatusUpdate) {
        this.onStatusUpdate('connected');
      }

      return true;
    } catch (error) {
      console.error("Failed to initialize audio chat:", error);
      if (this.onStatusUpdate) {
        this.onStatusUpdate('error');
      }
      throw error;
    }
  }

  setupAudioElement() {
    this.audioElement = document.createElement("audio");
    this.audioElement.autoplay = true;
    document.body.appendChild(this.audioElement);

    this.peerConnection.ontrack = (event) => {
      this.audioElement.srcObject = event.streams[0];
      console.log("Received remote audio track");
    };
  }

  async setupLocalAudio() {
    const stream = await navigator.mediaDevices.getUserMedia({ 
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true
      }
    });
    
    stream.getTracks().forEach(track => {
      this.peerConnection.addTrack(track, stream);
    });
    
    console.log("Local audio stream added");
  }

  setupDataChannel() {
    this.dataChannel = this.peerConnection.createDataChannel("oai-events");
    
    this.dataChannel.onopen = () => {
      console.log("Data channel opened");
    };

    this.dataChannel.onmessage = (event) => {
      try {
        const eventData = JSON.parse(event.data);
        console.log("Received event:", eventData);
        
        // Handle different event types
        if (eventData.type === 'conversation.item.created') {
          if (this.onTranscriptUpdate) {
            const item = eventData.item;
            if (item.type === 'message' || item.type === 'function_call') {
              this.onTranscriptUpdate({
                role: item.role || 'assistant',
                content: item.content || item.name || '',
                type: item.type
              });
            }
          }
        } else if (eventData.type === 'response.audio_transcript.delta' || 
                   eventData.type === 'response.text.delta') {
          if (this.onTranscriptUpdate) {
            this.onTranscriptUpdate({
              role: 'assistant',
              delta: eventData.delta || eventData.text || '',
              isPartial: true
            });
          }
        } else if (eventData.type === 'response.audio_transcript.done') {
          if (this.onTranscriptUpdate) {
            this.onTranscriptUpdate({
              role: 'assistant',
              content: eventData.transcript || '',
              isComplete: true
            });
          }
        } else if (eventData.type === 'conversation.item.input_audio_transcription.completed') {
          if (this.onTranscriptUpdate) {
            this.onTranscriptUpdate({
              role: 'user',
              content: eventData.transcript || '',
              isComplete: true
            });
          }
        }
      } catch (err) {
        console.error("Error parsing event data:", err);
      }
    };

    this.dataChannel.onerror = (error) => {
      console.error("Data channel error:", error);
    };

    this.dataChannel.onclose = () => {
      console.log("Data channel closed");
    };
  }

  disconnect() {
    if (this.dataChannel) {
      this.dataChannel.close();
    }
    if (this.peerConnection) {
      this.peerConnection.close();
    }
    if (this.audioElement) {
      this.audioElement.remove();
    }
  }
}

const VoiceInterface = ({ onArtifactReady, currentProject, onProjectStart }) => {
  const [isActive, setIsActive] = useState(false);
  const [transcript, setTranscript] = useState([]);
  const [isInitializing, setIsInitializing] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState('disconnected');
  const scrollRef = useRef(null);
  const chatRef = useRef(null);
  const currentAssistantMessageRef = useRef('');

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [transcript]);

  useEffect(() => {
    return () => {
      if (chatRef.current) {
        chatRef.current.disconnect();
      }
    };
  }, []);

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

      // Initialize WebRTC connection
      const chat = new RealtimeAudioChat();
      
      chat.onStatusUpdate = (status) => {
        setConnectionStatus(status);
      };

      chat.onTranscriptUpdate = (data) => {
        if (data.isPartial && data.delta) {
          // Accumulate partial transcript
          currentAssistantMessageRef.current += data.delta;
        } else if (data.isComplete) {
          if (data.role === 'assistant') {
            // Finalize assistant message
            const finalText = data.content || currentAssistantMessageRef.current;
            if (finalText) {
              setTranscript(prev => {
                // Remove any partial message
                const filtered = prev.filter(m => !m.isPartial);
                return [...filtered, {
                  role: 'assistant',
                  text: finalText,
                  timestamp: new Date()
                }];
              });
            }
            currentAssistantMessageRef.current = '';
          } else if (data.role === 'user') {
            // Add user message
            if (data.content) {
              setTranscript(prev => [...prev, {
                role: 'user',
                text: data.content,
                timestamp: new Date()
              }]);
            }
          }
        } else if (data.content) {
          // Add complete message directly
          setTranscript(prev => [...prev, {
            role: data.role,
            text: data.content,
            timestamp: new Date()
          }]);
        }
      };

      await chat.init();
      chatRef.current = chat;
      
      setIsActive(true);
      setIsInitializing(false);
      
      // Add welcome message
      setTranscript([{
        role: 'assistant',
        text: "Hello! I'm your AI Architect. Tell me about your software project idea, and I can help you create vision documents, use cases, and interactive prototypes.",
        timestamp: new Date()
      }]);

      toast.success('Voice mode activated - Start speaking!');

    } catch (error) {
      console.error('Error starting voice mode:', error);
      toast.error('Failed to start voice mode: ' + error.message);
      setIsInitializing(false);
      setIsActive(false);
    }
  };

  const handleEndConversation = () => {
    if (chatRef.current) {
      chatRef.current.disconnect();
      chatRef.current = null;
    }
    setIsActive(false);
    setConnectionStatus('disconnected');
    toast.info('Voice mode ended');
  };

  const getStatusIndicator = () => {
    switch(connectionStatus) {
      case 'connected':
        return (
          <div className="flex items-center space-x-2 text-green-600">
            <Radio className="w-4 h-4 animate-pulse" />
            <span className="text-xs font-medium">Connected</span>
          </div>
        );
      case 'error':
        return (
          <div className="flex items-center space-x-2 text-red-600">
            <span className="text-xs font-medium">Connection Error</span>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="h-full flex flex-col">
      {/* Connection Status */}
      {isActive && (
        <div className="px-6 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            {getStatusIndicator()}
          </div>
          <div className="text-xs text-slate-500">
            Speak naturally - AI will respond
          </div>
        </div>
      )}

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
                  <li>• "Generate a prototype for me"</li>
                </ul>
              </div>
              <div className="mt-4 p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                <p className="text-xs text-yellow-800">
                  <strong>Note:</strong> Make sure your microphone is connected and browser has permission to access it.
                </p>
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
                        <span className="text-white text-xs font-bold">AI</span>
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
              <span className="flex items-center">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Initializing...
              </span>
            ) : (
              <>
                <Mic className="w-5 h-5 mr-2" />
                Start Conversation
              </>
            )}
          </Button>
        ) : (
          <Button
            onClick={handleEndConversation}
            variant="destructive"
            className="w-full h-12 font-medium"
            data-testid="end-conversation-button"
          >
            <MicOff className="w-5 h-5 mr-2" />
            End Conversation
          </Button>
        )}
      </div>
    </div>
  );
};

export default VoiceInterface;
