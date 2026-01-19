import { Group, Panel, Separator } from 'react-resizable-panels';
import { TerminalPane } from './Terminal';
import { PaneNode } from '../types/pane';

interface PaneContainerProps {
    pane: PaneNode;
    activePaneId: string;
    onPaneClick: (id: string) => void;
    onSplit: (paneId: string, direction: 'horizontal' | 'vertical') => void;
    onClose: (paneId: string) => void;
}

export const PaneContainer = ({ pane, activePaneId, onPaneClick, onSplit, onClose }: PaneContainerProps) => {
    if (pane.type === 'terminal') {
        return (
            <div
                className={`pane-wrapper ${activePaneId === pane.id ? 'active' : ''}`}
                onClick={() => onPaneClick(pane.id)}
            >
                <TerminalPane
                    id={pane.id}
                    visible={true}
                    command={pane.command}
                    args={pane.args}
                    onExit={() => onClose(pane.id)}
                    onSplit={(direction) => onSplit(pane.id, direction)}
                />
            </div>
        );
    }

    // Split pane
    const orientation = pane.direction === 'horizontal' ? 'horizontal' : 'vertical';

    return (
        <Group orientation={orientation} className="pane-group">
            <Panel minSize="10%" defaultSize="50%">
                <PaneContainer
                    pane={pane.children[0]}
                    activePaneId={activePaneId}
                    onPaneClick={onPaneClick}
                    onSplit={onSplit}
                    onClose={onClose}
                />
            </Panel>
            <Separator className="resize-handle" />
            <Panel minSize="10%" defaultSize="50%">
                <PaneContainer
                    pane={pane.children[1]}
                    activePaneId={activePaneId}
                    onPaneClick={onPaneClick}
                    onSplit={onSplit}
                    onClose={onClose}
                />
            </Panel>
        </Group>
    );
};
