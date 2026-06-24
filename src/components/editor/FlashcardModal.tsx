import React, { useState } from 'react';
import { X, ChevronLeft, ChevronRight, Shuffle, AlertCircle, Loader2 } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { v4 as uuidv4 } from 'uuid';
import { motion, AnimatePresence } from 'motion/react';

interface FlashcardModalProps {
  noteId: string;
  onClose: () => void;
}

export default function FlashcardModal({ noteId, onClose }: FlashcardModalProps) {
  const { notes, updateNote } = useStore();
  const note = notes.find(n => n.id === noteId);
  
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  
  const flashcards = note?.flashcards || [];

  const handleGenerate = async () => {
    if (!note || !note.content.trim()) return;
    setIsGenerating(true);
    try {
      const res = await fetch('/api/gemini/flashcards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: note.content })
      });
      const data = await res.json();
      if (res.ok && data.result) {
        const generated = data.result.map((fc: any) => ({
          id: uuidv4(),
          front: fc.front,
          back: fc.back,
          isDifficult: false
        }));
        updateNote(note.id, { flashcards: generated });
        setCurrentIndex(0);
        setIsFlipped(false);
      }
    } catch (err) {
      console.error('Failed to generate flashcards', err);
    } finally {
      setIsGenerating(false);
    }
  };

  const currentCard = flashcards[currentIndex];

  const handleNext = () => {
    if (currentIndex < flashcards.length - 1) {
      setIsFlipped(false);
      setTimeout(() => setCurrentIndex(prev => prev + 1), 150);
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setIsFlipped(false);
      setTimeout(() => setCurrentIndex(prev => prev - 1), 150);
    }
  };

  const toggleDifficult = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!note) return;
    const updated = flashcards.map((fc, idx) => 
      idx === currentIndex ? { ...fc, isDifficult: !fc.isDifficult } : fc
    );
    updateNote(note.id, { flashcards: updated });
  };

  const handleShuffle = () => {
    if (!note) return;
    const shuffled = [...flashcards].sort(() => Math.random() - 0.5);
    updateNote(note.id, { flashcards: shuffled });
    setCurrentIndex(0);
    setIsFlipped(false);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl relative overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-100 bg-gray-50/50">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Flashcards</h2>
            <p className="text-sm text-gray-500">
              {flashcards.length > 0 ? `${currentIndex + 1} of ${flashcards.length}` : 'Generate flashcards from your notes'}
            </p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-full transition-colors text-gray-500">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 p-8 flex flex-col items-center justify-center min-h-[400px] relative bg-gray-50">
          {flashcards.length === 0 ? (
            <div className="text-center">
              <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6">
                <AlertCircle className="w-10 h-10" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Flashcards Yet</h3>
              <p className="text-gray-500 mb-8 max-w-sm">Let AI read your note and generate a fresh deck of flashcards automatically.</p>
              <button 
                onClick={handleGenerate}
                disabled={isGenerating || !note?.content.trim()}
                className="bg-emerald-600 text-white px-6 py-3 rounded-xl font-medium hover:bg-emerald-700 transition flex items-center gap-2 disabled:opacity-50 mx-auto"
              >
                {isGenerating ? <Loader2 className="w-5 h-5 animate-spin" /> : null}
                {isGenerating ? 'Generating...' : 'Generate Flashcards'}
              </button>
            </div>
          ) : (
            <div className="w-full max-w-lg">
              
              {/* Card Container for 3D flip effect */}
              <div className="relative w-full h-80 perspective-1000 group" onClick={() => setIsFlipped(!isFlipped)}>
                <motion.div
                  className="w-full h-full relative preserve-3d cursor-pointer"
                  animate={{ rotateY: isFlipped ? 180 : 0 }}
                  transition={{ duration: 0.4, type: 'spring', stiffness: 200, damping: 20 }}
                  style={{ transformStyle: 'preserve-3d' }}
                >
                  {/* Front */}
                  <div 
                    className="absolute inset-0 backface-hidden bg-white border-2 border-emerald-100 rounded-2xl p-8 flex flex-col items-center justify-center text-center shadow-lg hover:shadow-xl transition-shadow"
                    style={{ backfaceVisibility: 'hidden' }}
                  >
                    <span className="absolute top-4 left-4 text-xs font-semibold uppercase tracking-wider text-emerald-500 bg-emerald-50 px-2 py-1 rounded">Front</span>
                    <button 
                      onClick={toggleDifficult}
                      className={`absolute top-4 right-4 p-2 rounded-full transition-colors ${currentCard.isDifficult ? 'text-orange-500 bg-orange-50' : 'text-gray-300 hover:text-gray-400'}`}
                      title="Mark as difficult"
                    >
                      <AlertCircle className="w-5 h-5" />
                    </button>
                    <p className="text-2xl font-medium text-gray-800 leading-relaxed">{currentCard.front}</p>
                    <p className="absolute bottom-6 text-sm text-gray-400">Click to flip</p>
                  </div>

                  {/* Back */}
                  <div 
                    className="absolute inset-0 backface-hidden bg-emerald-600 rounded-2xl p-8 flex flex-col items-center justify-center text-center shadow-lg"
                    style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
                  >
                    <span className="absolute top-4 left-4 text-xs font-semibold uppercase tracking-wider text-emerald-200 bg-emerald-700/50 px-2 py-1 rounded">Back</span>
                    <p className="text-xl font-medium text-white leading-relaxed">{currentCard.back}</p>
                    <p className="absolute bottom-6 text-sm text-emerald-200">Click to flip</p>
                  </div>
                </motion.div>
              </div>

              {/* Controls */}
              <div className="flex items-center justify-between mt-10">
                <button 
                  onClick={handleShuffle}
                  className="p-3 text-gray-500 hover:bg-white rounded-xl hover:text-gray-800 transition shadow-sm border border-transparent hover:border-gray-200"
                  title="Shuffle deck"
                >
                  <Shuffle className="w-5 h-5" />
                </button>
                
                <div className="flex gap-4">
                  <button 
                    onClick={handlePrev}
                    disabled={currentIndex === 0}
                    className="p-3 bg-white border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 transition disabled:opacity-30 shadow-sm"
                  >
                    <ChevronLeft className="w-6 h-6" />
                  </button>
                  <button 
                    onClick={handleNext}
                    disabled={currentIndex === flashcards.length - 1}
                    className="p-3 bg-white border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 transition disabled:opacity-30 shadow-sm"
                  >
                    <ChevronRight className="w-6 h-6" />
                  </button>
                </div>
              </div>

            </div>
          )}
        </div>
      </div>
    </div>
  );
}
