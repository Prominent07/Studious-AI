import React, { useState } from 'react';
import { useStore } from '../store/useStore';
import Sidebar from '../components/layout/Sidebar';
import { FileText, Plus, Search, Trash2, TrendingUp, Folder as FolderIcon, BrainCircuit, FileQuestion } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function Dashboard() {
  const { notes, activeFolderId, addNote, folders, deleteNote } = useStore();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');

  const activeFolder = folders.find(f => f.id === activeFolderId);
  
  // Smart Search logic
  let filteredNotes = activeFolderId 
    ? notes.filter(n => n.folderId === activeFolderId)
    : notes;

  if (searchQuery.trim()) {
    const query = searchQuery.toLowerCase();
    filteredNotes = filteredNotes.filter(n => {
      const titleMatch = n.title.toLowerCase().includes(query);
      const contentMatch = n.content.toLowerCase().includes(query);
      const flashcardsMatch = n.flashcards?.some(
        fc => fc.front.toLowerCase().includes(query) || fc.back.toLowerCase().includes(query)
      );
      return titleMatch || contentMatch || flashcardsMatch;
    });
  }

  const handleCreateNote = () => {
    const newNote = addNote('Untitled Note', activeFolderId || undefined);
    navigate(`/editor/${newNote.id}`);
  };

  const formatDate = (isoString: string) => {
    return new Date(isoString).toLocaleDateString(undefined, {
      month: 'short', day: 'numeric', year: 'numeric'
    });
  };

  // Analytics logic
  const totalNotes = notes.length;
  const totalFolders = folders.length;
  const totalFlashcards = notes.reduce((sum, n) => sum + (n.flashcards?.length || 0), 0);
  const totalQuizzes = notes.reduce((sum, n) => sum + (n.quizzes?.filter(q => q.completedAt).length || 0), 0);
  const studyStreak = totalNotes > 0 ? 1 : 0; // Simplified streak logic

  // Helper to highlight search text
  const HighlightText = ({ text }: { text: string }) => {
    if (!searchQuery.trim() || !text) return <span>{text}</span>;
    
    const parts = text.split(new RegExp(`(${searchQuery})`, 'gi'));
    return (
      <span>
        {parts.map((part, i) => 
          part.toLowerCase() === searchQuery.toLowerCase() ? (
            <mark key={i} className="bg-yellow-200 text-gray-900 rounded-sm px-0.5">{part}</mark>
          ) : (
            <span key={i}>{part}</span>
          )
        )}
      </span>
    );
  };

  return (
    <div className="flex h-screen bg-white text-gray-900 font-sans overflow-hidden">
      <Sidebar />
      
      <main className="flex-1 flex flex-col h-full overflow-hidden bg-gray-50">
        <header className="px-4 sm:px-8 h-14 sm:h-16 flex-shrink-0 flex items-center justify-between border-b border-gray-100 bg-white gap-3">
          <h1 className="font-serif text-xl sm:text-3xl font-bold text-gray-900 truncate">
            {activeFolder ? activeFolder.name : 'All Notes'}
          </h1>
          
          <div className="flex items-center gap-2 sm:gap-6">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input 
                type="text" 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search notes..." 
                className="block w-full pl-9 pr-3 py-1.5 sm:py-2 border border-gray-200 rounded-full bg-gray-50 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500 placeholder-gray-400 w-36 sm:w-64 md:w-80 transition-all font-medium"
              />
            </div>
            <button 
              onClick={handleCreateNote}
              className="flex items-center gap-1.5 sm:gap-2 bg-emerald-600 hover:bg-emerald-700 shadow-md shadow-emerald-200 text-white px-3 sm:px-5 py-2 sm:py-2.5 rounded-full font-medium transition-colors text-sm"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">New Note</span>
            </button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-8 relative">
          
          {!activeFolderId && !searchQuery && (
            <div className="mb-8 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-3">
              <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-500 flex flex-col items-center justify-center">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900 leading-none">{totalNotes}</p>
                  <p className="text-xs text-gray-500 font-medium">Total Notes</p>
                </div>
              </div>

              <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-purple-50 text-purple-500 flex flex-col items-center justify-center">
                  <FolderIcon className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900 leading-none">{totalFolders}</p>
                  <p className="text-xs text-gray-500 font-medium">Folders</p>
                </div>
              </div>
              
              <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-orange-50 text-orange-500 flex flex-col items-center justify-center">
                  <TrendingUp className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900 leading-none">{studyStreak}</p>
                  <p className="text-xs text-gray-500 font-medium">Day Streak</p>
                </div>
              </div>
              
              <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-emerald-50 text-emerald-500 flex flex-col items-center justify-center">
                  <BrainCircuit className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900 leading-none">{totalFlashcards}</p>
                  <p className="text-xs text-gray-500 font-medium">Flashcards</p>
                </div>
              </div>
              
              <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-indigo-50 text-indigo-500 flex flex-col items-center justify-center">
                  <FileQuestion className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900 leading-none">{totalQuizzes}</p>
                  <p className="text-xs text-gray-500 font-medium">Quizzes Done</p>
                </div>
              </div>
            </div>
          )}
          {filteredNotes.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-gray-400">
              <FileText className="w-16 h-16 mb-4 text-gray-200" />
              <p className="text-lg font-medium text-gray-600">No notes here yet</p>
              <p className="text-sm mt-1">Create a new note to get started</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4 sm:gap-6 auto-rows-max">
              {filteredNotes.map(note => (
                <div 
                  key={note.id}
                  className="group relative bg-white p-4 sm:p-5 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md hover:border-emerald-200 transition-all cursor-pointer flex flex-col h-56 sm:h-64"
                  onClick={() => navigate(`/editor/${note.id}`)}
                >
                  <div className="flex-1 overflow-hidden relative mb-3 rounded-lg bg-gray-50 flex items-center justify-center p-4 border border-gray-50">
                    <FileText className="w-10 h-10 text-gray-300 mb-2" />
                    {note.content && (
                      <p className="text-xs text-gray-500 text-center line-clamp-3 w-full italic">
                        <HighlightText text={note.content} />
                      </p>
                    )}
                    {/* Delete overlay button */}
                    <button 
                      onClick={(e) => { e.stopPropagation(); deleteNote(note.id); }}
                      className="absolute top-2 right-2 p-2 bg-white rounded-full text-gray-400 hover:text-red-500 shadow-sm opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="font-bold text-gray-800 truncate">
                      <HighlightText text={note.title || 'Untitled'} />
                    </h4>
                  </div>
                  <div className="mt-auto pt-3 border-t border-gray-50 text-[10px] text-gray-400">
                    {formatDate(note.updatedAt)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
