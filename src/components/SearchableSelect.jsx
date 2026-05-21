import React, { useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Search, ChevronDown, Check } from "lucide-react";
import { cn } from "@/lib/utils";

export default function SearchableSelect({
  options = [],
  value = "",
  onValueChange,
  placeholder = "Selecione...",
  searchPlaceholder = "Buscar...",
  emptyText = "Nenhum resultado encontrado.",
  className = "",
  triggerTestId = ""
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const selectedOption = options.find((opt) => opt.value === value);

  const filteredOptions = options.filter((opt) =>
    opt.label.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          data-testid={triggerTestId}
          className={cn("w-full justify-between bg-white text-left font-normal border-zinc-200 hover:bg-zinc-50/50 h-10 px-3", className)}
        >
          <span className="truncate">
            {selectedOption ? selectedOption.label : placeholder}
          </span>
          <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-1 bg-white border border-zinc-200 shadow-lg rounded-lg z-50">
        <div className="flex items-center border-b border-zinc-100 px-3 py-1 bg-zinc-50/50 rounded-t-lg">
          <Search className="mr-2 h-4 w-4 shrink-0 opacity-40" />
          <Input
            placeholder={searchPlaceholder}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex h-9 w-full rounded-md bg-transparent py-2 text-sm outline-none border-none focus-visible:ring-0 focus-visible:ring-offset-0 px-0 placeholder:text-zinc-400"
          />
        </div>
        <div className="max-h-[220px] overflow-y-auto p-1 space-y-0.5">
          {filteredOptions.length === 0 ? (
            <div className="py-6 text-center text-sm text-zinc-400 font-medium">
              {emptyText}
            </div>
          ) : (
            filteredOptions.map((opt) => {
              const isSelected = opt.value === value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => {
                    onValueChange(opt.value);
                    setOpen(false);
                    setSearch("");
                  }}
                  className={cn(
                    "flex w-full items-center justify-between rounded-md px-3 py-2 text-sm text-left hover:bg-zinc-100 transition-colors",
                    isSelected ? "bg-[#EAF0EE] text-[#3A4F4A] font-semibold" : "text-zinc-700"
                  )}
                >
                  <span className="truncate">{opt.label}</span>
                  {isSelected && <Check className="h-4 w-4 text-[#3A4F4A] shrink-0" />}
                </button>
              );
            })
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
