/**
 * Global type declarations for the Electron bridge.
 * Exposed by electron/preload.ts via contextBridge.exposeInMainWorld('electron', ...)
 * This gives the React renderer full TypeScript autocomplete on window.electron.
 */

export interface BrowserTab {
  id: number;
  title: string;
  url: string;
  isLoading: boolean;
}

type ElectronChannel =
  | 'tab-url-updated'
  | 'tab-title-updated'
  | 'tab-loading'
  | 'tab-closed'
  | 'tabs-updated';

export interface ElectronBridge {
  openUrl: (tabId: number, url: string) => void;
  navigateBack: (tabId: number) => void;
  navigateForward: (tabId: number) => void;
  reload: (tabId: number) => void;

  createTab: (url?: string) => Promise<number>;
  closeTab: (tabId: number) => void;
  getTabs: () => Promise<BrowserTab[]>;
  setActiveTab: (tabId: number) => void;

  copyToClipboard: (text: string) => Promise<void>;
  readClipboard: () => Promise<string>;

  openInDefaultBrowser: (url: string) => void;
  minimizeWindow: () => void;
  maximizeWindow: () => void;
  closeWindow: () => void;

  resizePanel: (visible: boolean, x: number, y: number, width: number, height: number) => void;

  on: (channel: ElectronChannel, callback: (...args: unknown[]) => void) => () => void;
}

declare global {
  interface Window {
    /**
     * Electron IPC bridge — only available when running inside Electron.
     * Always check `window.electron` is defined before using (web fallback).
     */
    electron?: ElectronBridge;
  }
}
