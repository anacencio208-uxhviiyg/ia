
import React, { useState, useEffect, useRef } from 'react';
import { GoogleGenAI, Chat, GenerateContentResponse } from "@google/genai";
import { ChatMessage, MessageRole } from '../types';
import { ECHO_SYSTEM_INSTRUCTION } from '../constants';

const ChatInterface: React.FC = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'init',
      role: MessageRole.MODEL,
      text: "Sistema ECHO Online. Conectado ao Mainframe da Argo IX. Aguardando comandos da missão.",
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

  const getChatSession = async () => {
    // If we already have a session, return it
    if (chatSessionRef.current) {
      return chatSessionRef.current;
    }

    // Check/Request API Key
    let apiKey = process.env.API_KEY;
    
    // If no key in env, try the window.aistudio helper
    if (!apiKey && window.aistudio) {
      const hasKey = await window.aistudio.hasSelectedApiKey();
      if (!hasKey) {
        await window.aistudio.openSelectKey();
      }
      // In some environments, we might need to wait a tick or access the updated env
      apiKey = process.env.API_KEY;
    }

    if (!apiKey) {
      throw new Error("Chave de acesso neural não detectada.");
    }

    // Initialize GenAI
    const ai = new GoogleGenAI({ apiKey });
    
    const chat = ai.chats.create({
      model: 'gemini-2.5-flash',
      config: {
        systemInstruction: ECHO_SYSTEM_INSTRUCTION,
        temperature: 0.7, 
      },
    });
    
    chatSessionRef.current = chat;
    return chat;
  };

  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    
    if (!inputText.trim() || isLoading) return;

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

    // Create a placeholder for the streaming response
    const responseId = (Date.now() + 1).toString();
    setMessages(prev => [...prev, {
      id: responseId,
      role: MessageRole.MODEL,
      text: '',
      timestamp: new Date(),
      isStreaming: true
    }]);

    try {
      const chat = await getChatSession();
      
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

    } catch (err: any) {
      console.error("Communication breakdown:", err);
      
      // Handle specific API Key errors by forcing a reset of the session
      if (err.message && (err.message.includes("API key") || err.message.includes("403") || err.message.includes("not found"))) {
          chatSessionRef.current = null; // Reset session
          setError("Erro de Autenticação: Chave inválida ou expirada. Tente novamente.");
          if (window.aistudio) {
             // Prompt user again if possible
             try { await window.aistudio.openSelectKey(); } catch(e) {}
          }
      } else {
          setError(`Erro de Sistema: ${err.message || "Falha na comunicação com ECHO."}`);
      }
      
      // Clean up the streaming message if it failed empty
      setMessages(prev => prev.map(msg => 
        msg.id === responseId
        ? { ...msg, isStreaming: false, text: msg.text || " [SINAL PERDIDO] " } 
        : msg
      ));

    } finally {
      setIsLoading(false);
    }
  };

  // Try to connect on mount silently
  useEffect(() => {
    getChatSession().catch(() => {
        // Ignore initial errors, we'll catch them when the user tries to send
        // or we could show a "System Offline" indicator status here.
    });
  }, []);

  return (
    <div className="flex flex-col flex-1 h-full relative bg-[url('https://picsum.photos/id/903/1600/900')] bg-cover bg-center">
      {/* Overlay to darken image and add grid texture */}
      <div className="absolute inset-0 bg-slate-950/90 z-0"></div>
      <div className="absolute inset-0 bg-[linear-gradient(rgba(0,240,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(0,240,255,0.03)_1px,transparent_1px)] bg-[size:40px_40px] z-0 pointer-events-none"></div>

      {/* Header */}
      <div className="relative z-10 p-4 border-b border-cyan-900/30 bg-slate-950/50 backdrop-blur flex justify-between items-center">
        <div className="flex items-center gap-3">
            <div className={`w-2 h-2 rounded-full ${error ? 'bg-alert-red animate-pulse' : 'bg-holo-cyan animate-pulse-slow'}`}></div>
            <span className={`font-mono text-sm tracking-widest ${error ? 'text-alert-red' : 'text-cyan-400'}`}>
              {error ? 'ALERTA DE SISTEMA' : 'INTERFACE ECHO // ONLINE'}
            </span>
        </div>
        <div className="font-mono text-xs text-cyan-700 hidden sm:block">
            DATA ESTELAR {new Date().getFullYear()}.{new Date().getMonth() + 1}.{new Date().getDate()}
        </div>
      </div>

      {/* Messages Area */}
      <div className="relative z-10 flex-1 overflow-y-auto p-4 space-y-4 scroll-smooth">
        {messages.map((msg) => (
          <div 
            key={msg.id} 
            className={`flex ${msg.role === MessageRole.USER ? 'justify-end' : 'justify-start'}`}
          >
            <div 
              className={`max-w-[85%] md:max-w-[70%] rounded p-4 border ${
                msg.role === MessageRole.USER 
                  ? 'bg-cyan-950/40 border-cyan-700/50 text-cyan-50' 
                  : 'bg-slate-900/90 border-cyan-900/30 text-cyan-100 shadow-[0_0_15px_rgba(0,240,255,0.1)]'
              }`}
            >
              <div className="flex items-center gap-2 mb-2 border-b border-white/5 pb-1">
                <span className={`text-[10px] font-mono uppercase tracking-wider opacity-70 ${msg.role === MessageRole.MODEL ? 'text-holo-cyan' : 'text-emerald-400'}`}>
                    {msg.role === MessageRole.USER ? 'CMD // COMANDANTE' : 'IA // ECHO'}
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
            <div className="flex justify-center animate-pulse">
                <div className="bg-red-950/80 border border-red-500/50 text-red-400 px-6 py-2 rounded font-mono text-xs backdrop-blur-sm shadow-[0_0_10px_rgba(255,0,0,0.2)]">
                    ⚠ {error}
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
            placeholder={isLoading ? "Recebendo transmissão..." : "Insira o comando para o Controle da Missão..."}
            className="flex-1 bg-slate-900/50 border border-cyan-900/50 rounded px-4 py-3 text-cyan-100 focus:outline-none focus:border-holo-cyan/70 focus:shadow-[0_0_10px_rgba(0,240,255,0.2)] font-mono text-sm placeholder-cyan-800 transition-all disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={isLoading || !inputText.trim()}
            className="bg-cyan-900/30 hover:bg-cyan-800/40 text-holo-cyan border border-cyan-700/50 px-6 py-2 rounded font-mono tracking-widest uppercase text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-[0_0_10px_rgba(0,240,255,0.2)] flex items-center gap-2"
          >
            {isLoading ? (
                <>
                 <span className="w-2 h-2 bg-holo-cyan animate-ping rounded-full"></span>
                 <span className="hidden md:inline">Enviando</span>
                </>
            ) : 'Transmitir'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default ChatInterface;
