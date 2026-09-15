import React, { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import http from '../api';
import { toast } from 'sonner';
import { Button } from './ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from './ui/alert-dialog';
import { Camera, ImagePlus, Loader2, CalendarDays, User, Images, ArrowDown, Trash2 } from 'lucide-react';

const base = (cid, aid) => `/clientes/${encodeURIComponent(cid)}/atendimentos/${encodeURIComponent(aid)}/fotos`;
const errorText = e => e.response?.data?.detail || e.message || 'Erro ao enviar. Tente novamente.';

function FotoImagem({ foto, clienteId, agendamentoId, miniatura = false, className = '', style }) {
  const [url, setUrl] = useState('');
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    setUrl(''); setError(false);
    if (foto.preview) return;
    const controller = new AbortController();
    let objectUrl;
    http.get(`${base(clienteId, agendamentoId)}/${foto.id}/imagem`, {
      params: { miniatura: miniatura ? '1' : '0', referencia: '1' }, responseType: 'blob', signal: controller.signal
    }).then(async r => {
      if (controller.signal.aborted) return;
      if (r.data.type.includes('application/json')) {
        const payload = JSON.parse(await r.data.text());
        if (!controller.signal.aborted) setUrl(payload.url);
      } else {
        objectUrl = URL.createObjectURL(r.data); setUrl(objectUrl);
      }
    }).catch(() => { if (!controller.signal.aborted) setError(true); });
    return () => { controller.abort(); if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [foto.id, foto.preview, clienteId, agendamentoId, miniatura, attempt]);
  if (error && miniatura) return <span className="text-xs p-2">Erro ao carregar. Clique para abrir.</span>;
  if (error) return <button type="button" className="text-xs p-2 text-white" onClick={() => setAttempt(a => a + 1)}>Erro ao carregar. Tentar novamente</button>;
  if (!foto.preview && !url) return <span role="status" className="text-xs p-2">Carregando a foto…</span>;
  return <img onError={() => setError(true)} referrerPolicy="no-referrer" src={foto.preview || url} alt="Registro fotográfico do atendimento" className={className} style={style} />;
}

export function FotosGaleria({ fotos = [], clienteId, agendamentoId, spacious = false }) {
  const [index, setIndex] = useState(null);
  const [zoom, setZoom] = useState(1);
  const next = direction => { setIndex(i => Math.max(0, Math.min(fotos.length - 1, i + direction))); setZoom(1); };
  const close = () => { setIndex(null); setZoom(1); };
  const selected = index === null ? null : fotos[index];
  return <div onClick={e => e.stopPropagation()}>
    <p className="text-xs text-zinc-500 my-2">{fotos.length ? `${fotos.length} foto${fotos.length > 1 ? 's' : ''}` : 'Nenhuma foto cadastrada no atendimento.'}</p>
    <div className={spacious ? 'grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3' : 'flex flex-wrap gap-2'}>
      {fotos.map((f, i) => <button type="button" key={f.id} aria-label={`Ampliar foto ${i + 1}`} onClick={() => { setIndex(i); setZoom(1); }} className={spacious ? 'aspect-square min-w-0 rounded-xl overflow-hidden border border-[#DCE5DF] dark:border-zinc-700 bg-[#F7F9F5] dark:bg-zinc-950 flex items-center justify-center shadow-sm transition hover:shadow-md hover:border-[#84A59D] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#84A59D] focus-visible:ring-offset-2' : 'w-20 h-20 rounded-lg overflow-hidden border flex items-center justify-center'}>
        <FotoImagem foto={f} clienteId={clienteId} agendamentoId={agendamentoId} miniatura className="w-full h-full object-cover" />
      </button>)}
    </div>
    <Dialog open={!!selected} onOpenChange={v => { if (!v) close(); }}>
      <DialogContent className="w-[96vw] max-w-5xl h-[90dvh] flex flex-col p-4" onKeyDown={e => {
        if (e.key === 'ArrowLeft') { e.preventDefault(); next(-1); }
        if (e.key === 'ArrowRight') { e.preventDefault(); next(1); }
      }} aria-describedby={undefined}>
        <DialogHeader><DialogTitle>Foto {(index || 0) + 1} de {fotos.length}</DialogTitle></DialogHeader>
        <div className="flex flex-wrap justify-center gap-2">
          <Button type="button" variant="outline" disabled={index === 0} onClick={() => next(-1)} aria-label="Foto anterior">←</Button>
          <Button type="button" variant="outline" disabled={zoom <= 1} onClick={() => setZoom(z => Math.max(1, z - .5))} aria-label="Reduzir zoom">−</Button>
          <Button type="button" variant="outline" onClick={() => setZoom(1)} aria-label="Restaurar zoom">{Math.round(zoom * 100)}%</Button>
          <Button type="button" variant="outline" disabled={zoom >= 5} onClick={() => setZoom(z => Math.min(5, z + .5))} aria-label="Aumentar zoom">+</Button>
          <Button type="button" variant="outline" disabled={index === fotos.length - 1} onClick={() => next(1)} aria-label="Próxima foto">→</Button>
          <Button type="button" variant="outline" onClick={close}>Fechar</Button>
        </div>
        <p className="text-xs text-center text-zinc-500">Use + e − para ampliar. Deslize a imagem ampliada para ver os detalhes.</p>
        <div className="flex-1 min-h-0 overflow-auto bg-zinc-950 rounded-lg" key={`${index}-${zoom}`}>
          <div style={{ width: `${zoom * 100}%`, height: `${zoom * 100}%` }}>
            {selected && <FotoImagem foto={selected} clienteId={clienteId} agendamentoId={agendamentoId} className="w-full h-full object-contain" />}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  </div>;
}

export const FotosEditor = forwardRef(function FotosEditor({ clienteId, agendamentoId, onBusyChange, onCountChange, disabled }, ref) {
  const fileInput = useRef(null);
  const [photoToRemove, setPhotoToRemove] = useState(null);
  const initialId = useRef(agendamentoId);
  const initialClient = useRef(clienteId);
  const savedId = useRef(agendamentoId);
  const rows = useRef([]);
  const busyRef = useRef(false);
  const ready = useRef(!agendamentoId);
  const previews = useRef(new Set());
  const [fotos, setFotos] = useState([]);
  const [busy, setBusy] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [attempt, setAttempt] = useState(0);
  const update = value => { rows.current = value; setFotos(value); onCountChange(value.length); };
  const markBusy = value => { busyRef.current = value; setBusy(value); onBusyChange(value); };
  useEffect(() => {
    if (!initialId.current) return;
    let active = true;
    ready.current = false; markBusy(true); setLoadError('');
    http.get(base(initialClient.current, initialId.current)).then(r => {
      if (active) { update(r.data.map(f => ({ ...f, status: 'saved' }))); ready.current = true; }
    }).catch(e => { if (active) setLoadError(errorText(e)); })
      .finally(() => { if (active) markBusy(false); });
    return () => { active = false; };
  }, [attempt]);
  useEffect(() => () => { previews.current.forEach(url => URL.revokeObjectURL(url)); }, []);

  const upload = async (aid, cid) => {
    if (busyRef.current || !ready.current) return false;
    savedId.current = aid;
    markBusy(true);
    let success = true;
    try {
      for (const f of [...rows.current]) {
        if (f.status === 'saved') continue;
        update(rows.current.map(row => row.id === f.id ? { ...row, status: 'uploading', attempted: true, error: '' } : row));
        try {
          const response = await http.put(`${base(cid, aid)}/${f.id}`, f.file, { headers: { 'Content-Type': f.file.type },
            onUploadProgress: event => update(rows.current.map(row => row.id === f.id ? { ...row, progress: Math.round(event.loaded / (event.total || f.file.size) * 100) } : row)) });
          update(rows.current.map(row => row.id === f.id ? { ...response.data, preview: row.preview, status: 'saved' } : row));
        } catch (e) {
          success = false;
          update(rows.current.map(row => row.id === f.id ? { ...row, status: 'error', error: errorText(e) } : row));
        }
      }
    } finally { markBusy(false); }
    if (!success) toast.error('Agendamento salvo. Algumas fotos falharam; tente novamente sem fechar este formulário.');
    else if (rows.current.length) toast.success('Fotos enviadas.');
    return success;
  };
  useImperativeHandle(ref, () => ({ upload, isReady: () => ready.current && !busyRef.current }));

  const select = async event => {
    const files = Array.from(event.target.files || []); event.target.value = '';
    if (busyRef.current || disabled) return;
    markBusy(true);
    try {
      for (const file of files) {
        if (rows.current.length >= 5) { toast.error('Este agendamento já possui o limite máximo de 5 fotos.'); break; }
        if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) { toast.error(`${file.name}: formato não permitido. Use JPG, PNG ou WEBP.`); continue; }
        if (file.size > 10 * 1024 * 1024) { toast.error(`${file.name}: arquivo acima do tamanho permitido de 10 MB.`); continue; }
        const preview = URL.createObjectURL(file);
        try {
          const img = new Image(); img.src = preview; await img.decode();
          if (img.naturalWidth > 16000 || img.naturalHeight > 16000 || img.naturalWidth * img.naturalHeight > 80000000) throw new Error('Dimensões acima do limite de 16000 px por lado ou 80 megapixels.');
          previews.current.add(preview);
          const id = '10000000-1000-4000-8000-100000000000'.replace(/[018]/g, c => (Number(c) ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> Number(c) / 4).toString(16));
          update([...rows.current, { id, file, preview, status: 'queued' }]);
        } catch (e) { URL.revokeObjectURL(preview); toast.error(`${file.name}: ${e.message || 'Imagem inválida.'}`); }
      }
    } finally { markBusy(false); }
  };
  const remove = async foto => {
    if (busyRef.current || disabled || !foto) return;
    markBusy(true);
    try {
      if (foto.status === 'saved' || foto.attempted) await http.delete(`${base(clienteId, savedId.current)}/${foto.id}`);
      update(rows.current.filter(f => f.id !== foto.id));
      if (foto.preview) { URL.revokeObjectURL(foto.preview); previews.current.delete(foto.preview); }
      toast.success('Foto removida.');
      setPhotoToRemove(null);
    } catch (e) { toast.error(errorText(e)); } finally { markBusy(false); }
  };
  return <section className="min-w-0 rounded-2xl border border-[#DCE5DF] bg-[#F7F9F5] p-4 sm:p-5 dark:border-zinc-700 dark:bg-zinc-950 space-y-4">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <h3 className="flex items-center gap-2.5 font-semibold text-zinc-800 dark:text-zinc-100">
        <span className="grid h-9 w-9 place-items-center rounded-xl bg-[#EAF0EE] text-[#648775] dark:bg-zinc-800 dark:text-[#B8D6C7]"><Camera className="h-4 w-4" /></span>
        Fotos da evolução
      </h3>
      <span className="rounded-full border border-[#DCE5DF] bg-white px-3 py-1 text-xs font-medium text-[#456957] dark:border-zinc-700 dark:bg-zinc-900 dark:text-[#B8D6C7]">{fotos.length} de 5 fotos</span>
    </div>
    <p className="text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">Registre a evolução do tratamento e amplie as fotos para conferir os detalhes.</p>
    {loadError && <p role="alert">{loadError} <Button type="button" onClick={() => setAttempt(n => n + 1)}>Tentar novamente</Button></p>}
    <input ref={fileInput} type="file" multiple accept="image/jpeg,image/png,image/webp" aria-label="Adicionar fotos ao atendimento" onChange={select} disabled={busy || disabled || !ready.current || fotos.length >= 5} className="hidden" />
    <div className="flex flex-col sm:flex-row sm:items-center gap-3 rounded-xl border border-dashed border-[#C9D8CE] bg-white/70 p-4 dark:border-zinc-700 dark:bg-zinc-900/50">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-zinc-700 dark:text-zinc-200">{fotos.length ? 'Adicione outros ângulos do tratamento' : 'Nenhuma foto adicionada'}</p>
        <p className="mt-1 text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">JPG, PNG ou WEBP · Até 10 MB por foto<br />As fotos serão enviadas ao salvar o agendamento.</p>
      </div>
      <Button type="button" disabled={busy || disabled || !ready.current || fotos.length >= 5} onClick={() => fileInput.current?.click()} className="shrink-0 gap-2 rounded-xl bg-[#456957] hover:bg-[#365443] text-white">
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />} {busy ? 'Aguarde…' : 'Adicionar fotos'}
      </Button>
    </div>
    {fotos.length >= 5 && <p role="status" className="text-sm">Este agendamento já possui o limite máximo de 5 fotos.</p>}
    {busy && <p role="status" className="text-sm">Processando fotos… Aguarde.</p>}
    {fotos.length > 0 && <FotosGaleria fotos={fotos} clienteId={clienteId} agendamentoId={savedId.current} />}
    <div className="space-y-2" aria-live="polite">
      {fotos.map((f, i) => <div key={f.id} className="flex items-center justify-between gap-2 text-xs">
        <span>Foto {i + 1}: {f.status === 'saved' ? 'Foto enviada' : f.status === 'uploading' ? `Enviando ${f.progress || 0}% — aguarde a confirmação` : f.status === 'error' ? `Erro ao enviar: ${f.error}` : 'Prévia pronta para enviar ao salvar'}</span>
        <Button type="button" variant="outline" size="sm" disabled={busy || disabled} onClick={() => setPhotoToRemove(f)}>Remover</Button>
      </div>)}
    </div>
    <AlertDialog open={!!photoToRemove} onOpenChange={open => { if (!open && !busyRef.current) setPhotoToRemove(null); }}>
      <AlertDialogContent className="w-[calc(100%-2rem)] max-w-md rounded-2xl p-5 sm:p-6 bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 shadow-xl" onEscapeKeyDown={event => { if (busyRef.current) event.preventDefault(); }}>
        <AlertDialogHeader className="text-left">
          <span className="mb-2 grid h-11 w-11 place-items-center rounded-xl bg-rose-50 text-rose-600 dark:bg-rose-950/30 dark:text-rose-400"><Trash2 className="h-5 w-5" /></span>
          <AlertDialogTitle className="font-display text-lg font-semibold text-zinc-800 dark:text-zinc-100">Remover foto do atendimento?</AlertDialogTitle>
          <AlertDialogDescription className="text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">Deseja realmente remover esta foto? Essa ação não poderá ser desfeita.</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="mt-2 gap-2 sm:gap-0">
          <AlertDialogCancel disabled={busy} className="rounded-xl">Cancelar</AlertDialogCancel>
          <AlertDialogAction disabled={busy || disabled} onClick={event => { event.preventDefault(); remove(photoToRemove); }} className="gap-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}{busy ? 'Removendo…' : 'Remover foto'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </section>;
});

export function FotosAtendimento({ clienteId, agendamentoId, onAlbum }) {
  const [fotos, setFotos] = useState([]);
  const [error, setError] = useState('');
  useEffect(() => {
    let active = true; setFotos([]); setError('');
    http.get(base(clienteId, agendamentoId)).then(r => { if (active) setFotos(r.data); }).catch(e => { if (active) setError(errorText(e)); });
    return () => { active = false; };
  }, [clienteId, agendamentoId]);
  return <div onClick={e => e.stopPropagation()}>
    {error ? <p role="alert" className="text-xs">{error}</p> : <FotosGaleria fotos={fotos} clienteId={clienteId} agendamentoId={agendamentoId} />}
    {onAlbum && <Button type="button" size="sm" variant="outline" onClick={onAlbum}>Álbum completo do cliente</Button>}
  </div>;
}

export function AlbumCliente({ clienteId, open, onOpenChange }) {
  const [groups, setGroups] = useState([]);
  const [next, setNext] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const generation = useRef(0);
  const loading = useRef(false);
  const load = async (offset, gen) => {
    if (loading.current) return;
    loading.current = true; setBusy(true); setError('');
    try {
      const r = await http.get(`/clientes/${encodeURIComponent(clienteId)}/album`, { params: { offset } });
      if (gen !== generation.current) return;
      setGroups(prev => offset === 0 ? r.data.atendimentos : [...prev, ...r.data.atendimentos]); setNext(r.data.proximo);
    } catch (e) { if (gen === generation.current) setError(errorText(e)); }
    finally { if (gen === generation.current) { loading.current = false; setBusy(false); } }
  };
  useEffect(() => {
    generation.current++; loading.current = false; setGroups([]); setNext(0);
    if (open) load(0, generation.current);
    return () => { generation.current++; };
  }, [open, clienteId]);
  return <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="w-[calc(100%-1rem)] max-w-4xl max-h-[92dvh] flex flex-col gap-0 p-0 overflow-hidden rounded-2xl bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800" aria-describedby={undefined}>
      <DialogHeader className="shrink-0 px-5 sm:px-7 py-6 pr-10 text-left border-b border-[#E8EFEA] dark:border-zinc-800 bg-[#F7F9F5] dark:bg-zinc-950">
        <div className="flex items-center gap-3">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-[#EAF0EE] text-[#648775] dark:bg-zinc-800 dark:text-[#B8D6C7]"><Images className="h-5 w-5" /></span>
          <div className="min-w-0"><p className="text-[10px] uppercase tracking-[0.18em] text-[#648775] dark:text-[#B8D6C7] font-semibold mb-1">Evolução dos tratamentos</p>
            <DialogTitle className="font-display text-lg sm:text-xl font-semibold text-zinc-800 dark:text-zinc-100">Álbum de fotos do cliente</DialogTitle>
          </div>
        </div>
        <p className="pt-3 text-xs sm:text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">Uma história de cuidado, atendimento por atendimento. Toque em uma foto para ampliar e conferir os detalhes.</p>
      </DialogHeader>
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 sm:px-7 py-5 space-y-5">
        {groups.length > 0 && <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-zinc-500 dark:text-zinc-400"><span>Atendimentos mais recentes primeiro</span><span className="rounded-full bg-[#EAF0EE] dark:bg-zinc-800 px-3 py-1 font-medium text-[#456957] dark:text-[#B8D6C7]">{groups.reduce((total, ag) => total + ag.fotos.length, 0)} fotos carregadas</span></div>}
        {groups.map(ag => <section key={ag.id} className="rounded-2xl border border-[#E1E8E3] dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm overflow-hidden">
          <div className="flex items-start gap-3 p-4 sm:p-5 bg-[#F8FAF7] dark:bg-zinc-950/60 border-b border-[#E8EFEA] dark:border-zinc-800">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[#EAF0EE] dark:bg-zinc-800 text-[#648775] dark:text-[#B8D6C7]"><CalendarDays className="h-4 w-4" /></span>
            <div className="min-w-0 space-y-1.5">
              <h3 className="text-sm font-semibold text-zinc-800 dark:text-zinc-100">{new Date(ag.data_hora).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}<span className="ml-2 text-xs font-normal text-zinc-500">{new Date(ag.data_hora).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span></h3>
              <p className="text-sm font-medium text-[#456957] dark:text-[#B8D6C7] break-words">{ag.itens?.map(i => i.nome).join(', ') || 'Atendimento'}</p>
              <p className="flex items-start gap-1.5 text-xs text-zinc-500 dark:text-zinc-400"><User className="h-3.5 w-3.5 shrink-0 mt-0.5" /><span>{ag.profissionais?.map(p => p.nome).join(', ') || ag.itens?.map(i => i.colaborador_nome).filter(Boolean).join(', ') || 'Profissional não informado'}</span></p>
            </div>
          </div>
          <div className="px-4 sm:px-5 pb-5 pt-1"><FotosGaleria spacious fotos={ag.fotos} clienteId={clienteId} agendamentoId={ag.id} /></div>
        </section>)}
        {!busy && !error && !groups.length && <div className="rounded-2xl border border-dashed border-[#CDDCD2] dark:border-zinc-700 bg-[#F7F9F5] dark:bg-zinc-950 px-6 py-10 text-center">
          <Camera className="h-8 w-8 mx-auto mb-4 text-[#84A59D]" /><p className="font-medium text-zinc-700 dark:text-zinc-200">O álbum começa no próximo registro</p><p className="mt-2 text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">As fotos adicionadas aos atendimentos aparecerão aqui, organizadas por data.</p>
        </div>}
        {error && <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-300">{error}</p>}
        {next !== null && <div className="flex justify-center"><Button type="button" variant="outline" className="gap-2 rounded-xl border-[#DCE5DF] text-[#456957] dark:border-zinc-700 dark:text-[#B8D6C7]" disabled={busy} onClick={() => load(next, generation.current)}>{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowDown className="h-4 w-4" />}{busy ? 'Carregando fotos…' : error ? 'Tentar novamente' : 'Carregar mais atendimentos'}</Button></div>}
      </div>
      <div className="shrink-0 flex justify-end border-t border-zinc-100 dark:border-zinc-800 px-5 sm:px-7 py-4"><Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="w-full sm:w-auto rounded-xl px-6">Voltar ao histórico</Button></div>
    </DialogContent>
  </Dialog>;
}
