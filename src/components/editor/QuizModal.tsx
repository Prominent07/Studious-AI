import React, { useState } from 'react';
import { X, CheckCircle, XCircle, AlertCircle, Loader2, RefreshCw } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { v4 as uuidv4 } from 'uuid';

interface QuizModalProps {
  noteId: string;
  onClose: () => void;
}

export default function QuizModal({ noteId, onClose }: QuizModalProps) {
  const { notes, updateNote } = useStore();
  const note = notes.find(n => n.id === noteId);
  
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentQuizId, setCurrentQuizId] = useState<string | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [showExplanation, setShowExplanation] = useState(false);
  const [score, setScore] = useState(0);
  const [isFinished, setIsFinished] = useState(false);
  
  const quizzes = note?.quizzes || [];
  const currentQuiz = quizzes.find(q => q.id === currentQuizId) || quizzes[quizzes.length - 1];

  const handleGenerate = async () => {
    if (!note || !note.content.trim()) return;
    setIsGenerating(true);
    try {
      const res = await fetch('/api/gemini/quiz', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: note.content })
      });
      const data = await res.json();
      if (res.ok && data.result) {
        const newQuiz = {
          id: uuidv4(),
          title: `Quiz ${quizzes.length + 1}`,
          questions: data.result.map((q: any) => ({
            id: uuidv4(),
            ...q
          })),
        };
        updateNote(note.id, { quizzes: [...quizzes, newQuiz] });
        setCurrentQuizId(newQuiz.id);
        resetState();
      }
    } catch (err) {
      console.error('Failed to generate quiz', err);
    } finally {
      setIsGenerating(false);
    }
  };

  const resetState = () => {
    setCurrentQuestionIndex(0);
    setSelectedAnswer(null);
    setShowExplanation(false);
    setScore(0);
    setIsFinished(false);
  };

  const handleAnswerSelect = (option: string) => {
    if (showExplanation) return;
    setSelectedAnswer(option);
    setShowExplanation(true);
    
    if (currentQuiz && option === currentQuiz.questions[currentQuestionIndex].correctAnswer) {
      setScore(s => s + 1);
    }
  };

  const handleNext = () => {
    if (!currentQuiz) return;
    if (currentQuestionIndex < currentQuiz.questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
      setSelectedAnswer(null);
      setShowExplanation(false);
    } else {
      setIsFinished(true);
      if (currentQuizId) {
        const updatedQuizzes = quizzes.map(q => 
          q.id === currentQuizId ? { ...q, score, completedAt: new Date().toISOString() } : q
        );
        updateNote(note!.id, { quizzes: updatedQuizzes });
      }
    }
  };

  const retryQuiz = () => {
    resetState();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden relative">
        
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-100 bg-gray-50/50">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Quiz Mode</h2>
            <p className="text-sm text-gray-500">
              {currentQuiz && !isFinished 
                ? `Question ${currentQuestionIndex + 1} of ${currentQuiz.questions.length}` 
                : 'Test your knowledge'}
            </p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-full transition-colors text-gray-500">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 p-8 overflow-y-auto bg-white flex flex-col items-center min-h-[400px]">
          {!currentQuiz ? (
            <div className="text-center my-auto">
              <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6">
                <AlertCircle className="w-10 h-10" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Quizzes Available</h3>
              <p className="text-gray-500 mb-8 max-w-sm">Generate a quiz based on the current note to test your understanding.</p>
              <button 
                onClick={handleGenerate}
                disabled={isGenerating || !note?.content.trim()}
                className="bg-emerald-600 text-white px-6 py-3 rounded-xl font-medium hover:bg-emerald-700 transition flex items-center gap-2 disabled:opacity-50 mx-auto"
              >
                {isGenerating ? <Loader2 className="w-5 h-5 animate-spin" /> : null}
                {isGenerating ? 'Generating...' : 'Generate New Quiz'}
              </button>
            </div>
          ) : isFinished ? (
            <div className="text-center my-auto">
              <h3 className="text-3xl font-bold text-gray-900 mb-2">Quiz Complete!</h3>
              <p className="text-xl text-gray-600 mb-8">You scored {score} out of {currentQuiz.questions.length}</p>
              
              <div className="flex gap-4 justify-center">
                <button 
                  onClick={retryQuiz}
                  className="px-6 py-3 border border-gray-200 text-gray-700 rounded-xl font-medium hover:bg-gray-50 transition flex items-center gap-2"
                >
                  <RefreshCw className="w-5 h-5" />
                  Retry Quiz
                </button>
                <button 
                  onClick={handleGenerate}
                  disabled={isGenerating}
                  className="bg-emerald-600 text-white px-6 py-3 rounded-xl font-medium hover:bg-emerald-700 transition flex items-center gap-2 disabled:opacity-50"
                >
                  {isGenerating ? <Loader2 className="w-5 h-5 animate-spin" /> : null}
                  Generate Another
                </button>
              </div>
            </div>
          ) : (
            <div className="w-full max-w-xl mx-auto flex flex-col">
              <div className="mb-8">
                <h3 className="text-xl font-medium text-gray-800 leading-relaxed">
                  {currentQuiz.questions[currentQuestionIndex].question}
                </h3>
              </div>
              
              <div className="flex flex-col gap-3">
                {currentQuiz.questions[currentQuestionIndex].options.map((option, idx) => {
                  const isCorrect = option === currentQuiz.questions[currentQuestionIndex].correctAnswer;
                  const isSelected = selectedAnswer === option;
                  
                  let buttonClass = "w-full text-left p-4 rounded-xl border text-base font-medium transition-all duration-200 flex justify-between items-center ";
                  
                  if (!showExplanation) {
                    buttonClass += "border-gray-200 hover:border-emerald-300 hover:bg-emerald-50 text-gray-700";
                  } else {
                    if (isCorrect) {
                      buttonClass += "border-emerald-500 bg-emerald-50 text-emerald-800";
                    } else if (isSelected) {
                      buttonClass += "border-red-500 bg-red-50 text-red-800";
                    } else {
                      buttonClass += "border-gray-200 bg-white text-gray-400 opacity-50";
                    }
                  }
                  
                  return (
                    <button
                      key={idx}
                      onClick={() => handleAnswerSelect(option)}
                      disabled={showExplanation}
                      className={buttonClass}
                    >
                      <span>{option}</span>
                      {showExplanation && isCorrect && <CheckCircle className="w-5 h-5 text-emerald-500" />}
                      {showExplanation && isSelected && !isCorrect && <XCircle className="w-5 h-5 text-red-500" />}
                    </button>
                  );
                })}
              </div>

              {showExplanation && (
                <div className="mt-8 p-5 bg-blue-50 border border-blue-100 rounded-xl animate-in fade-in slide-in-from-bottom-4 duration-300">
                  <h4 className="font-semibold text-blue-900 mb-1">Explanation</h4>
                  <p className="text-blue-800 leading-relaxed text-sm">
                    {currentQuiz.questions[currentQuestionIndex].explanation}
                  </p>
                </div>
              )}

              {showExplanation && (
                <button
                  onClick={handleNext}
                  className="mt-8 w-full bg-gray-900 text-white font-medium py-3 rounded-xl hover:bg-gray-800 transition"
                >
                  {currentQuestionIndex === currentQuiz.questions.length - 1 ? 'Finish Quiz' : 'Next Question'}
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
