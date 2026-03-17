import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Send, Bot, User, Sparkles, ChevronDown, ChevronUp } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { geminiService, GeminiMessage, ChatContext } from '@/lib/gemini';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  reasoning?: string[];
  timestamp: Date;
}

const Chat = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [expandedReasoning, setExpandedReasoning] = useState<Set<string>>(new Set());
  const [userProfile, setUserProfile] = useState<any>(null);
  const [medications, setMedications] = useState<any[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (user) {
      loadHealthContext();
    }
  }, [user]);

  const loadHealthContext = async () => {
    if (!user) return;
    
    // Load profile
    const { data: profileData } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', user.id)
      .single();
    
    if (profileData) setUserProfile(profileData);

    // Load medications
    const { data: medsData } = await supabase
      .from('medications')
      .select('*')
      .eq('user_id', user.id);
    
    if (medsData) setMedications(medsData);
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const extractReasoning = (content: string): { cleanContent: string; reasoning: string[] } => {
    const reasoningMatch = content.match(/\*\*Clinical Reasoning Process:\*\*([\s\S]*?)(?=\*\*(?:Clinical Guidance|Answer|Conclusion|Summary)|\n\n[^*]|$)/i);
    if (reasoningMatch) {
      const reasoningText = reasoningMatch[1];
      const steps = reasoningText
        .split(/\d+\.\s+/)
        .filter(s => s.trim())
        .map(s => s.trim());
      const cleanContent = content.replace(reasoningMatch[0], '').trim();
      return { cleanContent, reasoning: steps };
    }
    return { cleanContent: content, reasoning: [] };
  };

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: input.trim(),
      timestamp: new Date(),
    };

    const assistantId = crypto.randomUUID();
    const userInput = input.trim();

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    // Create empty assistant message for streaming
    setMessages(prev => [...prev, {
      id: assistantId,
      role: 'assistant',
      content: '',
      timestamp: new Date(),
    }]);

    try {
      const geminiMessages: GeminiMessage[] = messages.map(m => ({
        role: m.role === 'user' ? 'user' : 'model',
        parts: [{ text: m.content }],
      }));
      geminiMessages.push({ role: 'user', parts: [{ text: userInput }] });

      let streamedContent = '';

      const chatContext: ChatContext = {
        age: userProfile?.age,
        gender: userProfile?.gender,
        bloodType: userProfile?.blood_type,
        conditions: userProfile?.chronic_conditions || [],
        allergies: userProfile?.allergies || [],
        medications: medications || [],
      };

      await geminiService.streamChat(
        geminiMessages, 
        chatContext,
        (delta) => {
          streamedContent += delta;
          setMessages(prev => 
            prev.map(m => 
              m.id === assistantId 
                ? { ...m, content: streamedContent }
                : m
            )
          );
        }
      );

      // Parse reasoning after stream completes
      const { cleanContent, reasoning } = extractReasoning(streamedContent);
      setMessages(prev => 
        prev.map(m => 
          m.id === assistantId 
            ? { 
                ...m, 
                content: cleanContent || streamedContent,
                reasoning: reasoning.length > 0 ? reasoning : undefined 
              }
            : m
        )
      );
    } catch (error: unknown) {
      let errorMessage = 'Sorry, I encountered an error. Please try again.';
      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (typeof error === 'object' && error !== null && 'message' in error) {
        errorMessage = String((error as Record<string, unknown>).message);
      }
      setMessages(prev => 
        prev.map(m => 
          m.id === assistantId 
            ? { ...m, content: errorMessage }
            : m
        )
      );
    } finally {
      setIsLoading(false);
    }
  };

  const toggleReasoning = (messageId: string) => {
    setExpandedReasoning(prev => {
      const next = new Set(prev);
      if (next.has(messageId)) next.delete(messageId);
      else next.add(messageId);
      return next;
    });
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-40 glass border-b border-border/50">
        <div className="container max-w-lg mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => navigate(-1)}
              className="p-2 -ml-2 rounded-xl hover:bg-secondary transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-foreground" />
            </motion.button>
            <div className="flex-1 min-w-0">
              <h1 className="font-display text-xl font-bold text-foreground">Clinical Chat</h1>
              <p className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-primary animate-pulse-soft" />
                AI Health Assistant
              </p>
            </div>
            <div className="w-10 h-10 rounded-2xl gradient-primary flex items-center justify-center shadow-glow shrink-0">
              <Bot className="w-5 h-5 text-primary-foreground" />
            </div>
          </div>
        </div>
      </header>

      {/* Messages */}
      <main className="flex-1 overflow-y-auto">
        <div className="container max-w-lg mx-auto px-4 py-6 space-y-4">

          {messages.length === 0 && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center py-20 px-6"
            >
              <div className="w-20 h-20 rounded-[2.5rem] gradient-primary flex items-center justify-center mx-auto mb-6 shadow-glow animate-float">
                <Sparkles className="w-10 h-10 text-primary-foreground" />
              </div>
              <h2 className="font-display text-2xl font-bold text-foreground mb-3">Clinical Assistant</h2>
              <p className="text-sm font-medium text-muted-foreground max-w-[240px] mx-auto leading-relaxed">
                Describe your symptoms or ask about medications. I'm here to provide professional clinical insights.
              </p>
            </motion.div>
          )}

          <AnimatePresence mode="popLayout">
            {messages.map(message => (
              <motion.div
                key={message.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className={`flex gap-3 ${message.role === 'user' ? 'flex-row-reverse' : ''}`}
              >
                <div
                  className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${
                    message.role === 'user' ? 'bg-primary' : 'bg-secondary'
                  }`}
                >
                  {message.role === 'user' ? (
                    <User className="w-4 h-4 text-primary-foreground" />
                  ) : (
                    <Bot className="w-4 h-4 text-foreground" />
                  )}
                </div>
                <div
                  className={`flex-1 max-w-[80%] ${
                    message.role === 'user' ? 'text-right' : ''
                  }`}
                >
                  <div
                    className={`inline-block p-4 rounded-[1.5rem] ${
                      message.role === 'user'
                        ? 'bg-primary text-primary-foreground shadow-medium rounded-tr-none'
                        : 'bg-card border border-border/50 shadow-soft rounded-tl-none'
                    }`}
                  >
                    {/* Reasoning Accordion */}
                    {message.reasoning && message.reasoning.length > 0 && (
                      <div className="mb-4">
                        <button
                          onClick={() => toggleReasoning(message.id)}
                          className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-primary bg-primary/10 hover:bg-primary/20 rounded-xl px-4 py-2.5 w-full transition-all border border-primary/10"
                        >
                          <Sparkles className="w-3.5 h-3.5" />
                          Clinical Reasoning
                          {expandedReasoning.has(message.id) ? (
                            <ChevronUp className="w-4 h-4 ml-auto" />
                          ) : (
                            <ChevronDown className="w-4 h-4 ml-auto" />
                          )}
                        </button>
                        <AnimatePresence>
                          {expandedReasoning.has(message.id) && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              className="overflow-hidden"
                            >
                              <div className="mt-3 space-y-3 pl-4 border-l-2 border-primary/30 py-1">
                                {message.reasoning.map((step, i) => (
                                  <div key={i} className="space-y-1">
                                    <p className="text-[10px] font-black text-primary uppercase leading-none opacity-60">Step {i + 1}</p>
                                    <p className="text-xs font-medium text-muted-foreground leading-relaxed">
                                      {step}
                                    </p>
                                  </div>
                                ))}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    )}
                    <div className="text-sm font-medium leading-relaxed whitespace-pre-wrap">
                      {message.content}
                    </div>
                  </div>
                  <p className="text-[10px] font-bold text-muted-foreground/60 mt-1.5 px-1 uppercase tracking-tighter">
                    {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          {isLoading && messages[messages.length - 1]?.content === '' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex gap-3"
            >
              <div className="w-8 h-8 rounded-xl bg-secondary flex items-center justify-center">
                <Bot className="w-4 h-4 text-foreground" />
              </div>
              <div className="bg-card border border-border/50 shadow-card rounded-2xl rounded-tl-md p-4">
                <div className="flex gap-1">
                  <span className="w-2 h-2 bg-primary/40 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-2 h-2 bg-primary/40 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-2 h-2 bg-primary/40 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            </motion.div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </main>

      {/* Input */}
      <div className="sticky bottom-16 glass border-t border-border/50 p-4">
        <div className="container max-w-lg mx-auto">
          <form
            onSubmit={e => {
              e.preventDefault();
              handleSend();
            }}
            className="flex gap-3"
          >
            <Input
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder="Ask about your health..."
              disabled={isLoading}
              className="flex-1 h-12 rounded-[1.25rem] bg-secondary/30 border-border/50 focus-visible:ring-primary/20 placeholder:text-muted-foreground/50 px-5 text-sm font-medium"
            />
            <Button
              type="submit"
              disabled={isLoading || !input.trim()}
              className="h-12 w-12 rounded-[1.25rem] bg-primary shadow-glow hover:shadow-primary/40 transition-all flex items-center justify-center p-0"
            >
              <Send className="w-5 h-5 text-primary-foreground ml-0.5" />
            </Button>
          </form>
          <p className="text-[10px] font-bold text-muted-foreground/50 text-center mt-3 flex items-center justify-center gap-1.5">
            <Bot className="w-3 h-3" />
            VIRTUAL ASSISTANT • NOT FOR EMERGENCIES
          </p>
        </div>
      </div>
    </div>
  );
};

export default Chat;
