import React, { useEffect, useState } from "react";
import http from "../api";
import { PageHeader } from "../components/Page";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "../components/ui/tabs";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "../components/ui/select";
import { FileText, Banknote, Package, TrendingUp, User, Printer, Search, ArrowUpDown, Tag, Scissors, Clock } from "lucide-react";

const fmtBRL = (n) => (n || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const todayStr = () => new Date().toISOString().split("T")[0];
const firstDayMonth = () => { const d = new Date(); d.setDate(1); return d.toISOString().split("T")[0]; };

const FORMA_LABELS = {
  dinheiro: "Dinheiro", pix: "PIX",
  cartao_credito: "Cartão Crédito", cartao_debito: "Cartão Débito",
  vale: "Vale-alimentação", geral: "Total geral"
};

const PresetButtons = ({ onPick }) => {
  const presets = [
    { l: "Hoje", from: todayStr(), to: todayStr() },
    { l: "Esta semana", from: (() => { const d = new Date(); d.setDate(d.getDate() - d.getDay()); return d.toISOString().split("T")[0]; })(), to: todayStr() },
    { l: "Este mês", from: firstDayMonth(), to: todayStr() },
    { l: "Últimos 30 dias", from: (() => { const d = new Date(); d.setDate(d.getDate() - 30); return d.toISOString().split("T")[0]; })(), to: todayStr() },
  ];
  return (
    <div className="flex flex-wrap gap-1">
      {presets.map((p) => <Button key={p.l} size="sm" variant="outline" onClick={() => onPick(p.from, p.to)}>{p.l}</Button>)}
    </div>
  );
};

export default function Relatorios() {
  const [from, setFrom] = useState(firstDayMonth());
  const [to, setTo] = useState(todayStr());
  const [tab, setTab] = useState("dre");
  const [dre, setDre] = useState(null);
  const [caixa, setCaixa] = useState(null);
  const [produtos, setProdutos] = useState(null);
  const [servicos, setServicos] = useState(null);
  
  // Estados para filtros
  const [colaboradores, setColaboradores] = useState([]);
  const [colaboradorId, setColaboradorId] = useState("todos"); // Usado no Caixa

  const [produtosList, setProdutosList] = useState([]);
  const [servicosList, setServicosList] = useState([]);
  const [clientesList, setClientesList] = useState([]);
  
  // Filtros específicos de Vendas de Produtos
  const [filterColaborador, setFilterColaborador] = useState("todos");
  const [filterProduto, setFilterProduto] = useState("todos");
  const [filterCategoria, setFilterCategoria] = useState("todos");
  const [filterFormaPagamento, setFilterFormaPagamento] = useState("todos");
  const [filterCliente, setFilterCliente] = useState("todos");
  const [filterStatus, setFilterStatus] = useState("todos");

  // Filtros específicos de Serviços
  const [filterColaboradorServico, setFilterColaboradorServico] = useState("todos");
  const [filterServico, setFilterServico] = useState("todos");
  const [filterFormaPagamentoServico, setFilterFormaPagamentoServico] = useState("todos");
  const [filterClienteServico, setFilterClienteServico] = useState("todos");
  const [filterStatusServico, setFilterStatusServico] = useState("todos");

  // Busca e Ordenação
  const [searchQuery, setSearchQuery] = useState("");
  const [sortField, setSortField] = useState("data_venda");
  const [sortDirection, setSortDirection] = useState("desc");

  // Busca e Ordenação de Serviços
  const [searchQueryServico, setSearchQueryServico] = useState("");
  const [sortFieldServico, setSortFieldServico] = useState("data_hora");
  const [sortDirectionServico, setSortDirectionServico] = useState("desc");

  useEffect(() => {
    http.get("/colaboradores").then((r) => setColaboradores(r.data)).catch(() => {});
    http.get("/produtos").then((r) => setProdutosList(r.data)).catch(() => {});
    http.get("/servicos").then((r) => setServicosList(r.data)).catch(() => {});
    http.get("/clientes").then((r) => setClientesList(r.data)).catch(() => {});
  }, []);

  const reload = () => {
    const params = { data_inicio: from, data_fim: to };
    if (tab === "dre") http.get("/relatorios/dre", { params }).then((r) => setDre(r.data));
    if (tab === "caixa") {
      const caixaParams = { ...params, colaborador_id: colaboradorId };
      http.get("/relatorios/caixa", { params: caixaParams }).then((r) => setCaixa(r.data));
    }
    if (tab === "produtos") {
      const prodParams = {
        ...params,
        colaborador_id: filterColaborador,
        produto_id: filterProduto,
        categoria: filterCategoria,
        forma_pagamento: filterFormaPagamento,
        cliente_id: filterCliente,
        status: filterStatus
      };
      http.get("/relatorios/produtos", { params: prodParams }).then((r) => setProdutos(r.data));
    }
    if (tab === "servicos") {
      const servParams = {
        ...params,
        colaborador_id: filterColaboradorServico,
        servico_id: filterServico,
        forma_pagamento: filterFormaPagamentoServico,
        cliente_id: filterClienteServico,
        status: filterStatusServico
      };
      http.get("/relatorios/servicos", { params: servParams }).then((r) => setServicos(r.data));
    }
  };

  useEffect(() => { 
    reload(); 
  }, [
    tab, from, to, colaboradorId,
    filterColaborador, filterProduto, filterCategoria, filterFormaPagamento, filterCliente, filterStatus,
    filterColaboradorServico, filterServico, filterFormaPagamentoServico, filterClienteServico, filterStatusServico
  ]);

  return (
    <div className="p-4 sm:p-6 lg:p-8 fade-in max-w-7xl mx-auto w-full overflow-x-hidden">
      <PageHeader overline="Análise" title="Relatórios" />

      <div className="bg-white border border-zinc-200 rounded-xl p-4 mb-6 grid grid-cols-1 sm:grid-cols-2 lg:flex lg:items-end lg:gap-4 gap-4 shadow-sm">
        <div className="w-full lg:w-auto">
          <Label className="text-xs uppercase font-bold text-zinc-400 tracking-wider">De</Label>
          <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="w-full lg:w-40" data-testid="rep-from" />
        </div>
        <div className="w-full lg:w-auto">
          <Label className="text-xs uppercase font-bold text-zinc-400 tracking-wider">Até</Label>
          <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="w-full lg:w-40" data-testid="rep-to" />
        </div>

        {tab === "caixa" && (
          <div className="w-full lg:w-64 sm:col-span-2 lg:col-span-1">
            <Label className="text-xs uppercase font-bold text-zinc-400 tracking-wider">Profissional</Label>
            <Select value={colaboradorId} onValueChange={setColaboradorId}>
              <SelectTrigger data-testid="rep-colab" className="bg-white w-full">
                <SelectValue placeholder="Todos os usuários" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os usuários</SelectItem>
                {colaboradores.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        <div className="w-full lg:flex-1 sm:col-span-2 lg:col-span-1">
          <Label className="text-xs uppercase font-bold text-zinc-400 tracking-wider">Atalhos de Período</Label>
          <PresetButtons onPick={(a, b) => { setFrom(a); setTo(b); }} />
        </div>
      </div>

      {tab === "produtos" && (
        <div className="bg-white border border-zinc-200 rounded-xl p-4 mb-6 shadow-sm no-print">
          <div className="flex items-center gap-2 mb-3 text-[#3A4F4A] font-semibold text-sm">
            <Package className="w-4 h-4 text-[#84A59D]" />
            <span>Filtros Adicionais para Venda de Produtos</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {/* Colaborador */}
            <div>
              <Label className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider">Colaborador</Label>
              <Select value={filterColaborador} onValueChange={setFilterColaborador}>
                <SelectTrigger className="bg-white h-9 text-xs">
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos os colaboradores</SelectItem>
                  {colaboradores.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Produto */}
            <div>
              <Label className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider">Produto</Label>
              <Select value={filterProduto} onValueChange={setFilterProduto}>
                <SelectTrigger className="bg-white h-9 text-xs">
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos os produtos</SelectItem>
                  {produtosList.map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Categoria */}
            <div>
              <Label className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider">Categoria</Label>
              <Select value={filterCategoria} onValueChange={setFilterCategoria}>
                <SelectTrigger className="bg-white h-9 text-xs">
                  <SelectValue placeholder="Todas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todas as categorias</SelectItem>
                  {[...new Set(produtosList.map(p => p.categoria).filter(Boolean))].map((cat) => (
                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Forma de Pagamento */}
            <div>
              <Label className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider">Pagamento</Label>
              <Select value={filterFormaPagamento} onValueChange={setFilterFormaPagamento}>
                <SelectTrigger className="bg-white h-9 text-xs">
                  <SelectValue placeholder="Todas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todas as formas</SelectItem>
                  {Object.entries(FORMA_LABELS).filter(([k]) => k !== 'geral').map(([k, l]) => (
                    <SelectItem key={k} value={k}>{l}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Cliente */}
            <div>
              <Label className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider">Cliente</Label>
              <Select value={filterCliente} onValueChange={setFilterCliente}>
                <SelectTrigger className="bg-white h-9 text-xs">
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos os clientes</SelectItem>
                  {clientesList.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Status */}
            <div>
              <Label className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider">Status</Label>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="bg-white h-9 text-xs">
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos os status</SelectItem>
                  <SelectItem value="pago">Pago</SelectItem>
                  <SelectItem value="pendente">Pendente</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      )}

      {tab === "servicos" && (
        <div className="bg-white border border-zinc-200 rounded-xl p-4 mb-6 shadow-sm no-print">
          <div className="flex items-center gap-2 mb-3 text-[#3A4F4A] font-semibold text-sm">
            <Scissors className="w-4 h-4 text-[#84A59D]" />
            <span>Filtros Adicionais para Prestação de Serviços</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
            {/* Colaborador */}
            <div>
              <Label className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider">Profissional</Label>
              <Select value={filterColaboradorServico} onValueChange={setFilterColaboradorServico}>
                <SelectTrigger className="bg-white h-9 text-xs">
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos os profissionais</SelectItem>
                  {colaboradores.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Serviço */}
            <div>
              <Label className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider">Serviço</Label>
              <Select value={filterServico} onValueChange={setFilterServico}>
                <SelectTrigger className="bg-white h-9 text-xs">
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos os serviços</SelectItem>
                  {servicosList.map((s) => (
                    <SelectItem key={s.id} value={s.id}>{s.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Forma de Pagamento */}
            <div>
              <Label className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider">Pagamento</Label>
              <Select value={filterFormaPagamentoServico} onValueChange={setFilterFormaPagamentoServico}>
                <SelectTrigger className="bg-white h-9 text-xs">
                  <SelectValue placeholder="Todas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todas as formas</SelectItem>
                  {Object.entries(FORMA_LABELS).filter(([k]) => k !== 'geral').map(([k, l]) => (
                    <SelectItem key={k} value={k}>{l}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Cliente */}
            <div>
              <Label className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider">Cliente</Label>
              <Select value={filterClienteServico} onValueChange={setFilterClienteServico}>
                <SelectTrigger className="bg-white h-9 text-xs">
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos os clientes</SelectItem>
                  {clientesList.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Status */}
            <div>
              <Label className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider">Status</Label>
              <Select value={filterStatusServico} onValueChange={setFilterStatusServico}>
                <SelectTrigger className="bg-white h-9 text-xs">
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos os status</SelectItem>
                  <SelectItem value="concluido">Concluído</SelectItem>
                  <SelectItem value="agendado">Agendado</SelectItem>
                  <SelectItem value="cancelado">Cancelado</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      )}

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="mb-6 bg-zinc-100 p-1 rounded-lg flex overflow-x-auto max-w-full no-scrollbar whitespace-nowrap">
          <TabsTrigger value="dre" data-testid="tab-dre" className="flex items-center gap-1.5 shrink-0"><FileText className="w-4 h-4" /> DRE</TabsTrigger>
          <TabsTrigger value="caixa" data-testid="tab-caixa" className="flex items-center gap-1.5 shrink-0"><Banknote className="w-4 h-4" /> Caixa</TabsTrigger>
          <TabsTrigger value="produtos" data-testid="tab-produtos" className="flex items-center gap-1.5 shrink-0"><Package className="w-4 h-4" /> Produtos</TabsTrigger>
          <TabsTrigger value="servicos" data-testid="tab-servicos" className="flex items-center gap-1.5 shrink-0"><Scissors className="w-4 h-4" /> Serviços</TabsTrigger>
        </TabsList>

        <TabsContent value="dre">
          {!dre ? <div className="text-zinc-400 p-8 text-center">Carregando...</div> : (
            <div className="grid lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 bg-white border border-zinc-200 rounded-xl p-6 space-y-4 shadow-sm">
                <h3 className="font-display text-lg font-medium text-zinc-800">Demonstração de Resultado</h3>
                <div className="space-y-3 text-sm divide-y divide-zinc-100">
                  <div className="pt-2"><Row label="Receita de Serviços" value={dre.receita_servicos} /></div>
                  <div className="pt-2"><Row label="Receita de Vendas Diretas" value={dre.receita_vendas_diretas} /></div>
                  <div className="pt-2"><Row label="Outras Receitas" value={dre.outras_receitas} /></div>
                  <div className="border-t border-zinc-200 pt-3"><Row label="Receita Bruta" value={dre.receita_bruta} bold /></div>
                  <div className="pt-2"><Row label="(-) Custo dos Produtos Vendidos" value={-dre.custo_produtos} negative /></div>
                  <div className="border-t border-zinc-200 pt-3"><Row label="Lucro Bruto" value={dre.lucro_bruto} bold highlight /></div>
                  
                  {/* Despesas */}
                  <div className="border-t border-zinc-200 pt-4 mt-4">
                    <div className="font-semibold text-zinc-800 mb-2">Despesas Operacionais</div>
                    <div className="space-y-2 pl-2">
                      <Row label="(-) Despesas Fixas" value={-dre.despesas.fixas} negative />
                      <Row label="(-) Despesas Variáveis" value={-dre.despesas.variaveis} negative />
                      <Row label="(-) Taxas de Cartão Crédito" value={-dre.taxas_cartao.credito} negative />
                      <Row label="(-) Taxas de Cartão Débito" value={-dre.taxas_cartao.debito} negative />
                    </div>
                    <div className="border-t border-zinc-100 pt-3 mt-2">
                      <Row label="Total Despesas Operacionais" value={-dre.despesas_operacionais} bold negative />
                    </div>
                  </div>
                  
                  <div className="border-t border-zinc-300 pt-3 mt-4">
                    <Row label="Lucro Líquido" value={dre.lucro_liquido} bold highlight />
                  </div>
                </div>
              </div>
              <div className="space-y-4">
                <div className="bg-white border border-zinc-200 rounded-xl p-5 shadow-sm">
                  <div className="text-xs uppercase tracking-wider text-zinc-400">Atendimentos</div>
                  <div className="font-display text-4xl font-semibold mt-1 text-[#3A4F4A]">{dre.total_atendimentos}</div>
                </div>
                <div className="bg-white border border-zinc-200 rounded-xl p-5 shadow-sm">
                  <div className="text-xs uppercase tracking-wider text-zinc-400">Vendas diretas</div>
                  <div className="font-display text-4xl font-semibold mt-1 text-[#3A4F4A]">{dre.total_vendas_diretas}</div>
                </div>
                <div className="bg-white border border-zinc-200 rounded-xl p-5 shadow-sm">
                  <div className="text-xs uppercase tracking-wider text-zinc-400">Taxas de cartão</div>
                  <div className="font-display text-2xl font-semibold mt-1 text-rose-600">{fmtBRL(dre.taxas_cartao.total)}</div>
                  <div className="text-xs text-zinc-500 mt-2 space-y-0.5">
                    <div>Crédito: {fmtBRL(dre.taxas_cartao.credito)}</div>
                    <div>Débito: {fmtBRL(dre.taxas_cartao.debito)}</div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </TabsContent>

        <TabsContent value="caixa">
          {!caixa ? <div className="text-zinc-400 p-8 text-center">Carregando...</div> : (
            <div className="space-y-6">
              <div className="bg-white border border-zinc-200 rounded-xl p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
                <div>
                  <div className="text-xs uppercase tracking-wider text-zinc-400">
                    {colaboradorId === "todos" 
                      ? "Total recebido no período (Todos os usuários)" 
                      : `Total recebido por ${colaboradores.find(c => c.id === colaboradorId)?.nome}`}
                  </div>
                  <div className="font-display text-3xl sm:text-4xl font-semibold mt-1 text-[#3A4F4A]">{fmtBRL(caixa.totais.geral)}</div>
                  <div className="text-xs text-zinc-500 mt-1">{caixa.total_pagamentos} pagamentos registrados</div>
                </div>
                <div className="bg-[#84A59D]/10 p-3 rounded-full self-start sm:self-auto">
                  {colaboradorId === "todos" ? (
                    <TrendingUp className="w-8 h-8 text-[#84A59D]" />
                  ) : (
                    <User className="w-8 h-8 text-[#84A59D]" />
                  )}
                </div>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                {["dinheiro", "pix", "cartao_credito", "cartao_debito", "vale"].map((k) => (
                  <div key={k} className="bg-white border border-zinc-200 rounded-xl p-5 shadow-sm hover:shadow transition-shadow">
                    <div className="text-xs uppercase tracking-wider text-zinc-400 font-semibold">{FORMA_LABELS[k]}</div>
                    <div className="font-display text-2xl font-bold mt-1.5 text-zinc-700">{fmtBRL(caixa.totais[k])}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </TabsContent>

        <TabsContent value="produtos">
          {!produtos ? <div className="text-zinc-400 p-8 text-center">Carregando...</div> : (
            (() => {
              // 1. Calcular a lista filtrada no cliente baseado na busca e ordenação
              const rawVendas = produtos.vendas || [];
              
              const filteredVendas = rawVendas
                .filter(v => {
                  if (!searchQuery) return true;
                  const query = searchQuery.toLowerCase();
                  return (
                    v.produto_nome.toLowerCase().includes(query) ||
                    (v.colaborador_nome || "").toLowerCase().includes(query) ||
                    (v.cliente_nome || "").toLowerCase().includes(query) ||
                    (v.categoria || "").toLowerCase().includes(query)
                  );
                })
                .sort((a, b) => {
                  let valA = a[sortField];
                  let valB = b[sortField];
                  
                  if (typeof valA === "string") {
                    valA = valA.toLowerCase();
                    valB = valB.toLowerCase();
                  }
                  
                  if (valA < valB) return sortDirection === "asc" ? -1 : 1;
                  if (valA > valB) return sortDirection === "asc" ? 1 : -1;
                  return 0;
                });

              // 2. Calcular totais dinâmicos baseados na lista filtrada
              const totalFaturamento = filteredVendas.reduce((acc, v) => acc + v.valor_total, 0);
              const totalQuantidade = filteredVendas.reduce((acc, v) => acc + v.quantidade, 0);
              const totalCusto = filteredVendas.reduce((acc, v) => acc + v.custo_total, 0);
              const totalLucro = totalFaturamento - totalCusto;

              // 3. Agrupamentos para o painel lateral de desempenho (breakdowns)
              const porColab = {};
              const porProd = {};
              filteredVendas.forEach(v => {
                const cName = v.colaborador_nome || 'Nenhum';
                porColab[cName] = (porColab[cName] || 0) + v.valor_total;
                
                const pName = v.produto_nome;
                porProd[pName] = (porProd[pName] || 0) + v.valor_total;
              });

              const handleSort = (field) => {
                if (sortField === field) {
                  setSortDirection(sortDirection === "asc" ? "desc" : "asc");
                } else {
                  setSortField(field);
                  setSortDirection("desc");
                }
              };

              const handlePrint = () => {
                window.print();
              };

              return (
                <div className="space-y-6 print-area">
                  {/* CSS de impressão self-contained premium */}
                  <style dangerouslySetInnerHTML={{__html: `
                    @media print {
                      body {
                        background-color: white !important;
                        color: black !important;
                        font-size: 11px !important;
                      }
                      .no-print {
                        display: none !important;
                      }
                      .print-full-width {
                        width: 100% !important;
                        max-width: 100% !important;
                        padding: 0 !important;
                        margin: 0 !important;
                        border: none !important;
                        box-shadow: none !important;
                      }
                      .print-compact-grid {
                        grid-template-columns: 1fr !important;
                        gap: 12px !important;
                      }
                      .print-area {
                        position: absolute;
                        left: 0;
                        top: 0;
                        width: 100%;
                      }
                      th, td {
                        padding: 6px 8px !important;
                      }
                    }
                  `}} />

                  {/* Header de Impressão (visível apenas na impressão) */}
                  <div className="hidden print:block border-b border-zinc-300 pb-4 mb-4">
                    <h1 className="text-xl font-bold text-zinc-800">Relatório Executivo de Venda de Produtos</h1>
                    <p className="text-xs text-zinc-500 mt-1">
                      Período selecionado: <b>{new Date(from + 'T12:00:00').toLocaleDateString('pt-BR')}</b> até <b>{new Date(to + 'T12:00:00').toLocaleDateString('pt-BR')}</b>
                    </p>
                    <p className="text-[10px] text-zinc-400">
                      Gerado em: {new Date().toLocaleString('pt-BR')} | Perfil: Administrador
                    </p>
                  </div>

                  {/* 1. Cards de Totalizadores Gerais */}
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 print-compact-grid">
                    <div className="bg-white border border-zinc-200 rounded-xl p-5 shadow-sm hover:shadow transition-shadow">
                      <div className="text-xs uppercase tracking-wider text-zinc-400 font-semibold">Receita de Vendas</div>
                      <div className="font-display text-2xl lg:text-3xl font-bold mt-1.5 text-[#3A4F4A]">{fmtBRL(totalFaturamento)}</div>
                      <div className="text-[10px] text-zinc-400 mt-1">Faturamento bruto de produtos</div>
                    </div>

                    <div className="bg-white border border-zinc-200 rounded-xl p-5 shadow-sm hover:shadow transition-shadow">
                      <div className="text-xs uppercase tracking-wider text-zinc-400 font-semibold">Quantidade Vendida</div>
                      <div className="font-display text-2xl lg:text-3xl font-bold mt-1.5 text-zinc-700">{totalQuantidade} <span className="text-xs font-normal text-zinc-400">itens</span></div>
                      <div className="text-[10px] text-zinc-400 mt-1">Média de {(totalQuantidade / Math.max(1, filteredVendas.length)).toFixed(1)} itens por venda</div>
                    </div>

                    <div className="bg-white border border-zinc-200 rounded-xl p-5 shadow-sm hover:shadow transition-shadow">
                      <div className="text-xs uppercase tracking-wider text-zinc-400 font-semibold">Custo de Mercadoria (CMV)</div>
                      <div className="font-display text-2xl lg:text-3xl font-bold mt-1.5 text-rose-600">{fmtBRL(totalCusto)}</div>
                      <div className="text-[10px] text-zinc-400 mt-1">Custo de aquisição unitário</div>
                    </div>

                    <div className="bg-white border border-zinc-200 rounded-xl p-5 shadow-sm hover:shadow transition-shadow">
                      <div className="text-xs uppercase tracking-wider text-zinc-400 font-semibold">Lucro Bruto Operacional</div>
                      <div className="font-display text-2xl lg:text-3xl font-bold mt-1.5 text-emerald-600">{fmtBRL(totalLucro)}</div>
                      <div className="text-[10px] text-zinc-400 mt-1">Margem: {totalFaturamento > 0 ? ((totalLucro / totalFaturamento) * 100).toFixed(1) : 0}%</div>
                    </div>
                  </div>

                  {/* 2. Barra de Pesquisa e Impressão */}
                  <div className="flex flex-wrap items-center justify-between gap-4 bg-zinc-50 border border-zinc-200 rounded-xl p-3 no-print">
                    <div className="flex items-center gap-2 max-w-sm w-full bg-white rounded-lg border border-zinc-200 px-3 py-1.5">
                      <Search className="w-4 h-4 text-zinc-400 shrink-0" />
                      <input
                        placeholder="Buscar por produto, cliente, profissional..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="bg-transparent border-none outline-none text-xs w-full text-zinc-700 placeholder-zinc-400"
                      />
                    </div>
                    <Button onClick={handlePrint} className="bg-[#84A59D] hover:bg-[#6F9189] text-white flex items-center gap-1.5 h-9 text-xs font-semibold shadow-sm">
                      <Printer className="w-4 h-4" /> Imprimir Relatório
                    </Button>
                  </div>

                  {/* 3. Grid de Tabela de Vendas e Breakdowns */}
                  {filteredVendas.length === 0 ? (
                    <div className="bg-white border border-dashed border-zinc-200 rounded-xl p-12 text-center text-zinc-400 shadow-sm print-full-width">
                      Nenhuma venda encontrada com os filtros e busca aplicados.
                    </div>
                  ) : (
                    <div className="space-y-6 print-full-width">
                      {/* Tabela de Vendas (Ocupa 100% da Largura da Tela) */}
                      <div className="bg-white border border-zinc-200 rounded-xl overflow-hidden shadow-sm">
                        <div className="px-5 py-4 border-b border-zinc-100 flex items-center justify-between no-print">
                          <span className="font-semibold text-zinc-700 text-sm">Registros de Vendas ({filteredVendas.length})</span>
                          <span className="text-xs text-zinc-400 font-semibold bg-zinc-100 text-zinc-500 px-2 py-0.5 rounded">
                            Role para o lado se necessário ↔ • Clique no cabeçalho para ordenar
                          </span>
                        </div>
                        
                        {/* Wrapper de Scroll Horizontal customizado e limpo */}
                        <div className="overflow-x-auto w-full custom-scrollbar">
                          <table className="w-full text-xs min-w-[1000px] table-layout-fixed">
                            <thead className="bg-zinc-50 text-zinc-500 border-b border-zinc-200 font-semibold uppercase tracking-wider text-[10px]">
                              <tr>
                                <th 
                                  onClick={() => handleSort("data_venda")} 
                                  className="px-4 py-3 text-left cursor-pointer hover:bg-zinc-100 transition-colors select-none w-[110px]"
                                >
                                  <div className="flex items-center gap-1">
                                    <span>Data</span>
                                    <ArrowUpDown className="w-3 h-3 text-zinc-400" />
                                  </div>
                                </th>
                                <th 
                                  onClick={() => handleSort("produto_nome")} 
                                  className="px-4 py-3 text-left cursor-pointer hover:bg-zinc-100 transition-colors select-none min-w-[180px]"
                                >
                                  <div className="flex items-center gap-1">
                                    <span>Produto</span>
                                    <ArrowUpDown className="w-3 h-3 text-zinc-400" />
                                  </div>
                                </th>
                                <th className="px-4 py-3 text-left min-w-[140px]">Cliente</th>
                                <th className="px-4 py-3 text-left min-w-[140px]">Responsável</th>
                                <th 
                                  onClick={() => handleSort("quantidade")} 
                                  className="px-4 py-3 text-right cursor-pointer hover:bg-zinc-100 transition-colors select-none w-[80px]"
                                >
                                  <div className="flex items-center gap-1 justify-end">
                                    <span>Qtd</span>
                                    <ArrowUpDown className="w-3 h-3 text-zinc-400" />
                                  </div>
                                </th>
                                <th className="px-4 py-3 text-right w-[100px]">Unitário</th>
                                <th 
                                  onClick={() => handleSort("valor_total")} 
                                  className="px-4 py-3 text-right cursor-pointer hover:bg-zinc-100 transition-colors select-none w-[110px]"
                                >
                                  <div className="flex items-center gap-1 justify-end">
                                    <span>Total</span>
                                    <ArrowUpDown className="w-3 h-3 text-zinc-400" />
                                  </div>
                                </th>
                                <th className="px-4 py-3 text-center no-print w-[120px]">Forma</th>
                                <th className="px-4 py-3 text-center w-[90px]">Status</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-zinc-100 text-zinc-600 font-medium">
                              {filteredVendas.map((v) => (
                                <tr key={v.id} className="hover:bg-zinc-50/50 transition-colors">
                                  <td className="px-4 py-3 whitespace-nowrap">
                                    {new Date(v.data_venda).toLocaleDateString("pt-BR")}
                                  </td>
                                  <td className="px-4 py-3">
                                    <div className="font-semibold text-zinc-800">{v.produto_nome}</div>
                                    <div className="text-[10px] text-zinc-400 font-normal flex items-center gap-1">
                                      <Tag className="w-3 h-3" /> {v.categoria}
                                    </div>
                                  </td>
                                  <td className="px-4 py-3 font-normal text-zinc-700 whitespace-nowrap">
                                    {v.cliente_nome}
                                  </td>
                                  <td className="px-4 py-3 font-normal text-zinc-500 whitespace-nowrap">
                                    {v.colaborador_nome}
                                  </td>
                                  <td className="px-4 py-3 text-right font-mono text-zinc-800">
                                    {v.quantidade}
                                  </td>
                                  <td className="px-4 py-3 text-right font-mono font-normal">
                                    {fmtBRL(v.valor_unitario)}
                                  </td>
                                  <td className="px-4 py-3 text-right font-mono font-semibold text-[#3A4F4A]">
                                    {fmtBRL(v.valor_total)}
                                  </td>
                                  <td className="px-4 py-3 text-center no-print">
                                    <div className="flex justify-center gap-1 flex-wrap">
                                      {v.formas_pagamento.length > 0 ? (
                                        v.formas_pagamento.map(f => (
                                          <span key={f} className="px-1.5 py-0.5 bg-zinc-100 border border-zinc-200 text-zinc-600 rounded text-[9px] uppercase font-bold">
                                            {FORMA_LABELS[f] || f}
                                          </span>
                                        ))
                                      ) : (
                                        <span className="text-zinc-400 text-[10px]">-</span>
                                      )}
                                    </div>
                                  </td>
                                  <td className="px-4 py-3 text-center">
                                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${
                                      v.status === "pago"
                                        ? "bg-emerald-50 text-emerald-600 border border-emerald-200"
                                        : "bg-amber-50 text-amber-600 border border-amber-200"
                                    }`}>
                                      {v.status}
                                    </span>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>

                      {/* Painéis de Resumo e Breakdowns posicionados lado a lado no rodapé (2 colunas) */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Por Colaborador */}
                        <div className="bg-white border border-zinc-200 rounded-xl p-5 shadow-sm">
                          <h4 className="text-sm font-semibold text-zinc-700 mb-3 pb-2 border-b border-zinc-100 flex items-center gap-1.5">
                            <User className="w-4 h-4 text-[#84A59D]" /> Vendas por Profissional
                          </h4>
                          {Object.keys(porColab).length === 0 ? (
                            <p className="text-xs text-zinc-400 text-center py-4">Sem dados disponíveis</p>
                          ) : (
                            <div className="space-y-3">
                              {Object.entries(porColab)
                                .sort((a, b) => b[1] - a[1])
                                .map(([name, val]) => (
                                  <div key={name} className="flex items-center justify-between text-xs py-1">
                                    <span className="text-zinc-600 font-semibold">{name}</span>
                                    <span className="font-semibold text-zinc-800 font-mono">{fmtBRL(val)}</span>
                                  </div>
                                ))}
                            </div>
                          )}
                        </div>

                        {/* Por Produto */}
                        <div className="bg-white border border-zinc-200 rounded-xl p-5 shadow-sm">
                          <h4 className="text-sm font-semibold text-zinc-700 mb-3 pb-2 border-b border-zinc-100 flex items-center gap-1.5">
                            <Package className="w-4 h-4 text-[#84A59D]" /> Vendas por Produto
                          </h4>
                          {Object.keys(porProd).length === 0 ? (
                            <p className="text-xs text-zinc-400 text-center py-4">Sem dados disponíveis</p>
                          ) : (
                            <div className="space-y-3">
                              {Object.entries(porProd)
                                .sort((a, b) => b[1] - a[1])
                                .slice(0, 8) // Mostrar top 8 produtos
                                .map(([name, val]) => (
                                  <div key={name} className="flex items-center justify-between text-xs py-1">
                                    <span className="text-zinc-600 font-semibold truncate max-w-[150px]">{name}</span>
                                    <span className="font-semibold text-zinc-800 font-mono">{fmtBRL(val)}</span>
                                  </div>
                                ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })()
          )}
        </TabsContent>

        <TabsContent value="servicos">
          {!servicos ? <div className="text-zinc-400 p-8 text-center">Carregando...</div> : (
            (() => {
              // 1. Calcular a lista filtrada no cliente baseado na busca e ordenação
              const rawServicos = servicos.servicos || [];
              
              const filteredServicos = rawServicos
                .filter(s => {
                  if (!searchQueryServico) return true;
                  const query = searchQueryServico.toLowerCase();
                  return (
                    s.servico_nome.toLowerCase().includes(query) ||
                    (s.colaborador_nome || "").toLowerCase().includes(query) ||
                    (s.auxiliar_nome || "").toLowerCase().includes(query) ||
                    (s.cliente_nome || "").toLowerCase().includes(query)
                  );
                })
                .sort((a, b) => {
                  let valA = a[sortFieldServico];
                  let valB = b[sortFieldServico];
                  
                  if (typeof valA === "string") {
                    valA = valA.toLowerCase();
                    valB = valB.toLowerCase();
                  }
                  
                  if (valA < valB) return sortDirectionServico === "asc" ? -1 : 1;
                  if (valA > valB) return sortDirectionServico === "asc" ? 1 : -1;
                  return 0;
                });

              // 2. Calcular totais dinâmicos baseados na lista filtrada
              const totalFaturamento = filteredServicos.reduce((acc, s) => acc + s.valor, 0);
              const totalQuantidade = filteredServicos.length;
              const totalDuracao = filteredServicos.reduce((acc, s) => acc + (s.duracao || 0), 0);
              const ticketMedio = totalQuantidade > 0 ? (totalFaturamento / totalQuantidade) : 0;

              // 3. Agrupamentos para o painel lateral de desempenho (breakdowns)
              const porColab = {};
              const porServ = {};
              filteredServicos.forEach(s => {
                const cName = s.colaborador_nome || 'Nenhum';
                porColab[cName] = (porColab[cName] || 0) + s.valor;
                
                const sName = s.servico_nome;
                porServ[sName] = (porServ[sName] || 0) + s.valor;
              });

              const handleSort = (field) => {
                if (sortFieldServico === field) {
                  setSortDirectionServico(sortDirectionServico === "asc" ? "desc" : "asc");
                } else {
                  setSortFieldServico(field);
                  setSortDirectionServico("desc");
                }
              };

              const handlePrint = () => {
                window.print();
              };

              return (
                <div className="space-y-6 print-area">
                  {/* CSS de impressão self-contained premium */}
                  <style dangerouslySetInnerHTML={{__html: `
                    @media print {
                      body {
                        background-color: white !important;
                        color: black !important;
                        font-size: 11px !important;
                      }
                      .no-print {
                        display: none !important;
                      }
                      .print-full-width {
                        width: 100% !important;
                        max-width: 100% !important;
                        padding: 0 !important;
                        margin: 0 !important;
                        border: none !important;
                        box-shadow: none !important;
                      }
                      .print-compact-grid {
                        grid-template-columns: 1fr !important;
                        gap: 12px !important;
                      }
                      .print-area {
                        position: absolute;
                        left: 0;
                        top: 0;
                        width: 100%;
                      }
                      th, td {
                        padding: 6px 8px !important;
                      }
                    }
                  `}} />

                  {/* Header de Impressão (visível apenas na impressão) */}
                  <div className="hidden print:block border-b border-zinc-300 pb-4 mb-4">
                    <h1 className="text-xl font-bold text-zinc-800">Relatório Executivo de Prestação de Serviços</h1>
                    <p className="text-xs text-zinc-500 mt-1">
                      Período selecionado: <b>{new Date(from + 'T12:00:00').toLocaleDateString('pt-BR')}</b> até <b>{new Date(to + 'T12:00:00').toLocaleDateString('pt-BR')}</b>
                    </p>
                    <p className="text-[10px] text-zinc-400">
                      Gerado em: {new Date().toLocaleString('pt-BR')} | Perfil: Administrador
                    </p>
                  </div>

                  {/* 1. Cards de Totalizadores Gerais */}
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 print-compact-grid">
                    <div className="bg-white border border-zinc-200 rounded-xl p-5 shadow-sm hover:shadow transition-shadow">
                      <div className="text-xs uppercase tracking-wider text-zinc-400 font-semibold">Receita de Serviços</div>
                      <div className="font-display text-2xl lg:text-3xl font-bold mt-1.5 text-[#3A4F4A]">{fmtBRL(totalFaturamento)}</div>
                      <div className="text-[10px] text-zinc-400 mt-1">Faturamento bruto de serviços</div>
                    </div>

                    <div className="bg-white border border-zinc-200 rounded-xl p-5 shadow-sm hover:shadow transition-shadow">
                      <div className="text-xs uppercase tracking-wider text-zinc-400 font-semibold">Quantidade Realizada</div>
                      <div className="font-display text-2xl lg:text-3xl font-bold mt-1.5 text-zinc-700">{totalQuantidade} <span className="text-xs font-normal text-zinc-400">serviços</span></div>
                      <div className="text-[10px] text-zinc-400 mt-1">Total de procedimentos executados</div>
                    </div>

                    <div className="bg-white border border-zinc-200 rounded-xl p-5 shadow-sm hover:shadow transition-shadow">
                      <div className="text-xs uppercase tracking-wider text-zinc-400 font-semibold">Tempo Total Executado</div>
                      <div className="font-display text-2xl lg:text-3xl font-bold mt-1.5 text-indigo-600 flex items-baseline gap-1">
                        <span>{totalDuracao}</span>
                        <span className="text-xs font-normal text-zinc-400">min</span>
                      </div>
                      <div className="text-[10px] text-zinc-400 mt-1">Equivalente a {(totalDuracao / 60).toFixed(1)} horas de atendimento</div>
                    </div>

                    <div className="bg-white border border-zinc-200 rounded-xl p-5 shadow-sm hover:shadow transition-shadow">
                      <div className="text-xs uppercase tracking-wider text-zinc-400 font-semibold">Ticket Médio por Serviço</div>
                      <div className="font-display text-2xl lg:text-3xl font-bold mt-1.5 text-emerald-600">{fmtBRL(ticketMedio)}</div>
                      <div className="text-[10px] text-zinc-400 mt-1">Valor médio gerado por serviço</div>
                    </div>
                  </div>

                  {/* 2. Barra de Pesquisa e Impressão */}
                  <div className="flex flex-wrap items-center justify-between gap-4 bg-zinc-50 border border-zinc-200 rounded-xl p-3 no-print">
                    <div className="flex items-center gap-2 max-w-sm w-full bg-white rounded-lg border border-zinc-200 px-3 py-1.5">
                      <Search className="w-4 h-4 text-zinc-400 shrink-0" />
                      <input
                        placeholder="Buscar por serviço, cliente, profissional..."
                        value={searchQueryServico}
                        onChange={(e) => setSearchQueryServico(e.target.value)}
                        className="bg-transparent border-none outline-none text-xs w-full text-zinc-700 placeholder-zinc-400"
                      />
                    </div>
                    <Button onClick={handlePrint} className="bg-[#84A59D] hover:bg-[#6F9189] text-white flex items-center gap-1.5 h-9 text-xs font-semibold shadow-sm">
                      <Printer className="w-4 h-4" /> Imprimir Relatório
                    </Button>
                  </div>

                  {/* 3. Grid de Tabela de Serviços e Breakdowns */}
                  {filteredServicos.length === 0 ? (
                    <div className="bg-white border border-dashed border-zinc-200 rounded-xl p-12 text-center text-zinc-400 shadow-sm print-full-width">
                      Nenhum serviço prestado encontrado com os filtros e busca aplicados.
                    </div>
                  ) : (
                    <div className="space-y-6 print-full-width">
                      {/* Tabela de Serviços */}
                      <div className="bg-white border border-zinc-200 rounded-xl overflow-hidden shadow-sm">
                        <div className="px-5 py-4 border-b border-zinc-100 flex items-center justify-between no-print">
                          <span className="font-semibold text-zinc-700 text-sm">Registros de Serviços ({filteredServicos.length})</span>
                          <span className="text-xs text-zinc-400 font-semibold bg-zinc-100 text-zinc-500 px-2 py-0.5 rounded">
                            Role para o lado se necessário ↔ • Clique no cabeçalho para ordenar
                          </span>
                        </div>
                        
                        <div className="overflow-x-auto w-full custom-scrollbar">
                          <table className="w-full text-xs table-auto">
                            <thead className="bg-zinc-50 text-zinc-500 border-b border-zinc-200 font-semibold uppercase tracking-wider text-[10px]">
                              <tr>
                                <th 
                                  onClick={() => handleSort("data_hora")} 
                                  className="px-3 py-3 text-left cursor-pointer hover:bg-zinc-100 transition-colors select-none w-[110px]"
                                >
                                  <div className="flex items-center gap-1">
                                    <span>Data/Hora</span>
                                    <ArrowUpDown className="w-3 h-3 text-zinc-400" />
                                  </div>
                                </th>
                                <th 
                                  onClick={() => handleSort("servico_nome")} 
                                  className="px-3 py-3 text-left cursor-pointer hover:bg-zinc-100 transition-colors select-none"
                                >
                                  <div className="flex items-center gap-1">
                                    <span>Serviço</span>
                                    <ArrowUpDown className="w-3 h-3 text-zinc-400" />
                                  </div>
                                </th>
                                <th className="px-3 py-3 text-left">Cliente</th>
                                <th className="px-3 py-3 text-left">Profissional</th>
                                <th className="px-3 py-3 text-left">Auxiliar</th>
                                <th 
                                  onClick={() => handleSort("duracao")} 
                                  className="px-3 py-3 text-right cursor-pointer hover:bg-zinc-100 transition-colors select-none w-[80px]"
                                >
                                  <div className="flex items-center gap-1 justify-end">
                                    <span>Duração</span>
                                    <ArrowUpDown className="w-3 h-3 text-zinc-400" />
                                  </div>
                                </th>
                                <th 
                                  onClick={() => handleSort("valor")} 
                                  className="px-3 py-3 text-right cursor-pointer hover:bg-zinc-100 transition-colors select-none w-[90px]"
                                >
                                  <div className="flex items-center gap-1 justify-end">
                                    <span>Valor</span>
                                    <ArrowUpDown className="w-3 h-3 text-zinc-400" />
                                  </div>
                                </th>
                                <th className="px-3 py-3 text-center no-print w-[100px]">Forma</th>
                                <th className="px-3 py-3 text-center w-[80px]">Status</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-zinc-100 text-zinc-600 font-medium">
                              {filteredServicos.map((s) => (
                                <tr key={s.id} className="hover:bg-zinc-50/50 transition-colors">
                                  <td className="px-3 py-3 whitespace-nowrap">
                                    {new Date(s.data_hora).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}
                                  </td>
                                  <td className="px-3 py-3">
                                    <div className="font-semibold text-zinc-800">{s.servico_nome}</div>
                                    <div className="text-[10px] text-zinc-400 font-normal">
                                      #{s.agendamento_numero || "N/A"}
                                    </div>
                                  </td>
                                  <td className="px-3 py-3 font-normal text-zinc-700 whitespace-nowrap">
                                    {s.cliente_nome}
                                  </td>
                                  <td className="px-3 py-3 font-normal text-zinc-500 whitespace-nowrap">
                                    {s.colaborador_nome}
                                  </td>
                                  <td className="px-3 py-3 font-normal text-zinc-400 whitespace-nowrap">
                                    {s.auxiliar_nome || <span className="text-zinc-300">-</span>}
                                  </td>
                                  <td className="px-3 py-3 text-right font-mono text-zinc-850">
                                    {s.duracao} min
                                  </td>
                                  <td className="px-3 py-3 text-right font-mono font-semibold text-[#3A4F4A]">
                                    {fmtBRL(s.valor)}
                                  </td>
                                  <td className="px-3 py-3 text-center no-print">
                                    <div className="flex justify-center gap-1 flex-wrap">
                                      {s.formas_pagamento.length > 0 ? (
                                        s.formas_pagamento.map(f => (
                                          <span key={f} className="px-1.5 py-0.5 bg-zinc-100 border border-zinc-200 text-zinc-600 rounded text-[9px] uppercase font-bold">
                                            {FORMA_LABELS[f] || f}
                                          </span>
                                        ))
                                      ) : (
                                        <span className="text-zinc-400 text-[10px]">-</span>
                                      )}
                                    </div>
                                  </td>
                                  <td className="px-3 py-3 text-center">
                                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${
                                      s.status === "concluido"
                                        ? "bg-emerald-50 text-emerald-600 border border-emerald-200"
                                        : s.status === "cancelado"
                                        ? "bg-rose-50 text-rose-600 border border-rose-200"
                                        : "bg-amber-50 text-amber-600 border border-amber-200"
                                    }`}>
                                      {s.status}
                                    </span>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>

                      {/* Painéis de Resumo e Breakdowns posicionados lado a lado no rodapé (2 colunas) */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Por Colaborador */}
                        <div className="bg-white border border-zinc-200 rounded-xl p-5 shadow-sm">
                          <h4 className="text-sm font-semibold text-zinc-700 mb-3 pb-2 border-b border-zinc-100 flex items-center gap-1.5">
                            <User className="w-4 h-4 text-[#84A59D]" /> Serviços por Profissional
                          </h4>
                          {Object.keys(porColab).length === 0 ? (
                            <p className="text-xs text-zinc-400 text-center py-4">Sem dados disponíveis</p>
                          ) : (
                            <div className="space-y-3">
                              {Object.entries(porColab)
                                .sort((a, b) => b[1] - a[1])
                                .map(([name, val]) => (
                                  <div key={name} className="flex items-center justify-between text-xs py-1">
                                    <span className="text-zinc-600 font-semibold">{name}</span>
                                    <span className="font-semibold text-zinc-800 font-mono">{fmtBRL(val)}</span>
                                  </div>
                                ))}
                            </div>
                          )}
                        </div>

                        {/* Por Procedimento */}
                        <div className="bg-white border border-zinc-200 rounded-xl p-5 shadow-sm">
                          <h4 className="text-sm font-semibold text-zinc-700 mb-3 pb-2 border-b border-zinc-100 flex items-center gap-1.5">
                            <Scissors className="w-4 h-4 text-[#84A59D]" /> Serviços por Procedimento
                          </h4>
                          {Object.keys(porServ).length === 0 ? (
                            <p className="text-xs text-zinc-400 text-center py-4">Sem dados disponíveis</p>
                          ) : (
                            <div className="space-y-3">
                              {Object.entries(porServ)
                                .sort((a, b) => b[1] - a[1])
                                .slice(0, 8) // Mostrar top 8 procedimentos
                                .map(([name, val]) => (
                                  <div key={name} className="flex items-center justify-between text-xs py-1">
                                    <span className="text-zinc-600 font-semibold truncate max-w-[150px]">{name}</span>
                                    <span className="font-semibold text-zinc-800 font-mono">{fmtBRL(val)}</span>
                                  </div>
                                ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })()
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

const Row = ({ label, value, bold, negative, highlight }) => (
  <div className={`flex items-center justify-between py-1 ${bold ? "text-base font-semibold" : "text-sm"} ${highlight ? "text-[#3A4F4A]" : ""}`}>
    <span className="text-zinc-600 font-medium">{label}</span>
    <span className={`font-display ${bold ? "text-xl font-bold" : ""} ${negative ? "text-rose-600" : ""} ${highlight ? "text-2xl text-[#3A4F4A]" : ""}`}>{fmtBRL(value)}</span>
  </div>
);
