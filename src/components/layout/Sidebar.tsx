import React, { useState } from 'react';
import { Home, FolderIcon, Plus, FileText, ChevronLeft, ChevronRight } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { clsx } from 'clsx';
import { useNavigate } from 'react-router-dom';

export default function Sidebar() {
  const { folders, activeFolderId, setActiveFolder, addFolder } = useStore();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);

  const handleAddFolder = () => {
    const name = prompt('Folder name:');
    if (name) addFolder(name);
  };

  return (
    <div
      className={clsx(
        'relative border-r border-gray-100 flex flex-col bg-white h-screen transition-all duration-300 shrink-0',
        collapsed ? 'w-14' : 'w-56 xl:w-64'
      )}
    >
      {/* Logo */}
      <div className={clsx('flex items-center gap-3 p-4 mb-4', collapsed && 'justify-center')}>
        <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center shrink-0">
          <FileText className="text-white w-4 h-4" />
        </div>
        {!collapsed && (
          <span className="font-serif text-lg font-bold tracking-tight text-gray-900 truncate">
            Studious AI
          </span>
        )}
      </div>

      {/* Nav */}
      <div className="flex-1 overflow-y-auto px-2">
        <nav className="space-y-1 mb-6">
          <button
            onClick={() => { setActiveFolder(null); navigate('/'); }}
            title="All Notes"
            className={clsx(
              'w-full flex items-center gap-3 px-2 py-2 rounded-lg text-sm font-medium transition-colors',
              collapsed && 'justify-center',
              activeFolderId === null
                ? 'bg-emerald-50 text-emerald-700'
                : 'text-gray-600 hover:bg-gray-50'
            )}
          >
            <Home className="w-5 h-5 shrink-0" />
            {!collapsed && <span>All Notes</span>}
          </button>
        </nav>

        {!collapsed && (
          <div className="mb-4">
            <div className="flex items-center justify-between px-2 text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
              <span>Folders</span>
              <button
                onClick={handleAddFolder}
                className="hover:bg-gray-100 p-1 rounded-full text-gray-400 hover:text-emerald-500 transition-colors"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-1">
              {folders.map(folder => (
                <button
                  key={folder.id}
                  onClick={() => { setActiveFolder(folder.id); navigate('/'); }}
                  className={clsx(
                    'w-full flex items-center gap-3 px-2 py-2 rounded-lg text-sm font-medium transition-colors',
                    activeFolderId === folder.id
                      ? 'bg-emerald-50 text-emerald-700'
                      : 'text-gray-600 hover:bg-gray-50'
                  )}
                >
                  <FolderIcon className="w-4 h-4 shrink-0" />
                  <span className="truncate">{folder.name}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Collapsed folder icons */}
        {collapsed && (
          <div className="space-y-1">
            {folders.map(folder => (
              <button
                key={folder.id}
                onClick={() => { setActiveFolder(folder.id); navigate('/'); }}
                title={folder.name}
                className={clsx(
                  'w-full flex items-center justify-center p-2 rounded-lg transition-colors',
                  activeFolderId === folder.id
                    ? 'bg-emerald-50 text-emerald-700'
                    : 'text-gray-400 hover:bg-gray-50'
                )}
              >
                <FolderIcon className="w-5 h-5" />
              </button>
            ))}
            <button
              onClick={handleAddFolder}
              title="New Folder"
              className="w-full flex items-center justify-center p-2 rounded-lg text-gray-400 hover:bg-gray-50 hover:text-emerald-500 transition-colors"
            >
              <Plus className="w-5 h-5" />
            </button>
          </div>
        )}
      </div>

      {/* Collapse toggle */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 bg-white border border-gray-200 rounded-full flex items-center justify-center shadow-sm hover:bg-gray-50 text-gray-500 transition-colors z-10"
        title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      >
        {collapsed ? <ChevronRight className="w-3 h-3" /> : <ChevronLeft className="w-3 h-3" />}
      </button>
    </div>
  );
}
