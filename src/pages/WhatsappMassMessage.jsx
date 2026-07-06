import React, { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import http from "../api";
import { PageHeader } from "../components/Page";
import { Button } from "../components/ui/button";
import { Card } from "../components/ui/card";
import { Label } from "../components/ui/label";
import { Textarea } from "../components/ui/textarea";
import {
  ArrowLeft, Send, Clock, Users, CheckCircle2, AlertCircle,
  XCircle, Calendar, MessageSquare, ChevronLeft, ChevronRight, Loader2,
  RefreshCw, Eye, X, Radio, BanIcon, Megaphone, Info, Image
} from "lucide-react";
import { toast } from "sonner";

// ─── Formatação de data/hora ────────────────────────────────────────────────────

function formatDateTimeBR(isoStr) {
  if (!isoStr) return "—";
  try {
    const d = new Date(isoStr);
    return d.toLocaleString("pt-BR", {
      timeZone: "America/Recife",
      day: "2-digit", month: "2-digit", year: "numeric",
      hour: "2-digit", minute: "2-digit"
    });
  } catch { return "—"; }
}

function toLocalInputValue(date = new Date()) {
  // Retorna "YYYY-MM-DDTHH:mm" no fuso local para preencher o input datetime-local
  const pad = n => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

// ─── Badge de status ──────────────────────────────────────────────────────────

function StatusBadge({ status }) {
  const map = {
    agendada:  { label: "Agendada",  color: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300", icon: <Clock className="w-3 h-3" /> },
    enviando:  { label: "Enviando",  color: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300", icon: <Loader2 className="w-3 h-3 animate-spin" /> },
    enviada:   { label: "Enviada",   color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300", icon: <CheckCircle2 className="w-3 h-3" /> },
    parcial:   { label: "Parcial",   color: "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300", icon: <AlertCircle className="w-3 h-3" /> },
    cancelada: { label: "Cancelada", color: "bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400", icon: <BanIcon className="w-3 h-3" /> },
    falhou:    { label: "Falhou",    color: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300", icon: <XCircle className="w-3 h-3" /> },
  };
  const s = map[status] || map.agendada;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${s.color}`}>
      {s.icon} {s.label}
    </span>
  );
}

// ─── Modal de detalhes de campanha ──────────────────────────────────────────────

function CampanhaDetalheModal({ campanha, onClose }) {
  const [detalhe, setDetalhe] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!campanha) return;
    setLoading(true);
    http.get(`/whatsapp/campanhas/${campanha.id}`)
      .then(r => setDetalhe(r.data))
      .catch(() => toast.error("Erro ao carregar detalhes"))
      .finally(() => setLoading(false));
  }, [campanha]);

  if (!campanha) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col border border-zinc-200 dark:border-zinc-800">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-zinc-200 dark:border-zinc-800 shrink-0">
          <div>
            <h3 className="font-bold text-zinc-900 dark:text-zinc-100 text-base">{detalhe?.campanha?.titulo || campanha.titulo}</h3>
            <p className="text-xs text-zinc-500 mt-0.5">
              Criada em {formatDateTimeBR(campanha.criado_em)} por {campanha.criado_por || "—"}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <StatusBadge status={detalhe?.campanha?.status || campanha.status} />
            <button onClick={onClose} className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex-1 flex items-center justify-center py-16">
            <Loader2 className="w-6 h-6 animate-spin text-emerald-500" />
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto p-5 space-y-4">
            {/* Estatísticas */}
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: "Total", value: detalhe?.campanha?.total_clientes, color: "text-zinc-900 dark:text-zinc-100" },
                { label: "Enviados", value: detalhe?.campanha?.enviados, color: "text-emerald-600 dark:text-emerald-400" },
                { label: "Falhas", value: detalhe?.campanha?.falhas, color: "text-red-600 dark:text-red-400" },
              ].map(s => (
                <div key={s.label} className="bg-zinc-50 dark:bg-zinc-950 rounded-xl p-3 text-center border border-zinc-200 dark:border-zinc-800">
                  <div className={`text-2xl font-bold ${s.color}`}>{s.value ?? 0}</div>
                  <div className="text-xs text-zinc-500 mt-0.5">{s.label}</div>
                </div>
              ))}
            </div>

            {/* Mensagem e Mídia */}
            <div>
              <Label className="text-xs font-semibold mb-1.5 block">Conteúdo enviado</Label>
              <div className="bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl p-3 text-sm text-zinc-700 dark:text-zinc-300 font-mono leading-relaxed overflow-hidden">
                {detalhe?.campanha?.midia_base64 && (
                  <div className="mb-3 rounded-lg overflow-hidden border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
                    <img 
                      src={detalhe.campanha.midia_base64} 
                      alt="Anexo da campanha" 
                      className="w-full max-h-48 object-contain bg-black/5" 
                    />
                    {detalhe.campanha.midia_nome && (
                      <div className="px-3 py-1.5 text-[10px] text-zinc-500 bg-zinc-100 dark:bg-zinc-900 border-t border-zinc-200 dark:border-zinc-800 truncate">
                        📎 {detalhe.campanha.midia_nome}
                      </div>
                    )}
                  </div>
                )}
                <div className="whitespace-pre-wrap max-h-32 overflow-y-auto pr-2">
                  {detalhe?.campanha?.mensagem}
                </div>
              </div>
            </div>

            {/* Lista de envios */}
            {detalhe?.envios?.length > 0 && (
              <div>
                <Label className="text-xs font-semibold mb-1.5 block">Envios por cliente</Label>
                <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
                  <div className="max-h-48 overflow-y-auto divide-y divide-zinc-100 dark:divide-zinc-800">
                    {detalhe.envios.map(e => (
                      <div key={e.id} className="flex items-center gap-3 px-3 py-2">
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-zinc-900 dark:text-zinc-100 truncate">{e.cliente_nome || "—"}</div>
                          <div className="text-xs text-zinc-500">{e.telefone}</div>
                        </div>
                        <div className="shrink-0">
                          {e.status === "enviado"
                            ? <span className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Enviado</span>
                            : e.status === "falhou"
                              ? <span className="text-xs text-red-600 dark:text-red-400 font-semibold flex items-center gap-1" title={e.erro}><XCircle className="w-3 h-3" /> Falhou</span>
                              : <span className="text-xs text-zinc-400 flex items-center gap-1"><Clock className="w-3 h-3" /> Pendente</span>
                          }
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Componente Principal ─────────────────────────────────────────────────────

export default function WhatsappMassMessage() {
  const navigate = useNavigate();

  // Form
  const [titulo, setTitulo] = useState("Mensagem em Massa");
  const [mensagem, setMensagem] = useState("");
  const [modoEnvio, setModoEnvio] = useState("agora"); // "agora" | "agendado"
  const [dataAgendamento, setDataAgendamento] = useState(() => {
    const d = new Date();
    d.setMinutes(d.getMinutes() + 30);
    return toLocalInputValue(d);
  });

  // Mídia
  const [midiaFile, setMidiaFile] = useState(null);
  const [midiaBase64, setMidiaBase64] = useState(null);

  // Clientes
  const [clientes, setClientes] = useState([]);
  const [loadingClientes, setLoadingClientes] = useState(true);
  const [filtroCliente, setFiltroCliente] = useState("");
  const [selectedIds, setSelectedIds] = useState([]);
  const [clientPage, setClientPage] = useState(1);
  const CLIENTS_PER_PAGE = 100;

  // Campanhas
  const [campanhas, setCampanhas] = useState([]);
  const [loadingCampanhas, setLoadingCampanhas] = useState(true);
  const [sending, setSending] = useState(false);

  // Modal
  const [campanhaDetalhe, setCampanhaDetalhe] = useState(null);

  // Modal confirmação
  const [confirmando, setConfirmando] = useState(false);

  // ── Carregar clientes ──────────────────────────────────────────────────────
  const loadClientes = useCallback(async () => {
    setLoadingClientes(true);
    try {
      const res = await http.get("/clientes", { params: { limit: 9999 } });
      const lista = (res.data?.data || res.data || []).filter(c => c.telefone && c.telefone.trim() !== "");
      setClientes(lista);
      setSelectedIds(lista.map(c => c.id));
    } catch {
      toast.error("Erro ao carregar clientes");
    } finally {
      setLoadingClientes(false);
    }
  }, []);

  // ── Carregar campanhas ─────────────────────────────────────────────────────
  const loadCampanhas = useCallback(async () => {
    setLoadingCampanhas(true);
    try {
      const res = await http.get("/whatsapp/campanhas");
      setCampanhas(res.data?.data || []);
    } catch {
      // silencioso — tabela pode não existir ainda
    } finally {
      setLoadingCampanhas(false);
    }
  }, []);

  useEffect(() => {
    loadClientes();
    loadCampanhas();
  }, [loadClientes, loadCampanhas]);

  // ── Mídia ────────────────────────────────────────────────────────────────
  const handleMediaUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Por favor, selecione uma imagem.");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error("A imagem deve ter no máximo 5MB.");
      return;
    }

    setMidiaFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => {
      setMidiaBase64(ev.target.result);
    };
    reader.readAsDataURL(file);
  };

  const removeMedia = () => {
    setMidiaFile(null);
    setMidiaBase64(null);
  };

  // ── Preview da mensagem ───────────────────────────────────────────────────
  const previewMensagem = () => {
    return (mensagem || "").replace(/{nome}/g, "Maria da Silva");
  };

  // ── Clientes filtrados ────────────────────────────────────────────────────
  const clientesFiltrados = clientes.filter(c =>
    !filtroCliente || c.nome.toLowerCase().includes(filtroCliente.toLowerCase())
  );

  const totalClientPages = Math.max(1, Math.ceil(clientesFiltrados.length / CLIENTS_PER_PAGE));
  const clientesPaginados = clientesFiltrados.slice((clientPage - 1) * CLIENTS_PER_PAGE, clientPage * CLIENTS_PER_PAGE);

  // ── Cancelar campanha ─────────────────────────────────────────────────────
  const handleCancelar = async (campanha) => {
    try {
      await http.post(`/whatsapp/campanhas/${campanha.id}/cancelar`);
      toast.success("Campanha cancelada com sucesso!");
      loadCampanhas();
    } catch (e) {
      toast.error(e.response?.data?.detail || "Erro ao cancelar campanha");
    }
  };

  // ── Seleção Individual de Clientes ─────────────────────────────────────────
  const toggleClientSelection = (id) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  // ── Enviar / Agendar ──────────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!mensagem.trim()) {
      toast.error("Escreva uma mensagem antes de enviar.");
      return;
    }
    if (selectedIds.length === 0) {
      toast.error("Selecione pelo menos um cliente para enviar.");
      return;
    }
    setConfirmando(true);
  };

  const handleConfirmar = async () => {
    setSending(true);
    setConfirmando(false);
    try {
      const payload = {
        titulo,
        mensagem: mensagem.trim(),
        agendado_para: modoEnvio === "agendado" ? dataAgendamento : null,
        midia_base64: midiaBase64,
        midia_nome: midiaFile?.name,
        midia_tipo: midiaFile?.type,
        cliente_ids: selectedIds
      };
      await http.post("/whatsapp/campanhas", payload);
      if (modoEnvio === "agora") {
        toast.success(`Envio iniciado para ${selectedIds.length} cliente(s)! Acompanhe o progresso no histórico.`);
      } else {
        toast.success(`Campanha agendada com sucesso para ${formatDateTimeBR(dataAgendamento)}!`);
      }
      setMensagem("");
      setTitulo("Mensagem em Massa");
      setMidiaFile(null);
      setMidiaBase64(null);
      setSelectedIds(clientes.map(c => c.id)); // Reset selection to all
      setTimeout(loadCampanhas, 1500);
    } catch (e) {
      toast.error(e.response?.data?.detail || "Erro ao criar campanha");
    } finally {
      setSending(false);
    }
  };

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="p-4 md:p-6 lg:p-8 fade-in min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-800 dark:text-zinc-200">

      {/* Modal detalhe */}
      {campanhaDetalhe && (
        <CampanhaDetalheModal
          campanha={campanhaDetalhe}
          onClose={() => setCampanhaDetalhe(null)}
        />
      )}

      {/* Modal confirmação */}
      {confirmando && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setConfirmando(false)} />
          <div className="relative bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl w-full max-w-sm border border-zinc-200 dark:border-zinc-800 p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center shrink-0">
                <Megaphone className="w-5 h-5 text-emerald-500" />
              </div>
              <div>
                <h3 className="font-bold text-zinc-900 dark:text-zinc-100">Confirmar envio</h3>
                <p className="text-xs text-zinc-500">Esta ação não pode ser desfeita.</p>
              </div>
            </div>
            <div className="bg-zinc-50 dark:bg-zinc-950 rounded-xl p-3 text-sm text-zinc-700 dark:text-zinc-300 mb-4 space-y-1.5 border border-zinc-200 dark:border-zinc-800">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-emerald-500" />
                <span><strong>{selectedIds.length}</strong> clientes serão notificados</span>
              </div>
              <div className="flex items-center gap-2">
                {modoEnvio === "agora"
                  ? <><Send className="w-4 h-4 text-emerald-500" /><span>Envio <strong>imediato</strong> em background</span></>
                  : <><Clock className="w-4 h-4 text-blue-500" /><span>Agendado para <strong>{formatDateTimeBR(dataAgendamento)}</strong></span></>
                }
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setConfirmando(false)}>Cancelar</Button>
              <Button
                onClick={handleConfirmar}
                className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
              >
                {modoEnvio === "agora" ? "Enviar agora" : "Agendar"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Back button */}
      <Button
        variant="ghost"
        onClick={() => navigate("/configuracoes/whatsapp")}
        className="mb-4 text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
      >
        <ArrowLeft className="w-4 h-4 mr-1" /> Voltar
      </Button>

      <PageHeader
        overline="WhatsApp"
        title="Mensagem em Massa"
      />

      <div className="mt-6 max-w-7xl grid grid-cols-1 xl:grid-cols-3 gap-6">

        {/* ─── Coluna Esquerda: Composer ──────────────────────────────────── */}
        <div className="xl:col-span-2 space-y-5">

          {/* Título da Campanha */}
          <Card className="p-5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-sm">
            <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2 mb-3">
              <Megaphone className="w-4 h-4 text-emerald-500" />
              Identificação da Campanha
            </h3>
            <div className="space-y-1.5">
              <Label htmlFor="titulo-campanha" className="text-xs">Título interno (não enviado ao cliente)</Label>
              <input
                id="titulo-campanha"
                type="text"
                value={titulo}
                onChange={e => setTitulo(e.target.value)}
                placeholder="Ex: Promoção de Julho, Aviso de Feriado..."
                className="w-full h-10 px-3 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
              />
            </div>
          </Card>

          {/* Mensagem */}
          <Card className="p-5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-emerald-500" />
                Mensagem
              </h3>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="xs"
                  className="text-xs text-zinc-500 relative overflow-hidden"
                >
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleMediaUpload}
                    className="absolute inset-0 opacity-0 cursor-pointer"
                    title="Anexar Imagem"
                  />
                  <Image className="w-3.5 h-3.5 mr-1" />
                  Imagem
                </Button>
                <Button
                  variant="outline"
                  size="xs"
                  onClick={() => setMensagem("Olá, {nome}! 🌟\n\nPassamos para avisar que temos uma novidade especial esperando por você.\n\nVenha nos visitar e aproveite!\n\nAté breve! 💚")}
                  className="text-xs text-zinc-500"
                >
                  Usar modelo
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-start">
              {/* Textarea + variáveis */}
              <div className="space-y-3">
                <Textarea
                  id="mensagem-massa"
                  value={mensagem}
                  onChange={e => setMensagem(e.target.value)}
                  placeholder="Escreva sua mensagem aqui..."
                  className="min-h-[180px] font-mono text-sm bg-zinc-50 border-zinc-200 dark:bg-zinc-950 dark:border-zinc-800 focus:bg-white resize-none"
                />
                {/* Contador */}
                <div className="flex items-center justify-between text-xs text-zinc-400">
                  <span>{mensagem.length} caracteres</span>
                  <span className={mensagem.length > 1000 ? "text-amber-500" : ""}>
                    {mensagem.length > 1000 ? "Mensagem longa" : ""}
                  </span>
                </div>
                {/* Variáveis */}
                <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
                  <div className="px-3 py-2 bg-zinc-100 dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800">
                    <span className="text-[11px] font-bold text-zinc-600 dark:text-zinc-400">Variáveis Disponíveis</span>
                  </div>
                  <div className="divide-y divide-zinc-100 dark:divide-zinc-800 text-xs">
                    {[["{nome}", "Nome do cliente"]].map(([v, d]) => (
                      <div
                        key={v}
                        className="grid grid-cols-3 px-3 py-2 hover:bg-zinc-50 dark:hover:bg-zinc-950/50 cursor-pointer transition-colors"
                        onClick={() => setMensagem(m => m + v)}
                        title="Clique para inserir"
                      >
                        <span className="font-mono text-emerald-600 dark:text-emerald-400 font-semibold">{v}</span>
                        <span className="col-span-2 text-zinc-500">{d}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Preview WhatsApp */}
              <div className="space-y-2 lg:sticky lg:top-6">
                <div className="flex items-center gap-1.5">
                  <Eye className="w-3.5 h-3.5 text-emerald-500" />
                  <span className="text-xs font-semibold text-zinc-600 dark:text-zinc-400">Prévia</span>
                </div>
                <div className="rounded-2xl bg-[#E5DDD5] dark:bg-zinc-950 p-4 border border-zinc-200 dark:border-zinc-800 relative overflow-hidden min-h-[180px]">
                  <div className="absolute inset-0 opacity-5 pointer-events-none" style={{ backgroundImage: "radial-gradient(#000 10%, transparent 10%)", backgroundSize: "20px 20px" }} />
                  {mensagem || midiaBase64 ? (
                    <div className="relative self-start bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 p-2 rounded-2xl rounded-tl-none shadow-sm max-w-[85%] text-sm whitespace-pre-wrap leading-relaxed">
                      {midiaBase64 && (
                        <div className="relative mb-2 w-full rounded-xl overflow-hidden group">
                          <img src={midiaBase64} alt="Preview" className="w-full object-cover rounded-xl max-h-[200px]" />
                          <button
                            onClick={removeMedia}
                            className="absolute top-2 right-2 p-1.5 bg-black/50 hover:bg-red-500/80 text-white rounded-full opacity-0 group-hover:opacity-100 transition-all"
                            title="Remover imagem"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      )}
                      <div className="px-1.5 pb-1">
                        {previewMensagem()}
                      </div>
                      <div className="text-[10px] text-zinc-400 text-right pr-1.5 pb-0.5">
                        {new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })} ✓✓
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center h-full min-h-[140px] text-zinc-400 text-xs">
                      A prévia aparecerá aqui...
                    </div>
                  )}
                </div>
              </div>
            </div>
          </Card>

          {/* Agendamento */}
          <Card className="p-5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-sm">
            <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2 mb-4">
              <Calendar className="w-4 h-4 text-emerald-500" />
              Quando enviar?
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
              {/* Agora */}
              <button
                type="button"
                onClick={() => setModoEnvio("agora")}
                className={`p-4 rounded-xl border text-left transition-all ${
                  modoEnvio === "agora"
                    ? "border-emerald-500 bg-emerald-50/10 ring-2 ring-emerald-500/20 text-emerald-950 dark:text-emerald-100"
                    : "border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-950/30"
                }`}
              >
                <span className="flex items-center gap-2 text-sm font-bold mb-1">
                  <Radio className={`w-4 h-4 ${modoEnvio === "agora" ? "text-emerald-500 animate-pulse" : "text-zinc-400"}`} />
                  Enviar Agora
                </span>
                <span className="text-xs text-zinc-500 dark:text-zinc-400">O envio começa imediatamente em background</span>
              </button>

              {/* Agendar */}
              <button
                type="button"
                onClick={() => setModoEnvio("agendado")}
                className={`p-4 rounded-xl border text-left transition-all ${
                  modoEnvio === "agendado"
                    ? "border-blue-500 bg-blue-50/10 ring-2 ring-blue-500/20 text-blue-950 dark:text-blue-100"
                    : "border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-950/30"
                }`}
              >
                <span className="flex items-center gap-2 text-sm font-bold mb-1">
                  <Clock className={`w-4 h-4 ${modoEnvio === "agendado" ? "text-blue-500" : "text-zinc-400"}`} />
                  Agendar para depois
                </span>
                <span className="text-xs text-zinc-500 dark:text-zinc-400">Escolha data e hora para o disparo</span>
              </button>
            </div>

            {modoEnvio === "agendado" && (
              <div className="space-y-1.5 animate-in fade-in slide-in-from-top-2 duration-200">
                <Label htmlFor="data-agendamento" className="text-xs">Data e hora do envio</Label>
                <input
                  id="data-agendamento"
                  type="datetime-local"
                  value={dataAgendamento}
                  onChange={e => setDataAgendamento(e.target.value)}
                  min={toLocalInputValue(new Date())}
                  className="w-full h-10 px-3 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                />
                <p className="text-xs text-zinc-400">
                  O servidor processará a campanha automaticamente no horário selecionado.
                </p>
              </div>
            )}
          </Card>

          {/* Botão Enviar */}
          <div className="flex justify-end gap-3">
            <Button
              onClick={handleSubmit}
              disabled={sending || !mensagem.trim() || selectedIds.length === 0}
              className="bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-600 dark:hover:bg-emerald-700 text-white font-bold h-11 px-7 rounded-xl shadow-sm flex items-center gap-2 text-sm disabled:opacity-50"
            >
              {sending ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Processando...</>
              ) : modoEnvio === "agora" ? (
                <><Send className="w-4 h-4" /> Enviar para {selectedIds.length} cliente{selectedIds.length !== 1 ? "s" : ""}</>
              ) : (
                <><Clock className="w-4 h-4" /> Agendar Envio</>
              )}
            </Button>
          </div>
        </div>

        {/* ─── Coluna Direita: Clientes + Histórico ───────────────────────── */}
        <div className="space-y-5">

          {/* Clientes elegíveis */}
          <Card className="p-5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                <Users className="w-4 h-4 text-emerald-500" />
                Clientes elegíveis
              </h3>
              <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 px-2.5 py-0.5 rounded-full">
                {selectedIds.length} / {clientes.length}
              </span>
            </div>

            <div className="mb-2">
              <input
                type="text"
                value={filtroCliente}
                onChange={e => { setFiltroCliente(e.target.value); setClientPage(1); }}
                placeholder="Buscar cliente..."
                className="w-full h-8 px-2.5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>

            <div className="flex gap-2 mb-3">
              <Button
                variant="outline"
                size="xs"
                onClick={() => setSelectedIds(clientes.map(c => c.id))}
                className="text-[10px] h-6 py-0.5 px-2 flex-1 hover:bg-emerald-50 hover:text-emerald-600 dark:hover:bg-emerald-950/20"
              >
                Marcar Todos
              </Button>
              <Button
                variant="outline"
                size="xs"
                onClick={() => setSelectedIds([])}
                className="text-[10px] h-6 py-0.5 px-2 flex-1 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/20"
              >
                Desmarcar Todos
              </Button>
            </div>

            {loadingClientes ? (
              <div className="py-6 flex items-center justify-center">
                <Loader2 className="w-5 h-5 animate-spin text-emerald-500" />
              </div>
            ) : clientes.length === 0 ? (
              <div className="py-6 text-center text-xs text-zinc-400 flex flex-col items-center gap-2">
                <AlertCircle className="w-6 h-6" />
                <span>Nenhum cliente com telefone</span>
              </div>
            ) : (
              <>
                {filtroCliente && (
                  <div className="mb-2 text-[11px] text-zinc-400">
                    {clientesFiltrados.length} resultado{clientesFiltrados.length !== 1 ? "s" : ""} encontrado{clientesFiltrados.length !== 1 ? "s" : ""}
                  </div>
                )}
                <div className="max-h-96 overflow-y-auto divide-y divide-zinc-100 dark:divide-zinc-800 rounded-xl border border-zinc-100 dark:border-zinc-800">
                  {clientesPaginados.map(c => {
                    const isSelected = selectedIds.includes(c.id);
                    return (
                      <div
                        key={c.id}
                        onClick={() => toggleClientSelection(c.id)}
                        className="flex items-center gap-2.5 px-3 py-2 cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-950/30 transition-colors select-none"
                      >
                        <div className="w-7 h-7 rounded-full bg-emerald-100 dark:bg-emerald-950/50 flex items-center justify-center shrink-0">
                          <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                            {c.nome.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-xs font-medium text-zinc-900 dark:text-zinc-100 truncate">{c.nome}</div>
                          <div className="text-[10px] text-zinc-400">{c.telefone}</div>
                        </div>
                        {isSelected ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                        ) : (
                          <div className="w-4 h-4 rounded-full border border-zinc-300 dark:border-zinc-700 shrink-0 transition-all hover:border-zinc-400" />
                        )}
                      </div>
                    );
                  })}
                  {clientesFiltrados.length === 0 && filtroCliente && (
                    <div className="px-3 py-4 text-center text-xs text-zinc-400">
                      Nenhum cliente encontrado para "{filtroCliente}"
                    </div>
                  )}
                </div>
                {totalClientPages > 1 && (
                  <div className="flex items-center justify-between mt-2.5 px-1">
                    <span className="text-[10px] text-zinc-400">
                      {(clientPage - 1) * CLIENTS_PER_PAGE + 1}–{Math.min(clientPage * CLIENTS_PER_PAGE, clientesFiltrados.length)} de {clientesFiltrados.length}
                    </span>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setClientPage(p => Math.max(1, p - 1))}
                        disabled={clientPage === 1}
                        className="p-1 rounded-md text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 dark:hover:bg-zinc-800 disabled:opacity-30 disabled:cursor-not-allowed transition"
                      >
                        <ChevronLeft className="w-3.5 h-3.5" />
                      </button>
                      <span className="text-[10px] font-semibold text-zinc-600 dark:text-zinc-400 min-w-[3rem] text-center">
                        {clientPage} / {totalClientPages}
                      </span>
                      <button
                        onClick={() => setClientPage(p => Math.min(totalClientPages, p + 1))}
                        disabled={clientPage === totalClientPages}
                        className="p-1 rounded-md text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 dark:hover:bg-zinc-800 disabled:opacity-30 disabled:cursor-not-allowed transition"
                      >
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}

            <div className="mt-3 p-2.5 rounded-lg bg-blue-50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/30 flex items-start gap-2">
              <Info className="w-3.5 h-3.5 text-blue-500 mt-0.5 shrink-0" />
              <p className="text-[11px] text-blue-600 dark:text-blue-400 leading-relaxed">
                Apenas clientes com telefone cadastrado e não excluídos receberão a mensagem.
              </p>
            </div>
          </Card>

          {/* Histórico de campanhas */}
          <Card className="p-5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                <Clock className="w-4 h-4 text-zinc-400" />
                Campanhas Recentes
              </h3>
              <button
                onClick={loadCampanhas}
                className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition"
                title="Atualizar"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            </div>

            {loadingCampanhas ? (
              <div className="py-6 flex items-center justify-center">
                <Loader2 className="w-5 h-5 animate-spin text-emerald-500" />
              </div>
            ) : campanhas.length === 0 ? (
              <div className="py-8 text-center text-xs text-zinc-400 flex flex-col items-center gap-2">
                <MessageSquare className="w-8 h-8 opacity-40" />
                <span>Nenhuma campanha enviada ainda</span>
              </div>
            ) : (
              <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                {campanhas.map(c => (
                  <div
                    key={c.id}
                    className="p-3 rounded-xl border border-zinc-100 dark:border-zinc-800 hover:border-zinc-200 dark:hover:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-950/30 transition-all group"
                  >
                    <div className="flex items-start justify-between gap-2 mb-1.5">
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 truncate">{c.titulo}</p>
                        <p className="text-[10px] text-zinc-400 mt-0.5">{formatDateTimeBR(c.criado_em)}</p>
                      </div>
                      <StatusBadge status={c.status} />
                    </div>

                    {/* Barra de progresso */}
                    {c.total_clientes > 0 && (
                      <div className="mt-2 mb-2">
                        <div className="flex items-center justify-between text-[10px] text-zinc-400 mb-1">
                          <span>{c.enviados}/{c.total_clientes} enviados</span>
                          {c.falhas > 0 && <span className="text-red-500">{c.falhas} falhas</span>}
                        </div>
                        <div className="h-1.5 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-emerald-500 rounded-full transition-all"
                            style={{ width: `${Math.round((c.enviados / c.total_clientes) * 100)}%` }}
                          />
                        </div>
                      </div>
                    )}

                    <div className="flex items-center gap-1.5 mt-1">
                      <button
                        onClick={() => setCampanhaDetalhe(c)}
                        className="flex items-center gap-1 text-[11px] text-emerald-600 dark:text-emerald-400 hover:underline font-medium"
                      >
                        <Eye className="w-3 h-3" /> Ver detalhe
                      </button>
                      {c.status === "agendada" && (
                        <>
                          <span className="text-zinc-300 dark:text-zinc-700">·</span>
                          <button
                            onClick={() => handleCancelar(c)}
                            className="flex items-center gap-1 text-[11px] text-red-500 hover:underline font-medium"
                          >
                            <X className="w-3 h-3" /> Cancelar
                          </button>
                        </>
                      )}
                      {c.status === "agendada" && c.agendado_para && (
                        <span className="ml-auto text-[10px] text-blue-500 dark:text-blue-400 font-medium flex items-center gap-1">
                          <Clock className="w-3 h-3" /> {formatDateTimeBR(c.agendado_para)}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

      </div>
    </div>
  );
}
