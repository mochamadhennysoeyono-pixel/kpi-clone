// src/components/layout/SubMenuOverlay.tsx
"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Button } from "../ui/button";
import { ChevronLeft, X } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { usePathname } from "next/navigation";
import { useSubMenu } from './submenu-context';
import React from "react";
import { ScrollArea } from "../ui/scroll-area";

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
      onClose(); // Close the overlay on final navigation
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
      x: direction > 0 ? "20%" : "-20%",
      opacity: 0,
    }),
    center: {
      x: "0%",
      opacity: 1,
    },
    exit: (direction: number) => ({
      x: direction < 0 ? "20%" : "-20%",
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
          className="fixed inset-0 z-[200] bg-black/40 backdrop-blur-md"
          onClick={onClose}
        >
          <motion.div
            initial={{ y: "100%", opacity: 0 }}
            animate={{ y: "0%", opacity: 1 }}
            exit={{ y: "100%", opacity: 0 }}
            transition={{ type: "spring", stiffness: 350, damping: 35 }}
            className="fixed bottom-4 left-2 right-2 h-auto max-h-[85vh] bg-background/95 backdrop-blur-2xl rounded-[2.5rem] border border-border/40 shadow-[0_-20px_80px_rgba(0,0,0,0.15)] flex flex-col overflow-hidden no-print"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header Section */}
            <div className="p-6 pb-4 shrink-0 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    {isSubMenuView ? (
                        <button 
                            onClick={handleBack}
                            className="size-10 rounded-2xl bg-muted/50 flex items-center justify-center hover:bg-muted transition-all active:scale-90"
                        >
                            <ChevronLeft className="size-5" />
                        </button>
                    ) : (
                        <div className="size-10 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
                            <ChevronLeft className="size-5 stroke-[3px]" />
                        </div>
                    )}
                    <div className="min-w-0">
                        <h2 className="text-lg font-black tracking-tighter text-slate-900 uppercase">
                            {currentView.label}
                        </h2>
                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest opacity-60">
                            {isSubMenuView ? "Pilih opsi di bawah ini" : "Pusat Layanan Aplikasi"}
                        </p>
                    </div>
                </div>
                <button 
                    onClick={onClose}
                    className="size-10 rounded-2xl bg-muted/50 flex items-center justify-center hover:bg-muted transition-all active:scale-90"
                >
                    <X className="size-5" />
                </button>
            </div>

            <Separator className="opacity-40" />
            
            {/* Grid Area */}
            <div className="flex-1 overflow-hidden">
                <ScrollArea className="h-full">
                    <div className="p-6 pt-4">
                        <AnimatePresence initial={false} custom={direction} mode="wait">
                            <motion.div
                                key={currentView.label}
                                custom={direction}
                                variants={variants}
                                initial="enter"
                                animate="center"
                                exit="exit"
                                transition={{ type: 'spring', stiffness: 400, damping: 35 }}
                                className="grid grid-cols-4 gap-x-2 gap-y-6"
                            >
                                {itemsToShow.map((subItem: any) => {
                                    const IconComponent = iconMap[subItem.iconName || subItem.href || 'default'];
                                    const isLink = !!subItem.href;
                                    const hasSubItems = subItem.subItems && subItem.subItems.length > 0;
                                    const isActive = isLink && (pathname === subItem.href || (subItem.href !== '/' && pathname.startsWith(subItem.href)));
                                    
                                    const content = (
                                        <div className="flex flex-col items-center justify-start gap-2.5 group/item transition-all active:scale-95">
                                            <div className={cn(
                                                "size-14 sm:size-16 rounded-[1.5rem] flex items-center justify-center transition-all duration-300",
                                                isActive 
                                                    ? "bg-primary text-primary-foreground shadow-xl shadow-primary/20 scale-105" 
                                                    : "bg-muted/40 text-muted-foreground group-hover/item:bg-muted group-hover/item:text-primary ring-1 ring-border/20 group-hover/item:ring-primary/20"
                                            )}>
                                                {IconComponent && <IconComponent className={cn("size-6 sm:size-7 transition-colors", isActive ? "text-white" : "group-hover/item:text-primary")} />}
                                            </div>
                                            <span className={cn(
                                                "text-[10px] text-center font-black uppercase tracking-tight leading-tight px-1 h-8 flex items-start justify-center transition-colors",
                                                isActive ? "text-primary" : "text-slate-500 group-hover/item:text-slate-900"
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
            
            {/* Footer space to avoid overlap with bottom nav */}
            <div className="h-10 shrink-0 bg-muted/10" />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
