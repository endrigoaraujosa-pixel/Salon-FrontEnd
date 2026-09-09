import React from 'react';
import { Loader2, AlertCircle } from 'lucide-react';
import { Button } from './ui/button';

export default function PageLoadState({ loading, error, onRetry }) {
  return (
    <div role={error ? 'alert' : 'status'} aria-live="polite" aria-busy={loading}
      className="flex min-h-48 flex-col items-center justify-center gap-3 rounded-xl border border-zinc-200 bg-white p-8 text-sm text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400">
      {error ? <AlertCircle className="h-7 w-7 text-rose-500" aria-hidden="true" /> : <Loader2 className="h-7 w-7 animate-spin text-[#84A59D]" aria-hidden="true" />}
      <p>{error || 'Carregando informações...'}</p>
      {error && onRetry && <Button variant="outline" onClick={onRetry}>Tentar novamente</Button>}
    </div>
  );
}
