
"use client";

import React from "react";
import { useBreakpoint } from "@/hooks/use-breakpoint";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "./card";

interface Column<T> {
  header: string;
  accessorKey?: keyof T;
  cell?: (item: T) => React.ReactNode;
  className?: string;
  hideOnTablet?: boolean;
}

interface AdaptiveTableProps<T> {
  data: T[];
  columns: Column<T>[];
  renderMobileCard: (item: T) => React.ReactNode;
  keyExtractor: (item: T) => string;
  emptyMessage?: string;
  isLoading?: boolean;
  className?: string;
}

/**
 * AdaptiveTable:
 * - Desktop: Full Table
 * - Tablet: Simple Table (hiding marked columns)
 * - Mobile: Card List (no table)
 */
export function AdaptiveTable<T>({ 
  data, 
  columns, 
  renderMobileCard, 
  keyExtractor, 
  emptyMessage = "Tidak ada data ditemukan.",
  isLoading,
  className
}: AdaptiveTableProps<T>) {
  const { isMobile, isTablet } = useBreakpoint();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20 text-muted-foreground animate-pulse">
        <p className="text-sm font-bold uppercase tracking-widest">Sinkronisasi Data...</p>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="py-20 text-center text-muted-foreground italic text-sm">
          {emptyMessage}
        </CardContent>
      </Card>
    );
  }

  // TRANSFORMASI: Render Card List untuk Mobile
  if (isMobile) {
    return (
      <div className={cn("grid grid-cols-1 gap-3 sm:gap-4", className)}>
        {data.map((item) => (
          <div key={keyExtractor(item)} className="animate-in fade-in slide-in-from-bottom-2 duration-300">
            {renderMobileCard(item)}
          </div>
        ))}
      </div>
    );
  }

  // DESKTOP & TABLET: Render Table
  return (
    <div className={cn("rounded-xl border shadow-sm overflow-hidden bg-background", className)}>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader className="bg-muted/50">
            <TableRow>
              {columns.map((col, idx) => (
                <TableHead 
                  key={idx} 
                  className={cn(
                    "text-[10px] font-black uppercase tracking-wider py-4 px-6",
                    col.hideOnTablet && isTablet && "hidden",
                    col.className
                  )}
                >
                  {col.header}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((item) => (
              <TableRow key={keyExtractor(item)} className="hover:bg-muted/5 transition-colors group">
                {columns.map((col, idx) => (
                  <TableCell 
                    key={idx} 
                    className={cn(
                      "py-4 px-6 text-sm",
                      col.hideOnTablet && isTablet && "hidden",
                      col.className
                    )}
                  >
                    {col.cell ? col.cell(item) : (col.accessorKey ? String(item[col.accessorKey]) : null)}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
