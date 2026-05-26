import React, { useEffect, useState } from "react";
import http from "../api";
import { useAuth } from "../auth";
import { PageHeader } from "../components/Page";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "../components/ui/dialog";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "../components/ui/select";
import { 
  Wallet, 
  CheckCircle2, 
  RotateCcw, 
  Eye, 
  Calendar, 
  User, 
  DollarSign, 
  TrendingUp, 
  Package, 
  Users, 
  Clock,
  Filter,
  AlertTriangle
} from "lucide-react";
import { toast } from "sonner";

const fmtBRL = (n) => (n || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const fmtDate = (s) => s ? new Date(s).toLocaleDateString("pt-BR") : "—";
const fmtDateTime = (s) => s ? new Date(s).toLocaleString("pt-BR") : "—";

export default function Comissoes() {
  const { user } = useAuth();
  const isFunc = user?.role === "funcionario";
  const today = new Date();
  
  const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
  const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);
  
  const formatDateString = (d) => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const [dataInicio, setDataInicio] = useState(formatDateString(firstDay));
  const [dataFim, setDataFim] = useState(formatDateString(lastDay));
  const [statusFilter, setStatusFilter] = useState("pendente"); // 'pendente' | 'pago' | 'todos'
  const [data, setData] = useState(null);
  
  // Estado para visualização de detalhes do profissional
  const [selectedColab, setSelectedColab] = useState(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  
  // Estado para confirmação de insumos pendentes
  const [confirmInsumosOpen, setConfirmInsumosOpen] = useState(false);
  const [comissaoToPay, setComissaoToPay] = useState(null);

  const load = () => {
    http.get("/comissoes", { 
      params: { 
        data_inicio: dataInicio, 
        data_fim: dataFim,
        status: statusFilter
      } 
    })
    .then((r) => setData(r.data))
    .catch((err) => toast.error("Erro ao carregar comissões"));
  };

  useEffect(() => {
    if (dataInicio && dataFim) {
      load();
    }
  }, [dataInicio, dataFim, statusFilter]);

  const executePago = async (c) => {
    try {
      if (c.pago) {
        await http.delete(`/comissoes/pagar`, { params: { colaborador_id: c.colaborador_id, periodo: data.periodo } });
        toast.success("Pagamento desfeito com sucesso");
      } else {
        await http.post("/comissoes/pagar", { colaborador_id: c.colaborador_id, periodo: data.periodo, valor: c.valor_comissao });
        toast.success("Comissão marcada como paga com sucesso");
      }
      load();
    } catch { 
      toast.error("Erro ao alterar status de pagamento"); 
    }
  };

  const togglePago = async (c) => {
    if (!c.pago) {
      // Verifica se há alguma movimentação (detalhe) com insumos pendentes
      const hasPending = (c.detalhes || []).some(d => d.insumos_pendentes);
      if (hasPending) {
        setComissaoToPay(c);
        setConfirmInsumosOpen(true);
        return;
      }
    }
    executePago(c);
  };

  const setPeriodoHoje = () => {
    const todayStr = formatDateString(new Date());
    setDataInicio(todayStr);
    setDataFim(todayStr);
  };

  const setPeriodoEstaSemana = () => {
    const current = new Date();
    const first = current.getDate() - current.getDay(); 
    const last = first + 6; 
    
    setDataInicio(formatDateString(new Date(current.setDate(first))));
    setDataFim(formatDateString(new Date(current.setDate(last))));
  };

  const setPeriodoEsteMes = () => {
    setDataInicio(formatDateString(firstDay));
    setDataFim(formatDateString(lastDay));
  };

  const handleOpenDetails = (colab) => {
    setSelectedColab(colab);
    setDetailsOpen(true);
  };

  // Helper de avatar HSL dinâmico
  const getInitials = (nome) => {
    if (!nome) return "P";
    const parts = nome.split(" ");
    if (parts.length > 1) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return parts[0][0].toUpperCase();
  };
  
  const getAvatarColor = (nome) => {
    const safeNome = nome || "Profissional";
    let hash = 0;
    for (let i = 0; i < safeNome.length; i++) {
      hash = safeNome.charCodeAt(i) + ((hash << 5) - hash);
    }
    const h = Math.abs(hash % 360);
    return {
      bg: `hsl(${h}, 45%, 93%)`,
      text: `hsl(${h}, 60%, 25%)`
    };
  };

  // Cálculos consolidados dos KPI Cards
  const totalComissoesGeral = data?.comissoes?.reduce((sum, c) => sum + c.valor_comissao, 0) || 0;
  const totalAtendimentosGeral = data?.comissoes?.reduce((sum, c) => sum + c.atendimentos, 0) || 0;
  const totalInsumosGeral = data?.comissoes?.reduce((sum, c) => {
    const colabInsumos = c.detalhes?.reduce((s, d) => s + (d.custo_produtos || 0), 0) || 0;
    return sum + colabInsumos;
  }, 0) || 0;
  const totalFaturamentoServicos = data?.comissoes?.reduce((sum, c) => sum + c.total_principal + c.total_auxiliar, 0) || 0;

  return (
    <div className="p-6 lg:p-8 space-y-8 max-w-7xl mx-auto">
      {/* Cabeçalho */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-100 dark:border-zinc-800 pb-5">
        <div>
          <span className="text-[10px] uppercase font-bold tracking-wider text-zinc-400">Financeiro de Profissionais</span>
          <h1 className="font-display text-3xl font-extrabold text-[#3A4F4A] dark:text-zinc-100 tracking-tight">Comissões de Funcionários</h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" onClick={setPeriodoHoje} className="hover:bg-zinc-50 border-zinc-200 dark:border-zinc-800 dark:hover:bg-zinc-800 dark:text-zinc-200">Hoje</Button>
          <Button variant="outline" size="sm" onClick={setPeriodoEstaSemana} className="hover:bg-zinc-50 border-zinc-200 dark:border-zinc-800 dark:hover:bg-zinc-800 dark:text-zinc-200">Esta Semana</Button>
          <Button variant="outline" size="sm" onClick={setPeriodoEsteMes} className="hover:bg-zinc-50 border-zinc-200 dark:border-zinc-800 dark:hover:bg-zinc-800 dark:text-zinc-200">Este Mês</Button>
        </div>
      </div>

      {/* Control Bar / Painel de Filtros */}
      <div className="bg-white/90 backdrop-blur-md border border-zinc-200/80 dark:bg-zinc-900/90 dark:border-zinc-800 rounded-2xl p-5 shadow-sm flex flex-wrap items-end gap-5">
        <div className="space-y-1.5 flex-1 min-w-[200px]">
          <Label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Data de Início</Label>
          <div className="relative">
            <Calendar className="absolute left-3 top-2.5 h-4 w-4 text-zinc-400" />
            <Input 
              type="date" 
              value={dataInicio} 
              onChange={(e) => setDataInicio(e.target.value)} 
              className="pl-9 bg-zinc-50 border-zinc-200 focus:bg-white dark:bg-zinc-800 dark:border-zinc-700 dark:focus:bg-zinc-950 dark:text-zinc-100 transition-colors"
            />
          </div>
        </div>
        <div className="space-y-1.5 flex-1 min-w-[200px]">
          <Label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Data de Término</Label>
          <div className="relative">
            <Calendar className="absolute left-3 top-2.5 h-4 w-4 text-zinc-400" />
            <Input 
              type="date" 
              value={dataFim} 
              onChange={(e) => setDataFim(e.target.value)} 
              className="pl-9 bg-zinc-50 border-zinc-200 focus:bg-white dark:bg-zinc-800 dark:border-zinc-700 dark:focus:bg-zinc-950 dark:text-zinc-100 transition-colors"
            />
          </div>
        </div>

        <div className="space-y-1.5 w-60">
          <Label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Status das Comissões</Label>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="bg-zinc-50 border-zinc-200 dark:bg-zinc-800 dark:border-zinc-700 dark:text-zinc-100">
              <SelectValue placeholder="Selecione o status" />
            </SelectTrigger>
            <SelectContent className="dark:bg-zinc-900 dark:border-zinc-800">
              <SelectItem value="pendente" className="dark:text-zinc-200">Não Pagas (Pendentes)</SelectItem>
              <SelectItem value="pago" className="dark:text-zinc-200">Pagas</SelectItem>
              <SelectItem value="todos" className="dark:text-zinc-200">Todas as comissões</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Button onClick={load} className="bg-[#84A59D] hover:bg-[#6F9189] dark:bg-[#84A59D] dark:hover:bg-[#6F9189] dark:text-zinc-950 shadow-sm text-white px-5">
          <Filter className="w-4 h-4 mr-1.5" /> Filtrar Período
        </Button>
      </div>

      {data && (
        <>
          {/* Dashboard KPI Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {/* Card 1: Faturamento Geral de Serviços */}
            <div className="bg-white border border-zinc-200 dark:bg-zinc-900 dark:border-zinc-800 rounded-2xl p-5 shadow-sm flex items-center justify-between hover:scale-[1.01] transition-transform">
              <div className="space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block">{isFunc ? "Meu Faturamento" : "Faturamento Bruto"}</span>
                <div className="font-display text-2xl font-black text-zinc-700 dark:text-zinc-100">{fmtBRL(totalFaturamentoServicos)}</div>
                <span className="text-[10px] text-zinc-400 block font-medium">{isFunc ? "Executado em meus atendimentos" : "Executado em atendimentos"}</span>
              </div>
              <div className="bg-zinc-50 dark:bg-zinc-800 p-3 rounded-xl">
                <TrendingUp className="w-6 h-6 text-zinc-500 dark:text-zinc-400" />
              </div>
            </div>

            {/* Card 2: Custo total de insumos */}
            <div className="bg-white border border-zinc-200 dark:bg-zinc-900 dark:border-zinc-800 rounded-2xl p-5 shadow-sm flex items-center justify-between hover:scale-[1.01] transition-transform">
              <div className="space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-450 dark:text-zinc-500 block">{isFunc ? "Minha Dedução de Insumos" : "Dedução de Insumos"}</span>
                <div className="font-display text-2xl font-black text-zinc-700 dark:text-zinc-150">{fmtBRL(totalInsumosGeral)}</div>
                <span className="text-[10px] text-zinc-400 block font-medium">Custo total dos produtos</span>
              </div>
              <div className="bg-zinc-50 dark:bg-zinc-800 p-3 rounded-xl">
                <Package className="w-6 h-6 text-zinc-500 dark:text-zinc-400" />
              </div>
            </div>

            {/* Card 3: Comissão Líquida Geral */}
            <div className="bg-[#FAFDFD] border border-[#E1EEED] dark:bg-emerald-950/10 dark:border-emerald-900/30 rounded-2xl p-5 shadow-sm flex items-center justify-between hover:scale-[1.01] transition-transform">
              <div className="space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#3A4F4A] dark:text-emerald-400 block">{isFunc ? "Minha Comissão Líquida" : "Comissão Líquida"}</span>
                <div className="font-display text-2xl font-black text-[#3A4F4A] dark:text-emerald-300">{fmtBRL(totalComissoesGeral)}</div>
                <span className="text-[10px] text-[#84A59D] dark:text-emerald-400/80 block font-semibold uppercase tracking-wide">
                  {statusFilter === "pendente" && "A pagar no período"}
                  {statusFilter === "pago" && "Paga no período"}
                  {statusFilter === "todos" && "Pendente + Paga"}
                </span>
              </div>
              <div className="bg-[#EAF5F4] dark:bg-emerald-900/30 p-3 rounded-xl">
                <Wallet className="w-6 h-6 text-[#4F736B] dark:text-emerald-300" />
              </div>
            </div>

            {/* Card 4: Total de Atendimentos */}
            <div className="bg-white border border-zinc-200 dark:bg-zinc-900 dark:border-zinc-800 rounded-2xl p-5 shadow-sm flex items-center justify-between hover:scale-[1.01] transition-transform">
              <div className="space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block">{isFunc ? "Meus Atendimentos" : "Atendimentos"}</span>
                <div className="font-display text-2xl font-black text-zinc-700 dark:text-zinc-100">{totalAtendimentosGeral}</div>
                <span className="text-[10px] text-zinc-400 block font-medium">Serviços executados</span>
              </div>
              <div className="bg-zinc-50 dark:bg-zinc-800 p-3 rounded-xl">
                <Users className="w-6 h-6 text-zinc-500 dark:text-zinc-400" />
              </div>
            </div>
          </div>

          {/* Tabela de Comissões Otimizada e Responsiva */}
          <div className="bg-white border border-zinc-200/80 dark:bg-zinc-900 dark:border-zinc-800 rounded-2xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-zinc-50/70 border-b border-zinc-200 dark:bg-zinc-900/70 dark:border-zinc-850 text-[10px] uppercase tracking-wider text-zinc-400 dark:text-zinc-450 font-bold">
                  <tr>
                    <th className="px-6 py-4 text-left font-bold">Profissional</th>
                    <th className="px-6 py-4 text-center font-bold">Atendimentos</th>
                    <th className="px-6 py-4 text-right font-bold">Serviços Executados</th>
                    <th className="px-6 py-4 text-right font-bold">Consumo / Vendas</th>
                    <th className="px-6 py-4 text-right font-bold">Comissão Líquida</th>
                    <th className="px-6 py-4 text-center font-bold">{user?.role === "admin" ? "Situação / Ação" : "Situação"}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                  {data.comissoes.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="px-6 py-16 text-center text-zinc-400 dark:text-zinc-500">
                        Nenhuma comissão correspondente aos filtros selecionados.
                      </td>
                    </tr>
                  ) : data.comissoes.map((c, index) => {
                    const colabCustoInsumos = c.detalhes?.reduce((sum, d) => sum + (d.custo_produtos || 0), 0) || 0;
                    return (
                      <tr 
                        key={`${c.colaborador_id}-${c.pago ? 'pago' : 'pendente'}-${index}`} 
                        className="hover:bg-zinc-50/40 dark:hover:bg-zinc-800/30 transition-colors"
                      >
                        {/* 1. Profissional */}
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-3">
                            <div 
                              className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-xs font-mono shadow-sm bg-[#EAF0EE] text-[#3A4F4A] dark:bg-zinc-800 dark:text-zinc-200 border border-[#D5E2DF] dark:border-zinc-700 select-none shrink-0"
                            >
                              {getInitials(c.colaborador_nome)}
                            </div>
                            <div>
                              <button 
                                onClick={() => handleOpenDetails(c)} 
                                className="text-[#3A4F4A] hover:text-[#84A59D] dark:text-[#84A59D] dark:hover:text-[#6F9189] hover:underline font-semibold flex items-center gap-1 text-left text-sm animate-pulse-subtle"
                              >
                                {c.colaborador_nome}
                                <Eye className="w-3.5 h-3.5 text-zinc-450 dark:text-zinc-500" />
                              </button>
                              {c.detalhes?.some(d => d.insumos_pendentes) && !c.pago && (
                                <span className="inline-flex items-center gap-1 mt-1 px-1.5 py-0.5 rounded-full bg-rose-50 text-rose-600 border border-rose-150 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-900/60 text-[9px] font-bold uppercase tracking-wider" title="Existem serviços com insumos pendentes de lançamento">
                                  <AlertTriangle className="w-2.5 h-2.5" /> Insumos Pendentes
                                </span>
                              )}
                              <div className="text-[11px] text-zinc-400 dark:text-zinc-500 font-medium mt-0.5">
                                Solo: {c.comissao_sozinho != null ? c.comissao_sozinho : c.comissao_principal}% · c/ Aux: {c.comissao_ajuda || 30}% · Aux: {c.comissao_auxiliar}%
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* 2. Atendimentos */}
                        <td className="px-6 py-4 text-center font-mono font-semibold text-zinc-650 dark:text-zinc-300">
                          {c.atendimentos}
                        </td>

                        {/* 3. Serviços Executados */}
                        <td className="px-6 py-4 text-right whitespace-nowrap">
                          <div className="font-semibold text-zinc-800 dark:text-zinc-200">
                            {fmtBRL(c.total_principal + c.total_auxiliar)}
                          </div>
                          <div className="text-[10px] text-zinc-400 dark:text-zinc-500 font-medium mt-0.5">
                            P: {fmtBRL(c.total_principal)} · A: {fmtBRL(c.total_auxiliar)}
                          </div>
                        </td>

                        {/* 4. Consumo / Vendas */}
                        <td className="px-6 py-4 text-right whitespace-nowrap">
                          <div className="font-semibold text-rose-500 dark:text-rose-400">
                            -{fmtBRL(colabCustoInsumos)}
                          </div>
                          <div className="text-[10px] text-zinc-400 dark:text-zinc-500 font-medium mt-0.5">
                            Vendas: {fmtBRL(c.total_produtos || 0)}
                          </div>
                        </td>

                        {/* 5. Comissão Líquida */}
                        <td className="px-6 py-4 text-right whitespace-nowrap">
                          <div className="font-display font-black text-[#3A4F4A] dark:text-emerald-450 text-base">
                            {fmtBRL(c.valor_comissao)}
                          </div>
                        </td>

                        {/* 6. Situação / Ação */}
                        <td className="px-6 py-4 text-center whitespace-nowrap">
                          <div className="flex flex-col items-center gap-1.5 justify-center">
                            {c.pago ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-150 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-900/60 text-[9px] font-bold uppercase tracking-wider">
                                <CheckCircle2 className="w-3 h-3" /> Pago {fmtDate(c.data_pagamento)}
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-150 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-900/60 text-[9px] font-bold uppercase tracking-wider animate-pulse-slow">
                                <Clock className="w-3 h-3" /> Pendente
                              </span>
                            )}
                            {user?.role === "admin" && c.valor_comissao > 0 && (
                              <button 
                                onClick={() => togglePago(c)} 
                                className={`text-[10px] font-bold hover:underline transition-colors uppercase tracking-wider ${
                                  c.pago 
                                    ? "text-zinc-400 hover:text-rose-500 dark:text-zinc-500 dark:hover:text-rose-400" 
                                    : "text-[#84A59D] hover:text-[#6F9189] dark:text-[#84A59D] dark:hover:text-[#6F9189]"
                                }`}
                              >
                                {c.pago ? "Desfazer" : "Marcar Pago"}
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* Dialog Detalhado de Comissões */}
      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="w-[95vw] max-w-[95vw] sm:max-w-[90vw] lg:max-w-[85vw] xl:max-w-[80vw] max-h-[90vh] overflow-y-auto overflow-x-hidden rounded-2xl dark:bg-zinc-900 dark:border-zinc-800">
          <DialogHeader className="border-b border-zinc-100 dark:border-zinc-800 pb-4">
            <DialogTitle className="font-display text-2xl font-extrabold tracking-tight text-[#3A4F4A] dark:text-zinc-100 flex items-center gap-2.5">
              <Wallet className="w-6 h-6 text-[#84A59D]" />
              Detalhamento de Comissoes: {selectedColab?.colaborador_nome}
            </DialogTitle>
            {selectedColab && (
              <div className="text-[11px] text-zinc-400 dark:text-zinc-500 font-semibold uppercase tracking-wider mt-1">
                Políticas: Sozinho: <span className="text-zinc-650 dark:text-zinc-350 font-bold">{selectedColab.comissao_sozinho != null ? selectedColab.comissao_sozinho : selectedColab.comissao_principal}%</span> | Com ajuda: <span className="text-zinc-650 dark:text-zinc-350 font-bold">{selectedColab.comissao_ajuda || 30}%</span> | Auxiliar: <span className="text-zinc-650 dark:text-zinc-350 font-bold">{selectedColab.comissao_auxiliar}%</span>
              </div>
            )}
          </DialogHeader>

          {selectedColab && (
            <div className="space-y-6 py-4">
              {/* Resumo Rápido da Janela */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200/80 dark:border-zinc-850 p-5 rounded-2xl shadow-inner">
                <div className="space-y-1">
                  <span className="text-[9px] uppercase font-bold text-zinc-400 dark:text-zinc-500 tracking-wider">Serv. Principal</span>
                  <div className="font-semibold text-base text-zinc-700 dark:text-zinc-200">{fmtBRL(selectedColab.total_principal)}</div>
                </div>
                <div className="space-y-1">
                  <span className="text-[9px] uppercase font-bold text-zinc-400 dark:text-zinc-500 tracking-wider">Serv. Auxiliar</span>
                  <div className="font-semibold text-base text-zinc-700 dark:text-zinc-200">{fmtBRL(selectedColab.total_auxiliar)}</div>
                </div>
                <div className="space-y-1 text-rose-500 dark:text-rose-400">
                  <span className="text-[9px] uppercase font-bold text-rose-455 tracking-wider">Custo Insumos</span>
                  <div className="font-semibold text-base">{fmtBRL(selectedColab.detalhes?.reduce((sum, d) => sum + (d.custo_produtos || 0), 0))}</div>
                </div>
                <div className="space-y-1">
                  <span className="text-[9px] uppercase font-bold text-zinc-400 dark:text-zinc-500 tracking-wider">Venda Produtos</span>
                  <div className="font-semibold text-base text-zinc-700 dark:text-zinc-200">{fmtBRL(selectedColab.total_produtos)}</div>
                </div>
                <div className="space-y-1 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-100 dark:border-emerald-900/40 rounded-xl p-3 flex flex-col justify-center col-span-2 md:col-span-1 shadow-sm">
                  <span className="text-[9px] uppercase font-extrabold text-emerald-800 dark:text-emerald-400 tracking-wider">Comissão Líquida</span>
                  <div className="font-black text-xl text-emerald-700 dark:text-emerald-400 leading-none mt-1">{fmtBRL(selectedColab.valor_comissao)}</div>
                </div>
              </div>

              {/* Tabela de Transações Individuais */}
              <div className="border border-zinc-200 dark:border-zinc-800 rounded-2xl overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[1000px] text-sm">
                    <thead className="bg-zinc-50 dark:bg-zinc-950 text-[10px] uppercase tracking-wider text-zinc-400 dark:text-zinc-500 font-bold border-b border-zinc-200 dark:border-zinc-800">
                      <tr>
                        <th className="px-4 py-3 text-left font-bold">Data</th>
                        <th className="px-4 py-3 text-left font-bold">Documento</th>
                        <th className="px-4 py-3 text-left font-bold">Tipo</th>
                        <th className="px-4 py-3 text-left font-bold">Papel</th>
                        <th className="px-4 py-3 text-left font-bold">Descrição</th>
                        <th className="px-4 py-3 text-right font-bold">Valor Item</th>
                        <th className="px-4 py-3 text-right font-bold">Custo Insumo</th>
                        <th className="px-4 py-3 text-right font-bold">Base Comis.</th>
                        <th className="px-4 py-3 text-right font-bold">Percentual</th>
                        <th className="px-4 py-3 text-right font-bold">Comissão</th>
                        <th className="px-4 py-3 text-center font-bold">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-150 dark:divide-zinc-800">
                      {selectedColab.detalhes.length === 0 ? (
                        <tr>
                          <td colSpan="11" className="px-4 py-12 text-center text-zinc-400 dark:text-zinc-500">
                            Sem movimentações individuais neste bloco de comissões.
                          </td>
                        </tr>
                      ) : (
                        selectedColab.detalhes.map((item, idx) => (
                          <tr key={idx} className="hover:bg-zinc-55/30 dark:hover:bg-zinc-800/30 transition-colors">
                            <td className="px-4 py-3 text-zinc-500 dark:text-zinc-400 font-mono text-xs whitespace-nowrap">{fmtDateTime(item.data)}</td>
                            <td className="px-4 py-3 whitespace-nowrap">
                              <span className="text-zinc-600 dark:text-zinc-450 font-mono text-xs font-bold">
                                {item.numero != null 
                                  ? `${String(item.numero).padStart(6, "0")} | ${item.tipo === 'servico' ? 'S' : 'V'}`
                                  : "—"
                                }
                              </span>
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap">
                              <span className={`inline-flex px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ${
                                item.tipo === 'servico' 
                                  ? 'bg-blue-50 text-blue-700 border border-blue-150 dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-900/60' 
                                  : 'bg-purple-50 text-purple-700 border border-purple-150 dark:bg-purple-950/40 dark:text-purple-400 dark:border-purple-900/60'
                              }`}>
                                {item.tipo === 'servico' ? 'Serviço' : 'Produto'}
                              </span>
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap">
                              <span className="text-zinc-500 dark:text-zinc-400 text-xs font-semibold">{item.papel}</span>
                            </td>
                            <td className="px-4 py-3 text-zinc-700 dark:text-zinc-200 font-semibold max-w-[200px]">
                              <div className="truncate">{item.descricao}</div>
                              {item.insumos_pendentes && (
                                <div className="mt-1">
                                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider bg-rose-50 text-rose-600 border border-rose-100 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-900/60">
                                    <AlertTriangle className="w-2 h-2" /> Insumos Pendentes
                                  </span>
                                </div>
                              )}
                            </td>
                            <td className="px-4 py-3 text-right text-zinc-650 dark:text-zinc-300 font-medium">{fmtBRL(item.valor_movimentacao)}</td>
                            <td className="px-4 py-3 text-right text-rose-500 dark:text-rose-400 font-semibold">
                              {item.tipo === 'servico' ? fmtBRL(item.custo_produtos || 0) : "—"}
                            </td>
                            <td className="px-4 py-3 text-right text-zinc-800 dark:text-zinc-150 font-bold">
                              {item.tipo === 'servico' ? fmtBRL(item.base_comissao != null ? item.base_comissao : item.valor_movimentacao) : fmtBRL(item.valor_movimentacao)}
                            </td>
                            <td className="px-4 py-3 text-right font-bold text-zinc-450 dark:text-zinc-500 font-mono">
                              {item.percentual_aplicado}%
                            </td>
                            <td className="px-4 py-3 text-right font-black text-emerald-600 dark:text-emerald-400 font-mono">{fmtBRL(item.valor_comissao)}</td>
                            <td className="px-4 py-3 text-center whitespace-nowrap">
                              {item.pago ? (
                                <span className="inline-flex px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-900/60 text-[9px] font-bold uppercase tracking-wider">
                                  Pago
                                </span>
                              ) : (
                                <span className="inline-flex px-2 py-0.5 rounded-full bg-amber-50 text-amber-600 border border-amber-100 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-900/60 text-[9px] font-bold uppercase tracking-wider">
                                  Pendente
                                </span>
                              )}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="border-t border-zinc-100 dark:border-zinc-800 pt-4">
            <Button onClick={() => setDetailsOpen(false)} className="bg-zinc-800 hover:bg-zinc-900 dark:bg-zinc-850 dark:hover:bg-zinc-800 dark:text-zinc-100 text-white shadow-sm">
              Fechar Detalhamento
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de Confirmação: Insumos Pendentes */}
      <Dialog open={confirmInsumosOpen} onOpenChange={setConfirmInsumosOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-rose-600 dark:text-rose-400">
              <AlertTriangle className="w-5 h-5" />
              Insumos Pendentes
            </DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-zinc-600 dark:text-zinc-300">
              Este serviço possui lançamentos de insumos pendentes. Deseja realizar o pagamento da comissão mesmo assim?
            </p>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setConfirmInsumosOpen(false)}>
              Cancelar e Revisar
            </Button>
            <Button 
              className="bg-rose-500 hover:bg-rose-600 text-white" 
              onClick={() => {
                setConfirmInsumosOpen(false);
                if (comissaoToPay) executePago(comissaoToPay);
              }}
            >
              Sim, Pagar Comissão
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
