"use client";

import React from 'react';
import MainLayoutContent from './main-layout-content';

export default function MainLayout({ children }: { children: React.ReactNode }) {
    return (
        <MainLayoutContent>{children}</MainLayoutContent>
    );
}
