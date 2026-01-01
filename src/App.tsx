import { useState } from 'react';
import { TerminalPane } from "./components/Terminal";
import { Minus, Square, X, Plus, TerminalSquare } from "lucide-react";
import { getCurrentWindow } from '@tauri-apps/api/window';
import "./App.css";

const generateId = () => `term-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

function App() {
  const appWindow = getCurrentWindow();
  const [tabs, setTabs] = useState([{ id: 'init-1', title: 'Terminal' }]);
  const [activeId, setActiveId] = useState('init-1');

  const addTab = () => {
    const newId = generateId();
    setTabs([...tabs, { id: newId, title: 'Terminal' }]);
    setActiveId(newId);
  };

  const closeTab = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (tabs.length === 1) return;
    const newTabs = tabs.filter(t => t.id !== id);
    setTabs(newTabs);
    if (id === activeId) setActiveId(newTabs[newTabs.length - 1].id);
  };

  return (
    <div className="app-container">
      
      {/* HEADER: Distinct Sections */}
      <div className="title-bar">
        
        {/* 1. LEFT: TABS (Clickable) */}
        <div className="title-section-tabs">
            {tabs.map((tab) => (
              <div 
                key={tab.id}
                className={`tab ${activeId === tab.id ? 'active' : ''}`}
                onClick={() => setActiveId(tab.id)}
              >
                <TerminalSquare size={14} className={activeId === tab.id ? "text-blue-400" : "text-gray-500"} />
                <span className="tab-title">{tab.title}</span>
                <div className="tab-close-btn" onClick={(e) => closeTab(e, tab.id)}>
                  <X size={12} />
                </div>
              </div>
            ))}
            <div className="new-tab-btn" onClick={addTab} title="New Tab">
              <Plus size={16} />
            </div>
        </div>

        {/* 2. MIDDLE: DRAG HANDLE (Draggable) */}
        {/* This empty space is ONLY for dragging */}
        <div data-tauri-drag-region className="title-section-drag" />
        
        {/* 3. RIGHT: WINDOW CONTROLS (Clickable) */}
        <div className="title-section-controls">
           <button onClick={() => appWindow.minimize()} className="control-btn"><Minus size={16}/></button>
           <button onClick={() => appWindow.toggleMaximize  ()} className="control-btn"><Square size={14}/></button>
           <button onClick={() => appWindow.close()} className="control-btn close"><X size={16}/></button>
        </div>

      </div>

      {/* BODY */}
      <div className="terminal-wrapper">
         {tabs.map((tab) => (
           <div key={tab.id} style={{ display: activeId === tab.id ? 'block' : 'none', height: '100%', width: '100%' }}>
             <TerminalPane id={tab.id} visible={activeId === tab.id} />
           </div>
         ))}
      </div>

    </div>
  );
}

export default App;