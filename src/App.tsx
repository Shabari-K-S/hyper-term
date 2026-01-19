import React, { useState, useRef, useEffect } from 'react';
import { Settings as SettingsComponent } from "./components/Settings";
import { WelcomePage } from "./components/WelcomePage";
import { PaneContainer } from "./components/PaneContainer";
import { ChevronDown, Settings, Minus, Square, X, Plus, TerminalSquare, Settings as SettingsIcon } from "lucide-react";
import { getCurrentWindow } from '@tauri-apps/api/window';
import "./App.css";
import { DEFAULT_PROFILES } from './config/profiles';
import { PRESET_THEMES, Theme } from './config/themes';
import { Profile, SSHProfile } from './types';
import { PaneNode, createTerminalPane, generatePaneId } from './types/pane';
import { loadSSHProfiles, loadThemeId } from './lib/store';
import { listen } from '@tauri-apps/api/event';

// Helper: Apply theme to CSS variables
const applyTheme = (theme: Theme) => {
  const root = document.documentElement;
  root.style.setProperty('--background', theme.background);
  root.style.setProperty('--foreground', theme.foreground);
  root.style.setProperty('--cursor', theme.cursor);
  root.style.setProperty('--selection-background', theme.selectionBackground);
  root.style.setProperty('--color-black', theme.black);
  root.style.setProperty('--color-red', theme.red);
  root.style.setProperty('--color-green', theme.green);
  root.style.setProperty('--color-yellow', theme.yellow);
  root.style.setProperty('--color-blue', theme.blue);
  root.style.setProperty('--color-magenta', theme.magenta);
  root.style.setProperty('--color-cyan', theme.cyan);
  root.style.setProperty('--color-white', theme.white);
};

const DEFAULT_THEME = PRESET_THEMES[0];

interface Tab {
  id: string;
  type: 'terminal' | 'settings';
  title: string;
  rootPane?: PaneNode;
}

// Helper to find and replace a pane node by ID
const updatePaneTree = (
  root: PaneNode,
  targetId: string,
  updater: (pane: PaneNode) => PaneNode | null
): PaneNode | null => {
  if (root.type === 'terminal' && root.id === targetId) {
    return updater(root);
  }
  if (root.type === 'split') {
    const newChildren: [PaneNode, PaneNode] = [...root.children];
    for (let i = 0; i < 2; i++) {
      const child = newChildren[i];
      if (child.type === 'terminal' && child.id === targetId) {
        const result = updater(child);
        if (result === null) {
          // Return the other child (collapse split)
          return newChildren[1 - i];
        }
        newChildren[i] = result;
        return { ...root, children: newChildren };
      } else if (child.type === 'split') {
        const updated = updatePaneTree(child, targetId, updater);
        if (updated === null) {
          // Child was removed, return the other
          return newChildren[1 - i];
        }
        if (updated !== child) {
          newChildren[i] = updated;
          return { ...root, children: newChildren };
        }
      }
    }
  }
  return root;
};

// Get first terminal pane ID from tree
const getFirstPaneId = (pane: PaneNode): string => {
  if (pane.type === 'terminal') return pane.id;
  return getFirstPaneId(pane.children[0]);
};

function App() {
  const appWindow = getCurrentWindow();
  const initialPane = createTerminalPane();
  const [tabs, setTabs] = useState<Tab[]>([{ id: 'init-1', type: 'terminal', title: 'Terminal', rootPane: initialPane }]);
  const [activeTabId, setActiveTabId] = useState('init-1');
  const [activePaneId, setActivePaneId] = useState(initialPane.id);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [sshProfiles, setSshProfiles] = useState<SSHProfile[]>([]);
  const profileMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadSSHProfiles().then(setSshProfiles);
    loadThemeId().then(id => {
      const theme = PRESET_THEMES.find(t => t.id === id) || DEFAULT_THEME;
      applyTheme(theme);
    });

    const unlistenProfiles = listen('profiles-changed', () => {
      loadSSHProfiles().then(setSshProfiles);
    });

    const unlistenTheme = listen('theme-changed', (event: any) => {
      const themeId = event.payload;
      const theme = PRESET_THEMES.find(t => t.id === themeId) || DEFAULT_THEME;
      applyTheme(theme);
    });

    return () => {
      unlistenProfiles.then(f => f());
      unlistenTheme.then(f => f());
    };
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target as Node)) {
        setShowProfileMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const addTab = (options?: Partial<Tab> & { profile?: Profile }) => {
    const newId = generatePaneId();
    let newTab: Tab;

    if (options?.type === 'settings') {
      newTab = { id: newId, type: 'settings', title: 'Settings' };
    } else {
      let command = options?.profile?.type === 'local' ? options.profile.command : undefined;
      let args = options?.profile?.type === 'local' ? options.profile.args : undefined;

      if (options?.profile?.type === 'ssh') {
        command = 'ssh';
        args = [];
        if (options.profile.port !== 22) args.push('-p', options.profile.port.toString());
        if (options.profile.identityFile) args.push('-i', options.profile.identityFile);
        args.push(`${options.profile.username}@${options.profile.host}`);
      }

      const termPane = createTerminalPane(command, args);
      newTab = {
        id: newId,
        type: 'terminal',
        title: options?.profile ? options.profile.name : 'Terminal',
        rootPane: termPane
      };
      setActivePaneId(termPane.id);
    }

    setTabs([...tabs, newTab]);
    setActiveTabId(newId);
    setShowProfileMenu(false);
  };

  const closeTab = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const newTabs = tabs.filter(t => t.id !== id);
    setTabs(newTabs);
    if (id === activeTabId && newTabs.length > 0) {
      setActiveTabId(newTabs[newTabs.length - 1].id);
      const lastTab = newTabs[newTabs.length - 1];
      if (lastTab.rootPane) {
        setActivePaneId(getFirstPaneId(lastTab.rootPane));
      }
    }
  };

  const handlePaneClose = (paneId: string) => {
    setTabs(prevTabs => prevTabs.map(tab => {
      if (tab.type !== 'terminal' || !tab.rootPane) return tab;

      // If it's the only pane, close the tab
      if (tab.rootPane.type === 'terminal' && tab.rootPane.id === paneId) {
        return { ...tab, rootPane: undefined }; // Mark for removal
      }

      const newRoot = updatePaneTree(tab.rootPane, paneId, () => null);
      return { ...tab, rootPane: newRoot || undefined };
    }).filter(tab => tab.type === 'settings' || tab.rootPane !== undefined));
  };

  const handleSplit = (paneId: string, direction: 'horizontal' | 'vertical') => {
    setTabs(prevTabs => prevTabs.map(tab => {
      if (tab.type !== 'terminal' || !tab.rootPane) return tab;

      const newRoot = updatePaneTree(tab.rootPane, paneId, (targetPane) => {
        if (targetPane.type !== 'terminal') return targetPane;
        const newPane = createTerminalPane(targetPane.command, targetPane.args);
        setActivePaneId(newPane.id);
        return {
          type: 'split',
          direction,
          children: [targetPane, newPane]
        };
      });

      return { ...tab, rootPane: newRoot || tab.rootPane };
    }));
  };

  const allProfiles: Profile[] = [...DEFAULT_PROFILES, ...sshProfiles];

  return (
    <div className="app-container">
      <div className="title-bar">
        <div className="title-section-tabs">
          {tabs.map((tab) => (
            <div
              key={tab.id}
              className={`tab ${activeTabId === tab.id ? 'active' : ''}`}
              onClick={() => {
                setActiveTabId(tab.id);
                if (tab.rootPane) {
                  setActivePaneId(getFirstPaneId(tab.rootPane));
                }
              }}
            >
              {tab.type === 'settings' ? (
                <SettingsIcon size={14} className={activeTabId === tab.id ? "text-blue-400" : "text-gray-500"} />
              ) : (
                <TerminalSquare size={14} className={activeTabId === tab.id ? "text-blue-400" : "text-gray-500"} />
              )}
              <span className="tab-title">{tab.title}</span>
              <div className="tab-close-btn" onClick={(e) => closeTab(e, tab.id)}>
                <X size={12} />
              </div>
            </div>
          ))}
          <div className="new-tab-group">
            <div className="new-tab-btn left" onClick={() => addTab()} title="New Tab">
              <Plus size={16} />
            </div>
            <div className="new-tab-btn right" onClick={() => setShowProfileMenu(!showProfileMenu)} title="Select Profile">
              <ChevronDown size={24} />
            </div>

            {showProfileMenu && (
              <div className="profile-menu" ref={profileMenuRef}>
                <div className="profile-menu-header">Profiles</div>
                {allProfiles.map((profile) => (
                  <div key={profile.id} className="profile-item" onClick={() => addTab({ profile })}>
                    <span>{profile.name}</span>
                  </div>
                ))}
                <div className="profile-menu-divider" />
                <div className="profile-item add-profile" onClick={() => {
                  addTab({ type: 'settings' });
                  setShowProfileMenu(false);
                }}>
                  <Plus size={14} />
                  <span>Add Profile</span>
                </div>
              </div>
            )}
          </div>
        </div>

        <div data-tauri-drag-region className="title-section-drag" />

        <div className="title-section-controls">
          <button onClick={() => addTab({ type: 'settings' })} className="control-btn settings" title="Settings">
            <Settings size={14} />
          </button>
          <button onClick={() => appWindow.minimize()} className="control-btn"><Minus size={16} /></button>
          <button onClick={() => appWindow.toggleMaximize()} className="control-btn"><Square size={14} /></button>
          <button onClick={() => appWindow.close()} className="control-btn close"><X size={16} /></button>
        </div>
      </div>

      <div className="terminal-wrapper">
        {tabs.length === 0 ? (
          <WelcomePage
            onNewTerminal={() => addTab()}
            onNewSSH={() => setShowProfileMenu(true)}
            onOpenSettings={() => addTab({ type: 'settings' })}
          />
        ) : (
          tabs.map((tab) => (
            <div key={tab.id} style={{ display: activeTabId === tab.id ? 'flex' : 'none', height: '100%', width: '100%' }}>
              {tab.type === 'terminal' && tab.rootPane ? (
                <PaneContainer
                  pane={tab.rootPane}
                  activePaneId={activePaneId}
                  onPaneClick={setActivePaneId}
                  onSplit={handleSplit}
                  onClose={handlePaneClose}
                />
              ) : tab.type === 'settings' ? (
                <SettingsComponent />
              ) : null}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default App;