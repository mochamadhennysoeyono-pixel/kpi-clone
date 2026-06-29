// src/contexts/page-context.tsx
"use client";

import React, { createContext, useContext, useState, ReactNode, useCallback } from 'react';

interface PageContextType {
  pageTitle: string;
  contextualData: Record<string, any> | null;
  setPageContext: (title: string, data: Record<string, any> | null) => void;
  hideBottomNav: boolean;
  setHideBottomNav: (hide: boolean) => void;
}

const PageContext = createContext<PageContextType | undefined>(undefined);

export function PageContextProvider({ children }: { children: ReactNode }) {
  const [pageTitle, setPageTitle] = useState('');
  const [contextualData, setContextualData] = useState<Record<string, any> | null>(null);
  const [hideBottomNav, setHideBottomNav] = useState(false);
  
  const handleSetPageContext = useCallback((title: string, data: Record<string, any> | null) => {
    setPageTitle(title);
    setContextualData(data);
  }, []);

  const value = { 
    pageTitle, 
    contextualData, 
    setPageContext: handleSetPageContext,
    hideBottomNav,
    setHideBottomNav
  };

  return (
    <PageContext.Provider value={value}>
      {children}
    </PageContext.Provider>
  );
}

export function usePageContext() {
  const context = useContext(PageContext);
  if (context === undefined) {
    throw new Error('usePageContext must be used within a PageContextProvider');
  }
  return context;
}
