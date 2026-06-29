// src/components/layout/submenu-context.tsx
"use client";

import React, { createContext, useContext } from 'react';

// Define the shape of the context value
interface SubMenuContextValue {
  activeGroup: any;
  setActiveGroup: (group: any) => void;
  iconMap: { [key: string]: React.ElementType };
  setIconMap: (map: { [key: string]: React.ElementType }) => void;
}

// Create the context with an undefined initial value
export const SubMenuContext = createContext<SubMenuContextValue | undefined>(undefined);

// Create the hook to use the context
export function useSubMenu() {
  const context = useContext(SubMenuContext);
  if (context === undefined) {
    throw new Error('useSubMenu must be used within a SubMenuProvider');
  }
  return context;
}
