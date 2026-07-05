// src/components/layout/SubMenuOverlay.tsx
"use client";

import { motion, AnimatePresence } from "framer-motion";
import { X, LayoutGrid, ChevronLeft, Folder } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { usePathname } from "next/navigation";
import React from "react";
import { ScrollArea } from "../ui/scroll-area";
import { useSubMenu } from './submenu-context';
import { IconTokens } from "@/lib/icon-tokens";

interface SubMenuOverlayProps {
  activeGroup: any;
  onClose: () => void;
}

export function SubMenuOverlay({ activeGroup, onClose }: SubMenuOverlayProps) {
  const pathname = usePathname();
  const { iconMap } = useSubMenu();
  const [viewStack, setViewStack] = React.useState<any[]>([]);
  const [direction, setDirection] = React.useState(1); // 1 forward, -1 back

  React.useEffect(() => {
    if (activeGroup) {
      setViewStack([activeGroup]);
    } else {
      setViewStack([]);
    }
  }, [activeGroup]);

  const currentView = viewStack[viewStack.length - 1];

  const handleSubItemClick = (item: any) => {
    if (item.subItems && item.subItems.length > 0) {
      setDirection(1);
      setViewStack(prev => [...prev, item]);
    } else if (item.href) {
      onClose();
    }
  };

  const handleBack = () => {
    setDirection(-1);
    setViewStack(prev => prev.slice(0, -1));
  };
  
  if (!activeGroup || !currentView) return null;
  
  const isSubMenuView = viewStack.length > 1;
  const itemsToShow = currentView?.subItems || [];

  const variants = {
    enter: (direction: number) => ({
      x: direction > 0 ? 20 : -20,
      opacity: 0,
    }),
    center: {
      x: 0,
      opacity: 1,
    },
    exit: (direction: number) => ({
      x: direction < 0 ? 20 : -20,
      opacity: 0,
    }),
  };

  return (
    <AnimatePresence>
      {activeGroup && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[200] bg-slate-900/10 backdrop-blur-md"
          onClick={onClose}
        >
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: "0%" }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 400, damping: 40 }}
            className="fixed bottom-0 left-0 right-0 h-[75vh] bg-white rounded-t-2xl border-t border-border shadow-[0_-20px_50px_rgba(0,0,0,0.1)] flex flex-col overflow-hidden no-print"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Minimalist Premium Header */}
            <div className="px-6 py-5 flex items-center justify-between shrink-0 border-b border-slate-50">
                <div className="flex items-center gap-4">
                    {isSubMenuView ? (
                        <button 
                            onClick={handleBack}
                            className="size-9 rounded-xl bg-slate-50 flex items-center justify-center hover:bg-slate-100 transition-all active:scale-90 border border-slate-100 shadow-sm"
                        >
                            <ChevronLeft className="size-4 text-slate-900" strokeWidth={3} />
                        </button>
                    ) : (
                        <div className="size-9 rounded-xl bg-slate-50 flex items-center justify-center text-slate-900 border border-slate-100 shadow-sm">
                            <LayoutGrid size={20} strokeWidth={2} />
                        </div>
                    )}
                    <div className="min-w-0">
                        <h2 className="text-sm font-black tracking-tight text-slate-900 leading-none">
                            {currentView.label}
                        </h2>
                        <p className="text-[9px] font-bold text-muted-foreground tracking-[0.1em] opacity-60 mt-1.5 uppercase">
                            Navigator
                        </p>
                    </div>
                </div>
                <button 
                    onClick={onClose}
                    className="size-9 rounded-xl bg-slate-50 flex items-center justify-center hover:bg-slate-100 transition-all active:scale-90 border border-slate-100"
                >
                    <X className="size-4 text-slate-400" strokeWidth={3} />
                </button>
            </div>

            {/* Obsidian Grid Area */}
            <div className="flex-1 min-h-0 bg-[#fafafa]">
                <ScrollArea className="h-full">
                    <div className="p-5 pb-16">
                        <AnimatePresence initial={false} custom={direction} mode="wait">
                            <motion.div
                                key={currentView.label}
                                custom={direction}
                                variants={variants}
                                initial="enter"
                                animate="center"
                                exit="exit"
                                transition={{ duration: 0.2 }}
                                className="grid grid-cols-3 gap-3"
                            >
                                {itemsToShow.map((subItem: any) => {
                                    const IconComponent = (iconMap[subItem.iconName || subItem.href || 'default']) || Folder;
                                    const isLink = !!subItem.href;
                                    const hasSubItems = subItem.subItems && subItem.subItems.length > 0;
                                    const isActive = isLink && (pathname === subItem.href || (subItem.href !== '/' && pathname.startsWith(subItem.href)));
                                    
                                    const content = (
                                        <div className={cn(
                                            "flex flex-col items-center justify-center gap-3 p-4 rounded-xl transition-all duration-300 border group/item active:scale-95",
                                            isActive 
                                                ? "bg-white border-primary shadow-lg ring-1 ring-primary/10" 
                                                : "bg-white border-slate-100 hover:border-slate-300 hover:shadow-stripe"
                                        )}>
                                            <div className="size-10 flex items-center justify-center transition-colors">
                                                {IconComponent && (
                                                    <IconComponent 
                                                        size={IconTokens.size.desktop} 
                                                        strokeWidth={IconTokens.strokeWidth}
                                                        color={isActive ? IconTokens.color.active : IconTokens.color.default}
                                                    />
                                                )}
                                            </div>
                                            <span className={cn(
                                                "text-[11px] text-center font-bold tracking-tight leading-tight px-0.5 transition-colors",
                                                isActive ? "text-primary" : "text-slate-500 group-hover/item:text-slate-900"
                                            )}>
                                                {subItem.label}
                                            </span>
                                        </div>
                                    );

                                    return (
                                        <div key={subItem.href || subItem.label} onClick={() => handleSubItemClick(subItem)}>
                                            {isLink && !hasSubItems ? (
                                                <Link href={subItem.href}>{content}</Link>
                                            ) : (
                                                <div className="cursor-pointer">{content}</div>
                                            )}
                                        </div>
                                    );
                                })}
                            </motion.div>
                        </AnimatePresence>
                    </div>
                </ScrollArea>
            </div>
            
            {/* Elegant Bottom Trim */}
            <div className="h-6 shrink-0 bg-white border-t border-slate-50" />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
