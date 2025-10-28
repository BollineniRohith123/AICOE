import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Mic, MicOff, User, Radio, Settings } from 'lucide-react';
import { toast } from 'sonner';
import axios from 'axios';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// OpenAI Realtime WebRTC client
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
      console.log("OpenAI WebRTC connection established");
      
      if (this.onStatusUpdate) {
        this.onStatusUpdate('connected');
      }

      return true;
    } catch (error) {
      console.error("Failed to initialize OpenAI audio chat:", error);
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
      console.log("OpenAI data channel opened");
    };

    this.dataChannel.onmessage = (event) => {
      try {
        const eventData = JSON.parse(event.data);
        console.log("Received OpenAI event:", eventData);
        
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
        console.error("Error parsing OpenAI event data:", err);
      }
    };

    this.dataChannel.onerror = (error) => {
      console.error("OpenAI data channel error:", error);
    };

    this.dataChannel.onclose = () => {
      console.log("OpenAI data channel closed");
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

// Gemini Live WebSocket client
class GeminiLiveChat {
  constructor() {
    this.websocket = null;
    this.audioContext = null;
    this.audioElement = null;
    this.mediaStream = null;
    this.mediaRecorder = null;
    this.onTranscriptUpdate = null;
    this.onStatusUpdate = null;
    this.isRecording = false;
  }

  async init() {
    try {
      // Create WebSocket connection
      const wsUrl = `${BACKEND_URL.replace('https://', 'wss://').replace('http://', 'ws://')}/api/gemini/live`;
      this.websocket = new WebSocket(wsUrl);
      
      // Setup audio context for playback
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
      this.audioElement = document.createElement("audio");
      this.audioElement.autoplay = true;
      document.body.appendChild(this.audioElement);

      // Wait for websocket to connect
      await new Promise((resolve, reject) => {
        this.websocket.onopen = () => {
          console.log("Gemini Live WebSocket connected");
          if (this.onStatusUpdate) {
            this.onStatusUpdate('connected');
          }
          resolve();
        };
        
        this.websocket.onerror = (error) => {
          console.error("Gemini WebSocket error:", error);
          reject(error);
        };
        
        this.websocket.onclose = () => {
          console.log("Gemini WebSocket closed");
          if (this.onStatusUpdate) {
            this.onStatusUpdate('disconnected');
          }
        };

        setTimeout(() => reject(new Error("WebSocket connection timeout")), 10000);
      });

      // Setup message handler
      this.websocket.onmessage = async (event) => {
        if (event.data instanceof Blob) {
          // Audio data from Gemini
          await this.playAudioBlob(event.data);
        } else {
          // Text/JSON data
          try {
            const data = JSON.parse(event.data);
            console.log("Received Gemini message:", data);
            
            if (data.type === 'transcript' && this.onTranscriptUpdate) {
              this.onTranscriptUpdate({
                role: data.role || 'assistant',
                content: data.text || '',
                isComplete: true
              });
            } else if (data.type === 'turn_complete') {
              console.log("Gemini turn complete");
            } else if (data.type === 'error') {
              console.error("Gemini error:", data.message);
              toast.error('Gemini error: ' + data.message);
            }
          } catch (err) {
            console.error("Error parsing Gemini message:", err);
          }
        }
      };

      // Setup local audio capture
      await this.setupLocalAudio();
      
      return true;
    } catch (error) {
      console.error("Failed to initialize Gemini Live chat:", error);
      if (this.onStatusUpdate) {
        this.onStatusUpdate('error');
      }
      throw error;
    }
  }

  async setupLocalAudio() {
    this.mediaStream = await navigator.mediaDevices.getUserMedia({ 
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
        sampleRate: 24000,
        channelCount: 1
      }
    });
    
    // Setup MediaRecorder to capture audio chunks
    const mimeType = 'audio/webm;codecs=pcm';
    this.mediaRecorder = new MediaRecorder(this.mediaStream, {
      mimeType: MediaRecorder.isTypeSupported(mimeType) ? mimeType : 'audio/webm'
    });

    this.mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0 && this.websocket && this.websocket.readyState === WebSocket.OPEN) {
        // Send audio data to Gemini
        this.websocket.send(event.data);
      }
    };

    // Start recording with small chunks for low latency
    this.mediaRecorder.start(100); // Send audio every 100ms
    this.isRecording = true;
    
    console.log("Gemini local audio stream started");
  }

  async playAudioBlob(blob) {
    try {
      const arrayBuffer = await blob.arrayBuffer();
      const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
      
      const source = this.audioContext.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(this.audioContext.destination);
      source.start(0);
    } catch (err) {
      console.error("Error playing Gemini audio:", err);
    }
  }

  sendTextMessage(text) {
    if (this.websocket && this.websocket.readyState === WebSocket.OPEN) {
      this.websocket.send(JSON.stringify({
        type: 'text_message',
        message: text
      }));
    }
  }

  disconnect() {
    if (this.mediaRecorder && this.isRecording) {
      this.mediaRecorder.stop();
      this.isRecording = false;
    }
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach(track => track.stop());
    }
    if (this.websocket) {
      this.websocket.close();
    }
    if (this.audioContext) {
      this.audioContext.close();
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
  const [provider, setProvider] = useState('gemini'); // Using Gemini only
  const [availableProviders, setAvailableProviders] = useState({ openai: false, gemini: false });
  const scrollRef = useRef(null);
  const chatRef = useRef(null);
  const currentAssistantMessageRef = useRef('');

  // Fetch available providers on mount
  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const response = await axios.get(`${API}/realtime/config`);
        setAvailableProviders(response.data.available_providers);
        // Always use Gemini
        setProvider('gemini');
      } catch (error) {
        console.error("Error fetching realtime config:", error);
      }
    };
    fetchConfig();
  }, []);

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
          name: `Voice Project (${provider})`,
          description: `Created via voice mode using ${provider}`,
          mode: 'voice'
        });
        onProjectStart(response.data);
      }

      // Initialize connection based on provider
      let chat;
      if (provider === 'openai') {
        chat = new RealtimeAudioChat();
      } else if (provider === 'gemini') {
        chat = new GeminiLiveChat();
      } else {
        throw new Error(`Unknown provider: ${provider}`);
      }
      
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
      const welcomeText = provider === 'openai' 
        ? "Hello! I'm your AI Architect powered by OpenAI. Tell me about your software project idea!"
        : "Hello! I'm your AI Architect powered by Google Gemini. Tell me about your software project idea!";
      
      setTranscript([{
        role: 'assistant',
        text: welcomeText,
        timestamp: new Date()
      }]);

      toast.success(`Voice mode activated with ${provider.toUpperCase()} - Start speaking!`);

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
          <div className="flex items-center gap-2 text-green-500">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span className="text-sm font-medium">Connected ({provider.toUpperCase()})</span>
          </div>
        );
      case 'error':
        return (
          <div className="flex items-center gap-2 text-red-500">
            <div className="w-2 h-2 bg-red-500 rounded-full"></div>
            <span className="text-sm font-medium">Connection Error</span>
          </div>
        );
      default:
        return (
          <div className="flex items-center gap-2 text-gray-500">
            <div className="w-2 h-2 bg-gray-500 rounded-full"></div>
            <span className="text-sm font-medium">Disconnected</span>
          </div>
        );
    }
  };

  if (!isActive && transcript.length === 0) {
    return (
      <div className="h-full flex items-center justify-center p-8">
        <div className="max-w-2xl w-full space-y-8 text-center">
          <div className="space-y-4">
            <div className="w-20 h-20 mx-auto bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
              <Radio className="w-10 h-10 text-white" />
            </div>
            <h2 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
              Voice Mode
            </h2>
            <p className="text-muted-foreground text-lg">
              Have a natural conversation with AI to design your software
            </p>
          </div>

          <div className="bg-card border rounded-xl p-6 space-y-4">
            <div className="flex items-center gap-2 mb-4">
              <Settings className="w-5 h-5" />
              <h3 className="font-semibold">Select AI Provider</h3>
            </div>
            <Select value={provider} onValueChange={setProvider} disabled={isInitializing}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select provider" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="openai" disabled={!availableProviders.openai}>
                  OpenAI Realtime API {!availableProviders.openai && "(Not Available)"}
                </SelectItem>
                <SelectItem value="gemini" disabled={!availableProviders.gemini}>
                  Google Gemini Live {!availableProviders.gemini && "(Not Available)"}
                </SelectItem>
              </SelectContent>
            </Select>
            <p className="text-sm text-muted-foreground">
              {provider === 'openai' 
                ? "Using OpenAI's GPT-4 with real-time audio capabilities"
                : "Using Google's Gemini 2.0 with live streaming"}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-left">
            <div className="bg-card border rounded-lg p-4 space-y-2">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <span className="text-2xl">💬</span>
              </div>
              <h3 className="font-semibold">Natural Conversation</h3>
              <p className="text-sm text-muted-foreground">
                Speak naturally - the AI understands context and nuance
              </p>
            </div>
            <div className="bg-card border rounded-lg p-4 space-y-2">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <span className="text-2xl">⚡</span>
              </div>
              <h3 className="font-semibold">Real-time Response</h3>
              <p className="text-sm text-muted-foreground">
                Get immediate feedback and clarification
              </p>
            </div>
            <div className="bg-card border rounded-lg p-4 space-y-2">
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                <span className="text-2xl">🎯</span>
              </div>
              <h3 className="font-semibold">Guided Design</h3>
              <p className="text-sm text-muted-foreground">
                AI asks clarifying questions to refine your vision
              </p>
            </div>
          </div>

          <Button
            onClick={handleStartConversation}
            disabled={isInitializing || (!availableProviders.openai && !availableProviders.gemini)}
            size="lg"
            className="w-full max-w-xs mx-auto h-14 text-lg bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
          >
            {isInitializing ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                Connecting...
              </>
            ) : (
              <>
                <Mic className="w-5 h-5 mr-2" />
                Start Voice Conversation
              </>
            )}
          </Button>
          
          {!availableProviders.openai && !availableProviders.gemini && (
            <p className="text-sm text-red-500">No realtime providers are currently available</p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b bg-card/50 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
            <Radio className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="font-semibold">AI Architect</h2>
            {getStatusIndicator()}
          </div>
        </div>
        <Button
          onClick={handleEndConversation}
          variant="destructive"
          size="sm"
        >
          <MicOff className="w-4 h-4 mr-2" />
          End Conversation
        </Button>
      </div>

      {/* Transcript */}
      <ScrollArea className="flex-1 p-4" ref={scrollRef}>
        <div className="space-y-4 max-w-4xl mx-auto">
          {transcript.map((message, index) => (
            <div
              key={index}
              className={`flex gap-3 ${message.role === 'user' ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2`}
            >
              {message.role === 'assistant' && (
                <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center flex-shrink-0">
                  <Radio className="w-4 h-4 text-white" />
                </div>
              )}
              <div
                className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                  message.role === 'user'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-card border'
                }`}
              >
                <p className="text-sm whitespace-pre-wrap">{message.text}</p>
                {message.timestamp && (
                  <p className="text-xs opacity-50 mt-1">
                    {new Date(message.timestamp).toLocaleTimeString()}
                  </p>
                )}
              </div>
              {message.role === 'user' && (
                <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0">
                  <User className="w-4 h-4 text-white" />
                </div>
              )}
            </div>
          ))}
        </div>
      </ScrollArea>

      {/* Active indicator */}
      {isActive && (
        <div className="p-4 border-t bg-card/50 backdrop-blur-sm">
          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <div className="flex gap-1">
              <div className="w-1 h-4 bg-purple-500 rounded-full animate-pulse" style={{animationDelay: '0ms'}}></div>
              <div className="w-1 h-4 bg-purple-500 rounded-full animate-pulse" style={{animationDelay: '150ms'}}></div>
              <div className="w-1 h-4 bg-purple-500 rounded-full animate-pulse" style={{animationDelay: '300ms'}}></div>
            </div>
            <span>Listening... Speak naturally</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default VoiceInterface;
