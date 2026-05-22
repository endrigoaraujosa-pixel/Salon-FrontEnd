import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import http from "../api";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { 
  ArrowLeft, Calendar, Search, ChevronDown, ChevronUp, 
  Scissors, Package, DollarSign, Clock, User
} from "lucide-react";
import StatusBadge from "../components/StatusBadge";

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

  useEffect(() => { 
    http.get(`/clientes/${id}/historico`).then((r) => {
      setData(r.data);
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
        <div className="min-w-0 flex-1">
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
                                    <tr key={a.id} className="hover:bg-zinc-50/30 dark:hover:bg-zinc-850/20">
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
    </div>
  );
}
