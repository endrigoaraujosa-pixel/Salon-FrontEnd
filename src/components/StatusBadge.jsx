import React from "react";

export const STATUS_LABELS = {
  agendado: "Agendado",
  confirmado: "Confirmado",
  em_andamento: "Em andamento",
  concluido: "Concluído",
  cancelado: "Cancelado",
};

const COLORS = {
  agendado: "bg-sky-50 text-sky-700 dark:bg-zinc-900 dark:text-sky-400 dark:border dark:border-sky-950",
  confirmado: "bg-amber-50 text-amber-700 dark:bg-zinc-900 dark:text-amber-400 dark:border dark:border-amber-950",
  em_andamento: "bg-purple-50 text-purple-700 dark:bg-zinc-900 dark:text-purple-400 dark:border dark:border-purple-950",
  concluido: "bg-emerald-50 text-emerald-700 dark:bg-zinc-900 dark:text-emerald-400 dark:border dark:border-emerald-950",
  cancelado: "bg-rose-50 text-rose-700 dark:bg-zinc-900 dark:text-rose-400 dark:border dark:border-rose-950",
};

export default function StatusBadge({ status }) {
  const cls = COLORS[status] || "bg-zinc-100 text-zinc-700";
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${cls}`} data-testid={`status-${status}`}>
      {STATUS_LABELS[status] || status}
    </span>
  );
}
