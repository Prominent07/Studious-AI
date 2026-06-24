import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Note, Folder, Stroke, Tool } from '../types';
import { v4 as uuidv4 } from 'uuid';

interface State {
  notes: Note[];
  folders: Folder[];
  activeNoteId: string | null;
  activeFolderId: string | null;
  currentTool: Tool;
  currentColor: string;
  currentSize: number;
  
  // Actions
  addNote: (title?: string, folderId?: string) => Note;
  updateNote: (id: string, updates: Partial<Note>) => void;
  deleteNote: (id: string) => void;
  setActiveNote: (id: string | null) => void;
  
  addFolder: (name: string) => void;
  setActiveFolder: (id: string | null) => void;
  
  setTool: (tool: Tool) => void;
  setColor: (color: string) => void;
  setSize: (size: number) => void;
}

export const useStore = create<State>()(
  persist(
    (set, get) => ({
      notes: [],
      folders: [],
      activeNoteId: null,
      activeFolderId: null,
      currentTool: 'pen',
      currentColor: '#000000',
      currentSize: 2,

      addNote: (title = 'Untitled Note', folderId) => {
        const newNote: Note = {
          id: uuidv4(),
          title,
          content: '',
          strokes: [],
          folderId: folderId || get().activeFolderId || undefined,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        set({ notes: [...get().notes, newNote], activeNoteId: newNote.id });
        return newNote;
      },
      
      updateNote: (id, updates) => {
        set((state) => ({
          notes: state.notes.map((note) => 
            note.id === id ? { ...note, ...updates, updatedAt: new Date().toISOString() } : note
          )
        }));
      },

      deleteNote: (id) => {
        set((state) => ({
          notes: state.notes.filter((n) => n.id !== id),
          activeNoteId: state.activeNoteId === id ? null : state.activeNoteId,
        }));
      },

      setActiveNote: (id) => set({ activeNoteId: id }),

      addFolder: (name) => {
        const newFolder: Folder = {
          id: uuidv4(),
          name,
          createdAt: new Date().toISOString(),
        };
        set({ folders: [...get().folders, newFolder] });
      },

      setActiveFolder: (id) => set({ activeFolderId: id }),
      
      setTool: (tool) => set({ currentTool: tool }),
      setColor: (color) => set({ currentColor: color }),
      setSize: (size) => set({ currentSize: size }),
    }),
    {
      name: 'notewise-storage',
    }
  )
);
