import { useEffect, useRef, useState } from 'react';
import { Terminal as XTerm } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { Copy, Clipboard, SplitSquareHorizontal, SplitSquareVertical } from 'lucide-react';
import { writeText, readText } from '@tauri-apps/plugin-clipboard-manager';
import '@xterm/xterm/css/xterm.css';

import { ContextMenu } from './ContextMenu';
import { PRESET_THEMES } from '../config/themes';
import { loadThemeId } from '../lib/store';

// Default fallback if loading fails
const DEFAULT_THEME = PRESET_THEMES[0];

interface TerminalPaneProps {
  id: string;
  visible: boolean;
  command?: string;
  args?: string[];
  onExit?: () => void;
  onSplit?: (direction: 'horizontal' | 'vertical') => void;
}

export const TerminalPane = ({ id, visible, command, args, onExit, onSplit }: TerminalPaneProps) => {
  const terminalRef = useRef<HTMLDivElement>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const xtermRef = useRef<XTerm | null>(null);

  // Context Menu State
  const [menuVisible, setMenuVisible] = useState(false);
  const [menuPos, setMenuPos] = useState({ x: 0, y: 0 });
  const [cachedSelection, setCachedSelection] = useState('');

  // Helper to find theme by ID
  const getTheme = (themeId: string | null) => PRESET_THEMES.find(t => t.id === themeId) || DEFAULT_THEME;

  useEffect(() => {
    if (!terminalRef.current) return;

    let isMounted = true;
    let termInstance: XTerm | null = null;
    let cleanupFns: (() => void)[] = [];

    const init = async () => {
      const initialThemeId = await loadThemeId();
      if (!isMounted || !terminalRef.current) return;

      const initialTheme = getTheme(initialThemeId);
      const term = new XTerm({
        theme: initialTheme,
        fontFamily: '"TermFont", monospace',
        fontSize: 14,
        lineHeight: 1.2,
        cursorBlink: true,
        allowProposedApi: true,
        allowTransparency: false,
      });

      xtermRef.current = term;
      termInstance = term;

      // Track selection changes
      term.onSelectionChange(() => {
        const sel = term.getSelection();
        if (sel) {
          setCachedSelection(sel);
        }
      });

      // Keyboard Copy/Paste Support (Ctrl+Shift+C / Ctrl+Shift+V)
      term.attachCustomKeyEventHandler((event) => {
        // Copy: Ctrl+Shift+C
        if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key.toLowerCase() === 'c') {
          if (event.type === 'keydown') {
            const selection = term.getSelection();
            if (selection) {
              writeText(selection).catch(err => console.error('Copy failed', err));
              return false;
            }
          }
          return false;
        }

        // Paste: Ctrl+Shift+V
        if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key.toLowerCase() === 'v') {
          if (event.type === 'keydown') {
            readText()
              .then(text => {
                if (text) {
                  invoke('write_to_pty', { id, data: text });
                }
              })
              .catch(err => console.error('Paste failed', err));
            return false;
          }
          return false;
        }

        // Split Right: Ctrl+Shift+E
        if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key.toLowerCase() === 'e') {
          if (event.type === 'keydown' && onSplit) {
            onSplit('horizontal');
            return false;
          }
          return false;
        }

        // Split Down: Ctrl+Shift+O
        if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key.toLowerCase() === 'o') {
          if (event.type === 'keydown' && onSplit) {
            onSplit('vertical');
            return false;
          }
          return false;
        }

        return true;
      });

      const unlistenTheme = await listen<string>('theme-changed', (event) => {
        term.options.theme = getTheme(event.payload);
      });
      cleanupFns.push(() => unlistenTheme());

      const fitAddon = new FitAddon();
      term.loadAddon(fitAddon);
      fitAddonRef.current = fitAddon;

      term.open(terminalRef.current);
      term.clear();

      // Initial fit
      setTimeout(() => fitAddon.fit(), 50);

      const handleResize = () => fitAddon.fit();
      window.addEventListener('resize', handleResize);
      cleanupFns.push(() => window.removeEventListener('resize', handleResize));

      invoke('create_pty_session', { id, command, args });

      const unlistenData = await listen<string>(`pty-data-${id}`, (event) => {
        term.write(event.payload);
      });
      cleanupFns.push(() => unlistenData());

      const unlistenExit = await listen(`pty-exit-${id}`, () => {
        if (onExit) onExit();
      });
      cleanupFns.push(() => unlistenExit());

      const onDataDisposable = term.onData((data) => {
        invoke('write_to_pty', { id, data });
      });
      cleanupFns.push(() => onDataDisposable.dispose());
    };

    init();

    return () => {
      isMounted = false;
      cleanupFns.forEach(fn => fn());
      if (termInstance) termInstance.dispose();
    };
  }, [id]);

  // Refit whenever the tab becomes visible
  useEffect(() => {
    if (visible && fitAddonRef.current) {
      setTimeout(() => {
        fitAddonRef.current?.fit();
      }, 10);
    }
  }, [visible]);

  // Context Menu Handler
  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    // Capture current selection before menu opens
    const currentSelection = xtermRef.current?.getSelection();
    if (currentSelection) {
      setCachedSelection(currentSelection);
    }
    setMenuPos({ x: e.clientX, y: e.clientY });
    setMenuVisible(true);
  };

  const menuActions = [
    {
      label: 'Copy',
      icon: Copy,
      action: async () => {
        if (cachedSelection) {
          await writeText(cachedSelection);
        }
      }
    },
    {
      label: 'Paste',
      icon: Clipboard,
      action: async () => {
        const text = await readText();
        if (text) {
          invoke('write_to_pty', { id, data: text });
        }
      }
    },
    {
      label: 'Split Right',
      icon: SplitSquareHorizontal,
      action: () => {
        if (onSplit) onSplit('horizontal');
      }
    },
    {
      label: 'Split Down',
      icon: SplitSquareVertical,
      action: () => {
        if (onSplit) onSplit('vertical');
      }
    }
  ];

  return (
    <>
      <div
        ref={terminalRef}
        className="terminal-container"
        onContextMenu={handleContextMenu}
      />
      <ContextMenu
        x={menuPos.x}
        y={menuPos.y}
        visible={menuVisible}
        onClose={() => setMenuVisible(false)}
        actions={menuActions}
      />
    </>
  );
};