import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { FileText, Users, Layout, Sparkles } from 'lucide-react';

const Canvas = ({ artifacts, mode }) => {
  const [activeTab, setActiveTab] = useState('welcome');

  React.useEffect(() => {
    if (artifacts.length > 0) {
      const latestArtifact = artifacts[artifacts.length - 1];
      setActiveTab(latestArtifact.type);
    }
  }, [artifacts]);

  const renderMarkdown = (content) => {
    return content
      .split('\n')
      .map((line, i) => {
        if (line.startsWith('# ')) {
          return <h1 key={i} className="text-3xl font-bold text-slate-900 mt-6 mb-4">{line.substring(2)}</h1>;
        }
        if (line.startsWith('## ')) {
          return <h2 key={i} className="text-2xl font-semibold text-slate-800 mt-5 mb-3">{line.substring(3)}</h2>;
        }
        if (line.startsWith('### ')) {
          return <h3 key={i} className="text-xl font-semibold text-slate-700 mt-4 mb-2">{line.substring(4)}</h3>;
        }
        if (line.startsWith('- ')) {
          return <li key={i} className="ml-4 text-slate-700 mb-1">{line.substring(2)}</li>;
        }
        if (/^\d+\./.test(line)) {
          return <li key={i} className="ml-4 text-slate-700 mb-1">{line.substring(line.indexOf('.') + 1)}</li>;
        }
        if (line.trim() === '') {
          return <div key={i} className="h-2"></div>;
        }
        return <p key={i} className="text-slate-700 mb-2 leading-relaxed">{line}</p>;
      });
  };

  const WelcomeScreen = () => (
    <div className="flex items-center justify-center h-full p-12">
      <div className="max-w-2xl text-center">
        <div className="mb-8 flex justify-center">
          <div className="w-24 h-24 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg">
            <Sparkles className="w-12 h-12 text-white" />
          </div>
        </div>
        <h2 className="text-4xl font-bold text-slate-900 mb-4" style={{ fontFamily: 'Space Grotesk' }}>
          Welcome to AICOE Genesis
        </h2>
        <p className="text-lg text-slate-600 mb-8 leading-relaxed">
          Transform your software ideas into tangible design artifacts with AI-powered multi-agent collaboration.
        </p>
        <div className="grid grid-cols-3 gap-6 text-left">
          <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm hover:shadow-md transition">
            <FileText className="w-8 h-8 text-blue-600 mb-3" />
            <h3 className="font-semibold text-slate-900 mb-2">Vision Document</h3>
            <p className="text-sm text-slate-600">Comprehensive product vision and strategy</p>
          </div>
          <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm hover:shadow-md transition">
            <Users className="w-8 h-8 text-indigo-600 mb-3" />
            <h3 className="font-semibold text-slate-900 mb-2">Use Cases</h3>
            <p className="text-sm text-slate-600">Detailed user stories and journeys</p>
          </div>
          <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm hover:shadow-md transition">
            <Layout className="w-8 h-8 text-purple-600 mb-3" />
            <h3 className="font-semibold text-slate-900 mb-2">Prototype</h3>
            <p className="text-sm text-slate-600">Interactive HTML prototype</p>
          </div>
        </div>
        <div className="mt-8 p-4 bg-blue-50 rounded-lg border border-blue-100">
          <p className="text-sm text-blue-900">
            <strong>How it works:</strong> Choose Text Mode for structured multi-agent workflow, or Voice Mode for natural conversation.
          </p>
        </div>
      </div>
    </div>
  );

  const hasArtifacts = artifacts.length > 0;

  if (!hasArtifacts) {
    return <WelcomeScreen />;
  }

  return (
    <div className="h-full flex flex-col">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
        <div className="border-b border-slate-200 bg-white px-6 pt-6">
          <TabsList className="w-full justify-start">
            {artifacts.find(a => a.type === 'vision') && (
              <TabsTrigger value="vision" data-testid="vision-tab">
                <FileText className="w-4 h-4 mr-2" />
                Vision Document
              </TabsTrigger>
            )}
            {artifacts.find(a => a.type === 'usecases') && (
              <TabsTrigger value="usecases" data-testid="usecases-tab">
                <Users className="w-4 h-4 mr-2" />
                Use Cases
              </TabsTrigger>
            )}
            {artifacts.find(a => a.type === 'prototype') && (
              <TabsTrigger value="prototype" data-testid="prototype-tab">
                <Layout className="w-4 h-4 mr-2" />
                Prototype
              </TabsTrigger>
            )}
          </TabsList>
        </div>

        <div className="flex-1 overflow-hidden">
          {artifacts.find(a => a.type === 'vision') && (
            <TabsContent value="vision" className="h-full m-0">
              <ScrollArea className="h-full">
                <div className="p-8 max-w-4xl mx-auto" data-testid="vision-content">
                  {renderMarkdown(artifacts.find(a => a.type === 'vision').content)}
                </div>
              </ScrollArea>
            </TabsContent>
          )}

          {artifacts.find(a => a.type === 'usecases') && (
            <TabsContent value="usecases" className="h-full m-0">
              <ScrollArea className="h-full">
                <div className="p-8 max-w-4xl mx-auto" data-testid="usecases-content">
                  {renderMarkdown(artifacts.find(a => a.type === 'usecases').content)}
                </div>
              </ScrollArea>
            </TabsContent>
          )}

          {artifacts.find(a => a.type === 'prototype') && (
            <TabsContent value="prototype" className="h-full m-0">
              <div className="h-full bg-white" data-testid="prototype-content">
                <iframe
                  srcDoc={artifacts.find(a => a.type === 'prototype').content}
                  className="w-full h-full border-none"
                  title="Prototype"
                  sandbox="allow-scripts allow-same-origin"
                />
              </div>
            </TabsContent>
          )}
        </div>
      </Tabs>
    </div>
  );
};

export default Canvas;
