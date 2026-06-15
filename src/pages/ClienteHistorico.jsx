import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import http from "../api";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { 
  ArrowLeft, Calendar, Search, ChevronDown, ChevronUp, 
  Scissors, Package, DollarSign, Clock, User, CalendarDays, FileText, Users
} from "lucide-react";
import StatusBadge from "../components/StatusBadge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "../components/ui/dialog";

const fmtBRL = (n) => (n || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const getLocalDateString = (dateInput) => {
  if (!dateInput) return "1970-01-01";
  
  if (typeof dateInput === 'string') {
    const match = dateInput.match(/^(\d{4})[-/](\d{2})[-/](\d{2})/);
    if (match) {
      return `${match[1]}-${match[2]}-${match[3]}`;
    }
  }
  
  try {
    const d = new Date(dateInput);
    if (isNaN(d.getTime())) {
      return "1970-01-01";
    }
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  } catch (e) {
    return "1970-01-01";
  }
};

const formatDayLabel = (dateStr) => {
  const [year, month, day] = dateStr.split("-").map(Number);
  const d = new Date(year, month - 1, day);
  
  const weekdays = ["Domingo", "Segunda-feira", "Terça-feira", "Quarta-feira", "Quinta-feira", "Sexta-feira", "Sábado"];
  const dayOfWeek = weekdays[d.getDay()];
  const formattedDate = d.toLocaleDateString("pt-BR");
  
  return `${dayOfWeek}, ${formattedDate}`;
};

export default function ClienteHistorico() {
  const { id } = useParams();
  const nav = useNavigate();
  const [data, setData] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedDays, setExpandedDays] = useState({});
  const [produtos, setProdutos] = useState([]);
  const [selectedAgendamento, setSelectedAgendamento] = useState(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [previewPhoto, setPreviewPhoto] = useState(null);

  useEffect(() => { 
    http.get(`/clientes/${id}/historico`).then((r) => {
      setData(r.data);
    }); 
    http.get("/produtos").then((r) => {
      setProdutos(r.data);
    });
  }, [id]);

  if (!data) return <div className="p-8 text-zinc-400">Carregando...</div>;
  const { cliente, agendamentos = [], vendas = [], total_gasto, total_visitas } = data;

  // Group both agendamentos and vendas by day
  const grouped = {};

  agendamentos.forEach(a => {
    const day = getLocalDateString(a.data_hora);
    if (!grouped[day]) {
      grouped[day] = {
        date: day,
        agendamentos: [],
        vendas: [],
        total: 0
      };
    }
    grouped[day].agendamentos.push(a);
    grouped[day].total += a.valor_total;
  });

  vendas.forEach(v => {
    const day = getLocalDateString(v.data_venda);
    if (!grouped[day]) {
      grouped[day] = {
        date: day,
        agendamentos: [],
        vendas: [],
        total: 0
      };
    }
    grouped[day].vendas.push(v);
    grouped[day].total += v.valor_total;
  });

  const sortedDays = Object.values(grouped).sort((a, b) => b.date.localeCompare(a.date));

  // Search filter implementation
  const filteredDays = sortedDays.map(day => {
    const query = searchQuery.toLowerCase().trim();
    if (!query) return day;

    const dateFormatted = formatDayLabel(day.date).toLowerCase();
    const matchDate = dateFormatted.includes(query);

    const filteredAgs = day.agendamentos.filter(a => {
      const matchStatus = (a.status || "").toLowerCase().includes(query);
      const matchItens = (a.itens || []).some(item => 
        (item.nome || "").toLowerCase().includes(query) ||
        (item.colaborador_nome || "").toLowerCase().includes(query)
      );
      const matchNotes = (a.observacoes || "").toLowerCase().includes(query);
      const matchProfs = (a.profissionais || []).some(p => 
        (p.nome || "").toLowerCase().includes(query)
      );
      return matchStatus || matchItens || matchNotes || matchProfs;
    });

    const filteredVends = day.vendas.filter(v => {
      const matchStatus = (v.status || "").toLowerCase().includes(query);
      const matchMainProd = (v.produto_nome || "").toLowerCase().includes(query);
      const matchItens = (v.itens || []).some(item => 
        (item.produto_nome || "").toLowerCase().includes(query)
      );
      const matchColab = (v.colaborador_nome || "").toLowerCase().includes(query);
      return matchStatus || matchMainProd || matchItens || matchColab;
    });

    if (matchDate || filteredAgs.length > 0 || filteredVends.length > 0) {
      return {
        ...day,
        agendamentos: matchDate ? day.agendamentos : filteredAgs,
        vendas: matchDate ? day.vendas : filteredVends
      };
    }
    return null;
  }).filter(Boolean);

  const toggleDay = (dateStr) => {
    setExpandedDays(prev => ({ ...prev, [dateStr]: !prev[dateStr] }));
  };

  const expandAll = () => {
    const next = {};
    filteredDays.forEach(d => { next[d.date] = true; });
    setExpandedDays(next);
  };

  const collapseAll = () => {
    setExpandedDays({});
  };

  return (
    <div className="p-3 sm:p-6 lg:p-8 fade-in max-w-5xl mx-auto w-full">
      <Button variant="ghost" onClick={() => nav(-1)} className="mb-6 hover:bg-zinc-100 dark:hover:bg-zinc-900/60 dark:text-zinc-300">
        <ArrowLeft className="w-4 h-4 mr-1" /> Voltar
      </Button>

      {/* Header com Informações do Cliente */}
      <div className="bg-gradient-to-r from-zinc-50 to-zinc-100/50 dark:from-zinc-900 dark:to-zinc-900/40 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-4 sm:p-6 mb-8 flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-sm w-full">
        <div className="min-w-0 flex-1 flex flex-col sm:flex-row sm:items-center gap-5">
          {cliente.foto ? (
            <img 
              src={cliente.foto} 
              alt={cliente.nome} 
              onClick={() => setPreviewPhoto(cliente.foto)}
              className="w-16 h-16 sm:w-20 sm:h-20 rounded-full object-cover shrink-0 border border-zinc-200 dark:border-zinc-800 shadow-xs cursor-pointer hover:opacity-90 transition-opacity" 
              title="Clique para ampliar"
            />
          ) : (
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-[#EAF0EE] dark:bg-zinc-800 text-[#3A4F4A] dark:text-[#EAF0EE] font-semibold text-2xl sm:text-3xl flex items-center justify-center shrink-0 border border-zinc-100 dark:border-zinc-800">
              {cliente.nome?.charAt(0).toUpperCase()}
            </div>
          )}
          <div className="min-w-0">
            <span className="text-[10px] uppercase font-bold text-zinc-400 dark:text-zinc-500 tracking-wider">Histórico do Cliente</span>
            <h1 className="font-display text-2xl sm:text-4xl font-semibold tracking-tight mt-1 text-zinc-800 dark:text-zinc-100 truncate">{cliente.nome}</h1>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-2 flex flex-wrap gap-x-4 gap-y-1">
              {cliente.telefone && <span>📞 {cliente.telefone}</span>}
              {cliente.email && <span>✉️ {cliente.email}</span>}
            </p>
            {cliente.observacoes && (
              <div className="mt-4 p-3 bg-white/80 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs text-zinc-600 dark:text-zinc-300 leading-relaxed max-w-xl shadow-xs">
                <span className="font-bold text-zinc-700 dark:text-zinc-200 block mb-1">📝 Observações e Preferências:</span>
                {cliente.observacoes}
              </div>
            )}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:gap-4 w-full md:w-auto shrink-0">
          <div className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl p-3 sm:p-4 min-w-[110px] sm:min-w-[140px] shadow-sm">
            <div className="text-xs uppercase font-bold text-zinc-400 dark:text-zinc-500 tracking-wider">Visitas</div>
            <div className="font-display text-2xl sm:text-3xl font-semibold mt-1 text-zinc-800 dark:text-zinc-100">{total_visitas}</div>
          </div>
          <div className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl p-3 sm:p-4 min-w-[110px] sm:min-w-[140px] shadow-sm">
            <div className="text-xs uppercase font-bold text-zinc-400 dark:text-zinc-500 tracking-wider">Total gasto</div>
            <div className="font-display text-2xl sm:text-3xl font-semibold mt-1 text-[#3A4F4A] dark:text-[#EAF0EE]">{fmtBRL(total_gasto)}</div>
          </div>
        </div>
      </div>

      {/* Controles de Busca e Ações */}
      <div className="mb-6 flex flex-col sm:flex-row gap-3 sm:gap-4 items-center justify-between w-full">
        <div className="relative w-full sm:max-w-md">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-zinc-400 dark:text-zinc-500" />
          <Input
            placeholder="Pesquisar por serviço, produto, profissional..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 bg-white dark:bg-zinc-950 dark:border-zinc-800 dark:text-zinc-100 text-sm w-full"
          />
        </div>
        <div className="grid grid-cols-2 gap-2 w-full sm:flex sm:w-auto shrink-0">
          <Button size="sm" variant="outline" onClick={expandAll} className="text-xs font-semibold w-full sm:w-auto dark:border-zinc-800 dark:text-zinc-300">
            Expandir todos
          </Button>
          <Button size="sm" variant="outline" onClick={collapseAll} className="text-xs font-semibold w-full sm:w-auto dark:border-zinc-800 dark:text-zinc-300">
            Recolher todos
          </Button>
        </div>
      </div>

      {/* Tabela / Acordeão Consolidado */}
      <div className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl overflow-hidden shadow-sm">
        <div className="px-6 py-4 border-b border-zinc-100 dark:border-zinc-800/80 flex items-center justify-between">
          <h3 className="font-display text-lg font-medium text-zinc-800 dark:text-zinc-100">Linha do Tempo de Atendimentos & Compras</h3>
          <span className="text-xs text-zinc-400 dark:text-zinc-500 font-medium">Consolidado por dia</span>
        </div>

        {filteredDays.length === 0 ? (
          <div className="p-16 text-center text-zinc-400 text-sm">
            <Calendar className="w-12 h-12 text-zinc-300 mx-auto mb-4" />
            <h3 className="font-medium text-zinc-700 text-base">Nenhum registro encontrado</h3>
            <p className="text-xs text-zinc-400 mt-1">Nenhum serviço ou compra corresponde à sua busca.</p>
          </div>
        ) : (
          <div className="divide-y divide-zinc-200 dark:divide-zinc-800">
            {filteredDays.map((day) => {
              const isExpanded = !!expandedDays[day.date];
              const numAgs = day.agendamentos.length;
              const numVends = day.vendas.length;

              return (
                <div key={day.date} className="transition-all duration-200">
                  {/* Linha do Dia Clicável */}
                  <div 
                    onClick={() => toggleDay(day.date)}
                    className="px-4 sm:px-6 py-4 flex items-center justify-between gap-4 cursor-pointer select-none hover:bg-zinc-50/50 dark:hover:bg-zinc-900/40 transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className="bg-[#84A59D]/10 dark:bg-[#84A59D]/5 p-2 rounded-xl text-[#84A59D] shrink-0">
                        <Calendar className="w-5 h-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h4 className="font-semibold text-zinc-800 dark:text-zinc-100 text-sm sm:text-base truncate">{formatDayLabel(day.date)}</h4>
                        <div className="flex flex-wrap items-center gap-1.5 mt-1 text-[10px] text-zinc-500 font-medium">
                          {numAgs > 0 && (
                            <span className="flex items-center gap-1 bg-sky-50 text-sky-700 dark:bg-zinc-900 dark:text-zinc-300 px-2 py-0.5 rounded-full border border-sky-100 dark:border-zinc-800 shrink-0">
                              <Scissors className="w-3 h-3" /> {numAgs} {numAgs === 1 ? "Serviço" : "Serviços"}
                            </span>
                          )}
                          {numVends > 0 && (
                            <span className="flex items-center gap-1 bg-amber-50 text-amber-700 dark:bg-zinc-900 dark:text-zinc-300 px-2 py-0.5 rounded-full border border-amber-100 dark:border-zinc-800 shrink-0">
                              <Package className="w-3 h-3" /> {numVends} {numVends === 1 ? "Compra" : "Compras"}
                            </span>
                          )}
                          {(numAgs > 0 || numVends > 0) && (
                            <span className="text-zinc-300 dark:text-zinc-700 mx-0.5">|</span>
                          )}
                          {day.agendamentos.map(a => a.numero && (
                            <span key={a.id} className="bg-sky-50/60 text-sky-800 dark:bg-zinc-900/60 dark:text-zinc-400 px-2 py-0.5 rounded font-mono text-[9px] border border-sky-100 dark:border-zinc-800 shrink-0">
                              {String(a.numero).padStart(6, '0')} | S
                            </span>
                          ))}
                          {day.vendas.map(v => v.numero_venda && (
                            <span key={v.id} className="bg-amber-50/60 text-amber-800 dark:bg-zinc-900/60 dark:text-zinc-400 px-2 py-0.5 rounded font-mono text-[9px] border border-amber-100 dark:border-zinc-800 shrink-0">
                              {String(v.numero_venda).padStart(6, '0')} | V
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <div className="text-right">
                        <span className="text-[9px] uppercase font-bold text-zinc-400 dark:text-zinc-500 block">Total consumido</span>
                        <span className="font-display font-bold text-sm sm:text-base text-[#3A4F4A] dark:text-[#EAF0EE]">{fmtBRL(day.total)}</span>
                      </div>
                      <div className="text-zinc-400 dark:text-zinc-500">
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </div>
                    </div>
                  </div>

                  {/* Detalhes Expandidos do Dia */}
                  {isExpanded && (
                    <div className="px-4 sm:px-6 py-5 bg-zinc-50/30 dark:bg-zinc-900/10 border-t border-zinc-100 dark:border-zinc-800 space-y-6">
                      {/* Tabela de Serviços */}
                      {day.agendamentos.length > 0 && (
                        <div className="space-y-2">
                          <div className="flex items-center gap-1.5 text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                            <Scissors className="w-3.5 h-3.5 text-[#84A59D]" />
                            <span>Serviços Realizados</span>
                          </div>
                          <div className="border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden bg-white dark:bg-zinc-950 shadow-sm">
                            <div className="overflow-x-auto w-full">
                              <table className="w-full text-xs">
                                <thead className="bg-zinc-50 dark:bg-zinc-900/80 text-zinc-500 dark:text-zinc-400 font-bold uppercase tracking-wider text-[9px] border-b border-zinc-200 dark:border-zinc-800">
                                  <tr>
                                    <th className="px-2 sm:px-4 py-2.5 text-left w-[100px] sm:w-[120px]">Nº Serviço</th>
                                    <th className="px-2 sm:px-4 py-2.5 text-left w-[60px] sm:w-[80px]">Horário</th>
                                    <th className="px-2 sm:px-4 py-2.5 text-left">Itens de serviço</th>
                                    <th className="px-2 sm:px-4 py-2.5 text-left">Profissional</th>
                                    <th className="px-2 sm:px-4 py-2.5 text-left w-[100px] sm:w-[120px]">Status</th>
                                    <th className="px-2 sm:px-4 py-2.5 text-right w-[90px] sm:w-[110px]">Valor total</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/60 text-zinc-600 dark:text-zinc-300 font-medium">
                                  {day.agendamentos.map((a) => (
                                    <tr 
                                      key={a.id} 
                                      onClick={() => {
                                        setSelectedAgendamento(a);
                                        setDetailModalOpen(true);
                                      }}
                                      className="hover:bg-zinc-50/60 dark:hover:bg-zinc-900/60 cursor-pointer transition-colors"
                                      title="Clique para ver detalhes completos deste atendimento"
                                    >
                                      <td className="px-2 sm:px-4 py-3 whitespace-nowrap text-zinc-400 dark:text-zinc-550 font-mono">
                                        {a.numero ? `${String(a.numero).padStart(6, '0')} | S` : "-"}
                                      </td>
                                      <td className="px-2 sm:px-4 py-3 whitespace-nowrap text-zinc-400 dark:text-zinc-500 font-mono">
                                        {new Date(a.data_hora).toLocaleTimeString("pt-BR", { hour: '2-digit', minute: '2-digit' })}
                                      </td>
                                      <td className="px-2 sm:px-4 py-3 text-zinc-800 dark:text-zinc-200 font-semibold min-w-[150px] sm:min-w-[200px]">
                                        <div>{a.itens?.map((i) => i.nome).join(", ")}</div>
                                        {a.observacoes && (
                                          <div className="mt-1.5 text-[11px] font-normal text-amber-800 dark:text-zinc-300 bg-amber-50/70 dark:bg-zinc-900/60 border border-amber-200/50 dark:border-zinc-800 rounded-lg px-2.5 py-1.5 max-w-lg shadow-sm flex items-start gap-1.5 leading-relaxed">
                                            <span className="shrink-0 mt-0.5">📝</span>
                                            <span><strong>Observações:</strong> {a.observacoes}</span>
                                          </div>
                                        )}
                                      </td>
                                      <td className="px-2 sm:px-4 py-3 text-zinc-500 dark:text-zinc-400">
                                        {a.profissionais?.map(p => p.nome).join(" & ") || "-"}
                                      </td>
                                      <td className="px-2 sm:px-4 py-3">
                                        <StatusBadge status={a.status} />
                                      </td>
                                      <td className="px-2 sm:px-4 py-3 text-right font-bold text-zinc-800 dark:text-zinc-100">
                                        {fmtBRL(a.valor_total)}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Tabela de Produtos */}
                      {day.vendas.length > 0 && (
                        <div className="space-y-2">
                          <div className="flex items-center gap-1.5 text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                            <Package className="w-3.5 h-3.5 text-[#84A59D]" />
                            <span>Produtos Adquiridos</span>
                          </div>
                          <div className="border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden bg-white dark:bg-zinc-950 shadow-sm">
                            <div className="overflow-x-auto w-full">
                              <table className="w-full text-xs">
                                <thead className="bg-zinc-50 dark:bg-zinc-900/80 text-zinc-500 dark:text-zinc-400 font-bold uppercase tracking-wider text-[9px] border-b border-zinc-200 dark:border-zinc-800">
                                  <tr>
                                    <th className="px-2 sm:px-4 py-2.5 text-left w-[100px] sm:w-[120px]">Nº Compra</th>
                                    <th className="px-2 sm:px-4 py-2.5 text-left">Produto</th>
                                    <th className="px-2 sm:px-4 py-2.5 text-left">Responsável</th>
                                    <th className="px-2 sm:px-4 py-2.5 text-center w-[70px] sm:w-[90px]">Quantidade</th>
                                    <th className="px-2 sm:px-4 py-2.5 text-right w-[80px] sm:w-[100px]">Unitário</th>
                                    <th className="px-2 sm:px-4 py-2.5 text-right w-[90px] sm:w-[110px]">Total</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/60 text-zinc-600 dark:text-zinc-300 font-medium">
                                  {day.vendas.map((v) => {
                                    const vendaItens = Array.isArray(v.itens) && v.itens.length > 0 
                                      ? v.itens 
                                      : [{ 
                                          produto_nome: v.produto_nome, 
                                          quantidade: v.quantidade, 
                                          preco_unitario: v.quantidade > 0 ? v.valor_total / v.quantidade : v.valor_total, 
                                          subtotal: v.valor_total 
                                        }];
                                    
                                    return vendaItens.map((item, idx) => (
                                      <tr key={`${v.id}-${idx}`} className="hover:bg-zinc-50/30 dark:hover:bg-zinc-850/20">
                                        <td className="px-2 sm:px-4 py-3 whitespace-nowrap text-zinc-400 dark:text-zinc-550 font-mono">
                                          {v.numero_venda ? `${String(v.numero_venda).padStart(6, '0')} | V` : "-"}
                                        </td>
                                        <td className="px-2 sm:px-4 py-3 text-zinc-800 dark:text-zinc-200 font-semibold min-w-[150px] sm:min-w-[200px]">
                                          {item.produto_nome}
                                        </td>
                                        <td className="px-2 sm:px-4 py-3 text-zinc-500 dark:text-zinc-400">
                                          {v.colaborador_nome || "-"}
                                        </td>
                                        <td className="px-2 sm:px-4 py-3 text-center font-bold text-zinc-800 dark:text-zinc-100">
                                          {item.quantidade}
                                        </td>
                                        <td className="px-2 sm:px-4 py-3 text-right text-zinc-400 dark:text-zinc-500">
                                          {fmtBRL(item.preco_unitario)}
                                        </td>
                                        <td className="px-2 sm:px-4 py-3 text-right font-bold text-zinc-800 dark:text-zinc-100">
                                          {fmtBRL(item.subtotal)}
                                        </td>
                                      </tr>
                                    ));
                                  })}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal de Detalhes Completos do Atendimento do Histórico */}
      <Dialog open={detailModalOpen} onOpenChange={setDetailModalOpen}>
        <DialogContent className="dialog-content sm:max-w-3xl md:max-w-4xl lg:max-w-5xl rounded-2xl p-8 overflow-y-auto max-h-[90vh]" aria-describedby="dialog-historico-detalhe">
          <DialogHeader className="dialog-header flex flex-row items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-4">
            <DialogTitle className="dialog-title flex items-center gap-2 justify-between w-full">
              <span className="flex items-center gap-3 text-xl font-semibold">
                <CalendarDays className="w-6 h-6 text-[#84A59D]" />
                Detalhes do Atendimento Realizado
              </span>
              {selectedAgendamento?.numero && (
                <span className="text-sm font-mono font-bold bg-[#EAF0EE] text-[#3A4F4A] px-3.5 py-1 rounded-full mr-6">
                  {String(selectedAgendamento.numero).padStart(6, "0")} | S
                </span>
              )}
            </DialogTitle>
          </DialogHeader>
          <div id="dialog-historico-detalhe" className="sr-only">Visualização completa e detalhada do atendimento selecionado do histórico</div>
          
          {selectedAgendamento && (
            <div className="dialog-body grid grid-cols-1 md:grid-cols-2 gap-8 mt-6">
              
              {/* Coluna Esquerda: Informações Gerais e Notas */}
              <div className="space-y-6">
                {/* Cliente e Status */}
                <div className="flex items-center justify-between bg-[#F8FBFB] dark:bg-[#1a2322] p-5 rounded-2xl border border-[#E8EFEF] dark:border-[#2e3e3b] shadow-xs">
                  <div className="flex items-center gap-4">
                    {cliente.foto ? (
                      <img 
                        src={cliente.foto} 
                        alt={cliente.nome} 
                        onClick={() => setPreviewPhoto(cliente.foto)}
                        className="w-12 h-12 rounded-full object-cover shrink-0 border border-zinc-200 dark:border-zinc-800 cursor-pointer hover:opacity-90 transition-opacity" 
                        title="Clique para ampliar"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-[#EAF0EE] dark:bg-zinc-800 flex items-center justify-center text-[#3A4F4A] dark:text-[#EAF0EE] font-semibold text-xl shrink-0 border border-zinc-100 dark:border-zinc-800">
                        {cliente.nome?.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div>
                      <h3 className="font-display font-semibold text-zinc-800 dark:text-zinc-100 text-lg">{cliente.nome}</h3>
                      <p className="text-xs text-zinc-400">Cliente cadastrado(a)</p>
                    </div>
                  </div>
                  <StatusBadge status={selectedAgendamento.status} />
                </div>
 
                {/* Data e Hora */}
                <div className="grid grid-cols-2 gap-5">
                  <div className="bg-zinc-50 dark:bg-zinc-900 p-4 rounded-xl border border-zinc-100 dark:border-zinc-800 flex items-center gap-3 shadow-xs">
                    <Calendar className="w-6 h-6 text-[#84A59D]" />
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-zinc-400 font-bold">Data</p>
                      <p className="text-sm font-semibold text-zinc-700 dark:text-zinc-200">
                        {new Date(selectedAgendamento.data_hora).toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" })}
                      </p>
                    </div>
                  </div>
                  <div className="bg-zinc-50 dark:bg-zinc-900 p-4 rounded-xl border border-zinc-100 dark:border-zinc-800 flex items-center gap-3 shadow-xs">
                    <Clock className="w-6 h-6 text-[#84A59D]" />
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-zinc-400 font-bold">Horário</p>
                      <p className="text-sm font-semibold text-zinc-700 dark:text-zinc-200">
                        {new Date(selectedAgendamento.data_hora).toLocaleTimeString("pt-BR", { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                </div>
 
                {/* Observações */}
                <div className="space-y-2 pt-2 border-t border-zinc-100 dark:border-zinc-800">
                  <h4 className="text-xs uppercase tracking-wider text-zinc-450 dark:text-zinc-500 font-bold flex items-center gap-1.5">
                    <FileText className="w-4 h-4 text-[#84A59D]" /> Observações do Atendimento
                  </h4>
                  <div className="bg-zinc-55 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 p-4 rounded-xl text-sm text-zinc-600 dark:text-zinc-400 italic leading-relaxed min-h-[140px] whitespace-pre-wrap shadow-inner">
                    {selectedAgendamento.observacoes ? `"${selectedAgendamento.observacoes}"` : "Nenhuma observação registrada para este atendimento."}
                  </div>
                </div>
              </div>
 
              {/* Coluna Direita: Serviços, Produtos e Valores */}
              <div className="space-y-6 flex flex-col justify-between">
                {/* Serviços e Profissionais */}
                <div className="space-y-3">
                  <h4 className="text-xs uppercase tracking-wider text-zinc-400 font-bold flex items-center gap-1.5">
                    <Scissors className="w-4 h-4 text-[#84A59D]" /> Serviços Agendados
                  </h4>
                  <div className="space-y-3 max-h-[380px] overflow-y-auto pr-1">
                    {selectedAgendamento.itens?.map((item, idx) => {
                      const mainColab = item.colaborador_nome;
                      const auxColab = item.auxiliar_nome;
                      return (
                        <div key={idx} className="bg-[#F8FBFB] dark:bg-[#1a2322] border border-[#E8EFEF] dark:border-[#2e3e3b] p-4 rounded-xl flex flex-col gap-3 shadow-xs">
                          <div className="flex items-center justify-between">
                            <span className="font-semibold text-base text-zinc-800 dark:text-zinc-200">{item.nome || "Serviço"}</span>
                            <span className="text-base font-bold text-[#3A4F4A] dark:text-[#EAF0EE]">{fmtBRL(item.valor || item.preco_unitario)}</span>
                          </div>

                          {/* Box de detalhamento de negociação do valor */}
                          <div className="bg-white/80 dark:bg-zinc-900/50 p-2.5 rounded-lg border border-zinc-200/50 dark:border-zinc-800/80 text-xs space-y-1 mt-0.5">
                            <div className="flex justify-between items-center text-zinc-500 dark:text-zinc-400">
                              <span>Valor de Tabela (Base):</span>
                              <span className="font-mono">{fmtBRL(item.valor_original !== undefined && item.valor_original !== null ? item.valor_original : (item.valor || item.preco_unitario))}</span>
                            </div>
                            <div className="flex justify-between items-center text-[#3A4F4A] dark:text-[#84A59D] font-medium">
                              <span>Valor Acordado/Negociado:</span>
                              <span className="font-mono font-semibold">{fmtBRL(item.valor || item.preco_unitario)}</span>
                            </div>
                            {(() => {
                              const valBase = Number(item.valor_original !== undefined && item.valor_original !== null ? item.valor_original : (item.valor || item.preco_unitario));
                              const valCobrado = Number(item.valor || item.preco_unitario);
                              const diferenca = valCobrado - valBase;
                              if (Math.abs(diferenca) > 0.01) {
                                const isDesconto = diferenca < 0;
                                return (
                                  <div className="flex justify-between items-center pt-1 border-t border-dashed border-zinc-200 dark:border-zinc-800 text-[11px] mt-0.5">
                                    <span className={isDesconto ? "text-rose-600 dark:text-rose-400 font-semibold" : "text-emerald-600 dark:text-emerald-400 font-semibold"}>
                                      {isDesconto ? "Diferença (Desconto):" : "Diferença (Ajuste Negociado):"}
                                    </span>
                                    <span className={`font-mono font-bold ${isDesconto ? "text-rose-600 dark:text-rose-400" : "text-emerald-600 dark:text-emerald-400"}`}>
                                      {isDesconto ? "-" : "+"}{fmtBRL(Math.abs(diferenca))}
                                    </span>
                                  </div>
                                );
                              }
                              return null;
                            })()}
                          </div>

                          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-zinc-500 mt-0.5">
                            {item.duracao_minutos && (
                              <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {item.duracao_minutos} min</span>
                            )}
                            {mainColab && (
                              <span className="flex items-center gap-1"><User className="w-3 h-3" /> Profissional: <strong>{mainColab}</strong></span>
                            )}
                            {auxColab && (
                              <span className="flex items-center gap-1"><Users className="w-3 h-3" /> Auxiliar: <strong>{auxColab}</strong></span>
                            )}
                          </div>

                          {/* Utilized Products Section */}
                          <div className="mt-2 pt-2 border-t border-dashed border-[#E8EFEF] dark:border-[#2e3e3b]">
                            <span className="text-xs font-semibold text-zinc-500 flex items-center gap-1 mb-1.5">
                              <Package className="w-3 h-3 text-[#84A59D]" /> Consumo de Produtos
                            </span>
                            {item.produtos_utilizados && item.produtos_utilizados.length > 0 ? (
                              <div className="space-y-1">
                                {item.produtos_utilizados.map((pu, pidx) => {
                                  const prod = produtos.find(p => p.id === pu.produto_id);
                                  return (
                                    <div key={pidx} className="flex justify-between items-center text-xs text-zinc-650 bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded">
                                      <span className="font-medium text-zinc-755">{prod?.nome || "Carregando..."}</span>
                                      <span className="font-mono font-bold text-zinc-700 dark:text-zinc-300">{Number(pu.quantidade || 0).toFixed(3)} {pu.unidade_medida_insumo || "un"}</span>
                                    </div>
                                  );
                                })}
                              </div>
                            ) : (
                              <p className="text-[11px] text-zinc-400 italic">Nenhum produto informado</p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Valores Totais */}
                <div className="total-box p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 shadow-sm flex items-center justify-between">
                  <div className="total-label flex items-center gap-1 text-zinc-500 dark:text-zinc-450 font-medium">
                    <Clock className="w-4 h-4 text-[#84A59D]" />
                    Duração Total: {selectedAgendamento.itens?.reduce((sum, item) => sum + (item.duracao_minutos || 0), 0)} min
                  </div>
                  <div className="total-value text-xl font-extrabold text-[#3A4F4A] dark:text-[#EAF0EE]">{fmtBRL(selectedAgendamento.valor_total)}</div>
                </div>

                {/* Pagamentos Vinculados */}
                {selectedAgendamento.pagamentos && selectedAgendamento.pagamentos.length > 0 && (
                  <div className="space-y-3 pt-3 border-t border-zinc-100 dark:border-zinc-800">
                    <h4 className="text-xs uppercase tracking-wider text-zinc-450 dark:text-zinc-500 font-bold flex items-center gap-1.5">
                      <DollarSign className="w-4 h-4 text-[#84A59D]" /> Pagamentos Vinculados
                    </h4>
                    <div className="space-y-2 max-h-[200px] overflow-y-auto pr-1">
                      {selectedAgendamento.pagamentos.map((p, idx) => (
                        <div key={idx} className="bg-[#F8FBFB] dark:bg-[#1a2322] border border-[#E8EFEF] dark:border-[#2e3e3b] p-3 rounded-xl flex flex-col gap-1.5 shadow-xs text-xs">
                          <div className="flex justify-between items-center w-full">
                            <span className="font-semibold text-zinc-700 dark:text-zinc-350 capitalize">
                              {p.forma_pagamento}
                            </span>
                            <span className="font-mono font-bold text-zinc-800 dark:text-zinc-200">{fmtBRL(p.valor)}</span>
                          </div>
                          {(Number(p.troco) > 0 || (p.valor_recebido !== undefined && Number(p.valor_recebido) !== Number(p.valor))) && (
                            <div className="flex justify-between items-center text-zinc-500 dark:text-zinc-400">
                              <span>
                                Bruto: {fmtBRL(p.valor_recebido || p.valor)}
                                {Number(p.troco) > 0 && ` · Troco: ${fmtBRL(p.troco)}`}
                              </span>
                              <span>Líquido: {fmtBRL(p.valor)}</span>
                            </div>
                          )}
                          {p.observacao && <span className="text-[10px] text-zinc-500 dark:text-zinc-400 italic">"{p.observacao}"</span>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

            </div>
          )}
          
          <DialogFooter className="pt-4 border-t border-zinc-100 dark:border-zinc-800 w-full mt-4">
            <Button variant="outline" onClick={() => setDetailModalOpen(false)} className="w-full h-10 font-medium">Fechar Detalhes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Lightbox para visualização de foto ampliada */}
      <Dialog open={!!previewPhoto} onOpenChange={() => setPreviewPhoto(null)}>
        <DialogContent className="sm:max-w-md p-6 bg-zinc-900 dark:bg-zinc-950 border border-zinc-800 dark:border-zinc-900 shadow-2xl flex flex-col items-center justify-center rounded-2xl [&>button]:text-zinc-400 [&>button]:hover:text-zinc-150">
          {previewPhoto && (
            <img 
              src={previewPhoto} 
              alt="Foto de Perfil Ampliada" 
              className="max-w-full max-h-[75vh] rounded-xl object-contain shadow-md"
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
