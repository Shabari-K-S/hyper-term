import { useState } from 'react';
import { TerminalPane } from "./components/Terminal";
import { Minus, Square, X, Plus, TerminalSquare } from "lucide-react";
import { getCurrentWindow } from '@tauri-apps/api/window';
import "./App.css";

// Helper to generate unique IDs
const generateId = () => `term-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

function App() {
  const appWindow = getCurrentWindow();

  // State: List of tabs and the ID of the currently active one
  const [tabs, setTabs] = useState([{ id: 'init-1', title: 'Terminal' }]);
  const [activeId, setActiveId] = useState('init-1');

  // Add a new tab
  const addTab = () => {
    const newId = generateId();
    setTabs([...tabs, { id: newId, title: 'Terminal' }]);
    setActiveId(newId); // Auto-switch to new tab
  };

  // Close a tab
  const closeTab = (e: React.MouseEvent, id: string) => {
    e.stopPropagation(); // Prevent clicking the tab itself
    
    // If it's the only tab, don't close (or you could close the app)
    if (tabs.length === 1) return;

    const newTabs = tabs.filter(t => t.id !== id);
    setTabs(newTabs);

    // If we closed the active tab, switch to the last one
    if (id === activeId) {
      setActiveId(newTabs[newTabs.length - 1].id);
    }
  };

  return (
    <div className="app-container">
      
      {/* HEADER */}
      <div className="title-bar" data-tauri-drag-region>
        
        {/* TAB LIST (Draggable region logic handled carefully) */}
        <div className="tab-scroll-container" data-tauri-drag-region>
          
          {/* Loop through tabs */}
          {tabs.map((tab) => (
            <div 
              key={tab.id}
              className={`tab ${activeId === tab.id ? 'active' : ''}`}
              onClick={() => setActiveId(tab.id)}
            >
              <TerminalSquare size={12} className={activeId === tab.id ? "text-blue-400" : ""} />
              <span className="tab-title">{tab.title}</span>
              
              {/* Close Button (X) */}
              <div 
                className="tab-close-btn" 
                onClick={(e) => closeTab(e, tab.id)}
              >
                <X size={12} />
              </div>
            </div>
          ))}

          {/* New Tab Button */}
          <div className="new-tab-btn" onClick={addTab}>
            <Plus size={14} />
          </div>

        </div>
        
        {/* Window Controls */}
        <div className="window-controls">
           <button onClick={() => appWindow.minimize()} className="control-btn"><Minus size={14}/></button>
           <button onClick={() => appWindow.toggleMaximize()} className="control-btn"><Square size={12}/></button>
           <button onClick={() => appWindow.close()} className="control-btn close"><X size={14}/></button>
        </div>
      </div>

      {/* BODY: Render ALL terminals, but hide inactive ones */}
      <div className="terminal-wrapper">
         {tabs.map((tab) => (
           <div 
             key={tab.id} 
             style={{ 
               display: activeId === tab.id ? 'block' : 'none', 
               height: '100%', 
               width: '100%' 
             }}
           >
             {/* Pass 'visible' prop so it knows when to fit() */}
             <TerminalPane id={tab.id} visible={activeId === tab.id} />
           </div>
         ))}
      </div>

    </div>
  );
}

export default App;