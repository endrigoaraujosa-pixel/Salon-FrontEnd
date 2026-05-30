import React, { useEffect, useState } from "react";
import http from "../api";
import { Users, Calendar, DollarSign, TrendingUp, Package, ArrowUpRight, Filter, Loader2 } from "lucide-react";
import { useAuth } from "../auth";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "../components/ui/dialog";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "../components/ui/select";

const Stat = ({ icon: Icon, label, value, hint, tone = "default", onClick }) => (
  <div 
    onClick={onClick}
    className={`bg-white border border-zinc-200 rounded-xl p-5 transition-all select-none dark:bg-zinc-900 dark:border-zinc-800 ${
      onClick 
        ? "cursor-pointer hover:shadow-md hover:border-[#84A59D] dark:hover:border-[#84A59D] active:scale-98" 
        : ""
    }`} 
    data-testid={`kpi-${label.toLowerCase().replace(/\s/g, '-')}`}
  >
    <div className="flex items-start justify-between">
      <div className="w-9 h-9 rounded-lg bg-[#EAF0EE] dark:bg-zinc-800 flex items-center justify-center animate-pulse-subtle">
        <Icon className="w-4 h-4 text-[#3A4F4A] dark:text-[#84A59D]" />
      </div>
      {onClick && (
        <span className="text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-zinc-150 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400 opacity-70 font-bold hover:opacity-100 transition-opacity">
          Detalhes
        </span>
      )}
      {tone === "warning" && <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">Alerta</span>}
    </div>
    <div className="mt-4">
      <div className="text-xs uppercase tracking-wider text-zinc-400 dark:text-zinc-500 font-medium">{label}</div>
      <div className="font-display text-3xl font-semibold tracking-tight mt-1 text-zinc-900 dark:text-zinc-100">{value}</div>
      {hint && <div className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 font-medium">{hint}</div>}
    </div>
  </div>
);

const fmtBRL = (n) => (n || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const fmtDate = (s) => s ? new Date(s).toLocaleDateString("pt-BR") : "—";
const fmtDateTime = (s) => s ? new Date(s).toLocaleString("pt-BR") : "—";

export default function Dashboard() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const [d, setD] = useState(null);
  const [selectedColab, setSelectedColab] = useState("todos");
  
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

  // Estado para modal de detalhamento
  const [selectedMetric, setSelectedMetric] = useState(null); // 'faturamento' | 'agendamentos' | 'atendimentos' | 'ticket_medio' | 'clientes' | 'estoque' | 'top_servico'
  const [detailData, setDetailData] = useState([]);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [selectedServiceName, setSelectedServiceName] = useState("");

  useEffect(() => {
    if (user?.colaborador_id) {
      setSelectedColab(user.colaborador_id);
    }
  }, [user]);

  const loadDashboard = () => {
    http.get("/dashboard", {
      params: {
        data_inicio: dataInicio,
        data_fim: dataFim,
        colaborador_id: selectedColab
      }
    })
    .then((r) => setD(r.data))
    .catch((err) => {
      console.error("Erro ao carregar dashboard:", err);
      setD({
        faturamento_mes: 0,
        agendamentos_hoje: 0,
        ticket_medio: 0,
        total_clientes: 0,
        total_colaboradores: 0,
        atendimentos_mes: 0,
        top_servicos: [],
        estoque_baixo: 0,
        colaboradores: []
      });
    });
  };

  useEffect(() => { 
    if (dataInicio && dataFim) {
      loadDashboard();
    }
  }, [dataInicio, dataFim, selectedColab]);

  const handleOpenDetail = (metric, serviceName = "") => {
    setSelectedMetric(metric);
    setSelectedServiceName(serviceName);
    setLoadingDetail(true);
    setDetailsOpen(true);
    setDetailData([]);

    http.get("/dashboard/detail", {
      params: {
        metric,
        data_inicio: dataInicio,
        data_fim: dataFim,
        service_name: serviceName,
        colaborador_id: selectedColab
      }
    })
    .then((r) => {
      setDetailData(r.data.details || []);
      setLoadingDetail(false);
    })
    .catch((err) => {
      console.error("Erro ao carregar detalhes:", err);
      setLoadingDetail(false);
    });
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

  const renderItensCell = (itens) => {
    let parsedItens = [];
    try {
      parsedItens = typeof itens === 'string' ? JSON.parse(itens) : itens;
    } catch (e) {
      parsedItens = itens || [];
    }
    if (Array.isArray(parsedItens) && parsedItens.length > 0) {
      return parsedItens.map(item => `${item.nome} (${fmtBRL(item.valor)})`).join(', ');
    }
    return '—';
  };
  
  if (!d) return <div className="p-8 text-zinc-400 dark:text-zinc-500 font-semibold text-center">Carregando dashboard...</div>;
  
  const topServicos = d.top_servicos || [];
  
  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-7xl mx-auto fade-in">
      {/* Cabeçalho */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-100 dark:border-zinc-800 pb-5">
        <div>
          <span className="text-[10px] uppercase font-bold tracking-wider text-zinc-450 dark:text-zinc-500">Visão geral</span>
          <h1 className="font-display text-3xl font-extrabold text-[#3A4F4A] dark:text-zinc-100 tracking-tight mt-0.5">Dashboard</h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" onClick={setPeriodoHoje} className="hover:bg-zinc-50 border-zinc-200 dark:border-zinc-800 dark:hover:bg-zinc-800 dark:text-zinc-200 font-medium">Hoje</Button>
          <Button variant="outline" size="sm" onClick={setPeriodoEstaSemana} className="hover:bg-zinc-50 border-zinc-200 dark:border-zinc-800 dark:hover:bg-zinc-800 dark:text-zinc-200 font-medium">Esta Semana</Button>
          <Button variant="outline" size="sm" onClick={setPeriodoEsteMes} className="hover:bg-zinc-50 border-zinc-200 dark:border-zinc-800 dark:hover:bg-zinc-800 dark:text-zinc-200 font-medium">Este Mês</Button>
        </div>
      </div>

      {/* Control Bar / Painel de Filtros */}
      <div className="bg-white/90 backdrop-blur-md border border-zinc-200/80 dark:bg-zinc-900/90 dark:border-zinc-800 rounded-2xl p-5 shadow-sm flex flex-wrap items-end gap-5">
        <div className="space-y-1.5 flex-1 min-w-[200px]">
          <Label className="text-[10px] font-bold text-zinc-450 dark:text-zinc-500 uppercase tracking-wider">Data de Início</Label>
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
          <Label className="text-[10px] font-bold text-zinc-450 dark:text-zinc-500 uppercase tracking-wider">Data de Término</Label>
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
        <div className="space-y-1.5 flex-1 min-w-[200px]">
          <Label className="text-[10px] font-bold text-zinc-450 dark:text-zinc-500 uppercase tracking-wider">Colaborador</Label>
          <Select value={selectedColab} onValueChange={(v) => setSelectedColab(v)}>
            <SelectTrigger id="dashboard-colab-filter" data-testid="dashboard-colab-filter" className="bg-zinc-50 border-zinc-200 focus:bg-white dark:bg-zinc-800 dark:border-zinc-700 dark:focus:bg-zinc-950 dark:text-zinc-100 transition-colors rounded-lg font-medium">
              <SelectValue placeholder="Selecione o colaborador" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Visualização Geral (Todos)</SelectItem>
              {(d?.colaboradores || []).map((c) => (
                <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button onClick={loadDashboard} className="bg-[#84A59D] hover:bg-[#6F9189] dark:bg-[#84A59D] dark:hover:bg-[#6F9189] dark:text-zinc-950 shadow-sm text-white px-5 font-semibold">
          <Filter className="w-4 h-4 mr-1.5" /> Filtrar Período
        </Button>
      </div>

      {/* KPI Cards Grid */}
      <div className={`grid grid-cols-2 ${isAdmin ? "lg:grid-cols-4" : "lg:grid-cols-3"} gap-4`}>
        {isAdmin && (
          <Stat 
            icon={DollarSign} 
            label="Faturamento Período" 
            value={fmtBRL(d.faturamento_mes)} 
            hint="Consolidado (Serviços, Vendas e Outras Receitas)"
            onClick={() => handleOpenDetail("faturamento")} 
          />
        )}
        <Stat 
          icon={Calendar} 
          label="Agendamentos" 
          value={d.agendamentos_hoje || 0} 
          hint="No período filtrado"
          onClick={() => handleOpenDetail("agendamentos")}
        />
        {isAdmin && (
          <Stat 
            icon={TrendingUp} 
            label="Ticket Médio" 
            value={fmtBRL(d.ticket_medio)} 
            hint="Faturamento / Concluídos"
            onClick={() => handleOpenDetail("ticket_medio")}
          />
        )}
        {!isAdmin && (
          <Stat 
            icon={TrendingUp} 
            label="Atendimentos Período" 
            value={d.atendimentos_mes || 0} 
            hint="Concluídos no período"
            onClick={() => handleOpenDetail("atendimentos")}
          />
        )}
        <Stat 
          icon={Users} 
          label="Clientes" 
          value={d.total_clientes || 0} 
          hint={isAdmin ? `${d.total_colaboradores || 0} profissionais` : undefined} 
          onClick={() => handleOpenDetail("clientes")}
        />
      </div>

      {/* Secondary Row: Top Services & Low Stock Products */}
      <div className="grid lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display font-medium text-lg text-zinc-900 dark:text-zinc-100">Top Serviços do Período</h3>
            <ArrowUpRight className="w-4 h-4 text-zinc-400" />
          </div>
          {topServicos.length === 0 && <div className="text-sm text-zinc-400 dark:text-zinc-500 py-8 text-center font-medium">Sem dados no período</div>}
          {topServicos.length > 0 && (
            <ul className="divide-y divide-zinc-150 dark:divide-zinc-800">
              {topServicos.map((s, i) => (
                <li 
                  key={i} 
                  onClick={() => handleOpenDetail("top_servico", s.nome)}
                  className="py-3 flex items-center justify-between hover:bg-zinc-50 dark:hover:bg-zinc-800 px-2 rounded-lg cursor-pointer transition-colors group animate-fade-in"
                >
                  <div className="flex items-center gap-3">
                    <span className="w-7 h-7 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-xs font-semibold text-zinc-650 dark:text-zinc-300">
                      {i + 1}
                    </span>
                    <span className="font-semibold text-sm text-zinc-800 dark:text-zinc-200 group-hover:text-[#84A59D] dark:group-hover:text-[#84A59D] transition-colors">
                      {s.nome}
                    </span>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      {isAdmin && <div className="text-sm font-bold text-zinc-900 dark:text-zinc-100">{fmtBRL(s.total)}</div>}
                      <div className="text-xs text-zinc-400 dark:text-zinc-500 font-semibold">{s.qtd}x atendimentos</div>
                    </div>
                    <ArrowUpRight className="w-3.5 h-3.5 text-zinc-300 group-hover:text-[#84A59D] transition-all opacity-0 group-hover:opacity-100 transform translate-x-[-4px] group-hover:translate-x-0" />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div 
          onClick={() => handleOpenDetail("estoque")}
          className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-6 shadow-sm cursor-pointer hover:shadow-md hover:border-[#84A59D] dark:hover:border-[#84A59D] transition-all group"
        >
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2">
              <Package className="w-4 h-4 text-zinc-400 dark:text-[#84A59D]" />
              <h3 className="font-display font-medium text-lg text-zinc-900 dark:text-zinc-100">Estoque</h3>
            </div>
            <ArrowUpRight className="w-3.5 h-3.5 text-zinc-300 group-hover:text-[#84A59D] transition-colors" />
          </div>
          <p className="text-sm text-zinc-550 dark:text-zinc-450 mb-4 font-medium">Produtos com nível baixo</p>
          <div className="font-display text-5xl font-semibold tracking-tight text-[#3A4F4A] dark:text-rose-400 transition-colors group-hover:scale-105 transform origin-left duration-250">
            {d.estoque_baixo || 0}
          </div>
          <div className="text-xs text-zinc-500 dark:text-zinc-400 mt-2.5 flex items-center gap-1 font-bold uppercase tracking-wider">
            precisam reposição <span className="text-rose-500 dark:text-rose-400 group-hover:underline">(Ver lista)</span>
          </div>
        </div>
      </div>

      {/* Dialog Detalhado de Drilldown */}
      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="w-[95vw] max-w-[95vw] sm:max-w-[90vw] lg:max-w-[85vw] xl:max-w-[80vw] max-h-[90vh] overflow-y-auto overflow-x-hidden rounded-2xl dark:bg-zinc-900 dark:border-zinc-800">
          <DialogHeader className="border-b border-zinc-100 dark:border-zinc-800 pb-4">
            <DialogTitle className="font-display text-2xl font-extrabold tracking-tight text-[#3A4F4A] dark:text-zinc-100 flex items-center gap-2.5">
              {selectedMetric === "faturamento" && <DollarSign className="w-6 h-6 text-[#84A59D]" />}
              {selectedMetric === "agendamentos" && <Calendar className="w-6 h-6 text-[#84A59D]" />}
              {selectedMetric === "atendimentos" && <TrendingUp className="w-6 h-6 text-[#84A59D]" />}
              {selectedMetric === "ticket_medio" && <TrendingUp className="w-6 h-6 text-[#84A59D]" />}
              {selectedMetric === "clientes" && <Users className="w-6 h-6 text-[#84A59D]" />}
              {selectedMetric === "estoque" && <Package className="w-6 h-6 text-[#84A59D]" />}
              {selectedMetric === "top_servico" && <ArrowUpRight className="w-6 h-6 text-[#84A59D]" />}
              
              {selectedMetric === "faturamento" && "Detalhamento de Faturamento"}
              {selectedMetric === "agendamentos" && "Agendamentos no Período"}
              {selectedMetric === "atendimentos" && "Atendimentos Concluídos"}
              {selectedMetric === "ticket_medio" && "Atendimentos que compõem o Ticket Médio"}
              {selectedMetric === "clientes" && "Lista de Clientes do Sistema"}
              {selectedMetric === "estoque" && "Produtos com Estoque Baixo"}
              {selectedMetric === "top_servico" && `Detalhamento de Atendimentos: ${selectedServiceName}`}
            </DialogTitle>
            <div className="text-[11px] text-zinc-400 dark:text-zinc-500 font-bold uppercase tracking-wider mt-1.5">
              Período: {fmtDate(dataInicio)} a {fmtDate(dataFim)}
            </div>
          </DialogHeader>

          <div className="py-4">
            {loadingDetail ? (
              <div className="flex flex-col items-center justify-center py-16 gap-3">
                <Loader2 className="w-8 h-8 text-[#84A59D] animate-spin" />
                <span className="text-sm text-zinc-400 dark:text-zinc-500 font-medium">Carregando informações detalhadas...</span>
              </div>
            ) : detailData.length === 0 ? (
              <div className="text-center py-16 text-zinc-400 dark:text-zinc-500 font-semibold">
                Nenhum dado encontrado para o período e indicador selecionado.
              </div>
            ) : (
              <>
                {/* Mobile Card List (Visible on mobile, hidden on desktop) */}
                <div className="block md:hidden space-y-3.5 max-h-[55vh] overflow-y-auto pr-1">
                  {selectedMetric === "faturamento" && detailData.map((item, idx) => (
                    <div key={idx} className="bg-white dark:bg-zinc-950 border border-zinc-150 dark:border-zinc-800/80 rounded-xl p-4 space-y-2.5 shadow-sm">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-zinc-400 dark:text-zinc-500 font-mono font-bold">{fmtDateTime(item.data_hora)}</span>
                        <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">{fmtBRL(item.valor)}</span>
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-bold text-zinc-800 dark:text-zinc-200 truncate">Venda #{item.numero}</span>
                        <span className={`inline-flex px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider flex-shrink-0 ${
                          item.tipo === 'servico' 
                            ? 'bg-blue-50 text-blue-700 border border-blue-150 dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-900/60' 
                            : 'bg-purple-50 text-purple-700 border border-purple-150 dark:bg-purple-950/40 dark:text-purple-400 dark:border-purple-900/60'
                        }`}>
                          {item.tipo === 'servico' ? 'Serviço' : 'Venda Direta'}
                        </span>
                      </div>
                      <div className="text-xs text-zinc-650 dark:text-zinc-350">
                        <span className="font-semibold text-zinc-500">Cliente:</span> {item.cliente}
                      </div>
                      <div className="text-xs text-zinc-600 dark:text-zinc-300 bg-zinc-50 dark:bg-zinc-900/40 p-2.5 rounded-lg border border-zinc-100 dark:border-zinc-800/40 leading-relaxed break-words">
                        <span className="font-semibold text-zinc-400 dark:text-zinc-500">Itens:</span> {item.itens}
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-zinc-400 dark:text-zinc-550 uppercase font-mono">
                        <span>Forma: {item.forma_pagamento?.replace('_', ' ')}</span>
                      </div>
                    </div>
                  ))}

                  {(selectedMetric === "agendamentos" || selectedMetric === "atendimentos" || selectedMetric === "ticket_medio") && detailData.map((item, idx) => (
                    <div key={idx} className="bg-white dark:bg-zinc-950 border border-zinc-150 dark:border-zinc-800/80 rounded-xl p-4 space-y-2.5 shadow-sm">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-zinc-400 dark:text-zinc-500 font-mono font-bold">{fmtDateTime(item.data_hora)}</span>
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${
                          item.status === 'concluido' 
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-150 dark:bg-emerald-950/40 dark:text-emerald-450 dark:border-emerald-900/60'
                            : item.status === 'cancelado'
                            ? 'bg-rose-50 text-rose-700 border border-rose-150 dark:bg-rose-950/40 dark:text-rose-455 dark:border-rose-900/60'
                            : 'bg-amber-50 text-amber-700 border border-amber-150 dark:bg-amber-950/40 dark:text-amber-455 dark:border-amber-900/60'
                        }`}>
                          {item.status}
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-bold text-zinc-800 dark:text-zinc-200">
                          Atendimento #{item.numero ? String(item.numero).padStart(6, '0') : '—'}
                        </span>
                        <span className="text-sm font-bold text-zinc-750 dark:text-zinc-100">
                          {fmtBRL(item.status === 'concluido' ? item.valor_pago : item.valor_total)}
                        </span>
                      </div>
                      <div className="text-xs text-zinc-650 dark:text-zinc-350">
                        <span className="font-semibold text-zinc-500">Cliente:</span> {item.cliente_nome}
                      </div>
                      <div className="text-xs text-zinc-600 dark:text-zinc-300 bg-zinc-50 dark:bg-zinc-900/40 p-2.5 rounded-lg border border-zinc-100 dark:border-zinc-800/40 leading-relaxed">
                        <span className="font-semibold text-zinc-400 dark:text-zinc-500">Serviços:</span> {renderItensCell(item.itens)}
                      </div>
                      <div className="text-[11px] text-zinc-400 dark:text-zinc-550 font-mono">
                        Duração: {item.duracao_minutos} min
                      </div>
                    </div>
                  ))}

                  {selectedMetric === "clientes" && detailData.map((item, idx) => (
                    <div key={idx} className="bg-white dark:bg-zinc-950 border border-zinc-150 dark:border-zinc-800/80 rounded-xl p-4 space-y-2 shadow-sm">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-bold text-zinc-800 dark:text-zinc-200 truncate">{item.nome}</span>
                        <span className="text-[10px] text-zinc-400 dark:text-zinc-550 font-mono flex-shrink-0">Desde: {fmtDate(item.criado_em)}</span>
                      </div>
                      <div className="text-xs text-zinc-650 dark:text-zinc-350 space-y-1 pt-1.5 border-t border-zinc-100 dark:border-zinc-800/30">
                        <div><span className="font-semibold text-zinc-500">Telefone:</span> {item.telefone || '—'}</div>
                        <div><span className="font-semibold text-zinc-500">Email:</span> {item.email || '—'}</div>
                        <div><span className="font-semibold text-zinc-500">Nascimento:</span> {item.data_nascimento || '—'}</div>
                      </div>
                    </div>
                  ))}

                  {selectedMetric === "estoque" && detailData.map((item, idx) => (
                    <div key={idx} className="bg-white dark:bg-zinc-950 border border-zinc-150 dark:border-zinc-800/80 rounded-xl p-4 space-y-2 shadow-sm">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-bold text-zinc-800 dark:text-zinc-200 truncate">{item.nome}</span>
                        <span className="text-xs text-zinc-400 dark:text-zinc-500 font-medium flex-shrink-0">{item.categoria || '—'}</span>
                      </div>
                      <div className="flex items-center justify-between text-xs text-zinc-650 dark:text-zinc-350">
                        <span>Preço Venda: {fmtBRL(item.preco_venda)}</span>
                        <span className="font-semibold">Mínimo: {item.estoque_minimo}</span>
                      </div>
                      <div className="bg-rose-50/40 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/40 p-2.5 rounded-lg flex items-center justify-between text-xs">
                        <span className="text-rose-600 dark:text-rose-400 font-bold">Estoque Atual:</span>
                        <span className="font-mono font-bold text-rose-600 dark:text-rose-400">{Number(Number(item.quantidade_estoque || 0).toFixed(3))}</span>
                      </div>
                    </div>
                  ))}

                  {selectedMetric === "top_servico" && detailData.map((item, idx) => (
                    <div key={idx} className="bg-white dark:bg-zinc-950 border border-zinc-150 dark:border-zinc-800/80 rounded-xl p-4 space-y-2.5 shadow-sm">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-zinc-400 dark:text-zinc-500 font-mono">{fmtDateTime(item.data_hora)}</span>
                        <span className="inline-flex px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-150 dark:bg-emerald-950/40 dark:text-emerald-450 dark:border-emerald-900/60 flex-shrink-0">
                          {item.status}
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-bold text-zinc-800 dark:text-zinc-200 truncate">Atendimento #{item.numero ? String(item.numero).padStart(6, '0') : '—'}</span>
                        <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">{fmtBRL(item.valor)}</span>
                      </div>
                      <div className="text-xs text-zinc-650 dark:text-zinc-350 space-y-1 pt-1.5 border-t border-zinc-100 dark:border-zinc-800/30">
                        <div><span className="font-semibold text-zinc-500">Cliente:</span> {item.cliente_nome}</div>
                        <div><span className="font-semibold text-zinc-500">Serviço:</span> {item.servico_nome}</div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Desktop Table (Hidden on mobile, visible on desktop) */}
                <div className="hidden md:block border border-zinc-200 dark:border-zinc-800 rounded-2xl overflow-hidden shadow-sm">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm min-w-[750px] sm:min-w-0">
                      {/* HEADERS */}
                      {selectedMetric === "faturamento" && (
                        <thead className="bg-zinc-50 dark:bg-zinc-950 text-[10px] uppercase tracking-wider text-zinc-400 dark:text-zinc-500 font-bold border-b border-zinc-200 dark:border-zinc-800">
                          <tr>
                            <th className="px-4 py-3 text-left font-bold">Data/Hora</th>
                            <th className="px-4 py-3 text-left font-bold">Documento</th>
                            <th className="px-4 py-3 text-left font-bold">Tipo</th>
                            <th className="px-4 py-3 text-left font-bold">Cliente</th>
                            <th className="px-4 py-3 text-left font-bold">Itens / Descrição</th>
                            <th className="px-4 py-3 text-left font-bold">Forma Pagamento</th>
                            <th className="px-4 py-3 text-right font-bold">Valor</th>
                          </tr>
                        </thead>
                      )}

                      {(selectedMetric === "agendamentos" || selectedMetric === "atendimentos" || selectedMetric === "ticket_medio") && (
                        <thead className="bg-zinc-50 dark:bg-zinc-950 text-[10px] uppercase tracking-wider text-zinc-400 dark:text-zinc-500 font-bold border-b border-zinc-200 dark:border-zinc-800">
                          <tr>
                            <th className="px-4 py-3 text-left font-bold">Data/Hora</th>
                            <th className="px-4 py-3 text-left font-bold">Número</th>
                            <th className="px-4 py-3 text-left font-bold">Cliente</th>
                            <th className="px-4 py-3 text-left font-bold">Serviços Executados</th>
                            <th className="px-4 py-3 text-center font-bold">Duração</th>
                            <th className="px-4 py-3 text-center font-bold">Status</th>
                            <th className="px-4 py-3 text-right font-bold">Valor</th>
                          </tr>
                        </thead>
                      )}

                      {selectedMetric === "clientes" && (
                        <thead className="bg-zinc-50 dark:bg-zinc-950 text-[10px] uppercase tracking-wider text-zinc-400 dark:text-zinc-500 font-bold border-b border-zinc-200 dark:border-zinc-800">
                          <tr>
                            <th className="px-4 py-3 text-left font-bold">Nome</th>
                            <th className="px-4 py-3 text-left font-bold">Telefone</th>
                            <th className="px-4 py-3 text-left font-bold">Email</th>
                            <th className="px-4 py-3 text-left font-bold">Data Nascimento</th>
                            <th className="px-4 py-3 text-left font-bold">Cadastrado Em</th>
                          </tr>
                        </thead>
                      )}

                      {selectedMetric === "estoque" && (
                        <thead className="bg-zinc-50 dark:bg-zinc-950 text-[10px] uppercase tracking-wider text-zinc-400 dark:text-zinc-500 font-bold border-b border-zinc-200 dark:border-zinc-800">
                          <tr>
                            <th className="px-4 py-3 text-left font-bold">Produto</th>
                            <th className="px-4 py-3 text-left font-bold">Categoria</th>
                            <th className="px-4 py-3 text-right font-bold">Preço Venda</th>
                            <th className="px-4 py-3 text-center font-bold">Estoque Atual</th>
                            <th className="px-4 py-3 text-center font-bold">Estoque Mínimo</th>
                          </tr>
                        </thead>
                      )}

                      {selectedMetric === "top_servico" && (
                        <thead className="bg-zinc-50 dark:bg-zinc-950 text-[10px] uppercase tracking-wider text-zinc-400 dark:text-zinc-500 font-bold border-b border-zinc-200 dark:border-zinc-800">
                          <tr>
                            <th className="px-4 py-3 text-left font-bold">Data/Hora</th>
                            <th className="px-4 py-3 text-left font-bold">Número Agendamento</th>
                            <th className="px-4 py-3 text-left font-bold">Cliente</th>
                            <th className="px-4 py-3 text-left font-bold">Serviço</th>
                            <th className="px-4 py-3 text-center font-bold">Status</th>
                            <th className="px-4 py-3 text-right font-bold">Valor</th>
                          </tr>
                        </thead>
                      )}

                      {/* BODY */}
                      <tbody className="divide-y divide-zinc-150 dark:divide-zinc-800">
                        {selectedMetric === "faturamento" && detailData.map((item, idx) => (
                          <tr key={idx} className="hover:bg-zinc-50/30 dark:hover:bg-zinc-800/30 transition-colors">
                            <td className="px-4 py-3 text-zinc-550 dark:text-zinc-450 font-mono text-xs whitespace-nowrap">{fmtDateTime(item.data_hora)}</td>
                            <td className="px-4 py-3 whitespace-nowrap">
                              <span className="text-zinc-650 dark:text-zinc-400 font-mono text-xs font-bold">{item.numero}</span>
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap">
                              <span className={`inline-flex px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ${
                                item.tipo === 'servico' 
                                  ? 'bg-blue-50 text-blue-700 border border-blue-150 dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-900/60' 
                                  : 'bg-purple-50 text-purple-700 border border-purple-150 dark:bg-purple-950/40 dark:text-purple-400 dark:border-purple-900/60'
                              }`}>
                                {item.tipo === 'servico' ? 'Serviço' : 'Venda Direta'}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-zinc-750 dark:text-zinc-200 font-semibold">{item.cliente}</td>
                            <td className="px-4 py-3 text-zinc-600 dark:text-zinc-350 max-w-[250px] truncate" title={item.itens}>{item.itens}</td>
                            <td className="px-4 py-3 text-zinc-500 dark:text-zinc-450 uppercase text-xs font-mono">{item.forma_pagamento?.replace('_', ' ')}</td>
                            <td className="px-4 py-3 text-right font-bold text-emerald-600 dark:text-emerald-450">{fmtBRL(item.valor)}</td>
                          </tr>
                        ))}

                        {(selectedMetric === "agendamentos" || selectedMetric === "atendimentos" || selectedMetric === "ticket_medio") && detailData.map((item, idx) => (
                          <tr key={idx} className="hover:bg-zinc-50/30 dark:hover:bg-zinc-800/30 transition-colors">
                            <td className="px-4 py-3 text-zinc-550 dark:text-zinc-450 font-mono text-xs whitespace-nowrap">{fmtDateTime(item.data_hora)}</td>
                            <td className="px-4 py-3 whitespace-nowrap">
                              <span className="text-zinc-650 dark:text-zinc-400 font-mono text-xs font-bold">
                                {item.numero ? String(item.numero).padStart(6, '0') : '—'}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-zinc-750 dark:text-zinc-200 font-semibold">{item.cliente_nome}</td>
                            <td className="px-4 py-3 text-zinc-600 dark:text-zinc-350 max-w-[250px] truncate" title={renderItensCell(item.itens)}>
                              {renderItensCell(item.itens)}
                            </td>
                            <td className="px-4 py-3 text-center font-mono font-medium text-zinc-550 dark:text-zinc-450">{item.duracao_minutos} min</td>
                            <td className="px-4 py-3 text-center whitespace-nowrap font-semibold">
                              <span className={`inline-flex px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${
                                item.status === 'concluido' 
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-150 dark:bg-emerald-950/40 dark:text-emerald-450 dark:border-emerald-900/60'
                                  : item.status === 'cancelado'
                                  ? 'bg-rose-50 text-rose-700 border border-rose-150 dark:bg-rose-950/40 dark:text-rose-455 dark:border-rose-900/60'
                                  : 'bg-amber-50 text-amber-700 border border-amber-150 dark:bg-amber-950/40 dark:text-amber-455 dark:border-amber-900/60'
                              }`}>
                                {item.status}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-right font-bold text-zinc-800 dark:text-zinc-150">
                              {fmtBRL(item.status === 'concluido' ? item.valor_pago : item.valor_total)}
                            </td>
                          </tr>
                        ))}

                        {selectedMetric === "clientes" && detailData.map((item, idx) => (
                          <tr key={idx} className="hover:bg-zinc-50/30 dark:hover:bg-zinc-800/30 transition-colors">
                            <td className="px-4 py-3 text-zinc-800 dark:text-zinc-200 font-semibold">{item.nome}</td>
                            <td className="px-4 py-3 text-zinc-650 dark:text-zinc-455 font-mono text-xs">{item.telefone || '—'}</td>
                            <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400 text-xs">{item.email || '—'}</td>
                            <td className="px-4 py-3 text-zinc-550 dark:text-zinc-450 text-xs">{item.data_nascimento || '—'}</td>
                            <td className="px-4 py-3 text-zinc-500 dark:text-zinc-500 font-mono text-xs">{fmtDate(item.criado_em)}</td>
                          </tr>
                        ))}

                        {selectedMetric === "estoque" && detailData.map((item, idx) => (
                          <tr key={idx} className="hover:bg-zinc-50/30 dark:hover:bg-zinc-800/30 transition-colors">
                            <td className="px-4 py-3 text-zinc-800 dark:text-zinc-200 font-semibold">{item.nome}</td>
                            <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400 text-xs">{item.categoria || '—'}</td>
                            <td className="px-4 py-3 text-right text-zinc-650 dark:text-zinc-350">{fmtBRL(item.preco_venda)}</td>
                            <td className="px-4 py-3 text-center font-mono font-bold text-rose-500 dark:text-rose-455 bg-rose-50/35 dark:bg-rose-950/20">{Number(Number(item.quantidade_estoque || 0).toFixed(3))}</td>
                            <td className="px-4 py-3 text-center font-mono font-medium text-zinc-500 dark:text-zinc-450">{item.estoque_minimo}</td>
                          </tr>
                        ))}

                        {selectedMetric === "top_servico" && detailData.map((item, idx) => (
                          <tr key={idx} className="hover:bg-zinc-50/30 dark:hover:bg-zinc-800/30 transition-colors">
                            <td className="px-4 py-3 text-zinc-550 dark:text-zinc-450 font-mono text-xs whitespace-nowrap">{fmtDateTime(item.data_hora)}</td>
                            <td className="px-4 py-3 whitespace-nowrap">
                              <span className="text-zinc-650 dark:text-zinc-400 font-mono text-xs font-bold">
                                {item.numero ? String(item.numero).padStart(6, '0') : '—'}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-zinc-750 dark:text-zinc-200 font-semibold">{item.cliente_nome}</td>
                            <td className="px-4 py-3 text-zinc-600 dark:text-zinc-300 font-medium">{item.servico_nome}</td>
                            <td className="px-4 py-3 text-center whitespace-nowrap font-semibold">
                              <span className="inline-flex px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-150 dark:bg-emerald-950/40 dark:text-emerald-450 dark:border-emerald-900/60">
                                {item.status}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-right font-bold text-emerald-600 dark:text-emerald-450">{fmtBRL(item.valor)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            )}
          </div>

          <DialogFooter className="border-t border-zinc-100 dark:border-zinc-800 pt-4 flex flex-col sm:flex-row items-center justify-between gap-4 w-full">
            <div className="text-xs text-zinc-550 dark:text-zinc-400 font-bold uppercase tracking-wider">
              {selectedMetric === "faturamento" && `Total Faturado: ${fmtBRL(detailData.reduce((acc, x) => acc + x.valor, 0))}`}
              {selectedMetric === "agendamentos" && `Total Agendados: ${detailData.length} agendamento(s)`}
              {selectedMetric === "atendimentos" && `Total Concluídos: ${detailData.length} atendimento(s)`}
              {selectedMetric === "ticket_medio" && `Média do Ticket: ${fmtBRL(detailData.length ? (detailData.reduce((acc, x) => acc + x.valor_pago, 0) / detailData.length) : 0)}`}
              {selectedMetric === "clientes" && `Total Clientes Ativos: ${detailData.length}`}
              {selectedMetric === "estoque" && `Total Itens Alerta: ${detailData.length}`}
              {selectedMetric === "top_servico" && `Faturamento do Serviço: ${fmtBRL(detailData.reduce((acc, x) => acc + x.valor, 0))} (${detailData.length}x)`}
            </div>
            <Button onClick={() => setDetailsOpen(false)} className="bg-zinc-800 hover:bg-zinc-900 dark:bg-zinc-800 dark:hover:bg-zinc-700 dark:text-zinc-100 text-white shadow-sm font-semibold">
              Fechar Detalhamento
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}