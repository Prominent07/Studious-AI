import React, { useRef, useState, useEffect } from 'react';
import { useStore } from '../../store/useStore';
import { Stroke } from '../../types';
import { v4 as uuidv4 } from 'uuid';
import { ScanText, Loader2, Undo2, Redo2 } from 'lucide-react';
import Tesseract from 'tesseract.js';

interface DrawingCanvasProps {
  noteId: string;
}

export default function DrawingCanvas({ noteId }: DrawingCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const { notes, updateNote, currentTool, currentColor, currentSize } = useStore();
  
  const note = notes.find(n => n.id === noteId);
  const [isDrawing, setIsDrawing] = useState(false);
  const [localStrokes, setLocalStrokes] = useState<Stroke[]>(note?.strokes || []);
  const [redoStrokes, setRedoStrokes] = useState<Stroke[]>([]);
  const [currentStroke, setCurrentStroke] = useState<Stroke | null>(null);
  const [isOcrProcessing, setIsOcrProcessing] = useState(false);

  // Keyboard shortcuts for Undo / Redo
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if typing in an input
      if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA') return;
      
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        e.preventDefault();
        handleUndo();
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'y') {
        e.preventDefault();
        handleRedo();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  });

  const handleUndo = () => {
    setLocalStrokes(prev => {
      if (prev.length === 0) return prev;
      const newStrokes = [...prev];
      const popped = newStrokes.pop();
      if (popped) {
        setRedoStrokes(r => [...r, popped]);
      }
      if (noteId) updateNote(noteId, { strokes: newStrokes });
      return newStrokes;
    });
  };

  const handleRedo = () => {
    setRedoStrokes(prev => {
      if (prev.length === 0) return prev;
      const newRedo = [...prev];
      const popped = newRedo.pop();
      if (popped) {
        setLocalStrokes(s => {
          const newLocal = [...s, popped];
          if (noteId) updateNote(noteId, { strokes: newLocal });
          return newLocal;
        });
      }
      return newRedo;
    });
  };

  // Resize observer
  useEffect(() => {
    const handleResize = () => {
      if (canvasRef.current && containerRef.current) {
        canvasRef.current.width = containerRef.current.offsetWidth;
        canvasRef.current.height = containerRef.current.offsetHeight;
        redrawCanvas();
      }
    };
    
    // Initial size
    handleResize();

    const observer = new ResizeObserver(() => {
      handleResize();
    });
    
    if (containerRef.current) {
      observer.observe(containerRef.current);
    }
    
    return () => {
      observer.disconnect();
    };
  }, [localStrokes]);

  // Sync from store when switching notes
  useEffect(() => {
    setLocalStrokes(note?.strokes || []);
  }, [note?.id]);

  const redrawCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw all completed strokes
    localStrokes.forEach(drawStroke);
    
    // Draw the current in-progress stroke
    if (currentStroke) {
      drawStroke(currentStroke);
    }
  };

  const drawStroke = (stroke: Stroke) => {
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    
    // For eraser, we could theoretically do destination-out, but here we'll just simulate it as white ink for simplicity
    if (stroke.color === 'eraser') {
      ctx.globalCompositeOperation = 'destination-out';
      ctx.lineWidth = stroke.size * 3;
    } else if (stroke.color === 'highlighter') {
      ctx.globalCompositeOperation = 'source-over';
      ctx.strokeStyle = '#ffff0055'; // Yellowish semi-transparent
      ctx.lineWidth = stroke.size * 5;
    } else {
      ctx.globalCompositeOperation = 'source-over';
      ctx.strokeStyle = stroke.color;
      ctx.lineWidth = stroke.size;
    }

    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    
    if (stroke.points.length === 0) return;

    ctx.beginPath();
    ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
    
    for (let i = 1; i < stroke.points.length; i++) {
      ctx.lineTo(stroke.points[i].x, stroke.points[i].y);
    }
    
    ctx.stroke();
    // Reset composite
    ctx.globalCompositeOperation = 'source-over';
  };

  useEffect(() => {
    redrawCanvas();
  }, [localStrokes, currentStroke]);

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    // Only allow drawing if pen/eraser/highlighter. Not for text/lasso
    if (currentTool === 'text' || currentTool === 'lasso') return;
    
    setIsDrawing(true);
    const pos = getCoordinates(e);
    if (!pos) return;

    let colorToUse = currentColor;
    if (currentTool === 'eraser') colorToUse = 'eraser';
    if (currentTool === 'highlighter') colorToUse = 'highlighter';

    setCurrentStroke({
      id: uuidv4(),
      color: colorToUse,
      size: currentSize,
      points: [pos]
    });
  };

  const tryDraw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing || !currentStroke) return;
    const pos = getCoordinates(e);
    if (!pos) return;
    
    setCurrentStroke(prev => {
      if (!prev) return null;
      return {
        ...prev,
        points: [...prev.points, pos]
      };
    });
  };

  const endDrawing = () => {
    if (!isDrawing || !currentStroke) return;
    setIsDrawing(false);
    
    // Clear redo history on new stroke
    setRedoStrokes([]);

    const newStrokes = [...localStrokes, currentStroke];
    setLocalStrokes(newStrokes);
    setCurrentStroke(null);
    
    // Save to global store
    if (noteId) {
      updateNote(noteId, { strokes: newStrokes });
    }
  };

  const getCoordinates = (e: React.MouseEvent | React.TouchEvent) => {
    if (!canvasRef.current) return null;
    const rect = canvasRef.current.getBoundingClientRect();
    
    let clientX, clientY;
    if ('touches' in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }
    
    return {
      x: clientX - rect.left,
      y: clientY - rect.top
    };
  };

  const handleOcrConversion = async () => {
    if (!canvasRef.current || !note) return;
    try {
      setIsOcrProcessing(true);
      const dataUrl = canvasRef.current.toDataURL('image/png');
      const { data: { text } } = await Tesseract.recognize(
        dataUrl,
        'eng',
        { logger: m => console.log(m) }
      );
      
      const newContent = note.content ? note.content + '\n' + text : text;
      updateNote(note.id, { content: newContent });
    } catch (err) {
      console.error('OCR failed', err);
    } finally {
      setIsOcrProcessing(false);
    }
  };

  return (
    <div className="w-full h-full relative bg-transparent" ref={containerRef}>
      <div className="absolute top-4 right-4 z-20 flex items-center gap-2">
        <button
          onClick={handleUndo}
          disabled={localStrokes.length === 0}
          className="p-2 bg-white rounded-xl shadow-sm border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-50 transition-colors"
          title="Undo (Ctrl+Z)"
        >
          <Undo2 className="w-5 h-5" />
        </button>
        <button
          onClick={handleRedo}
          disabled={redoStrokes.length === 0}
          className="p-2 bg-white rounded-xl shadow-sm border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-50 transition-colors"
          title="Redo (Ctrl+Y)"
        >
          <Redo2 className="w-5 h-5" />
        </button>
      </div>
      <canvas
        ref={canvasRef}
        className="absolute inset-0 cursor-crosshair touch-none"
        onMouseDown={startDrawing}
        onMouseMove={tryDraw}
        onMouseUp={endDrawing}
        onMouseLeave={endDrawing}
        onTouchStart={startDrawing}
        onTouchMove={tryDraw}
        onTouchEnd={endDrawing}
      />
      {localStrokes.length > 0 && (
        <button
          onClick={handleOcrConversion}
          disabled={isOcrProcessing}
          className="absolute bottom-6 left-6 flex items-center justify-center gap-2 px-4 py-2 bg-gray-900 border border-gray-800 text-white rounded-lg shadow whitespace-nowrap hover:bg-gray-800 disabled:opacity-50 transition-colors z-20 pointer-events-auto"
          title="Convert handwriting to text"
        >
          {isOcrProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <ScanText className="w-4 h-4" />}
          <span className="text-sm font-medium">{isOcrProcessing ? 'Reading...' : 'To Text'}</span>
        </button>
      )}
    </div>
  );
}
