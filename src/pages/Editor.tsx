import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useStore } from '../store/useStore';
import Toolbar from '../components/editor/Toolbar';
import DrawingCanvas from '../components/editor/DrawingCanvas';
import AISidebar from '../components/editor/AISidebar';
import FlashcardModal from '../components/editor/FlashcardModal';
import QuizModal from '../components/editor/QuizModal';
import { Panel, Group as PanelGroup, Separator as PanelResizeHandle } from 'react-resizable-panels';
import StudyBrowser from '../components/editor/StudyBrowser';
import { Sparkles, Check, Send } from 'lucide-react';
import { clsx } from 'clsx';

export default function Editor() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { notes, updateNote, currentTool } = useStore();
  const [showAI, setShowAI] = useState(false);
  const [showFlashcards, setShowFlashcards] = useState(false);
  const [showQuiz, setShowQuiz] = useState(false);
  // ← All hooks MUST be declared before any conditional return
  const [showBrowser, setShowBrowser] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; text: string } | null>(null);

  const note = notes.find(n => n.id === id);

  useEffect(() => {
    if (!note) navigate('/');
  }, [note, navigate]);

  if (!note) return null;

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Tell Electron to hide the BrowserView immediately when panel closes
  const closeBrowser = () => {
    setShowBrowser(false);
    window.electron?.resizePanel(false, 0, 0, 0, 0);
  };

  const generateAIPrompt = (type: string) => {
    let prompt = '';
    const content = note?.content.trim() ? `\n\nContent:\n${note.content}` : '';
    
    switch (type) {
      case 'summarize': prompt = `Summarize this note in a few concise bullet points.${content}`; break;
      case 'explain': prompt = `Explain the following topic in simple terms.${content}`; break;
      case 'flashcards': prompt = `Create 5-10 flashcards from this text. Format as Question/Answer.${content}`; break;
      case 'quiz': prompt = `Generate a multiple choice quiz based on this text.${content}`; break;
      case 'step-by-step': prompt = `Explain the concepts in this text step-by-step.${content}`; break;
      case 'simplify': prompt = `Simplify this text for quick revision. Highlight only the most important parts.${content}`; break;
    }
    
    navigator.clipboard.writeText(prompt);
    showToast('Prompt copied to clipboard! Paste it into your AI browser.');
    if (!showBrowser) setShowBrowser(true);
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    let selectedText = window.getSelection()?.toString() || '';
    
    // Check if the target is a textarea or input
    const target = e.target as HTMLElement;
    if (target instanceof HTMLTextAreaElement || target instanceof HTMLInputElement) {
      if (target.selectionStart !== null && target.selectionEnd !== null) {
        selectedText = target.value.substring(target.selectionStart, target.selectionEnd);
      }
    }

    if (selectedText && selectedText.trim().length > 0) {
      e.preventDefault();
      setContextMenu({ x: e.clientX, y: e.clientY, text: selectedText });
    } else {
      setContextMenu(null);
    }
  };

  const handleSendToAI = () => {
    if (!contextMenu) return;
    navigator.clipboard.writeText(`Explain this:\n\n${contextMenu.text}`);
    showToast('Prompt copied. Paste into ChatGPT.');
    setContextMenu(null);
    if (!showBrowser) setShowBrowser(true);
  };

  // Close context menu on click anywhere
  useEffect(() => {
    const closeMenu = () => setContextMenu(null);
    window.addEventListener('click', closeMenu);
    return () => window.removeEventListener('click', closeMenu);
  }, []);

  return (
    <div className="flex flex-col h-screen bg-gray-50 overflow-hidden relative">
      <Toolbar noteId={note.id} onOpenBrowser={() => setShowBrowser(!showBrowser)} />
      
      {/* AI Prompt Helper Bar */}
      <div className="bg-white border-b border-gray-200 py-1.5 px-3 sm:px-6 flex items-center gap-2 overflow-x-auto no-scrollbar shrink-0 shadow-sm z-10">
        <span className="text-xs font-bold text-gray-400 uppercase tracking-widest shrink-0 flex items-center gap-1 hidden sm:flex">
          <Sparkles className="w-3 h-3" /> Prompts:
        </span>
        <button onClick={() => generateAIPrompt('summarize')}   className="text-xs font-medium px-2.5 py-1 sm:px-3 sm:py-1.5 bg-gray-50 border border-gray-200 rounded-full hover:bg-emerald-50 hover:border-emerald-200 hover:text-emerald-700 transition shrink-0">Summarize</button>
        <button onClick={() => generateAIPrompt('explain')}     className="text-xs font-medium px-2.5 py-1 sm:px-3 sm:py-1.5 bg-gray-50 border border-gray-200 rounded-full hover:bg-emerald-50 hover:border-emerald-200 hover:text-emerald-700 transition shrink-0">Explain</button>
        <button onClick={() => generateAIPrompt('flashcards')}  className="text-xs font-medium px-2.5 py-1 sm:px-3 sm:py-1.5 bg-gray-50 border border-gray-200 rounded-full hover:bg-emerald-50 hover:border-emerald-200 hover:text-emerald-700 transition shrink-0">Flashcards</button>
        <button onClick={() => generateAIPrompt('quiz')}        className="text-xs font-medium px-2.5 py-1 sm:px-3 sm:py-1.5 bg-gray-50 border border-gray-200 rounded-full hover:bg-emerald-50 hover:border-emerald-200 hover:text-emerald-700 transition shrink-0">Quiz</button>
        <button onClick={() => generateAIPrompt('step-by-step')} className="text-xs font-medium px-2.5 py-1 sm:px-3 sm:py-1.5 bg-gray-50 border border-gray-200 rounded-full hover:bg-emerald-50 hover:border-emerald-200 hover:text-emerald-700 transition shrink-0">Step-by-step</button>
        <button onClick={() => generateAIPrompt('simplify')}   className="text-xs font-medium px-2.5 py-1 sm:px-3 sm:py-1.5 bg-gray-50 border border-gray-200 rounded-full hover:bg-emerald-50 hover:border-emerald-200 hover:text-emerald-700 transition shrink-0">Simplify</button>
      </div>

      <div className="flex-1 flex overflow-hidden relative justify-center bg-gray-50 border-t border-gray-200" onContextMenu={handleContextMenu}>
        
        <PanelGroup direction="horizontal">
          <Panel defaultSize={showBrowser ? 60 : 100} minSize={30}>
            {/* Paper Container */}
            <div className="w-full h-full p-4 overflow-hidden flex flex-col">
              <div className="w-full max-w-[1200px] h-full bg-white shadow-lg mx-auto relative overflow-hidden flex flex-col rounded-lg border border-gray-100">
                
                {/* Note Title */}
                <div className="pt-8 px-10 pb-4">
                  <input 
                    type="text"
                    value={note.title}
                    onChange={(e) => updateNote(note.id, { title: e.target.value })}
                    className="text-4xl font-bold text-gray-900 border-none outline-none bg-transparent w-full placeholder-gray-300 font-display"
                    placeholder="Note Title"
                  />
                </div>

                <div className="flex-1 relative">
                  {/* Text Editor Layer */}
                  <textarea
                    className={clsx(
                      "absolute inset-0 w-full h-full resize-none outline-none p-10 text-lg leading-relaxed text-gray-800 bg-transparent z-0",
                      currentTool === 'text' ? 'pointer-events-auto' : 'pointer-events-none'
                    )}
                    placeholder="Start typing or use the pen tool to draw..."
                    value={note.content}
                    onChange={(e) => updateNote(note.id, { content: e.target.value })}
                  />

                  {/* Canvas Layer */}
                  <div 
                    className={clsx(
                      "absolute inset-0 z-10",
                      currentTool === 'text' ? 'pointer-events-none' : 'pointer-events-auto'
                    )}
                  >
                    <DrawingCanvas noteId={note.id} />
                  </div>
                </div>
              </div>
            </div>

            {/* AI Action Button */}
            {!showAI && (
              <button
                onClick={() => setShowAI(true)}
                className="absolute right-6 bottom-6 flex items-center justify-center p-4 bg-emerald-600 text-white rounded-full shadow-lg hover:bg-emerald-700 hover:scale-105 transition-all z-20"
                title="AI Studio Assistant"
              >
                <Sparkles className="w-6 h-6" />
              </button>
            )}
          </Panel>

          {showBrowser && (
            <>
              <PanelResizeHandle className="w-2 bg-gray-200 hover:bg-emerald-400 focus:bg-emerald-400 transition-colors cursor-col-resize flex flex-col justify-center items-center group shadow-inner relative z-30">
                <div className="h-8 w-1 bg-gray-400 rounded-full group-hover:bg-white transition-colors" />
              </PanelResizeHandle>
              <Panel defaultSize={40} minSize={20}>
                <StudyBrowser onClose={closeBrowser} />
              </Panel>
            </>
          )}
        </PanelGroup>

      </div>

      {showAI && <AISidebar noteId={note.id} onClose={() => setShowAI(false)} onOpenFlashcards={() => setShowFlashcards(true)} onOpenQuiz={() => setShowQuiz(true)} />}
      {showFlashcards && <FlashcardModal noteId={note.id} onClose={() => setShowFlashcards(false)} />}
      {showQuiz && <QuizModal noteId={note.id} onClose={() => setShowQuiz(false)} />}

      {/* Toast Notification */}
      <div className={clsx(
        "fixed bottom-8 left-1/2 -translate-x-1/2 bg-gray-900 text-white px-6 py-3 rounded-xl shadow-2xl flex items-center gap-3 transition-all duration-300 z-50",
        toastMessage ? "translate-y-0 opacity-100" : "translate-y-10 opacity-0 pointer-events-none"
      )}>
        <Check className="w-5 h-5 text-emerald-400" />
        <span className="font-medium text-sm">{toastMessage}</span>
      </div>

      {/* Custom Context Menu */}
      {contextMenu && (
        <div 
          className="fixed z-50 bg-white border border-gray-200 shadow-xl rounded-xl py-1 w-48 font-sans overflow-hidden fade-in"
          style={{ top: Math.min(contextMenu.y, window.innerHeight - 50), left: Math.min(contextMenu.x, window.innerWidth - 200) }}
        >
          <button 
            onClick={handleSendToAI}
            className="w-full text-left px-4 py-2 text-sm font-medium text-gray-700 hover:bg-emerald-50 hover:text-emerald-700 flex items-center gap-2 transition"
          >
            <Send className="w-4 h-4 text-emerald-600" />
            Send to AI
          </button>
        </div>
      )}
    </div>
  );
}
