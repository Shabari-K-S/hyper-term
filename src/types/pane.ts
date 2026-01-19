// Pane tree data structure for split terminals

export interface TerminalPaneNode {
    type: 'terminal';
    id: string;
    command?: string;
    args?: string[];
}

export interface SplitPaneNode {
    type: 'split';
    direction: 'horizontal' | 'vertical';
    children: [PaneNode, PaneNode];
}

export type PaneNode = TerminalPaneNode | SplitPaneNode;

// Helper to generate unique pane IDs
export const generatePaneId = () => `pane-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

// Helper to create a new terminal pane node
export const createTerminalPane = (command?: string, args?: string[]): TerminalPaneNode => ({
    type: 'terminal',
    id: generatePaneId(),
    command,
    args,
});
