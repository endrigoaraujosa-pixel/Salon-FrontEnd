import React, { useEffect, useState } from "react";
import http from "../api";
import { PageHeader } from "../components/Page";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "../components/ui/tabs";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "../components/ui/select";
import SearchableSelect from "../components/SearchableSelect";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "../components/ui/dialog";
import { FileText, Banknote, Package, TrendingUp, TrendingDown, User, Printer, Search, ArrowUpDown, Tag, Scissors, Clock, HelpCircle, Filter } from "lucide-react";

const fmtBRL = (n) => (n || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const todayStr = () => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const firstDayMonth = () => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}-01`;
};

const getDaysAgoStr = (days) => {
  const d = new Date();
  d.setDate(d.getDate() - days);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const getStartOfWeekStr = () => {
  const d = new Date();
  d.setDate(d.getDate() - d.getDay());
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const FORMA_LABELS = {
  dinheiro: "Dinheiro", pix: "PIX",
  cartao_credito: "Cartão Crédito", cartao_debito: "Cartão Débito",
  vale: "Vale-alimentação", geral: "Total geral"
};

const PresetButtons = ({ onPick }) => {
  const presets = [
    { l: "Hoje", from: todayStr(), to: todayStr() },
    { l: "Esta semana", from: getStartOfWeekStr(), to: todayStr() },
    { l: "Este mês", from: firstDayMonth(), to: todayStr() },
    { l: "Últimos 30 dias", from: getDaysAgoStr(30), to: todayStr() },
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
  const [resultadoOperacional, setResultadoOperacional] = useState(null);
  const [filterUnidade, setFilterUnidade] = useState("todas");
  const [filterOperacionalColab, setFilterOperacionalColab] = useState("todos");
  const [filterOperacionalCatServico, setFilterOperacionalCatServico] = useState("todos");
  const [filterOperacionalCatProduto, setFilterOperacionalCatProduto] = useState("todos");

  // Sorting for Operational Result Reports
  const [sortServicoField, setSortServicoField] = useState("faturamento");
  const [sortServicoDirection, setSortServicoDirection] = useState("desc");
  const [sortProdutoField, setSortProdutoField] = useState("faturamento");
  const [sortProdutoDirection, setSortProdutoDirection] = useState("desc");
  const [sortVendaField, setSortVendaField] = useState("data");
  const [sortVendaDirection, setSortVendaDirection] = useState("desc");

  // Search queries for Operational Result Reports
  const [searchOperServico, setSearchOperServico] = useState("");
  const [searchOperProduto, setSearchOperProduto] = useState("");
  const [searchOperVenda, setSearchOperVenda] = useState("");

  const [dreDetailsOpen, setDreDetailsOpen] = useState(false);
  const [hasInitializedCaixa, setHasInitializedCaixa] = useState(false);
  const [detailsForma, setDetailsForma] = useState(null);
  const [detailsSearchQuery, setDetailsSearchQuery] = useState("");
  
  // DRE specific filters
  const [filterDreCategory, setFilterDreCategory] = useState("todos");
  const [filterDreStatus, setFilterDreStatus] = useState("todos");

  // Drilldown states
  const [drilldownOpen, setDrilldownOpen] = useState(false);
  const [drilldownTitle, setDrilldownTitle] = useState("");
  const [drilldownData, setDrilldownData] = useState([]);
  
  // Estados para filtros
  const [colaboradores, setColaboradores] = useState([]);
  const [colaboradorId, setColaboradorId] = useState("todos"); // Usado no Caixa
  const [categoriesList, setCategoriesList] = useState([]);

  const [produtosList, setProdutosList] = useState([]);
  const [servicosList, setServicosList] = useState([]);
  const [clientesList, setClientesList] = useState([]);
  const [empresa, setEmpresa] = useState(null);
  
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
    http.get("/categorias").then((r) => setCategoriesList(r.data || [])).catch(() => {});
    http.get("/configuracoes/empresa").then((r) => setEmpresa(r.data)).catch(() => {});
  }, []);

  useEffect(() => {
    if (tab === "caixa" && !hasInitializedCaixa) {
      setFrom(todayStr());
      setTo(todayStr());
      setHasInitializedCaixa(true);
    }
  }, [tab, hasInitializedCaixa]);

  const reload = () => {
    const params = { data_inicio: from, data_fim: to };
    if (tab === "dre") {
      const dreParams = {
        data_inicio: from,
        data_fim: to,
        categoria: filterDreCategory,
        status: filterDreStatus
      };
      http.get("/relatorios/dre", { params: dreParams })
        .then((r) => setDre(r.data))
        .catch((err) => {
          console.error("DRE error:", err);
          setDre({
            receita_servicos: 0,
            receita_vendas_diretas: 0,
            outras_receitas: 0,
            receita_bruta: 0,
            custo_produtos: 0,
            lucro_bruto: 0,
            despesas: { fixas: 0, variaveis: 0 },
            taxas_cartao: { credito: 0, debito: 0, total: 0 },
            despesas_operacionais: 0,
            lucro_liquido: 0,
            total_atendimentos: 0,
            total_vendas_diretas: 0,
            detalhes: { agendamentos: [], vendas: [], outras_receitas: [], despesas: [] }
          });
        });
    }
    if (tab === "caixa") {
      const caixaParams = { ...params, colaborador_id: colaboradorId };
      http.get("/relatorios/caixa", { params: caixaParams })
        .then((r) => setCaixa(r.data))
        .catch((err) => {
          console.error("Caixa error:", err);
          setCaixa({ pagamentos: [], total: 0 });
        });
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
      http.get("/relatorios/produtos", { params: prodParams })
        .then((r) => setProdutos(r.data))
        .catch((err) => {
          console.error("Produtos error:", err);
          setProdutos([]);
        });
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
      http.get("/relatorios/servicos", { params: servParams })
        .then((r) => setServicos(r.data))
        .catch((err) => {
          console.error("Servicos error:", err);
          setServicos([]);
        });
    }
    if (["resultado_consolidado", "rentabilidade_servicos", "rentabilidade_produtos", "analitico_vendas"].includes(tab)) {
      const operParams = {
        data_inicio: from,
        data_fim: to,
        colaborador_id: filterOperacionalColab,
        categoria_servico: filterOperacionalCatServico,
        categoria_produto: filterOperacionalCatProduto
      };
      http.get("/relatorios/resultado-operacional", { params: operParams })
        .then((r) => setResultadoOperacional(r.data))
        .catch((err) => {
          console.error("Resultado Operacional error:", err);
          setResultadoOperacional({
            consolidado: { receita_servicos: 0, receita_produtos: 0, receita_total: 0, cmv: 0, comissoes: 0, taxas: 0, resultado_operacional: 0, margem_operacional: 0 },
            servicos: [],
            produtos: [],
            vendas: []
          });
        });
    }
  };

  useEffect(() => { 
    reload(); 
  }, [
    tab, from, to, colaboradorId,
    filterColaborador, filterProduto, filterCategoria, filterFormaPagamento, filterCliente, filterStatus,
    filterColaboradorServico, filterServico, filterFormaPagamentoServico, filterClienteServico, filterStatusServico,
    filterDreCategory, filterDreStatus,
    filterOperacionalColab, filterOperacionalCatServico, filterOperacionalCatProduto
  ]);

  const SortHeader = ({ label, field, currentField, direction, onSort }) => {
    const active = field === currentField;
    return (
      <button 
        type="button" 
        onClick={() => onSort(field)}
        className="inline-flex items-center gap-1 hover:text-[#3A4F4A] transition-colors font-semibold"
      >
        <span>{label}</span>
        <ArrowUpDown className={`w-3.5 h-3.5 ${active ? 'text-[#84A59D]' : 'text-zinc-300'}`} />
      </button>
    );
  };

  const handleExport = (format, title, headers, keys, rows) => {
    if (format === 'csv') {
      const csvHeaders = headers.join(";");
      const csvRows = rows.map(row => 
        keys.map(key => {
          let val = row[key];
          if (typeof val === 'number') {
            return String(val).replace('.', ',');
          }
          if (typeof val === 'string') {
            return `"${val.replace(/"/g, '""')}"`;
          }
          return val === null || val === undefined ? '' : String(val);
        }).join(";")
      );
      
      const content = [csvHeaders, ...csvRows].join("\r\n");
      const blob = new Blob(["\uFEFF" + content], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `${title}_${from}_to_${to}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else if (format === 'xlsx') {
      let html = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">`;
      html += `<head><meta charset="utf-8" /><style>table { border-collapse: collapse; } th { background-color: #f4f4f5; font-weight: bold; border: 1px solid #d4d4d8; } td { border: 1px solid #e4e4e7; }</style></head><body>`;
      html += `<h2>${title}</h2>`;
      html += `<p>Período: ${from} a ${to}</p>`;
      html += `<table><thead><tr>`;
      headers.forEach(h => {
        html += `<th>${h}</th>`;
      });
      html += `</tr></thead><tbody>`;
      rows.forEach(row => {
        html += `<tr>`;
        keys.forEach(key => {
          let val = row[key];
          if (typeof val === 'number') {
            html += `<td style="mso-number-format:'\\#\\,\\#\\#0\\.00';">${val}</td>`;
          } else {
            html += `<td>${val === null || val === undefined ? '' : val}</td>`;
          }
        });
        html += `</tr>`;
      });
      html += `</tbody></table></body></html>`;

      const blob = new Blob([html], { type: 'application/vnd.ms-excel;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `${title}_${from}_to_${to}.xls`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const sortedAndFilteredServicos = (resultadoOperacional?.servicos || [])
    .filter(s => s.servico_nome.toLowerCase().includes(searchOperServico.toLowerCase()))
    .sort((a, b) => {
      const valA = a[sortServicoField];
      const valB = b[sortServicoField];
      if (typeof valA === 'string') {
        return sortServicoDirection === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
      }
      return sortServicoDirection === 'asc' ? valA - valB : valB - valA;
    });

  const sortedAndFilteredProdutos = (resultadoOperacional?.produtos || [])
    .filter(p => p.produto_nome.toLowerCase().includes(searchOperProduto.toLowerCase()))
    .sort((a, b) => {
      const valA = a[sortProdutoField];
      const valB = b[sortProdutoField];
      if (typeof valA === 'string') {
        return sortProdutoDirection === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
      }
      return sortProdutoDirection === 'asc' ? valA - valB : valB - valA;
    });

  const sortedAndFilteredVendas = (resultadoOperacional?.vendas || [])
    .filter(v => 
      v.cliente.toLowerCase().includes(searchOperVenda.toLowerCase()) ||
      v.profissional.toLowerCase().includes(searchOperVenda.toLowerCase()) ||
      v.numero.toLowerCase().includes(searchOperVenda.toLowerCase())
    )
    .sort((a, b) => {
      const valA = a[sortVendaField];
      const valB = b[sortVendaField];
      if (typeof valA === 'string') {
        return sortVendaDirection === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
      }
      return sortVendaDirection === 'asc' ? valA - valB : valB - valA;
    });

  const handleDrilldown = (title, data) => {
    setDrilldownTitle(title);
    setDrilldownData(data || []);
    setDrilldownOpen(true);
  };

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
            <SearchableSelect
              placeholder="Todos os usuários"
              searchPlaceholder="Pesquisar profissional..."
              options={[
                { value: "todos", label: "Todos os usuários" },
                ...colaboradores.map((c) => ({ value: c.id, label: c.nome }))
              ]}
              value={colaboradorId}
              onValueChange={setColaboradorId}
            />
          </div>
        )}

        <div className="w-full lg:flex-1 sm:col-span-2 lg:col-span-1">
          <Label className="text-xs uppercase font-bold text-zinc-400 tracking-wider">Atalhos de Período</Label>
          <PresetButtons onPick={(a, b) => { setFrom(a); setTo(b); }} />
        </div>
      </div>

      {["resultado_consolidado", "rentabilidade_servicos", "rentabilidade_produtos", "analitico_vendas"].includes(tab) && (
        <div className="bg-white border border-zinc-200 rounded-xl p-4 mb-6 shadow-sm no-print">
          <div className="flex items-center gap-2 mb-3 text-[#3A4F4A] font-semibold text-sm">
            <Filter className="w-4 h-4 text-[#84A59D]" />
            <span>Filtros do Resultado Operacional</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {/* Unidade */}
            <div>
              <Label className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider">Unidade</Label>
              <Select value={filterUnidade} onValueChange={setFilterUnidade}>
                <SelectTrigger className="bg-white h-9 text-xs">
                  <SelectValue placeholder="Matriz (Todas)" />
                </SelectTrigger>
                <SelectContent className="bg-white border border-zinc-200">
                  <SelectItem value="todas">Matriz (Todas)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Profissional */}
            <div>
              <Label className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider">Profissional</Label>
              <SearchableSelect
                placeholder="Todos os profissionais"
                searchPlaceholder="Pesquisar profissional..."
                options={[
                  { value: "todos", label: "Todos os profissionais" },
                  ...colaboradores.map((c) => ({ value: c.id, label: c.nome }))
                ]}
                value={filterOperacionalColab}
                onValueChange={setFilterOperacionalColab}
              />
            </div>

            {/* Categoria de Serviço */}
            <div>
              <Label className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider">Categoria de Serviço</Label>
              <SearchableSelect
                placeholder="Todas as categorias"
                searchPlaceholder="Pesquisar..."
                options={[
                  { value: "todos", label: "Todas as categorias" },
                  ...categoriesList.map((cat) => ({
                    value: cat.id,
                    label: cat.nome
                  }))
                ]}
                value={filterOperacionalCatServico}
                onValueChange={setFilterOperacionalCatServico}
              />
            </div>

            {/* Categoria de Produto */}
            <div>
              <Label className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider">Categoria de Produto</Label>
              <SearchableSelect
                placeholder="Todas as categorias"
                searchPlaceholder="Pesquisar..."
                options={[
                  { value: "todos", label: "Todas as categorias" },
                  ...[...new Set(produtosList.map(p => p.categoria).filter(Boolean))].map((cat) => ({
                    value: cat,
                    label: cat
                  }))
                ]}
                value={filterOperacionalCatProduto}
                onValueChange={setFilterOperacionalCatProduto}
              />
            </div>
          </div>
        </div>
      )}

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
              <SearchableSelect
                placeholder="Todos os colaboradores"
                searchPlaceholder="Pesquisar colaborador..."
                options={[
                  { value: "todos", label: "Todos os colaboradores" },
                  ...colaboradores.map((c) => ({ value: c.id, label: c.nome }))
                ]}
                value={filterColaborador}
                onValueChange={setFilterColaborador}
              />
            </div>

            {/* Produto */}
            <div>
              <Label className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider">Produto</Label>
              <SearchableSelect
                placeholder="Todos os produtos"
                searchPlaceholder="Pesquisar produto..."
                options={[
                  { value: "todos", label: "Todos os produtos" },
                  ...produtosList.map((p) => ({ value: p.id, label: p.nome }))
                ]}
                value={filterProduto}
                onValueChange={setFilterProduto}
              />
            </div>

            {/* Categoria */}
            <div>
              <Label className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider">Categoria</Label>
              <SearchableSelect
                placeholder="Todas as categorias"
                searchPlaceholder="Pesquisar categoria..."
                options={[
                  { value: "todos", label: "Todas as categorias" },
                  ...[...new Set(produtosList.map(p => p.categoria).filter(Boolean))].map((cat) => ({
                    value: cat,
                    label: cat
                  }))
                ]}
                value={filterCategoria}
                onValueChange={setFilterCategoria}
              />
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
              <SearchableSelect
                placeholder="Todos os clientes"
                searchPlaceholder="Pesquisar cliente..."
                options={[
                  { value: "todos", label: "Todos os clientes" },
                  ...clientesList.map((c) => ({ value: c.id, label: c.nome }))
                ]}
                value={filterCliente}
                onValueChange={setFilterCliente}
              />
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
              <SearchableSelect
                placeholder="Todos os profissionais"
                searchPlaceholder="Pesquisar profissional..."
                options={[
                  { value: "todos", label: "Todos os profissionais" },
                  ...colaboradores.map((c) => ({ value: c.id, label: c.nome }))
                ]}
                value={filterColaboradorServico}
                onValueChange={setFilterColaboradorServico}
              />
            </div>

            {/* Serviço */}
            <div>
              <Label className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider">Serviço</Label>
              <SearchableSelect
                placeholder="Todos os serviços"
                searchPlaceholder="Pesquisar serviço..."
                options={[
                  { value: "todos", label: "Todos os serviços" },
                  ...servicosList.map((s) => ({ value: s.id, label: s.nome }))
                ]}
                value={filterServico}
                onValueChange={setFilterServico}
              />
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
              <SearchableSelect
                placeholder="Todos os clientes"
                searchPlaceholder="Pesquisar cliente..."
                options={[
                  { value: "todos", label: "Todos os clientes" },
                  ...clientesList.map((c) => ({ value: c.id, label: c.nome }))
                ]}
                value={filterClienteServico}
                onValueChange={setFilterClienteServico}
              />
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

      {tab === "dre" && (
        <div className="bg-white border border-zinc-200 rounded-xl p-4 mb-6 shadow-sm no-print">
          <div className="flex items-center gap-2 mb-3 text-[#3A4F4A] font-semibold text-sm">
            <Filter className="w-4 h-4 text-[#84A59D]" />
            <span>Filtros Adicionais para DRE</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-xl">
            {/* Categoria */}
            <div>
              <Label className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider">Categoria</Label>
              <Select value={filterDreCategory} onValueChange={setFilterDreCategory}>
                <SelectTrigger className="bg-white h-9 text-xs">
                  <SelectValue placeholder="Todas" />
                </SelectTrigger>
                <SelectContent className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-800 dark:text-zinc-150">
                  <SelectItem value="todos">Todas as Categorias</SelectItem>
                  {[
                    ...new Set([
                      "Salários", "Aluguel", "Luz", "Internet", "Produtos", "Água", "Marketing", "Juros", "Multas", "Devoluções", "Bônus", "Reembolsos", "Aluguel de espaço", "Venda de ativos", "Investimentos", "Outros",
                      ...categoriesList.map(c => c.nome)
                    ].filter(Boolean))
                  ].map(cat => (
                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Status */}
            <div>
              <Label className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider">Status Financeiro</Label>
              <Select value={filterDreStatus} onValueChange={setFilterDreStatus}>
                <SelectTrigger className="bg-white h-9 text-xs">
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-800 dark:text-zinc-150">
                  <SelectItem value="todos">Todos os Status (Competência)</SelectItem>
                  <SelectItem value="pago">Pago / Recebido (Caixa Realizado)</SelectItem>
                  <SelectItem value="pendente">Pendente / Aberto (A Receber/Pagar)</SelectItem>
                  <SelectItem value="vencido">Vencido (Em Atraso)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @media print {
          body {
            background: white !important;
            color: black !important;
          }
          .no-print {
            display: none !important;
          }
          .print-full-width {
            width: 100% !important;
            max-width: 100% !important;
            border: none !important;
            box-shadow: none !important;
          }
        }
      `}</style>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="mb-6 bg-zinc-100 p-1 rounded-lg flex overflow-x-auto max-w-full no-scrollbar whitespace-nowrap">
          <TabsTrigger value="dre" data-testid="tab-dre" className="flex items-center gap-1.5 shrink-0"><FileText className="w-4 h-4" /> DRE</TabsTrigger>
          <TabsTrigger value="caixa" data-testid="tab-caixa" className="flex items-center gap-1.5 shrink-0"><Banknote className="w-4 h-4" /> Caixa</TabsTrigger>
          <TabsTrigger value="produtos" data-testid="tab-produtos" className="flex items-center gap-1.5 shrink-0"><Package className="w-4 h-4" /> Produtos</TabsTrigger>
          <TabsTrigger value="servicos" data-testid="tab-servicos" className="flex items-center gap-1.5 shrink-0"><Scissors className="w-4 h-4" /> Serviços</TabsTrigger>
          <TabsTrigger value="resultado_consolidado" data-testid="tab-res-consolidado" className="flex items-center gap-1.5 shrink-0"><TrendingUp className="w-4 h-4" /> Resultado Consolidado</TabsTrigger>
          <TabsTrigger value="rentabilidade_servicos" data-testid="tab-res-servicos" className="flex items-center gap-1.5 shrink-0"><Scissors className="w-4 h-4" /> Rentabilidade de Serviços</TabsTrigger>
          <TabsTrigger value="rentabilidade_produtos" data-testid="tab-res-produtos" className="flex items-center gap-1.5 shrink-0"><Package className="w-4 h-4" /> Rentabilidade de Produtos</TabsTrigger>
          <TabsTrigger value="analitico_vendas" data-testid="tab-res-analitico" className="flex items-center gap-1.5 shrink-0"><FileText className="w-4 h-4" /> Analítico por Venda</TabsTrigger>
        </TabsList>

        <TabsContent value="dre">
          {!dre ? <div className="text-zinc-400 p-8 text-center">Carregando...</div> : (
            <div className="space-y-6 print-full-width">
              {/* Print Only Header */}
              <div className="hidden print:block mb-8 border-b-2 border-zinc-900 pb-4">
                <div className="flex justify-between items-end">
                  <div>
                    <h1 className="text-2xl font-bold tracking-tight text-zinc-900">{empresa?.nome_fantasia || "STUDIO APP"}</h1>
                    <p className="text-xs text-zinc-500">Demonstrativo de Resultado do Exercício (DRE)</p>
                  </div>
                  <div className="text-right text-xs text-zinc-500">
                    <div><strong>Período:</strong> {from ? new Date(from + 'T12:00:00').toLocaleDateString('pt-BR') : '-'} a {to ? new Date(to + 'T12:00:00').toLocaleDateString('pt-BR') : '-'}</div>
                    <div><strong>Gerado em:</strong> {new Date().toLocaleString('pt-BR')}</div>
                  </div>
                </div>
              </div>

              {/* Overview Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 no-print">
                {/* Total Receitas */}
                <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">Total de Receitas</span>
                    <TrendingUp className="w-5 h-5 text-emerald-500" />
                  </div>
                  <div className="font-display text-3xl font-bold mt-2 text-zinc-800 dark:text-zinc-100">{fmtBRL(dre.receita_bruta)}</div>
                  <p className="text-[10px] text-zinc-500 mt-1">Serviços, vendas e outras receitas</p>
                </div>

                {/* Total Despesas */}
                <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">Total de Despesas</span>
                    <TrendingDown className="w-5 h-5 text-rose-500" />
                  </div>
                  <div className="font-display text-3xl font-bold mt-2 text-zinc-800 dark:text-zinc-100">
                    {fmtBRL(dre.despesas_operacionais + (dre.custo_produtos || 0))}
                  </div>
                  <p className="text-[10px] text-zinc-500 mt-1">Operacionais, CMV e taxas de cartão</p>
                </div>

                {/* Resultado Líquido */}
                <div className={`border rounded-2xl p-5 shadow-sm hover:shadow-md transition-all ${
                  dre.lucro_liquido >= 0 
                    ? "bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-255 dark:border-emerald-800/40" 
                    : "bg-rose-50/50 dark:bg-rose-950/20 border-rose-255 dark:border-rose-800/40"
                }`}>
                  <div className="flex items-center justify-between">
                    <span className={`text-xs font-bold uppercase tracking-wider ${dre.lucro_liquido >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`}>
                      Resultado Líquido
                    </span>
                    {dre.lucro_liquido >= 0 ? (
                      <TrendingUp className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                    ) : (
                      <TrendingDown className="w-5 h-5 text-rose-600 dark:text-rose-400" />
                    )}
                  </div>
                  <div className={`font-display text-3xl font-black mt-2 ${dre.lucro_liquido >= 0 ? "text-emerald-700 dark:text-emerald-300" : "text-rose-700 dark:text-rose-300"}`}>
                    {fmtBRL(dre.lucro_liquido)}
                  </div>
                  <p className="text-[10px] text-zinc-500 mt-1">
                    {dre.lucro_liquido >= 0 ? "Lucro líquido do período" : "Prejuízo líquido do período"}
                  </p>
                </div>
              </div>

              <div className="grid lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 bg-white border border-zinc-200 rounded-xl p-4 sm:p-6 space-y-4 shadow-sm print-full-width">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-zinc-100 pb-3 dark:border-zinc-800 gap-3">
                    <h3 className="font-display text-lg font-medium text-zinc-800 dark:text-zinc-100">Demonstração de Resultado</h3>
                    <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                      <Button 
                        onClick={() => window.print()}
                        variant="outline" 
                        size="sm" 
                        className="text-zinc-600 hover:text-zinc-800 border-zinc-200 flex items-center gap-1.5 h-8 px-2.5 text-xs font-semibold rounded-lg dark:border-zinc-800 dark:text-zinc-300 no-print"
                      >
                        <Printer className="w-4 h-4 text-zinc-400" /> Exportar PDF
                      </Button>
                    <Dialog open={dreDetailsOpen} onOpenChange={setDreDetailsOpen}>
                      <DialogTrigger asChild>
                        <Button variant="ghost" size="sm" className="text-[#84A59D] hover:text-[#6F9189] hover:bg-[#EAF0EE] flex items-center gap-1.5 h-8 px-2.5 text-xs font-semibold rounded-lg dark:hover:bg-[#3A4F4A]/30 no-print">
                          <HelpCircle className="w-4 h-4" /> Como é calculado?
                        </Button>
                      </DialogTrigger>
                    <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
                      <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                          <FileText className="w-5 h-5 text-[#84A59D]" />
                          <span>Entendendo o DRE (Origem e Composição)</span>
                        </DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4 my-2 text-sm text-zinc-600 dark:text-zinc-300">
                        <p className="text-xs text-zinc-500">
                          A Demonstração de Resultado do Exercício (DRE) apresenta o confronto entre as receitas operacionais, custos e despesas operacionais no período selecionado para apurar se a empresa obteve lucro ou prejuízo.
                        </p>

                        <div className="space-y-3 divide-y divide-zinc-100 dark:divide-zinc-800">
                          <div className="pt-2">
                            <span className="font-semibold text-zinc-800 dark:text-zinc-100 block">Receita de Serviços</span>
                            <span className="text-xs text-zinc-500">Soma de todas as prestações de serviços concluídas e pagas/agendadas no período selecionado.</span>
                          </div>

                          <div className="pt-3">
                            <span className="font-semibold text-zinc-800 dark:text-zinc-100 block">Receita de Vendas Diretas</span>
                            <span className="text-xs text-zinc-500">Faturamento total obtido através da comercialização direta de produtos físicos no balcão da loja.</span>
                          </div>

                          <div className="pt-3">
                            <span className="font-semibold text-zinc-800 dark:text-zinc-100 block">Outras Receitas</span>
                            <span className="text-xs text-zinc-500">Valores adicionais recebidos pela empresa que não fazem parte do core business (ex: comissões extras, parcerias, taxas de terceiros).</span>
                          </div>

                          <div className="pt-3">
                            <span className="font-semibold text-zinc-800 dark:text-zinc-100 block">Receita Bruta</span>
                            <span className="text-xs font-mono text-[#84A59D] block">Fórmula: Receita de Serviços + Receita de Vendas Diretas + Outras Receitas</span>
                            <span className="text-xs text-zinc-500">Representa a entrada financeira total bruta da empresa antes de qualquer dedução de custos ou impostos.</span>
                          </div>

                          <div className="pt-3">
                            <span className="font-semibold text-rose-500 block">(-) Custo dos Produtos Vendidos (CMV)</span>
                            <span className="text-xs text-zinc-500">Custo direto de aquisição/fornecedor das mercadorias que foram vendidas no período analisado.</span>
                          </div>

                          <div className="pt-3">
                            <span className="font-semibold text-zinc-800 dark:text-zinc-100 block">Lucro Bruto</span>
                            <span className="text-xs font-mono text-emerald-600 block">Fórmula: Receita Bruta - Custo dos Produtos Vendidos (CMV)</span>
                            <span className="text-xs text-zinc-500">O resultado operacional bruto da empresa após deduzir o custo direto de fabricação ou aquisição de produtos.</span>
                          </div>

                          <div className="pt-3">
                            <span className="font-semibold text-zinc-800 dark:text-zinc-100 block">Despesas Operacionais</span>
                            <span className="text-xs text-zinc-500">Soma consolidada de todos os gastos fixos e variáveis indispensáveis para manter o estabelecimento aberto e operando.</span>
                          </div>

                          <div className="pt-3 pl-3 border-l-2 border-zinc-200 dark:border-zinc-700 space-y-2">
                            <div>
                              <span className="font-medium text-zinc-700 dark:text-zinc-200 block">(-) Despesas Fixas</span>
                              <span className="text-xs text-zinc-500">Gastos fixos recorrentes que não flutuam com as vendas (ex: aluguel, internet, salários de colaboradores fixos).</span>
                            </div>
                            <div>
                              <span className="font-medium text-zinc-700 dark:text-zinc-200 block">(-) Despesas Variáveis</span>
                              <span className="text-xs text-zinc-500">Custos variáveis que oscilam de acordo com o volume de vendas/atividade (ex: impostos diretos, insumos).</span>
                            </div>
                            <div>
                              <span className="font-medium text-zinc-700 dark:text-zinc-200 block">(-) Taxas de Cartão de Crédito / Débito</span>
                              <span className="text-xs text-zinc-500">Tarifas cobradas pelas adquirentes e operadoras de cartão de crédito e débito sobre cada transação financeira realizada.</span>
                            </div>
                          </div>

                          <div className="pt-3">
                            <span className="font-semibold text-zinc-800 dark:text-zinc-100 block">Total Despesas Operacionais</span>
                            <span className="text-xs font-mono text-rose-500 block">Fórmula: Despesas Fixas + Despesas Variáveis + Taxas de Cartão</span>
                            <span className="text-xs text-zinc-500">Gasto operacional consolidado total do estabelecimento no período selecionado.</span>
                          </div>

                          <div className="pt-3">
                            <span className="font-semibold text-zinc-800 dark:text-zinc-100 block">Lucro Líquido</span>
                            <span className="text-xs font-mono text-emerald-600 block">Fórmula: Lucro Bruto - Total Despesas Operacionais</span>
                            <span className="text-xs text-zinc-500">Resultado final líquido do estabelecimento. Se positivo, representa o lucro líquido real; se negativo, prejuízo.</span>
                          </div>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </div>
                <div className="space-y-3 text-sm divide-y divide-zinc-100 dark:divide-zinc-800">
                  <div className="pt-2">
                    <DRE_Row 
                      label="Receita de Serviços" 
                      value={dre.receita_servicos} 
                      onClick={() => handleDrilldown("Receita de Serviços", dre.detalhes?.agendamentos)}
                    />
                  </div>
                  <div className="pt-2">
                    <DRE_Row 
                      label="Receita de Vendas Diretas" 
                      value={dre.receita_vendas_diretas} 
                      onClick={() => handleDrilldown("Receita de Vendas Diretas", dre.detalhes?.vendas)}
                    />
                  </div>
                  <div className="pt-2">
                    <DRE_Row 
                      label="Outras Receitas" 
                      value={dre.outras_receitas} 
                      onClick={() => handleDrilldown("Outras Receitas", dre.detalhes?.outras_receitas)}
                    />
                  </div>

                  {/* Outras Receitas por Categoria */}
                  {dre.receitas_por_categoria && Object.keys(dre.receitas_por_categoria).length > 0 && (
                    <div className="pt-3 pl-3 border-l border-zinc-200 dark:border-zinc-700 mt-2 space-y-1 bg-zinc-50/50 dark:bg-zinc-900/30 p-2.5 rounded-lg">
                      <div className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider mb-1.5 flex items-center gap-1">
                        <TrendingUp className="w-3 h-3 text-[#84A59D]" /> Receitas por Categoria
                      </div>
                      {Object.entries(dre.receitas_por_categoria).map(([cat, val]) => (
                        <div 
                          key={cat} 
                          onClick={() => handleDrilldown(`Receitas: ${cat}`, dre.detalhes?.outras_receitas.filter(r => r.categoria === cat))}
                          className="flex items-center justify-between text-xs py-1 hover:bg-zinc-100 dark:hover:bg-zinc-800 px-1.5 rounded cursor-pointer group"
                        >
                          <span className="text-zinc-500 font-medium group-hover:text-[#3A4F4A]">{cat}</span>
                          <span className="font-mono text-zinc-800 dark:text-zinc-150 font-semibold">{fmtBRL(val)}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="border-t border-zinc-200 dark:border-zinc-800 pt-3">
                    <DRE_Row label="Receita Bruta" value={dre.receita_bruta} bold />
                  </div>
                  <div className="pt-2">
                    <DRE_Row 
                      label="(-) Custo dos Produtos Vendidos" 
                      value={-dre.custo_produtos} 
                      negative 
                      onClick={() => handleDrilldown("Custo dos Produtos Vendidos (CMV)", dre.detalhes?.vendas.map(v => ({ ...v, descricao: `CMV: ${v.descricao}`, valor: v.valor })))}
                    />
                  </div>
                  <div className="border-t border-zinc-200 dark:border-zinc-800 pt-3">
                    <DRE_Row label="Lucro Bruto" value={dre.lucro_bruto} bold highlight />
                  </div>
                  
                  {/* Despesas */}
                  <div className="border-t border-zinc-200 dark:border-zinc-800 pt-4 mt-4">
                    <div className="font-semibold text-zinc-800 dark:text-zinc-150 mb-2">Despesas Operacionais</div>
                    <div className="space-y-2 pl-2">
                      <DRE_Row 
                        label="(-) Despesas Fixas" 
                        value={-dre.despesas.fixas} 
                        negative 
                        onClick={() => handleDrilldown("Despesas Fixas", dre.detalhes?.despesas.filter(d => d.tipo === 'fixo'))}
                      />
                      <DRE_Row 
                        label="(-) Despesas Variáveis" 
                        value={-dre.despesas.variaveis} 
                        negative 
                        onClick={() => handleDrilldown("Despesas Variáveis", dre.detalhes?.despesas.filter(d => d.tipo === 'variavel'))}
                      />
                      <DRE_Row 
                        label="(-) Taxas de Cartão Crédito" 
                        value={-dre.taxas_cartao.credito} 
                        negative 
                      />
                      <DRE_Row 
                        label="(-) Taxas de Cartão Débito" 
                        value={-dre.taxas_cartao.debito} 
                        negative 
                      />
                    </div>

                    {/* Despesas por Categoria */}
                    {dre.despesas_por_categoria && Object.keys(dre.despesas_por_categoria).length > 0 && (
                      <div className="pt-3 pl-3 border-l border-zinc-200 dark:border-zinc-700 mt-3 space-y-1 bg-zinc-50/50 dark:bg-zinc-900/30 p-2.5 rounded-lg">
                        <div className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider mb-1.5 flex items-center gap-1">
                          <Tag className="w-3 h-3 text-[#84A59D]" /> Despesas por Categoria
                        </div>
                        {Object.entries(dre.despesas_por_categoria).map(([cat, val]) => (
                          <div 
                            key={cat} 
                            onClick={() => handleDrilldown(`Despesas: ${cat}`, dre.detalhes?.despesas.filter(d => d.categoria === cat))}
                            className="flex items-center justify-between text-xs py-1 hover:bg-zinc-100 dark:hover:bg-zinc-800 px-1.5 rounded cursor-pointer group"
                          >
                            <span className="text-zinc-500 font-medium group-hover:text-[#3A4F4A]">{cat}</span>
                            <span className="font-mono text-zinc-800 dark:text-zinc-150 font-semibold">{fmtBRL(val)}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="border-t border-zinc-100 dark:border-zinc-800 pt-3 mt-2">
                      <DRE_Row label="Total Despesas Operacionais" value={-dre.despesas_operacionais} bold negative />
                    </div>
                  </div>
                  
                  {/* Resultado Líquido em Destaque */}
                  <div className={`border-t-2 border-zinc-300 dark:border-zinc-700 pt-4 mt-4 p-3 rounded-lg flex items-center justify-between ${
                    dre.lucro_liquido >= 0 
                      ? "bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-800/30" 
                      : "bg-rose-50/60 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-800/30"
                  }`}>
                    <div>
                      <span className="text-xs uppercase font-bold text-zinc-500 tracking-wider">Resultado Líquido do Exercício</span>
                      <h4 className={`text-base font-bold font-display mt-0.5 ${dre.lucro_liquido >= 0 ? "text-emerald-700 dark:text-emerald-400" : "text-rose-700 dark:text-rose-400"}`}>
                        {dre.lucro_liquido >= 0 ? "Lucro Líquido Realizado" : "Prejuízo Líquido Registrado"}
                      </h4>
                    </div>
                    <div className={`text-2xl font-black font-mono font-display ${dre.lucro_liquido >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`}>
                      {fmtBRL(dre.lucro_liquido)}
                    </div>
                  </div>
                </div>

                {/* Drilldown Dialog Component */}
                <Dialog open={drilldownOpen} onOpenChange={setDrilldownOpen}>
                  <DialogContent className="sm:max-w-5xl md:max-w-6xl lg:max-w-7xl max-h-[90vh] overflow-y-auto w-[96vw] rounded-xl p-6 md:p-8 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-800 dark:text-zinc-100">
                    <DialogHeader>
                      <DialogTitle className="flex items-center gap-2 text-xl md:text-2xl font-semibold text-[#3A4F4A] dark:text-[#EAF0EE]">
                        <FileText className="w-6 h-6 text-[#84A59D]" />
                        <span>Detalhamento DRE: {drilldownTitle}</span>
                      </DialogTitle>
                      <p className="text-xs sm:text-sm text-zinc-500 mt-1">
                        Detalhamento analítico de lançamentos que compõem o valor no período selecionado.
                      </p>
                    </DialogHeader>

                    {/* Drilldown List/Table */}
                    <div className="my-5">
                      {drilldownData.length === 0 ? (
                        <div className="py-12 text-center text-zinc-400 text-sm border border-zinc-200 dark:border-zinc-800 rounded-xl bg-white dark:bg-zinc-900 shadow-sm">
                          Nenhum lançamento encontrado para este item no período.
                        </div>
                      ) : (
                        <>
                          {/* Desktop Table View */}
                          <div className="hidden md:block overflow-x-auto border border-zinc-200 dark:border-zinc-800 rounded-xl max-h-[60vh] overflow-y-auto shadow-sm">
                            <table className="w-full text-xs sm:text-sm text-left border-collapse">
                              <thead className="bg-zinc-50 dark:bg-zinc-950 border-b border-zinc-200 dark:border-zinc-800 text-[10px] sm:text-xs uppercase font-bold text-zinc-500 tracking-wider">
                                <tr>
                                  <th className="px-5 py-4">Data</th>
                                  <th className="px-5 py-4">Lançamento / Descrição</th>
                                  <th className="px-5 py-4">Categoria</th>
                                  <th className="px-5 py-4 text-center">Status</th>
                                  <th className="px-5 py-4 text-right">Valor</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800 font-medium">
                                {drilldownData.map((item, idx) => (
                                  <tr key={idx} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-900/30">
                                    <td className="px-5 py-4 whitespace-nowrap text-zinc-500 font-mono">
                                      {item.data ? new Date(item.data + 'T12:00:00').toLocaleDateString('pt-BR') : '-'}
                                    </td>
                                    <td className="px-5 py-4 font-semibold text-zinc-800 dark:text-zinc-100">{item.descricao}</td>
                                    <td className="px-5 py-4">
                                      <span className="bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded text-[10px] text-zinc-600 dark:text-zinc-300">
                                        {item.categoria}
                                      </span>
                                    </td>
                                    <td className="px-5 py-4 text-center">
                                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${
                                        item.status === 'Pago' || item.status === 'pago' || item.status === 'Recebido' || item.status === 'concluido'
                                          ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/40'
                                          : item.status === 'Cancelado' || item.status === 'cancelado'
                                          ? 'bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800/40'
                                          : 'bg-amber-50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-800/40'
                                      }`}>
                                        {item.status === 'concluido' ? 'Concluído' : item.status}
                                      </span>
                                    </td>
                                    <td className="px-5 py-4 text-right font-mono font-semibold text-zinc-900 dark:text-zinc-100">
                                      {fmtBRL(item.valor)}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>

                          {/* Mobile Cards View */}
                          <div className="block md:hidden space-y-3 max-h-[60vh] overflow-y-auto pr-1">
                            {drilldownData.map((item, idx) => (
                              <div key={idx} className="bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 space-y-2.5 shadow-sm">
                                <div className="flex items-center justify-between">
                                  <span className="text-[10px] font-mono font-bold text-zinc-400 dark:text-zinc-500">
                                    {item.data ? new Date(item.data + 'T12:00:00').toLocaleDateString('pt-BR') : '-'}
                                  </span>
                                  <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${
                                    item.status === 'Pago' || item.status === 'pago' || item.status === 'Recebido' || item.status === 'concluido'
                                      ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/40'
                                      : item.status === 'Cancelado' || item.status === 'cancelado'
                                      ? 'bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800/40'
                                      : 'bg-amber-50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-800/40'
                                  }`}>
                                    {item.status === 'concluido' ? 'Concluído' : item.status}
                                  </span>
                                </div>
                                
                                <div className="font-semibold text-xs text-zinc-800 dark:text-zinc-100 line-clamp-2">
                                  {item.descricao}
                                </div>
                                
                                <div className="flex items-center justify-between pt-2 border-t border-zinc-150 dark:border-zinc-800 text-xs">
                                  <span className="bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded text-[10px] text-zinc-650 dark:text-zinc-350 font-medium">
                                    {item.categoria}
                                  </span>
                                  <span className="font-mono font-bold text-zinc-900 dark:text-zinc-100">
                                    {fmtBRL(item.valor)}
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </>
                      )}
                    </div>

                    <DialogFooter className="mt-4">
                      <div className="flex w-full items-center justify-between">
                        <div className="text-xs font-bold text-zinc-500">
                          Total Acumulado:{" "}
                          <span className="font-mono text-sm text-[#3A4F4A] dark:text-[#EAF0EE]">
                            {fmtBRL(drilldownData.reduce((acc, x) => acc + x.valor, 0))}
                          </span>
                        </div>
                        <Button onClick={() => setDrilldownOpen(false)} className="bg-[#84A59D] hover:bg-[#6F9189] text-white text-xs px-4 h-9 rounded-lg">
                          Fechar Detalhes
                        </Button>
                      </div>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
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
                    <div>Crédito: {fmtBRL(dre.taxas_cartao.credito)} {dre.taxas_cartao.credito_dias !== undefined && `(Prazo: ${dre.taxas_cartao.credito_dias}d)`}</div>
                    <div>Débito: {fmtBRL(dre.taxas_cartao.debito)} {dre.taxas_cartao.debito_dias !== undefined && `(Prazo: ${dre.taxas_cartao.debito_dias}d)`}</div>
                  </div>
                  {dre.taxas_cartao.pmr !== undefined && (
                    <div className="mt-3 pt-3 border-t border-zinc-100 dark:border-zinc-800 text-xs text-zinc-650 flex items-center justify-between font-semibold">
                      <span>Prazo Médio de Recebimento (PMR)</span>
                      <span className="text-zinc-800 dark:text-zinc-100 font-bold bg-zinc-50 dark:bg-zinc-950 px-2 py-0.5 border border-zinc-150 dark:border-zinc-800 rounded">{dre.taxas_cartao.pmr} dias</span>
                    </div>
                  )}
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
                  <div 
                    key={k} 
                    onClick={() => { setDetailsSearchQuery(""); setDetailsForma(k); }}
                    className="bg-white border border-zinc-200 rounded-xl p-5 shadow-sm hover:shadow-md hover:border-[#84A59D] transition-all cursor-pointer group active:scale-[0.98]"
                  >
                    <div className="text-xs uppercase tracking-wider text-zinc-400 font-bold group-hover:text-[#84A59D] transition-colors">{FORMA_LABELS[k]}</div>
                    <div className="font-display text-2xl font-bold mt-1.5 text-zinc-700 group-hover:text-zinc-900 transition-colors">{fmtBRL(caixa.totais[k])}</div>
                    <div className="text-[10px] text-zinc-400 font-normal mt-2 flex items-center gap-1 group-hover:text-[#84A59D] transition-colors">
                      Clique para ver detalhes →
                    </div>
                  </div>
                ))}
              </div>

              {/* Modal de Detalhes do Caixa */}
              <Dialog open={!!detailsForma} onOpenChange={(open) => { if (!open) setDetailsForma(null); }}>
                <DialogContent className="sm:max-w-4xl max-h-[85vh] flex flex-col p-6">
                  <DialogHeader className="pb-4 border-b border-zinc-150">
                    <DialogTitle className="flex items-center gap-2 text-xl font-semibold text-[#3A4F4A]">
                      <Banknote className="w-5 h-5 text-[#84A59D]" />
                      <span>Detalhamento de Caixa - {FORMA_LABELS[detailsForma]}</span>
                    </DialogTitle>
                    <div className="text-xs text-zinc-400 mt-1 font-medium flex flex-wrap gap-x-4 gap-y-1">
                      <span>Período: <b>{new Date(from + 'T12:00:00').toLocaleDateString('pt-BR')}</b> a <b>{new Date(to + 'T12:00:00').toLocaleDateString('pt-BR')}</b></span>
                      <span>Profissional: <b>{colaboradorId === 'todos' ? 'Todos os usuários' : colaboradores.find(c => c.id === colaboradorId)?.nome}</b></span>
                    </div>
                  </DialogHeader>

                  {/* Search bar and Summary */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 py-4 border-b border-zinc-150">
                    <div className="flex items-center gap-2 max-w-sm w-full bg-zinc-50 rounded-lg border border-zinc-200 px-3 py-1.5">
                      <Search className="w-4 h-4 text-zinc-400 shrink-0" />
                      <input
                        placeholder="Buscar por número, cliente, serviço/produto..."
                        value={detailsSearchQuery}
                        onChange={(e) => setDetailsSearchQuery(e.target.value)}
                        className="bg-transparent border-none outline-none text-xs w-full text-zinc-700 placeholder-zinc-400"
                      />
                    </div>
                    
                    <div className="flex items-center gap-4 text-xs font-semibold bg-[#EAF0EE] text-[#3A4F4A] px-3.5 py-2 rounded-lg">
                      {(() => {
                        const filtered = (caixa?.pagamentos || [])
                          .filter(p => p.forma_pagamento === detailsForma)
                          .filter(p => {
                            if (!detailsSearchQuery) return true;
                            const q = detailsSearchQuery.toLowerCase();
                            return (
                              (p.numero || '').toLowerCase().includes(q) ||
                              (p.cliente || '').toLowerCase().includes(q) ||
                              (p.itens || '').toLowerCase().includes(q)
                            );
                          });
                        return (
                          <>
                            <span>Total: <b>{filtered.length}</b> pagamentos</span>
                            <span className="w-px h-3 bg-[#84A59D]/30" />
                            <span>Soma: <b>{fmtBRL(filtered.reduce((acc, p) => acc + p.valor, 0))}</b></span>
                          </>
                        );
                      })()}
                    </div>
                  </div>

                  {/* Table Container */}
                  <div className="flex-1 overflow-y-auto my-4 min-h-[300px] border border-zinc-200 rounded-lg custom-scrollbar">
                    {(() => {
                      const filtered = (caixa?.pagamentos || [])
                        .filter(p => p.forma_pagamento === detailsForma)
                        .filter(p => {
                          if (!detailsSearchQuery) return true;
                          const q = detailsSearchQuery.toLowerCase();
                          return (
                            (p.numero || '').toLowerCase().includes(q) ||
                            (p.cliente || '').toLowerCase().includes(q) ||
                            (p.itens || '').toLowerCase().includes(q)
                          );
                        });

                      if (filtered.length === 0) {
                        return (
                          <div className="text-zinc-400 p-12 text-center text-xs">
                            Nenhum pagamento encontrado com os filtros aplicados.
                          </div>
                        );
                      }

                      return (
                        <table className="w-full text-xs text-left">
                          <thead className="bg-zinc-50 text-zinc-550 border-b border-zinc-200 font-semibold uppercase tracking-wider text-[10px] sticky top-0 z-10">
                            <tr>
                              <th className="px-4 py-3">Número</th>
                              <th className="px-4 py-3">Cliente</th>
                              <th className="px-4 py-3">Produto ou Serviço</th>
                              <th className="px-4 py-3 text-right">Valor</th>
                              <th className="px-4 py-3">Data/Hora</th>
                              <th className="px-4 py-3 text-center">Forma</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-zinc-150 text-zinc-650 font-medium">
                            {filtered.map((p) => (
                              <tr key={p.id} className="hover:bg-zinc-50/50 transition-colors">
                                <td className="px-4 py-3 whitespace-nowrap font-bold text-zinc-800">
                                  {p.numero}
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap text-zinc-700">
                                  {p.cliente}
                                </td>
                                <td className="px-4 py-3 max-w-[250px] truncate text-zinc-600" title={p.itens}>
                                  {p.itens}
                                </td>
                                <td className="px-4 py-3 text-right font-mono font-bold text-[#3A4F4A] whitespace-nowrap">
                                  {fmtBRL(p.valor)}
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap text-zinc-500">
                                  {new Date(p.data_hora).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}
                                </td>
                                <td className="px-4 py-3 text-center whitespace-nowrap">
                                  <span className="px-2 py-0.5 bg-zinc-100 border border-zinc-200 text-zinc-600 rounded text-[9px] uppercase font-bold">
                                    {FORMA_LABELS[p.forma_pagamento] || p.forma_pagamento}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      );
                    })()}
                  </div>

                  <DialogFooter className="pt-3 border-t border-zinc-150 flex items-center justify-end">
                    <Button variant="outline" onClick={() => setDetailsForma(null)} className="h-9 text-xs font-semibold">
                      Fechar
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
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
                  const numStr = v.numero_venda ? String(v.numero_venda).padStart(6, '0') : '';
                  const formattedNum = v.numero_venda ? `${numStr} | V`.toLowerCase() : '';
                  return (
                    v.produto_nome.toLowerCase().includes(query) ||
                    (v.colaborador_nome || "").toLowerCase().includes(query) ||
                    (v.cliente_nome || "").toLowerCase().includes(query) ||
                    (v.categoria || "").toLowerCase().includes(query) ||
                    numStr.includes(query) ||
                    formattedNum.includes(query)
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
              const totalFaturamento = filteredVendas.filter(v => v.status === "pago").reduce((acc, v) => acc + v.valor_total, 0);
              const totalQuantidade = filteredVendas.filter(v => v.status === "pago").reduce((acc, v) => acc + v.quantidade, 0);
              const totalCusto = filteredVendas.filter(v => v.status === "pago").reduce((acc, v) => acc + v.custo_total, 0);
              const totalLucro = totalFaturamento - totalCusto;

              // 3. Agrupamentos para o painel lateral de desempenho (breakdowns)
              const porColab = {};
              const porProd = {};
              filteredVendas.forEach(v => {
                if (v.status !== "pago") return;
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
                    <div className="flex justify-between items-end">
                      <div>
                        {empresa?.nome_fantasia && (
                          <div className="text-xs font-bold uppercase tracking-wider text-[#84A59D] mb-1">{empresa.nome_fantasia}</div>
                        )}
                        <h1 className="text-xl font-bold text-zinc-800">Relatório Executivo de Venda de Produtos</h1>
                        <p className="text-xs text-zinc-500 mt-1">
                          Período selecionado: <b>{new Date(from + 'T12:00:00').toLocaleDateString('pt-BR')}</b> até <b>{new Date(to + 'T12:00:00').toLocaleDateString('pt-BR')}</b>
                        </p>
                      </div>
                      <div className="text-right text-[10px] text-zinc-400 pb-1">
                        Gerado em: {new Date().toLocaleString('pt-BR')} | Perfil: Administrador
                      </div>
                    </div>
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
                                    <div className="text-[10px] text-zinc-400 font-normal flex flex-wrap items-center gap-x-2 gap-y-0.5">
                                      <span className="flex items-center gap-1"><Tag className="w-3 h-3" /> {v.categoria}</span>
                                      {v.numero_venda && (
                                        <span className="font-mono text-zinc-400 font-normal">• {String(v.numero_venda).padStart(6, "0")} | V</span>
                                      )}
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
                  const numStr = s.agendamento_numero ? String(s.agendamento_numero).padStart(6, '0') : '';
                  const formattedNum = s.agendamento_numero ? `${numStr} | S`.toLowerCase() : '';
                  return (
                    s.servico_nome.toLowerCase().includes(query) ||
                    (s.colaborador_nome || "").toLowerCase().includes(query) ||
                    (s.auxiliar_nome || "").toLowerCase().includes(query) ||
                    (s.cliente_nome || "").toLowerCase().includes(query) ||
                    numStr.includes(query) ||
                    formattedNum.includes(query)
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
              const totalFaturamento = filteredServicos.filter(s => s.status === "concluido").reduce((acc, s) => acc + s.valor, 0);
              const totalQuantidade = filteredServicos.filter(s => s.status === "concluido").length;
              const totalDuracao = filteredServicos.filter(s => s.status === "concluido").reduce((acc, s) => acc + (s.duracao || 0), 0);
              const ticketMedio = totalQuantidade > 0 ? (totalFaturamento / totalQuantidade) : 0;

              // 3. Agrupamentos para o painel lateral de desempenho (breakdowns)
              const porColab = {};
              const porServ = {};
              filteredServicos.forEach(s => {
                if (s.status !== "concluido") return;
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
                    <div className="flex justify-between items-end">
                      <div>
                        {empresa?.nome_fantasia && (
                          <div className="text-xs font-bold uppercase tracking-wider text-[#84A59D] mb-1">{empresa.nome_fantasia}</div>
                        )}
                        <h1 className="text-xl font-bold text-zinc-800">Relatório Executivo de Prestação de Serviços</h1>
                        <p className="text-xs text-zinc-500 mt-1">
                          Período selecionado: <b>{new Date(from + 'T12:00:00').toLocaleDateString('pt-BR')}</b> até <b>{new Date(to + 'T12:00:00').toLocaleDateString('pt-BR')}</b>
                        </p>
                      </div>
                      <div className="text-right text-[10px] text-zinc-400 pb-1">
                        Gerado em: {new Date().toLocaleString('pt-BR')} | Perfil: Administrador
                      </div>
                    </div>
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
                                    <div className="text-[10px] font-mono text-zinc-400 font-normal">
                                      {s.agendamento_numero ? `${String(s.agendamento_numero).padStart(6, "0")} | S` : "-"}
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
                                    <div>{fmtBRL(s.valor)}</div>
                                    {s.valor_original !== undefined && Number(s.valor_original) !== Number(s.valor) && (
                                      <div className="text-[10px] text-zinc-400 line-through font-normal">
                                        {fmtBRL(s.valor_original)}
                                      </div>
                                    )}
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

        <TabsContent value="resultado_consolidado">
          {!resultadoOperacional ? (
            <div className="text-zinc-400 p-8 text-center bg-white border border-zinc-200 rounded-xl">Carregando dados...</div>
          ) : (
            <div className="space-y-6 print-full-width">
              {/* Print Only Header */}
              <div className="hidden print:block mb-8 border-b-2 border-zinc-900 pb-4">
                <div className="flex justify-between items-end">
                  <div>
                    <h1 className="text-2xl font-bold tracking-tight text-zinc-900">{empresa?.nome_fantasia || "STUDIO APP"}</h1>
                    <p className="text-xs text-zinc-500">Resultado Operacional Consolidado</p>
                  </div>
                  <div className="text-right text-xs text-zinc-500">
                    <div><strong>Período:</strong> {from ? new Date(from + 'T12:00:00').toLocaleDateString('pt-BR') : '-'} a {to ? new Date(to + 'T12:00:00').toLocaleDateString('pt-BR') : '-'}</div>
                    <div><strong>Gerado em:</strong> {new Date().toLocaleString('pt-BR')}</div>
                  </div>
                </div>
              </div>

              {/* Overview Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white border border-zinc-200 rounded-2xl p-5 shadow-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Faturamento Bruto</span>
                    <TrendingUp className="w-5 h-5 text-[#84A59D]" />
                  </div>
                  <div className="font-display text-3xl font-bold mt-2 text-zinc-800">
                    {fmtBRL(resultadoOperacional.consolidado.receita_total)}
                  </div>
                  <p className="text-[10px] text-zinc-500 mt-1">
                    Serviços: {fmtBRL(resultadoOperacional.consolidado.receita_servicos)} | Produtos: {fmtBRL(resultadoOperacional.consolidado.receita_produtos)}
                  </p>
                </div>

                <div className="bg-white border border-zinc-200 rounded-2xl p-5 shadow-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Custos & Deduções</span>
                    <TrendingDown className="w-5 h-5 text-rose-500" />
                  </div>
                  <div className="font-display text-3xl font-bold mt-2 text-zinc-800">
                    {fmtBRL(resultadoOperacional.consolidado.cmv + resultadoOperacional.consolidado.comissoes + resultadoOperacional.consolidado.taxas)}
                  </div>
                  <p className="text-[10px] text-zinc-500 mt-1">
                    CMV/Insumo: {fmtBRL(resultadoOperacional.consolidado.cmv)} | Comissões: {fmtBRL(resultadoOperacional.consolidado.comissoes)} | Taxas: {fmtBRL(resultadoOperacional.consolidado.taxas)}
                  </p>
                </div>

                <div className={`border rounded-2xl p-5 shadow-sm hover:shadow-md transition-all ${
                  resultadoOperacional.consolidado.resultado_operacional >= 0 
                    ? "bg-emerald-50/50 border-emerald-200" 
                    : "bg-rose-50/50 border-rose-200"
                }`}>
                  <div className="flex items-center justify-between">
                    <span className={`text-xs font-bold uppercase tracking-wider ${
                      resultadoOperacional.consolidado.resultado_operacional >= 0 ? "text-emerald-600" : "text-rose-600"
                    }`}>
                      Resultado Operacional
                    </span>
                    <TrendingUp className={`w-5 h-5 ${
                      resultadoOperacional.consolidado.resultado_operacional >= 0 ? "text-emerald-600" : "text-rose-600"
                    }`} />
                  </div>
                  <div className={`font-display text-3xl font-black mt-2 ${
                    resultadoOperacional.consolidado.resultado_operacional >= 0 ? "text-emerald-700" : "text-rose-700"
                  }`}>
                    {fmtBRL(resultadoOperacional.consolidado.resultado_operacional)}
                  </div>
                  <p className="text-[10px] text-zinc-500 mt-1">
                    Margem Operacional: {(resultadoOperacional.consolidado.margem_operacional || 0).toFixed(2)}%
                  </p>
                </div>
              </div>

              {/* Detailed Breakdown */}
              <div className="bg-white border border-zinc-200 rounded-xl p-6 space-y-4 shadow-sm">
                <div className="flex justify-between items-center border-b border-zinc-100 pb-3">
                  <h3 className="font-display text-lg font-medium text-zinc-800">Resultado Operacional Consolidado</h3>
                  <div className="flex gap-2 no-print">
                    <Button 
                      onClick={() => window.print()}
                      variant="outline" 
                      size="sm"
                      className="text-xs h-8"
                    >
                      <Printer className="w-4 h-4 mr-1.5" /> Exportar PDF
                    </Button>
                    <Button 
                      onClick={() => handleExport('csv', 'Resultado_Consolidado', ['Métrica', 'Valor'], ['metric', 'value'], [
                        { metric: 'Receita de Serviços', value: resultadoOperacional.consolidado.receita_servicos },
                        { metric: 'Receita de Produtos', value: resultadoOperacional.consolidado.receita_produtos },
                        { metric: 'Faturamento Bruto', value: resultadoOperacional.consolidado.receita_total },
                        { metric: 'CMV e Insumos', value: resultadoOperacional.consolidado.cmv },
                        { metric: 'Comissões', value: resultadoOperacional.consolidado.comissoes },
                        { metric: 'Taxas Financeiras', value: resultadoOperacional.consolidado.taxas },
                        { metric: 'Resultado Operacional', value: resultadoOperacional.consolidado.resultado_operacional },
                        { metric: 'Margem Operacional (%)', value: resultadoOperacional.consolidado.margem_operacional }
                      ])}
                      variant="outline" 
                      size="sm"
                      className="text-xs h-8"
                    >
                      CSV
                    </Button>
                  </div>
                </div>

                <div className="space-y-3 divide-y divide-zinc-100">
                  <div className="pt-2">
                    <DRE_Row label="Faturamento de Serviços" value={resultadoOperacional.consolidado.receita_servicos} />
                  </div>
                  <div className="pt-2">
                    <DRE_Row label="Faturamento de Vendas de Produtos" value={resultadoOperacional.consolidado.receita_produtos} />
                  </div>
                  <div className="border-t border-zinc-200 pt-3">
                    <DRE_Row label="Faturamento Bruto Total" value={resultadoOperacional.consolidado.receita_total} bold />
                  </div>
                  <div className="pt-2">
                    <DRE_Row label="(-) Custo de Mercadorias (CMV) & Insumos" value={-resultadoOperacional.consolidado.cmv} negative />
                  </div>
                  <div className="pt-2">
                    <DRE_Row label="(-) Comissões (Profissional + Auxiliar)" value={-resultadoOperacional.consolidado.comissoes} negative />
                  </div>
                  <div className="pt-2">
                    <DRE_Row label="(-) Taxas de Transação Financeiras" value={-resultadoOperacional.consolidado.taxas} negative />
                  </div>
                  <div className="border-t border-zinc-200 pt-3">
                    <DRE_Row label="Resultado Operacional" value={resultadoOperacional.consolidado.resultado_operacional} bold highlight />
                  </div>
                  <div className="pt-2 flex justify-between items-center text-sm font-semibold">
                    <span className="text-zinc-500">Margem Operacional (%)</span>
                    <span className="text-zinc-800 font-mono">{(resultadoOperacional.consolidado.margem_operacional || 0).toFixed(2)}%</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </TabsContent>

        <TabsContent value="rentabilidade_servicos">
          {!resultadoOperacional ? (
            <div className="text-zinc-400 p-8 text-center bg-white border border-zinc-200 rounded-xl">Carregando dados...</div>
          ) : (
            <div className="space-y-6 print-full-width">
              {/* Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-100 pb-3 no-print">
                <div className="relative flex-1 max-w-xs">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-zinc-400" />
                  <Input 
                    placeholder="Pesquisar serviço..." 
                    value={searchOperServico}
                    onChange={(e) => setSearchOperServico(e.target.value)}
                    className="pl-9 h-9 text-xs"
                  />
                </div>
                <div className="flex gap-2">
                  <Button onClick={() => window.print()} variant="outline" size="sm" className="text-xs h-8">
                    <Printer className="w-4 h-4 mr-1.5" /> PDF
                  </Button>
                  <Button 
                    onClick={() => handleExport(
                      'xlsx', 
                      'Rentabilidade_Servicos', 
                      ['Serviço', 'Quantidade', 'Faturamento', 'Comissão', 'Taxas', 'Insumos', 'Resultado', 'Margem (%)'], 
                      ['servico_nome', 'quantidade', 'faturamento', 'comissao', 'taxas', 'insumos', 'resultado_operacional', 'margem'], 
                      sortedAndFilteredServicos
                    )} 
                    variant="outline" 
                    size="sm" 
                    className="text-xs h-8"
                  >
                    Excel
                  </Button>
                  <Button 
                    onClick={() => handleExport(
                      'csv', 
                      'Rentabilidade_Servicos', 
                      ['Serviço', 'Quantidade', 'Faturamento', 'Comissão', 'Taxas', 'Insumos', 'Resultado', 'Margem (%)'], 
                      ['servico_nome', 'quantidade', 'faturamento', 'comissao', 'taxas', 'insumos', 'resultado_operacional', 'margem'], 
                      sortedAndFilteredServicos
                    )} 
                    variant="outline" 
                    size="sm" 
                    className="text-xs h-8"
                  >
                    CSV
                  </Button>
                </div>
              </div>

              {/* Table */}
              <div className="bg-white border border-zinc-200 rounded-xl overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left border-collapse">
                    <thead>
                      <tr className="bg-zinc-50 border-b border-zinc-200 text-zinc-500 font-bold uppercase tracking-wider">
                        <th className="px-4 py-3">
                          <SortHeader label="Serviço" field="servico_nome" currentField={sortServicoField} direction={sortServicoDirection} onSort={(f) => {
                            if (sortServicoField === f) setSortServicoDirection(d => d === 'asc' ? 'desc' : 'asc');
                            else { setSortServicoField(f); setSortServicoDirection('desc'); }
                          }} />
                        </th>
                        <th className="px-4 py-3 text-center">
                          <SortHeader label="Qtd" field="quantidade" currentField={sortServicoField} direction={sortServicoDirection} onSort={(f) => {
                            if (sortServicoField === f) setSortServicoDirection(d => d === 'asc' ? 'desc' : 'asc');
                            else { setSortServicoField(f); setSortServicoDirection('desc'); }
                          }} />
                        </th>
                        <th className="px-4 py-3 text-right">
                          <SortHeader label="Faturamento" field="faturamento" currentField={sortServicoField} direction={sortServicoDirection} onSort={(f) => {
                            if (sortServicoField === f) setSortServicoDirection(d => d === 'asc' ? 'desc' : 'asc');
                            else { setSortServicoField(f); setSortServicoDirection('desc'); }
                          }} />
                        </th>
                        <th className="px-4 py-3 text-right">
                          <SortHeader label="Insumos" field="insumos" currentField={sortServicoField} direction={sortServicoDirection} onSort={(f) => {
                            if (sortServicoField === f) setSortServicoDirection(d => d === 'asc' ? 'desc' : 'asc');
                            else { setSortServicoField(f); setSortServicoDirection('desc'); }
                          }} />
                        </th>
                        <th className="px-4 py-3 text-right">
                          <SortHeader label="Comissão" field="comissao" currentField={sortServicoField} direction={sortServicoDirection} onSort={(f) => {
                            if (sortServicoField === f) setSortServicoDirection(d => d === 'asc' ? 'desc' : 'asc');
                            else { setSortServicoField(f); setSortServicoDirection('desc'); }
                          }} />
                        </th>
                        <th className="px-4 py-3 text-right">
                          <SortHeader label="Taxas" field="taxas" currentField={sortServicoField} direction={sortServicoDirection} onSort={(f) => {
                            if (sortServicoField === f) setSortServicoDirection(d => d === 'asc' ? 'desc' : 'asc');
                            else { setSortServicoField(f); setSortServicoDirection('desc'); }
                          }} />
                        </th>
                        <th className="px-4 py-3 text-right">
                          <SortHeader label="Resultado" field="resultado_operacional" currentField={sortServicoField} direction={sortServicoDirection} onSort={(f) => {
                            if (sortServicoField === f) setSortServicoDirection(d => d === 'asc' ? 'desc' : 'asc');
                            else { setSortServicoField(f); setSortServicoDirection('desc'); }
                          }} />
                        </th>
                        <th className="px-4 py-3 text-center">
                          <SortHeader label="Margem" field="margem" currentField={sortServicoField} direction={sortServicoDirection} onSort={(f) => {
                            if (sortServicoField === f) setSortServicoDirection(d => d === 'asc' ? 'desc' : 'asc');
                            else { setSortServicoField(f); setSortServicoDirection('desc'); }
                          }} />
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-200">
                      {sortedAndFilteredServicos.length === 0 ? (
                        <tr>
                          <td colSpan={8} className="text-center py-8 text-zinc-400">Nenhum serviço encontrado.</td>
                        </tr>
                      ) : sortedAndFilteredServicos.map((s, idx) => (
                        <tr key={idx} className="hover:bg-zinc-50 transition-colors">
                          <td className="px-4 py-3 font-semibold text-zinc-700">{s.servico_nome}</td>
                          <td className="px-4 py-3 text-center font-mono">{s.quantidade}</td>
                          <td className="px-4 py-3 text-right font-mono text-zinc-800">{fmtBRL(s.faturamento)}</td>
                          <td className="px-4 py-3 text-right font-mono text-rose-500">{fmtBRL(s.insumos)}</td>
                          <td className="px-4 py-3 text-right font-mono text-amber-600">{fmtBRL(s.comissao)}</td>
                          <td className="px-4 py-3 text-right font-mono text-amber-700">{fmtBRL(s.taxas)}</td>
                          <td className={`px-4 py-3 text-right font-mono font-bold ${s.resultado_operacional >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>{fmtBRL(s.resultado_operacional)}</td>
                          <td className="px-4 py-3 text-center font-mono">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              s.margem >= 50 
                                ? 'bg-emerald-50 text-emerald-600 border border-emerald-200' 
                                : s.margem >= 20 
                                ? 'bg-amber-50 text-amber-600 border border-amber-200' 
                                : 'bg-rose-50 text-rose-600 border border-rose-200'
                            }`}>
                              {(s.margem || 0).toFixed(1)}%
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </TabsContent>

        <TabsContent value="rentabilidade_produtos">
          {!resultadoOperacional ? (
            <div className="text-zinc-400 p-8 text-center bg-white border border-zinc-200 rounded-xl">Carregando dados...</div>
          ) : (
            <div className="space-y-6 print-full-width">
              {/* Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-100 pb-3 no-print">
                <div className="relative flex-1 max-w-xs">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-zinc-400" />
                  <Input 
                    placeholder="Pesquisar produto..." 
                    value={searchOperProduto}
                    onChange={(e) => setSearchOperProduto(e.target.value)}
                    className="pl-9 h-9 text-xs"
                  />
                </div>
                <div className="flex gap-2">
                  <Button onClick={() => window.print()} variant="outline" size="sm" className="text-xs h-8">
                    <Printer className="w-4 h-4 mr-1.5" /> PDF
                  </Button>
                  <Button 
                    onClick={() => handleExport(
                      'xlsx', 
                      'Rentabilidade_Produtos', 
                      ['Produto', 'Quantidade', 'Faturamento', 'CMV', 'Comissão', 'Taxas', 'Resultado', 'Margem (%)'], 
                      ['produto_nome', 'quantidade', 'faturamento', 'cmv', 'comissao', 'taxas', 'resultado_operacional', 'margem'], 
                      sortedAndFilteredProdutos
                    )} 
                    variant="outline" 
                    size="sm" 
                    className="text-xs h-8"
                  >
                    Excel
                  </Button>
                  <Button 
                    onClick={() => handleExport(
                      'csv', 
                      'Rentabilidade_Produtos', 
                      ['Produto', 'Quantidade', 'Faturamento', 'CMV', 'Comissão', 'Taxas', 'Resultado', 'Margem (%)'], 
                      ['produto_nome', 'quantidade', 'faturamento', 'cmv', 'comissao', 'taxas', 'resultado_operacional', 'margem'], 
                      sortedAndFilteredProdutos
                    )} 
                    variant="outline" 
                    size="sm" 
                    className="text-xs h-8"
                  >
                    CSV
                  </Button>
                </div>
              </div>

              {/* Table */}
              <div className="bg-white border border-zinc-200 rounded-xl overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left border-collapse">
                    <thead>
                      <tr className="bg-zinc-50 border-b border-zinc-200 text-zinc-500 font-bold uppercase tracking-wider">
                        <th className="px-4 py-3">
                          <SortHeader label="Produto" field="produto_nome" currentField={sortProdutoField} direction={sortProdutoDirection} onSort={(f) => {
                            if (sortProdutoField === f) setSortProdutoDirection(d => d === 'asc' ? 'desc' : 'asc');
                            else { setSortProdutoField(f); setSortProdutoDirection('desc'); }
                          }} />
                        </th>
                        <th className="px-4 py-3 text-center">
                          <SortHeader label="Qtd" field="quantidade" currentField={sortProdutoField} direction={sortProdutoDirection} onSort={(f) => {
                            if (sortProdutoField === f) setSortProdutoDirection(d => d === 'asc' ? 'desc' : 'asc');
                            else { setSortProdutoField(f); setSortProdutoDirection('desc'); }
                          }} />
                        </th>
                        <th className="px-4 py-3 text-right">
                          <SortHeader label="Faturamento" field="faturamento" currentField={sortProdutoField} direction={sortProdutoDirection} onSort={(f) => {
                            if (sortProdutoField === f) setSortProdutoDirection(d => d === 'asc' ? 'desc' : 'asc');
                            else { setSortProdutoField(f); setSortProdutoDirection('desc'); }
                          }} />
                        </th>
                        <th className="px-4 py-3 text-right">
                          <SortHeader label="CMV" field="cmv" currentField={sortProdutoField} direction={sortProdutoDirection} onSort={(f) => {
                            if (sortProdutoField === f) setSortProdutoDirection(d => d === 'asc' ? 'desc' : 'asc');
                            else { setSortProdutoField(f); setSortProdutoDirection('desc'); }
                          }} />
                        </th>
                        <th className="px-4 py-3 text-right">
                          <SortHeader label="Comissão" field="comissao" currentField={sortProdutoField} direction={sortProdutoDirection} onSort={(f) => {
                            if (sortProdutoField === f) setSortProdutoDirection(d => d === 'asc' ? 'desc' : 'asc');
                            else { setSortProdutoField(f); setSortProdutoDirection('desc'); }
                          }} />
                        </th>
                        <th className="px-4 py-3 text-right">
                          <SortHeader label="Taxas" field="taxas" currentField={sortProdutoField} direction={sortProdutoDirection} onSort={(f) => {
                            if (sortProdutoField === f) setSortProdutoDirection(d => d === 'asc' ? 'desc' : 'asc');
                            else { setSortProdutoField(f); setSortProdutoDirection('desc'); }
                          }} />
                        </th>
                        <th className="px-4 py-3 text-right">
                          <SortHeader label="Resultado" field="resultado_operacional" currentField={sortProdutoField} direction={sortProdutoDirection} onSort={(f) => {
                            if (sortProdutoField === f) setSortProdutoDirection(d => d === 'asc' ? 'desc' : 'asc');
                            else { setSortProdutoField(f); setSortProdutoDirection('desc'); }
                          }} />
                        </th>
                        <th className="px-4 py-3 text-center">
                          <SortHeader label="Margem" field="margem" currentField={sortProdutoField} direction={sortProdutoDirection} onSort={(f) => {
                            if (sortProdutoField === f) setSortProdutoDirection(d => d === 'asc' ? 'desc' : 'asc');
                            else { setSortProdutoField(f); setSortProdutoDirection('desc'); }
                          }} />
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-200">
                      {sortedAndFilteredProdutos.length === 0 ? (
                        <tr>
                          <td colSpan={8} className="text-center py-8 text-zinc-400">Nenhum produto encontrado.</td>
                        </tr>
                      ) : sortedAndFilteredProdutos.map((p, idx) => (
                        <tr key={idx} className="hover:bg-zinc-50 transition-colors">
                          <td className="px-4 py-3 font-semibold text-zinc-700">{p.produto_nome}</td>
                          <td className="px-4 py-3 text-center font-mono">{p.quantidade}</td>
                          <td className="px-4 py-3 text-right font-mono text-zinc-800">{fmtBRL(p.faturamento)}</td>
                          <td className="px-4 py-3 text-right font-mono text-rose-500">{fmtBRL(p.cmv)}</td>
                          <td className="px-4 py-3 text-right font-mono text-amber-600">{fmtBRL(p.comissao)}</td>
                          <td className="px-4 py-3 text-right font-mono text-amber-700">{fmtBRL(p.taxas)}</td>
                          <td className={`px-4 py-3 text-right font-mono font-bold ${p.resultado_operacional >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>{fmtBRL(p.resultado_operacional)}</td>
                          <td className="px-4 py-3 text-center font-mono">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              p.margem >= 40 
                                ? 'bg-emerald-50 text-emerald-600 border border-emerald-200' 
                                : p.margem >= 15 
                                ? 'bg-amber-50 text-amber-600 border border-amber-200' 
                                : 'bg-rose-50 text-rose-600 border border-rose-200'
                            }`}>
                              {(p.margem || 0).toFixed(1)}%
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </TabsContent>

        <TabsContent value="analitico_vendas">
          {!resultadoOperacional ? (
            <div className="text-zinc-400 p-8 text-center bg-white border border-zinc-200 rounded-xl">Carregando dados...</div>
          ) : (
            <div className="space-y-6 print-full-width">
              {/* Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-100 pb-3 no-print">
                <div className="relative flex-1 max-w-xs">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-zinc-400" />
                  <Input 
                    placeholder="Pesquisar venda (Nº, profissional, cliente)..." 
                    value={searchOperVenda}
                    onChange={(e) => setSearchOperVenda(e.target.value)}
                    className="pl-9 h-9 text-xs"
                  />
                </div>
                <div className="flex gap-2">
                  <Button onClick={() => window.print()} variant="outline" size="sm" className="text-xs h-8">
                    <Printer className="w-4 h-4 mr-1.5" /> PDF
                  </Button>
                  <Button 
                    onClick={() => handleExport(
                      'xlsx', 
                      'Analitico_Venda', 
                      ['Venda', 'Data', 'Cliente', 'Profissional', 'Valor Prod.', 'Valor Serv.', 'Faturamento Total', 'CMV', 'Comissão', 'Taxas', 'Resultado', 'Margem (%)'], 
                      ['numero', 'data', 'cliente', 'profissional', 'valor_produtos', 'valor_servicos', 'faturamento_total', 'cmv', 'comissao', 'taxas', 'resultado_operacional', 'margem'], 
                      sortedAndFilteredVendas.map(v => ({ ...v, data: new Date(v.data).toLocaleDateString('pt-BR') }))
                    )} 
                    variant="outline" 
                    size="sm" 
                    className="text-xs h-8"
                  >
                    Excel
                  </Button>
                  <Button 
                    onClick={() => handleExport(
                      'csv', 
                      'Analitico_Venda', 
                      ['Venda', 'Data', 'Cliente', 'Profissional', 'Valor Prod.', 'Valor Serv.', 'Faturamento Total', 'CMV', 'Comissão', 'Taxas', 'Resultado', 'Margem (%)'], 
                      ['numero', 'data', 'cliente', 'profissional', 'valor_produtos', 'valor_servicos', 'faturamento_total', 'cmv', 'comissao', 'taxas', 'resultado_operacional', 'margem'], 
                      sortedAndFilteredVendas.map(v => ({ ...v, data: new Date(v.data).toLocaleDateString('pt-BR') }))
                    )} 
                    variant="outline" 
                    size="sm" 
                    className="text-xs h-8"
                  >
                    CSV
                  </Button>
                </div>
              </div>

              {/* Table */}
              <div className="bg-white border border-zinc-200 rounded-xl overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full text-[11px] text-left border-collapse">
                    <thead>
                      <tr className="bg-zinc-50 border-b border-zinc-200 text-zinc-500 font-bold uppercase tracking-wider">
                        <th className="px-3 py-3">
                          <SortHeader label="Venda" field="numero" currentField={sortVendaField} direction={sortVendaDirection} onSort={(f) => {
                            if (sortVendaField === f) setSortVendaDirection(d => d === 'asc' ? 'desc' : 'asc');
                            else { setSortVendaField(f); setSortVendaDirection('desc'); }
                          }} />
                        </th>
                        <th className="px-3 py-3">
                          <SortHeader label="Data" field="data" currentField={sortVendaField} direction={sortVendaDirection} onSort={(f) => {
                            if (sortVendaField === f) setSortVendaDirection(d => d === 'asc' ? 'desc' : 'asc');
                            else { setSortVendaField(f); setSortVendaDirection('desc'); }
                          }} />
                        </th>
                        <th className="px-3 py-3">
                          <SortHeader label="Cliente" field="cliente" currentField={sortVendaField} direction={sortVendaDirection} onSort={(f) => {
                            if (sortVendaField === f) setSortVendaDirection(d => d === 'asc' ? 'desc' : 'asc');
                            else { setSortVendaField(f); setSortVendaDirection('desc'); }
                          }} />
                        </th>
                        <th className="px-3 py-3">
                          <SortHeader label="Profissional" field="profissional" currentField={sortVendaField} direction={sortVendaDirection} onSort={(f) => {
                            if (sortVendaField === f) setSortVendaDirection(d => d === 'asc' ? 'desc' : 'asc');
                            else { setSortVendaField(f); setSortVendaDirection('desc'); }
                          }} />
                        </th>
                        <th className="px-3 py-3 text-right">
                          <SortHeader label="Prod" field="valor_produtos" currentField={sortVendaField} direction={sortVendaDirection} onSort={(f) => {
                            if (sortVendaField === f) setSortVendaDirection(d => d === 'asc' ? 'desc' : 'asc');
                            else { setSortVendaField(f); setSortVendaDirection('desc'); }
                          }} />
                        </th>
                        <th className="px-3 py-3 text-right">
                          <SortHeader label="Serv" field="valor_servicos" currentField={sortVendaField} direction={sortVendaDirection} onSort={(f) => {
                            if (sortVendaField === f) setSortVendaDirection(d => d === 'asc' ? 'desc' : 'asc');
                            else { setSortVendaField(f); setSortVendaDirection('desc'); }
                          }} />
                        </th>
                        <th className="px-3 py-3 text-right">
                          <SortHeader label="Total" field="faturamento_total" currentField={sortVendaField} direction={sortVendaDirection} onSort={(f) => {
                            if (sortVendaField === f) setSortVendaDirection(d => d === 'asc' ? 'desc' : 'asc');
                            else { setSortVendaField(f); setSortVendaDirection('desc'); }
                          }} />
                        </th>
                        <th className="px-3 py-3 text-right">
                          <SortHeader label="CMV" field="cmv" currentField={sortVendaField} direction={sortVendaDirection} onSort={(f) => {
                            if (sortVendaField === f) setSortVendaDirection(d => d === 'asc' ? 'desc' : 'asc');
                            else { setSortVendaField(f); setSortVendaDirection('desc'); }
                          }} />
                        </th>
                        <th className="px-3 py-3 text-right">
                          <SortHeader label="Comiss." field="comissao" currentField={sortVendaField} direction={sortVendaDirection} onSort={(f) => {
                            if (sortVendaField === f) setSortVendaDirection(d => d === 'asc' ? 'desc' : 'asc');
                            else { setSortVendaField(f); setSortVendaDirection('desc'); }
                          }} />
                        </th>
                        <th className="px-3 py-3 text-right">
                          <SortHeader label="Taxas" field="taxas" currentField={sortVendaField} direction={sortVendaDirection} onSort={(f) => {
                            if (sortVendaField === f) setSortVendaDirection(d => d === 'asc' ? 'desc' : 'asc');
                            else { setSortVendaField(f); setSortVendaDirection('desc'); }
                          }} />
                        </th>
                        <th className="px-3 py-3 text-right">
                          <SortHeader label="Resultado" field="resultado_operacional" currentField={sortVendaField} direction={sortVendaDirection} onSort={(f) => {
                            if (sortVendaField === f) setSortVendaDirection(d => d === 'asc' ? 'desc' : 'asc');
                            else { setSortVendaField(f); setSortVendaDirection('desc'); }
                          }} />
                        </th>
                        <th className="px-3 py-3 text-center">
                          <SortHeader label="Margem" field="margem" currentField={sortVendaField} direction={sortVendaDirection} onSort={(f) => {
                            if (sortVendaField === f) setSortVendaDirection(d => d === 'asc' ? 'desc' : 'asc');
                            else { setSortVendaField(f); setSortVendaDirection('desc'); }
                          }} />
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-200">
                      {sortedAndFilteredVendas.length === 0 ? (
                        <tr>
                          <td colSpan={12} className="text-center py-8 text-zinc-400">Nenhuma venda encontrada.</td>
                        </tr>
                      ) : sortedAndFilteredVendas.map((v, idx) => (
                        <tr key={idx} className="hover:bg-zinc-50 transition-colors">
                          <td className="px-3 py-2.5 font-semibold text-zinc-700">{v.numero}</td>
                          <td className="px-3 py-2.5 text-zinc-500">{new Date(v.data).toLocaleDateString('pt-BR')}</td>
                          <td className="px-3 py-2.5 font-medium text-zinc-800 truncate max-w-[120px]" title={v.cliente}>{v.cliente}</td>
                          <td className="px-3 py-2.5 text-zinc-600 truncate max-w-[100px]" title={v.profissional}>{v.profissional}</td>
                          <td className="px-3 py-2.5 text-right font-mono text-zinc-700">{fmtBRL(v.valor_produtos)}</td>
                          <td className="px-3 py-2.5 text-right font-mono text-zinc-700">{fmtBRL(v.valor_servicos)}</td>
                          <td className="px-3 py-2.5 text-right font-mono text-zinc-800 font-semibold">{fmtBRL(v.faturamento_total)}</td>
                          <td className="px-3 py-2.5 text-right font-mono text-rose-500">{fmtBRL(v.cmv)}</td>
                          <td className="px-3 py-2.5 text-right font-mono text-amber-600">{fmtBRL(v.comissao)}</td>
                          <td className="px-3 py-2.5 text-right font-mono text-amber-700">{fmtBRL(v.taxas)}</td>
                          <td className={`px-3 py-2.5 text-right font-mono font-bold ${v.resultado_operacional >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>{fmtBRL(v.resultado_operacional)}</td>
                          <td className="px-3 py-2.5 text-center font-mono">
                            <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                              v.margem >= 35 
                                ? 'bg-emerald-50 text-emerald-600 border border-emerald-200' 
                                : v.margem >= 15 
                                ? 'bg-amber-50 text-amber-600 border border-amber-200' 
                                : 'bg-rose-50 text-rose-600 border border-rose-200'
                            }`}>
                              {(v.margem || 0).toFixed(1)}%
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

const Row = ({ label, value, bold, negative, highlight }) => (
  <div className={`flex items-center justify-between py-1 ${bold ? "text-base font-semibold" : "text-sm"} ${highlight ? "text-[#3A4F4A]" : ""}`}>
    <span className="text-zinc-600 dark:text-zinc-300 font-medium">{label}</span>
    <span className={`font-display ${bold ? "text-xl font-bold" : ""} ${negative ? "text-rose-600" : "text-zinc-800 dark:text-zinc-150"} ${highlight ? "text-2xl text-[#3A4F4A] dark:text-[#EAF0EE]" : ""}`}>{fmtBRL(value)}</span>
  </div>
);

const DRE_Row = ({ label, value, bold, negative, highlight, onClick }) => (
  <div 
    onClick={onClick}
    className={`flex items-center justify-between py-1.5 px-2 rounded-lg transition-all ${bold ? "text-base font-semibold" : "text-sm"} ${onClick ? "hover:bg-zinc-50 dark:hover:bg-zinc-900/50 cursor-pointer group" : ""} ${highlight ? "text-[#3A4F4A] dark:text-[#EAF0EE] bg-[#EAF0EE]/30 dark:bg-[#3A4F4A]/20 border border-[#EAF0EE]/60 dark:border-[#3A4F4A]/30 font-bold" : ""}`}
  >
    <span className={`text-zinc-600 dark:text-zinc-300 font-medium ${onClick ? "group-hover:text-[#3A4F4A] dark:group-hover:text-[#EAF0EE] group-hover:font-semibold" : ""}`}>
      {label}
      {onClick && <span className="ml-1.5 opacity-0 group-hover:opacity-100 transition-opacity text-[10px] font-normal text-[#84A59D]">(Ver Detalhes)</span>}
    </span>
    <span className={`font-display ${bold ? "text-xl font-bold" : ""} ${negative ? "text-rose-600" : "text-zinc-800 dark:text-zinc-150"} ${highlight ? "text-2xl text-[#3A4F4A] dark:text-[#EAF0EE]" : ""}`}>{fmtBRL(value)}</span>
  </div>
);
