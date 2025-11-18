import React from 'react';
import Sidebar from './components/Sidebar';
import ChatInterface from './components/ChatInterface';

const App: React.FC = () => {
  return (
    <div className="flex flex-col md:flex-row h-screen w-screen overflow-hidden bg-space-black text-slate-200">
      {/* Sidebar - Hidden on mobile unless toggled, but for this MVP simplified to always show on desktop, stack on mobile if needed or scroll */}
      <div className="hidden md:block h-full shrink-0 z-20">
        <Sidebar />
      </div>
      
      {/* Main Content */}
      <main className="flex-1 h-full relative flex flex-col">
        <ChatInterface />
      </main>
    </div>
  );
};

export default App;