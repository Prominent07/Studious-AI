/**
 * Electron Preload Script
 * Runs in renderer context but has access to Node.js APIs.
 * Exposes a safe, typed API to the React app via contextBridge.
 * Node integration is DISABLED in the renderer — this is the only bridge.
 */

import { contextBridge, ipcRenderer } from 'electron';

// ─── Type definitions exposed to the renderer ───────────────────────────────

export interface BrowserTab {
  id: number;
  title: string;
  url: string;
}

export interface ElectronBridge {
  // Navigation
  openUrl: (tabId: number, url: string) => void;
  navigateBack: (tabId: number) => void;
  navigateForward: (tabId: number) => void;
  reload: (tabId: number) => void;

  // Tab management
  createTab: (url?: string) => Promise<number>;
  closeTab: (tabId: number) => void;
  getTabs: () => Promise<BrowserTab[]>;
  setActiveTab: (tabId: number) => void;

  // Clipboard
  copyToClipboard: (text: string) => Promise<void>;
  readClipboard: () => Promise<string>;

  // Window
  openInDefaultBrowser: (url: string) => void;
  minimizeWindow: () => void;
  maximizeWindow: () => void;
  closeWindow: () => void;

  // Panel layout — sends the exact bounding rect of the viewport placeholder div
  resizePanel: (visible: boolean, x: number, y: number, width: number, height: number) => void;

  // Events — renderer can listen to events from main
  on: (channel: ElectronChannel, callback: (...args: unknown[]) => void) => () => void;
}

type ElectronChannel =
  | 'tab-url-updated'
  | 'tab-title-updated'
  | 'tab-loading'
  | 'tab-closed'
  | 'tabs-updated';

// ─── Build the bridge ────────────────────────────────────────────────────────

const electronBridge: ElectronBridge = {
  // Navigation
  openUrl: (tabId, url) => ipcRenderer.send('browser:navigate', { tabId, url }),
  navigateBack: (tabId) => ipcRenderer.send('browser:back', { tabId }),
  navigateForward: (tabId) => ipcRenderer.send('browser:forward', { tabId }),
  reload: (tabId) => ipcRenderer.send('browser:reload', { tabId }),

  // Tab management
  createTab: (url = 'https://google.com') =>
    ipcRenderer.invoke('browser:create-tab', { url }),

  closeTab: (tabId) => ipcRenderer.send('browser:close-tab', { tabId }),

  getTabs: () => ipcRenderer.invoke('browser:get-tabs'),

  setActiveTab: (tabId) => ipcRenderer.send('browser:set-active-tab', { tabId }),

  // Clipboard
  copyToClipboard: (text) => ipcRenderer.invoke('clipboard:write', { text }),
  readClipboard: () => ipcRenderer.invoke('clipboard:read'),

  // Window controls
  openInDefaultBrowser: (url) => ipcRenderer.send('shell:open-external', { url }),
  minimizeWindow: () => ipcRenderer.send('window:minimize'),
  maximizeWindow: () => ipcRenderer.send('window:maximize'),
  closeWindow: () => ipcRenderer.send('window:close'),

  // Panel layout
  resizePanel: (visible, x, y, width, height) =>
    ipcRenderer.send('browser:panel-resize', { visible, x, y, width, height }),

  // Event listener — returns unsubscribe fn for cleanup
  on: (channel, callback) => {
    const validChannels: ElectronChannel[] = [
      'tab-url-updated',
      'tab-title-updated',
      'tab-loading',
      'tab-closed',
      'tabs-updated',
    ];

    if (!validChannels.includes(channel)) {
      console.warn(`[preload] Blocked unknown channel: ${channel}`);
      return () => {};
    }

    const handler = (_event: Electron.IpcRendererEvent, ...args: unknown[]) =>
      callback(...args);

    ipcRenderer.on(channel, handler);

    // Return cleanup function
    return () => ipcRenderer.removeListener(channel, handler);
  },
};

// ─── Expose to renderer under window.electron ────────────────────────────────
contextBridge.exposeInMainWorld('electron', electronBridge);
