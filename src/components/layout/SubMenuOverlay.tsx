
// src/components/layout/SubMenuOverlay.tsx
"use client";

import { motion, AnimatePresence } from "framer-motion";
import { X, LayoutGrid, CaretLeft } from "@phosphor-icons/react";
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
          className="fixed inset-0 z-[200] bg-slate-900/40 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: "0%" }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 400, damping: 40 }}
            className="fixed bottom-0 left-0 right-0 h-[70vh] bg-background rounded-t-2xl border-t border-border shadow-[0_-10px_40px_rgba(0,0,0,0.1)] flex flex-col overflow-hidden no-print"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Padat Header */}
            <div className="px-5 py-4 flex items-center justify-between shrink-0 bg-background">
                <div className="flex items-center gap-3">
                    {isSubMenuView ? (
                        <button 
                            onClick={handleBack}
                            className="size-8 rounded-lg bg-muted flex items-center justify-center hover:bg-accent transition-all active:scale-90"
                        >
                            <CaretLeft className="size-4" weight="bold" />
                        </button>
                    ) : (
                        <div className="size-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary border border-primary/20 shadow-sm">
                            <LayoutGrid size={18} weight="fill" style={{ fill: "url(#brand-gradient)" }} />
                        </div>
                    )}
                    <div className="min-w-0">
                        <h2 className="text-xs font-black tracking-tight text-foreground uppercase leading-none">
                            {currentView.label}
                        </h2>
                        <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest opacity-60 mt-1">
                            Navigasi Cepat
                        </p>
                    </div>
                </div>
                <button 
                    onClick={onClose}
                    className="size-8 rounded-lg bg-muted/50 flex items-center justify-center hover:bg-muted transition-all active:scale-90"
                >
                    <X className="size-4" weight="bold" />
                </button>
            </div>

            <Separator />
            
            {/* Scrollable Grid: High Density Style with Phosphor Icons */}
            <div className="flex-1 min-h-0 bg-slate-50/30">
                <ScrollArea className="h-full">
                    <div className="p-4 pb-12">
                        <AnimatePresence initial={false} custom={direction} mode="wait">
                            <motion.div
                                key={currentView.label}
                                custom={direction}
                                variants={variants}
                                initial="enter"
                                animate="center"
                                exit="exit"
                                transition={{ duration: 0.2 }}
                                className="grid grid-cols-3 gap-2.5"
                            >
                                {itemsToShow.map((subItem: any) => {
                                    const IconComponent = iconMap[subItem.iconName || subItem.href || 'default'];
                                    const isLink = !!subItem.href;
                                    const hasSubItems = subItem.subItems && subItem.subItems.length > 0;
                                    const isActive = isLink && (pathname === subItem.href || (subItem.href !== '/' && pathname.startsWith(subItem.href)));
                                    
                                    const content = (
                                        <div className={cn(
                                            "flex flex-col items-center justify-center gap-2.5 p-3.5 rounded-xl transition-all duration-200 border group/item active:scale-95",
                                            isActive 
                                                ? "bg-primary/5 border-primary/30 shadow-sm" 
                                                : "bg-background border-slate-100 hover:border-primary/20 hover:bg-white shadow-[0_1px_2px_rgba(0,0,0,0.02)]"
                                        )}>
                                            <div className={cn(
                                                "size-9 flex items-center justify-center transition-all duration-300",
                                                isActive ? "scale-110" : "group-hover/item:scale-110"
                                            )}>
                                                {IconComponent && (
                                                    <IconComponent 
                                                        size={28} 
                                                        weight="fill" 
                                                        style={{ fill: "url(#brand-gradient)" }} 
                                                        className={cn(isActive ? "opacity-100" : "opacity-40 grayscale group-hover/item:grayscale-0 group-hover/item:opacity-100")}
                                                    />
                                                )}
                                            </div>
                                            <span className={cn(
                                                "text-[10px] text-center font-bold tracking-tight leading-tight px-0.5 min-h-[24px] flex items-start justify-center transition-colors",
                                                isActive ? "text-primary" : "text-slate-600 group-hover/item:text-slate-900"
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
            
            {/* Bottom Trim */}
            <div className="h-4 shrink-0 bg-background border-t" />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
