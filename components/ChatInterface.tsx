import React, { useState, useEffect, useRef } from 'react';
import { GoogleGenAI, Chat, GenerateContentResponse } from "@google/genai";
import { ChatMessage, MessageRole } from '../types';
import { ECHO_SYSTEM_INSTRUCTION } from '../constants';

const ChatInterface: React.FC = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'init',
      role: MessageRole.MODEL,
      text: "Sistema ECHO Online. Conectado ao Mainframe da Argo IX. Como posso ajudar na Missão Aurora hoje?",
      timestamp: new Date(),
    }
  ]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isAuthRequired, setIsAuthRequired] = useState(false);
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

  const initChat = async () => {
    try {
      // In this environment, we must ensure we have a key before proceeding.
      // We try process.env.API_KEY first, then check if the user needs to select one via aistudio.
      let hasKey = false;
      
      if (process.env.API_KEY) {
        hasKey = true;
      } else if (window.aistudio) {
        hasKey = await window.aistudio.hasSelectedApiKey();
      }

      if (!hasKey) {
        setIsAuthRequired(true);
        return;
      }

      // If we have a key (or assume we do after check), we initialize.
      // We rely on process.env.API_KEY being populated by the environment after selection.
      const apiKey = process.env.API_KEY;
      
      // If still no key variable after checks, we can't proceed, but we'll let the loop handle it
      // or show the auth screen if aistudio is available.
      if (!apiKey) {
         if (window.aistudio) {
             setIsAuthRequired(true);
             return;
         } else {
             setError("Alerta do Sistema: Chave de API ausente nos controles ambientais.");
             return;
         }
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
      
      // If successful, ensure auth screen is hidden and error cleared
      setIsAuthRequired(false);
      setError(null);

    } catch (err) {
      console.error("Failed to initialize ECHO:", err);
      setError("Erro Crítico: Incapaz de conectar ao Núcleo Neural.");
    }
  };

  // Initialize on mount
  useEffect(() => {
    initChat();
  }, []);

  const handleAuthClick = async () => {
      if (window.aistudio) {
          try {
            await window.aistudio.openSelectKey();
            // After selection, re-run initialization
            await initChat();
          } catch (e) {
            console.error("Falha na seleção de autenticação", e);
          }
      }
  };

  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    
    // Capture local ref
    let chat = chatSessionRef.current;

    // If chat isn't ready, try initializing one last time (e.g. if key was just set)
    if (!chat) {
        await initChat();
        chat = chatSessionRef.current;
    }

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

    } catch (err: any) {
      console.error("Communication breakdown:", err);
      
      // Handle specific key error
      if (err.message && err.message.includes("Requested entity was not found")) {
          setError("Token de Segurança Inválido. Reautorização necessária.");
          setIsAuthRequired(true);
          chatSessionRef.current = null; // Reset session
      } else {
          setError("Erro de Transmissão: Link com ECHO instável.");
      }
      
      setIsLoading(false);
      
      // Clean up the streaming message if it failed empty
      setMessages(prev => prev.map(msg => 
        msg.isStreaming 
        ? { ...msg, isStreaming: false, text: msg.text || "Transmissão interrompida." } 
        : msg
      ));

    } finally {
      setIsLoading(false);
    }
  };

  // Render Auth Screen if needed
  if (isAuthRequired) {
      return (
        <div className="flex flex-col flex-1 h-full relative bg-[url('https://picsum.photos/id/903/1600/900')] bg-cover bg-center items-center justify-center">
            <div className="absolute inset-0 bg-slate-950/90 z-0"></div>
            <div className="relative z-10 p-8 bg-slate-900/90 border border-cyan-500/30 rounded-lg shadow-[0_0_50px_rgba(0,240,255,0.1)] max-w-md text-center backdrop-blur-md">
                <div className="w-16 h-16 border-2 border-holo-cyan rounded-full flex items-center justify-center mx-auto mb-6 animate-pulse-slow">
                    <div className="w-10 h-10 bg-holo-cyan/20 rounded-full"></div>
                </div>
                <h2 className="text-2xl font-bold text-white font-mono mb-2 tracking-widest">ALERTA DE SEGURANÇA</h2>
                <p className="text-cyan-400/80 font-mono text-sm mb-8">
                    É necessária autorização do Neural Link para acessar o mainframe do ECHO.
                </p>
                <button 
                    onClick={handleAuthClick}
                    className="bg-holo-cyan/10 hover:bg-holo-cyan/20 text-holo-cyan border border-holo-cyan px-8 py-3 rounded font-mono tracking-widest uppercase transition-all hover:shadow-[0_0_20px_rgba(0,240,255,0.3)]"
                >
                    INICIALIZAR CONEXÃO
                </button>
                <p className="mt-6 text-[10px] text-cyan-700 font-mono">
                    CONTROLE DA MISSÃO // PROTOCOLO AURORA
                </p>
            </div>
        </div>
      );
  }

  return (
    <div className="flex flex-col flex-1 h-full relative bg-[url('https://picsum.photos/id/903/1600/900')] bg-cover bg-center">
      {/* Overlay to darken image and add grid texture */}
      <div className="absolute inset-0 bg-slate-950/90 z-0"></div>
      <div className="absolute inset-0 bg-[linear-gradient(rgba(0,240,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(0,240,255,0.03)_1px,transparent_1px)] bg-[size:40px_40px] z-0 pointer-events-none"></div>

      {/* Header */}
      <div className="relative z-10 p-4 border-b border-cyan-900/30 bg-slate-950/50 backdrop-blur flex justify-between items-center">
        <div className="flex items-center gap-3">
            <div className={`w-2 h-2 rounded-full ${error ? 'bg-red-500' : 'bg-holo-cyan animate-pulse-slow'}`}></div>
            <span className="font-mono text-sm text-cyan-400 tracking-widest">INTERFACE ECHO // ONLINE</span>
        </div>
        <div className="font-mono text-xs text-cyan-700">
            DATA ESTELAR {new Date().getFullYear()}.{new Date().getMonth() + 1}.{new Date().getDate()}
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
            <div className="flex justify-center">
                <div className="bg-red-900/20 border border-red-500/50 text-red-400 px-4 py-2 rounded font-mono text-sm backdrop-blur-sm">
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
            placeholder="Insira o comando para o Controle da Missão..."
            className="flex-1 bg-slate-900/50 border border-cyan-900/50 rounded px-4 py-3 text-cyan-100 focus:outline-none focus:border-holo-cyan/70 focus:shadow-[0_0_10px_rgba(0,240,255,0.2)] font-mono text-sm placeholder-cyan-800 transition-all"
          />
          <button
            type="submit"
            disabled={isLoading || !inputText.trim()}
            className="bg-cyan-900/30 hover:bg-cyan-800/40 text-holo-cyan border border-cyan-700/50 px-6 py-2 rounded font-mono tracking-widest uppercase text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-[0_0_10px_rgba(0,240,255,0.2)]"
          >
            {isLoading ? 'Processando...' : 'Transmitir'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default ChatInterface;