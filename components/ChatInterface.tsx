import React, { useState, useEffect, useRef } from 'react';
import { GoogleGenAI, Chat, GenerateContentResponse } from "@google/genai";
import { ChatMessage, MessageRole } from '../types';
import { ECHO_SYSTEM_INSTRUCTION } from '../constants';

const ChatInterface: React.FC = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'init',
      role: MessageRole.MODEL,
      text: "ECHO System Online. Connected to Argo IX Mainframe. How can I assist you with Mission Aurora today?",
      timestamp: new Date(),
    }
  ]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // We keep the chat instance in a ref to persist context
  const chatSessionRef = useRef<Chat | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Initialize Chat Session
  useEffect(() => {
    const initChat = async () => {
      try {
        const apiKey = process.env.API_KEY;
        if (!apiKey) {
          setError("System Alert: API Key missing from environmental controls.");
          return;
        }

        const ai = new GoogleGenAI({ apiKey });
        
        chatSessionRef.current = ai.chats.create({
          model: 'gemini-2.5-flash',
          config: {
            systemInstruction: ECHO_SYSTEM_INSTRUCTION,
            temperature: 0.7, 
            maxOutputTokens: 1000,
          },
        });
      } catch (err) {
        console.error("Failed to initialize ECHO:", err);
        setError("Critical Error: Unable to interface with Neural Core.");
      }
    };

    initChat();
  }, []);

  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    
    // Capture the current chat session locally to ensure it doesn't change or become null during async ops
    const chat = chatSessionRef.current;

    if (!inputText.trim() || !chat || isLoading) return;

    const userMsgText = inputText;
    setInputText('');
    setError(null);

    // Add User Message
    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: MessageRole.USER,
      text: userMsgText,
      timestamp: new Date()
    };
    setMessages(prev => [...prev, userMsg]);
    setIsLoading(true);

    try {
      // Create a placeholder for the streaming response
      const responseId = (Date.now() + 1).toString();
      setMessages(prev => [...prev, {
        id: responseId,
        role: MessageRole.MODEL,
        text: '',
        timestamp: new Date(),
        isStreaming: true
      }]);

      const resultStream = await chat.sendMessageStream({ message: userMsgText });
      
      let fullText = '';
      
      for await (const chunk of resultStream) {
        const chunkText = (chunk as GenerateContentResponse).text;
        if (chunkText) {
            fullText += chunkText;
            setMessages(prev => prev.map(msg => 
                msg.id === responseId 
                ? { ...msg, text: fullText }
                : msg
            ));
        }
      }

      // Mark streaming as done
      setMessages(prev => prev.map(msg => 
        msg.id === responseId 
        ? { ...msg, isStreaming: false }
        : msg
      ));

    } catch (err) {
      console.error("Communication breakdown:", err);
      setError("Transmission Error: Link to ECHO unstable.");
      setIsLoading(false);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col flex-1 h-full relative bg-[url('https://picsum.photos/id/903/1600/900')] bg-cover bg-center">
      {/* Overlay to darken image and add grid texture */}
      <div className="absolute inset-0 bg-slate-950/90 z-0"></div>
      <div className="absolute inset-0 bg-[linear-gradient(rgba(0,240,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(0,240,255,0.03)_1px,transparent_1px)] bg-[size:40px_40px] z-0 pointer-events-none"></div>

      {/* Header */}
      <div className="relative z-10 p-4 border-b border-cyan-900/30 bg-slate-950/50 backdrop-blur flex justify-between items-center">
        <div className="flex items-center gap-3">
            <div className={`w-2 h-2 rounded-full ${error ? 'bg-red-500' : 'bg-holo-cyan animate-pulse-slow'}`}></div>
            <span className="font-mono text-sm text-cyan-400 tracking-widest">ECHO INTERFACE // ONLINE</span>
        </div>
        <div className="font-mono text-xs text-cyan-700">
            STARDATE {new Date().getFullYear()}.{new Date().getMonth() + 1}.{new Date().getDate()}
        </div>
      </div>

      {/* Messages Area */}
      <div className="relative z-10 flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg) => (
          <div 
            key={msg.id} 
            className={`flex ${msg.role === MessageRole.USER ? 'justify-end' : 'justify-start'}`}
          >
            <div 
              className={`max-w-[80%] md:max-w-[70%] rounded p-4 border ${
                msg.role === MessageRole.USER 
                  ? 'bg-cyan-950/40 border-cyan-700/50 text-cyan-50' 
                  : 'bg-slate-900/80 border-cyan-900/30 text-cyan-100 shadow-[0_0_15px_rgba(0,240,255,0.1)]'
              }`}
            >
              <div className="flex items-center gap-2 mb-2 border-b border-white/5 pb-1">
                <span className="text-[10px] font-mono uppercase tracking-wider opacity-70">
                    {msg.role === MessageRole.USER ? 'CMD // COMMANDER' : 'AI // ECHO'}
                </span>
                <span className="text-[10px] font-mono opacity-40 ml-auto">
                    {msg.timestamp.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                </span>
              </div>
              <div className="font-sans text-sm md:text-base leading-relaxed whitespace-pre-wrap">
                {msg.text}
                {msg.isStreaming && (
                    <span className="inline-block w-2 h-4 ml-1 bg-holo-cyan animate-pulse align-middle"></span>
                )}
              </div>
            </div>
          </div>
        ))}
        {error && (
            <div className="flex justify-center">
                <div className="bg-red-900/20 border border-red-500/50 text-red-400 px-4 py-2 rounded font-mono text-sm">
                    ! {error}
                </div>
            </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="relative z-10 p-4 bg-slate-950/80 border-t border-cyan-900/30 backdrop-blur">
        <form onSubmit={handleSendMessage} className="flex gap-2 max-w-5xl mx-auto">
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            disabled={isLoading}
            placeholder="Enter query for Mission Control..."
            className="flex-1 bg-slate-900/50 border border-cyan-900/50 rounded px-4 py-3 text-cyan-100 focus:outline-none focus:border-holo-cyan/70 focus:shadow-[0_0_10px_rgba(0,240,255,0.2)] font-mono text-sm placeholder-cyan-800 transition-all"
          />
          <button
            type="submit"
            disabled={isLoading || !inputText.trim()}
            className="bg-cyan-900/30 hover:bg-cyan-800/40 text-holo-cyan border border-cyan-700/50 px-6 py-2 rounded font-mono tracking-widest uppercase text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-[0_0_10px_rgba(0,240,255,0.2)]"
          >
            {isLoading ? 'Processing...' : 'Transmit'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default ChatInterface;