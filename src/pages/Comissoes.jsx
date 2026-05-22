import React, { useEffect, useState } from "react";
import http from "../api";
import { PageHeader } from "../components/Page";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "../components/ui/dialog";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "../components/ui/select";
import { Wallet, CheckCircle2, RotateCcw, Eye, Calendar, User, DollarSign, Filter } from "lucide-react";
import { toast } from "sonner";

const fmtBRL = (n) => (n || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const fmtDate = (s) => s ? new Date(s).toLocaleDateString("pt-BR") : "—";
const fmtDateTime = (s) => s ? new Date(s).toLocaleString("pt-BR") : "—";

export default function Comissoes() {
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

  const togglePago = async (c) => {
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

  return (
    <div className="p-6 lg:p-8 fade-in max-w-7xl mx-auto">
      <PageHeader 
        overline="Financeiro" 
        title="Comissões" 
        action={
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" size="sm" onClick={setPeriodoHoje}>Hoje</Button>
            <Button variant="outline" size="sm" onClick={setPeriodoEstaSemana}>Esta Semana</Button>
            <Button variant="outline" size="sm" onClick={setPeriodoEsteMes}>Este Mês</Button>
          </div>
        } 
      />

      {/* Seletor de Período Customizado e Filtro de Status */}
      <div className="bg-white border border-zinc-200 rounded-xl p-4 mb-6 flex flex-wrap items-end gap-4 shadow-sm">
        <div className="space-y-1">
          <Label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Data Inicial</Label>
          <Input 
            type="date" 
            value={dataInicio} 
            onChange={(e) => setDataInicio(e.target.value)} 
            className="w-48"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Data Final</Label>
          <Input 
            type="date" 
            value={dataFim} 
            onChange={(e) => setDataFim(e.target.value)} 
            className="w-48"
          />
        </div>

        <div className="space-y-1 w-52">
          <Label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Status das Comissões</Label>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="bg-white">
              <SelectValue placeholder="Não Pagas" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="pendente">Não Pagas (Pendentes)</SelectItem>
              <SelectItem value="pago">Pagas</SelectItem>
              <SelectItem value="todos">Todas as comissões</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Button onClick={load} className="bg-[#84A59D] hover:bg-[#6F9189]">
          <Calendar className="w-4 h-4 mr-1.5" /> Filtrar Período
        </Button>
      </div>

      {data && (
        <>
          <div className="bg-white border border-zinc-200 rounded-xl p-6 mb-6 flex items-center justify-between shadow-sm">
            <div>
              <div className="text-xs uppercase tracking-wider text-zinc-400">
                {statusFilter === "pendente" && "Total pendente de pagamento"}
                {statusFilter === "pago" && "Total pago no período"}
                {statusFilter === "todos" && "Total de comissões (Pendente + Pago)"}
              </div>
              <div className="font-display text-4xl font-semibold mt-1 text-[#3A4F4A]">{fmtBRL(data.total)}</div>
            </div>
            <Wallet className="w-12 h-12 text-[#84A59D]/20" />
          </div>

          <div className="bg-white border border-zinc-200 rounded-xl overflow-x-auto shadow-sm">
            <table className="w-full text-sm">
              <thead className="bg-zinc-50 text-xs uppercase tracking-wider text-zinc-500 border-b border-zinc-200">
                <tr>
                  <th className="px-5 py-3.5 text-left font-semibold">Profissional</th>
                  <th className="px-5 py-3.5 text-right font-semibold">Atendimentos/Vendas</th>
                  <th className="px-5 py-3.5 text-right font-semibold">Serv. Principal</th>
                  <th className="px-5 py-3.5 text-right font-semibold">Serv. Auxiliar</th>
                  <th className="px-5 py-3.5 text-right font-semibold">Venda Produtos</th>
                  <th className="px-5 py-3.5 text-right font-semibold">Valor Comissão</th>
                  <th className="px-5 py-3.5 text-center font-semibold">Status</th>
                  <th className="px-5 py-3.5 text-right font-semibold">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {data.comissoes.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="px-5 py-12 text-center text-zinc-400">
                      Nenhuma comissão correspondente aos filtros selecionados.
                    </td>
                  </tr>
                ) : data.comissoes.map((c, index) => (
                  <tr key={`${c.colaborador_id}-${c.pago ? 'pago' : 'pendente'}-${index}`} className="hover:bg-zinc-50/60 transition-colors">
                    <td className="px-5 py-4 font-medium">
                      <button 
                        onClick={() => handleOpenDetails(c)} 
                        className="text-[#3A4F4A] hover:text-[#84A59D] hover:underline text-left font-semibold flex items-center gap-1.5"
                      >
                        {c.colaborador_nome}
                        <Eye className="w-3.5 h-3.5 text-zinc-400" />
                      </button>
                      <div className="text-xs text-zinc-400 font-normal mt-0.5">
                        Sozinho: {c.comissao_sozinho != null ? c.comissao_sozinho : c.comissao_principal}% · c/ Assist.: {c.comissao_ajuda || 30}% · Aux: {c.comissao_auxiliar}%
                      </div>
                    </td>
                    <td className="px-5 py-4 text-right font-mono">{c.atendimentos}</td>
                    <td className="px-5 py-4 text-right text-zinc-600">{fmtBRL(c.total_principal)}</td>
                    <td className="px-5 py-4 text-right text-zinc-600">{fmtBRL(c.total_auxiliar)}</td>
                    <td className="px-5 py-4 text-right text-zinc-600">{fmtBRL(c.total_produtos || 0)}</td>
                    <td className="px-5 py-4 text-right font-display font-bold text-[#3A4F4A]">{fmtBRL(c.valor_comissao)}</td>
                    <td className="px-5 py-4 text-center">
                      {c.pago ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-semibold">
                          <CheckCircle2 className="w-3 h-3" /> Pago {fmtDate(c.data_pagamento)}
                        </span>
                      ) : (
                        <span className="inline-flex px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 text-xs font-semibold">
                          Pendente
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-4 text-right">
                      {c.valor_comissao > 0 && (
                        <Button 
                          size="sm" 
                          variant={c.pago ? "outline" : "default"} 
                          onClick={() => togglePago(c)} 
                          className={c.pago ? "border-zinc-300 text-zinc-700 hover:bg-zinc-50" : "bg-[#84A59D] hover:bg-[#6F9189]"}
                        >
                          {c.pago ? (
                            <><RotateCcw className="w-3 h-3 mr-1" /> Desfazer</>
                          ) : (
                            <><CheckCircle2 className="w-3 h-3 mr-1" /> Marcar Pago</>
                          )}
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="w-[95vw] max-w-[95vw] sm:max-w-[90vw] lg:max-w-[85vw] xl:max-w-[80vw] max-h-[90vh] overflow-y-auto overflow-x-hidden">
          <DialogHeader>
            <DialogTitle className="font-display text-2xl font-semibold tracking-tight text-[#3A4F4A] flex items-center gap-2">
              <Wallet className="w-6 h-6 text-[#84A59D]" />
              Detalhamento de Comissões: {selectedColab?.colaborador_nome}
            </DialogTitle>
            {selectedColab && (
              <div className="text-xs text-zinc-500 font-medium pl-8">
                Regras: Sozinho: <b>{selectedColab.comissao_sozinho != null ? selectedColab.comissao_sozinho : selectedColab.comissao_principal}%</b> | Com ajuda: <b>{selectedColab.comissao_ajuda || 30}%</b> | Auxiliar: <b>{selectedColab.comissao_auxiliar}%</b>
              </div>
            )}
          </DialogHeader>

          {selectedColab && (
            <div className="space-y-6 py-4">
              {/* Resumo Rápido */}
              <div className="grid grid-cols-4 gap-4 bg-zinc-50 border border-zinc-200 rounded-xl p-4">
                <div className="space-y-0.5">
                  <span className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider">Serv. Principal</span>
                  <div className="font-semibold text-lg text-zinc-700">{fmtBRL(selectedColab.total_principal)}</div>
                </div>
                <div className="space-y-0.5">
                  <span className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider">Serv. Auxiliar</span>
                  <div className="font-semibold text-lg text-zinc-700">{fmtBRL(selectedColab.total_auxiliar)}</div>
                </div>
                <div className="space-y-0.5">
                  <span className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider">Venda Produtos</span>
                  <div className="font-semibold text-lg text-zinc-700">{fmtBRL(selectedColab.total_produtos)}</div>
                </div>
                <div className="space-y-0.5 bg-emerald-50/50 border border-emerald-100 rounded-lg p-2 flex flex-col justify-center">
                  <span className="text-[9px] uppercase font-extrabold text-emerald-800 tracking-wider">Valor deste Bloco</span>
                  <div className="font-bold text-xl text-emerald-700">{fmtBRL(selectedColab.valor_comissao)}</div>
                </div>
              </div>

              {/* Tabela de Transações */}
              <div className="border border-zinc-200 rounded-xl overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-zinc-50 text-xs uppercase tracking-wider text-zinc-500 border-b border-zinc-200">
                    <tr>
                      <th className="px-4 py-3 text-left font-semibold">Data</th>
                      <th className="px-4 py-3 text-left font-semibold">Tipo</th>
                      <th className="px-4 py-3 text-left font-semibold">Papel</th>
                      <th className="px-4 py-3 text-left font-semibold">Descrição</th>
                      <th className="px-4 py-3 text-right font-semibold">Valor Item</th>
                      <th className="px-4 py-3 text-right font-semibold">Percentual</th>
                      <th className="px-4 py-3 text-right font-semibold">Comissão</th>
                      <th className="px-4 py-3 text-center font-semibold">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100">
                    {selectedColab.detalhes.length === 0 ? (
                      <tr>
                        <td colSpan="8" className="px-4 py-8 text-center text-zinc-400">
                          Sem movimentações individuais neste bloco de comissões.
                        </td>
                      </tr>
                    ) : (
                      selectedColab.detalhes.map((item, idx) => (
                        <tr key={idx} className="hover:bg-zinc-50/40 transition-colors">
                          <td className="px-4 py-3 text-zinc-600 whitespace-nowrap">{fmtDateTime(item.data)}</td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                              item.tipo === 'servico' 
                                ? 'bg-blue-50 text-blue-700 border border-blue-150' 
                                : 'bg-purple-50 text-purple-700 border border-purple-150'
                            }`}>
                              {item.tipo === 'servico' ? 'Serviço' : 'Produto'}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <span className="text-zinc-600 text-xs font-medium">{item.papel}</span>
                          </td>
                          <td className="px-4 py-3 text-zinc-800 font-medium">{item.descricao}</td>
                          <td className="px-4 py-3 text-right text-zinc-600">{fmtBRL(item.valor_movimentacao)}</td>
                          <td className="px-4 py-3 text-right font-semibold text-zinc-500">
                            {item.percentual_aplicado}%
                          </td>
                          <td className="px-4 py-3 text-right font-bold text-emerald-700">{fmtBRL(item.valor_comissao)}</td>
                          <td className="px-4 py-3 text-center">
                            {item.pago ? (
                              <span className="inline-flex px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100 text-[10px] font-bold">
                                Pago
                              </span>
                            ) : (
                              <span className="inline-flex px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-100 text-[10px] font-bold">
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
          )}

          <DialogFooter>
            <Button onClick={() => setDetailsOpen(false)} className="bg-zinc-800 hover:bg-zinc-900 text-white">
              Fechar Detalhamento
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
