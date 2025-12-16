import { useState, useEffect, useRef } from 'react';
import { MessageCircle, Send, Loader2, AlertCircle, X } from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { getAttacks } from '../services/supabase';
import { createSystemMessage, sendChatMessage, openai } from '../services/openai';
import type { Attack } from '../types';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export const Chatbot: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [allAttacks, setAllAttacks] = useState<Attack[]>([]);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const systemMessageRef = useRef<string | null>(null);

  // Fetch all attacks data when component mounts
  useEffect(() => {
    const loadAllAttacks = async () => {
      setIsLoadingData(true);
      setError(null);
      try {
        // Fetch all attacks (with a high limit)
        const result = await getAttacks({ limit: 10000 });
        setAllAttacks(result.data);
        
        // Create system message with all attack data
        const systemMsg = createSystemMessage(result.data);
        systemMessageRef.current = systemMsg;
        
        // Add welcome message
        setMessages([{
          role: 'assistant',
          content: `Hello! I'm your AI assistant for analyzing cryptocurrency protocol attacks. You can ask me questions about specific attacks, protocols, attack types, statistics, trends, or any insights about the data that you see in the dashboard. What would you like to know?`,
          timestamp: new Date(),
        }]);
      } catch (err: any) {
        console.error('Error loading attacks:', err);
        setError(err.message || 'Failed to load attack data');
      } finally {
        setIsLoadingData(false);
      }
    };

    loadAllAttacks();
  }, []);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading || !openai) return;

    const userMessage: Message = {
      role: 'user',
      content: input.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);
    setError(null);

    try {
      // Prepare messages for OpenAI (system + conversation history)
      const openaiMessages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [];
      
      // Add system message with all attack data
      if (systemMessageRef.current) {
        openaiMessages.push({
          role: 'system',
          content: systemMessageRef.current,
        });
      }

      // Add conversation history (excluding the welcome message)
      const conversationMessages = messages
        .filter((msg) => msg.role !== 'assistant' || !msg.content.includes('Hello! I\'m your AI assistant'))
        .map((msg) => ({
          role: msg.role as 'user' | 'assistant',
          content: msg.content,
        }));

      openaiMessages.push(...conversationMessages);
      openaiMessages.push({
        role: 'user',
        content: userMessage.content,
      });

      // Get response from OpenAI
      const response = await sendChatMessage(openaiMessages);

      const assistantMessage: Message = {
        role: 'assistant',
        content: response,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (err: any) {
      console.error('Error sending message:', err);
      setError(err.message || 'Failed to get response');
      setMessages((prev) => [...prev, {
        role: 'assistant',
        content: `Sorry, I encountered an error: ${err.message || 'Failed to get response'}. Please try again.`,
        timestamp: new Date(),
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (isLoadingData) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-8">
        <Card className="max-w-2xl w-full">
          <CardContent className="pt-6">
            <div className="flex items-center justify-center gap-3">
              <Loader2 className="w-6 h-6 animate-spin text-zinc-400" />
              <p className="text-zinc-400">Loading attack data and initializing chatbot...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!openai) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-8">
        <Card className="max-w-md">
          <CardHeader>
            <div className="flex items-center gap-3">
              <AlertCircle className="w-8 h-8 text-red-500" />
              <CardTitle>OpenAI Not Configured</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-zinc-400 mb-4">
              Please add <code className="text-xs bg-zinc-800 px-2 py-1 rounded">VITE_OPEN_AI_KEY</code> to your .env file.
            </p>
            <Button onClick={() => window.location.reload()}>Retry</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b border-zinc-800 bg-zinc-900/95 backdrop-blur supports-[backdrop-filter]:bg-zinc-900/60">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <MessageCircle className="w-6 h-6 text-zinc-50" />
              <h1 className="text-zinc-50 text-2xl font-bold">AI Chat Assistant</h1>
              <span className="text-zinc-400 text-sm">({allAttacks.length} attacks loaded)</span>
            </div>
            <Button
              variant="outline"
              onClick={() => window.history.back()}
              className="bg-zinc-800 hover:bg-zinc-700 border-zinc-700 text-zinc-50"
            >
              <X className="w-4 h-4 mr-2" />
              Close
            </Button>
          </div>
        </div>
      </header>

      {/* Chat Messages */}
      <div className="flex-1 overflow-y-auto container mx-auto px-6 py-6 max-w-4xl">
        <div className="space-y-4">
          {messages.map((message, index) => (
            <div
              key={index}
              className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[80%] rounded-lg p-4 ${
                  message.role === 'user'
                    ? 'bg-zinc-800 text-zinc-50'
                    : 'bg-zinc-900 border border-zinc-800 text-zinc-100'
                }`}
              >
                <div className="whitespace-pre-wrap break-words">{message.content}</div>
                <div className="text-xs text-zinc-500 mt-2">
                  {message.timestamp.toLocaleTimeString()}
                </div>
              </div>
            </div>
          ))}
          
          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
                <Loader2 className="w-5 h-5 animate-spin text-zinc-400" />
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="container mx-auto px-6 max-w-4xl">
          <Card className="bg-red-900/20 border-red-800 mb-4">
            <CardContent className="pt-4">
              <div className="flex items-center gap-2 text-red-400">
                <AlertCircle className="w-5 h-5" />
                <p className="text-sm">{error}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Input Area */}
      <div className="sticky bottom-0 border-t border-zinc-800 bg-zinc-900/95 backdrop-blur supports-[backdrop-filter]:bg-zinc-900/60">
        <div className="container mx-auto px-6 py-4 max-w-4xl">
          <div className="flex gap-3">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Ask me anything about the attack data..."
              disabled={isLoading || isLoadingData}
              className="flex-1 bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-3 text-zinc-50 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-600 resize-none"
              rows={3}
            />
            <Button
              onClick={handleSend}
              disabled={!input.trim() || isLoading || isLoadingData}
              size="lg"
              className="self-end"
            >
              {isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Send className="w-5 h-5" />
              )}
            </Button>
          </div>
          <p className="text-xs text-zinc-500 mt-2">
            Press Enter to send, Shift+Enter for new line
          </p>
        </div>
      </div>
    </div>
  );
};

