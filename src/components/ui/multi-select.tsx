// src/components/ui/multi-select.tsx

"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "./badge";
import { ChevronsUpDown, Check } from "lucide-react";

export interface OptionType {
  label: string;
  value: string;
}

interface MultiSelectProps {
  options: OptionType[];
  value: string[];
  onChange: (value: string[]) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

export function MultiSelect({
  options,
  value,
  onChange,
  placeholder = "Select options...",
  className,
  disabled,
}: MultiSelectProps) {
  const [open, setOpen] = React.useState(false);

  const selectedLabels = value
    .map(val => options.find(opt => opt.value === val)?.label)
    .filter(Boolean) as string[];

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn("w-full justify-between h-auto min-h-10 py-1.5 px-3", className)}
          disabled={disabled}
        >
          <div className="flex flex-wrap gap-1 items-center">
            {selectedLabels.length > 0 ? (
              selectedLabels.map(label => (
                <Badge variant="secondary" key={label} className="text-[10px] h-5 px-1.5 font-semibold">
                  {label}
                </Badge>
              ))
            ) : (
              <span className="text-muted-foreground font-normal">{placeholder}</span>
            )}
          </div>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
        <Command>
          <CommandInput placeholder="Cari..." />
          <CommandList>
            <CommandEmpty>Tidak ada hasil.</CommandEmpty>
            <CommandGroup>
              {options.map((option) => (
                <CommandItem
                  key={option.value}
                  onSelect={() => {
                    const newValue = value.includes(option.value)
                      ? value.filter((v) => v !== option.value)
                      : [...value, option.value];
                    onChange(newValue);
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value.includes(option.value) ? "opacity-100" : "opacity-0"
                    )}
                  />
                  {option.label}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
