import React, { useEffect, useState } from "react";
import { PageHeader } from "../components/Page";
import http from "../api";
import { useAuth } from "../auth";
import { formatAgendaDateTime } from "../lib/date";
import { Button } from "../components/ui/button";
import { Card } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { 
  Search, RotateCcw, Eye, Calendar, MessageSquare, AlertCircle, X, Check, XCircle, Info,
  ChevronLeft, ChevronRight
} from "lucide-react";
import { toast } from "sonner";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
} from "../components/ui/pagination";

const getTodayDateString = () => {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export default function AgendaWhatsAppHistorico() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const hasConfigPerm = isAdmin || user?.perfil?.permissoes?.["configuracoes.whatsapp"] === true || !!(user?.perfil?.permissoes?.menus?.configuracoes);

  const todayStr = getTodayDateString();
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [resendingId, setResendingId] = useState(null);
  const [whatsappAtivo, setWhatsappAtivo] = useState(true);
  const [checkingActive, setCheckingActive] = useState(true);

  // Pagination states
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);

  // Filters
  const [cliente, setCliente] = useState("");
  const [numero, setNumero] = useState("");
  const [status, setStatus] = useState("");
  const [startDate, setStartDate] = useState(todayStr);
  const [endDate, setEndDate] = useState(todayStr);

  // Modal details
  const [selectedLog, setSelectedLog] = useState(null);

  const checkActiveStatus = async () => {
    try {
      const response = await http.get("/configuracoes/whatsapp");
      if (response.data) {
        setWhatsappAtivo(response.data.ativo === 1);
      }
    } catch (e) {
      console.error("Erro ao verificar status do WhatsApp:", e);
    } finally {
      setCheckingActive(false);
    }
  };

  const fetchHistory = async (pageNumber = 1, currentStartDate = startDate, currentEndDate = endDate) => {
    setLoading(true);
    try {
      const params = {
        page: pageNumber,
        limit: 50
      };
      if (cliente) params.cliente = cliente;
      if (numero) params.numero = numero;
      if (status) params.status = status;
      if (currentStartDate) params.startDate = currentStartDate;
      if (currentEndDate) params.endDate = currentEndDate;

      const response = await http.get("/configuracoes/whatsapp/historico", { params });
      if (response.data) {
        setHistory(response.data.data || []);
        setPage(response.data.page || 1);
        setTotalPages(response.data.pages || 1);
        setTotalRecords(response.data.total || 0);
      } else {
        setHistory([]);
        setPage(1);
        setTotalPages(1);
        setTotalRecords(0);
      }
    } catch (e) {
      toast.error("Erro ao carregar histórico de mensagens.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkActiveStatus();
  }, []);

  useEffect(() => {
    if (!checkingActive && whatsappAtivo) {
      fetchHistory(1);
    }
  }, [checkingActive, whatsappAtivo]);

  const handleSearch = (e) => {
    e.preventDefault();
    fetchHistory(1);
  };

  const handleClearFilters = () => {
    setCliente("");
    setNumero("");
    setStatus("");
    const today = getTodayDateString();
    setStartDate(today);
    setEndDate(today);
    // Execute search with cleared filters
    setTimeout(() => {
      fetchHistory(1, today, today);
    }, 0);
  };

  const handleResend = async (id) => {
    setResendingId(id);
    try {
      await http.post(`/configuracoes/whatsapp/reenviar/${id}`);
      toast.success("Mensagem reenviada com sucesso!");
      fetchHistory(page);
    } catch (e) {
      toast.error(e.response?.data?.detail || "Erro ao reenviar lembrete.");
    } finally {
      setResendingId(null);
    }
  };

  const formatDateTime = (dateStr) => {
    return formatAgendaDateTime(dateStr);
  };

  /**
   * Retorna true se o lembrete deve mostrar o botão Reenviar:
   * — Falhou (após 5 tentativas automáticas OU reenvio manual com falha)
   * — Pendente com ao menos 1 tentativa realizada (retry em andamento, mas já liberado)
   */
  const canResend = (log) => {
    if (log.status === "Falhou") return true;
    if (log.status === "Pendente" && (log.tentativas || 0) > 0) return true;
    return false;
  };

  const getStatusBadge = (statusVal, tentativas = 0) => {
    const s = String(statusVal);
    if (s.startsWith("Pendente")) {
      if (tentativas > 0) {
        // Pendente com falha anterior: retry automático em andamento
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-bold rounded-full bg-orange-50 text-orange-700 border border-orange-200 dark:bg-orange-950/20 dark:text-orange-400 dark:border-orange-900/50">
            <RotateCcw className="w-3 h-3 animate-spin" />
            Retry {tentativas}/5
          </span>
        );
      }
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-bold rounded-full bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/20 dark:text-amber-400 dark:border-amber-900/50">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
          Pendente
        </span>
      );
    }
    if (s.startsWith("Enviado")) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-bold rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-900/50">
          <Check className="w-3.5 h-3.5" />
          Enviado
        </span>
      );
    }
    if (s.startsWith("Falhou")) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-bold rounded-full bg-red-50 text-red-700 border border-red-200 dark:bg-red-950/20 dark:text-red-400 dark:border-red-900/50">
          <XCircle className="w-3.5 h-3.5" />
          Falhou
        </span>
      );
    }
    if (s.startsWith("Cancelado")) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-bold rounded-full bg-zinc-100 text-zinc-600 border border-zinc-250 dark:bg-zinc-900 dark:text-zinc-400 dark:border-zinc-800">
          <X className="w-3.5 h-3.5" />
          Cancelado
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-bold rounded-full bg-zinc-100 text-zinc-700 dark:bg-zinc-900 dark:text-zinc-300">
        {s}
      </span>
    );
  };

  const getCleanReminderType = (type) => {
    if (!type) return "-";
    if (type.includes("agradecimento")) return "Agradecimento";
    if (type.includes("24h")) return "24 Horas";
    if (type.includes("2h")) return "2 Horas";
    if (type.includes("1h")) return "1 Hora";
    return type;
  };

  if (checkingActive) {
    return <div className="p-8 text-zinc-400 text-center font-semibold animate-pulse">Verificando status do serviço...</div>;
  }

  if (!whatsappAtivo) {
    return (
      <div className="p-6 lg:p-8 min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-800 dark:text-zinc-200 flex items-center justify-center">
        <Card className="p-8 max-w-md w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-lg text-center space-y-6">
          <div className="w-16 h-16 bg-amber-500/10 text-amber-500 rounded-full flex items-center justify-center mx-auto">
            <AlertCircle className="w-8 h-8" />
          </div>
          <div className="space-y-2">
            <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">Lembretes WhatsApp Desativados</h3>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed">
              O histórico de envios não está disponível porque a rotina de lembretes automáticos do WhatsApp está desativada nas configurações do sistema.
            </p>
          </div>
          {hasConfigPerm ? (
            <Button 
              onClick={() => window.location.href = '/configuracoes/whatsapp'}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
            >
              Ativar nas Configurações
            </Button>
          ) : (
            <p className="text-xs text-zinc-500 dark:text-zinc-400 italic">
              Entre em contato com um administrador para ativar o serviço.
            </p>
          )}
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 fade-in min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-800 dark:text-zinc-200">
      
      <PageHeader 
        overline="Agenda" 
        title="Histórico de Mensagens WhatsApp" 
      />

      {/* Filters form */}
      <Card className="p-6 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-sm mt-6 mb-6">
        <form onSubmit={handleSearch} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            
            {/* Service Number input */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300">Nº do Serviço</label>
              <div className="relative">
                <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-3" />
                <Input 
                  placeholder="Número..." 
                  value={numero}
                  onChange={(e) => setNumero(e.target.value)}
                  className="pl-9 h-10 bg-zinc-50 border-zinc-200 dark:bg-zinc-950 dark:border-zinc-800"
                />
              </div>
            </div>

            {/* Client input */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300">Cliente</label>
              <div className="relative">
                <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-3" />
                <Input 
                  placeholder="Nome do cliente..." 
                  value={cliente}
                  onChange={(e) => setCliente(e.target.value)}
                  className="pl-9 h-10 bg-zinc-50 border-zinc-200 dark:bg-zinc-950 dark:border-zinc-800"
                />
              </div>
            </div>

            {/* Status select */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300">Status</label>
              <select 
                value={status} 
                onChange={(e) => setStatus(e.target.value)}
                className="w-full h-10 px-3 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500"
              >
                <option value="">Todos os status</option>
                <option value="Pendente">Pendente</option>
                <option value="Enviado">Enviado</option>
                <option value="Falhou">Falhou</option>
                <option value="Cancelado">Cancelado</option>
              </select>
            </div>

            {/* Start Date */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300">Data Programada (De)</label>
              <div className="relative">
                <input 
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full h-10 px-3 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>
            </div>

            {/* End Date */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300">Data Programada (Até)</label>
              <div className="relative">
                <input 
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full h-10 px-3 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>
            </div>

          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-zinc-200 dark:border-zinc-800">
            <Button 
              type="button" 
              variant="outline" 
              onClick={handleClearFilters}
              className="h-9 text-xs rounded-lg px-4"
            >
              Limpar Filtros
            </Button>
            <Button 
              type="submit" 
              className="bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-600 dark:hover:bg-emerald-700 text-white h-9 text-xs rounded-lg font-bold flex items-center gap-1"
            >
              <Search className="w-3.5 h-3.5" />
              <span>Filtrar</span>
            </Button>
          </div>
        </form>
      </Card>

      {/* History table */}
      <Card className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-zinc-400 text-center font-semibold animate-pulse">Carregando histórico...</div>
        ) : history.length === 0 ? (
          <div className="p-12 text-zinc-400 dark:text-zinc-500 text-center font-semibold">
            Nenhum registro de lembrete WhatsApp encontrado.
          </div>
        ) : (
          <>
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="bg-zinc-50 dark:bg-zinc-950 text-zinc-500 dark:text-zinc-400 border-b border-zinc-200 dark:border-zinc-800 text-xs font-bold uppercase tracking-wider">
                    <th className="p-4 pl-6 w-24">Nº Serviço</th>
                    <th className="p-4">Cliente</th>
                    <th className="p-4">Tipo</th>
                    <th className="p-4">Data Agendamento</th>
                    <th className="p-4">Data Programada</th>
                    <th className="p-4">Data Envio</th>
                    <th className="p-4">Status</th>
                    <th className="p-4 pr-6 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                  {history.map((log) => (
                    <tr key={log.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-950/20 transition-colors">
                      <td className="p-4 pl-6 font-mono text-xs font-bold text-zinc-500 dark:text-zinc-400">
                        {log.agendamento_numero ? `#${String(log.agendamento_numero).padStart(6, '0')}` : '—'}
                      </td>
                      <td className="p-4 font-semibold text-zinc-900 dark:text-zinc-100">
                        <div>{log.cliente_nome}</div>
                        {log.cliente_telefone && (
                          <div className="text-xs text-zinc-500 dark:text-zinc-400 font-normal mt-0.5">{log.cliente_telefone}</div>
                        )}
                      </td>
                      <td className="p-4">
                        <span className="font-semibold text-zinc-700 dark:text-zinc-300">
                          {getCleanReminderType(log.tipo_lembrete)}
                        </span>
                      </td>
                      <td className="p-4 text-zinc-600 dark:text-zinc-300">
                        {formatDateTime(log.agendamento_data_hora)}
                      </td>
                      <td className="p-4 text-zinc-600 dark:text-zinc-300">
                        {formatDateTime(log.data_programada)}
                      </td>
                      <td className="p-4 text-zinc-600 dark:text-zinc-300">
                        {formatDateTime(log.data_envio)}
                      </td>
                      <td className="p-4">
                        {getStatusBadge(log.status, log.tentativas)}
                      </td>
                      <td className="p-4 pr-6 text-right">
                        <div className="flex items-center justify-end gap-1">
                          
                          {/* Action: Details */}
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setSelectedLog(log)}
                            title="Visualizar Mensagem/Detalhes"
                            className="h-8 w-8 text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
                          >
                            <Eye className="w-4 h-4" />
                          </Button>

                          {/* Action: Resend — disponível desde a 1ª falha (Falhou ou Pendente c/ tentativas > 0) */}
                          {canResend(log) && (
                            <Button
                              variant="ghost"
                              size="icon"
                              disabled={resendingId === log.id}
                              onClick={() => handleResend(log.id)}
                              title="Reenviar Mensagem"
                              className="h-8 w-8 text-amber-600 hover:text-amber-750 hover:bg-amber-50 dark:text-amber-500 dark:hover:text-amber-400 dark:hover:bg-amber-950/20"
                            >
                              <RotateCcw className={`w-4 h-4 ${resendingId === log.id ? 'animate-spin' : ''}`} />
                            </Button>
                          )}
                          
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile view: list of cards */}
            <div className="md:hidden divide-y divide-zinc-200 dark:divide-zinc-800">
              {history.map((log) => (
                <div key={log.id} className="p-4 space-y-3 hover:bg-zinc-50/50 dark:hover:bg-zinc-950/20">
                  <div className="flex justify-between items-center">
                    <span className="font-mono text-xs font-bold text-zinc-500 dark:text-zinc-400">
                      {log.agendamento_numero ? `#${String(log.agendamento_numero).padStart(6, '0')}` : '—'}
                    </span>
                    {getStatusBadge(log.status, log.tentativas)}
                  </div>

                  <div className="space-y-1">
                    <div className="font-semibold text-zinc-900 dark:text-zinc-100 text-sm">
                      {log.cliente_nome}
                    </div>
                    {log.cliente_telefone && (
                      <div className="text-xs text-zinc-500 dark:text-zinc-400 font-normal">
                        {log.cliente_telefone}
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-y-2 gap-x-4 text-xs">
                    <div>
                      <span className="text-zinc-400 dark:text-zinc-500 block">Tipo</span>
                      <span className="font-semibold text-zinc-700 dark:text-zinc-300">
                        {getCleanReminderType(log.tipo_lembrete)}
                      </span>
                    </div>
                    <div>
                      <span className="text-zinc-400 dark:text-zinc-500 block">Agendamento</span>
                      <span className="text-zinc-600 dark:text-zinc-350">
                        {formatDateTime(log.agendamento_data_hora)}
                      </span>
                    </div>
                    <div>
                      <span className="text-zinc-400 dark:text-zinc-500 block">Programado</span>
                      <span className="text-zinc-600 dark:text-zinc-350">
                        {formatDateTime(log.data_programada)}
                      </span>
                    </div>
                    <div>
                      <span className="text-zinc-400 dark:text-zinc-500 block">Enviado</span>
                      <span className="text-zinc-600 dark:text-zinc-350">
                        {formatDateTime(log.data_envio) || "—"}
                      </span>
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-2 border-t border-zinc-100 dark:border-zinc-800">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedLog(log)}
                      className="h-8 px-2.5 text-xs text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200 flex items-center gap-1"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Detalhes</span>
                    </Button>

                    {canResend(log) && (
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={resendingId === log.id}
                        onClick={() => handleResend(log.id)}
                        className="h-8 px-2.5 text-xs text-amber-600 hover:text-amber-750 hover:bg-amber-50 dark:text-amber-500 dark:hover:text-amber-400 dark:hover:bg-amber-950/20 flex items-center gap-1"
                      >
                        <RotateCcw className={`w-3.5 h-3.5 ${resendingId === log.id ? 'animate-spin' : ''}`} />
                        <span>Reenviar</span>
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex flex-col sm:flex-row justify-between items-center gap-4 p-4 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-950/20">
                <div className="text-xs text-zinc-500 dark:text-zinc-400">
                  Mostrando <strong>{(page - 1) * 50 + 1}</strong> a <strong>{Math.min(page * 50, totalRecords)}</strong> de <strong>{totalRecords}</strong> registros
                </div>
                <Pagination className="mx-0 w-auto">
                  <PaginationContent>
                    <PaginationItem>
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={page === 1}
                        onClick={() => fetchHistory(page - 1)}
                        className="flex items-center gap-1 text-xs"
                      >
                        <ChevronLeft className="h-4 w-4" />
                        <span>Anterior</span>
                      </Button>
                    </PaginationItem>

                    {Array.from({ length: totalPages }, (_, idx) => idx + 1).map((p) => {
                      if (p === 1 || p === totalPages || (p >= page - 2 && p <= page + 2)) {
                        return (
                          <PaginationItem key={p} className="hidden sm:block">
                            <Button
                              variant={p === page ? "outline" : "ghost"}
                              size="sm"
                              onClick={() => fetchHistory(p)}
                              className={`h-8 w-8 text-xs p-0 ${p === page ? 'font-bold border-zinc-300 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-800' : ''}`}
                            >
                              {p}
                            </Button>
                          </PaginationItem>
                        );
                      } else if (p === page - 3 || p === page + 3) {
                        return (
                          <PaginationItem key={p} className="hidden sm:block">
                            <span className="px-2 text-zinc-400 text-xs">...</span>
                          </PaginationItem>
                        );
                      }
                      return null;
                    })}

                    <PaginationItem>
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={page === totalPages}
                        onClick={() => fetchHistory(page + 1)}
                        className="flex items-center gap-1 text-xs"
                      >
                        <span>Próximo</span>
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </PaginationItem>
                  </PaginationContent>
                </Pagination>
              </div>
            )}
          </>
        )}
      </Card>

      {/* Modal: View Details */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs fade-in">
          <Card className="w-full max-w-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-xl overflow-hidden max-h-[90vh] flex flex-col scale-in">
            
            {/* Modal Header */}
            <div className="p-5 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-emerald-500" />
                <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                  Detalhes da Mensagem
                </h3>
              </div>
              <Button 
                variant="ghost" 
                size="icon"
                onClick={() => setSelectedLog(null)}
                className="h-8 w-8 text-zinc-400 hover:text-zinc-600 dark:text-zinc-500 dark:hover:text-zinc-300"
              >
                <X className="w-4.5 h-4.5" />
              </Button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-5 flex-1">
              
              {/* Message metadata */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs bg-zinc-50 dark:bg-zinc-950 p-4 rounded-xl border border-zinc-200 dark:border-zinc-800">
                <div>
                  <span className="text-zinc-500 block">Nº do Serviço:</span>
                  <span className="font-bold font-mono text-zinc-800 dark:text-zinc-200">
                    {selectedLog.agendamento_numero ? `#${String(selectedLog.agendamento_numero).padStart(6, '0')}` : '—'}
                  </span>
                </div>
                <div>
                  <span className="text-zinc-500 block mb-1">Status:</span>
                  {getStatusBadge(selectedLog.status, selectedLog.tentativas)}
                </div>
                <div>
                  <span className="text-zinc-500 block">Cliente:</span>
                  <span className="font-bold text-zinc-800 dark:text-zinc-200">{selectedLog.cliente_nome}</span>
                </div>
                <div>
                  <span className="text-zinc-500 block">Telefone:</span>
                  <span className="font-bold text-zinc-800 dark:text-zinc-200">{selectedLog.cliente_telefone || "Não informado"}</span>
                </div>
                <div>
                  <span className="text-zinc-500 block">Tipo do Lembrete:</span>
                  <span className="font-bold text-zinc-800 dark:text-zinc-200">{getCleanReminderType(selectedLog.tipo_lembrete)}</span>
                </div>
                <div>
                  <span className="text-zinc-500 block">Horário Programado:</span>
                  <span className="font-bold text-zinc-800 dark:text-zinc-200">{formatDateTime(selectedLog.data_programada)}</span>
                </div>
              </div>

              {/* Message Text Block */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-zinc-500 dark:text-zinc-400">Conteúdo da Mensagem</label>
                {selectedLog.mensagem ? (
                  <div className="p-4 rounded-xl bg-emerald-50/50 dark:bg-emerald-950/10 border border-emerald-100 dark:border-emerald-900/30 text-sm whitespace-pre-wrap font-mono leading-relaxed text-zinc-800 dark:text-zinc-200">
                    {selectedLog.mensagem}
                  </div>
                ) : (
                  <div className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-xs italic text-zinc-400 text-center">
                    Mensagem ainda não enviada. O texto será gerado no momento do disparo.
                  </div>
                )}
              </div>

              {/* Error Block — exibe erro para Falhou ou Pendente com tentativas (retry em andamento) */}
              {(selectedLog.status === "Falhou" || (selectedLog.status === "Pendente" && (selectedLog.tentativas || 0) > 0)) && selectedLog.erro && (
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-red-500 flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5" />
                    <span>{selectedLog.status === "Pendente" ? "Erro da Última Tentativa" : "Log de Erro da Falha"}</span>
                  </label>
                  <div className="p-4 rounded-xl bg-red-50/50 dark:bg-red-950/10 border border-red-100 dark:border-red-900/30 text-xs font-mono text-red-700 dark:text-red-400 whitespace-pre-wrap leading-relaxed">
                    {selectedLog.erro}
                  </div>
                </div>
              )}

              {/* Attempts block */}
              <div className="flex justify-between items-center text-xs text-zinc-500 pt-2">
                <span>Número de Tentativas: <strong>{selectedLog.tentativas}</strong></span>
                {selectedLog.data_envio && (
                  <span>Enviado em: <strong>{formatDateTime(selectedLog.data_envio)}</strong></span>
                )}
              </div>

            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-zinc-50 dark:bg-zinc-950 border-t border-zinc-200 dark:border-zinc-800 flex justify-end gap-2">
              <Button 
                onClick={() => setSelectedLog(null)}
                className="h-9 text-xs rounded-lg px-4"
              >
                Fechar
              </Button>
              {canResend(selectedLog) && (
                <Button 
                  onClick={() => {
                    handleResend(selectedLog.id);
                    setSelectedLog(null);
                  }}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white h-9 text-xs rounded-lg font-bold flex items-center gap-1"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Reenviar
                </Button>
              )}
            </div>

          </Card>
        </div>
      )}

    </div>
  );
}
