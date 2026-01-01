import { TerminalSquare, Plus } from "lucide-react";

export const WelcomeScreen = ({ onNewTerminal }: { onNewTerminal: () => void }) => {
  return (
    <div className="h-full w-full flex flex-col items-center justify-center text-[#cdd6f4] select-none">
      <div className="mb-6 p-4 bg-[#313244] rounded-full bg-opacity-30">
        <TerminalSquare size={64} className="text-[#89b4fa] opacity-80" />
      </div>
      
      <h1 className="text-2xl font-bold mb-2">Hyper Term</h1>
      <p className="text-[#6c7086] mb-8 text-sm">Ideally fast, purely Rust.</p>

      <div className="flex flex-col gap-3 w-64">
        <button 
          onClick={onNewTerminal}
          className="flex items-center gap-3 px-4 py-3 bg-[#313244] hover:bg-[#45475a] rounded-lg transition-all group"
        >
          <Plus size={18} className="text-[#a6e3a1]" />
          <div className="flex flex-col items-start">
             <span className="text-sm font-medium">New Terminal</span>
             <span className="text-xs text-[#6c7086]">Start a default session</span>
          </div>
        </button>
      </div>

      <div className="mt-12 text-xs text-[#6c7086] flex gap-4">
        <span><kbd className="bg-[#313244] px-1 rounded">Ctrl</kbd> + <kbd className="bg-[#313244] px-1 rounded">Shift</kbd> + <kbd className="bg-[#313244] px-1 rounded">N</kbd> New Window</span>
      </div>
    </div>
  );
};