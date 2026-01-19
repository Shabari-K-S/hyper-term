import { useEffect, useRef } from 'react';
import { LucideIcon } from 'lucide-react';

export interface ContextMenuAction {
    label: string;
    icon?: LucideIcon;
    action: () => void;
    danger?: boolean;
}

interface ContextMenuProps {
    x: number;
    y: number;
    visible: boolean;
    onClose: () => void;
    actions: ContextMenuAction[];
}

export const ContextMenu = ({ x, y, visible, onClose, actions }: ContextMenuProps) => {
    const menuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                onClose();
            }
        };

        if (visible) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [visible, onClose]);

    if (!visible) return null;

    return (
        <div
            ref={menuRef}
            className="context-menu"
            style={{
                top: y,
                left: x,
            }}
        >
            {actions.map((item, index) => (
                <div
                    key={index}
                    className={`context-menu-item ${item.danger ? 'danger' : ''}`}
                    onClick={() => {
                        item.action();
                        onClose();
                    }}
                >
                    {item.icon && <item.icon size={14} />}
                    <span>{item.label}</span>
                </div>
            ))}
        </div>
    );
};
