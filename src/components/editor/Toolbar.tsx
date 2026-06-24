import React, { useState } from 'react';
import { Pen, Eraser, Highlighter, MousePointer2, Type, ArrowLeft, Download, PanelRightOpen, ChevronDown } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { Tool } from '../../types';
import { clsx } from 'clsx';
import { useNavigate } from 'react-router-dom';
import jsPDF from 'jspdf';

interface ToolbarProps {
  noteId?: string;
  onOpenBrowser?: () => void;
}

export default function Toolbar({ noteId, onOpenBrowser }: ToolbarProps) {
  const { notes, currentTool, setTool, currentColor, setColor, currentSize, setSize } = useStore();
  const navigate = useNavigate();
  const [showExportMenu, setShowExportMenu] = useState(false);

  const note = notes.find(n => n.id === noteId);

  const tools: { id: Tool; icon: React.ReactNode; label: string }[] = [
    { id: 'pen',         icon: <Pen className="w-4 h-4" />,           label: 'Pen' },
    { id: 'highlighter', icon: <Highlighter className="w-4 h-4" />,   label: 'Highlight' },
    { id: 'eraser',      icon: <Eraser className="w-4 h-4" />,        label: 'Eraser' },
    { id: 'lasso',       icon: <MousePointer2 className="w-4 h-4" />, label: 'Lasso' },
    { id: 'text',        icon: <Type className="w-4 h-4" />,          label: 'Text' },
  ];

  const colors = ['#000000', '#EF4444', '#3B82F6', '#10B981', '#F59E0B'];
  const sizes  = [2, 4, 8, 12];

  const handleExportText = () => {
    if (!note) return;
    const blob = new Blob([note.title + '\n\n' + note.content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `${note.title || 'Note'}.txt`; a.click();
    setShowExportMenu(false);
  };

  const handleExportMarkdown = () => {
    if (!note) return;
    const blob = new Blob([`# ${note.title}\n\n${note.content}`], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `${note.title || 'Note'}.md`; a.click();
    setShowExportMenu(false);
  };

  const handleExportPDF = () => {
    if (!note) return;
    const doc = new jsPDF();
    doc.setFontSize(22);
    doc.text(note.title || 'Untitled Note', 20, 20);
    doc.setFontSize(12);
    const lines = doc.splitTextToSize(note.content, 170);
    doc.text(lines, 20, 35);
    const canvas = document.querySelector('canvas');
    if (canvas) {
      try {
        const imgData = canvas.toDataURL('image/png');
        const textHeight = 35 + lines.length * 7;
        const yOffset = Math.min(textHeight + 10, 260);
        if (yOffset > 200) { doc.addPage(); doc.addImage(imgData, 'PNG', 10, 20, 190, 0); }
        else                { doc.addImage(imgData, 'PNG', 10, yOffset, 190, 0); }
      } catch (err) { console.error('Failed to add canvas to PDF', err); }
    }
    doc.save(`${note.title || 'Note'}.pdf`);
    setShowExportMenu(false);
  };

  return (
    <div className="flex items-center justify-between px-3 md:px-6 py-2 md:py-3 border-b border-gray-200 bg-white gap-2 flex-wrap min-h-[52px]">
      {/* ── Left: back + tools ────────────────────────────────────────── */}
      <div className="flex items-center gap-2 md:gap-4 flex-wrap">
        <button
          onClick={() => navigate('/')}
          className="p-1.5 md:p-2 hover:bg-gray-100 rounded-lg text-gray-600 transition-colors"
        >
          <ArrowLeft className="w-4 h-4 md:w-5 md:h-5" />
        </button>

        <div className="hidden sm:block h-5 w-px bg-gray-200" />

        {/* Tool picker */}
        <div className="flex bg-gray-100 p-0.5 rounded-lg shadow-inner">
          {tools.map(t => (
            <button
              key={t.id}
              onClick={() => setTool(t.id)}
              title={t.label}
              className={clsx(
                'p-1.5 rounded-md transition-all duration-150',
                currentTool === t.id
                  ? 'bg-white shadow-sm text-emerald-600'
                  : 'text-gray-500 hover:text-gray-800'
              )}
            >
              {t.icon}
            </button>
          ))}
        </div>

        {/* Color picker — shown on md+ or always if active */}
        {(currentTool === 'pen' || currentTool === 'text') && (
          <div className="flex gap-1.5 p-1 bg-gray-50 border border-gray-200 rounded-full">
            {colors.map(c => (
              <button
                key={c}
                onClick={() => setColor(c)}
                title={c}
                className={clsx(
                  'w-5 h-5 md:w-6 md:h-6 rounded-full border-2 transition-transform',
                  currentColor === c ? 'border-gray-900 scale-110 shadow-sm' : 'border-transparent'
                )}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
        )}

        {/* Size picker */}
        {(currentTool === 'pen' || currentTool === 'eraser' || currentTool === 'highlighter') && (
          <div className="hidden sm:flex items-center gap-1.5">
            {sizes.map(s => (
              <button
                key={s}
                onClick={() => setSize(s)}
                title={`Size ${s}`}
                className={clsx(
                  'rounded-full bg-gray-600 transition-all',
                  currentSize === s ? 'ring-2 ring-emerald-500 ring-offset-1 bg-gray-900' : 'hover:bg-gray-800'
                )}
                style={{ width: s + 4, height: s + 4 }}
              />
            ))}
          </div>
        )}
      </div>

      {/* ── Right: browser + export ───────────────────────────────────── */}
      {noteId && (
        <div className="relative flex items-center gap-2 pl-2 sm:pl-4 sm:border-l border-gray-200">
          {onOpenBrowser && (
            <button
              onClick={onOpenBrowser}
              className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs sm:text-sm font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition-colors border border-emerald-200"
              title="Open Study Browser"
            >
              <PanelRightOpen className="w-4 h-4" />
              <span className="hidden sm:inline">Browser</span>
            </button>
          )}

          <button
            onClick={() => setShowExportMenu(!showExportMenu)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs sm:text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors border border-gray-200"
          >
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline">Export</span>
            <ChevronDown className="w-3 h-3 hidden sm:inline" />
          </button>

          {showExportMenu && (
            <div className="absolute right-0 top-full mt-2 w-44 bg-white border border-gray-200 rounded-xl shadow-lg z-50 overflow-hidden text-sm">
              <button onClick={handleExportPDF}      className="w-full text-left px-4 py-2.5 hover:bg-emerald-50 hover:text-emerald-700 transition">As PDF</button>
              <button onClick={handleExportMarkdown} className="w-full text-left px-4 py-2.5 hover:bg-emerald-50 hover:text-emerald-700 transition">As Markdown</button>
              <button onClick={handleExportText}     className="w-full text-left px-4 py-2.5 hover:bg-emerald-50 hover:text-emerald-700 transition">As Plain Text</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
