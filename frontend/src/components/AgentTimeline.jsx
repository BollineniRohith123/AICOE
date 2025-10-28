import React from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { CheckCircle, Circle, Loader2, ArrowRight } from 'lucide-react';

const AgentTimeline = ({ agentStates, agentMessages }) => {
  const agents = [
    { role: 'pm', name: 'Alex', title: 'Project Manager', color: 'blue' },
    { role: 'ba', name: 'Brenda', title: 'Business Analyst', color: 'green' },
    { role: 'ux', name: 'Carlos', title: 'UX Designer', color: 'purple' },
    { role: 'ui', name: 'Diana', title: 'UI Engineer', color: 'pink' }
  ];

  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-6 h-6 text-green-600" data-testid={`status-completed`} />;
      case 'in_progress':
        return <Loader2 className="w-6 h-6 text-blue-600 animate-spin" data-testid={`status-in-progress`} />;
      default:
        return <Circle className="w-6 h-6 text-slate-300" data-testid={`status-pending`} />;
    }
  };

  const getColorClasses = (color) => {
    const colors = {
      blue: 'from-blue-500 to-blue-600',
      green: 'from-green-500 to-green-600',
      purple: 'from-purple-500 to-purple-600',
      pink: 'from-pink-500 to-pink-600'
    };
    return colors[color] || colors.blue;
  };

  return (
    <ScrollArea className="h-full">
      <div className="p-6 space-y-6">
        {agents.map((agent, index) => {
          const messages = agentMessages.filter(m => m.role === agent.role);
          const status = agentStates[agent.role];
          const isActive = status === 'in_progress';
          const isCompleted = status === 'completed';

          return (
            <div key={agent.role} className="relative">
              {/* Connector Line */}
              {index < agents.length - 1 && (
                <div className="absolute left-6 top-12 w-0.5 h-full bg-slate-200 z-0" />
              )}

              {/* Agent Card */}
              <div
                className={`relative bg-white rounded-xl border-2 transition-all ${
                  isActive ? 'border-blue-400 shadow-lg' : isCompleted ? 'border-green-300 shadow-md' : 'border-slate-200'
                }`}
                data-testid={`agent-card-${agent.role}`}
              >
                {/* Header */}
                <div className="p-4 flex items-center space-x-4">
                  <div className="flex-shrink-0">
                    {getStatusIcon(status)}
                  </div>
                  <div className="flex-1">
                    <div className={`inline-block px-3 py-1 rounded-full text-white text-sm font-medium bg-gradient-to-r ${getColorClasses(agent.color)}`}>
                      {agent.name}
                    </div>
                    <p className="text-sm text-slate-600 mt-1">{agent.title}</p>
                  </div>
                  {isActive && (
                    <div className="flex-shrink-0">
                      <div className="px-3 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded-full">
                        Working...
                      </div>
                    </div>
                  )}
                  {isCompleted && (
                    <div className="flex-shrink-0">
                      <div className="px-3 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full">
                        Complete
                      </div>
                    </div>
                  )}
                </div>

                {/* Messages */}
                {messages.length > 0 && (
                  <div className="px-4 pb-4 space-y-3">
                    {messages.map((msg, idx) => (
                      <div key={idx} className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                        <div className="text-sm text-slate-700 whitespace-pre-wrap" data-testid={`agent-message-${agent.role}`}>
                          {msg.message}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Handoff Indicator */}
              {isCompleted && index < agents.length - 1 && (
                <div className="flex items-center justify-center py-3 animate-slide-in">
                  <div className="flex items-center space-x-2 px-4 py-2 bg-slate-100 rounded-full">
                    <span className="text-xs text-slate-600 font-medium">Handoff to</span>
                    <ArrowRight className="w-4 h-4 text-slate-600" />
                    <span className="text-xs text-slate-900 font-semibold">{agents[index + 1].name}</span>
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
