/**
 * Electron Main Process — Studious AI
 *
 * Architecture:
 *  - One BrowserWindow for the React app (renderer)
 *  - Multiple BrowserViews for browser tabs (one per tab)
 *  - BrowserViews share a persistent Chromium session so cookies/logins persist
 *  - IPC handlers bridge preload ↔ main
 */

import {
  app,
  BrowserWindow,
  BrowserView,
  ipcMain,
  clipboard,
  shell,
  session,
  nativeTheme,
} from 'electron';
import * as path from 'path';

// ─── Constants ───────────────────────────────────────────────────────────────

const isDev = process.env.NODE_ENV === 'development';
const VITE_DEV_SERVER = 'http://localhost:5173';

// ─── State ───────────────────────────────────────────────────────────────────

let mainWindow: BrowserWindow | null = null;

/** Exact bounding rect of the React viewport placeholder, sent from renderer */
interface PanelRect {
  visible: boolean;
  x: number;
  y: number;
  width: number;
  height: number;
}

let panelRect: PanelRect = { visible: false, x: 0, y: 0, width: 0, height: 0 };

interface TabEntry {
  id: number;
  view: BrowserView;
  title: string;
  url: string;
  isLoading: boolean;
}

const tabs: Map<number, TabEntry> = new Map();
let activeTabId: number | null = null;
let nextTabId = 1;

// ─── Persistent session ───────────────────────────────────────────────────────

function getPersistSession() {
  return session.fromPartition('persist:studious', { cache: true });
}

// ─── BrowserView geometry ─────────────────────────────────────────────────────

function repositionActiveView() {
  if (!mainWindow || activeTabId === null) return;
  const tab = tabs.get(activeTabId);
  if (!tab) return;

  if (panelRect.visible && panelRect.width > 0 && panelRect.height > 0) {
    tab.view.setBounds({
      x: Math.round(panelRect.x),
      y: Math.round(panelRect.y),
      width: Math.round(panelRect.width),
      height: Math.round(panelRect.height),
    });
  } else {
    // Hide by pushing off-screen
    tab.view.setBounds({ x: 0, y: 0, width: 0, height: 0 });
  }
}

// ─── Tab management ───────────────────────────────────────────────────────────

function createBrowserView(url: string): TabEntry {
  const view = new BrowserView({
    webPreferences: {
      session: getPersistSession(),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  const id = nextTabId++;
  const entry: TabEntry = { id, view, title: 'New Tab', url, isLoading: false };
  tabs.set(id, entry);

  view.webContents.on('did-start-loading', () => {
    const tab = tabs.get(id);
    if (tab) tab.isLoading = true;
    mainWindow?.webContents.send('tab-loading', { tabId: id, loading: true });
  });

  view.webContents.on('did-stop-loading', () => {
    const tab = tabs.get(id);
    if (tab) tab.isLoading = false;
    mainWindow?.webContents.send('tab-loading', { tabId: id, loading: false });
  });

  view.webContents.on('page-title-updated', (_, title) => {
    const tab = tabs.get(id);
    if (tab) tab.title = title;
    mainWindow?.webContents.send('tab-title-updated', { tabId: id, title });
    mainWindow?.webContents.send('tabs-updated', getTabsSnapshot());
  });

  view.webContents.on('did-navigate', (_, navUrl) => {
    const tab = tabs.get(id);
    if (tab) tab.url = navUrl;
    mainWindow?.webContents.send('tab-url-updated', { tabId: id, url: navUrl });
    mainWindow?.webContents.send('tabs-updated', getTabsSnapshot());
  });

  view.webContents.on('did-navigate-in-page', (_, navUrl) => {
    const tab = tabs.get(id);
    if (tab) tab.url = navUrl;
    mainWindow?.webContents.send('tab-url-updated', { tabId: id, url: navUrl });
  });

  // Handle popups — OAuth/login flows
  view.webContents.setWindowOpenHandler(({ url: openUrl }) => {
    if (
      openUrl.includes('accounts.google.com') ||
      openUrl.includes('auth') ||
      openUrl.includes('oauth') ||
      openUrl.includes('login')
    ) {
      createPopupWindow(openUrl);
      return { action: 'deny' };
    }
    // Open other links as a new tab inside the app
    const newEntry = createBrowserView(openUrl);
    if (mainWindow) {
      mainWindow.addBrowserView(newEntry.view);
      setActiveView(newEntry.id);
      mainWindow.webContents.send('tabs-updated', getTabsSnapshot());
    }
    return { action: 'deny' };
  });

  view.webContents.loadURL(url);
  return entry;
}

function createPopupWindow(url: string) {
  const popup = new BrowserWindow({
    width: 520,
    height: 720,
    parent: mainWindow || undefined,
    modal: false,
    webPreferences: {
      session: getPersistSession(),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });
  popup.loadURL(url);
}

function getTabsSnapshot() {
  return Array.from(tabs.values()).map((t) => ({
    id: t.id,
    title: t.title,
    url: t.url,
    isLoading: t.isLoading,
  }));
}

function setActiveView(tabId: number) {
  if (!mainWindow) return;
  const tab = tabs.get(tabId);
  if (!tab) return;

  // Remove previous active view from window
  if (activeTabId !== null && activeTabId !== tabId) {
    const prev = tabs.get(activeTabId);
    if (prev) mainWindow.removeBrowserView(prev.view);
  }

  activeTabId = tabId;
  mainWindow.addBrowserView(tab.view);
  repositionActiveView();
}

// ─── IPC Handlers ─────────────────────────────────────────────────────────────

function registerIPC() {
  // ── Tab lifecycle ──────────────────────────────────────────────────────────

  ipcMain.handle('browser:create-tab', (_, { url }: { url: string }) => {
    const entry = createBrowserView(url || 'https://google.com');
    if (mainWindow) mainWindow.addBrowserView(entry.view);
    setActiveView(entry.id);
    mainWindow?.webContents.send('tabs-updated', getTabsSnapshot());
    return entry.id;
  });

  ipcMain.on('browser:close-tab', (_, { tabId }: { tabId: number }) => {
    const tab = tabs.get(tabId);
    if (!tab) return;

    mainWindow?.removeBrowserView(tab.view);
    // .destroy() is an internal API removed from TS types in Electron 28+,
    // but still works at runtime and is needed to prevent memory leaks.
    (tab.view.webContents as any).destroy();
    tabs.delete(tabId);

    mainWindow?.webContents.send('tab-closed', { tabId });
    mainWindow?.webContents.send('tabs-updated', getTabsSnapshot());

    if (activeTabId === tabId) {
      activeTabId = null;
      const remaining = Array.from(tabs.keys());
      if (remaining.length > 0) setActiveView(remaining[remaining.length - 1]);
    }
  });

  ipcMain.handle('browser:get-tabs', () => getTabsSnapshot());

  ipcMain.on('browser:set-active-tab', (_, { tabId }: { tabId: number }) => {
    setActiveView(tabId);
  });

  // ── Navigation ─────────────────────────────────────────────────────────────

  ipcMain.on('browser:navigate', (_, { tabId, url }: { tabId: number; url: string }) => {
    const tab = tabs.get(tabId);
    if (!tab) return;

    let finalUrl = url;
    if (!finalUrl.startsWith('http://') && !finalUrl.startsWith('https://')) {
      finalUrl = finalUrl.includes('.') && !finalUrl.includes(' ')
        ? 'https://' + finalUrl
        : `https://www.google.com/search?q=${encodeURIComponent(finalUrl)}`;
    }
    tab.view.webContents.loadURL(finalUrl);
  });

  ipcMain.on('browser:back', (_, { tabId }: { tabId: number }) => {
    const tab = tabs.get(tabId);
    if (tab?.view.webContents.canGoBack()) tab.view.webContents.goBack();
  });

  ipcMain.on('browser:forward', (_, { tabId }: { tabId: number }) => {
    const tab = tabs.get(tabId);
    if (tab?.view.webContents.canGoForward()) tab.view.webContents.goForward();
  });

  ipcMain.on('browser:reload', (_, { tabId }: { tabId: number }) => {
    tabs.get(tabId)?.view.webContents.reload();
  });

  // ── Panel layout ───────────────────────────────────────────────────────────
  // React sends the EXACT bounding rect of the viewport placeholder div.
  // We use this to position the BrowserView precisely, leaving the tab bar
  // and navigation bar fully interactive in the React layer.

  ipcMain.on(
    'browser:panel-resize',
    (_, rect: PanelRect) => {
      panelRect = rect;

      // When the panel becomes visible, ensure the active BrowserView
      // is attached to the window (it might not be if the panel was closed/reopened)
      if (rect.visible && activeTabId !== null && mainWindow) {
        const tab = tabs.get(activeTabId);
        if (tab) {
          const attached = mainWindow.getBrowserViews();
          if (!attached.includes(tab.view)) {
            mainWindow.addBrowserView(tab.view);
          }
        }
      }

      repositionActiveView();
    }
  );

  // ── Clipboard ──────────────────────────────────────────────────────────────

  ipcMain.handle('clipboard:write', (_, { text }: { text: string }) => {
    clipboard.writeText(text);
  });

  ipcMain.handle('clipboard:read', () => clipboard.readText());

  // ── Shell / Window ─────────────────────────────────────────────────────────

  ipcMain.on('shell:open-external', (_, { url }: { url: string }) => {
    shell.openExternal(url);
  });

  ipcMain.on('window:minimize', () => mainWindow?.minimize());
  ipcMain.on('window:maximize', () => {
    mainWindow?.isMaximized() ? mainWindow.restore() : mainWindow?.maximize();
  });
  ipcMain.on('window:close', () => mainWindow?.close());
}

// ─── Window creation ──────────────────────────────────────────────────────────

function createMainWindow() {
  nativeTheme.themeSource = 'light';

  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 900,
    minHeight: 600,
    frame: true,
    backgroundColor: '#f9fafb',
    title: 'Studious AI',
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      webviewTag: false,
    },
  });

  if (isDev) {
    mainWindow.loadURL(VITE_DEV_SERVER);
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  // Reposition BrowserView whenever the window moves or resizes
  mainWindow.on('resize', repositionActiveView);
  mainWindow.on('maximize', repositionActiveView);
  mainWindow.on('unmaximize', repositionActiveView);
  mainWindow.on('move', repositionActiveView);

  mainWindow.on('closed', () => {
    mainWindow = null;
    tabs.forEach((tab) => (tab.view.webContents as any).destroy());
    tabs.clear();
  });
}

// ─── App lifecycle ────────────────────────────────────────────────────────────

app.whenReady().then(() => {
  registerIPC();
  createMainWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createMainWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
