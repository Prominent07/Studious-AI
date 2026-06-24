import React, { useState } from 'react';
import { Sparkles, Loader2, X, Send, Copy, PlusSquare, BookOpen, BrainCircuit, FileQuestion, HelpCircle, ListFilter, Sigma } from 'lucide-react';
import { useStore } from '../../store/useStore';

interface AISidebarProps {
  noteId: string;
  onClose: () => void;
  onOpenFlashcards?: () => void;
  onOpenQuiz?: () => void;
}

export default function AISidebar({ noteId, onClose, onOpenFlashcards, onOpenQuiz }: AISidebarProps) {
  const { notes, updateNote } = useStore();
  const note = notes.find(n => n.id === noteId);
  const [prompt, setPrompt] = useState('');
  const [response, setResponse] = useState('');
  const [sources, setSources] = useState<{ uri: string, title: string }[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [copyStatus, setCopyStatus] = useState(false);

  const handleCopyToClipboard = async () => {
    if (!response) return;
    try {
      await navigator.clipboard.writeText(response);
      setCopyStatus(true);
      setTimeout(() => setCopyStatus(false), 2000);
    } catch (err) {
      console.error('Failed to copy', err);
    }
  };

  const handleInsertToNote = () => {
    if (!note || !response) return;
    const currentContent = note.content || '';
    const newContent = currentContent 
      ? currentContent + '\n\n' + response
      : response;
    updateNote(note.id, { content: newContent });
  };

  const handleAskAI = async () => {
    if (!prompt.trim()) return;
    
    setIsLoading(true);
    try {
      const res = await fetch('/api/gemini/summarize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt,
          content: note?.content || 'No text content. (Consider handwriting text transcription if available)',
        })
      });
      
      const data = await res.json();
      if (res.ok) {
        setResponse(data.result);
        setSources(data.sources || []);
      } else {
        setResponse('Error: ' + data.error);
        setSources([]);
      }
    } catch (err) {
      setResponse('Failed to connect to AI service.');
      setSources([]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-80 bg-gray-900 text-white shadow-xl flex flex-col h-full absolute right-0 top-0 z-20">
      <div className="p-4 border-b border-gray-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-emerald-200 rounded-full animate-pulse"></div>
          <span className="text-xs font-bold tracking-widest uppercase text-white/50">AI Study Assistant</span>
        </div>
        <button onClick={onClose} className="p-1 hover:bg-white/10 rounded-md transition-colors text-white/50">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="flex-1 p-4 overflow-y-auto">
        {!response && !isLoading && (
          <div className="text-sm space-y-3 mt-2">
            <button 
              onClick={() => { setPrompt("Summarize this note in a few bullet points."); handleAskAI("Summarize this note in a few bullet points."); }}
              className="w-full text-left px-4 py-3 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 flex justify-between items-center group transition"
            >
              <span className="text-sm">✨ Summarize Note</span>
              <span className="text-xs opacity-0 group-hover:opacity-100 transition">→</span>
            </button>
            <button 
              onClick={onOpenFlashcards}
              className="w-full text-left px-4 py-3 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 flex justify-between items-center group transition"
            >
              <span className="text-sm">🗂️ Generate Flashcards</span>
              <span className="text-xs opacity-0 group-hover:opacity-100 transition">→</span>
            </button>
            <button 
              onClick={onOpenQuiz}
              className="w-full text-left px-4 py-3 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 flex justify-between items-center group transition"
            >
              <span className="text-sm">📝 Generate Quiz</span>
              <span className="text-xs opacity-0 group-hover:opacity-100 transition">→</span>
            </button>
            <button 
              onClick={() => { setPrompt("Explain the concepts in this note as if I'm 10 years old."); handleAskAI("Explain the concepts in this note as if I'm 10 years old."); }}
               className="w-full text-left px-4 py-3 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 flex justify-between items-center group transition"
            >
              <span className="text-sm">🧒 Explain Like I'm 10</span>
              <span className="text-xs opacity-0 group-hover:opacity-100 transition">→</span>
            </button>
            <button 
              onClick={() => { setPrompt("Generate 5 important questions for an exam based on this note."); handleAskAI("Generate 5 important questions for an exam based on this note."); }}
              className="w-full text-left px-4 py-3 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 flex justify-between items-center group transition"
             >
              <span className="text-sm">❓ Exam Questions</span>
              <span className="text-xs opacity-0 group-hover:opacity-100 transition">→</span>
            </button>
            <button 
              onClick={() => { setPrompt("Extract all key formulas or definitions from this note."); handleAskAI("Extract all key formulas or definitions from this note."); }}
              className="w-full text-left px-4 py-3 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 flex justify-between items-center group transition"
            >
              <span className="text-sm">🔑 Key Formulas</span>
              <span className="text-xs opacity-0 group-hover:opacity-100 transition">→</span>
            </button>
          </div>
        )}

        {isLoading && (
          <div className="flex flex-col items-center justify-center mt-10 text-emerald-600">
            <Loader2 className="w-6 h-6 animate-spin mb-2" />
            <span className="text-sm">Thinking...</span>
          </div>
        )}

        {response && !isLoading && (
          <div className="flex flex-col gap-3">
            <div className="bg-gray-50 p-4 rounded-xl text-sm text-gray-800 leading-relaxed border border-gray-100 shadow-sm whitespace-pre-wrap">
              {response}
            </div>
            <div className="flex items-center gap-2">
              <button 
                onClick={handleCopyToClipboard}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition-colors border border-emerald-200"
              >
                <Copy className="w-3.5 h-3.5" />
                {copyStatus ? 'Copied!' : 'Copy'}
              </button>
              <button 
                onClick={handleInsertToNote}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition-colors border border-emerald-200"
              >
                <PlusSquare className="w-3.5 h-3.5" />
                Insert to Note
              </button>
            </div>
            
            {sources && sources.length > 0 && (
              <div className="mt-4 border-t border-gray-100 pt-3">
                <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Sources</h4>
                <ul className="space-y-2">
                  {sources.map((src, i) => (
                    <li key={i}>
                      <a 
                        href={src.uri} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-xs text-blue-600 hover:underline line-clamp-1"
                        title={src.title}
                      >
                        {src.title || src.uri}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            
          </div>
        )}
      </div>

      <div className="p-4 border-t border-white/10 bg-gray-900 mt-auto">
        <div className="relative">
          <input
            type="text"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAskAI()}
            placeholder="Ask a question..."
            className="w-full bg-white/10 border border-white/20 rounded-2xl py-3 px-4 pr-12 text-sm text-white placeholder-white/50 outline-none focus:border-emerald-500 transition-all"
          />
          <button 
            onClick={handleAskAI}
            disabled={!prompt.trim() || isLoading}
            className="absolute right-3 top-2 w-8 h-8 bg-emerald-500 rounded-xl flex items-center justify-center hover:bg-emerald-600 disabled:opacity-50 transition-colors"
          >
            <Send className="w-4 h-4 text-white" />
          </button>
        </div>
      </div>
    </div>
  );
}
