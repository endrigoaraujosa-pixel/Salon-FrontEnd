import React from "react";

export function PageHeader({ overline, title, action }) {
  return (
    <header className="mb-6 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
      <div>
        {overline && <div className="text-xs uppercase tracking-wider text-zinc-400">{overline}</div>}
        <h1 className="font-display text-3xl md:text-4xl font-semibold tracking-tight mt-1">{title}</h1>
      </div>
      {action && (
        <div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
          {action}
        </div>
      )}
    </header>
  );
}

export function EmptyState({ icon: Icon, title, hint, action }) {
  return (
    <div className="py-16 text-center bg-white border border-dashed border-zinc-200 rounded-xl">
      {Icon && <Icon className="w-8 h-8 mx-auto text-zinc-300 mb-3" />}
      <div className="font-display font-medium text-lg text-zinc-700">{title}</div>
      {hint && <div className="text-sm text-zinc-400 mt-1">{hint}</div>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
