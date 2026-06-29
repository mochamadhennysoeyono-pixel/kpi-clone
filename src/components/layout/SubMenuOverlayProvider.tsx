// src/components/layout/SubMenuOverlayProvider.tsx
"use client";

import React, { useState, ReactNode } from 'react';
import { SubMenuOverlay } from './SubMenuOverlay';
import { iconMap } from '@/lib/nav-items';
import { SubMenuContext } from './submenu-context';

export function SubMenuProvider({ children }: { children: ReactNode }) {
    const [activeGroup, setActiveGroup] = useState<any | null>(null);
    const [map, setMap] = useState<{[key: string]: React.ElementType}>(iconMap)

    return (
        <SubMenuContext.Provider value={{ activeGroup, setActiveGroup, iconMap: map, setIconMap: setMap }}>
            {children}
            <SubMenuOverlay 
                activeGroup={activeGroup} 
                onClose={() => setActiveGroup(null)}
            />
        </SubMenuContext.Provider>
    );
}
