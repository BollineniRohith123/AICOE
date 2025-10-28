import React, { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { FileText, Users, Layout, Sparkles, Code, Eye } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
// Temporary simple code highlighter to fix compilation issues
const SyntaxHighlighter = ({ children, language, style, customStyle, showLineNumbers, ...props }) => (
  <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-auto text-sm font-mono" style={customStyle}>
    <code>{children}</code>
  </pre>
);
import ReactRenderer from './ReactRenderer';

const EnhancedCanvas = ({ artifacts, mode }) => {
  const [activeTab, setActiveTab] = useState('welcome');
  const [prototypeView, setPrototypeView] = useState('preview'); // 'preview' or 'code'

  useEffect(() => {
    if (artifacts.length > 0) {
      const latestArtifact = artifacts[artifacts.length - 1];
      setActiveTab(latestArtifact.type);
    }
  }, [artifacts]);

  const WelcomeScreen = () => (
    <div className="flex items-center justify-center h-full p-12">
      <div className="max-w-3xl text-center animate-fade-in">
        <div className="mb-8 flex justify-center">
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl blur-xl opacity-30 animate-pulse"></div>
            <div className="relative w-28 h-28 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-2xl transform hover:scale-110 transition-transform duration-300">
              <Sparkles className="w-14 h-14 text-white" />
            </div>
          </div>
        </div>
        <h2 className="text-5xl font-bold text-slate-900 mb-4 animate-slide-in" style={{ fontFamily: 'Space Grotesk' }}>
          Welcome to AICOE Genesis
        </h2>
        <p className="text-xl text-slate-600 mb-10 leading-relaxed animate-fade-in" style={{ animationDelay: '0.2s' }}>
          Transform your software ideas into tangible design artifacts with AI-powered multi-agent collaboration.
        </p>
        <div className="grid grid-cols-3 gap-8 text-left">
          {[
            { icon: FileText, color: 'blue', title: 'Vision Document', desc: 'Comprehensive product strategy and vision' },
            { icon: Users, color: 'indigo', title: 'Use Cases', desc: 'Detailed user stories and journeys' },
            { icon: Layout, color: 'purple', title: 'React Prototype', desc: 'Interactive React application' }
          ].map((item, idx) => (
            <div
              key={item.title}
              className="group bg-white rounded-2xl p-6 border border-slate-200 shadow-sm hover:shadow-xl transition-all duration-300 transform hover:-translate-y-2 animate-fade-in"
              style={{ animationDelay: `${0.3 + idx * 0.1}s` }}
            >
              <div className={`w-14 h-14 bg-gradient-to-br from-${item.color}-100 to-${item.color}-200 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300`}>
                <item.icon className={`w-7 h-7 text-${item.color}-600`} />
              </div>
              <h3 className="font-semibold text-slate-900 mb-2 text-lg">{item.title}</h3>
              <p className="text-sm text-slate-600 leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>
        <div className="mt-10 p-5 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl border border-blue-100 animate-fade-in" style={{ animationDelay: '0.6s' }}>
          <p className="text-sm text-slate-800">
            <strong className="text-blue-900">How it works:</strong> Choose Text Mode for structured multi-agent workflow, or Voice Mode for natural conversation.
          </p>
        </div>
      </div>
    </div>
  );

  const renderMarkdownWithCode = (content) => (
    <ReactMarkdown
      className="prose prose-slate max-w-none"
      components={{
        h1: ({ children }) => (
          <h1 className="text-4xl font-bold text-slate-900 mt-8 mb-4 pb-3 border-b-2 border-blue-200 animate-slide-in">
            {children}
          </h1>
        ),
        h2: ({ children }) => (
          <h2 className="text-3xl font-semibold text-slate-800 mt-7 mb-3 animate-slide-in">
            {children}
          </h2>
        ),
        h3: ({ children }) => (
          <h3 className="text-2xl font-semibold text-slate-700 mt-6 mb-2 animate-fade-in">
            {children}
          </h3>
        ),
        p: ({ children }) => (
          <p className="text-slate-700 mb-4 leading-relaxed animate-fade-in">
            {children}
          </p>
        ),
        ul: ({ children }) => (
          <ul className="list-none space-y-2 my-4 animate-fade-in">
            {children}
          </ul>
        ),
        li: ({ children }) => (
          <li className="flex items-start space-x-3 text-slate-700 animate-slide-in">
            <span className="text-blue-600 mt-1 flex-shrink-0">•</span>
            <span>{children}</span>
          </li>
        ),
        code: ({ inline, className, children }) => {
          const match = /language-(\w+)/.exec(className || '');
          return !inline && match ? (
            <SyntaxHighlighter
              language={match[1]}
              className="rounded-lg my-4 animate-fade-in"
            >
              {String(children).replace(/\n$/, '')}
            </SyntaxHighlighter>
          ) : (
            <code className="bg-slate-100 text-slate-800 px-2 py-1 rounded text-sm font-mono">
              {children}
            </code>
          );
        },
        blockquote: ({ children }) => (
          <blockquote className="border-l-4 border-blue-500 pl-4 py-2 my-4 bg-blue-50 italic text-slate-700 animate-fade-in">
            {children}
          </blockquote>
        ),
      }}
    >
      {content}
    </ReactMarkdown>
  );

  const hasArtifacts = artifacts.length > 0;

  if (!hasArtifacts) {
    return <WelcomeScreen />;
  }

  const prototypeArtifact = artifacts.find(a => a.type === 'prototype');

  return (
    <div className="h-full flex flex-col bg-gradient-to-br from-slate-50 to-blue-50">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
        <div className="border-b border-slate-200 bg-white/80 backdrop-blur-sm px-6 pt-6 shadow-sm">
          <TabsList className="w-full justify-start bg-slate-100 p-1">
            {artifacts.find(a => a.type === 'vision') && (
              <TabsTrigger
                value="vision"
                className="data-[state=active]:bg-white data-[state=active]:shadow-sm transition-all duration-200"
                data-testid="vision-tab"
              >
                <FileText className="w-4 h-4 mr-2" />
                Vision Document
              </TabsTrigger>
            )}
            {artifacts.find(a => a.type === 'usecases') && (
              <TabsTrigger
                value="usecases"
                className="data-[state=active]:bg-white data-[state=active]:shadow-sm transition-all duration-200"
                data-testid="usecases-tab"
              >
                <Users className="w-4 h-4 mr-2" />
                Use Cases
              </TabsTrigger>
            )}
            {prototypeArtifact && (
              <TabsTrigger
                value="prototype"
                className="data-[state=active]:bg-white data-[state=active]:shadow-sm transition-all duration-200"
                data-testid="prototype-tab"
              >
                <Layout className="w-4 h-4 mr-2" />
                React Prototype
              </TabsTrigger>
            )}
          </TabsList>
        </div>

        <div className="flex-1 overflow-hidden">
          {artifacts.find(a => a.type === 'vision') && (
            <TabsContent value="vision" className="h-full m-0 animate-fade-in">
              <ScrollArea className="h-full">
                <div className="p-10 max-w-5xl mx-auto" data-testid="vision-content">
                  {renderMarkdownWithCode(artifacts.find(a => a.type === 'vision').content)}
                </div>
              </ScrollArea>
            </TabsContent>
          )}

          {artifacts.find(a => a.type === 'usecases') && (
            <TabsContent value="usecases" className="h-full m-0 animate-fade-in">
              <ScrollArea className="h-full">
                <div className="p-10 max-w-5xl mx-auto" data-testid="usecases-content">
                  {renderMarkdownWithCode(artifacts.find(a => a.type === 'usecases').content)}
                </div>
              </ScrollArea>
            </TabsContent>
          )}

          {prototypeArtifact && (
            <TabsContent value="prototype" className="h-full m-0 animate-fade-in">
              <div className="h-full flex flex-col">
                {/* View Toggle */}
                <div className="bg-white border-b border-slate-200 px-6 py-3 flex items-center justify-between">
                  <h3 className="font-semibold text-slate-900">React Application</h3>
                  <div className="flex items-center space-x-2 bg-slate-100 rounded-lg p-1">
                    <Button
                      variant={prototypeView === 'preview' ? 'default' : 'ghost'}
                      size="sm"
                      onClick={() => setPrototypeView('preview')}
                      className="transition-all duration-200"
                    >
                      <Eye className="w-4 h-4 mr-2" />
                      Preview
                    </Button>
                    <Button
                      variant={prototypeView === 'code' ? 'default' : 'ghost'}
                      size="sm"
                      onClick={() => setPrototypeView('code')}
                      className="transition-all duration-200"
                    >
                      <Code className="w-4 h-4 mr-2" />
                      Code
                    </Button>
                  </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-hidden" data-testid="prototype-content">
                  {prototypeView === 'preview' ? (
                    <div className="h-full bg-white">
                      <ReactRenderer code={prototypeArtifact.content} />
                    </div>
                  ) : (
                    <ScrollArea className="h-full bg-slate-900">
                      <div className="p-6">
                        <SyntaxHighlighter
                          language="javascript"
                          customStyle={{
                            margin: 0,
                            borderRadius: '0.5rem',
                            fontSize: '0.875rem',
                          }}
                          showLineNumbers
                        >
                          {prototypeArtifact.content}
                        </SyntaxHighlighter>
                      </div>
                    </ScrollArea>
                  )}
                </div>
              </div>
            </TabsContent>
          )}
        </div>
      </Tabs>
    </div>
  );
};

export default EnhancedCanvas;