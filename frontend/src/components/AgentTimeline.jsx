import React, { useEffect, useRef } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { CheckCircle, Circle, Loader2, ArrowRight, Sparkles } from 'lucide-react';

const AgentTimeline = ({ agentStates, agentMessages }) => {
  const scrollRef = useRef(null);
  const agents = [
    { role: 'pm', name: 'Alex', title: 'Project Manager', color: 'blue', emoji: '🎯' },
    { role: 'ba', name: 'Brenda', title: 'Business Analyst', color: 'green', emoji: '📊' },
    { role: 'ux', name: 'Carlos', title: 'UX Designer', color: 'purple', emoji: '🎨' },
    { role: 'ui', name: 'Diana', title: 'UI Engineer', color: 'pink', emoji: '⚛️' }
  ];

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: 'smooth'
      });
    }
  }, [agentMessages, agentStates]);

  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed':
        return (
          <div className="relative animate-fade-in">
            <CheckCircle className="w-7 h-7 text-green-600" data-testid="status-completed" />
            <div className="absolute inset-0 bg-green-400 rounded-full animate-ping opacity-20"></div>
          </div>
        );
      case 'in_progress':
        return (
          <div className="relative">
            <Loader2 className="w-7 h-7 text-blue-600 animate-spin" data-testid="status-in-progress" />
            <div className="absolute inset-0 bg-blue-400 rounded-full animate-pulse opacity-30"></div>
          </div>
        );
      default:
        return <Circle className="w-7 h-7 text-slate-300" data-testid="status-pending" />;
    }
  };

  const getColorClasses = (color) => {
    const colors = {
      blue: { gradient: 'from-blue-500 to-blue-600', bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-900' },
      green: { gradient: 'from-green-500 to-green-600', bg: 'bg-green-50', border: 'border-green-200', text: 'text-green-900' },
      purple: { gradient: 'from-purple-500 to-purple-600', bg: 'bg-purple-50', border: 'border-purple-200', text: 'text-purple-900' },
      pink: { gradient: 'from-pink-500 to-pink-600', bg: 'bg-pink-50', border: 'border-pink-200', text: 'text-pink-900' }
    };
    return colors[color] || colors.blue;
  };

  return (
    <ScrollArea className="h-full" ref={scrollRef}>
      <div className="p-6 space-y-6">
        {agents.map((agent, index) => {
          const messages = agentMessages.filter(m => m.role === agent.role);
          const status = agentStates[agent.role];
          const isActive = status === 'in_progress';
          const isCompleted = status === 'completed';
          const colors = getColorClasses(agent.color);

          return (
            <div key={agent.role} className="relative">
              {/* Animated Connector Line */}
              {index < agents.length - 1 && (
                <div className="absolute left-7 top-16 w-0.5 h-full z-0">
                  <div className={`w-full h-full ${
                    isCompleted ? 'bg-gradient-to-b from-green-400 to-slate-200 animate-grow-down' : 'bg-slate-200'
                  }`}></div>
                </div>
              )}

              {/* Agent Card */}
              <div
                className={`relative rounded-2xl transition-all duration-500 transform ${
                  isActive
                    ? 'bg-white border-2 border-blue-400 shadow-2xl scale-105 animate-pulse-border'
                    : isCompleted
                    ? 'bg-white border-2 border-green-300 shadow-lg'
                    : 'bg-white border-2 border-slate-200 opacity-60'
                }`}
                data-testid={`agent-card-${agent.role}`}
              >
                {/* Glow Effect for Active */}
                {isActive && (
                  <div className="absolute -inset-1 bg-gradient-to-r from-blue-400 to-indigo-400 rounded-2xl blur-lg opacity-30 animate-pulse"></div>
                )}

                {/* Header */}
                <div className={`relative p-5 flex items-center space-x-4 rounded-t-2xl ${
                  isActive ? colors.bg : isCompleted ? 'bg-green-50' : 'bg-slate-50'
                }`}>
                  <div className="flex-shrink-0">
                    {getStatusIcon(status)}
                  </div>
                  
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-1">
                      <span className="text-2xl">{agent.emoji}</span>
                      <div className={`inline-block px-4 py-1.5 rounded-full text-white text-sm font-semibold bg-gradient-to-r ${colors.gradient} shadow-md`}>
                        {agent.name}
                      </div>
                    </div>
                    <p className="text-sm text-slate-600 font-medium ml-11">{agent.title}</p>
                  </div>
                  
                  {isActive && (
                    <div className="flex-shrink-0 animate-bounce">
                      <div className="px-4 py-2 bg-blue-600 text-white text-xs font-bold rounded-full shadow-lg flex items-center space-x-2">
                        <Sparkles className="w-3 h-3 animate-spin" />
                        <span>Working...</span>
                      </div>
                    </div>
                  )}
                  {isCompleted && (
                    <div className="flex-shrink-0 animate-fade-in">
                      <div className="px-4 py-2 bg-green-600 text-white text-xs font-bold rounded-full shadow-lg">
                        ✓ Complete
                      </div>
                    </div>
                  )}
                </div>

                {/* Messages */}
                {messages.length > 0 && (
                  <div className="p-5 space-y-3 bg-slate-50/50">
                    {messages.map((msg, idx) => (
                      <div
                        key={idx}
                        className="bg-white rounded-xl p-4 border-l-4 shadow-sm hover:shadow-md transition-all duration-300 animate-slide-in"
                        style={{
                          borderLeftColor: `var(--${agent.color}-500)`,
                          animationDelay: `${idx * 0.1}s`
                        }}
                        data-testid={`agent-message-${agent.role}`}
                      >
                        <div className="flex items-start space-x-3">
                          <div className={`w-8 h-8 rounded-full bg-gradient-to-br ${colors.gradient} flex items-center justify-center text-white text-xs font-bold flex-shrink-0 shadow-md`}>
                            {agent.emoji}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-sm text-slate-800 leading-relaxed whitespace-pre-wrap break-words">
                              {msg.message}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Handoff Indicator */}
              {isCompleted && index < agents.length - 1 && (
                <div className="flex items-center justify-center py-4 animate-slide-in" style={{ animationDelay: '0.3s' }}>
                  <div className="relative">
                    <div className="absolute inset-0 bg-gradient-to-r from-blue-400 to-indigo-400 rounded-full blur-md opacity-30 animate-pulse"></div>
                    <div className="relative flex items-center space-x-3 px-6 py-3 bg-gradient-to-r from-blue-500 to-indigo-500 text-white rounded-full shadow-lg">
                      <span className="text-xs font-bold">Handoff to</span>
                      <ArrowRight className="w-4 h-4 animate-pulse" />
                      <span className="text-xs font-bold">{agents[index + 1].name}</span>
                      <span className="text-lg">{agents[index + 1].emoji}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </ScrollArea>
  );
};

export default AgentTimeline;