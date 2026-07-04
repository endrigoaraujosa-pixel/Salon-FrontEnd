import React, { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import http from "../api";
import { useAuth } from "../auth";
import { PageHeader } from "../components/Page";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Card } from "../components/ui/card";
import { ArrowLeft, Search, Calendar, RefreshCw, TrendingUp, TrendingDown, DollarSign, Ban, HelpCircle, User, ChevronLeft, ChevronRight } from "lucide-react";
import SearchableSelect from "../components/SearchableSelect";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "../components/ui/dialog";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
} from "../components/ui/pagination";

export default function ClienteCreditoExtrato() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [loading, setLoading] = useState(true);
  const [submittingEstorno, setSubmittingEstorno] = useState({});
  const [movements, setMovements] = useState([]);
  const [clients, setClients] = useState([]);
  
  // Custom Confirmation Dialog for Estorno
  const [confirmEstornoOpen, setConfirmEstornoOpen] = useState(false);
  const [selectedMovForEstorno, setSelectedMovForEstorno] = useState(null);

  // State for balance details modal
  const [saldoDetailsOpen, setSaldoDetailsOpen] = useState(false);
  const [saldoSearchTerm, setSaldoSearchTerm] = useState("");
  
  // Pagination states
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);
  
  // Filters
  const [selectedClienteId, setSelectedClienteId] = useState(searchParams.get("clienteId") || "");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  
  // Statistics/Summary
  const [stats, setStats] = useState({
    saldoAtual: 0,
    totalCreditos: 0,
    totalDebitos: 0
  });

  const podeEstornar = user?.role === "admin" || user?.perfil?.permissoes?.["clientes.credito.gerenciar"] === true || !!user?.perfil?.permissoes?.acoes?.["credito.estornar"];

  // Fetch clients to populate the filter dropdown
  const loadClients = async () => {
    try {
      const res = await http.get("/clientes");
      setClients(res.data || []);
    } catch (e) {
      console.error("Erro ao carregar clientes", e);
    }
  };

  const loadExtrato = async (pageNum = 1) => {
    setLoading(true);
    try {
      const params = {
        page: pageNum,
        limit: 50
      };
      if (startDate) params.data_inicio = startDate;
      if (endDate) params.data_fim = endDate;
      
      const endpoint = selectedClienteId 
        ? `/clientes/${selectedClienteId}/credito/extrato` 
        : `/clientes/credito/extrato`; // fallback endpoint for global extrato
        
      const res = await http.get(endpoint, { params });
      const { data = [], page: resPage = 1, pages = 1, total = 0, totalCreditos = 0, totalDebitos = 0 } = res.data || {};
      
      setMovements(data);
      setPage(resPage);
      setTotalPages(pages);
      setTotalRecords(total);
      
      // Find current balance if client is selected
      let balance = 0;
      if (selectedClienteId) {
        const clientRes = await http.get(`/clientes/${selectedClienteId}`);
        balance = Number(clientRes.data?.saldo_credito || 0);
      } else {
        // Sum of un-reversed movements as helper
        balance = totalCreditos - totalDebitos;
      }

      setStats({
        saldoAtual: balance,
        totalCreditos: totalCreditos,
        totalDebitos: totalDebitos
      });

    } catch (e) {
      toast.error(e.response?.data?.detail || "Erro ao carregar extrato de créditos");
    } finally {
      setLoading(false);
    }
  };

  const handlePageChange = (newPage) => {
    loadExtrato(newPage);
  };

  useEffect(() => {
    loadClients();
  }, []);

  useEffect(() => {
    loadExtrato(1);
  }, [selectedClienteId, startDate, endDate]);

  const handleEstornoClick = (mov) => {
    setSelectedMovForEstorno(mov);
    setConfirmEstornoOpen(true);
  };

  const executeEstorno = async () => {
    if (!selectedMovForEstorno) return;
    const mov = selectedMovForEstorno;
    setConfirmEstornoOpen(false);
    setSubmittingEstorno(prev => ({ ...prev, [mov.id]: true }));
    try {
      await http.post(`/clientes/${mov.cliente_id}/credito/estornar/${mov.id}`);
      toast.success("Movimentação estornada com sucesso!");
      loadExtrato(page);
    } catch (e) {
      toast.error(e.response?.data?.detail || "Erro ao estornar movimentação");
    } finally {
      setSubmittingEstorno(prev => ({ ...prev, [mov.id]: false }));
      setSelectedMovForEstorno(null);
    }
  };

  const getTipoLabel = (tipo) => {
    switch (tipo) {
      case "CREDITO_MANUAL": return "Carga Manual de Crédito";
      case "DEBITO_MANUAL": return "Débito Manual de Crédito";
      case "CREDITO_GERADO_VENDA": return "Excedente de Venda";
      case "CREDITO_UTILIZADO_VENDA": return "Pagamento com Crédito";
      case "ESTORNO": return "Estorno / Reversão";
      case "AJUSTE": return "Ajuste de Saldo";
      default: return tipo || "Outro";
    }
  };

  return (
    <div className="p-6 lg:p-8 fade-in min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-800 dark:text-zinc-200">
      
      {/* Back Button */}
      <Button 
        variant="ghost" 
        onClick={() => navigate("/clientes")} 
        className="mb-4 text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
      >
        <ArrowLeft className="w-4 h-4 mr-1" /> Voltar para Clientes
      </Button>

      <PageHeader 
        overline="Crédito de Clientes" 
        title="Extrato de Movimentações" 
      />

      {/* Filters Card */}
      <Card className="p-5 mt-6 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-xs">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          
          <div className="space-y-1.5">
            <Label className="text-xs font-bold uppercase tracking-wider text-zinc-500">Filtrar por Cliente</Label>
            <SearchableSelect
              placeholder="-- Todos os Clientes --"
              searchPlaceholder="Pesquisar cliente..."
              options={[
                { value: "", label: "-- Todos os Clientes --" },
                ...clients.map(c => ({
                  value: c.id,
                  label: `${c.nome}${c.telefone ? ` (${c.telefone})` : ""}`
                }))
              ]}
              value={selectedClienteId}
              onValueChange={setSelectedClienteId}
              className="w-full h-11 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg text-zinc-800 dark:text-zinc-200"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-bold uppercase tracking-wider text-zinc-500">Data Inicial</Label>
            <div className="relative">
              <Calendar className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-450" />
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="pl-10 h-11 bg-zinc-50 dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 rounded-lg"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-bold uppercase tracking-wider text-zinc-500">Data Final</Label>
            <div className="relative">
              <Calendar className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-450" />
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="pl-10 h-11 bg-zinc-50 dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 rounded-lg"
              />
            </div>
          </div>

        </div>
      </Card>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6">
        
        <Card 
          onClick={() => {
            if (!selectedClienteId) {
              setSaldoSearchTerm("");
              setSaldoDetailsOpen(true);
            }
          }}
          className={`p-5 bg-gradient-to-br from-emerald-50 to-white dark:from-emerald-950/15 dark:to-zinc-900 border border-emerald-100 dark:border-emerald-900/40 rounded-xl shadow-xs ${
            !selectedClienteId ? "cursor-pointer hover:shadow-md hover:border-emerald-200 dark:hover:border-emerald-800 transition-all duration-200" : ""
          }`}
        >
          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs font-semibold text-emerald-800 dark:text-emerald-455 uppercase tracking-wider flex items-center gap-1.5">
                Saldo Atual 
                {!selectedClienteId && (
                  <span className="text-[10px] text-emerald-600/80 dark:text-emerald-400/80 normal-case font-normal">
                    (clique para ver detalhes)
                  </span>
                )}
              </span>
              <h2 className="text-2xl font-extrabold text-emerald-700 dark:text-emerald-350 mt-1 leading-none">
                R$ {stats.saldoAtual.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
              </h2>
            </div>
            <div className="w-10 h-10 rounded-full bg-emerald-500/10 dark:bg-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
        </Card>

        <Card className="p-5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-xs">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Total Entradas (Período)</span>
              <h2 className="text-2xl font-extrabold text-[#84A59D] mt-1 leading-none">
                R$ {stats.totalCreditos.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
              </h2>
            </div>
            <div className="w-10 h-10 rounded-full bg-[#84A59D]/10 flex items-center justify-center text-[#84A59D]">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
        </Card>

        <Card className="p-5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-xs">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Total Saídas (Período)</span>
              <h2 className="text-2xl font-extrabold text-rose-600 dark:text-rose-400 mt-1 leading-none">
                R$ {stats.totalDebitos.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
              </h2>
            </div>
            <div className="w-10 h-10 rounded-full bg-rose-500/10 flex items-center justify-center text-rose-600 dark:text-rose-450">
              <TrendingDown className="w-5 h-5" />
            </div>
          </div>
        </Card>

      </div>

      {/* Movements Table */}
      <Card className="mt-6 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden shadow-xs">
        {loading ? (
          <div className="p-12 text-center text-zinc-400 font-semibold flex items-center justify-center gap-2">
            <RefreshCw className="w-4 h-4 animate-spin text-[#84A59D]" />
            Carregando extrato...
          </div>
        ) : movements.length === 0 ? (
          <div className="p-12 text-center text-zinc-450 dark:text-zinc-500 font-medium">
            Nenhuma movimentação de crédito registrada para os filtros selecionados.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[800px]">
              <thead className="bg-zinc-50 dark:bg-zinc-900 text-xs uppercase tracking-wider text-zinc-500 dark:text-zinc-400 border-b border-zinc-200 dark:border-zinc-800">
                <tr>
                  <th className="px-4 py-3.5 text-left font-semibold">Data / Hora</th>
                  {!selectedClienteId && <th className="px-4 py-3.5 text-left font-semibold">Cliente</th>}
                  <th className="px-4 py-3.5 text-left font-semibold">Operação</th>
                  <th className="px-4 py-3.5 text-left font-semibold">Valor</th>
                  <th className="px-4 py-3.5 text-left font-semibold">Saldo Posterior</th>
                  <th className="px-4 py-3.5 text-left font-semibold">Origem / Referência</th>
                  <th className="px-4 py-3.5 text-left font-semibold">Operador</th>
                  <th className="px-4 py-3.5 text-left font-semibold">Observações</th>
                  <th className="px-4 py-3.5"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-150 dark:divide-zinc-850 text-zinc-700 dark:text-zinc-350">
                {movements.map((mov) => {
                  const isCredit = mov.tipo_operacao === "C";
                  return (
                    <tr 
                      key={mov.id} 
                      className={`hover:bg-zinc-50/50 dark:hover:bg-zinc-900/50 transition-colors ${mov.estornado ? "opacity-50 line-through bg-zinc-100/30 dark:bg-zinc-900/20" : ""}`}
                    >
                      <td className="px-4 py-3.5 whitespace-nowrap text-xs font-mono">
                        {new Date(mov.criado_em || mov.createdAt).toLocaleString("pt-BR")}
                      </td>
                      {!selectedClienteId && (
                        <td className="px-4 py-3.5 font-semibold text-zinc-900 dark:text-zinc-100">
                          {mov.cliente_nome || mov.Cliente?.nome || `ID: ${mov.cliente_id?.slice(0, 8)}`}
                        </td>
                      )}
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <span className="font-bold text-[13px] block">{getTipoLabel(mov.tipo)}</span>
                        {mov.estornado && (
                          <span className="text-[10px] text-zinc-400 font-medium flex items-center gap-0.5 mt-0.5 uppercase tracking-wider">
                            <Ban className="w-3 h-3 text-rose-500" /> Estornado
                          </span>
                        )}
                        {mov.movimentacao_original_id && (
                          <span className="text-[9px] text-zinc-400 block mt-0.5 font-mono">
                            Ref: #{mov.movimentacao_original_id.slice(0, 8)}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <span className={`font-extrabold text-[14px] ${mov.estornado ? "text-zinc-400" : isCredit ? "text-emerald-600 dark:text-emerald-450" : "text-rose-600 dark:text-rose-450"}`}>
                          {isCredit ? "+" : "-"} R$ {Number(mov.valor || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 whitespace-nowrap font-semibold">
                        R$ {Number(mov.saldo_posterior || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-4 py-3.5 text-xs font-medium max-w-[160px]">
                        {mov.origem_referencia ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#EAF0EE] dark:bg-[#1E2D2A] text-[#3A4F4A] dark:text-[#84A59D] font-mono font-bold text-[11px]">
                            {mov.origem_referencia}
                          </span>
                        ) : (
                          <span className="truncate">{mov.origem || "Manual"}</span>
                        )}
                      </td>
                      <td className="px-4 py-3.5 text-xs">
                        <div className="flex items-center gap-1">
                          <User className="w-3.5 h-3.5 text-zinc-400" />
                          <span>{mov.usuario_nome || "Sistema"}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-xs max-w-[180px] truncate" title={mov.observacao}>
                        {mov.observacao || "-"}
                      </td>
                      <td className="px-4 py-3.5 whitespace-nowrap text-right">
                        {!mov.estornado && mov.tipo !== "ESTORNO" && podeEstornar && (
                          mov.origem_pagamento ? (
                            <span 
                              className="text-[10px] text-zinc-400 dark:text-zinc-500 italic cursor-help" 
                              title="Para estornar esta movimentação, exclua o pagamento correspondente na tela de Pagamento."
                            >
                              Via pagamento
                            </span>
                          ) : (
                            <Button
                              size="sm"
                              variant="ghost"
                              disabled={submittingEstorno[mov.id]}
                              onClick={() => handleEstornoClick(mov)}
                              className="text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 text-xs font-semibold h-8 rounded-lg px-3"
                            >
                              {submittingEstorno[mov.id] ? "Estornando..." : "Estornar"}
                            </Button>
                          )
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        {/* Pagination Controls */}
        {!loading && totalPages > 1 && (
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4 p-4 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-950/20">
            <div className="text-xs text-zinc-500 dark:text-zinc-400">
              Mostrando <strong>{(page - 1) * 50 + 1}</strong> a <strong>{Math.min(page * 50, totalRecords)}</strong> de <strong>{totalRecords}</strong> registros
            </div>
            <Pagination className="mx-0 w-auto">
              <PaginationContent>
                <PaginationItem>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={page === 1}
                    onClick={() => handlePageChange(page - 1)}
                    className="flex items-center gap-1 text-xs"
                  >
                    <ChevronLeft className="h-4 w-4" />
                    <span>Anterior</span>
                  </Button>
                </PaginationItem>

                {Array.from({ length: totalPages }, (_, idx) => idx + 1).map((p) => {
                  if (p === 1 || p === totalPages || (p >= page - 2 && p <= page + 2)) {
                    return (
                      <PaginationItem key={p}>
                        <Button
                          type="button"
                          variant={p === page ? "outline" : "ghost"}
                          size="sm"
                          onClick={() => handlePageChange(p)}
                          className={`h-8 w-8 text-xs p-0 ${p === page ? 'font-bold border-zinc-300 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-800' : ''}`}
                        >
                          {p}
                        </Button>
                      </PaginationItem>
                    );
                  } else if (p === page - 3 || p === page + 3) {
                    return (
                      <PaginationItem key={p}>
                        <span className="px-2 text-zinc-400 text-xs">...</span>
                      </PaginationItem>
                    );
                  }
                  return null;
                })}

                <PaginationItem>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={page === totalPages}
                    onClick={() => handlePageChange(page + 1)}
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
      </Card>
      {/* Modal de Confirmação de Estorno */}
      <Dialog open={confirmEstornoOpen} onOpenChange={setConfirmEstornoOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-rose-600 dark:text-rose-450 font-bold font-display">
              <Ban className="w-5 h-5 animate-pulse" />
              Confirmar Estorno
            </DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-3">
            <p className="text-sm text-zinc-650 dark:text-zinc-450 leading-normal">
              Deseja realmente estornar esta movimentação de crédito? 
            </p>
            {selectedMovForEstorno && (
              <div className="bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-3.5 space-y-1.5 text-xs font-medium">
                <div className="flex justify-between">
                  <span className="text-zinc-400 font-bold uppercase tracking-wider">Operação:</span>
                  <span className="text-zinc-800 dark:text-zinc-200 font-bold">{getTipoLabel(selectedMovForEstorno.tipo)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-400 font-bold uppercase tracking-wider">Valor:</span>
                  <span className={`font-extrabold text-sm ${selectedMovForEstorno.tipo_operacao === "C" ? "text-emerald-600 dark:text-emerald-450" : "text-rose-600 dark:text-rose-450"}`}>
                    {selectedMovForEstorno.tipo_operacao === "C" ? "+" : "-"} R$ {Number(selectedMovForEstorno.valor || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                  </span>
                </div>
                {selectedMovForEstorno.observacao && (
                  <div className="pt-1.5 border-t border-zinc-100 dark:border-zinc-800">
                    <span className="text-zinc-400 font-bold uppercase tracking-wider block mb-1">Motivo Original:</span>
                    <span className="text-zinc-600 dark:text-zinc-400 italic font-normal block leading-normal">{selectedMovForEstorno.observacao}</span>
                  </div>
                )}
              </div>
            )}
            <p className="text-[11px] text-zinc-400 leading-normal">
              Esta ação gerará uma transação reversa correspondente no extrato e atualizará o saldo do cliente. Não pode ser desfeita.
            </p>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setConfirmEstornoOpen(false)} className="w-full sm:w-auto h-10 font-semibold border-zinc-200 dark:border-zinc-800">
              Cancelar
            </Button>
            <Button 
              onClick={executeEstorno}
              className="bg-rose-600 hover:bg-rose-700 text-white w-full sm:w-auto h-10 font-bold"
            >
              Confirmar Estorno
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de Detalhamento de Saldo por Cliente */}
      <Dialog open={saldoDetailsOpen} onOpenChange={setSaldoDetailsOpen}>
        <DialogContent className="sm:max-w-[550px] max-h-[85vh] flex flex-col p-6">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold font-display text-zinc-800 dark:text-zinc-100 flex items-center gap-2">
              <User className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              Saldos de Crédito por Cliente
            </DialogTitle>
          </DialogHeader>

          {/* Barra de busca dentro do modal */}
          <div className="relative my-3">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-450" />
            <Input
              type="text"
              placeholder="Pesquisar cliente..."
              value={saldoSearchTerm}
              onChange={(e) => setSaldoSearchTerm(e.target.value)}
              className="pl-10 h-10 bg-zinc-50 dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 rounded-lg text-sm"
            />
          </div>

          {/* Listagem de clientes com saldos */}
          <div className="overflow-y-auto pr-1 flex-1 min-h-[300px] max-h-[50vh] border border-zinc-200 dark:border-zinc-800 rounded-lg">
            <table className="w-full text-xs text-left">
              <thead className="bg-zinc-50 dark:bg-zinc-900 sticky top-0 border-b border-zinc-200 dark:border-zinc-800 text-[10px] font-bold uppercase tracking-wider text-zinc-550">
                <tr>
                  <th className="px-4 py-3">Cliente</th>
                  <th className="px-4 py-3 text-right">Saldo Atual</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {(() => {
                  const filtered = clients
                    .filter(c => {
                      const balance = Number(c.saldo_credito || 0);
                      if (Math.abs(balance) <= 0.01) return false;
                      
                      const search = saldoSearchTerm.trim().toLowerCase();
                      if (!search) return true;
                      
                      const nameMatch = (c.nome || "").toLowerCase().includes(search);
                      const phoneMatch = (c.telefone || "").toLowerCase().includes(search);
                      return nameMatch || phoneMatch;
                    })
                    .sort((a, b) => Number(b.saldo_credito || 0) - Number(a.saldo_credito || 0));

                  if (filtered.length === 0) {
                    return (
                      <tr>
                        <td colSpan={2} className="px-4 py-8 text-center text-zinc-400 italic">
                          Nenhum cliente com saldo encontrado
                        </td>
                      </tr>
                    );
                  }

                  return filtered.map((c) => (
                    <tr
                      key={c.id}
                      onClick={() => {
                        setSelectedClienteId(c.id);
                        setSaldoDetailsOpen(false);
                      }}
                      className="cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-900/60 transition-colors"
                    >
                      <td className="px-4 py-3 font-medium text-zinc-800 dark:text-zinc-200">
                        <div>
                          <div className="text-sm font-semibold">{c.nome}</div>
                          {c.telefone && <div className="text-[10px] text-zinc-400">{c.telefone}</div>}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right font-mono font-extrabold text-sm text-emerald-600 dark:text-emerald-400">
                        R$ {Number(c.saldo_credito || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  ));
                })()}
              </tbody>
            </table>
          </div>

          <DialogFooter className="mt-4">
            <Button
              variant="outline"
              onClick={() => setSaldoDetailsOpen(false)}
              className="w-full sm:w-auto h-10 font-semibold"
            >
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
