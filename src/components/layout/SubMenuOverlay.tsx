// src/components/layout/SubMenuOverlay.tsx
"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Button } from "../ui/button";
import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { usePathname } from "next/navigation";
import { useSubMenu } from './submenu-context';
import React from "react";

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
  
  const isSubMenuView = currentView.label !== 'Semua Menu';
  const itemsToShow = currentView?.subItems || [];

  const variants = {
    enter: (direction: number) => ({
      x: direction > 0 ? "100%" : "-50%",
      opacity: 0,
    }),
    center: {
      x: "0%",
      opacity: 1,
    },
    exit: (direction: number) => ({
      x: direction < 0 ? "100%" : "-50%",
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
          className="fixed inset-0 z-[99] bg-black/60 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            key={viewStack.length}
            initial={{ y: "100%" }}
            animate={{ y: "0%" }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 400, damping: 40 }}
            className="fixed bottom-20 left-2 right-2 h-auto max-h-[75vh] bg-background rounded-2xl p-4 flex flex-col shadow-2xl z-[101]"
            onClick={(e) => e.stopPropagation()}
          >
             <div className="flex items-center gap-2 pb-4 border-b mb-4">
                {isSubMenuView && (
                    <Button variant="ghost" size="icon" className="mr-2" onClick={handleBack}>
                        <ChevronLeft className="h-5 w-5" />
                    </Button>
                )}
              <div>
                <h2 className="text-xl font-headline font-semibold">{currentView.label}</h2>
                <p className="text-sm text-muted-foreground">Pilih salah satu menu di bawah ini</p>
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto">
              <AnimatePresence initial={false} custom={direction}>
                 <motion.div
                    key={viewStack.length}
                    custom={direction}
                    variants={variants}
                    initial="enter"
                    animate="center"
                    exit="exit"
                    transition={{ type: 'tween', ease: 'easeInOut', duration: 0.3 }}
                    className="grid grid-cols-4 gap-x-2 gap-y-3"
                 >
                 {itemsToShow.map((subItem: any) => {
                  const IconComponent = iconMap[subItem.iconName || subItem.href || 'default'];
                  const isLink = subItem.href;
                  const hasSubItems = subItem.subItems && subItem.subItems.length > 0;
                  const isActive = isLink && (pathname === subItem.href || (subItem.href !== '/' && pathname.startsWith(subItem.href)));
                  
                  const content = (
                       <div className={cn(
                        "flex items-center justify-center w-14 h-14 rounded-xl bg-background shadow-md transition-all duration-300 group-hover:shadow-lg group-hover:scale-105",
                         isActive ? "bg-primary text-primary-foreground" : "ring-1 ring-border"
                      )}>
                        {IconComponent && <IconComponent className={cn("w-6 h-6 text-muted-foreground group-hover:text-primary", isActive && "text-primary-foreground")} />}
                      </div>
                  );
                    const itemKey = subItem.href || subItem.label;
                    const itemProps = {
                        className: "flex flex-col items-center justify-start space-y-1.5 group",
                        onClick: () => handleSubItemClick(subItem),
                    };

                  return (
                    <div key={itemKey} {...itemProps}>
                      {isLink && !hasSubItems ? (
                        <Link href={subItem.href} className="w-full h-full flex flex-col items-center">{content}</Link>
                      ) : (
                        <div className="w-full h-full flex flex-col items-center cursor-pointer">{content}</div>
                      )}
                      <span className="text-[11px] text-center font-medium text-muted-foreground group-hover:text-foreground h-8">{subItem.label}</span>
                    </div>
                  )
                })}
                </motion.div>
              </AnimatePresence>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
