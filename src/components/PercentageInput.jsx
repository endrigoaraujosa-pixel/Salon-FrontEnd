import * as React from "react";
import { Input } from "./ui/input";
import { cn } from "@/lib/utils";

/**
 * Reusable percentage input used in the commission tables.
 * It renders a numeric input (0‑100) with a trailing "%" label.
 * Props are forwarded to the underlying Input component.
 */
const PercentageInput = React.forwardRef(
  ({ id, value, onChange, disabled = false, className, ...props }, ref) => {
    const handleChange = (e) => {
      const val = e.target.value;
      if (val === "") {
        onChange(e);
        return;
      }
      const num = Number(val);
      if (!isNaN(num) && num >= 0 && num <= 100) {
        onChange(e);
      }
    };

    return (
      <div className="relative flex items-center" title={disabled ? "Comissão avançada ativada" : undefined}>
        <Input
          id={id}
          type="number"
          min={0}
          max={100}
          value={value}
          onChange={handleChange}
          disabled={disabled}
          className={cn(
            "h-8 pr-7 text-right font-mono text-sm sm:text-base font-bold text-zinc-900 dark:text-zinc-50 border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 focus-visible:ring-1 focus-visible:ring-[#84A59D]",
            className
          )}
          ref={ref}
          {...props}
        />
        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-650 dark:text-zinc-300 text-sm font-bold select-none">%</span>
      </div>
    );
  }
);

PercentageInput.displayName = "PercentageInput";

export default PercentageInput;
