import React, { useState, useEffect, useRef } from 'react';
import {
  ExternalLink,
  RefreshCw,
  X,
  ChevronLeft,
  ChevronRight,
  Globe,
  Maximize2,
  Minimize2,
  Plus,
  Loader2,
  Lock,
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Tab {
  id: number;
  title: string;
  url: string;
  isLoading: boolean;
}

const QUICK_LINKS = [
  { name: 'ChatGPT',    url: 'https://chatgpt.com',            icon: '🤖' },
  { name: 'Claude',     url: 'https://claude.ai',              icon: '🧠' },
  { name: 'AI Studio',  url: 'https://aistudio.google.com',    icon: '✨' },
  { name: 'Google',     url: 'https://google.com',             icon: '🔍' },
  { name: 'YouTube',    url: 'https://youtube.com',            icon: '📺' },
];

interface StudyBrowserProps {
  onClose: () => void;
  isExpanded?: boolean;
  onToggleExpand?: () => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function StudyBrowser({ onClose, isExpanded, onToggleExpand }: StudyBrowserProps) {
  const isElectron = typeof window !== 'undefined' && !!window.electron;

  // Tab state
  const [tabs, setTabs] = useState<Tab[]>([]);
  const [activeTabId, setActiveTabId] = useState<number | null>(null);
  const [inputUrl, setInputUrl] = useState('https://google.com');
  const [loadingMap, setLoadingMap] = useState<Record<number, boolean>>({});

  // Web-only fallback (iframe) — only used outside Electron
  const [fallbackUrl, setFallbackUrl] = useState('https://google.com');

  // Container ref so we can report our panel width to Electron's BrowserView
  const containerRef = useRef<HTMLDivElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null); // measures viewport placeholder for BrowserView positioning

  // ── Electron bridge bootstrap ─────────────────────────────────────────────
  useEffect(() => {
    if (!isElectron || !window.electron) {
      // Running in a regular browser — use a simple web fallback
      const seed: Tab = { id: 1, title: 'Google', url: 'https://google.com', isLoading: false };
      setTabs([seed]);
      setActiveTabId(1);
      return;
    }

    const bridge = window.electron;

    // Fetch existing tabs or seed a first one
    bridge.getTabs().then((remoteTabs) => {
      if (remoteTabs.length === 0) {
        bridge.createTab('https://google.com').then((id) => {
          const seed: Tab = { id, title: 'New Tab', url: 'https://google.com', isLoading: false };
          setTabs([seed]);
          setActiveTabId(id);
        });
      } else {
        const typed = remoteTabs as Tab[];
        setTabs(typed);
        setActiveTabId(typed[0].id);
        setInputUrl(typed[0].url);
      }
    });

    // Live updates from main process
    const unTabs = bridge.on('tabs-updated', (raw) => {
      setTabs(raw as Tab[]);
    });

    const unUrl = bridge.on('tab-url-updated', (raw) => {
      const { tabId, url } = raw as { tabId: number; url: string };
      setTabs((prev) => prev.map((t) => (t.id === tabId ? { ...t, url } : t)));
      setActiveTabId((cur) => {
        if (cur === tabId) setInputUrl(url);
        return cur;
      });
    });

    const unTitle = bridge.on('tab-title-updated', (raw) => {
      const { tabId, title } = raw as { tabId: number; title: string };
      setTabs((prev) => prev.map((t) => (t.id === tabId ? { ...t, title } : t)));
    });

    const unLoading = bridge.on('tab-loading', (raw) => {
      const { tabId, loading } = raw as { tabId: number; loading: boolean };
      setLoadingMap((prev) => ({ ...prev, [tabId]: loading }));
    });

    return () => {
      unTabs();
      unUrl();
      unTitle();
      unLoading();
    };
  }, [isElectron]);

  // ── Sync BrowserView position/size with viewport placeholder ─────────────
  // IMPORTANT: We observe only the VIEWPORT div (bottom area), NOT the full
  // container — this keeps the tab/nav bars fully interactive in React.
  useEffect(() => {
    if (!isElectron || !window.electron || !viewportRef.current) return;

    const bridge = window.electron;

    const sendRect = () => {
      if (!viewportRef.current) return;
      const rect = viewportRef.current.getBoundingClientRect();

      // Guard: don't send if layout hasn't settled yet (both dims must be > 0)
      if (rect.width <= 0 || rect.height <= 0) return;

      bridge.resizePanel(
        true,
        Math.round(rect.left),
        Math.round(rect.top),
        Math.round(rect.width),
        Math.round(rect.height)
      );
    };

    // ResizeObserver fires on every size change (panel drag, window resize)
    const observer = new ResizeObserver(sendRect);
    observer.observe(viewportRef.current);

    window.addEventListener('resize', sendRect);

    // Delay initial measurement until AFTER the panel animation settles.
    // requestAnimationFrame waits for paint; setTimeout(150) covers slow flex transitions.
    let timer: ReturnType<typeof setTimeout>;
    requestAnimationFrame(() => {
      sendRect(); // try after first paint
      timer = setTimeout(sendRect, 150); // retry after panel slide-in completes
    });

    return () => {
      clearTimeout(timer);
      observer.disconnect();
      window.removeEventListener('resize', sendRect);
      bridge.resizePanel(false, 0, 0, 0, 0);
    };
  }, [isElectron]);

  // ── Derived ───────────────────────────────────────────────────────────────
  const activeTab = tabs.find((t) => t.id === activeTabId);
  const isLoading = activeTabId !== null && !!loadingMap[activeTabId];

  // ── Actions ───────────────────────────────────────────────────────────────

  const navigateTo = (url: string) => {
    let finalUrl = url;
    if (!finalUrl.startsWith('http://') && !finalUrl.startsWith('https://')) {
      finalUrl = finalUrl.includes('.') && !finalUrl.includes(' ')
        ? 'https://' + finalUrl
        : `https://www.google.com/search?q=${encodeURIComponent(finalUrl)}`;
    }
    setInputUrl(finalUrl);

    if (isElectron && window.electron && activeTabId !== null) {
      window.electron.openUrl(activeTabId, finalUrl);
    } else {
      setFallbackUrl(finalUrl);
    }
  };

  const handleNavigateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    navigateTo(inputUrl);
  };

  const handleNewTab = async (url = 'https://google.com') => {
    if (isElectron && window.electron) {
      const id = await window.electron.createTab(url);
      setActiveTabId(id);
      setInputUrl(url);
    } else {
      const id = Date.now();
      setTabs((prev) => [...prev, { id, title: 'New Tab', url, isLoading: false }]);
      setActiveTabId(id);
      setFallbackUrl(url);
      setInputUrl(url);
    }
  };

  const handleCloseTab = (e: React.MouseEvent, tabId: number) => {
    e.stopPropagation();
    if (tabs.length === 1) { onClose(); return; }

    if (isElectron && window.electron) {
      window.electron.closeTab(tabId);
    } else {
      const remaining = tabs.filter((t) => t.id !== tabId);
      setTabs(remaining);
      if (activeTabId === tabId) {
        const next = remaining[remaining.length - 1];
        setActiveTabId(next.id);
        setFallbackUrl(next.url);
        setInputUrl(next.url);
      }
    }
  };

  const handleSwitchTab = (tabId: number) => {
    setActiveTabId(tabId);
    const tab = tabs.find((t) => t.id === tabId);
    if (tab) {
      setInputUrl(tab.url);
      if (isElectron && window.electron) {
        window.electron.setActiveTab(tabId);
      } else {
        setFallbackUrl(tab.url);
      }
    }
  };

  const handleOpenExternal = () => {
    const url = activeTab?.url ?? fallbackUrl;
    if (isElectron && window.electron) {
      window.electron.openInDefaultBrowser(url);
    } else {
      window.open(url, '_blank');
    }
  };

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div
      ref={containerRef}
      className="flex flex-col h-full bg-gray-950 border-l border-gray-800/80 text-white w-full overflow-hidden relative"
    >
      {/* ── Tab Bar ─────────────────────────────────────────────────────────── */}
      <div className="flex items-end bg-gray-900 border-b border-gray-800 h-10 px-2 gap-0.5 shrink-0 select-none">
        <div className="flex items-end gap-0.5 overflow-x-auto no-scrollbar flex-1">
          {tabs.map((tab) => {
            const isActive = tab.id === activeTabId;
            return (
              <div
                key={tab.id}
                onClick={() => handleSwitchTab(tab.id)}
                className={`
                  group flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-t-lg cursor-pointer
                  max-w-[150px] min-w-[80px] transition-all duration-150 border-t-2 shrink-0
                  ${isActive
                    ? 'bg-gray-800 text-emerald-400 border-emerald-500 font-semibold shadow'
                    : 'bg-transparent text-gray-500 border-transparent hover:bg-gray-800/50 hover:text-gray-300 font-medium'}
                `}
              >
                {loadingMap[tab.id]
                  ? <Loader2 className="w-3 h-3 animate-spin text-emerald-400 shrink-0" />
                  : <Globe className="w-3 h-3 shrink-0 opacity-60" />
                }
                <span className="truncate flex-1">{tab.title || 'Loading…'}</span>
                <button
                  onClick={(e) => handleCloseTab(e, tab.id)}
                  className="p-0.5 rounded-full hover:bg-gray-700 hover:text-white opacity-0 group-hover:opacity-100 transition-all"
                >
                  <X className="w-2.5 h-2.5" />
                </button>
              </div>
            );
          })}

          <button
            onClick={() => handleNewTab()}
            className="p-1 mb-1.5 ml-1 text-gray-500 hover:text-emerald-400 hover:bg-gray-800 rounded-lg transition-all shrink-0"
            title="New Tab"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Window controls */}
        <div className="flex items-center gap-1 mb-1.5 shrink-0">
          {onToggleExpand && (
            <button
              onClick={onToggleExpand}
              className="p-1 text-gray-500 hover:text-emerald-400 hover:bg-gray-800 rounded-lg transition-all"
              title={isExpanded ? 'Collapse' : 'Expand'}
            >
              {isExpanded ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
            </button>
          )}
          <button
            onClick={onClose}
            className="p-1 text-gray-500 hover:text-red-400 hover:bg-gray-800 rounded-lg transition-all"
            title="Close"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* ── Navigation Bar ──────────────────────────────────────────────────── */}
      <div className="flex items-center gap-1.5 px-3 py-2 bg-gray-800/80 border-b border-gray-700/50 shrink-0">
        <button
          onClick={() => isElectron && window.electron && activeTabId !== null && window.electron.navigateBack(activeTabId)}
          className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-gray-700 transition"
          title="Back"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <button
          onClick={() => isElectron && window.electron && activeTabId !== null && window.electron.navigateForward(activeTabId)}
          className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-gray-700 transition"
          title="Forward"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
        <button
          onClick={() => {
            if (isElectron && window.electron && activeTabId !== null) {
              window.electron.reload(activeTabId);
            } else {
              const f = document.getElementById('sb-fallback') as HTMLIFrameElement;
              if (f) f.src = f.src;
            }
          }}
          className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-gray-700 transition"
          title="Reload"
        >
          {isLoading
            ? <Loader2 className="w-4 h-4 animate-spin text-emerald-400" />
            : <RefreshCw className="w-4 h-4" />
          }
        </button>

        {/* URL input */}
        <form onSubmit={handleNavigateSubmit} className="flex-1 flex items-center bg-gray-900 border border-gray-700/80 rounded-lg px-3 overflow-hidden focus-within:border-emerald-500/60 transition-colors">
          {isElectron
            ? <Lock className="w-3 h-3 text-emerald-400/70 mr-2 shrink-0" />
            : <Globe className="w-3 h-3 text-gray-500 mr-2 shrink-0" />
          }
          <input
            type="text"
            value={inputUrl}
            onChange={(e) => setInputUrl(e.target.value)}
            className="w-full bg-transparent py-1.5 text-xs text-white placeholder-gray-600 focus:outline-none font-mono tracking-wide"
            placeholder="Search or enter address…"
          />
        </form>

        <button
          onClick={handleOpenExternal}
          className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-gray-700 transition shrink-0"
          title="Open in default browser"
        >
          <ExternalLink className="w-4 h-4" />
        </button>
      </div>

      {/* ── Quick Launch Bar ─────────────────────────────────────────────────── */}
      <div className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-900 border-b border-gray-800/60 overflow-x-auto no-scrollbar shrink-0 select-none">
        <span className="text-[9px] font-bold text-gray-600 uppercase tracking-widest shrink-0">AI:</span>
        {QUICK_LINKS.map((link) => (
          <button
            key={link.name}
            onClick={() => navigateTo(link.url)}
            className="flex items-center gap-1.5 px-2.5 py-1 bg-gray-800 hover:bg-gray-700 border border-gray-700/50 hover:border-emerald-600/50 rounded-full text-[11px] font-semibold text-gray-300 hover:text-emerald-400 transition-all shrink-0 hover:scale-[1.02]"
          >
            <span className="text-sm leading-none">{link.icon}</span>
            <span>{link.name}</span>
          </button>
        ))}
      </div>

      {/* ── Browser Viewport ─────────────────────────────────────────────────── */}
      <div ref={viewportRef} className="flex-1 relative overflow-hidden">
        {isElectron ? (
          /**
           * In Electron: this div acts as a transparent "ghost" placeholder.
           * The real native Chromium BrowserView is layered directly on top
           * by the main process, aligned to our exact pixel coordinates.
           * No iframe needed — cookies, sessions, and logins all work natively.
           */
          <div className="absolute inset-0 bg-gray-900 flex flex-col items-center justify-center gap-3 text-center select-none pointer-events-none">
            <div className="w-14 h-14 rounded-2xl bg-gray-800 border border-gray-700 flex items-center justify-center shadow-xl">
              <Globe className="w-7 h-7 text-emerald-400/70" />
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-300">Native Chromium Browser</p>
              <p className="text-xs text-gray-600 mt-1 max-w-[220px] leading-relaxed">
                Sessions persist. ChatGPT &amp; Claude log in just like Chrome.
              </p>
            </div>
          </div>
        ) : (
          /* Web Dev Fallback — iframe only used when running `npm run dev` in browser */
          <div className="w-full h-full relative">
            <iframe
              id="sb-fallback"
              src={fallbackUrl}
              className="w-full h-full border-none bg-white"
              sandbox="allow-same-origin allow-scripts allow-popups allow-forms"
              title="Study Browser"
            />
            {/* Friendly notice when a site blocks iframes */}
            {(fallbackUrl.includes('chatgpt.com')
              || fallbackUrl.includes('claude.ai')
              || fallbackUrl.includes('aistudio.google.com')
            ) && (
              <div className="absolute inset-0 bg-gray-950/95 flex flex-col items-center justify-center p-6 text-center backdrop-blur-sm">
                <Globe className="w-10 h-10 text-gray-500 mb-3" />
                <h3 className="text-sm font-bold text-white mb-1">Site blocks iframe embedding</h3>
                <p className="text-xs text-gray-400 mb-4 max-w-xs leading-relaxed">
                  Run <code className="text-emerald-400">npm run electron:dev</code> to open these
                  AI sites in the native browser panel with full session support.
                </p>
                <button
                  onClick={handleOpenExternal}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-lg transition"
                >
                  Open in Browser Tab
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
