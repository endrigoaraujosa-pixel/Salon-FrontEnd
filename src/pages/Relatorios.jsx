import React, { useEffect, useState } from "react";
import http from "../api";
import { useAuth } from "../auth";
import { toast } from "../components/ui/sonner";
import { PageHeader } from "../components/Page";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "../components/ui/tabs";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "../components/ui/select";
import SearchableSelect from "../components/SearchableSelect";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "../components/ui/dialog";
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from "../components/ui/tooltip";
import { FileText, Banknote, Package, TrendingUp, TrendingDown, User, Printer, Search, ArrowUpDown, Tag, Scissors, Clock, HelpCircle, Filter, ArrowLeft, AlertTriangle, AlertCircle, Coins, Flame, Zap, Calendar, Sliders, ClipboardList, Eye, CreditCard, ChevronLeft, ChevronRight, Percent } from "lucide-react";

const fmtBRL = (n) => (n || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const fmtDT = (s) => s ? new Date(s).toLocaleString("pt-BR") : "—";

const REPORT_PAGE_SIZE = 50;

const formatReportQuantidade = (qtd, item) => {
  const qty = Number(Number(qtd || 0).toFixed(3));
  const formattedQty = qty.toLocaleString("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: 3 });
  const qtyPerUnit = Number(item?.quantidade_por_embalagem || item?.quantidade_por_unidade || 0);
  if (qtyPerUnit > 0) {
    const eq = Number((qty / qtyPerUnit).toFixed(3));
    const formattedEq = eq.toLocaleString("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: 3 });
    return `${formattedEq} ${item?.unidade_medida || "un"} (${formattedQty} ${item?.unidade_medida_insumo || "un"})`;
  }
  return `${formattedQty} ${item?.unidade_medida || "un"}`;
};

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
  vale: "Vale-alimentação", credito_cliente: "Crédito Cliente", geral: "Total geral"
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

const REPORTS_LIST = [
  {
    id: "dre",
    title: "DRE",
    description: "Demonstrativo de Resultado do Exercício. Apresenta receitas, CMV e despesas operacionais para apurar o lucro líquido.",
    icon: FileText,
    category: "Financeiro",
    badgeColor: "bg-emerald-50 text-emerald-700 border-emerald-250 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-800/40",
    iconColor: "text-emerald-500"
  },
  {
    id: "caixa",
    title: "Caixa",
    description: "Detalhamento de fluxo de caixa por profissional, com visualização por forma de pagamento recebida no período.",
    icon: Banknote,
    category: "Financeiro",
    badgeColor: "bg-emerald-50 text-emerald-700 border-emerald-250 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-800/40",
    iconColor: "text-emerald-500"
  },
  {
    id: "cartoes",
    title: "Cartões",
    description: "Relatório analítico de vendas e pagamentos por cartão, com conciliação de adquirentes e detalhamento de taxas.",
    icon: CreditCard,
    category: "Financeiro",
    badgeColor: "bg-emerald-50 text-emerald-700 border-emerald-250 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-800/40",
    iconColor: "text-emerald-500"
  },
  {
    id: "produtos",
    title: "Produtos",
    description: "Relatório de venda de produtos físicos, contendo quantidade vendida, faturamento, custo (CMV) e lucro bruto.",
    icon: Package,
    category: "Vendas",
    badgeColor: "bg-amber-50 text-amber-700 border-amber-250 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-800/40",
    iconColor: "text-amber-500"
  },
  {
    id: "servicos",
    title: "Serviços",
    description: "Relatório de prestação de serviços, com quantidade realizada, faturamento, tempo de execução e ticket médio.",
    icon: Scissors,
    category: "Vendas",
    badgeColor: "bg-amber-50 text-amber-700 border-amber-250 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-800/40",
    iconColor: "text-amber-500"
  },
  {
    id: "resultado_consolidado",
    title: "Resultado Consolidado",
    description: "Visão consolidada do resultado operacional, unificando receitas de produtos e serviços frente aos custos e taxas.",
    icon: TrendingUp,
    category: "Rentabilidade",
    badgeColor: "bg-indigo-50 text-indigo-700 border-indigo-250 dark:bg-indigo-950/30 dark:text-indigo-400 dark:border-indigo-800/40",
    iconColor: "text-indigo-500"
  },
  {
    id: "rentabilidade_servicos",
    title: "Rentabilidade de Serviços",
    description: "Análise de lucratividade individual dos serviços oferecidos, calculando a margem real de cada procedimento.",
    icon: Scissors,
    category: "Rentabilidade",
    badgeColor: "bg-indigo-50 text-indigo-700 border-indigo-250 dark:bg-indigo-950/30 dark:text-indigo-400 dark:border-indigo-800/40",
    iconColor: "text-indigo-500"
  },
  {
    id: "rentabilidade_produtos",
    title: "Rentabilidade de Produtos",
    description: "Análise de lucratividade dos produtos vendidos, avaliando margens individuais e custos de aquisição.",
    icon: Package,
    category: "Rentabilidade",
    badgeColor: "bg-indigo-50 text-indigo-700 border-indigo-250 dark:bg-indigo-950/30 dark:text-indigo-400 dark:border-indigo-800/40",
    iconColor: "text-indigo-500"
  },
  {
    id: "analitico_vendas",
    title: "Analítico por Venda",
    description: "Detalhamento transacional por venda de produtos e serviços, identificando receitas, CMV, comissões e taxas de cada transação.",
    icon: FileText,
    category: "Financeiro",
    badgeColor: "bg-emerald-50 text-emerald-700 border-emerald-250 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-800/40",
    iconColor: "text-emerald-500"
  },
  {
    id: "estoque_atual",
    title: "Estoque Atual",
    description: "Visão detalhada do estoque físico de produtos por categoria, incluindo quantidades atuais, custo de aquisição e valor total em estoque.",
    icon: Package,
    category: "Estoque",
    badgeColor: "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/30 dark:text-rose-455 dark:border-rose-800/40",
    iconColor: "text-rose-500"
  },
  {
    id: "estoque_movimentacao",
    title: "Movimentação de Estoque",
    description: "Histórico completo de entradas, saídas e ajustes manuais ou automáticos de estoque no período.",
    icon: ArrowUpDown,
    category: "Estoque",
    badgeColor: "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/30 dark:text-rose-455 dark:border-rose-800/40",
    iconColor: "text-rose-500"
  },
  {
    id: "estoque_abaixo_minimo",
    title: "Abaixo do Estoque Mínimo",
    description: "Lista de produtos cuja quantidade física está abaixo do limite de segurança configurado (estoque mínimo).",
    icon: AlertTriangle,
    category: "Estoque",
    badgeColor: "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/30 dark:text-rose-455 dark:border-rose-800/40",
    iconColor: "text-rose-500"
  },
  {
    id: "estoque_sem_estoque",
    title: "Sem Estoque (Zerados)",
    description: "Lista de produtos com saldo zerado ou negativo no estoque físico, com indicação do último movimento registrado.",
    icon: AlertCircle,
    category: "Estoque",
    badgeColor: "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/30 dark:text-rose-455 dark:border-rose-800/40",
    iconColor: "text-rose-500"
  },
  {
    id: "estoque_valorizacao",
    title: "Valorização do Estoque",
    description: "Análise financeira do inventário, comparando o valor total sob preço de custo com o faturamento e lucro bruto potencial de venda.",
    icon: Coins,
    category: "Estoque",
    badgeColor: "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/30 dark:text-rose-455 dark:border-rose-800/40",
    iconColor: "text-rose-500"
  },
  {
    id: "estoque_consumo_insumos",
    title: "Consumo de Insumos",
    description: "Relatório de materiais de consumo e insumos utilizados pelos profissionais na execução de serviços concluídos no período.",
    icon: Flame,
    category: "Estoque",
    badgeColor: "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/30 dark:text-rose-455 dark:border-rose-800/40",
    iconColor: "text-rose-500"
  },
  {
    id: "estoque_mais_movimentados",
    title: "Mais Movimentados",
    description: "Ranking dos produtos com maior volume de fluxo de estoque (entradas e saídas combinadas) no período.",
    icon: Zap,
    category: "Estoque",
    badgeColor: "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/30 dark:text-rose-455 dark:border-rose-800/40",
    iconColor: "text-rose-500"
  },
  {
    id: "estoque_sem_movimentacao",
    title: "Sem Movimentação (Giro Lento)",
    description: "Produtos que não registraram nenhuma movimentação de estoque física durante o período selecionado.",
    icon: Calendar,
    category: "Estoque",
    badgeColor: "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/30 dark:text-rose-455 dark:border-rose-800/40",
    iconColor: "text-rose-500"
  },
  {
    id: "estoque_historico_ajustes",
    title: "Histórico de Ajustes Manuais",
    description: "Relação de correções manuais de estoque efetuadas por usuários, detalhando quantidade anterior, ajustada e observações.",
    icon: Sliders,
    category: "Estoque",
    badgeColor: "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/30 dark:text-rose-455 dark:border-rose-800/40",
    iconColor: "text-rose-500"
  },
  {
    id: "estoque_inventario",
    title: "Conferência de Inventário",
    description: "Relatório de apoio para contagem física de estoque, apresentando quantidade do sistema e campos para anotação de diferenças.",
    icon: ClipboardList,
    category: "Estoque",
    badgeColor: "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/30 dark:text-rose-455 dark:border-rose-800/40",
    iconColor: "text-rose-500"
  },
  {
    id: "estoque_perdas_quebras",
    title: "Perdas e Quebras",
    description: "Consolidado de ajustes de estoque negativos decorrentes de desperdícios, quebras, validades expiradas ou roubos.",
    icon: TrendingDown,
    category: "Estoque",
    badgeColor: "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/30 dark:text-rose-455 dark:border-rose-800/40",
    iconColor: "text-rose-500"
  }
];

/**
 * Maps each report tab id to the permission key required to view it.
 * Returns null for reports that don't require a specific permission (admin-only check is still applied).
 */
const getReportPermKey = (tab) => {
  if (!tab) return null;
  if (tab === "dre") return "relatorios.dre";
  if (tab === "caixa") return "relatorios.caixa";
  if (tab === "cartoes") return "relatorios.cartoes";
  if (tab === "produtos" || tab === "servicos") return "relatorios.vendas";
  if (["resultado_consolidado", "rentabilidade_servicos", "rentabilidade_produtos", "analitico_vendas"].includes(tab)) return "relatorios.operacional";
  if (tab.startsWith("estoque")) return "relatorios.estoque";
  return null;
};

export default function Relatorios() {
  const { user } = useAuth();
  const [from, setFrom] = useState(firstDayMonth());
  const [to, setTo] = useState(todayStr());
  const [tab, setTab] = useState("dre");
  const [dre, setDre] = useState(null);
  const [caixa, setCaixa] = useState(null);
  const [produtos, setProdutos] = useState(null);
  const [servicos, setServicos] = useState(null);
  const [cartoes, setCartoes] = useState(null);
  
  const [adquirentesList, setAdquirentesList] = useState([]);
  const [formasCartaoList, setFormasCartaoList] = useState([]);
  
  const getFormaLabel = (forma) => {
    if (FORMA_LABELS[forma]) return FORMA_LABELS[forma];
    const found = formasCartaoList.find(f => f.forma_pagamento === forma);
    if (found) return found.descricao;
    
    if (typeof forma === 'string') {
      if (forma.startsWith('debito_')) return 'Débito (Customizado)';
      if (forma.startsWith('credito_')) return 'Crédito (Customizado)';
    }
    return forma;
  };

  const getFilterPaymentOptions = () => {
    const baseOptions = Object.entries(FORMA_LABELS).filter(([k]) => k !== 'geral').map(([k, l]) => ({ v: k, l }));
    const customOptions = formasCartaoList.filter(f => f.adquirente_id !== null).map(f => ({ v: f.forma_pagamento, l: f.descricao }));
    return [...baseOptions, ...customOptions];
  };

  const [filterCartaoAdquirente, setFilterCartaoAdquirente] = useState("todos");
  const [filterCartaoTipo, setFilterCartaoTipo] = useState("todos");
  const [filterCartaoForma, setFilterCartaoForma] = useState("todos");
  
  // New navigation and generation states
  const [selectedReport, setSelectedReport] = useState(null);
  const [isGenerated, setIsGenerated] = useState(false);
  const [loadingReport, setLoadingReport] = useState(false);
  const [searchReportQuery, setSearchReportQuery] = useState("");
  const [generatedFilters, setGeneratedFilters] = useState(null);
  const [helpOpen, setHelpOpen] = useState(false);

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
  const [rentabilidadeProdutosPage, setRentabilidadeProdutosPage] = useState(1);
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

  // Rentabilidade individual detail states
  const [rentabilidadeDetailOpen, setRentabilidadeDetailOpen] = useState(false);
  const [selectedDetailItem, setSelectedDetailItem] = useState(null);
  const [detailType, setDetailType] = useState(""); // 'servico' | 'produto'
  const [detailLaunches, setDetailLaunches] = useState([]);

  const handleShowRentabilidadeDetail = (item, type) => {
    setSelectedDetailItem(item);
    setDetailType(type);
    const name = type === 'servico' ? item.servico_nome : item.produto_nome;
    const launches = type === 'servico'
      ? (resultadoOperacional?.detalhes_servicos || []).filter(s => s.servico_nome === name)
      : (resultadoOperacional?.detalhes_produtos || []).filter(p => p.produto_nome === name);
    setDetailLaunches(launches);
    setRentabilidadeDetailOpen(true);
  };

  // Consumo individual detail states
  const [consumoDetailOpen, setConsumoDetailOpen] = useState(false);
  const [selectedConsumoItem, setSelectedConsumoItem] = useState(null);

  const handleShowConsumoDetail = (item) => {
    setSelectedConsumoItem(item);
    setConsumoDetailOpen(true);
  };

  const handleDrilldown = (title, data) => {
    setDrilldownTitle(title);
    setDrilldownData(data || []);
    setDrilldownOpen(true);
  };
  
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
  const [produtosPage, setProdutosPage] = useState(1);

  // Busca e Ordenação de Serviços
  const [searchQueryServico, setSearchQueryServico] = useState("");
  const [sortFieldServico, setSortFieldServico] = useState("data_hora");
  const [sortDirectionServico, setSortDirectionServico] = useState("desc");

  // Estoque specific states
  const [estoqueReportData, setEstoqueReportData] = useState(null);
  const [filterEstoqueCategorias, setFilterEstoqueCategorias] = useState([]);
  const [filterEstoqueProduto, setFilterEstoqueProduto] = useState("todos");
  const [searchEstoqueQuery, setSearchEstoqueQuery] = useState("");
  const [sortEstoqueField, setSortEstoqueField] = useState("");
  const [sortEstoqueDirection, setSortEstoqueDirection] = useState("asc");
  const [estoquePage, setEstoquePage] = useState(1);

  useEffect(() => {
    http.get("/colaboradores").then((r) => setColaboradores(r.data)).catch(() => {});
    http.get("/produtos").then((r) => setProdutosList(r.data)).catch(() => {});
    http.get("/servicos").then((r) => setServicosList(r.data)).catch(() => {});
    http.get("/clientes").then((r) => setClientesList(r.data)).catch(() => {});
    http.get("/categorias").then((r) => {
      const cats = r.data || [];
      setCategoriesList(cats);
      setFilterEstoqueCategorias(cats.map(c => c.id));
    }).catch(() => {});
    http.get("/configuracoes/empresa").then((r) => setEmpresa(r.data)).catch(() => {});
    http.get("/adquirentes").then((r) => setAdquirentesList(r.data || [])).catch(() => {});
    http.get("/configuracoes/taxas-cartao").then((r) => setFormasCartaoList(r.data || [])).catch(() => {});
  }, []);

  useEffect(() => {
    if (tab === "caixa" && !hasInitializedCaixa) {
      setFrom(todayStr());
      setTo(todayStr());
      setHasInitializedCaixa(true);
    }
  }, [tab, hasInitializedCaixa]);

  const reload = (options = {}) => {
    // --- Permission pre-check (before the spinner is shown) ---
    const permKey = getReportPermKey(tab);
    if (permKey && user?.role !== 'admin') {
      const hasPermission = user?.perfil?.permissoes?.[permKey] === true;
      if (!hasPermission) {
        const reportTitle = REPORTS_LIST.find(r => r.id === tab)?.title || "este relatório";
        toast.error(`Sem permissão: Você não tem acesso ao relatório "${reportTitle}".`);
        return; // abort — never shows the loading spinner
      }
    }
    // -----------------------------------------------------------
    setLoadingReport(true);
    const params = { data_inicio: from, data_fim: to };
    const nextProdutosPage = options.produtosPage || produtosPage;
    const nextProdutoSearch = options.produtoSearch ?? searchQuery;
    const nextProdutoSortField = options.produtoSortField || sortField;
    const nextProdutoSortDirection = options.produtoSortDirection || sortDirection;
    let promise = Promise.resolve();

    if (tab === "dre") {
      const dreParams = {
        data_inicio: from,
        data_fim: to,
        categoria: filterDreCategory,
        status: filterDreStatus
      };
      promise = http.get("/relatorios/dre", { params: dreParams })
        .then((r) => setDre(r.data))
        .catch((err) => {
          console.error("DRE error:", err);
          if (err.response?.status === 403) {
            toast.error("Acesso negado: Você não tem permissão para visualizar o relatório DRE.");
          } else {
            toast.error("Erro ao carregar o relatório DRE.");
          }
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
      promise = http.get("/relatorios/caixa", { params: caixaParams })
        .then((r) => setCaixa(r.data))
        .catch((err) => {
          console.error("Caixa error:", err);
          if (err.response?.status === 403) {
            toast.error("Acesso negado: Você não tem permissão para visualizar o relatório de caixa.");
          } else {
            toast.error("Erro ao carregar o relatório de caixa.");
          }
          setCaixa({
            pagamentos: [],
            total: 0,
            total_pagamentos: 0,
            totais: {
              bruto: 0,
              troco: 0,
              geral: 0,
              dinheiro: 0,
              pix: 0,
              cartao_credito: 0,
              cartao_debito: 0,
              vale: 0,
              credito_cliente: 0
            }
          });
        });
    }
    if (tab === "cartoes") {
      const cartoesParams = {
        data_inicio: from,
        data_fim: to,
        adquirente_id: filterCartaoAdquirente,
        cartao_tipo: filterCartaoTipo,
        forma_pagamento: filterCartaoForma
      };
      promise = http.get("/relatorios/cartoes", { params: cartoesParams })
        .then((r) => setCartoes(r.data))
        .catch((err) => {
          console.error("Cartoes error:", err);
          if (err.response?.status === 403) {
            toast.error("Acesso negado: Você não tem permissão para visualizar o relatório de cartões.");
          } else {
            toast.error("Erro ao carregar o relatório de cartões.");
          }
          setCartoes({ transacoes: [], totais: { bruto: 0, taxa: 0, liquido: 0 }, por_adquirente: [] });
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
        status: filterStatus,
        page: nextProdutosPage,
        limit: REPORT_PAGE_SIZE,
        search: nextProdutoSearch,
        sort_field: nextProdutoSortField,
        sort_direction: nextProdutoSortDirection
      };
      promise = http.get("/relatorios/produtos", { params: prodParams })
        .then((r) => setProdutos(r.data))
        .catch((err) => {
          console.error("Produtos error:", err);
          if (err.response?.status === 403) {
            toast.error("Acesso negado: Você não tem permissão para visualizar o relatório de produtos.");
          } else {
            toast.error("Erro ao carregar o relatório de produtos.");
          }
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
      promise = http.get("/relatorios/servicos", { params: servParams })
        .then((r) => setServicos(r.data))
        .catch((err) => {
          console.error("Servicos error:", err);
          if (err.response?.status === 403) {
            toast.error("Acesso negado: Você não tem permissão para visualizar o relatório de serviços.");
          } else {
            toast.error("Erro ao carregar o relatório de serviços.");
          }
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
      promise = http.get("/relatorios/resultado-operacional", { params: operParams })
        .then((r) => setResultadoOperacional(r.data))
        .catch((err) => {
          console.error("Resultado Operacional error:", err);
          if (err.response?.status === 403) {
            toast.error("Acesso negado: Você não tem permissão para visualizar este relatório operacional.");
          } else {
            toast.error("Erro ao carregar o relatório de resultado operacional.");
          }
          setResultadoOperacional({
            consolidado: { receita_servicos: 0, receita_produtos: 0, receita_total: 0, cmv: 0, comissoes: 0, taxas: 0, resultado_operacional: 0, margem_operacional: 0 },
            servicos: [],
            produtos: [],
            vendas: []
          });
        });
    }
    if (tab && tab.startsWith("estoque")) {
      const catsParam = filterEstoqueCategorias.join(",");
      const prodId = filterEstoqueProduto === "todos" ? undefined : filterEstoqueProduto;

      let endpoint = "";
      if (tab === "estoque_atual") endpoint = "/relatorios/estoque";
      else if (tab === "estoque_movimentacao") endpoint = "/relatorios/estoque/movimentacao";
      else if (tab === "estoque_abaixo_minimo") endpoint = "/relatorios/estoque/abaixo-minimo";
      else if (tab === "estoque_sem_estoque") endpoint = "/relatorios/estoque/sem-estoque";
      else if (tab === "estoque_valorizacao") endpoint = "/relatorios/estoque/valorizacao";
      else if (tab === "estoque_consumo_insumos") endpoint = "/relatorios/estoque/consumo-insumos";
      else if (tab === "estoque_mais_movimentados") endpoint = "/relatorios/estoque/mais-movimentados";
      else if (tab === "estoque_sem_movimentacao") endpoint = "/relatorios/estoque/sem-movimentacao";
      else if (tab === "estoque_historico_ajustes") endpoint = "/relatorios/estoque/historico-ajustes";
      else if (tab === "estoque_inventario") endpoint = "/relatorios/estoque/inventario";
      else if (tab === "estoque_perdas_quebras") endpoint = "/relatorios/estoque/perdas-quebras";

      const queryParams = {
        data_inicio: from,
        data_fim: to,
        categorias: catsParam,
        produto_id: prodId
      };

      promise = http.get(endpoint, { params: queryParams })
        .then((r) => setEstoqueReportData(r.data))
        .catch((err) => {
          console.error(`Error loading ${tab}:`, err);
          if (err.response?.status === 403) {
            toast.error("Acesso negado: Você não tem permissão para visualizar este relatório de estoque.");
          } else {
            toast.error("Erro ao carregar o relatório de estoque.");
          }
          setEstoqueReportData(null);
        });
    }

    promise.finally(() => setLoadingReport(false));
  };

  // Automatic reload is disabled. Users click "Gerar Consulta" to run reload() manually.

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

  const rentabilidadeProdutosTotalPages = Math.ceil(sortedAndFilteredProdutos.length / REPORT_PAGE_SIZE);
  const rentabilidadeProdutosActivePage = Math.min(Math.max(1, rentabilidadeProdutosPage), Math.max(1, rentabilidadeProdutosTotalPages));
  const paginatedRentabilidadeProdutos = sortedAndFilteredProdutos.slice(
    (rentabilidadeProdutosActivePage - 1) * REPORT_PAGE_SIZE,
    rentabilidadeProdutosActivePage * REPORT_PAGE_SIZE
  );

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

  const totalsVendas = sortedAndFilteredVendas.reduce((acc, v) => {
    acc.produtos += v.valor_produtos || 0;
    acc.servicos += v.valor_servicos || 0;
    acc.faturamento += v.faturamento_total || 0;
    acc.cmv += v.cmv || 0;
    acc.comissao += v.comissao || 0;
    acc.taxas += v.taxas || 0;
    acc.resultado += v.resultado_operacional || 0;
    return acc;
  }, { produtos: 0, servicos: 0, faturamento: 0, cmv: 0, comissao: 0, taxas: 0, resultado: 0 });

  const totalMargemVendas = totalsVendas.faturamento > 0 ? (totalsVendas.resultado / totalsVendas.faturamento) * 100 : 0;

  const isTaxaHabilitada = !!resultadoOperacional?.descontar_taxa_cartao_comissao;

  const totalsServicos = sortedAndFilteredServicos.reduce((acc, s) => {
    acc.quantidade += s.quantidade || 0;
    acc.faturamento += s.faturamento || 0;
    acc.insumos += s.insumos || 0;
    acc.comissao += s.comissao || 0;
    if (isTaxaHabilitada) {
      acc.taxas += s.taxas || 0;
      acc.resultado += s.resultado_operacional || 0;
    } else {
      acc.taxas += 0;
      acc.resultado += (s.resultado_operacional || 0) + (s.taxas || 0);
    }
    return acc;
  }, { quantidade: 0, faturamento: 0, insumos: 0, comissao: 0, taxas: 0, resultado: 0 });

  const totalMargemServicos = totalsServicos.faturamento > 0 ? (totalsServicos.resultado / totalsServicos.faturamento) * 100 : 0;


  const handleSelectReport = (reportId) => {
    setSelectedReport(reportId);
    setTab(reportId);
    setIsGenerated(false);
    setGeneratedFilters(null);
    setEstoqueReportData(null);
    setSearchEstoqueQuery("");
    setSortEstoqueField("");
    setSortEstoqueDirection("asc");
    setEstoquePage(1);
  };

  const handleGenerate = () => {
    const nextProdutosPage = tab === "produtos" ? 1 : produtosPage;
    if (tab === "produtos") {
      setProdutosPage(1);
    }
    setIsGenerated(true);
    setEstoquePage(1);
    setGeneratedFilters({
      from, to, colaboradorId,
      filterColaborador, filterProduto, filterCategoria, filterFormaPagamento, filterCliente, filterStatus,
      filterColaboradorServico, filterServico, filterFormaPagamentoServico, filterClienteServico, filterStatusServico,
      filterDreCategory, filterDreStatus,
      filterOperacionalColab, filterOperacionalCatServico, filterOperacionalCatProduto, filterUnidade,
      filterEstoqueCategorias, filterEstoqueProduto
    });
    reload({ produtosPage: nextProdutosPage });
  };

  const handleProdutosPageChange = (page) => {
    setProdutosPage(page);
    reload({ produtosPage: page });
  };

  const hasChanges = generatedFilters && (
    generatedFilters.from !== from ||
    generatedFilters.to !== to ||
    (tab === "caixa" && generatedFilters.colaboradorId !== colaboradorId) ||
    (tab === "dre" && (generatedFilters.filterDreCategory !== filterDreCategory || generatedFilters.filterDreStatus !== filterDreStatus)) ||
    (tab === "produtos" && (
      generatedFilters.filterColaborador !== filterColaborador ||
      generatedFilters.filterProduto !== filterProduto ||
      generatedFilters.filterCategoria !== filterCategoria ||
      generatedFilters.filterFormaPagamento !== filterFormaPagamento ||
      generatedFilters.filterCliente !== filterCliente ||
      generatedFilters.filterStatus !== filterStatus
    )) ||
    (tab === "servicos" && (
      generatedFilters.filterColaboradorServico !== filterColaboradorServico ||
      generatedFilters.filterServico !== filterServico ||
      generatedFilters.filterFormaPagamentoServico !== filterFormaPagamentoServico ||
      generatedFilters.filterClienteServico !== filterClienteServico ||
      generatedFilters.filterStatusServico !== filterStatusServico
    )) ||
    (["resultado_consolidado", "rentabilidade_servicos", "rentabilidade_produtos", "analitico_vendas"].includes(tab) && (
      generatedFilters.filterOperacionalColab !== filterOperacionalColab ||
      generatedFilters.filterOperacionalCatServico !== filterOperacionalCatServico ||
      generatedFilters.filterOperacionalCatProduto !== filterOperacionalCatProduto ||
      generatedFilters.filterUnidade !== filterUnidade
    )) ||
    (tab && tab.startsWith("estoque") && (
      JSON.stringify(generatedFilters.filterEstoqueCategorias) !== JSON.stringify(filterEstoqueCategorias) ||
      generatedFilters.filterEstoqueProduto !== filterEstoqueProduto
    ))
  );

  useEffect(() => {
    if (!isGenerated || tab !== "produtos" || hasChanges) return;
    const timer = setTimeout(() => {
      setProdutosPage(1);
      reload({ produtosPage: 1, produtoSearch: searchQuery });
    }, 350);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const renderEstoqueReport = (tabName) => {
    if (!isGenerated) {
      return (
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-8 text-center text-zinc-500 max-w-lg mx-auto shadow-sm">
          <Package className="w-12 h-12 text-[#84A59D] mx-auto mb-4 animate-pulse" />
          <h3 className="text-lg font-bold text-zinc-800 dark:text-zinc-200 mb-2">Relatório Pronto para Consulta</h3>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-4 leading-relaxed">
            Selecione as categorias de produtos e utilize os filtros temporais acima para personalizar seu relatório de estoque. Clique em "Gerar Consulta" para visualizar.
          </p>
        </div>
      );
    }

    if (loadingReport) {
      return (
        <div className="flex flex-col items-center justify-center p-12 text-zinc-500">
          <span className="w-8 h-8 border-4 border-[#84A59D] border-t-transparent rounded-full animate-spin mb-4"></span>
          <p className="text-xs font-semibold">Buscando informações no estoque...</p>
        </div>
      );
    }

    if (!estoqueReportData) {
      return (
        <div className="text-center p-8 text-zinc-400">
          Nenhum dado encontrado para o período ou filtros selecionados.
        </div>
      );
    }

    let dataList = [];
    let kpis = [];
    let headers = [];
    let rowRenderer = null;
    let exportTitle = "";
    let exportHeaders = [];
    let exportKeys = [];

    if (tabName === "estoque_atual") {
      dataList = estoqueReportData.produtos || [];
      exportTitle = "Estoque Atual";
      exportHeaders = ["Produto", "Categoria", "Estoque Físico", "Unidade", "Estoque Mínimo", "Custo Unitário", "Custo Total", "Preço Venda", "Venda Total", "Status"];
      exportKeys = ["produto_nome", "categoria_nome", "quantidade_estoque", "unidade_medida", "estoque_minimo", "custo_unitario", "valor_total_custo", "preco_venda", "valor_total_venda", "situacao"];

      const totalItens = estoqueReportData.totais?.total_itens || 0;
      const totalCusto = estoqueReportData.totais?.total_custo || 0;
      const totalVenda = estoqueReportData.totais?.total_venda || 0;
      const itensAlerta = estoqueReportData.totais?.itens_alerta || 0;

      kpis = [
        { label: "Total de Itens", value: totalItens, icon: Package, color: "text-blue-500", bg: "bg-blue-50" },
        { label: "Custo Total em Estoque", value: fmtBRL(totalCusto), icon: Coins, color: "text-amber-500", bg: "bg-amber-50" },
        { label: "Valor Total de Venda", value: fmtBRL(totalVenda), icon: TrendingUp, color: "text-emerald-500", bg: "bg-emerald-50" },
        { label: "Itens em Alerta Mínimo", value: itensAlerta, icon: AlertTriangle, color: "text-rose-500", bg: "bg-rose-50" }
      ];

      headers = [
        { label: "Produto", key: "produto_nome" },
        { label: "Categoria", key: "categoria_nome" },
        { label: "Estoque Físico", key: "quantidade_estoque" },
        { label: "Estoque Mínimo", key: "estoque_minimo" },
        { label: "Custo Unitário", key: "custo_unitario" },
        { label: "Custo Total", key: "valor_total_custo" },
        { label: "Preço Venda", key: "preco_venda" },
        { label: "Venda Total", key: "valor_total_venda" },
        { label: "Situação", key: "situacao" }
      ];

      rowRenderer = (item) => {
        const isAlerta = item.quantidade_estoque <= item.estoque_minimo;
        return (
          <>
            <td className="px-4 py-2.5 font-medium text-zinc-850 dark:text-zinc-100">{item.produto_nome}</td>
            <td className="px-4 py-2.5 text-zinc-500">{item.categoria_nome || "-"}</td>
            <td className="px-4 py-2.5 text-zinc-700 dark:text-zinc-350">{formatReportQuantidade(item.quantidade_estoque, item)}</td>
            <td className="px-4 py-2.5 text-zinc-500">{formatReportQuantidade(item.estoque_minimo, item)}</td>
            <td className="px-4 py-2.5 text-zinc-700 dark:text-zinc-350">{fmtBRL(item.custo_unitario)}</td>
            <td className="px-4 py-2.5 text-zinc-700 dark:text-zinc-350 font-semibold">{fmtBRL(item.valor_total_custo)}</td>
            <td className="px-4 py-2.5 text-zinc-700 dark:text-zinc-350">{fmtBRL(item.preco_venda)}</td>
            <td className="px-4 py-2.5 text-zinc-700 dark:text-zinc-350 font-semibold">{fmtBRL(item.valor_total_venda)}</td>
            <td className="px-4 py-2.5">
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border whitespace-nowrap ${isAlerta ? 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/30 dark:text-rose-400 dark:border-rose-800/50' : 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-800/50'}`}>
                {isAlerta ? 'Alerta Mínimo' : 'OK'}
              </span>
            </td>
          </>
        );
      };
    }
    else if (tabName === "estoque_movimentacao") {
      dataList = estoqueReportData.movimentacoes || [];
      exportTitle = "Movimentação de Estoque";
      exportHeaders = ["Data/Hora", "Produto", "Categoria", "Tipo", "Quantidade", "Responsável", "Motivo"];
      exportKeys = ["criado_em", "produto_nome", "categoria_nome", "tipo", "quantidade", "usuario_nome", "motivo"];

      const totalEntradas = estoqueReportData.totais?.total_entradas || 0;
      const totalSaidas = estoqueReportData.totais?.total_saidas || 0;
      const totalAjustes = estoqueReportData.totais?.total_ajustes || 0;
      const totalRegs = estoqueReportData.totais?.total_movimentacoes || 0;

      kpis = [
        { 
          label: "Entradas no Período", 
          value: Number(Number(totalEntradas).toFixed(3)), 
          icon: TrendingUp, 
          color: "text-emerald-500", 
          bg: "bg-emerald-50",
          tooltip: "Soma das quantidades de todos os produtos que deram entrada no estoque durante o período selecionado." 
        },
        { 
          label: "Saídas no Período", 
          value: Number(Number(totalSaidas).toFixed(3)), 
          icon: TrendingDown, 
          color: "text-rose-500", 
          bg: "bg-rose-50",
          tooltip: "Soma das quantidades de todos os produtos que saíram do estoque (por venda, perda, consumo, etc.) no período." 
        },
        { 
          label: "Ajustes de Estoque", 
          value: Number(Number(totalAjustes).toFixed(3)), 
          icon: Sliders, 
          color: "text-amber-500", 
          bg: "bg-amber-50",
          tooltip: "Soma das quantidades absolutas de ajustes manuais de estoque realizados no período." 
        },
        { 
          label: "Total Movimentações", 
          value: totalRegs, 
          icon: ArrowUpDown, 
          color: "text-blue-500", 
          bg: "bg-blue-50",
          tooltip: "Contagem total de registros de movimentações (entradas, saídas ou ajustes) ocorridos no período." 
        }
      ];

      headers = [
        { label: "Data/Hora", key: "criado_em" },
        { label: "Produto", key: "produto_nome" },
        { label: "Categoria", key: "categoria_nome" },
        { label: "Tipo", key: "tipo" },
        { label: "Quantidade", key: "quantidade" },
        { label: "Responsável", key: "usuario_nome" },
        { label: "Motivo", key: "motivo" }
      ];

      rowRenderer = (item) => {
        let typeBadge = "";
        let IconComponent = null;
        if (item.tipo === "entrada") {
          typeBadge = "bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-900/30";
          IconComponent = TrendingUp;
        } else if (item.tipo === "saida") {
          typeBadge = "bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-950/20 dark:text-rose-400 dark:border-rose-900/30";
          IconComponent = TrendingDown;
        } else if (item.tipo === "ajuste") {
          typeBadge = "bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/20 dark:text-amber-400 dark:border-amber-900/30";
          IconComponent = Sliders;
        } else {
          typeBadge = "bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-950/20 dark:text-blue-400 dark:border-blue-900/30";
          IconComponent = Clock;
        }
        return (
          <>
            <td className="px-4 py-2.5 text-zinc-700 dark:text-zinc-350">{new Date(item.criado_em).toLocaleString("pt-BR")}</td>
            <td className="px-4 py-2.5 font-medium text-zinc-850 dark:text-zinc-100">{item.produto_nome}</td>
            <td className="px-4 py-2.5 text-zinc-550">{item.categoria_nome || "-"}</td>
            <td className="px-4 py-2.5">
              <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold capitalize ${typeBadge}`}>
                {IconComponent && <IconComponent className="w-3 h-3 shrink-0" />}
                {item.tipo}
              </span>
            </td>
            <td className="px-4 py-2.5 font-semibold text-zinc-700 dark:text-zinc-350">{formatReportQuantidade(item.quantidade, item)}</td>
            <td className="px-4 py-2.5 text-zinc-650 dark:text-zinc-350">{item.usuario_nome || "Sistema"}</td>
            <td className="px-4 py-2.5 text-zinc-550 text-xs italic max-w-xs truncate" title={item.motivo}>{item.motivo || "-"}</td>
          </>
        );
      };
    }
    else if (tabName === "estoque_abaixo_minimo") {
      dataList = estoqueReportData.produtos || [];
      exportTitle = "Abaixo do Estoque Mínimo";
      exportHeaders = ["Produto", "Categoria", "Estoque Físico", "Unidade", "Estoque Mínimo", "Diferença"];
      exportKeys = ["produto_nome", "categoria_nome", "quantidade_estoque", "unidade_medida", "estoque_minimo", "diferenca"];

      const totalCriticos = estoqueReportData.totais?.total_produtos || 0;

      kpis = [
        { label: "Itens Abaixo do Mínimo", value: totalCriticos, icon: AlertTriangle, color: "text-rose-500", bg: "bg-rose-50" }
      ];

      headers = [
        { label: "Produto", key: "produto_nome" },
        { label: "Categoria", key: "categoria_nome" },
        { label: "Estoque Físico", key: "quantidade_estoque" },
        { label: "Estoque Mínimo", key: "estoque_minimo" },
        { label: "Diferença", key: "diferenca" }
      ];

      rowRenderer = (item) => {
        const diff = (item.estoque_minimo || 0) - (item.quantidade_estoque || 0);
        const baixo = item.quantidade_estoque < item.estoque_minimo;
        const proximo = item.quantidade_estoque >= item.estoque_minimo && item.quantidade_estoque <= item.estoque_minimo * 1.2;
        const pct = item.estoque_minimo > 0 ? (item.quantidade_estoque / item.estoque_minimo) * 100 : 100;

        let statusColor = "bg-emerald-500";
        let statusTextColor = "text-emerald-600 dark:text-emerald-400";
        let statusText = "SAUDÁVEL";

        if (baixo) {
          statusColor = "bg-rose-500";
          statusTextColor = "text-rose-500 dark:text-rose-400";
          statusText = "ABAIXO DO MÍNIMO";
        } else if (proximo && item.estoque_minimo > 0) {
          statusColor = "bg-amber-500";
          statusTextColor = "text-amber-600 dark:text-amber-400";
          statusText = "PRÓXIMO AO MÍNIMO";
        }

        return (
          <>
            <td className="px-4 py-2.5 font-medium text-zinc-850 dark:text-zinc-100">{item.produto_nome}</td>
            <td className="px-4 py-2.5 text-zinc-500">{item.categoria_nome || "-"}</td>
            <td className="px-4 py-2.5 align-middle">
              <Tooltip>
                <TooltipTrigger asChild>
                  <button 
                    type="button"
                    title={`${pct.toFixed(0)}% do mínimo de segurança (${formatReportQuantidade(item.quantidade_estoque, item)} de ${formatReportQuantidade(item.estoque_minimo, item)})`}
                    className="w-full max-w-[120px] space-y-1.5 cursor-help text-left focus:outline-none focus:ring-0 block"
                  >
                    <div className="w-full bg-zinc-100 dark:bg-zinc-800 rounded-full h-1.5 overflow-hidden">
                      <div 
                        className={`h-full rounded-full transition-all ${statusColor}`}
                        style={{ width: `${Math.min(100, Math.max(0, pct))}%` }}
                      />
                    </div>
                    <div className="flex justify-between items-center text-[9px] font-bold">
                      <span className={statusTextColor}>
                        {statusText}
                      </span>
                      <span className="text-zinc-500 font-mono font-bold">{formatReportQuantidade(item.quantidade_estoque, item)}</span>
                    </div>
                  </button>
                </TooltipTrigger>
                <TooltipContent className="bg-zinc-900 text-white text-xs p-2 rounded-lg border border-zinc-800 shadow-md">
                  {pct.toFixed(0)}% do mínimo de segurança ({formatReportQuantidade(item.quantidade_estoque, item)} de {formatReportQuantidade(item.estoque_minimo, item)})
                </TooltipContent>
              </Tooltip>
            </td>
            <td className="px-4 py-2.5 text-zinc-500">{formatReportQuantidade(item.estoque_minimo, item)}</td>
            <td className="px-4 py-2.5 text-rose-700 dark:text-rose-400 font-bold bg-rose-50/50 dark:bg-rose-950/20">-{formatReportQuantidade(diff, item)}</td>
          </>
        );
      };
    }
    else if (tabName === "estoque_sem_estoque") {
      dataList = estoqueReportData.produtos || [];
      exportTitle = "Sem Estoque (Zerados)";
      exportHeaders = ["Produto", "Categoria", "Último Custo", "Preço Venda"];
      exportKeys = ["produto_nome", "categoria_nome", "custo_unitario", "preco_venda"];

      const totalZerados = estoqueReportData.totais?.total_sem_estoque || 0;

      kpis = [
        { label: "Itens Zerados ou Negativos", value: totalZerados, icon: AlertCircle, color: "text-rose-600", bg: "bg-rose-50" }
      ];

      headers = [
        { label: "Produto", key: "produto_nome" },
        { label: "Categoria", key: "categoria_nome" },
        { label: "Último Custo", key: "custo_unitario" },
        { label: "Preço Venda", key: "preco_venda" }
      ];

      rowRenderer = (item) => {
        return (
          <>
            <td className="px-4 py-2.5 font-medium text-zinc-850 dark:text-zinc-100">{item.produto_nome}</td>
            <td className="px-4 py-2.5 text-zinc-500">{item.categoria_nome || "-"}</td>
            <td className="px-4 py-2.5 text-zinc-700 dark:text-zinc-350">{fmtBRL(item.custo_unitario)}</td>
            <td className="px-4 py-2.5 text-zinc-700 dark:text-zinc-350 font-semibold">{fmtBRL(item.preco_venda)}</td>
          </>
        );
      };
    }
    else if (tabName === "estoque_valorizacao") {
      dataList = estoqueReportData.produtos || [];
      exportTitle = "Valorização do Estoque";
      exportHeaders = ["Produto", "Categoria", "Qtd Estoque", "Unidade", "Custo Unitário", "Custo Total", "Preço Venda Unitário", "Preço Venda Total", "Margem Potencial"];
      exportKeys = ["produto_nome", "categoria_nome", "quantidade_estoque", "unidade_medida", "custo_unitario", "valor_total_custo", "preco_venda", "valor_total_venda", "margem_potencial"];

      const totalCusto = estoqueReportData.totais?.total_custo || 0;
      const totalVenda = estoqueReportData.totais?.total_venda || 0;
      const margemPotencial = estoqueReportData.totais?.margem_potencial || 0;

      kpis = [
        { label: "Valor de Custo Geral", value: fmtBRL(totalCusto), icon: Coins, color: "text-amber-500", bg: "bg-amber-50" },
        { label: "Valor de Venda Potencial", value: fmtBRL(totalVenda), icon: TrendingUp, color: "text-emerald-500", bg: "bg-emerald-50" },
        { label: "Lucro Bruto Potencial", value: fmtBRL(margemPotencial), icon: Banknote, color: "text-indigo-500", bg: "bg-indigo-50" }
      ];

      headers = [
        { label: "Produto", key: "produto_nome" },
        { label: "Categoria", key: "categoria_nome" },
        { label: "Qtd Estoque", key: "quantidade_estoque" },
        { label: "Custo Unitário", key: "custo_unitario" },
        { label: "Custo Total", key: "valor_total_custo" },
        { label: "Venda Unitária", key: "preco_venda" },
        { label: "Venda Total", key: "valor_total_venda" },
        { label: "Lucro Potencial", key: "margem_potencial" }
      ];

      rowRenderer = (item) => {
        return (
          <>
            <td className="px-4 py-2.5 font-medium text-zinc-850 dark:text-zinc-100">{item.produto_nome}</td>
            <td className="px-4 py-2.5 text-zinc-500">{item.categoria_nome || "-"}</td>
            <td className="px-4 py-2.5 text-zinc-700 dark:text-zinc-350">{formatReportQuantidade(item.quantidade_estoque, item)}</td>
            <td className="px-4 py-2.5 text-zinc-700 dark:text-zinc-350">{fmtBRL(item.custo_unitario)}</td>
            <td className="px-4 py-2.5 text-zinc-700 dark:text-zinc-350 font-semibold">{fmtBRL(item.valor_total_custo)}</td>
            <td className="px-4 py-2.5 text-zinc-700 dark:text-zinc-350">{fmtBRL(item.preco_venda)}</td>
            <td className="px-4 py-2.5 text-zinc-700 dark:text-zinc-350 font-semibold">{fmtBRL(item.valor_total_venda)}</td>
            <td className="px-4 py-2.5 text-emerald-600 dark:text-emerald-400 font-bold bg-emerald-50/30 dark:bg-emerald-950/20">{fmtBRL(item.margem_potencial)}</td>
          </>
        );
      };
    }
    else if (tabName === "estoque_consumo_insumos") {
      const grouped = {};
      (estoqueReportData.consumos || []).forEach(item => {
        const key = item.produto_id || item.produto_nome;
        if (!grouped[key]) {
          grouped[key] = {
            produto_id: item.produto_id,
            produto_nome: item.produto_nome,
            categoria_nome: item.categoria_nome,
            quantidade: 0,
            unidade_medida: item.unidade_medida,
            unidade_medida_insumo: item.unidade_medida_insumo,
            quantidade_por_embalagem: item.quantidade_por_embalagem,
            quantidade_por_unidade: item.quantidade_por_unidade,
            custo_unitario: 0,
            custo_total: 0,
            valor_total_custo: 0,
            launches: []
          };
        }
        grouped[key].quantidade += Number(item.quantidade || 0);
        grouped[key].custo_total += Number(item.custo_total || item.valor_total_custo || 0);
        grouped[key].valor_total_custo += Number(item.custo_total || item.valor_total_custo || 0);
        grouped[key].launches.push(item);
      });

      // Calculate weighted average unit cost for each grouped product
      Object.values(grouped).forEach(g => {
        g.custo_unitario = g.quantidade > 0 ? (g.custo_total / g.quantidade) : 0;
      });

      dataList = Object.values(grouped);
      exportTitle = "Consumo de Insumos";
      exportHeaders = ["Insumo/Produto", "Categoria", "Qtd Consumida", "Unidade", "Custo Unitário", "Custo Total"];
      exportKeys = ["produto_nome", "categoria_nome", "quantidade", "unidade_medida", "custo_unitario", "valor_total_custo"];

      const totalCusto = estoqueReportData.totais?.total_custo || 0;
      const totalQtd = estoqueReportData.totais?.total_quantidade || 0;

      kpis = [
        { 
          label: "Custo Total Consumido", 
          value: fmtBRL(totalCusto), 
          icon: Flame, 
          color: "text-orange-500", 
          bg: "bg-orange-50",
          tooltip: "Soma do custo dos insumos/produtos utilizados em todos os agendamentos concluídos no período."
        },
        { 
          label: "Qtd de Itens Consumidos", 
          value: totalQtd, 
          icon: Package, 
          color: "text-blue-500", 
          bg: "bg-blue-50",
          tooltip: "Soma das quantidades físicas de insumos consumidos em todos os agendamentos concluídos no período."
        }
      ];

      headers = [
        { label: "Insumo/Produto", key: "produto_nome" },
        { label: "Categoria", key: "categoria_nome" },
        { label: "Qtd Consumida", key: "quantidade" },
        { label: "Custo Unitário Médio", key: "custo_unitario" },
        { label: "Custo Total", key: "valor_total_custo" },
        { label: "Ações", key: "actions" }
      ];

      rowRenderer = (item) => {
        return (
          <>
            <td className="px-4 py-2.5 font-medium text-zinc-850 dark:text-zinc-100">{item.produto_nome}</td>
            <td className="px-4 py-2.5 text-zinc-500">{item.categoria_nome || "-"}</td>
            <td className="px-4 py-2.5 text-zinc-700 dark:text-zinc-350 font-semibold">{formatReportQuantidade(item.quantidade, item)}</td>
            <td className="px-4 py-2.5 text-zinc-700 dark:text-zinc-350">{fmtBRL(item.custo_unitario)}</td>
            <td className="px-4 py-2.5 text-zinc-700 dark:text-zinc-350 font-bold">{fmtBRL(item.valor_total_custo)}</td>
            <td className="px-4 py-2.5 text-zinc-500 no-print">
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    className="p-1 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors text-zinc-550 dark:text-zinc-400"
                    title="Clique para visualizar detalhes"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleShowConsumoDetail(item);
                    }}
                  >
                    <Eye className="w-4 h-4 text-[#84A59D]" />
                  </button>
                </TooltipTrigger>
                <TooltipContent className="bg-zinc-900 text-white text-xs p-2 rounded border border-zinc-850">
                  Clique para visualizar detalhes
                </TooltipContent>
              </Tooltip>
            </td>
          </>
        );
      };
    }
    else if (tabName === "estoque_mais_movimentados") {
      dataList = estoqueReportData.produtos || [];
      exportTitle = "Mais Movimentados";
      exportHeaders = ["Produto", "Categoria", "Entradas", "Saídas", "Ajustes", "Total Fluxo"];
      exportKeys = ["produto_nome", "categoria_nome", "entradas_qty", "saidas_qty", "ajustes_qty", "total_qty"];

      const totalFluxo = estoqueReportData.totais?.total_movimentado || 0;

      kpis = [
        { label: "Fluxo Total de Estoque", value: totalFluxo, icon: Zap, color: "text-yellow-500", bg: "bg-yellow-50" }
      ];

      headers = [
        { label: "Produto", key: "produto_nome" },
        { label: "Categoria", key: "categoria_nome" },
        { label: "Entradas", key: "entradas_qty" },
        { label: "Saídas", key: "saidas_qty" },
        { label: "Ajustes", key: "ajustes_qty" },
        { label: "Total Fluxo", key: "total_qty" }
      ];

      rowRenderer = (item) => {
        return (
          <>
            <td className="px-4 py-2.5 font-medium text-zinc-850 dark:text-zinc-100">{item.produto_nome}</td>
            <td className="px-4 py-2.5 text-zinc-500">{item.categoria_nome || "-"}</td>
            <td className="px-4 py-2.5 text-emerald-600 font-semibold">+{item.entradas_qty}</td>
            <td className="px-4 py-2.5 text-rose-600 font-semibold">-{item.saidas_qty}</td>
            <td className="px-4 py-2.5 text-amber-600">{item.ajustes_qty}</td>
            <td className="px-4 py-2.5 text-zinc-800 dark:text-zinc-200 font-bold bg-zinc-100/50">{item.total_qty}</td>
          </>
        );
      };
    }
    else if (tabName === "estoque_sem_movimentacao") {
      dataList = estoqueReportData.produtos || [];
      exportTitle = "Sem Movimentação (Giro Lento)";
      exportHeaders = ["Produto", "Categoria", "Estoque Atual", "Unidade", "Dias Sem Giro", "Último Movimento"];
      exportKeys = ["produto_nome", "categoria_nome", "quantidade_estoque", "unidade_medida", "dias_sem_movimentacao", "data_ultima_movimentacao"];

      const totalParados = estoqueReportData.totais?.total_produtos || 0;
      const totalValorParado = estoqueReportData.totais?.total_valor_custo || 0;

      kpis = [
        { label: "Produtos Sem Giro", value: totalParados, icon: Calendar, color: "text-blue-500", bg: "bg-blue-50" },
        { label: "Custo Financeiro Parado", value: fmtBRL(totalValorParado), icon: Coins, color: "text-rose-500", bg: "bg-rose-50" }
      ];

      headers = [
        { label: "Produto", key: "produto_nome" },
        { label: "Categoria", key: "categoria_nome" },
        { label: "Estoque Atual", key: "quantidade_estoque" },
        { label: "Dias Sem Giro", key: "dias_sem_movimentacao" },
        { label: "Último Movimento", key: "data_ultima_movimentacao" }
      ];

      rowRenderer = (item) => {
        return (
          <>
            <td className="px-4 py-2.5 font-medium text-zinc-850 dark:text-zinc-100">{item.produto_nome}</td>
            <td className="px-4 py-2.5 text-zinc-500">{item.categoria_nome || "-"}</td>
            <td className="px-4 py-2.5 text-zinc-700 dark:text-zinc-350">{formatReportQuantidade(item.quantidade_estoque, item)}</td>
            <td className="px-4 py-2.5 text-rose-600 font-bold bg-rose-50/20">{item.dias_sem_movimentacao} dias</td>
            <td className="px-4 py-2.5 text-zinc-500">{item.data_ultima_movimentacao ? new Date(item.data_ultima_movimentacao).toLocaleDateString("pt-BR") : "Nunca"}</td>
          </>
        );
      };
    }
    else if (tabName === "estoque_historico_ajustes") {
      dataList = estoqueReportData.ajustes || [];
      exportTitle = "Histórico de Ajustes Manuais";
      exportHeaders = ["Data/Hora", "Produto", "Categoria", "Qtd Anterior", "Qtd Ajustada", "Qtd Atual", "Motivo/Justificativa", "Usuário"];
      exportKeys = ["criado_em", "produto_nome", "categoria_nome", "quantidade_anterior", "quantidade_ajustada", "quantidade_atual", "motivo", "usuario_nome"];

      const totalAjustes = estoqueReportData.totais?.total_ajustes || 0;

      kpis = [
        { label: "Correções Manuais", value: totalAjustes, icon: Sliders, color: "text-amber-500", bg: "bg-amber-50" }
      ];

      headers = [
        { label: "Data/Hora", key: "criado_em" },
        { label: "Produto", key: "produto_nome" },
        { label: "Categoria", key: "categoria_nome" },
        { label: "Qtd Anterior", key: "quantidade_anterior" },
        { label: "Qtd Ajustada", key: "quantidade_ajustada" },
        { label: "Qtd Atual", key: "quantidade_atual" },
        { label: "Motivo/Justificativa", key: "motivo" },
        { label: "Usuário", key: "usuario_nome" }
      ];

      rowRenderer = (item) => {
        const isPositivo = item.quantidade_ajustada > 0;
        return (
          <>
            <td className="px-4 py-2.5 text-zinc-700 dark:text-zinc-350">{new Date(item.criado_em).toLocaleString("pt-BR")}</td>
            <td className="px-4 py-2.5 font-medium text-zinc-850 dark:text-zinc-100">{item.produto_nome}</td>
            <td className="px-4 py-2.5 text-zinc-550">{item.categoria_nome || "-"}</td>
            <td className="px-4 py-2.5 text-zinc-500">{formatReportQuantidade(item.quantidade_anterior, item)}</td>
            <td className={`px-4 py-2.5 font-bold ${isPositivo ? 'text-emerald-600' : 'text-rose-600'}`}>
              {isPositivo ? "+" : ""}{formatReportQuantidade(item.quantidade_ajustada, item)}
            </td>
            <td className="px-4 py-2.5 font-semibold text-zinc-700 dark:text-zinc-350">{formatReportQuantidade(item.quantidade_atual, item)}</td>
            <td className="px-4 py-2.5 text-zinc-500 text-xs italic max-w-xs truncate" title={item.motivo}>{item.motivo || "-"}</td>
            <td className="px-4 py-2.5 text-zinc-750 font-medium">{item.usuario_nome || "Desconhecido"}</td>
          </>
        );
      };
    }
    else if (tabName === "estoque_inventario") {
      dataList = estoqueReportData.produtos || [];
      exportTitle = "Conferência de Inventário";
      exportHeaders = ["Produto", "Categoria", "Unidade", "Qtd Sistema"];
      exportKeys = ["produto_nome", "categoria_nome", "unidade_medida", "quantidade_estoque"];

      const totalItens = estoqueReportData.totais?.total_itens || 0;
      const totalCusto = estoqueReportData.totais?.total_custo || 0;

      kpis = [
        { label: "Itens para Contagem", value: totalItens, icon: ClipboardList, color: "text-blue-500", bg: "bg-blue-50" },
        { label: "Valor de Custo Estimado", value: fmtBRL(totalCusto), icon: Coins, color: "text-amber-500", bg: "bg-amber-50" }
      ];

      headers = [
        { label: "Produto", key: "produto_nome" },
        { label: "Categoria", key: "categoria_nome" },
        { label: "Qtd Sistema", key: "quantidade_estoque" },
        { label: "Qtd Física (Contagem)", key: "contagem_fisica" },
        { label: "Diferença", key: "diferenca" }
      ];

      rowRenderer = (item) => {
        return (
          <>
            <td className="px-4 py-2.5 font-medium text-zinc-850 dark:text-zinc-100">{item.produto_nome}</td>
            <td className="px-4 py-2.5 text-zinc-500">{item.categoria_nome || "-"}</td>
            <td className="px-4 py-2.5 text-zinc-700 dark:text-zinc-350 font-semibold">{formatReportQuantidade(item.quantidade_estoque, item)}</td>
            <td className="px-4 py-2.5 border-l border-r border-zinc-200 bg-zinc-50/50 w-36"></td>
            <td className="px-4 py-2.5 bg-zinc-50/50 w-28"></td>
          </>
        );
      };
    }
    else if (tabName === "estoque_perdas_quebras") {
      dataList = estoqueReportData.perdas || [];
      exportTitle = "Perdas e Quebras";
      exportHeaders = ["Data/Hora", "Produto", "Categoria", "Qtd Perdida", "Unidade", "Custo Unitário", "Valor Total", "Motivo", "Responsável"];
      exportKeys = ["criado_em", "produto_nome", "categoria_nome", "quantidade", "unidade_medida", "custo_unitario", "valor_total", "motivo", "usuario_nome"];

      const totalQtdPerdas = estoqueReportData.totais?.total_quantidade || 0;
      const totalValorPerdas = estoqueReportData.totais?.total_valor || 0;

      kpis = [
        { label: "Qtd Itens Perdidos", value: totalQtdPerdas, icon: TrendingDown, color: "text-rose-500", bg: "bg-rose-50" },
        { label: "Prejuízo Financeiro Total", value: fmtBRL(totalValorPerdas), icon: Coins, color: "text-rose-600", bg: "bg-rose-50" }
      ];

      headers = [
        { label: "Data/Hora", key: "criado_em" },
        { label: "Produto", key: "produto_nome" },
        { label: "Categoria", key: "categoria_nome" },
        { label: "Qtd Perdida", key: "quantidade" },
        { label: "Custo Unitário", key: "custo_unitario" },
        { label: "Valor Total", key: "valor_total" },
        { label: "Motivo", key: "motivo" },
        { label: "Responsável", key: "usuario_nome" }
      ];

      rowRenderer = (item) => {
        return (
          <>
            <td className="px-4 py-2.5 text-zinc-700 dark:text-zinc-350">{new Date(item.criado_em).toLocaleString("pt-BR")}</td>
            <td className="px-4 py-2.5 font-medium text-zinc-850 dark:text-zinc-100">{item.produto_nome}</td>
            <td className="px-4 py-2.5 text-zinc-555">{item.categoria_nome || "-"}</td>
            <td className="px-4 py-2.5 text-rose-600 font-semibold">{formatReportQuantidade(item.quantidade, item)}</td>
            <td className="px-4 py-2.5 text-zinc-700 dark:text-zinc-350">{fmtBRL(item.custo_unitario)}</td>
            <td className="px-4 py-2.5 text-rose-700 font-bold">{fmtBRL(item.valor_total)}</td>
            <td className="px-4 py-2.5 text-zinc-555 text-xs italic">{item.motivo || "-"}</td>
            <td className="px-4 py-2.5 text-zinc-700 font-medium">{item.usuario_nome || "Desconhecido"}</td>
          </>
        );
      };
    }

    const filteredList = dataList.filter(item => {
      if (!searchEstoqueQuery) return true;
      const query = searchEstoqueQuery.toLowerCase();
      
      const prodName = (item.produto_nome || item.nome || "").toLowerCase();
      const catName = (item.categoria_nome || item.categoria || "").toLowerCase();
      const user = (item.usuario_nome || "").toLowerCase();
      const mot = (item.motivo || "").toLowerCase();

      return prodName.includes(query) || catName.includes(query) || user.includes(query) || mot.includes(query);
    });

    const sortedList = [...filteredList].sort((a, b) => {
      if (!sortEstoqueField) return 0;
      let valA = a[sortEstoqueField];
      let valB = b[sortEstoqueField];

      if (typeof valA === "string") {
        valA = valA.toLowerCase();
        valB = valB.toLowerCase();
        return sortEstoqueDirection === "asc" ? valA.localeCompare(valB) : valB.localeCompare(valA);
      }
      
      if (valA === undefined || valA === null) return 1;
      if (valB === undefined || valB === null) return -1;

      return sortEstoqueDirection === "asc" ? valA - valB : valB - valA;
    });

    const totalPages = Math.ceil(sortedList.length / REPORT_PAGE_SIZE);
    const activePage = Math.min(Math.max(1, estoquePage), Math.max(1, totalPages));
    const paginatedList = sortedList.slice((activePage - 1) * REPORT_PAGE_SIZE, activePage * REPORT_PAGE_SIZE);

    const handleSort = (field) => {
      if (sortEstoqueField === field) {
        setSortEstoqueDirection(sortEstoqueDirection === "asc" ? "desc" : "asc");
      } else {
        setSortEstoqueField(field);
        setSortEstoqueDirection("asc");
      }
      setEstoquePage(1);
    };

    return (
      <TooltipProvider delayDuration={150}>
        <div className="space-y-6">
        {kpis.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {kpis.map((kpi, idx) => {
              const IconComp = kpi.icon;
              return (
                <div key={idx} className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 shadow-sm flex items-center gap-4">
                  <div className={`p-3 rounded-lg ${kpi.bg || 'bg-zinc-50'} dark:bg-zinc-800`}>
                    <IconComp className={`w-5 h-5 ${kpi.color || 'text-zinc-500'}`} />
                  </div>
                  <div>
                    <div className="flex items-center gap-1">
                      <p className="text-[10px] uppercase font-bold text-zinc-450 tracking-wider">{kpi.label}</p>
                      {kpi.tooltip && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button 
                              type="button" 
                              title={kpi.tooltip}
                              className="cursor-help text-zinc-400 hover:text-zinc-650 inline-flex items-center focus:outline-none focus:ring-0"
                            >
                              <HelpCircle className="w-3.5 h-3.5 transition-colors" />
                            </button>
                          </TooltipTrigger>
                          <TooltipContent className="bg-zinc-900 text-white text-xs p-2.5 rounded-lg border border-zinc-800 shadow-md max-w-[220px] normal-case font-normal leading-relaxed">
                            {kpi.tooltip}
                          </TooltipContent>
                        </Tooltip>
                      )}
                    </div>
                    <p className="text-xl font-bold text-zinc-850 dark:text-zinc-55 mt-0.5">
                      {typeof kpi.value === 'number' 
                        ? kpi.value.toLocaleString("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: 3 })
                        : kpi.value
                      }
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 no-print">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-zinc-400" />
            <Input
              type="text"
              placeholder="Pesquisar neste relatório..."
              value={searchEstoqueQuery}
              onChange={(e) => {
                setSearchEstoqueQuery(e.target.value);
                setEstoquePage(1);
              }}
              className="pl-9 text-xs h-9 bg-zinc-50 dark:bg-zinc-950"
            />
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.print()}
              className="text-xs font-semibold h-9 rounded-lg border-zinc-200 flex items-center gap-1.5"
            >
              <Printer className="w-3.5 h-3.5" /> PDF / Imprimir
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleExport('xlsx', exportTitle, exportHeaders, exportKeys, sortedList)}
              className="text-xs font-semibold h-9 rounded-lg border-zinc-200 flex items-center gap-1.5 text-emerald-600 hover:text-emerald-700"
            >
              Excel
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleExport('csv', exportTitle, exportHeaders, exportKeys, sortedList)}
              className="text-xs font-semibold h-9 rounded-lg border-zinc-200 flex items-center gap-1.5 text-blue-600 hover:text-blue-700"
            >
              CSV
            </Button>
          </div>
        </div>

          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-sm overflow-hidden">
          {selectedReport === "estoque_movimentacao" && (
            <div className="flex flex-wrap items-center gap-4 px-4 py-2.5 bg-zinc-50 dark:bg-zinc-950 border-b border-zinc-200 dark:border-zinc-800 text-[10px] font-bold text-zinc-450 dark:text-zinc-400 uppercase tracking-wider no-print">
              <span className="text-zinc-400">Legenda:</span>
              <span className="inline-flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> Entrada</span>
              <span className="inline-flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-rose-500" /> Saída</span>
              <span className="inline-flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-amber-500" /> Ajuste</span>
              <span className="inline-flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-blue-500" /> Outros / Transf.</span>
            </div>
          )}
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950">
                  {headers.map((h, idx) => (
                    <th
                      key={idx}
                      onClick={() => handleSort(h.key)}
                      className={`px-4 py-3 font-semibold text-zinc-650 dark:text-zinc-300 uppercase tracking-wider cursor-pointer hover:bg-zinc-100 dark:hover:bg-zinc-850 select-none ${
                        h.key === "contagem_fisica" || h.key === "diferenca" ? "pointer-events-none" : ""
                      }`}
                    >
                      <div className="flex items-center gap-1.5">
                        {h.label}
                        {sortEstoqueField === h.key && (
                          <ArrowUpDown className="w-3 h-3 text-[#84A59D]" />
                        )}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-150 dark:divide-zinc-800">
                {sortedList.length === 0 ? (
                  <tr>
                    <td colSpan={headers.length} className="text-center p-8 text-zinc-400 italic">
                      Nenhum resultado encontrado com os filtros e busca aplicados.
                    </td>
                  </tr>
                ) : (
                  paginatedList.map((item, idx) => {
                    const isConsumo = tabName === "estoque_consumo_insumos";
                    return (
                      <tr 
                        key={idx} 
                        onClick={() => {
                          if (isConsumo) {
                            handleShowConsumoDetail(item);
                          }
                        }}
                        className={`hover:bg-zinc-50/50 dark:hover:bg-zinc-850/30 transition-colors ${
                          isConsumo ? "cursor-pointer" : ""
                        }`}
                        title={isConsumo ? "Clique para visualizar detalhes" : undefined}
                      >
                        {rowRenderer(item)}
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
        {totalPages > 1 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 shadow-sm select-none no-print">
            <span className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">
              Exibindo <span className="font-semibold text-zinc-800 dark:text-zinc-200">{Math.min(sortedList.length, (activePage - 1) * REPORT_PAGE_SIZE + 1)}</span> a{" "}
              <span className="font-semibold text-zinc-800 dark:text-zinc-200">{Math.min(sortedList.length, activePage * REPORT_PAGE_SIZE)}</span> de{" "}
              <span className="font-semibold text-zinc-800 dark:text-zinc-200">{sortedList.length}</span> registros
            </span>
            <div className="flex items-center gap-1.5 flex-wrap">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setEstoquePage(prev => Math.max(1, prev - 1))}
                disabled={activePage === 1}
                className="h-8 px-2.5 text-xs font-semibold gap-1 dark:border-zinc-800"
              >
                <ChevronLeft className="w-4 h-4" /> Anterior
              </Button>

              {(() => {
                const pages = [];
                const maxVisiblePages = 5;
                let startPage = Math.max(1, activePage - Math.floor(maxVisiblePages / 2));
                let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

                if (endPage - startPage + 1 < maxVisiblePages) {
                  startPage = Math.max(1, endPage - maxVisiblePages + 1);
                }

                if (startPage > 1) {
                  pages.push(
                    <Button
                      key={1}
                      variant={activePage === 1 ? "default" : "outline"}
                      size="sm"
                      onClick={() => setEstoquePage(1)}
                      className={`h-8 w-8 text-xs font-bold ${activePage === 1 ? "bg-[#84A59D] hover:bg-[#6F9189] text-white border-[#84A59D]" : "dark:border-zinc-800 text-zinc-650 dark:text-zinc-300"}`}
                    >
                      1
                    </Button>
                  );
                  if (startPage > 2) {
                    pages.push(<span key="dots-start" className="text-zinc-400 dark:text-zinc-600 px-1 text-xs">...</span>);
                  }
                }

                for (let p = startPage; p <= endPage; p++) {
                  pages.push(
                    <Button
                      key={p}
                      variant={activePage === p ? "default" : "outline"}
                      size="sm"
                      onClick={() => setEstoquePage(p)}
                      className={`h-8 w-8 text-xs font-bold ${activePage === p ? "bg-[#84A59D] hover:bg-[#6F9189] text-white border-[#84A59D]" : "dark:border-zinc-800 text-zinc-650 dark:text-zinc-300"}`}
                    >
                      {p}
                    </Button>
                  );
                }

                if (endPage < totalPages) {
                  if (endPage < totalPages - 1) {
                    pages.push(<span key="dots-end" className="text-zinc-400 dark:text-zinc-600 px-1 text-xs">...</span>);
                  }
                  pages.push(
                    <Button
                      key={totalPages}
                      variant={activePage === totalPages ? "default" : "outline"}
                      size="sm"
                      onClick={() => setEstoquePage(totalPages)}
                      className={`h-8 w-8 text-xs font-bold ${activePage === totalPages ? "bg-[#84A59D] hover:bg-[#6F9189] text-white border-[#84A59D]" : "dark:border-zinc-800 text-zinc-650 dark:text-zinc-300"}`}
                    >
                      {totalPages}
                    </Button>
                  );
                }

                return pages;
              })()}

              <Button
                variant="outline"
                size="sm"
                onClick={() => setEstoquePage(prev => Math.min(totalPages, prev + 1))}
                disabled={activePage === totalPages}
                className="h-8 px-2.5 text-xs font-semibold gap-1 dark:border-zinc-800"
              >
                Próxima <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}
      </div>
      </TooltipProvider>
    );
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 fade-in max-w-7xl mx-auto w-full overflow-x-hidden">
      <PageHeader overline="Análise" title="Relatórios" />

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

      {!selectedReport ? (
        <div className="space-y-6">
          {/* Search bar */}
          <div className="relative max-w-md w-full no-print">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-zinc-400" />
            <Input
              type="text"
              placeholder="Buscar relatório por nome ou finalidade..."
              value={searchReportQuery}
              onChange={(e) => setSearchReportQuery(e.target.value)}
              className="pl-9 bg-white border-zinc-200"
            />
          </div>

          {/* Categorized Groups */}
          {["Financeiro", "Vendas", "Rentabilidade", "Estoque"].map((cat) => {
            const filtered = REPORTS_LIST.filter(
              (r) =>
                r.category === cat &&
                (r.title.toLowerCase().includes(searchReportQuery.toLowerCase()) ||
                  r.description.toLowerCase().includes(searchReportQuery.toLowerCase()))
            );

            if (filtered.length === 0) return null;

            return (
              <div key={cat} className="space-y-3">
                <h2 className="text-sm uppercase font-bold text-zinc-400 tracking-wider mt-4">
                  {cat}
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filtered.map((report) => {
                    const IconComponent = report.icon;
                    return (
                      <div
                        key={report.id}
                        onClick={() => handleSelectReport(report.id)}
                        className="bg-white border border-zinc-200 rounded-xl p-5 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 cursor-pointer flex flex-col justify-between group"
                      >
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${report.badgeColor}`}>
                              {report.category}
                            </span>
                            <IconComponent className={`w-5 h-5 ${report.iconColor} group-hover:scale-110 transition-transform`} />
                          </div>
                          <div className="space-y-1">
                            <h3 className="font-semibold text-zinc-800 font-display text-base group-hover:text-[#84A59D] transition-colors">
                              {report.title}
                            </h3>
                            <p className="text-xs text-zinc-500 leading-relaxed">
                              {report.description}
                            </p>
                          </div>
                        </div>
                        <div className="mt-4 pt-3 border-t border-zinc-55 flex items-center justify-end text-[11px] font-semibold text-[#84A59D] opacity-0 group-hover:opacity-100 transition-opacity">
                          Acessar Relatório &rarr;
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="relative">
          {/* Sticky Header Container */}
          <div className="sticky top-[-24px] pt-4 pb-2 z-30 bg-zinc-50/95 dark:bg-zinc-950/95 backdrop-blur-md border-b border-zinc-200/80 dark:border-zinc-800/80 mb-6 no-print -mx-6 px-6 max-h-[90vh] overflow-y-auto">
            {/* Back Navigation Bar */}
          <div className="flex items-center justify-between mb-6 border-b border-zinc-200 dark:border-zinc-800 pb-4 no-print">
            <button
              onClick={() => { setSelectedReport(null); setIsGenerated(false); setGeneratedFilters(null); }}
              className="flex items-center gap-2 text-zinc-500 dark:text-zinc-400 hover:text-zinc-850 dark:hover:text-zinc-200 transition-colors font-semibold text-sm"
            >
              <ArrowLeft className="w-4 h-4" /> Voltar para Central de Relatórios
            </button>
            <span className="text-[10px] uppercase font-bold tracking-wider text-zinc-400 dark:text-zinc-300 bg-zinc-100 dark:bg-zinc-800 px-2.5 py-1 rounded-full">
              {REPORTS_LIST.find(r => r.id === selectedReport)?.category}
            </span>
          </div>

          <div className="mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-2xl sm:text-3xl font-bold font-display text-zinc-850 dark:text-zinc-100">
                  {REPORTS_LIST.find(r => r.id === selectedReport)?.title}
                </h1>
                <Dialog open={helpOpen} onOpenChange={setHelpOpen}>
                  <DialogTrigger asChild>
                    <button
                      className="text-zinc-400 hover:text-[#84A59D] transition-colors p-1 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 focus:outline-none"
                      title="Ajuda e Documentação do Relatório"
                      data-testid="btn-ajuda-relatorio"
                    >
                      <HelpCircle className="w-5.5 h-5.5" />
                    </button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-6 rounded-xl shadow-xl">
                    <DialogHeader>
                      <DialogTitle className="flex items-center gap-2 text-xl font-bold font-display text-zinc-850 dark:text-zinc-100">
                        <HelpCircle className="w-5 h-5 text-[#84A59D]" />
                        Ajuda Contextual: {REPORTS_LIST.find(r => r.id === selectedReport)?.title}
                      </DialogTitle>
                    </DialogHeader>
                    <div className="mt-4 border-t border-zinc-100 dark:border-zinc-800 pt-4">
                      {renderHelpContent(selectedReport)}
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
              <p className="text-xs text-zinc-500 mt-1 max-w-3xl">
                {REPORTS_LIST.find(r => r.id === selectedReport)?.description}
              </p>
            </div>
          </div>

          {/* Filters Card */}
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 mb-6 shadow-sm no-print">
            <div className="flex items-center gap-2 mb-4 text-[#3A4F4A] dark:text-[#A8C3BC] font-semibold text-xs">
              <Filter className="w-4 h-4 text-[#84A59D]" />
              <span>Filtros do Relatório</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label className="text-xs uppercase font-bold text-zinc-450 tracking-wider">De</Label>
                <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="w-full h-9 text-xs" data-testid="rep-from" />
              </div>
              <div>
                <Label className="text-xs uppercase font-bold text-zinc-450 tracking-wider">Até</Label>
                <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="w-full h-9 text-xs" data-testid="rep-to" />
              </div>
              <div>
                <Label className="text-xs uppercase font-bold text-zinc-450 tracking-wider">Atalhos de Período</Label>
                <PresetButtons onPick={(a, b) => { setFrom(a); setTo(b); }} />
              </div>
            </div>

            {/* Specific Filters Row */}
            {tab === "caixa" && (
              <div className="w-full md:max-w-xs mt-4">
                <Label className="text-[10px] uppercase font-bold text-zinc-450 tracking-wider">Profissional</Label>
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

            {tab === "cartoes" && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4 max-w-2xl">
                <div>
                  <Label className="text-[10px] uppercase font-bold text-zinc-450 tracking-wider">Adquirente</Label>
                  <Select value={filterCartaoAdquirente} onValueChange={setFilterCartaoAdquirente}>
                    <SelectTrigger className="bg-white dark:bg-zinc-900 h-9 text-xs border border-zinc-200 dark:border-zinc-800">
                      <SelectValue placeholder="Todas" />
                    </SelectTrigger>
                    <SelectContent className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-800 dark:text-zinc-150">
                      <SelectItem value="todos">Todas as Adquirentes</SelectItem>
                      <SelectItem value="sem_adquirente">Sem Adquirente (Legado)</SelectItem>
                      {adquirentesList.map(adq => (
                        <SelectItem key={adq.id} value={adq.id}>{adq.descricao}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-[10px] uppercase font-bold text-zinc-450 tracking-wider">Tipo de Cartão</Label>
                  <Select value={filterCartaoTipo} onValueChange={setFilterCartaoTipo}>
                    <SelectTrigger className="bg-white dark:bg-zinc-900 h-9 text-xs border border-zinc-200 dark:border-zinc-800">
                      <SelectValue placeholder="Todos" />
                    </SelectTrigger>
                    <SelectContent className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-800 dark:text-zinc-150">
                      <SelectItem value="todos">Todos os Tipos</SelectItem>
                      <SelectItem value="credito">Crédito</SelectItem>
                      <SelectItem value="debito">Débito</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-[10px] uppercase font-bold text-zinc-450 tracking-wider">Forma de Pagamento</Label>
                  <Select value={filterCartaoForma} onValueChange={setFilterCartaoForma}>
                    <SelectTrigger className="bg-white dark:bg-zinc-900 h-9 text-xs border border-zinc-200 dark:border-zinc-800">
                      <SelectValue placeholder="Todas" />
                    </SelectTrigger>
                    <SelectContent className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-800 dark:text-zinc-150">
                      <SelectItem value="todos">Todas as Formas</SelectItem>
                      <SelectItem value="cartao_credito">Cartão Crédito (Padrão)</SelectItem>
                      <SelectItem value="cartao_debito">Cartão Débito (Padrão)</SelectItem>
                      {formasCartaoList.filter(f => f.adquirente_id !== null).map(f => (
                        <SelectItem key={f.forma_pagamento} value={f.forma_pagamento}>{f.descricao}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            {tab === "dre" && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4 max-w-xl">
                <div>
                  <Label className="text-[10px] uppercase font-bold text-zinc-450 tracking-wider">Categoria</Label>
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
                <div>
                  <Label className="text-[10px] uppercase font-bold text-zinc-450 tracking-wider">Status Financeiro</Label>
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
            )}

            {tab === "produtos" && (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mt-4 border-t border-zinc-100 pt-3">
                {/* Colaborador */}
                <div>
                  <Label className="text-[10px] uppercase font-bold text-zinc-450 tracking-wider">Colaborador</Label>
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
                  <Label className="text-[10px] uppercase font-bold text-zinc-450 tracking-wider">Produto</Label>
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
                  <Label className="text-[10px] uppercase font-bold text-zinc-450 tracking-wider">Categoria</Label>
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
                {/* Pagamento */}
                <div>
                  <Label className="text-[10px] uppercase font-bold text-zinc-450 tracking-wider">Pagamento</Label>
                  <Select value={filterFormaPagamento} onValueChange={setFilterFormaPagamento}>
                    <SelectTrigger className="bg-white h-9 text-xs">
                      <SelectValue placeholder="Todas" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todos">Todas as formas</SelectItem>
                      {getFilterPaymentOptions().map((opt) => (
                        <SelectItem key={opt.v} value={opt.v}>{opt.l}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {/* Cliente */}
                <div>
                  <Label className="text-[10px] uppercase font-bold text-zinc-450 tracking-wider">Cliente</Label>
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
                  <Label className="text-[10px] uppercase font-bold text-zinc-450 tracking-wider">Status</Label>
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
            )}

            {tab === "servicos" && (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 mt-4 border-t border-zinc-100 pt-3">
                {/* Colaborador */}
                <div>
                  <Label className="text-[10px] uppercase font-bold text-zinc-450 tracking-wider">Profissional</Label>
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
                  <Label className="text-[10px] uppercase font-bold text-zinc-450 tracking-wider">Serviço</Label>
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
                {/* Pagamento */}
                <div>
                  <Label className="text-[10px] uppercase font-bold text-zinc-450 tracking-wider">Pagamento</Label>
                  <Select value={filterFormaPagamentoServico} onValueChange={setFilterFormaPagamentoServico}>
                    <SelectTrigger className="bg-white h-9 text-xs">
                      <SelectValue placeholder="Todas" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todos">Todas as formas</SelectItem>
                      {getFilterPaymentOptions().map((opt) => (
                        <SelectItem key={opt.v} value={opt.v}>{opt.l}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {/* Cliente */}
                <div>
                  <Label className="text-[10px] uppercase font-bold text-zinc-450 tracking-wider">Cliente</Label>
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
                  <Label className="text-[10px] uppercase font-bold text-zinc-450 tracking-wider">Status</Label>
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
            )}

            {["resultado_consolidado", "rentabilidade_servicos", "rentabilidade_produtos", "analitico_vendas"].includes(tab) && (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 mt-4 border-t border-zinc-100 pt-3">
                {/* Unidade */}
                <div>
                  <Label className="text-[10px] uppercase font-bold text-zinc-450 tracking-wider">Unidade</Label>
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
                  <Label className="text-[10px] uppercase font-bold text-zinc-450 tracking-wider">Profissional</Label>
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
                  <Label className="text-[10px] uppercase font-bold text-zinc-450 tracking-wider">Categoria de Serviço</Label>
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
                  <Label className="text-[10px] uppercase font-bold text-zinc-450 tracking-wider">Categoria de Produto</Label>
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
            )}

            {tab && tab.startsWith("estoque") && (
              <div className="mt-4 border-t border-zinc-100 dark:border-zinc-800 pt-4 space-y-3">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <Label className="text-[10px] uppercase font-bold text-zinc-550 tracking-wider">Categorias de Produto</Label>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setFilterEstoqueCategorias(categoriesList.map(c => c.id))}
                        className="text-[10px] text-emerald-600 hover:text-emerald-700 font-semibold"
                      >
                        Marcar Todas
                      </button>
                      <span className="text-zinc-300 text-[10px]">|</span>
                      <button
                        type="button"
                        onClick={() => setFilterEstoqueCategorias([])}
                        className="text-[10px] text-zinc-500 hover:text-zinc-600 font-semibold"
                      >
                        Desmarcar Todas
                      </button>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2 max-h-24 overflow-y-auto p-2.5 border border-zinc-200 dark:border-zinc-800 rounded-lg bg-zinc-50 dark:bg-zinc-950">
                    {categoriesList.length === 0 ? (
                      <span className="text-xs text-zinc-400">Nenhuma categoria cadastrada.</span>
                    ) : (
                      categoriesList.map((cat) => {
                        const checked = filterEstoqueCategorias.includes(cat.id);
                        return (
                          <label
                            key={cat.id}
                            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs cursor-pointer select-none border transition-all ${
                              checked
                                ? "bg-[#84A59D]/10 text-[#3A4F4A] dark:text-[#A8C3BC] dark:bg-[#84A59D]/20 border-[#84A59D] font-medium"
                                : "bg-white text-zinc-500 dark:text-zinc-400 border-zinc-200 hover:bg-zinc-50 dark:bg-zinc-900 dark:border-zinc-800 dark:hover:bg-zinc-800"
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => {
                                if (checked) {
                                  setFilterEstoqueCategorias(filterEstoqueCategorias.filter(id => id !== cat.id));
                                } else {
                                  setFilterEstoqueCategorias([...filterEstoqueCategorias, cat.id]);
                                }
                              }}
                              className="sr-only"
                            />
                            {cat.nome}
                          </label>
                        );
                      })
                    )}
                  </div>
                </div>

                {["estoque_atual", "estoque_movimentacao", "estoque_consumo_insumos", "estoque_historico_ajustes", "estoque_perdas_quebras"].includes(tab) && (
                  <div className="w-full md:max-w-xs">
                    <Label className="text-[10px] uppercase font-bold text-zinc-550 tracking-wider">Produto Específico</Label>
                    <SearchableSelect
                      placeholder="Todos os produtos"
                      searchPlaceholder="Pesquisar produto..."
                      options={[
                        { value: "todos", label: "Todos os produtos" },
                        ...produtosList.map((p) => ({ value: p.id, label: p.nome }))
                      ]}
                      value={filterEstoqueProduto}
                      onValueChange={setFilterEstoqueProduto}
                    />
                  </div>
                )}
              </div>
            )}

            {/* Generate Button Row */}
            <div className="flex flex-wrap items-center justify-between gap-4 mt-4 pt-4 border-t border-zinc-100 dark:border-zinc-800">
              <div className="flex items-center gap-3">
                <Button
                  onClick={handleGenerate}
                  disabled={loadingReport}
                  className="bg-[#84A59D] hover:bg-[#6F9189] text-white font-semibold text-xs px-5 h-9 rounded-lg flex items-center gap-2 shadow-sm"
                >
                  {loadingReport ? (
                    <>
                      <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                      Carregando...
                    </>
                  ) : (
                    <>
                      <Search className="w-4 h-4" />
                      Gerar Consulta
                    </>
                  )}
                </Button>
                {hasChanges && (
                  <span className="text-xs text-amber-600 font-semibold flex items-center gap-1">
                    ⚠️ Filtros modificados. Clique em "Gerar Consulta" para atualizar.
                  </span>
                )}
              </div>
            </div>
          </div>
          </div> {/* Fim do Sticky Header Container */}

          {/* Results Area */}
          {!isGenerated ? (
            <div className="bg-white border border-zinc-200 rounded-xl p-12 text-center text-zinc-500 shadow-sm max-w-lg mx-auto my-8 no-print">
              <div className="flex justify-center mb-4 text-[#84A59D]">
                <Search className="w-12 h-12 stroke-[1.5] animate-pulse" />
              </div>
              <h3 className="text-base font-semibold text-zinc-800 mb-1">Pronto para gerar o relatório</h3>
              <p className="text-xs text-zinc-500 mb-6">Defina o período e filtros acima e clique em "Gerar Consulta" para carregar as informações.</p>
              <Button
                onClick={handleGenerate}
                className="bg-[#84A59D] hover:bg-[#6F9189] text-white font-semibold text-xs px-6 h-9 rounded-lg"
              >
                Gerar Consulta
              </Button>
            </div>
          ) : loadingReport ? (
            <div className="text-zinc-400 p-12 text-center bg-white border border-zinc-200 rounded-xl shadow-sm no-print">
              <div className="flex justify-center mb-3">
                <span className="w-8 h-8 border-4 border-[#84A59D] border-t-transparent rounded-full animate-spin"></span>
              </div>
              Carregando dados do relatório...
            </div>
          ) : (
            <Tabs value={selectedReport} className="w-full">

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
                <div className="lg:col-span-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 sm:p-6 space-y-4 shadow-sm print-full-width">
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
                          <span className="text-zinc-500 dark:text-zinc-400 font-medium group-hover:text-[#3A4F4A] dark:group-hover:text-[#EAF0EE]">{cat}</span>
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
                            <span className="text-zinc-500 dark:text-zinc-400 font-medium group-hover:text-[#3A4F4A] dark:group-hover:text-[#EAF0EE]">{cat}</span>
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
                <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 shadow-sm">
                  <div className="text-xs uppercase tracking-wider text-zinc-400">Atendimentos</div>
                  <div className="font-display text-4xl font-semibold mt-1 text-[#3A4F4A] dark:text-[#EAF0EE]">{dre.total_atendimentos}</div>
                </div>
                <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 shadow-sm">
                  <div className="text-xs uppercase tracking-wider text-zinc-400">Vendas diretas</div>
                  <div className="font-display text-4xl font-semibold mt-1 text-[#3A4F4A] dark:text-[#EAF0EE]">{dre.total_vendas_diretas}</div>
                </div>
                <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 shadow-sm">
                  <div className="text-xs uppercase tracking-wider text-zinc-400">Taxas de cartão</div>
                  <div className="font-display text-2xl font-semibold mt-1 text-rose-600 dark:text-rose-400">{fmtBRL(dre.taxas_cartao.total)}</div>
                  <div className="text-xs text-zinc-500 mt-2 space-y-0.5">
                    <div>Crédito: {fmtBRL(dre.taxas_cartao.credito)} {dre.taxas_cartao.credito_dias !== undefined && `(Prazo: ${dre.taxas_cartao.credito_dias}d)`}</div>
                    <div>Débito: {fmtBRL(dre.taxas_cartao.debito)} {dre.taxas_cartao.debito_dias !== undefined && `(Prazo: ${dre.taxas_cartao.debito_dias}d)`}</div>
                  </div>
                  {dre.taxas_cartao.pmr !== undefined && (
                    <div className="mt-3 pt-3 border-t border-zinc-100 dark:border-zinc-800 text-xs text-zinc-650 dark:text-zinc-400 flex items-center justify-between font-semibold">
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
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-white border border-zinc-200 rounded-xl p-5 shadow-sm flex items-center justify-between">
                  <div>
                    <div className="text-xs uppercase tracking-wider text-zinc-400 font-bold">Total Pago (Bruto)</div>
                    <div className="font-display text-2xl sm:text-3xl font-black mt-1 text-zinc-800">{fmtBRL(caixa.totais.bruto || (caixa.totais.geral + (caixa.totais.troco || 0)))}</div>
                    <div className="text-xs text-zinc-500 mt-1">{caixa.total_pagamentos} pagamentos registrados</div>
                  </div>
                  <div className="bg-zinc-50 dark:bg-zinc-800 p-3 rounded-full">
                    <TrendingUp className="w-6 h-6 text-zinc-500 dark:text-zinc-400" />
                  </div>
                </div>
                
                <div className="bg-white border border-zinc-200 rounded-xl p-5 shadow-sm flex items-center justify-between">
                  <div>
                    <div className="text-xs uppercase tracking-wider text-rose-500 font-bold">Total de Troco Concedido</div>
                    <div className="font-display text-2xl sm:text-3xl font-black mt-1 text-rose-600 dark:text-rose-400">{fmtBRL(caixa.totais.troco || 0)}</div>
                    <div className="text-xs text-zinc-500 mt-1">Devolvido ao cliente</div>
                  </div>
                  <div className="bg-rose-50 dark:bg-rose-950/20 p-3 rounded-full">
                    <TrendingDown className="w-6 h-6 text-rose-500" />
                  </div>
                </div>

                <div className="bg-white border border-zinc-200 rounded-xl p-5 shadow-sm flex items-center justify-between border-l-4 border-l-[#84A59D]">
                  <div>
                    <div className="text-xs uppercase tracking-wider text-[#84A59D] font-bold">Total Líquido (No Caixa)</div>
                    <div className="font-display text-2xl sm:text-3xl font-black mt-1 text-[#3A4F4A] dark:text-[#EAF0EE]">{fmtBRL(caixa.totais.geral)}</div>
                    <div className="text-xs text-zinc-500 mt-1">Saldo real líquido</div>
                  </div>
                  <div className="bg-[#84A59D]/10 p-3 rounded-full">
                    <Coins className="w-6 h-6 text-[#84A59D]" />
                  </div>
                </div>
              </div>
              
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
                {["dinheiro", "pix", "cartao_credito", "cartao_debito", "vale", "credito_cliente"].map((k) => (
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
                <DialogContent className="w-[95vw] sm:w-[92vw] md:w-[90vw] lg:w-[85vw] xl:w-[80vw] max-w-[1400px] h-[90vh] max-h-[90vh] flex flex-col p-4 sm:p-6 bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800">
                  <DialogHeader className="pb-4 border-b border-zinc-150 dark:border-zinc-800">
                    <DialogTitle className="flex items-center gap-2 text-lg sm:text-xl font-semibold text-[#3A4F4A] dark:text-[#EAF0EE]">
                      <Banknote className="w-5 h-5 text-[#84A59D]" />
                      <span>Detalhamento de Caixa - {FORMA_LABELS[detailsForma]}</span>
                    </DialogTitle>
                    <div className="text-xs text-zinc-400 dark:text-zinc-500 mt-1 font-medium flex flex-wrap gap-x-4 gap-y-1">
                      <span>Período: <b className="text-zinc-750 dark:text-zinc-300">{new Date(from + 'T12:00:00').toLocaleDateString('pt-BR')}</b> a <b className="text-zinc-750 dark:text-zinc-300">{new Date(to + 'T12:00:00').toLocaleDateString('pt-BR')}</b></span>
                      <span>Profissional: <b className="text-zinc-750 dark:text-zinc-300">{colaboradorId === 'todos' ? 'Todos os usuários' : colaboradores.find(c => c.id === colaboradorId)?.nome}</b></span>
                    </div>
                  </DialogHeader>

                  {/* Search bar and Summary */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 py-4 border-b border-zinc-150 dark:border-zinc-800">
                    <div className="flex items-center gap-2 w-full sm:max-w-xs md:max-w-sm bg-zinc-50 dark:bg-zinc-850 rounded-lg border border-zinc-200 dark:border-zinc-800 px-3 py-1.5">
                      <Search className="w-4 h-4 text-zinc-400 shrink-0" />
                      <input
                        placeholder="Buscar por número, cliente, serviço/produto..."
                        value={detailsSearchQuery}
                        onChange={(e) => setDetailsSearchQuery(e.target.value)}
                        className="bg-transparent border-none outline-none text-xs w-full text-zinc-700 dark:text-zinc-200 placeholder-zinc-400 dark:placeholder-zinc-500"
                      />
                    </div>
                    
                    <div className="flex items-center justify-between sm:justify-start gap-4 text-xs font-semibold bg-[#EAF0EE] dark:bg-[#1E2E2A] text-[#3A4F4A] dark:text-[#EAF0EE] px-3.5 py-2 rounded-lg w-full sm:w-auto">
                      {(() => {
                        const filtered = (caixa?.pagamentos || [])
                          .filter(p => {
                            if (detailsForma === 'cartao_credito') {
                              return p.forma_pagamento === 'cartao_credito' || p.cartao_tipo === 'credito';
                            }
                            if (detailsForma === 'cartao_debito') {
                              return p.forma_pagamento === 'cartao_debito' || p.cartao_tipo === 'debito';
                            }
                            return p.forma_pagamento === detailsForma;
                          })
                          .filter(p => {
                            if (!detailsSearchQuery) return true;
                            const q = detailsSearchQuery.toLowerCase();
                            const tipoStr = p.tipo === 'servico' ? 'serviço servico' : (p.tipo === 'venda' ? 'venda' : '');
                            const statusStr = p.status_operacao === 'concluido' ? 'concluido concluído' : (p.status_operacao === 'pago' ? 'pago' : p.status_operacao || '');
                            return (
                              (p.numero || '').toLowerCase().includes(q) ||
                              (p.cliente || '').toLowerCase().includes(q) ||
                              (p.itens || '').toLowerCase().includes(q) ||
                              (p.profissional || '').toLowerCase().includes(q) ||
                              (p.usuario_recebimento || '').toLowerCase().includes(q) ||
                              tipoStr.includes(q) ||
                              statusStr.toLowerCase().includes(q)
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
                  <div className="flex-1 overflow-auto my-4 min-h-[300px] border border-zinc-200 dark:border-zinc-800 rounded-lg custom-scrollbar">
                    {(() => {
                      const filtered = (caixa?.pagamentos || [])
                        .filter(p => {
                          if (detailsForma === 'cartao_credito') {
                            return p.forma_pagamento === 'cartao_credito' || p.cartao_tipo === 'credito';
                          }
                          if (detailsForma === 'cartao_debito') {
                            return p.forma_pagamento === 'cartao_debito' || p.cartao_tipo === 'debito';
                          }
                          return p.forma_pagamento === detailsForma;
                        })
                        .filter(p => {
                          if (!detailsSearchQuery) return true;
                          const q = detailsSearchQuery.toLowerCase();
                          const tipoStr = p.tipo === 'servico' ? 'serviço servico' : (p.tipo === 'venda' ? 'venda' : '');
                          const statusStr = p.status_operacao === 'concluido' ? 'concluido concluído' : (p.status_operacao === 'pago' ? 'pago' : p.status_operacao || '');
                          return (
                            (p.numero || '').toLowerCase().includes(q) ||
                            (p.cliente || '').toLowerCase().includes(q) ||
                            (p.itens || '').toLowerCase().includes(q) ||
                            (p.profissional || '').toLowerCase().includes(q) ||
                            (p.usuario_recebimento || '').toLowerCase().includes(q) ||
                            tipoStr.includes(q) ||
                            statusStr.toLowerCase().includes(q)
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
                        <table className="w-full text-xs text-left min-w-[1250px] border-collapse">
                          <thead className="bg-zinc-50 dark:bg-zinc-850 text-zinc-550 dark:text-zinc-400 border-b border-zinc-200 dark:border-zinc-800 font-semibold uppercase tracking-wider text-[10px] sticky top-0 z-10">
                            <tr>
                              <th className="px-4 py-3">Data/Hora</th>
                              <th className="px-4 py-3">Tipo</th>
                              <th className="px-4 py-3">Identificação</th>
                              <th className="px-4 py-3">Cliente</th>
                              <th className="px-4 py-3">Item (Serviço/Produto)</th>
                              <th className="px-4 py-3">Profissional</th>
                              <th className="px-4 py-3">Recebido Por</th>
                              <th className="px-4 py-3 text-center">Forma</th>
                              <th className="px-4 py-3 text-right">Vl. Pago (Bruto)</th>
                              <th className="px-4 py-3 text-right">Troco</th>
                              <th className="px-4 py-3 text-right">Vl. Líquido</th>
                              <th className="px-4 py-3 text-right">Total Op.</th>
                              <th className="px-4 py-3 text-center">Status</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-zinc-150 dark:divide-zinc-800 text-zinc-650 dark:text-zinc-300 font-medium">
                            {filtered.map((p) => (
                              <tr key={p.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-800/30 transition-colors">
                                <td className="px-4 py-3 whitespace-nowrap text-zinc-500 dark:text-zinc-450">
                                  {new Date(p.data_hora).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap">
                                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                                    p.tipo === 'servico' 
                                      ? 'bg-blue-50 text-blue-600 border border-blue-200 dark:bg-blue-950/20 dark:text-blue-400 dark:border-blue-800/30' 
                                      : 'bg-amber-50 text-amber-600 border border-amber-200 dark:bg-amber-950/20 dark:text-amber-400 dark:border-amber-800/30'
                                  }`}>
                                    {p.tipo === 'servico' ? 'Serviço' : 'Venda'}
                                  </span>
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap font-bold text-zinc-800 dark:text-zinc-100">
                                  {p.numero}
                                </td>
                                <td className="px-4 py-3 max-w-[180px] truncate text-zinc-700 dark:text-zinc-350" title={p.cliente}>
                                  {p.cliente}
                                </td>
                                <td className="px-4 py-3 max-w-[200px] truncate text-zinc-600 dark:text-zinc-400" title={p.itens}>
                                  {p.itens}
                                </td>
                                <td className="px-4 py-3 max-w-[200px] truncate text-zinc-750 dark:text-zinc-300" title={p.profissional}>
                                  {p.profissional || '-'}
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap text-zinc-500 dark:text-zinc-450">
                                  {p.usuario_recebimento || '-'}
                                </td>
                                <td className="px-4 py-3 text-center whitespace-nowrap">
                                  <span className="px-2 py-0.5 bg-zinc-100 border border-zinc-200 text-zinc-600 rounded text-[9px] uppercase font-bold dark:bg-zinc-800 dark:border-zinc-700 dark:text-zinc-300">
                                    {getFormaLabel(p.forma_pagamento)}
                                  </span>
                                </td>
                                <td className="px-4 py-3 text-right font-mono text-zinc-700 dark:text-zinc-350 whitespace-nowrap">
                                  {fmtBRL(p.valor_recebido || p.valor)}
                                </td>
                                <td className="px-4 py-3 text-right font-mono text-amber-600 dark:text-amber-500 whitespace-nowrap">
                                  {Number(p.troco) > 0 ? fmtBRL(p.troco) : "—"}
                                </td>
                                <td className="px-4 py-3 text-right font-mono font-bold text-[#3A4F4A] dark:text-[#EAF0EE] whitespace-nowrap">
                                  {fmtBRL(p.valor)}
                                </td>
                                <td className="px-4 py-3 text-right font-mono text-zinc-500 dark:text-zinc-400 whitespace-nowrap">
                                  {fmtBRL(p.valor_total_operacao || 0)}
                                </td>
                                <td className="px-4 py-3 text-center whitespace-nowrap">
                                  <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${
                                    p.status_operacao === 'concluido' || p.status_operacao === 'pago'
                                      ? 'bg-emerald-50 text-emerald-600 border border-emerald-200 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-800/30'
                                      : p.status_operacao === 'cancelado'
                                      ? 'bg-rose-50 text-rose-600 border border-rose-200 dark:bg-rose-950/20 dark:text-rose-400 dark:border-rose-800/30'
                                      : 'bg-amber-50 text-amber-600 border border-amber-200 dark:bg-amber-950/20 dark:text-amber-400 dark:border-amber-800/30'
                                  }`}>
                                    {p.status_operacao === 'concluido' ? 'Concluído' : p.status_operacao === 'pago' ? 'Pago' : p.status_operacao}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      );
                    })()}
                  </div>

                  <DialogFooter className="pt-3 border-t border-zinc-150 dark:border-zinc-800 flex items-center justify-end">
                    <Button variant="outline" onClick={() => setDetailsForma(null)} className="h-9 text-xs font-semibold">
                      Fechar
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          )}
        </TabsContent>

        <TabsContent value="cartoes">
          {!cartoes ? (
            <div className="text-zinc-400 p-8 text-center font-medium">Carregando...</div>
          ) : (
            <div className="space-y-6">
              {/* Cards de Resumo */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-6 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-sm">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs uppercase font-bold text-zinc-400 dark:text-zinc-500 block">Faturamento Bruto</span>
                      <span className="text-2xl font-black font-display text-zinc-800 dark:text-zinc-100 mt-1 block">
                        {fmtBRL(cartoes.totais?.bruto || 0)}
                      </span>
                    </div>
                    <div className="p-3 bg-zinc-50 dark:bg-zinc-850 rounded-xl text-zinc-500 dark:text-zinc-400">
                      <Banknote className="w-5 h-5" />
                    </div>
                  </div>
                </div>

                <div className="p-6 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-sm border-l-4 border-l-rose-500">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs uppercase font-bold text-rose-500 block">Taxas Cobradas</span>
                      <span className="text-2xl font-black font-display text-rose-600 dark:text-rose-400 mt-1 block">
                        - {fmtBRL(cartoes.totais?.taxa || 0)}
                      </span>
                    </div>
                    <div className="p-3 bg-rose-50 dark:bg-rose-950/20 rounded-xl text-rose-500">
                      <TrendingDown className="w-5 h-5" />
                    </div>
                  </div>
                </div>

                <div className="p-6 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-sm border-l-4 border-l-[#84A59D]">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs uppercase font-bold text-[#84A59D] block">Faturamento Líquido</span>
                      <span className="text-2xl font-black font-display text-[#3A4F4A] dark:text-[#EAF0EE] mt-1 block">
                        {fmtBRL(cartoes.totais?.liquido || 0)}
                      </span>
                    </div>
                    <div className="p-3 bg-[#EAF0EE] dark:bg-[#1E2D2A] rounded-xl text-[#84A59D]">
                      <TrendingUp className="w-5 h-5" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Tabela de Custos Comparativos por Adquirente */}
              <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 shadow-sm">
                <h4 className="font-display text-sm font-bold text-zinc-800 dark:text-zinc-100 mb-4 flex items-center gap-1.5">
                  📊 Comparativo de Custos por Adquirente (Maquineta)
                </h4>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead>
                      <tr className="border-b border-zinc-100 dark:border-zinc-800 text-zinc-400 font-bold uppercase tracking-wider">
                        <th className="pb-3 font-semibold">Adquirente</th>
                        <th className="pb-3 text-right font-semibold">Faturamento Bruto</th>
                        <th className="pb-3 text-right font-semibold">Taxas Pagas</th>
                        <th className="pb-3 text-right font-semibold">Recebimento Líquido</th>
                        <th className="pb-3 text-right font-semibold">Custo Médio %</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-50 dark:divide-zinc-850">
                      {(cartoes.por_adquirente || []).map((adq, idx) => {
                        const custoMedio = adq.bruto > 0 ? ((adq.taxas / adq.bruto) * 100).toFixed(2) : "0.00";
                        return (
                          <tr key={idx} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-950/20 transition-colors">
                            <td className="py-3.5 font-medium text-zinc-800 dark:text-zinc-200">{adq.adquirente}</td>
                            <td className="py-3.5 text-right font-mono text-zinc-700 dark:text-zinc-300">{fmtBRL(adq.bruto)}</td>
                            <td className="py-3.5 text-right font-mono text-rose-500 font-medium">-{fmtBRL(adq.taxas)}</td>
                            <td className="py-3.5 text-right font-mono text-emerald-600 dark:text-emerald-400 font-semibold">{fmtBRL(adq.liquido)}</td>
                            <td className="py-3.5 text-right font-mono font-medium text-zinc-500">{custoMedio}%</td>
                          </tr>
                        );
                      })}
                      {(cartoes.por_adquirente || []).length === 0 && (
                        <tr>
                          <td colSpan={5} className="py-8 text-center text-zinc-400">Nenhum dado consolidado no período.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Tabela de Transações Detalhadas */}
              <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 shadow-sm">
                <h4 className="font-display text-sm font-bold text-zinc-800 dark:text-zinc-100 mb-4 flex items-center gap-1.5">
                  💳 Extrato Analítico de Transações
                </h4>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead>
                      <tr className="border-b border-zinc-100 dark:border-zinc-800 text-zinc-400 font-bold uppercase tracking-wider">
                        <th className="pb-3 font-semibold">Data / Hora</th>
                        <th className="pb-3 font-semibold">Forma de Pagamento</th>
                        <th className="pb-3 font-semibold">Tipo</th>
                        <th className="pb-3 font-semibold">Adquirente</th>
                        <th className="pb-3 font-semibold">Bandeira</th>
                        <th className="pb-3 text-center font-semibold">Parcelas</th>
                        <th className="pb-3 text-right font-semibold">Taxa %</th>
                        <th className="pb-3 text-right font-semibold">Valor Bruto</th>
                        <th className="pb-3 text-right font-semibold">Taxa Cobrada</th>
                        <th className="pb-3 text-right font-semibold">Valor Líquido</th>
                        <th className="pb-3 text-right font-semibold">Previsão Recebimento</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-50 dark:divide-zinc-850">
                      {(cartoes.transacoes || []).map((t, idx) => {
                        const dataPrev = t.data_recebimento_prevista ? new Date(t.data_recebimento_prevista).toLocaleDateString("pt-BR") : "-";
                        return (
                          <tr key={idx} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-950/20 transition-colors">
                            <td className="py-3.5 text-zinc-500 dark:text-zinc-400 font-mono whitespace-nowrap">{fmtDT(t.data_venda)}</td>
                            <td className="py-3.5 font-medium text-zinc-800 dark:text-zinc-200">{t.forma_pagamento_label}</td>
                            <td className="py-3.5">
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                                t.tipo_cartao === 'credito' 
                                  ? 'bg-indigo-55 bg-indigo-50 text-indigo-700 border border-indigo-200 dark:bg-indigo-950/20 dark:text-indigo-400' 
                                  : 'bg-teal-55 bg-teal-50 text-teal-700 border border-teal-200 dark:bg-teal-950/20 dark:text-teal-400'
                              }`}>
                                {t.tipo_cartao === 'credito' ? 'Crédito' : 'Débito'}
                              </span>
                            </td>
                            <td className="py-3.5 text-zinc-600 dark:text-zinc-300 font-medium">{t.adquirente_nome}</td>
                            <td className="py-3.5">
                              {t.bandeira ? (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-200">
                                  {t.bandeira}
                                </span>
                              ) : (
                                <span className="text-zinc-400">—</span>
                              )}
                            </td>
                            <td className="py-3.5 text-center font-mono text-zinc-650 dark:text-zinc-400">{t.parcelas ? `${t.parcelas}x` : "-"}</td>
                            <td className="py-3.5 text-right font-mono text-zinc-500">{t.taxa_percentual !== null ? `${t.taxa_percentual}%` : "-"}</td>
                            <td className="py-3.5 text-right font-mono font-semibold text-zinc-700 dark:text-zinc-300">{fmtBRL(t.valor_bruto)}</td>
                            <td className="py-3.5 text-right font-mono text-rose-500 font-medium">-{fmtBRL(t.taxa_valor)}</td>
                            <td className="py-3.5 text-right font-mono text-emerald-600 dark:text-emerald-400 font-bold">{fmtBRL(t.valor_liquido)}</td>
                            <td className="py-3.5 text-right font-mono text-zinc-500">{dataPrev}</td>
                          </tr>
                        );
                      })}
                      {(cartoes.transacoes || []).length === 0 && (
                        <tr>
                          <td colSpan={11} className="py-8 text-center text-zinc-400">Nenhuma transação encontrada no período.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
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
              const totalFaturamento = produtos.totais?.total_faturamento || 0;
              const totalQuantidade = produtos.totais?.total_quantidade || 0;
              const totalCusto = produtos.totais?.total_custo || 0;
              const totalLucro = produtos.totais?.total_lucro || 0;
              const pagination = produtos.pagination || { page: produtosPage, limit: REPORT_PAGE_SIZE, total: filteredVendas.length, pages: 1 };
              const activePage = pagination.page || produtosPage;
              const totalPages = pagination.pages || 1;
              const totalRecords = pagination.total || filteredVendas.length;

              // 3. Agrupamentos para o painel lateral de desempenho (breakdowns)
              const porColab = produtos.totais?.por_colaborador || {};
              const porProd = produtos.totais?.por_produto || {};

              const handleSort = (field) => {
                const nextDirection = sortField === field && sortDirection === "asc" ? "desc" : "asc";
                if (sortField === field) {
                  setSortDirection(nextDirection);
                } else {
                  setSortField(field);
                  setSortDirection("desc");
                }
                setProdutosPage(1);
                reload({
                  produtosPage: 1,
                  produtoSortField: field,
                  produtoSortDirection: sortField === field ? nextDirection : "desc"
                });
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
                      <div className="font-display text-2xl lg:text-3xl font-bold mt-1.5 text-zinc-700">
                        {(totalQuantidade || 0).toLocaleString("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: 3 })}{" "}
                        <span className="text-xs font-normal text-zinc-400">itens</span>
                      </div>
                      <div className="text-[10px] text-zinc-400 mt-1">
                        Média de {((totalQuantidade || 0) / Math.max(1, filteredVendas.length)).toLocaleString("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: 1 })} itens por venda
                      </div>
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
                                    {(v.quantidade || 0).toLocaleString("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: 3 })}
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
                                            {getFormaLabel(f)}
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
                      <div className="text-xs uppercase tracking-wider text-zinc-400 font-semibold">Serviços Executados</div>
                      <div className="font-display text-2xl lg:text-3xl font-bold mt-1.5 text-zinc-700">{totalQuantidade} <span className="text-xs font-normal text-zinc-400">serviços</span></div>
                      <div className="text-[10px] text-zinc-400 mt-1">Total de serviços/procedimentos realizados no período</div>
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
                                            {getFormaLabel(f)}
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
                <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 shadow-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">Faturamento Bruto</span>
                    <TrendingUp className="w-5 h-5 text-[#84A59D]" />
                  </div>
                  <div className="font-display text-3xl font-bold mt-2 text-zinc-800 dark:text-zinc-100">
                    {fmtBRL(resultadoOperacional.consolidado.receita_total)}
                  </div>
                  <p className="text-[10px] text-zinc-500 mt-1">
                    Serviços: {fmtBRL(resultadoOperacional.consolidado.receita_servicos)} | Produtos: {fmtBRL(resultadoOperacional.consolidado.receita_produtos)}
                  </p>
                </div>

                <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 shadow-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">Custos & Deduções</span>
                    <TrendingDown className="w-5 h-5 text-rose-500" />
                  </div>
                  <div className="font-display text-3xl font-bold mt-2 text-zinc-800 dark:text-zinc-100">
                    {fmtBRL(resultadoOperacional.consolidado.cmv + resultadoOperacional.consolidado.comissoes + resultadoOperacional.consolidado.taxas)}
                  </div>
                  <p className="text-[10px] text-zinc-500 mt-1">
                    CMV/Insumo: {fmtBRL(resultadoOperacional.consolidado.cmv)} | Comissões: {fmtBRL(resultadoOperacional.consolidado.comissoes)} | Taxas: {fmtBRL(resultadoOperacional.consolidado.taxas)}
                  </p>
                </div>

                <div className={`border rounded-2xl p-5 shadow-sm hover:shadow-md transition-all ${
                  resultadoOperacional.consolidado.resultado_operacional >= 0 
                    ? "bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800/40" 
                    : "bg-rose-50/50 dark:bg-rose-950/20 border-rose-200 dark:border-rose-800/40"
                }`}>
                  <div className="flex items-center justify-between">
                    <span className={`text-xs font-bold uppercase tracking-wider ${
                      resultadoOperacional.consolidado.resultado_operacional >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"
                    }`}>
                      Resultado Operacional
                    </span>
                    {resultadoOperacional.consolidado.resultado_operacional >= 0 ? (
                      <TrendingUp className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                    ) : (
                      <TrendingDown className="w-5 h-5 text-rose-600 dark:text-rose-400" />
                    )}
                  </div>
                  <div className={`font-display text-3xl font-black mt-2 ${
                    resultadoOperacional.consolidado.resultado_operacional >= 0 ? "text-emerald-700 dark:text-emerald-300" : "text-rose-700 dark:text-rose-300"
                  }`}>
                    {fmtBRL(resultadoOperacional.consolidado.resultado_operacional)}
                  </div>
                  <p className="text-[10px] text-zinc-500 mt-1">
                    Margem Operacional: {(resultadoOperacional.consolidado.margem_operacional || 0).toFixed(2)}%
                  </p>
                </div>
              </div>

              {/* Detailed Breakdown */}
              <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-6 space-y-4 shadow-sm">
                <div className="flex justify-between items-center border-b border-zinc-100 dark:border-zinc-800 pb-3">
                  <h3 className="font-display text-lg font-medium text-zinc-800 dark:text-zinc-100">Resultado Operacional Consolidado</h3>
                  <div className="flex gap-2 no-print">
                    <Button 
                      onClick={() => window.print()}
                      variant="outline" 
                      size="sm"
                      className="text-xs h-8 text-zinc-650 hover:text-zinc-800 border-zinc-200 dark:border-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-800"
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
                      className="text-xs h-8 text-zinc-650 hover:text-zinc-800 border-zinc-200 dark:border-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-800"
                    >
                      CSV
                    </Button>
                  </div>
                </div>

                <div className="space-y-3 divide-y divide-zinc-100 dark:divide-zinc-800">
                  <div className="pt-2">
                    <DRE_Row label="Faturamento de Serviços" value={resultadoOperacional.consolidado.receita_servicos} />
                  </div>
                  <div className="pt-2">
                    <DRE_Row label="Faturamento de Vendas de Produtos" value={resultadoOperacional.consolidado.receita_produtos} />
                  </div>
                  <div className="border-t border-zinc-200 dark:border-zinc-800 pt-3">
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
                  <div className="border-t border-zinc-200 dark:border-zinc-800 pt-3">
                    <DRE_Row label="Resultado Operacional" value={resultadoOperacional.consolidado.resultado_operacional} bold highlight />
                  </div>
                  <div className="pt-2 flex justify-between items-center text-sm font-semibold">
                    <span className="text-zinc-500 dark:text-zinc-400">Margem Operacional (%)</span>
                    <span className="text-zinc-800 dark:text-zinc-200 font-mono">{(resultadoOperacional.consolidado.margem_operacional || 0).toFixed(2)}%</span>
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
              {/* Cards de Totalizadores */}
              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
                {/* Card Qtd */}
                <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 shadow-sm flex flex-col justify-between">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">Qtd Serviços</span>
                    <div className="p-1 rounded bg-sky-50 dark:bg-sky-950/30">
                      <ClipboardList className="w-4 h-4 text-sky-500" />
                    </div>
                  </div>
                  <div className="font-display text-base font-bold mt-2 text-zinc-800 dark:text-zinc-100 font-mono">
                    {(totalsServicos.quantidade || 0).toLocaleString("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: 3 })}
                  </div>
                </div>

                {/* Card Faturamento */}
                <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 shadow-sm flex flex-col justify-between">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">Faturamento</span>
                    <div className="p-1 rounded bg-indigo-50 dark:bg-indigo-950/30">
                      <Scissors className="w-4 h-4 text-indigo-500" />
                    </div>
                  </div>
                  <div className="font-display text-base font-bold mt-2 text-zinc-800 dark:text-zinc-100 font-mono">
                    {fmtBRL(totalsServicos.faturamento)}
                  </div>
                </div>

                {/* Card Insumos */}
                <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 shadow-sm flex flex-col justify-between">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">Insumos</span>
                    <div className="p-1 rounded bg-rose-50 dark:bg-rose-950/30">
                      <TrendingDown className="w-4 h-4 text-rose-500" />
                    </div>
                  </div>
                  <div className="font-display text-base font-bold mt-2 text-rose-500 font-mono">
                    {fmtBRL(totalsServicos.insumos)}
                  </div>
                </div>

                {/* Card Comissão */}
                <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 shadow-sm flex flex-col justify-between">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">Comissão</span>
                    <div className="p-1 rounded bg-amber-50 dark:bg-amber-950/30">
                      <User className="w-4 h-4 text-amber-500" />
                    </div>
                  </div>
                  <div className="font-display text-base font-bold mt-2 text-amber-600 dark:text-amber-500 font-mono">
                    {fmtBRL(totalsServicos.comissao)}
                  </div>
                </div>

                {/* Card Taxas */}
                <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 shadow-sm flex flex-col justify-between">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">Taxas</span>
                    <div className="p-1 rounded bg-orange-50 dark:bg-orange-950/30">
                      <CreditCard className="w-4 h-4 text-orange-500" />
                    </div>
                  </div>
                  <div className="font-display text-base font-bold mt-2 text-orange-600 dark:text-orange-500 font-mono">
                    {fmtBRL(totalsServicos.taxas)}
                  </div>
                </div>

                {/* Card Resultado */}
                <div className={`border rounded-xl p-4 shadow-sm flex flex-col justify-between transition-all ${
                  totalsServicos.resultado >= 0 
                    ? "bg-emerald-50/20 dark:bg-emerald-950/10 border-emerald-200 dark:border-emerald-800/40" 
                    : "bg-rose-50/20 dark:bg-rose-950/10 border-rose-200 dark:border-rose-800/40"
                }`}>
                  <div className="flex items-center justify-between gap-2">
                    <span className={`text-[10px] font-bold uppercase tracking-wider ${
                      totalsServicos.resultado >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"
                    }`}>
                      Resultado
                    </span>
                    <div className={`p-1 rounded ${
                      totalsServicos.resultado >= 0 ? "bg-emerald-50 dark:bg-emerald-950/30" : "bg-rose-50 dark:bg-rose-950/30"
                    }`}>
                      {totalsServicos.resultado >= 0 ? (
                        <TrendingUp className="w-4 h-4 text-emerald-500" />
                      ) : (
                        <TrendingDown className="w-4 h-4 text-rose-500" />
                      )}
                    </div>
                  </div>
                  <div className={`font-display text-base font-bold mt-2 font-mono ${
                    totalsServicos.resultado >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"
                  }`}>
                    {fmtBRL(totalsServicos.resultado)}
                  </div>
                </div>

                {/* Card Margem */}
                <div className={`border rounded-xl p-4 shadow-sm flex flex-col justify-between transition-all ${
                  totalMargemServicos >= 50 
                    ? "bg-emerald-50/20 dark:bg-emerald-950/10 border-emerald-200 dark:border-emerald-800/40" 
                    : totalMargemServicos >= 20 
                    ? "bg-amber-50/20 dark:bg-amber-950/10 border-amber-200 dark:border-amber-800/40" 
                    : "bg-rose-50/20 dark:bg-rose-950/10 border-rose-200 dark:border-rose-800/40"
                }`}>
                  <div className="flex items-center justify-between gap-2">
                    <span className={`text-[10px] font-bold uppercase tracking-wider ${
                      totalMargemServicos >= 50 
                        ? "text-emerald-600 dark:text-emerald-400" 
                        : totalMargemServicos >= 20 
                        ? "text-amber-600 dark:text-amber-400" 
                        : "text-rose-600 dark:text-rose-400"
                    }`}>
                      Margem
                    </span>
                    <div className={`p-1 rounded ${
                      totalMargemServicos >= 50 
                        ? "bg-emerald-50 dark:bg-emerald-950/30" 
                        : totalMargemServicos >= 20 
                        ? "bg-amber-50 dark:bg-amber-950/30" 
                        : "bg-rose-50 dark:bg-rose-950/30"
                    }`}>
                      <Percent className={`w-4 h-4 ${
                        totalMargemServicos >= 50 
                          ? "text-emerald-500" 
                          : totalMargemServicos >= 20 
                          ? "text-amber-500" 
                          : "text-rose-500"
                      }`} />
                    </div>
                  </div>
                  <div className={`font-display text-base font-bold mt-2 font-mono ${
                    totalMargemServicos >= 50 
                      ? "text-emerald-600 dark:text-emerald-400" 
                      : totalMargemServicos >= 20 
                      ? "text-amber-600 dark:text-amber-400" 
                      : "text-rose-600 dark:text-rose-400"
                  }`}>
                    {(totalMargemServicos || 0).toFixed(1)}%
                  </div>
                </div>
              </div>

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
                      ['Serviço', 'Qtd Serviços', 'Faturamento', 'Comissão', 'Taxas', 'Insumos', 'Resultado', 'Margem (%)'], 
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
                      ['Serviço', 'Qtd Serviços', 'Faturamento', 'Comissão', 'Taxas', 'Insumos', 'Resultado', 'Margem (%)'], 
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
              <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left border-collapse">
                    <thead>
                      <tr className="bg-zinc-50 dark:bg-zinc-950 border-b border-zinc-200 dark:border-zinc-800 text-zinc-500 dark:text-zinc-400 font-bold uppercase tracking-wider">
                        <th className="px-4 py-3">
                          <SortHeader label="Serviço" field="servico_nome" currentField={sortServicoField} direction={sortServicoDirection} onSort={(f) => {
                            if (sortServicoField === f) setSortServicoDirection(d => d === 'asc' ? 'desc' : 'asc');
                            else { setSortServicoField(f); setSortServicoDirection('desc'); }
                          }} />
                        </th>
                        <th className="px-4 py-3 text-center">
                          <SortHeader label="Qtd Serviços" field="quantidade" currentField={sortServicoField} direction={sortServicoDirection} onSort={(f) => {
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
                    <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                      {sortedAndFilteredServicos.length === 0 ? (
                        <tr>
                          <td colSpan={8} className="text-center py-8 text-zinc-400">Nenhum serviço encontrado.</td>
                        </tr>
                      ) : sortedAndFilteredServicos.map((s, idx) => (
                        <tr key={idx} className="hover:bg-zinc-100 dark:hover:bg-zinc-800/50 cursor-pointer transition-colors" onClick={() => handleShowRentabilidadeDetail(s, 'servico')}>
                          <td className="px-4 py-3 font-semibold text-zinc-700 dark:text-zinc-300">{s.servico_nome}</td>
                          <td className="px-4 py-3 text-center font-mono">{(s.quantidade || 0).toLocaleString("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: 3 })}</td>
                          <td className="px-4 py-3 text-right font-mono text-zinc-800 dark:text-zinc-200">{fmtBRL(s.faturamento)}</td>
                          <td className="px-4 py-3 text-right font-mono text-rose-550 dark:text-rose-400">{fmtBRL(s.insumos)}</td>
                          <td className="px-4 py-3 text-right font-mono text-amber-600 dark:text-amber-400">{fmtBRL(s.comissao)}</td>
                          <td className="px-4 py-3 text-right font-mono text-amber-700 dark:text-amber-500">{fmtBRL(s.taxas)}</td>
                          <td className={`px-4 py-3 text-right font-mono font-bold ${s.resultado_operacional >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>{fmtBRL(s.resultado_operacional)}</td>
                          <td className="px-4 py-3 text-center font-mono">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold border whitespace-nowrap ${
                              s.margem >= 50 
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-250 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-800/50' 
                                : s.margem >= 20 
                                ? 'bg-amber-50 text-amber-650 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-800/50' 
                                : 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/30 dark:text-rose-400 dark:border-rose-800/50'
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
                    onChange={(e) => {
                      setSearchOperProduto(e.target.value);
                      setRentabilidadeProdutosPage(1);
                    }}
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
              <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left border-collapse">
                    <thead>
                      <tr className="bg-zinc-50 dark:bg-zinc-950 border-b border-zinc-200 dark:border-zinc-850 text-zinc-500 dark:text-zinc-400 font-bold uppercase tracking-wider">
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
                    <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                      {sortedAndFilteredProdutos.length === 0 ? (
                        <tr>
                          <td colSpan={8} className="text-center py-8 text-zinc-400">Nenhum produto encontrado.</td>
                        </tr>
                      ) : paginatedRentabilidadeProdutos.map((p, idx) => (
                        <tr key={idx} className="hover:bg-zinc-100 dark:hover:bg-zinc-800/50 cursor-pointer transition-colors" onClick={() => handleShowRentabilidadeDetail(p, 'produto')}>
                          <td className="px-4 py-3 font-semibold text-zinc-700 dark:text-zinc-300">{p.produto_nome}</td>
                          <td className="px-4 py-3 text-center font-mono">{(p.quantidade || 0).toLocaleString("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: 3 })}</td>
                          <td className="px-4 py-3 text-right font-mono text-zinc-800 dark:text-zinc-200">{fmtBRL(p.faturamento)}</td>
                          <td className="px-4 py-3 text-right font-mono text-rose-550 dark:text-rose-400">{fmtBRL(p.cmv)}</td>
                          <td className="px-4 py-3 text-right font-mono text-amber-600 dark:text-amber-400">{fmtBRL(p.comissao)}</td>
                          <td className="px-4 py-3 text-right font-mono text-amber-700 dark:text-amber-500">{fmtBRL(p.taxas)}</td>
                          <td className={`px-4 py-3 text-right font-mono font-bold ${p.resultado_operacional >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>{fmtBRL(p.resultado_operacional)}</td>
                          <td className="px-4 py-3 text-center font-mono">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold border whitespace-nowrap ${
                              p.margem >= 40 
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-250 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-800/50' 
                                : p.margem >= 15 
                                ? 'bg-amber-50 text-amber-650 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-800/50' 
                                : 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/30 dark:text-rose-400 dark:border-rose-800/50'
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
              {rentabilidadeProdutosTotalPages > 1 && (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 shadow-sm select-none no-print">
                  <span className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">
                    Exibindo <span className="font-semibold text-zinc-800 dark:text-zinc-200">{Math.min(sortedAndFilteredProdutos.length, (rentabilidadeProdutosActivePage - 1) * REPORT_PAGE_SIZE + 1)}</span> a{" "}
                    <span className="font-semibold text-zinc-800 dark:text-zinc-200">{Math.min(sortedAndFilteredProdutos.length, rentabilidadeProdutosActivePage * REPORT_PAGE_SIZE)}</span> de{" "}
                    <span className="font-semibold text-zinc-800 dark:text-zinc-200">{sortedAndFilteredProdutos.length}</span> registros
                  </span>
                  <div className="flex items-center gap-1.5">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setRentabilidadeProdutosPage(prev => Math.max(1, prev - 1))}
                      disabled={rentabilidadeProdutosActivePage === 1}
                      className="h-8 px-2.5 text-xs font-semibold gap-1 dark:border-zinc-800"
                    >
                      <ChevronLeft className="w-4 h-4" /> Anterior
                    </Button>
                    <span className="px-3 text-xs font-semibold text-zinc-600 dark:text-zinc-300">
                      Página {rentabilidadeProdutosActivePage} de {rentabilidadeProdutosTotalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setRentabilidadeProdutosPage(prev => Math.min(rentabilidadeProdutosTotalPages, prev + 1))}
                      disabled={rentabilidadeProdutosActivePage === rentabilidadeProdutosTotalPages}
                      className="h-8 px-2.5 text-xs font-semibold gap-1 dark:border-zinc-800"
                    >
                      Próxima <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </TabsContent>

        <TabsContent value="analitico_vendas">
          {!resultadoOperacional ? (
            <div className="text-zinc-400 p-8 text-center bg-white border border-zinc-200 rounded-xl">Carregando dados...</div>
          ) : (
            <div className="space-y-6 print-full-width">
              {/* Cards de Totalizadores */}
              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
                {/* Card Produtos */}
                <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 shadow-sm flex flex-col justify-between">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">Produtos</span>
                    <div className="p-1 rounded bg-sky-50 dark:bg-sky-950/30">
                      <Package className="w-4 h-4 text-sky-500" />
                    </div>
                  </div>
                  <div className="font-display text-base font-bold mt-2 text-zinc-800 dark:text-zinc-100 font-mono">
                    {fmtBRL(totalsVendas.produtos)}
                  </div>
                </div>

                {/* Card Serviços */}
                <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 shadow-sm flex flex-col justify-between">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">Serviços</span>
                    <div className="p-1 rounded bg-indigo-50 dark:bg-indigo-950/30">
                      <Scissors className="w-4 h-4 text-indigo-500" />
                    </div>
                  </div>
                  <div className="font-display text-base font-bold mt-2 text-zinc-800 dark:text-zinc-100 font-mono">
                    {fmtBRL(totalsVendas.servicos)}
                  </div>
                </div>

                {/* Card CMV */}
                <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 shadow-sm flex flex-col justify-between">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">CMV</span>
                    <div className="p-1 rounded bg-rose-50 dark:bg-rose-950/30">
                      <TrendingDown className="w-4 h-4 text-rose-500" />
                    </div>
                  </div>
                  <div className="font-display text-base font-bold mt-2 text-rose-500 font-mono">
                    {fmtBRL(totalsVendas.cmv)}
                  </div>
                </div>

                {/* Card Comissão */}
                <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 shadow-sm flex flex-col justify-between">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">Comissão</span>
                    <div className="p-1 rounded bg-amber-50 dark:bg-amber-950/30">
                      <User className="w-4 h-4 text-amber-500" />
                    </div>
                  </div>
                  <div className="font-display text-base font-bold mt-2 text-amber-600 dark:text-amber-500 font-mono">
                    {fmtBRL(totalsVendas.comissao)}
                  </div>
                </div>

                {/* Card Taxas */}
                <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 shadow-sm flex flex-col justify-between">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">Taxas</span>
                    <div className="p-1 rounded bg-orange-50 dark:bg-orange-950/30">
                      <CreditCard className="w-4 h-4 text-orange-500" />
                    </div>
                  </div>
                  <div className="font-display text-base font-bold mt-2 text-orange-600 dark:text-orange-500 font-mono">
                    {fmtBRL(totalsVendas.taxas)}
                  </div>
                </div>

                {/* Card Resultado */}
                <div className={`border rounded-xl p-4 shadow-sm flex flex-col justify-between transition-all ${
                  totalsVendas.resultado >= 0 
                    ? "bg-emerald-50/20 dark:bg-emerald-950/10 border-emerald-200 dark:border-emerald-800/40" 
                    : "bg-rose-50/20 dark:bg-rose-950/10 border-rose-200 dark:border-rose-800/40"
                }`}>
                  <div className="flex items-center justify-between gap-2">
                    <span className={`text-[10px] font-bold uppercase tracking-wider ${
                      totalsVendas.resultado >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"
                    }`}>
                      Resultado
                    </span>
                    <div className={`p-1 rounded ${
                      totalsVendas.resultado >= 0 ? "bg-emerald-50 dark:bg-emerald-950/30" : "bg-rose-50 dark:bg-rose-950/30"
                    }`}>
                      {totalsVendas.resultado >= 0 ? (
                        <TrendingUp className="w-4 h-4 text-emerald-500" />
                      ) : (
                        <TrendingDown className="w-4 h-4 text-rose-500" />
                      )}
                    </div>
                  </div>
                  <div className={`font-display text-base font-bold mt-2 font-mono ${
                    totalsVendas.resultado >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"
                  }`}>
                    {fmtBRL(totalsVendas.resultado)}
                  </div>
                </div>

                {/* Card Margem */}
                <div className={`border rounded-xl p-4 shadow-sm flex flex-col justify-between transition-all ${
                  totalMargemVendas >= 35 
                    ? "bg-emerald-50/20 dark:bg-emerald-950/10 border-emerald-200 dark:border-emerald-800/40" 
                    : totalMargemVendas >= 15 
                    ? "bg-amber-50/20 dark:bg-amber-950/10 border-amber-200 dark:border-amber-800/40" 
                    : "bg-rose-50/20 dark:bg-rose-950/10 border-rose-200 dark:border-rose-800/40"
                }`}>
                  <div className="flex items-center justify-between gap-2">
                    <span className={`text-[10px] font-bold uppercase tracking-wider ${
                      totalMargemVendas >= 35 
                        ? "text-emerald-600 dark:text-emerald-400" 
                        : totalMargemVendas >= 15 
                        ? "text-amber-600 dark:text-amber-400" 
                        : "text-rose-600 dark:text-rose-400"
                    }`}>
                      Margem
                    </span>
                    <div className={`p-1 rounded ${
                      totalMargemVendas >= 35 
                        ? "bg-emerald-50 dark:bg-emerald-950/30" 
                        : totalMargemVendas >= 15 
                        ? "bg-amber-50 dark:bg-amber-950/30" 
                        : "bg-rose-50 dark:bg-rose-950/30"
                    }`}>
                      <Percent className={`w-4 h-4 ${
                        totalMargemVendas >= 35 
                          ? "text-emerald-500" 
                          : totalMargemVendas >= 15 
                          ? "text-amber-500" 
                          : "text-rose-500"
                      }`} />
                    </div>
                  </div>
                  <div className={`font-display text-base font-bold mt-2 font-mono ${
                    totalMargemVendas >= 35 
                      ? "text-emerald-600 dark:text-emerald-400" 
                      : totalMargemVendas >= 15 
                      ? "text-amber-600 dark:text-amber-400" 
                      : "text-rose-600 dark:text-rose-400"
                  }`}>
                    {totalMargemVendas.toFixed(1)}%
                  </div>
                </div>
              </div>
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
        <TabsContent value="estoque_atual">
          {renderEstoqueReport("estoque_atual")}
        </TabsContent>
        <TabsContent value="estoque_movimentacao">
          {renderEstoqueReport("estoque_movimentacao")}
        </TabsContent>
        <TabsContent value="estoque_abaixo_minimo">
          {renderEstoqueReport("estoque_abaixo_minimo")}
        </TabsContent>
        <TabsContent value="estoque_sem_estoque">
          {renderEstoqueReport("estoque_sem_estoque")}
        </TabsContent>
        <TabsContent value="estoque_valorizacao">
          {renderEstoqueReport("estoque_valorizacao")}
        </TabsContent>
        <TabsContent value="estoque_consumo_insumos">
          {renderEstoqueReport("estoque_consumo_insumos")}
        </TabsContent>
        <TabsContent value="estoque_mais_movimentados">
          {renderEstoqueReport("estoque_mais_movimentados")}
        </TabsContent>
        <TabsContent value="estoque_sem_movimentacao">
          {renderEstoqueReport("estoque_sem_movimentacao")}
        </TabsContent>
        <TabsContent value="estoque_historico_ajustes">
          {renderEstoqueReport("estoque_historico_ajustes")}
        </TabsContent>
        <TabsContent value="estoque_inventario">
          {renderEstoqueReport("estoque_inventario")}
        </TabsContent>
        <TabsContent value="estoque_perdas_quebras">
          {renderEstoqueReport("estoque_perdas_quebras")}
        </TabsContent>
      </Tabs>
    )}
      {/* Rentabilidade Detail Dialog */}
      <Dialog open={rentabilidadeDetailOpen} onOpenChange={setRentabilidadeDetailOpen}>
        <DialogContent className="sm:max-w-5xl md:max-w-6xl lg:max-w-7xl max-h-[90vh] overflow-y-auto w-[96vw] rounded-xl p-6 md:p-8 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-800 dark:text-zinc-100">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl md:text-2xl font-semibold text-[#3A4F4A] dark:text-[#EAF0EE]">
              <TrendingUp className="w-6 h-6 text-[#84A59D]" />
              <span>Detalhamento de Rentabilidade: {detailType === 'servico' ? selectedDetailItem?.servico_nome : selectedDetailItem?.produto_nome}</span>
            </DialogTitle>
            <p className="text-xs sm:text-sm text-zinc-500 mt-1">
              Análise individual e composição dos lançamentos no período de {from ? new Date(from + 'T12:00:00').toLocaleDateString('pt-BR') : ''} a {to ? new Date(to + 'T12:00:00').toLocaleDateString('pt-BR') : ''}.
            </p>
          </DialogHeader>

          {selectedDetailItem && (
            <div className="space-y-6 my-4">
              {/* Summary Cards */}
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                <div className="bg-zinc-50 dark:bg-zinc-950 p-4 border border-zinc-200 dark:border-zinc-800 rounded-xl">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Quantidade</span>
                  <div className="text-2xl font-display font-bold text-zinc-800 dark:text-zinc-100 mt-1">
                    {(selectedDetailItem.quantidade || 0).toLocaleString("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: 3 })}
                  </div>
                </div>
                <div className="bg-zinc-50 dark:bg-zinc-950 p-4 border border-zinc-200 dark:border-zinc-800 rounded-xl">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Faturamento Bruto</span>
                  <div className="text-2xl font-display font-bold text-zinc-800 dark:text-zinc-100 mt-1">{fmtBRL(selectedDetailItem.faturamento)}</div>
                </div>
                <div className="bg-zinc-50 dark:bg-zinc-950 p-4 border border-zinc-200 dark:border-zinc-800 rounded-xl">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">{detailType === 'servico' ? 'Insumos' : 'CMV'}</span>
                  <div className="text-2xl font-display font-bold text-rose-500 mt-1">{fmtBRL(detailType === 'servico' ? selectedDetailItem.insumos : selectedDetailItem.cmv)}</div>
                </div>
                <div className="bg-zinc-50 dark:bg-zinc-950 p-4 border border-zinc-200 dark:border-zinc-800 rounded-xl">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Resultado Operacional</span>
                  <div className={`text-2xl font-display font-bold mt-1 ${selectedDetailItem.resultado_operacional >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>{fmtBRL(selectedDetailItem.resultado_operacional)}</div>
                </div>
                <div className="bg-zinc-50 dark:bg-zinc-950 p-4 border border-zinc-200 dark:border-zinc-800 rounded-xl col-span-2 md:col-span-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Margem Real</span>
                  <div className="mt-1">
                    <span className={`px-2 py-0.5 rounded text-xs font-bold font-mono ${
                      selectedDetailItem.margem >= (detailType === 'servico' ? 50 : 40)
                        ? 'bg-emerald-50 text-emerald-600 border border-emerald-200'
                        : selectedDetailItem.margem >= (detailType === 'servico' ? 20 : 15)
                        ? 'bg-amber-50 text-amber-600 border border-amber-200'
                        : 'bg-rose-50 text-rose-600 border border-rose-200'
                    }`}>
                      {(selectedDetailItem.margem || 0).toFixed(1)}%
                    </span>
                  </div>
                </div>
              </div>

              {/* Table of Launches */}
              <div className="space-y-2">
                <h3 className="font-display text-sm font-bold uppercase tracking-wider text-zinc-400">Composição dos Lançamentos</h3>
                {detailLaunches.length === 0 ? (
                  <div className="py-12 text-center text-zinc-400 text-sm border border-zinc-200 dark:border-zinc-800 rounded-xl bg-white dark:bg-zinc-900 shadow-sm">
                    Nenhum lançamento encontrado para este item no período.
                  </div>
                ) : (
                  <div className="overflow-x-auto border border-zinc-200 dark:border-zinc-800 rounded-xl max-h-[45vh] overflow-y-auto shadow-sm">
                    <table className="w-full text-xs text-left border-collapse">
                      <thead className="bg-zinc-50 dark:bg-zinc-950 border-b border-zinc-200 dark:border-zinc-800 text-[10px] uppercase font-bold text-zinc-500 tracking-wider">
                        <tr>
                          <th className="px-4 py-3">Data</th>
                          <th className="px-4 py-3">Nº Venda/Agendamento</th>
                          <th className="px-4 py-3 font-medium">Cliente</th>
                          <th className="px-4 py-3 font-medium">Profissional</th>
                          {detailType === 'produto' && <th className="px-4 py-3 text-center">Qtd</th>}
                          <th className="px-4 py-3 text-right">Faturamento</th>
                          <th className="px-4 py-3 text-right">{detailType === 'servico' ? 'Insumos' : 'CMV'}</th>
                          <th className="px-4 py-3 text-right">Comissão</th>
                          <th className="px-4 py-3 text-right">Taxas</th>
                          <th className="px-4 py-3 text-right">Resultado</th>
                          <th className="px-4 py-3 text-center">Margem</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800 font-medium">
                        {detailLaunches.map((launch, idx) => {
                          const l_margem = launch.faturamento > 0 ? ((launch.resultado_operacional / launch.faturamento) * 100) : 0;
                          return (
                            <tr key={idx} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-900/30">
                              <td className="px-4 py-3 whitespace-nowrap text-zinc-500 font-mono">
                                {launch.data ? new Date(launch.data).toLocaleDateString('pt-BR') : '-'}
                              </td>
                              <td className="px-4 py-3 font-semibold text-zinc-800 dark:text-zinc-150">
                                {launch.numero || '-'}
                              </td>
                              <td className="px-4 py-3 text-zinc-700 dark:text-zinc-300 truncate max-w-[120px]" title={launch.cliente}>
                                {launch.cliente}
                              </td>
                              <td className="px-4 py-3 text-zinc-650 dark:text-zinc-350 truncate max-w-[120px]" title={launch.profissional}>
                                {launch.profissional}
                              </td>
                              {detailType === 'produto' && (
                                <td className="px-4 py-3 text-center font-mono font-semibold text-zinc-700 dark:text-zinc-300">
                                  {(launch.quantidade || 0).toLocaleString("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: 3 })}
                                </td>
                              )}
                              <td className="px-4 py-3 text-right font-mono font-semibold text-zinc-800 dark:text-zinc-100">
                                {fmtBRL(launch.faturamento)}
                              </td>
                              <td className="px-4 py-3 text-right font-mono text-rose-500">
                                {fmtBRL(detailType === 'servico' ? launch.insumos : launch.cmv)}
                              </td>
                              <td className="px-4 py-3 text-right font-mono text-amber-600">
                                {fmtBRL(launch.comissao)}
                              </td>
                              <td className="px-4 py-3 text-right font-mono text-amber-700">
                                {fmtBRL(launch.taxas)}
                              </td>
                              <td className={`px-4 py-3 text-right font-mono font-bold ${launch.resultado_operacional >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                                {fmtBRL(launch.resultado_operacional)}
                              </td>
                              <td className="px-4 py-3 text-center font-mono">
                                <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                  l_margem >= (detailType === 'servico' ? 50 : 40)
                                    ? 'bg-emerald-50 text-emerald-600'
                                    : l_margem >= (detailType === 'servico' ? 20 : 15)
                                    ? 'bg-amber-50 text-amber-600'
                                    : 'bg-rose-50 text-rose-600'
                                }`}>
                                  {l_margem.toFixed(1)}%
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          <DialogFooter>
            <Button onClick={() => setRentabilidadeDetailOpen(false)} className="bg-[#84A59D] hover:bg-[#6F9189] text-white text-xs px-4 h-9 rounded-lg">
              Fechar Detalhes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Consumo de Insumo Detail Dialog */}
      <Dialog open={consumoDetailOpen} onOpenChange={setConsumoDetailOpen}>
        <DialogContent className="sm:max-w-4xl md:max-w-5xl lg:max-w-6xl max-h-[90vh] overflow-y-auto w-[96vw] rounded-xl p-6 md:p-8 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-800 dark:text-zinc-100">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl md:text-2xl font-semibold text-[#3A4F4A] dark:text-[#EAF0EE]">
              <Package className="w-6 h-6 text-[#84A59D]" />
              <span>Detalhamento de Consumo: {selectedConsumoItem?.produto_nome}</span>
            </DialogTitle>
            <p className="text-xs sm:text-sm text-zinc-500 mt-1">
              Histórico completo de utilização do insumo no período selecionado.
            </p>
          </DialogHeader>

          {selectedConsumoItem && (
            <div className="space-y-6 my-4">
              {/* Summary Cards */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-zinc-50 dark:bg-zinc-950 p-4 border border-zinc-200 dark:border-zinc-800 rounded-xl">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Quantidade Total</span>
                  <div className="text-2xl font-display font-bold text-zinc-800 dark:text-zinc-100 mt-1">
                    {formatReportQuantidade(selectedConsumoItem.quantidade, selectedConsumoItem)}
                  </div>
                </div>
                <div className="bg-zinc-50 dark:bg-zinc-950 p-4 border border-zinc-200 dark:border-zinc-800 rounded-xl">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Custo Total Consumido</span>
                  <div className="text-2xl font-display font-bold text-orange-500 mt-1">
                    {fmtBRL(selectedConsumoItem.valor_total_custo)}
                  </div>
                </div>
              </div>

              {/* Table of Launches */}
              <div className="space-y-2">
                <h3 className="font-display text-sm font-bold uppercase tracking-wider text-zinc-400">Lançamentos no Período</h3>
                {(selectedConsumoItem.launches || []).length === 0 ? (
                  <div className="py-12 text-center text-zinc-400 text-sm border border-zinc-200 dark:border-zinc-800 rounded-xl bg-white dark:bg-zinc-900 shadow-sm">
                    Nenhum lançamento encontrado para este insumo.
                  </div>
                ) : (
                  <div className="overflow-x-auto border border-zinc-200 dark:border-zinc-800 rounded-xl max-h-[45vh] overflow-y-auto shadow-sm">
                    <table className="w-full text-xs text-left border-collapse">
                      <thead className="bg-zinc-50 dark:bg-zinc-950 border-b border-zinc-200 dark:border-zinc-800 text-[10px] uppercase font-bold text-zinc-500 tracking-wider">
                        <tr>
                          <th className="px-4 py-3">Data</th>
                          <th className="px-4 py-3">Atendimento</th>
                          <th className="px-4 py-3">Serviço</th>
                          <th className="px-4 py-3 text-center">Quantidade Consumida</th>
                          <th className="px-4 py-3 text-right">Valor Unitário</th>
                          <th className="px-4 py-3 text-right">Valor Total</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800 font-medium">
                        {(selectedConsumoItem.launches || []).map((launch, idx) => (
                          <tr key={idx} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-900/30">
                            <td className="px-4 py-3 whitespace-nowrap text-zinc-500 font-mono">
                              {launch.data ? new Date(launch.data).toLocaleString('pt-BR') : '-'}
                            </td>
                            <td className="px-4 py-3 text-zinc-800 dark:text-zinc-150 font-mono">
                              {launch.agendamento_numero ? String(launch.agendamento_numero).padStart(6, '0') + ' | S' : '-'}
                            </td>
                            <td className="px-4 py-3 text-zinc-800 dark:text-zinc-150 font-semibold">
                              {launch.servico_nome || '-'}
                            </td>
                            <td className="px-4 py-3 text-center font-mono text-zinc-700 dark:text-zinc-300">
                              {formatReportQuantidade(launch.quantidade, launch)}
                            </td>
                            <td className="px-4 py-3 text-right font-mono text-zinc-650 dark:text-zinc-350">
                              {fmtBRL(launch.custo_unitario)}
                            </td>
                            <td className="px-4 py-3 text-right font-mono font-bold text-zinc-800 dark:text-zinc-100">
                              {fmtBRL(launch.custo_total || launch.valor_total_custo)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          <DialogFooter>
            <Button onClick={() => setConsumoDetailOpen(false)} className="bg-[#84A59D] hover:bg-[#6F9189] text-white text-xs px-4 h-9 rounded-lg">
              Fechar Detalhes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )}
</div>
);
}

const Row = ({ label, value, bold, negative, highlight }) => (
  <div className={`flex items-center justify-between py-1 ${bold ? "text-base font-semibold" : "text-sm"} ${highlight ? "text-[#3A4F4A] dark:text-[#EAF0EE]" : ""}`}>
    <span className="text-zinc-600 dark:text-zinc-300 font-medium">{label}</span>
    <span className={`font-display ${bold ? "text-xl font-bold" : ""} ${negative ? "text-rose-600 dark:text-rose-400" : "text-zinc-800 dark:text-zinc-150"} ${highlight ? "text-2xl text-[#3A4F4A] dark:text-[#EAF0EE]" : ""}`}>{fmtBRL(value)}</span>
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
    <span className={`font-display ${bold ? "text-xl font-bold" : ""} ${negative ? "text-rose-600 dark:text-rose-400" : "text-zinc-800 dark:text-zinc-150"} ${highlight ? "text-2xl text-[#3A4F4A] dark:text-[#EAF0EE]" : ""}`}>{fmtBRL(value)}</span>
  </div>
);

const HelpSection = ({ title, children }) => (
  <div className="space-y-1.5 pb-4 border-b border-zinc-100 last:border-0 last:pb-0 dark:border-zinc-800">
    <h4 className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider font-display">{title}</h4>
    <div className="text-xs text-zinc-600 dark:text-zinc-350 leading-relaxed space-y-2">{children}</div>
  </div>
);

const renderHelpContent = (reportId) => {
  switch (reportId) {
    case "dre":
      return (
        <div className="space-y-4 py-2 text-zinc-700 dark:text-zinc-300">
          <HelpSection title="Objetivo do Relatório">
            <p>O Demonstrativo de Resultado do Exercício (DRE) apresenta um resumo ordenado das receitas, despesas, custos e encargos tributários/financeiros da empresa em um período de tempo, com o objetivo de apurar o <strong>Lucro Líquido</strong> final.</p>
          </HelpSection>
          <HelpSection title="Quando utilizar">
            <p>Utilize para avaliar a saúde financeira macro do estabelecimento, entender para onde estão indo as despesas e certificar-se de que o preço praticado cobre todos os custos operacionais (fixos e variáveis) com saldo positivo.</p>
          </HelpSection>
          <HelpSection title="Explicação dos Filtros">
            <p><strong>Período (De/Até):</strong> Seleciona os lançamentos efetuados dentro das datas especificadas.</p>
            <p><strong>Categoria:</strong> Filtra despesas operacionais específicas (ex: Água, Aluguel, Luz, etc.).</p>
            <p><strong>Status Financeiro (Competência/Regime):</strong> Escolha entre analisar todas as contas lançadas (Competência), apenas o que já foi recebido/pago (Fluxo de Caixa Realizado), o que está pendente (A Receber/Pagar) ou contas em atraso (Vencido).</p>
          </HelpSection>
          <HelpSection title="Fórmulas Utilizadas">
            <div className="font-mono bg-zinc-50 dark:bg-zinc-950 p-2.5 rounded border border-zinc-150 dark:border-zinc-800 text-[11px] space-y-1">
              <div>• Receita Bruta = Receita Serviços + Receita Vendas Diretas + Outras Receitas</div>
              <div>• Lucro Bruto = Receita Bruta - Custo de Produtos (CMV)</div>
              <div>• Lucro Líquido = Lucro Bruto - Despesas Operacionais (Fixas/Variáveis) - Taxas de Cartão</div>
            </div>
          </HelpSection>
          <HelpSection title="Regras de Negócio">
            <p>As despesas e receitas são provisionadas no regime de competência por padrão, refletindo a data do fato gerador. O CMV (Custo de Mercadoria Vendida) é deduzido a partir da venda física dos itens cadastrados no estoque.</p>
          </HelpSection>
          <HelpSection title="Exemplo Prático">
            <p>Se o salão faturou R$ 15.000 em serviços e R$ 5.000 em vendas de produtos (CMV de R$ 2.000), o Lucro Bruto é de R$ 18.000. Deduzindo R$ 6.000 de despesas operacionais e R$ 500 em taxas, o Lucro Líquido da DRE será de R$ 11.500.</p>
          </HelpSection>
        </div>
      );
    case "caixa":
      return (
        <div className="space-y-4 py-2 text-zinc-700 dark:text-zinc-300">
          <HelpSection title="Objetivo do Relatório">
            <p>O relatório de Caixa apresenta o fluxo de caixa consolidado e detalhado por profissional, agrupando as entradas financeiras conforme as formas de pagamento utilizadas pelos clientes no período.</p>
          </HelpSection>
          <HelpSection title="Quando utilizar">
            <p>Essencial para a conciliação diária de valores em caixa (fechamento de caixa) e conferência de repasses financeiros recebidos por meios digitais (PIX, Cartão de Crédito/Débito).</p>
          </HelpSection>
          <HelpSection title="Explicação dos Filtros">
            <p><strong>Período (De/Até):</strong> Data exata da baixa/pagamento.</p>
            <p><strong>Profissional:</strong> Filtra as formas de recebimento e montantes associados aos atendimentos executados por um profissional específico.</p>
          </HelpSection>
          <HelpSection title="Colunas e Campos Exibidos">
            <p><strong>Forma de Pagamento:</strong> Modalidade do recebimento (Dinheiro, PIX, Cartão de Crédito/Débito).</p>
            <p><strong>Total Recebido:</strong> Montante bruto recebido por aquela modalidade.</p>
            <p><strong>Quantidade de Lançamentos:</strong> Número de comandas/transações pagas usando essa forma.</p>
          </HelpSection>
          <HelpSection title="Regras de Negócio">
            <p>Exibe exclusivamente pagamentos efetivados e conciliados. Caso uma comanda possua múltiplas formas de pagamento, o valor é fracionado e contabilizado respectivamente em cada categoria.</p>
          </HelpSection>
          <HelpSection title="Exemplo Prático">
            <p>Para fechar o caixa físico no fim do dia: filtre pelo dia atual e confira o valor exibido na linha <strong>"Dinheiro"</strong> com o montante em cédulas na gaveta.</p>
          </HelpSection>
        </div>
      );
    case "produtos":
      return (
        <div className="space-y-4 py-2 text-zinc-700 dark:text-zinc-300">
          <HelpSection title="Objetivo do Relatório">
            <p>Apresentar o volume de vendas de produtos físicos de varejo, detalhando faturamento bruto, custos de reposição (CMV) e lucro bruto por produto comercializado.</p>
          </HelpSection>
          <HelpSection title="Quando utilizar">
            <p>Utilize para acompanhar a performance de vendas de produtos, monitorar o giro de estoque do estabelecimento e identificar os produtos mais lucrativos ou mais vendidos.</p>
          </HelpSection>
          <HelpSection title="Explicação dos Filtros">
            <p><strong>Colaborador:</strong> Filtra as vendas realizadas por determinado atendente/vendedor.</p>
            <p><strong>Produto / Categoria:</strong> Filtra as vendas de um item específico ou de uma categoria de produtos.</p>
            <p><strong>Forma de Pagamento / Cliente / Status:</strong> Permite isolar vendas pagas com certa modalidade, adquiridas por um cliente específico ou com determinado status (pago/pendente).</p>
          </HelpSection>
          <HelpSection title="Colunas e Campos Exibidos">
            <p><strong>Produto:</strong> Nome comercial do item.</p>
            <p><strong>Qtd:</strong> Quantidade física vendida (pode expressar frações dependendo da unidade de medida).</p>
            <p><strong>Faturamento:</strong> Receita bruta gerada pelas vendas daquele produto.</p>
            <p><strong>Custo Total (CMV):</strong> Custo total de aquisição/estoque das mercadorias vendidas.</p>
            <p><strong>Lucro Bruto:</strong> Faturamento - Custo Total.</p>
            <p><strong>Margem (%):</strong> Percentual de retorno obtido sobre o preço de venda.</p>
          </HelpSection>
          <HelpSection title="Fórmulas Utilizadas">
            <div className="font-mono bg-zinc-50 dark:bg-zinc-950 p-2.5 rounded border border-zinc-150 dark:border-zinc-800 text-[11px] space-y-1">
              <div>• Custo Total (CMV) = Quantidade Vendida × Custo de Compra Unitário</div>
              <div>• Lucro Bruto = Faturamento - Custo Total (CMV)</div>
              <div>• Margem (%) = (Lucro Bruto / Faturamento) × 100</div>
            </div>
          </HelpSection>
        </div>
      );
    case "servicos":
      return (
        <div className="space-y-4 py-2 text-zinc-700 dark:text-zinc-300">
          <HelpSection title="Objetivo do Relatório">
            <p>Analisar o volume de execução dos serviços prestados pelo estabelecimento, avaliando o faturamento total, ticket médio e tempo total consumido da agenda.</p>
          </HelpSection>
          <HelpSection title="Quando utilizar">
            <p>Para identificar quais serviços são os carros-chefes do salão, mensurar a produtividade de tempo da equipe e analisar o valor médio cobrado por procedimento.</p>
          </HelpSection>
          <HelpSection title="Explicação dos Filtros">
            <p><strong>Profissional:</strong> Filtra serviços realizados por um profissional específico.</p>
            <p><strong>Serviço:</strong> Isola a análise para um procedimento específico.</p>
            <p><strong>Status:</strong> Permite filtrar apenas serviços concluídos, agendados ou cancelados.</p>
          </HelpSection>
          <HelpSection title="Colunas e Campos Exibidos">
            <p><strong>Qtd:</strong> Quantidade de execuções finalizadas.</p>
            <p><strong>Faturamento:</strong> Receita bruta total gerada por aquele serviço.</p>
            <p><strong>Ticket Médio:</strong> Valor médio por atendimento (Faturamento / Qtd).</p>
            <p><strong>Duração Média:</strong> Tempo médio configurado na ficha do serviço para cada execução (em minutos).</p>
            <p><strong>Tempo Total:</strong> Soma de todas as horas dedicadas a este serviço.</p>
          </HelpSection>
        </div>
      );
    case "resultado_consolidado":
      return (
        <div className="space-y-4 py-2 text-zinc-700 dark:text-zinc-300">
          <HelpSection title="Objetivo do Relatório">
            <p>O relatório de Resultado Consolidado apresenta uma visão clara e unificada do resultado financeiro operacional direto, englobando todas as receitas obtidas com produtos e serviços frente aos custos de CMV, comissões de profissionais e taxas de cartão.</p>
          </HelpSection>
          <HelpSection title="Quando utilizar">
            <p>Essencial para apurar a rentabilidade da operação do salão (DRE operacional ou de contribuição) antes da dedução das despesas administrativas ou custos fixos.</p>
          </HelpSection>
          <HelpSection title="Definição dos Indicadores">
            <p><strong>Faturamento Total:</strong> Soma de todas as receitas de serviços prestados e produtos vendidos.</p>
            <p><strong>CMV (Custo de Mercadoria Vendida):</strong> Custo de aquisição do estoque de produtos vendidos mais o valor proporcional de insumos consumidos nos serviços executados.</p>
            <p><strong>Comissões:</strong> Montante devido aos profissionais parceiros como comissão direta de atendimentos e vendas.</p>
            <p><strong>Taxas Financeiras:</strong> Custos de intermediação cobrados pelas credenciadoras de cartão (Crédito, Débito, PIX, etc.).</p>
            <p><strong>Resultado Operacional:</strong> Faturamento total restante após deduzidos CMV, Comissões e Taxas.</p>
            <p><strong>Margem Operacional:</strong> Percentual de lucratividade líquida da operação (Resultado Operacional dividido pelo Faturamento).</p>
          </HelpSection>
          <HelpSection title="Fórmulas Utilizadas">
            <div className="font-mono bg-zinc-50 dark:bg-zinc-950 p-2.5 rounded border border-zinc-150 dark:border-zinc-800 text-[11px] space-y-1">
              <div>• Faturamento Total = Receita Serviços + Receita Produtos</div>
              <div>• Resultado Operacional = Faturamento - CMV - Comissões - Taxas de Cartão</div>
              <div>• Margem Operacional = (Resultado Operacional / Faturamento Total) × 100</div>
            </div>
          </HelpSection>
          <HelpSection title="Exemplo Prático">
            <p>Se a sua receita total foi R$ 10.000, o CMV de estoque foi R$ 1.500, as comissões pagas aos colaboradores somaram R$ 4.000, e as taxas de cartão foram R$ 300: o seu Resultado Operacional é de R$ 4.200, representando uma Margem Operacional de 42%.</p>
          </HelpSection>
        </div>
      );
    case "rentabilidade_servicos":
      return (
        <div className="space-y-4 py-2 text-zinc-700 dark:text-zinc-300">
          <HelpSection title="Objetivo do Relatório">
            <p>Apresentar a rentabilidade líquida individual de cada tipo de serviço oferecido, permitindo avaliar quais procedimentos geram maior margem de lucro após as deduções diretas.</p>
          </HelpSection>
          <HelpSection title="Quando utilizar">
            <p>Utilize para revisar a precificação de serviços, planejar descontos ou campanhas de marketing baseadas em margem real, e entender os custos diretos de execução de cada item.</p>
          </HelpSection>
          <HelpSection title="Fórmulas e Rateios">
            <div className="font-mono bg-zinc-50 dark:bg-zinc-950 p-2.5 rounded border border-zinc-150 dark:border-zinc-800 text-[11px] space-y-1">
              <div>• Resultado = Faturamento - Insumos - Comissões - Taxas</div>
              <div>• Margem (%) = (Resultado / Faturamento) × 100</div>
            </div>
            <p className="mt-2"><strong>Insumos:</strong> Custos de produtos utilizados na lavagem, tintura, hidratação, etc. associados à ficha técnica do serviço.</p>
            <p><strong>Taxas:</strong> As taxas financeiras de cartão de crédito/débito são proporcionalizadas em percentual médio conforme a forma de pagamento do atendimento.</p>
          </HelpSection>
          <HelpSection title="Exemplo Prático de Interpretação">
            <p>Se o serviço "Tintura" gera R$ 3.000 de faturamento, deduz R$ 500 de insumos, R$ 1.200 de comissões e R$ 100 de taxas: o resultado gerado é de R$ 1.200 (Margem de 40%). Se "Corte de Cabelo" não consome insumos e possui margem de 55%, este último é individualmente mais lucrativo por atendimento.</p>
          </HelpSection>
        </div>
      );
    case "rentabilidade_produtos":
      return (
        <div className="space-y-4 py-2 text-zinc-700 dark:text-zinc-300">
          <HelpSection title="Objetivo do Relatório">
            <p>O relatório de Rentabilidade de Produtos analisa a lucratividade individual dos produtos físicos vendidos diretamente aos clientes, abatendo o CMV, a comissão de vendas e as taxas de transação.</p>
          </HelpSection>
          <HelpSection title="Quando utilizar">
            <p>Utilize para identificar produtos que possuem margens de lucro muito baixas ou negativas (possivelmente por custo de aquisição elevado ou precificação incorreta) e negociar melhores preços com fornecedores.</p>
          </HelpSection>
          <HelpSection title="Fórmulas Utilizadas">
            <div className="font-mono bg-zinc-50 dark:bg-zinc-950 p-2.5 rounded border border-zinc-150 dark:border-zinc-800 text-[11px] space-y-1">
              <div>• Resultado = Faturamento - CMV - Comissões - Taxas</div>
              <div>• Margem (%) = (Resultado / Faturamento) × 100</div>
            </div>
            <p className="mt-2"><strong>CMV:</strong> O custo de aquisição do lote do produto baixado no estoque ao registrar a venda.</p>
          </HelpSection>
          <HelpSection title="Como Interpretar">
            <p>Foque nos produtos com maior volume de venda (Qtd) e maior Margem (%). Itens com alta quantidade mas baixíssima margem geram esforço operacional, mas pouco retorno financeiro efetivo.</p>
          </HelpSection>
        </div>
      );
    case "analitico_vendas":
      return (
        <div className="space-y-4 py-2 text-zinc-700 dark:text-zinc-300">
          <HelpSection title="Objetivo do Relatório">
            <p>Fornecer uma listagem analítica transacional de todas as vendas e atendimentos do período, detalhando cada comanda com a respectiva receita, custos, comissões de equipe, taxas bancárias e margem de cada transação.</p>
          </HelpSection>
          <HelpSection title="Quando utilizar">
            <p>Utilize para auditorias detalhadas, conferência de divergências em fechamentos de caixa ou para analisar comandas específicas de clientes.</p>
          </HelpSection>
          <HelpSection title="Significado das Colunas">
            <p><strong>Venda:</strong> Código ou número sequencial identificador da comanda.</p>
            <p><strong>Valor Prod / Serv:</strong> Segmentação do faturamento da venda.</p>
            <p><strong>CMV / Comissão / Taxas:</strong> Descontos diretos associados especificamente a esta comanda.</p>
            <p><strong>Resultado / Margem:</strong> Lucro operacional e eficiência percentual daquela transação individual.</p>
          </HelpSection>
          <HelpSection title="Distribuição das Taxas">
            <p>As taxas financeiras bancárias são calculadas proporcionalmente aos itens da venda a partir da forma de pagamento registrada na baixa da comanda (de acordo com a tabela de taxas de cartão cadastradas no sistema).</p>
          </HelpSection>
          <HelpSection title="Fórmula do Resultado por Venda">
            <div className="font-mono bg-zinc-50 dark:bg-zinc-950 p-2.5 rounded border border-zinc-150 dark:border-zinc-800 text-[11px] space-y-1">
              <div>• Faturamento Venda = Valor Produtos + Valor Serviços</div>
              <div>• Resultado Venda = Faturamento - CMV - Comissão - Taxas Bancárias</div>
            </div>
          </HelpSection>
        </div>
      );
    case "estoque_atual":
      return (
        <div className="space-y-4 py-2 text-zinc-700 dark:text-zinc-300">
          <HelpSection title="Objetivo do Relatório">
            <p>Apresentar a quantidade física atual de cada produto em estoque, comparando-a com o limite mínimo e calculando o valor total sob preço de custo e venda potencial.</p>
          </HelpSection>
          <HelpSection title="Campos Exibidos">
            <p><strong>Quantidade em Estoque:</strong> Quantidade atual em estoque físico.</p>
            <p><strong>Estoque Mínimo:</strong> Quantidade mínima recomendada para evitar a ruptura.</p>
            <p><strong>Custo Unitário / Total:</strong> Custo médio de aquisição do item.</p>
            <p><strong>Preço Venda / Venda Total:</strong> Valor esperado de venda e faturamento bruto total potencial.</p>
          </HelpSection>
        </div>
      );
    case "estoque_movimentacao":
      return (
        <div className="space-y-4 py-2 text-zinc-700 dark:text-zinc-300">
          <HelpSection title="Objetivo do Relatório">
            <p>Rastrear todo o fluxo de entrada, saída e ajuste de estoque físico, garantindo auditoria de qual usuário executou cada movimentação.</p>
          </HelpSection>
          <HelpSection title="Auditoria e Rastreabilidade">
            <p>Este relatório exibe o nome e ID do usuário que autorizou ou gerou a movimentação (ex: vendas automáticas, ajustes manuais ou entradas de fornecedores).</p>
          </HelpSection>
        </div>
      );
    case "estoque_abaixo_minimo":
      return (
        <div className="space-y-4 py-2 text-zinc-700 dark:text-zinc-300">
          <HelpSection title="Objetivo do Relatório">
            <p>Identificar itens com risco de desabastecimento, permitindo planejar compras de reposição antes de interromper serviços ou vendas.</p>
          </HelpSection>
        </div>
      );
    case "estoque_sem_estoque":
      return (
        <div className="space-y-4 py-2 text-zinc-700 dark:text-zinc-300">
          <HelpSection title="Objetivo do Relatório">
            <p>Apresentar a lista de todos os produtos com saldo igual ou inferior a zero no inventário atual.</p>
          </HelpSection>
        </div>
      );
    case "estoque_valorizacao":
      return (
        <div className="space-y-4 py-2 text-zinc-700 dark:text-zinc-300">
          <HelpSection title="Objetivo do Relatório">
            <p>Valorizar financeiramente o estoque com base no custo de aquisição atual, preço de venda de varejo e margem de lucro potencial.</p>
          </HelpSection>
        </div>
      );
    case "estoque_consumo_insumos":
      return (
        <div className="space-y-4 py-2 text-zinc-700 dark:text-zinc-300">
          <HelpSection title="Objetivo do Relatório">
            <p>Apresentar o consumo físico e financeiro de insumos e materiais de uso interno aplicados pelos colaboradores durante a prestação de serviços no período.</p>
          </HelpSection>
        </div>
      );
    case "estoque_mais_movimentados":
      return (
        <div className="space-y-4 py-2 text-zinc-700 dark:text-zinc-300">
          <HelpSection title="Objetivo do Relatório">
            <p>Classificar os produtos de maior giro, destacando o fluxo total (soma de entradas e saídas) para identificar gargalos de logística.</p>
          </HelpSection>
        </div>
      );
    case "estoque_sem_movimentacao":
      return (
        <div className="space-y-4 py-2 text-zinc-700 dark:text-zinc-300">
          <HelpSection title="Objetivo do Relatório">
            <p>Identificar o chamado "estoque parado" ou sem giro no período, que imobiliza capital e corre risco de perda por validade ou depreciação.</p>
          </HelpSection>
        </div>
      );
    case "estoque_historico_ajustes":
      return (
        <div className="space-y-4 py-2 text-zinc-700 dark:text-zinc-300">
          <HelpSection title="Objetivo do Relatório">
            <p>Auditar todas as correções manuais de estoque realizadas no painel administrativo, registrando o usuário, a variação da quantidade e o motivo justificado.</p>
          </HelpSection>
        </div>
      );
    case "estoque_inventario":
      return (
        <div className="space-y-4 py-2 text-zinc-700 dark:text-zinc-300">
          <HelpSection title="Objetivo do Relatório">
            <p>Fornecer uma folha de apoio ou lista digital para que o gerente de estoque faça a conferência física e identifique quebras ou desvios.</p>
          </HelpSection>
        </div>
      );
    case "estoque_perdas_quebras":
      return (
        <div className="space-y-4 py-2 text-zinc-700 dark:text-zinc-300">
          <HelpSection title="Objetivo do Relatório">
            <p>Consolidar e quantificar financeiramente as saídas de estoque justificadas como perdas, quebras, desperdício ou roubo no período.</p>
          </HelpSection>
        </div>
      );
    default:
      return <p className="text-xs text-zinc-500">Nenhuma documentação disponível para este relatório.</p>;
  }
};
