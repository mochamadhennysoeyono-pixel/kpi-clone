// src/components/layout/SubMenuOverlay.tsx
"use client";

import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, X, LayoutGrid } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { usePathname } from "next/navigation";
import { useSubMenu } from './submenu-context';
import React from "react";
import { ScrollArea } from "../ui/scroll-area";
import { Separator } from "../ui/separator";

interface SubMenuOverlayProps {
  activeGroup: any;
  onClose: () => void;
}

export function SubMenuOverlay({ activeGroup, onClose }: SubMenuOverlayProps) {
  const pathname = usePathname();
  const { iconMap } = useSubMenu();
  const [viewStack, setViewStack] = React.useState<any[]>([]);
  const [direction, setDirection] = React.useState(1); // 1 for forward, -1 for back

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
  
  if (!activeGroup || !currentView) {
    return null;
  }
  
  const isSubMenuView = viewStack.length > 1;
  const itemsToShow = currentView?.subItems || [];

  const variants = {
    enter: (direction: number) => ({
      x: direction > 0 ? "10%" : "-10%",
      opacity: 0,
    }),
    center: {
      x: "0%",
      opacity: 1,
    },
    exit: (direction: number) => ({
      x: direction < 0 ? "10%" : "-10%",
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
          className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: "0%" }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 300, damping: 35 }}
            className="fixed bottom-0 left-0 right-0 h-auto max-h-[90vh] bg-background rounded-t-[2rem] border-t border-border/60 shadow-[0_-20px_60px_rgba(0,0,0,0.2)] flex flex-col overflow-hidden no-print"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Minimalist Header */}
            <div className="p-5 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-4">
                    {isSubMenuView ? (
                        <button 
                            onClick={handleBack}
                            className="size-8 rounded-lg bg-muted flex items-center justify-center hover:bg-muted/80 transition-all active:scale-90"
                        >
                            <ChevronLeft className="size-4" />
                        </button>
                    ) : (
                        <div className="size-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary border border-primary/20">
                            <LayoutGrid size={16} />
                        </div>
                    )}
                    <div className="min-w-0">
                        <h2 className="text-sm font-black tracking-tight text-foreground uppercase">
                            {currentView.label}
                        </h2>
                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest opacity-60">
                            Pusat Navigasi Sistem
                        </p>
                    </div>
                </div>
                <button 
                    onClick={onClose}
                    className="size-8 rounded-lg bg-muted/50 flex items-center justify-center hover:bg-muted transition-all active:scale-90"
                >
                    <X className="size-4" />
                </button>
            </div>

            <Separator className="opacity-40" />
            
            {/* Grid Area: Command Center Style */}
            <div className="flex-1 overflow-hidden bg-muted/5">
                <ScrollArea className="h-full">
                    <div className="p-4 pt-6 pb-20">
                        <AnimatePresence initial={false} custom={direction} mode="wait">
                            <motion.div
                                key={currentView.label}
                                custom={direction}
                                variants={variants}
                                initial="enter"
                                animate="center"
                                exit="exit"
                                transition={{ type: 'spring', stiffness: 400, damping: 40 }}
                                className="grid grid-cols-3 sm:grid-cols-4 gap-3"
                            >
                                {itemsToShow.map((subItem: any) => {
                                    const IconComponent = iconMap[subItem.iconName || subItem.href || 'default'];
                                    const isLink = !!subItem.href;
                                    const hasSubItems = subItem.subItems && subItem.subItems.length > 0;
                                    const isActive = isLink && (pathname === subItem.href || (subItem.href !== '/' && pathname.startsWith(subItem.href)));
                                    
                                    const content = (
                                        <div className={cn(
                                            "flex flex-col items-center justify-center gap-3 p-4 rounded-2xl transition-all duration-300 group/item active:scale-95 border",
                                            isActive 
                                                ? "bg-primary/5 border-primary/20 shadow-sm" 
                                                : "bg-background hover:bg-muted/40 border-transparent hover:border-border/40"
                                        )}>
                                            <div className={cn(
                                                "size-10 flex items-center justify-center transition-all duration-300",
                                                isActive ? "text-primary scale-110" : "text-muted-foreground group-hover/item:text-foreground"
                                            )}>
                                                {IconComponent && <IconComponent className="size-6" />}
                                            </div>
                                            <span className={cn(
                                                "text-[10px] text-center font-bold tracking-tight leading-snug px-1 h-8 flex items-start justify-center transition-colors",
                                                isActive ? "text-primary" : "text-slate-600 group-hover/item:text-slate-900"
                                            )}>
                                                {subItem.label}
                                            </span>
                                        </div>
                                    );

                                    return (
                                        <div key={subItem.href || subItem.label} onClick={() => handleSubItemClick(subItem)} className="cursor-pointer">
                                            {isLink && !hasSubItems ? (
                                                <Link href={subItem.href}>{content}</Link>
                                            ) : (
                                                content
                                            )}
                                        </div>
                                    );
                                })}
                            </motion.div>
                        </AnimatePresence>
                    </div>
                </ScrollArea>
            </div>
            
            {/* Bottom Safe Area */}
            <div className="h-6 shrink-0 bg-muted/10" />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
