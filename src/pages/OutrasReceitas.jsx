import React, { useEffect, useState } from "react";
import http from "../api";
import { PageHeader } from "../components/Page";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "../components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "../components/ui/dialog";
import { Tabs, TabsList, TabsTrigger } from "../components/ui/tabs";
import { 
  Plus, Trash2, Edit2, AlertCircle, History, Check, DollarSign, 
  Calendar, Filter, FileText, Ban, RefreshCw, X, AlertTriangle, Clock, CreditCard
} from "lucide-react";
import { toast } from "sonner";
import AuditModal from "../components/AuditModal";

const fmtBRL = (n) => (n || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const fmtDT = (s) => s ? new Date(s + 'T12:00:00').toLocaleDateString("pt-BR") : "-";

const CATEGORIAS = [
  "Juros",
  "Multas",
  "Devoluções",
  "Bônus",
  "Reembolsos",
  "Aluguel de espaço",
  "Venda de ativos",
  "Investimentos",
  "Outros"
];

const FORMAS_PAGAMENTO = [
  "Pix",
  "Dinheiro",
  "Cartão de Crédito",
  "Cartão de Débito",
  "Transferência",
  "Outro"
];

// Helper to get local date string YYYY-MM-DD
const getTodayDateString = () => {
  return new Date().toLocaleDateString('en-CA');
};

const getFirstDayOfMonthString = () => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}-01`;
};

export default function OutrasReceitas() {
  const [receitas, setReceitas] = useState([]);
  const [clientesList, setClientesList] = useState([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [revertConfirmOpen, setRevertConfirmOpen] = useState(false);
  const [writeOffOpen, setWriteOffOpen] = useState(false);
  
  const [deletingId, setDeletingId] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [revertId, setRevertId] = useState(null);
  const [writeOffReceita, setWriteOffReceita] = useState(null);

  const [tab, setTab] = useState("a_receber"); // a_receber, recebidas, relatorios
  const [auditOpen, setAuditOpen] = useState(false);
  
  // Write-off form state
  const [writeOffDate, setWriteOffDate] = useState(getTodayDateString());
  const [writeOffPaymentMethod, setWriteOffPaymentMethod] = useState("Pix");

  // Search & filters for main table listing
  const [filterSearch, setFilterSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState("todos");
  const [filterStatus, setFilterStatus] = useState("todos");
  const [filterMonth, setFilterMonth] = useState("todos");

  const monthOptions = React.useMemo(() => {
    const months = [];
    const today = new Date();
    months.push({ value: "todos", label: "Todos os Períodos" });
    for (let i = 0; i < 12; i++) {
      const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
      const monthNum = String(d.getMonth() + 1).padStart(2, '0');
      const year = d.getFullYear();
      const monthLabel = d.toLocaleString('pt-BR', { month: 'long' });
      const capitalizedLabel = monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1);
      months.push({
        value: `${year}-${monthNum}`,
        label: `${capitalizedLabel} de ${year}`
      });
    }
    return months;
  }, []);

  // Report Date Filter States
  const [repFrom, setRepFrom] = useState(getFirstDayOfMonthString());
  const [repTo, setRepTo] = useState(getTodayDateString());

  const [form, setForm] = useState({
    descricao: "",
    valor: "",
    categoria: "",
    status: "Aberto",
    numero_documento: "",
    cliente: "",
    data_documento: "",
    data_vencimento: "",
    data_recebimento: "",
    recebido: false,
    forma_pagamento: "",
    observacoes: ""
  });

  const load = () => {
    http.get("/outras-receitas")
      .then((r) => setReceitas(r.data))
      .catch(() => setReceitas([]));
  };

  const loadClientes = () => {
    http.get("/clientes")
      .then((r) => setClientesList(r.data))
      .catch(() => setClientesList([]));
  };

  useEffect(() => { 
    load(); 
    loadClientes();
  }, []);

  const resetForm = () => {
    setForm({
      descricao: "",
      valor: "",
      categoria: "",
      status: "Aberto",
      numero_documento: "",
      cliente: "",
      data_documento: "",
      data_vencimento: "",
      data_recebimento: "",
      recebido: false,
      forma_pagamento: "",
      observacoes: ""
    });
    setEditingId(null);
  };

  const openDialog = (receita = null) => {
    loadClientes();
    if (receita) {
      setForm({
        ...receita,
        data_documento: receita.data_documento || "",
        numero_documento: receita.numero_documento || "",
        cliente: receita.cliente || "",
        status: receita.status || (receita.recebido ? "Recebido" : "Aberto"),
        data_vencimento: receita.data_vencimento || "",
        data_recebimento: receita.data_recebimento || "",
        forma_pagamento: receita.forma_pagamento || "",
        observacoes: receita.observacoes || ""
      });
      setEditingId(receita.id);
    } else {
      resetForm();
    }
    setDialogOpen(true);
  };

  const save = async () => {
    if (!form.descricao.trim()) {
      toast.error("Descrição obrigatória");
      return;
    }
    
    const valorStr = String(form.valor).replace(",", ".");
    const valorNum = parseFloat(valorStr);
    
    if (isNaN(valorNum) || valorNum <= 0) {
      toast.error("Valor deve ser maior que zero");
      return;
    }

    const payload = {
      ...form,
      valor: valorNum,
      recebido: form.status === "Recebido"
    };

    try {
      if (editingId) {
        await http.put(`/outras-receitas/${editingId}`, payload);
        toast.success("Receita atualizada com sucesso");
      } else {
        await http.post("/outras-receitas", payload);
        toast.success("Receita criada com sucesso");
      }
      setDialogOpen(false);
      resetForm();
      load();
    } catch (e) {
      toast.error(e.response?.data?.detail || "Erro ao salvar receita");
    }
  };

  const triggerRevertWriteOff = (id) => {
    setRevertId(id);
    setRevertConfirmOpen(true);
  };

  const handleRevertWriteOff = async () => {
    if (!revertId) return;
    try {
      await http.put(`/outras-receitas/${revertId}`, { recebido: false, status: "Aberto" });
      toast.success("Recebimento estornado com sucesso");
      setRevertConfirmOpen(false);
      setRevertId(null);
      setDialogOpen(false);
      resetForm();
      load();
    } catch (e) {
      toast.error(e.response?.data?.detail || "Erro ao estornar recebimento");
    }
  };

  const deleteReceita = (id, isReceived) => {
    if (isReceived) {
      toast.error("Não é possível excluir uma receita já recebida. Estorne a baixa primeiro.");
      return;
    }
    setDeletingId(id);
    setDeleteConfirmOpen(true);
  };

  const confirmDelete = async () => {
    if (!deletingId) return;
    try {
      await http.delete(`/outras-receitas/${deletingId}`);
      toast.success("Receita enviada para a lixeira");
      setDeleteConfirmOpen(false);
      setDeletingId(null);
      load();
    } catch (e) {
      toast.error(e.response?.data?.detail || "Erro ao excluir receita");
    }
  };

  const openWriteOffDialog = (receita) => {
    setWriteOffReceita(receita);
    setWriteOffDate(getTodayDateString());
    setWriteOffPaymentMethod("Pix");
    setWriteOffOpen(true);
  };

  const confirmWriteOff = async () => {
    if (!writeOffReceita) return;
    try {
      const payload = {
        recebido: true,
        status: "Recebido",
        data_recebimento: writeOffDate,
        forma_pagamento: writeOffPaymentMethod
      };
      await http.put(`/outras-receitas/${writeOffReceita.id}`, payload);
      toast.success("Baixa de recebimento efetuada");
      setWriteOffOpen(false);
      setWriteOffReceita(null);
      load();
    } catch (e) {
      toast.error(e.response?.data?.detail || "Erro ao efetuar baixa de recebimento");
    }
  };

  // Date filters helper presets for Reports tab
  const handlePeriodPreset = (preset) => {
    const today = new Date();
    const toStr = today.toISOString().split("T")[0];
    const fromDate = new Date();
    
    if (preset === 'month') {
      setRepFrom(getFirstDayOfMonthString());
      setRepTo(toStr);
    } else if (preset === 0) {
      setRepFrom(toStr);
      setRepTo(toStr);
    } else {
      fromDate.setDate(today.getDate() - preset);
      const fromStr = fromDate.toISOString().split("T")[0];
      setRepFrom(fromStr);
      setRepTo(toStr);
    }
  };

  // Dynamically partition datasets based on current status and tabs
  const todayStr = getTodayDateString();
  
  // Status check filters on raw list
  const visibleReceitas = receitas.filter(r => {
    // 1. Text Search matching description, client, document
    if (filterSearch.trim()) {
      const term = filterSearch.toLowerCase();
      const matchDesc = r.descricao?.toLowerCase().includes(term);
      const matchClient = r.cliente?.toLowerCase().includes(term);
      const matchDoc = r.numero_documento?.toLowerCase().includes(term);
      if (!matchDesc && !matchClient && !matchDoc) return false;
    }
    // 2. Category matching
    if (filterCategory !== "todos" && r.categoria !== filterCategory) return false;
    // 2.5 Month matching
    if (filterMonth !== "todos") {
      const targetDate = (r.recebido || r.status === "Recebido")
        ? (r.data_recebimento || r.data_vencimento || r.data_documento)
        : (r.data_vencimento || r.data_documento);
      if (!targetDate || !targetDate.startsWith(filterMonth)) return false;
    }
    // 3. Status matching
    if (filterStatus !== "todos") {
      const currentStatus = (r.status === "Aberto" && !r.recebido && r.data_vencimento && r.data_vencimento < todayStr) ? "Vencido" : r.status;
      if (currentStatus !== filterStatus) return false;
    }
    return true;
  });

  // Split visible list between Aberto/Parcial/Vencido (A Receber) and Recebido/Cancelado (Recebidas)
  const aReceberList = visibleReceitas.filter(r => r.status !== "Recebido" && !r.recebido && r.status !== "Cancelado");
  const recebidasList = visibleReceitas.filter(r => r.status === "Recebido" || r.recebido || r.status === "Cancelado");

  // Calculations for KPI metric cards
  const totalReceitas = visibleReceitas.reduce((sum, r) => sum + (r.valor || 0), 0);
  const totalRecebidas = visibleReceitas.filter(r => r.recebido || r.status === "Recebido").reduce((sum, r) => sum + (r.valor || 0), 0);
  const totalAberto = visibleReceitas.filter(r => !r.recebido && r.status !== "Recebido" && r.status !== "Cancelado" && !(r.data_vencimento && r.data_vencimento < todayStr)).reduce((sum, r) => sum + (r.valor || 0), 0);
  const totalVencido = visibleReceitas.filter(r => !r.recebido && r.status !== "Recebido" && r.status !== "Cancelado" && (r.data_vencimento && r.data_vencimento < todayStr)).reduce((sum, r) => sum + (r.valor || 0), 0);

  // Partitioned datasets strictly inside Selected Date Range for Reports Tab
  const repFiltered = receitas.filter(r => {
    const targetDate = (r.recebido || r.status === "Recebido")
      ? (r.data_recebimento || r.data_vencimento || r.data_documento || getTodayDateString())
      : (r.data_vencimento || r.data_documento || getTodayDateString());
    return targetDate >= repFrom && targetDate <= repTo;
  });

  const repPaidExpenses = repFiltered.filter(r => r.recebido || r.status === "Recebido");
  const repOpenExpenses = repFiltered.filter(r => !r.recebido && r.status !== "Recebido" && r.status !== "Cancelado");

  const repPaidVal = repPaidExpenses.reduce((sum, r) => sum + (r.valor || 0), 0);
  const repOpenVal = repOpenExpenses.reduce((sum, r) => sum + (r.valor || 0), 0);

  // Group by category calculations for analytics progress bars
  const categoryChartData = CATEGORIAS.map(catName => {
    const totalCat = repFiltered.filter(r => r.categoria === catName).reduce((sum, r) => sum + (r.valor || 0), 0);
    return { name: catName, value: totalCat };
  }).filter(item => item.value > 0).sort((a, b) => b.value - a.value);

  const totalPeriodRevenue = repFiltered.reduce((sum, r) => sum + (r.valor || 0), 0);

  return (
    <div className="p-4 sm:p-6 lg:p-8 fade-in min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-800 dark:text-zinc-200">
      <PageHeader 
        overline="Financeiro" 
        title="Contas a Receber (Receitas)" 
        action={
          <Button onClick={() => openDialog()} className="bg-[#84A59D] hover:bg-[#6F9189] text-white shadow-sm flex items-center gap-1.5 rounded-lg font-semibold">
            <Plus className="w-4 h-4 mr-0.5" /> Nova receita
          </Button>
        } 
      />

      {/* Main Tabs Selection */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <Tabs value={tab} onValueChange={setTab} className="w-full sm:w-auto">
          <TabsList className="bg-zinc-200 dark:bg-zinc-900 p-1 rounded-lg">
            <TabsTrigger value="a_receber" className="rounded-md font-medium text-xs px-4 py-2">A Receber</TabsTrigger>
            <TabsTrigger value="recebidas" className="rounded-md font-medium text-xs px-4 py-2">Recebidas</TabsTrigger>
            <TabsTrigger value="relatorios" className="rounded-md font-medium text-xs px-4 py-2 flex items-center gap-1">
              <FileText className="w-3.5 h-3.5" /> Relatórios
            </TabsTrigger>
          </TabsList>
        </Tabs>
        
        <Button 
          variant="outline" 
          onClick={() => setAuditOpen(true)}
          className="flex items-center gap-1.5 text-xs font-semibold text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200 border border-zinc-250 dark:border-zinc-800 rounded-lg"
        >
          <History className="w-3.5 h-3.5" />
          <span>Restaurar Excluídas</span>
        </Button>
      </div>

      {tab !== "relatorios" && (
        <>
          {/* Main Search & Interactive Filters Bar */}
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 mb-6 shadow-sm flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <Label className="text-[10px] uppercase font-bold text-zinc-400 dark:text-zinc-500 tracking-wider">Buscar por Texto</Label>
              <div className="relative mt-1">
                <input
                  type="text"
                  value={filterSearch}
                  onChange={(e) => setFilterSearch(e.target.value)}
                  placeholder="Pesquisar por descrição, cliente ou documento..."
                  className="w-full h-10 px-3 bg-zinc-50 dark:bg-zinc-950 border border-zinc-250 dark:border-zinc-800 rounded-lg text-sm outline-none focus:border-[#84A59D] transition-colors"
                />
                {filterSearch && (
                  <button onClick={() => setFilterSearch("")} className="absolute right-3 top-3 text-zinc-400 hover:text-zinc-600">
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            <div className="w-full md:w-40">
              <Label className="text-[10px] uppercase font-bold text-zinc-400 dark:text-zinc-500 tracking-wider">Mês / Ano</Label>
              <div className="mt-1">
                <Select value={filterMonth} onValueChange={setFilterMonth}>
                  <SelectTrigger className="h-10 text-xs bg-zinc-50 dark:bg-zinc-950 border-zinc-250 dark:border-zinc-800 rounded-lg">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-800 dark:text-zinc-150">
                    {monthOptions.map((m) => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="w-full md:w-40">
              <Label className="text-[10px] uppercase font-bold text-zinc-400 dark:text-zinc-500 tracking-wider">Categoria</Label>
              <div className="mt-1">
                <Select value={filterCategory} onValueChange={setFilterCategory}>
                  <SelectTrigger className="h-10 text-xs bg-zinc-50 dark:bg-zinc-950 border-zinc-250 dark:border-zinc-800 rounded-lg">
                    <SelectValue placeholder="Todas" />
                  </SelectTrigger>
                  <SelectContent className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-800 dark:text-zinc-150">
                    <SelectItem value="todos">Todas as Categorias</SelectItem>
                    {CATEGORIAS.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="w-full md:w-36">
              <Label className="text-[10px] uppercase font-bold text-zinc-400 dark:text-zinc-500 tracking-wider">Status</Label>
              <div className="mt-1">
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger className="h-10 text-xs bg-zinc-50 dark:bg-zinc-950 border-zinc-250 dark:border-zinc-800 rounded-lg">
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-800 dark:text-zinc-150">
                    <SelectItem value="todos">Todos os Status</SelectItem>
                    <SelectItem value="Aberto">Em Aberto</SelectItem>
                    <SelectItem value="Recebido">Recebido</SelectItem>
                    <SelectItem value="Vencido">Vencido</SelectItem>
                    <SelectItem value="Cancelado">Cancelado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Quick Metrics Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 shadow-sm">
              <div className="text-xs font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">Total Geral</div>
              <div className="font-display text-2xl font-bold mt-1.5 text-zinc-900 dark:text-zinc-50">{fmtBRL(totalReceitas)}</div>
            </div>
            
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 shadow-sm border-l-4 border-l-emerald-500">
              <div className="text-xs font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">Recebido</div>
              <div className="font-display text-2xl font-bold mt-1.5 text-emerald-600 dark:text-emerald-500">{fmtBRL(totalRecebidas)}</div>
            </div>

            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 shadow-sm border-l-4 border-l-amber-500">
              <div className="text-xs font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">Em Aberto</div>
              <div className="font-display text-2xl font-bold mt-1.5 text-amber-600 dark:text-amber-500">{fmtBRL(totalAberto)}</div>
            </div>

            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 shadow-sm border-l-4 border-l-rose-500">
              <div className="text-xs font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">Vencido</div>
              <div className="font-display text-2xl font-bold mt-1.5 text-rose-600 dark:text-rose-500">{fmtBRL(totalVencido)}</div>
            </div>
          </div>

          {/* Table list representation */}
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-sm overflow-x-auto">
            {((tab === "a_receber" ? aReceberList : recebidasList).length === 0) ? (
              <div className="p-16 text-center text-zinc-400 dark:text-zinc-500">
                <AlertCircle className="w-10 h-10 mx-auto mb-3 opacity-40 text-zinc-400" />
                <p className="text-sm font-semibold">Nenhuma receita encontrada</p>
                <p className="text-xs mt-1">Experimente alterar os filtros ou cadastrar um novo título.</p>
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-zinc-50 dark:bg-zinc-900/50 text-xs uppercase tracking-wider font-semibold text-zinc-500 dark:text-zinc-400 border-b border-zinc-250 dark:border-zinc-800">
                  <tr>
                    <th className="px-4 py-3 text-left">Documento / Descrição</th>
                    <th className="px-4 py-3 text-left">Cliente</th>
                    <th className="px-4 py-3 text-left">Categoria</th>
                    <th className="px-4 py-3 text-right">Valor</th>
                    <th className="px-4 py-3 text-center">Vencimento</th>
                    <th className="px-4 py-3 text-center">Status</th>
                    <th className="px-4 py-3 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200 dark:divide-zinc-850">
                  {(tab === "a_receber" ? aReceberList : recebidasList).map((r) => {
                    const overdue = r.status === "Aberto" && !r.recebido && r.data_vencimento && r.data_vencimento < todayStr;
                    const nearDue = r.status === "Aberto" && !r.recebido && r.data_vencimento && (() => {
                      const diffTime = new Date(r.data_vencimento + 'T12:00:00') - new Date();
                      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                      return diffDays >= 0 && diffDays <= 3;
                    })();

                    let rowBg = "hover:bg-zinc-50 dark:hover:bg-zinc-950/40 transition-colors";
                    if (overdue) {
                      rowBg = "bg-rose-50/40 dark:bg-rose-950/10 hover:bg-rose-50/60 border-l-4 border-l-rose-500 transition-colors";
                    } else if (nearDue) {
                      rowBg = "bg-amber-50/40 dark:bg-amber-950/10 hover:bg-amber-50/60 border-l-4 border-l-amber-500 transition-colors";
                    }

                    return (
                      <tr key={r.id} className={rowBg}>
                        <td className="px-4 py-3.5">
                          <div className="font-semibold text-zinc-800 dark:text-zinc-200">{r.descricao}</div>
                          <div className="text-[10px] text-zinc-400 dark:text-zinc-500 flex items-center gap-2 mt-0.5">
                            {r.numero_documento && <span>Doc: #{r.numero_documento}</span>}
                            {r.data_documento && <span>Data Doc: {fmtDT(r.data_documento)}</span>}
                          </div>
                        </td>
                        <td className="px-4 py-3.5 text-zinc-650 dark:text-zinc-300 font-medium">
                          {r.cliente || <span className="text-zinc-350 dark:text-zinc-600">-</span>}
                        </td>
                        <td className="px-4 py-3.5">
                          <span className="px-2 py-0.5 bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 rounded-md text-xs font-semibold">
                            {r.categoria || "Geral"}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 text-right font-display font-bold text-zinc-850 dark:text-zinc-50">
                          {fmtBRL(Number(r.valor))}
                        </td>
                        <td className="px-4 py-3.5 text-center text-zinc-600 dark:text-zinc-400 font-medium">
                          {r.data_vencimento ? (
                            <div className="flex flex-col items-center justify-center">
                              <span>{fmtDT(r.data_vencimento)}</span>
                              {overdue && (
                                <span className="text-[9px] text-rose-500 font-bold flex items-center gap-0.5 mt-0.5">
                                  <AlertTriangle className="w-2.5 h-2.5" /> VENCIDO
                                </span>
                              )}
                              {nearDue && (
                                <span className="text-[9px] text-amber-500 font-bold flex items-center gap-0.5 mt-0.5">
                                  <Clock className="w-2.5 h-2.5" /> PRÓXIMO
                                </span>
                              )}
                            </div>
                          ) : "-"}
                        </td>
                        <td className="px-4 py-3.5 text-center">
                          {(() => {
                            let badgeStyle = "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400";
                            let statusText = "Aberto";

                            if (r.status === "Recebido" || r.recebido) {
                              badgeStyle = "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400";
                              statusText = "Recebido";
                            } else if (r.status === "Cancelado") {
                              badgeStyle = "bg-zinc-100 text-zinc-550 dark:bg-zinc-800 dark:text-zinc-400";
                              statusText = "Cancelado";
                            } else if (overdue) {
                              badgeStyle = "bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400";
                              statusText = "Vencido";
                            }

                            return (
                              <div className="flex flex-col items-center">
                                <span className={`px-2 py-0.75 rounded-full text-xs font-semibold tracking-wide ${badgeStyle}`}>
                                  {statusText}
                                </span>
                                {(r.status === "Recebido" || r.recebido) && r.baixado_por && (
                                  <span className="text-[8px] text-zinc-450 dark:text-zinc-500 mt-1 max-w-[100px] truncate" title={`Recebido por ${r.baixado_por}`}>
                                    Por: {r.baixado_por}
                                  </span>
                                )}
                              </div>
                            );
                          })()}
                        </td>
                        <td className="px-4 py-3.5 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1">
                            {!r.recebido && r.status !== "Recebido" && r.status !== "Cancelado" && (
                              <Button 
                                size="icon" 
                                variant="ghost" 
                                onClick={() => openWriteOffDialog(r)}
                                className="w-8 h-8 rounded-full text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/20"
                                title="Confirmar recebimento (Baixar)"
                              >
                                <Check className="w-4 h-4" />
                              </Button>
                            )}

                            <Button 
                              size="icon" 
                              variant="ghost" 
                              onClick={() => openDialog(r)}
                              className="w-8 h-8 rounded-full text-blue-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/20"
                            >
                              <Edit2 className="w-4 h-4" />
                            </Button>
                            
                            <Button 
                              size="icon" 
                              variant="ghost" 
                              onClick={() => deleteReceita(r.id, r.recebido || r.status === "Recebido")}
                              disabled={r.recebido || r.status === "Recebido"}
                              className={`w-8 h-8 rounded-full ${r.recebido || r.status === "Recebido" ? "text-zinc-350 dark:text-zinc-700 cursor-not-allowed" : "text-rose-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/20"}`}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}

      {/* RELATÓRIOS TAB CONTENT */}
      {tab === "relatorios" && (
        <div className="space-y-6">
          {/* Controls Bar */}
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 shadow-sm flex flex-col lg:flex-row lg:items-end justify-between gap-4">
            <div className="flex flex-wrap items-center gap-4">
              <div>
                <Label className="text-xs uppercase font-bold text-zinc-400 dark:text-zinc-500 tracking-wider">Período De</Label>
                <Input 
                  type="date" 
                  value={repFrom} 
                  onChange={(e) => setRepFrom(e.target.value)} 
                  className="w-full lg:w-40 mt-1 h-10 text-xs" 
                />
              </div>
              <div>
                <Label className="text-xs uppercase font-bold text-zinc-400 dark:text-zinc-500 tracking-wider">Até</Label>
                <Input 
                  type="date" 
                  value={repTo} 
                  onChange={(e) => setRepTo(e.target.value)} 
                  className="w-full lg:w-40 mt-1 h-10 text-xs" 
                />
              </div>
            </div>

            <div>
              <Label className="text-xs uppercase font-bold text-zinc-400 dark:text-zinc-500 tracking-wider block mb-1">Atalhos Rápidos</Label>
              <div className="flex flex-wrap gap-1.5">
                <Button size="sm" variant="outline" onClick={() => handlePeriodPreset(0)} className="text-xs h-8">Hoje</Button>
                <Button size="sm" variant="outline" onClick={() => handlePeriodPreset(7)} className="text-xs h-8">Últimos 7 dias</Button>
                <Button size="sm" variant="outline" onClick={() => handlePeriodPreset('month')} className="text-xs h-8">Este Mês</Button>
                <Button size="sm" variant="outline" onClick={() => handlePeriodPreset(30)} className="text-xs h-8">Últimos 30 dias</Button>
              </div>
            </div>
          </div>

          {/* Split Reporting View Grid */}
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            
            {/* Category Breakdown list */}
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 shadow-sm space-y-4">
              <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-650 dark:text-zinc-350 pb-2 border-b border-zinc-150 dark:border-zinc-800">
                Receitas por Categoria
              </h3>
              {categoryChartData.length === 0 ? (
                <div className="p-8 text-center text-zinc-400 dark:text-zinc-500 text-xs">
                  Sem dados para o período selecionado.
                </div>
              ) : (
                <div className="space-y-4">
                  {categoryChartData.map(c => {
                    const percentage = totalPeriodRevenue > 0 ? (c.value / totalPeriodRevenue) * 100 : 0;
                    return (
                      <div key={c.name} className="space-y-1">
                        <div className="flex items-center justify-between text-xs font-semibold">
                          <span className="text-zinc-700 dark:text-zinc-300">{c.name}</span>
                          <span className="text-zinc-900 dark:text-zinc-50 font-mono">{fmtBRL(c.value)} ({percentage.toFixed(1)}%)</span>
                        </div>
                        <div className="w-full bg-zinc-100 dark:bg-zinc-800 h-2.5 rounded-full overflow-hidden">
                          <div 
                            className="bg-[#84A59D] h-full rounded-full transition-all duration-500"
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Contas em Aberto */}
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 shadow-sm xl:col-span-2 space-y-6">
              <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 shadow-sm">
                <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-650 dark:text-zinc-300 mb-4 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Clock className="w-4 h-4 text-amber-500" /> Contas em Aberto do Período
                  </span>
                  <span className="text-xs bg-amber-500/10 text-amber-600 dark:text-amber-500 px-2 py-0.5 rounded-full font-bold">
                    {fmtBRL(repOpenVal)}
                  </span>
                </h3>

                {repOpenExpenses.length === 0 ? (
                  <div className="p-8 text-center text-zinc-400 dark:text-zinc-500 text-xs">
                    Nenhuma receita em aberto neste período.
                  </div>
                ) : (
                  <div className="overflow-x-auto max-h-72 custom-scrollbar">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-zinc-50 dark:bg-zinc-900/60 sticky top-0 text-[10px] uppercase font-bold text-zinc-400">
                        <tr>
                          <th className="p-2.5">Descrição</th>
                          <th className="p-2.5">Cliente</th>
                          <th className="p-2.5">Vencimento</th>
                          <th className="p-2.5 text-right">Valor</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800 text-zinc-650 dark:text-zinc-350">
                        {repOpenExpenses.map(r => {
                          const overdue = r.status === "Aberto" && !r.recebido && r.data_vencimento && r.data_vencimento < todayStr;
                          return (
                            <tr key={r.id} className={overdue ? "bg-rose-50/20 dark:bg-rose-950/5" : "hover:bg-zinc-50/50"}>
                              <td className="p-2.5 font-semibold text-zinc-800 dark:text-zinc-200">
                                <div>{r.descricao}</div>
                                {overdue && <span className="text-[8px] text-rose-500 font-bold uppercase tracking-wider block mt-0.5">⚠️ Vencido</span>}
                              </td>
                              <td className="p-2.5 font-medium">{r.cliente || "-"}</td>
                              <td className="p-2.5 font-medium">{fmtDT(r.data_vencimento)}</td>
                              <td className="p-2.5 text-right font-bold font-mono">{fmtBRL(Number(r.valor))}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Contas Quitadas / Recebidas */}
              <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 shadow-sm">
                <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-650 dark:text-zinc-300 mb-4 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Check className="w-4 h-4 text-emerald-500" /> Contas Recebidas do Período
                  </span>
                  <span className="text-xs bg-emerald-500/10 text-emerald-600 dark:text-emerald-500 px-2 py-0.5 rounded-full font-bold">
                    {fmtBRL(repPaidVal)}
                  </span>
                </h3>

                {repPaidExpenses.length === 0 ? (
                  <div className="p-8 text-center text-zinc-400 dark:text-zinc-500 text-xs">
                    Nenhuma receita recebida neste período.
                  </div>
                ) : (
                  <div className="overflow-x-auto max-h-72 custom-scrollbar">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-zinc-50 dark:bg-zinc-900/60 sticky top-0 text-[10px] uppercase font-bold text-zinc-400">
                        <tr>
                          <th className="p-2.5">Descrição</th>
                          <th className="p-2.5">Recebido Em</th>
                          <th className="p-2.5">Forma / Auditor</th>
                          <th className="p-2.5 text-right">Valor</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800 text-zinc-650 dark:text-zinc-350">
                        {repPaidExpenses.map(r => (
                          <tr key={r.id} className="hover:bg-zinc-50/50">
                            <td className="p-2.5 font-semibold text-zinc-800 dark:text-zinc-200">{r.descricao}</td>
                            <td className="p-2.5 font-medium">{fmtDT(r.data_recebimento || r.data_vencimento)}</td>
                            <td className="p-2.5 text-[10px] leading-tight">
                              <span className="font-bold text-emerald-600 block">{r.forma_pagamento || "Não informado"}</span>
                              <span className="text-zinc-450 dark:text-zinc-500 text-[9px] block">Baixado por: {r.baixado_por || "Sistema"}</span>
                            </td>
                            <td className="p-2.5 text-right font-bold text-emerald-650 dark:text-emerald-450 font-mono">{fmtBRL(Number(r.valor))}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* DIALOG: CREATE / EDIT RECEIPT */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="w-[92%] sm:max-w-lg bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-100 rounded-2xl shadow-xl overflow-y-auto max-h-[92vh] p-5 sm:p-6 border border-zinc-250 dark:border-zinc-800">
          <DialogHeader className="pb-3 border-b border-zinc-150 dark:border-zinc-800">
            <DialogTitle className="text-lg font-bold text-zinc-900 dark:text-zinc-50">
              {editingId ? "Editar Receita" : "Nova Receita"}
            </DialogTitle>
            <DialogDescription className="sr-only">
              Formulário para criar ou editar contas a receber e entradas financeiras.
            </DialogDescription>
          </DialogHeader>

          {/* SECURITY: RECEIVED STATUS WARNING BANNER */}
          {editingId && (form.status === "Recebido" || form.recebido) && (
            <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-250 dark:border-amber-900/60 p-3.5 rounded-xl text-xs text-amber-800 dark:text-amber-400 flex flex-col gap-2 shadow-sm my-1">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 text-amber-500 mt-0.5" />
                <div>
                  <span className="font-bold">⚠️ Esta receita já foi recebida.</span> Os dados fundamentais de valor e vencimento estão bloqueados para auditoria e controle de faturamento.
                </div>
              </div>
              <div className="flex justify-end mt-1">
                <Button 
                  size="sm" 
                  variant="outline" 
                  onClick={() => triggerRevertWriteOff(editingId)}
                  className="bg-amber-100 hover:bg-amber-200 dark:bg-amber-950/40 dark:hover:bg-amber-900/50 text-amber-800 dark:text-amber-400 text-[10px] font-bold py-1 h-7 border-amber-300 dark:border-amber-800 flex items-center gap-1 rounded-md"
                >
                  <RefreshCw className="w-3 h-3" /> Estornar Recebimento (Liberar Edição)
                </Button>
              </div>
            </div>
          )}

          {/* WHO/WHEN INFORMATION BANNER */}
          {editingId && (form.status === "Recebido" || form.recebido) && form.baixado_por && (
            <div className="bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-850 px-3.5 py-2.5 rounded-xl text-[11px] text-zinc-500 dark:text-zinc-400 flex items-center justify-between">
              <span><b>Recebido por:</b> {form.baixado_por}</span>
              {form.baixado_em && (
                <span><b>Em:</b> {new Date(form.baixado_em).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}</span>
              )}
            </div>
          )}

          <div className="space-y-4 py-3">
            <div>
              <Label className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">Descrição *</Label>
              <Input
                value={form.descricao}
                onChange={(e) => setForm({ ...form, descricao: e.target.value })}
                disabled={editingId && (form.status === "Recebido" || form.recebido)}
                placeholder="Ex: Venda de móveis antigos"
                className="mt-1 bg-zinc-50 dark:bg-zinc-950 border-zinc-250 dark:border-zinc-800 rounded-lg text-xs"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">Valor *</Label>
                <Input
                  type="text"
                  value={form.valor}
                  onChange={(e) => setForm({ ...form, valor: e.target.value })}
                  disabled={editingId && (form.status === "Recebido" || form.recebido)}
                  placeholder="0,00"
                  className="mt-1 bg-zinc-50 dark:bg-zinc-950 border-zinc-250 dark:border-zinc-800 rounded-lg text-xs"
                />
              </div>
              
              <div>
                <Label className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">Categoria</Label>
                <Select 
                  value={form.categoria || "Nenhuma"} 
                  onValueChange={(v) => setForm({ ...form, categoria: v === "Nenhuma" ? "" : v })}
                  disabled={editingId && (form.status === "Recebido" || form.recebido)}
                >
                  <SelectTrigger className="mt-1 bg-zinc-50 dark:bg-zinc-950 border border-zinc-250 dark:border-zinc-800 rounded-lg text-xs">
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-800 dark:text-zinc-150 rounded-xl">
                    <SelectItem value="Nenhuma">Nenhuma</SelectItem>
                    {CATEGORIAS.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-xs font-semibold text-zinc-550 dark:text-zinc-400">Cliente</Label>
                <Select
                  value={form.cliente || "sem_cliente"}
                  onValueChange={(val) => setForm({ ...form, cliente: val === "sem_cliente" ? "" : val })}
                  disabled={editingId && (form.status === "Recebido" || form.recebido)}
                >
                  <SelectTrigger className="mt-1 bg-zinc-50 dark:bg-zinc-950 border border-zinc-250 dark:border-zinc-800 rounded-lg text-xs h-10 w-full text-left">
                    <SelectValue placeholder="Selecione o cliente..." />
                  </SelectTrigger>
                  <SelectContent className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-800 dark:text-zinc-150 rounded-xl max-h-56">
                    <SelectItem value="sem_cliente" className="text-zinc-400 dark:text-zinc-500">Consumidor Final</SelectItem>
                    {clientesList.map((c) => (
                      <SelectItem key={c.id} value={c.nome}>
                        {c.nome}
                      </SelectItem>
                    ))}
                    {form.cliente && form.cliente !== "sem_cliente" && !clientesList.some(c => c.nome === form.cliente) && (
                      <SelectItem value={form.cliente}>
                        {form.cliente} (Histórico/Não Cadastrado)
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">Nº do Documento</Label>
                <Input
                  value={form.numero_documento}
                  onChange={(e) => setForm({ ...form, numero_documento: e.target.value })}
                  disabled={editingId && (form.status === "Recebido" || form.recebido)}
                  placeholder="Ex: RC-1002"
                  className="mt-1 bg-zinc-50 dark:bg-zinc-950 border-zinc-250 dark:border-zinc-800 rounded-lg text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">Status</Label>
                <Select 
                  value={form.status} 
                  onValueChange={(v) => setForm({ ...form, status: v, recebido: v === "Recebido" })}
                  disabled={editingId && (form.status === "Recebido" || form.recebido)}
                >
                  <SelectTrigger className="mt-1 bg-zinc-50 dark:bg-zinc-950 border border-zinc-250 dark:border-zinc-800 rounded-lg text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-800 dark:text-zinc-150 rounded-xl">
                    <SelectItem value="Aberto">Em Aberto</SelectItem>
                    <SelectItem value="Recebido">Recebido</SelectItem>
                    <SelectItem value="Cancelado">Cancelado</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">Forma de Recebimento</Label>
                <Select 
                  value={form.forma_pagamento || "Nenhuma"} 
                  onValueChange={(v) => setForm({ ...form, forma_pagamento: v === "Nenhuma" ? "" : v })}
                  disabled={editingId && (form.status === "Recebido" || form.recebido)}
                >
                  <SelectTrigger className="mt-1 bg-zinc-50 dark:bg-zinc-950 border border-zinc-250 dark:border-zinc-800 rounded-lg text-xs">
                    <SelectValue placeholder="Nenhuma" />
                  </SelectTrigger>
                  <SelectContent className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-800 dark:text-zinc-150 rounded-xl">
                    <SelectItem value="Nenhuma">Nenhuma</SelectItem>
                    {FORMAS_PAGAMENTO.map((f) => <SelectItem key={f} value={f}>{f}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">Data Documento</Label>
                <Input
                  type="date"
                  value={form.data_documento}
                  onChange={(e) => setForm({ ...form, data_documento: e.target.value })}
                  disabled={editingId && (form.status === "Recebido" || form.recebido)}
                  className="mt-1 bg-zinc-50 dark:bg-zinc-950 border-zinc-250 dark:border-zinc-800 rounded-lg text-xs"
                />
              </div>

              <div>
                <Label className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">Vencimento</Label>
                <Input
                  type="date"
                  value={form.data_vencimento}
                  onChange={(e) => setForm({ ...form, data_vencimento: e.target.value })}
                  disabled={editingId && (form.status === "Recebido" || form.recebido)}
                  className="mt-1 bg-zinc-50 dark:bg-zinc-950 border-zinc-250 dark:border-zinc-800 rounded-lg text-xs"
                />
              </div>

              <div>
                <Label className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">Recebimento</Label>
                <Input
                  type="date"
                  value={form.data_recebimento}
                  onChange={(e) => setForm({ ...form, data_recebimento: e.target.value })}
                  disabled={editingId && (form.status === "Recebido" || form.recebido)}
                  className="mt-1 bg-zinc-50 dark:bg-zinc-950 border-zinc-250 dark:border-zinc-800 rounded-lg text-xs"
                />
              </div>
            </div>

            <div>
              <Label className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">Observações</Label>
              <textarea
                value={form.observacoes}
                onChange={(e) => setForm({ ...form, observacoes: e.target.value })}
                placeholder="Notas adicionais, detalhes de recebimento..."
                rows="2"
                className="w-full mt-1 p-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-250 dark:border-zinc-800 rounded-lg text-xs outline-none focus:border-[#84A59D] transition-colors resize-none"
              />
            </div>
          </div>
          
          <DialogFooter className="gap-2 pt-3 border-t border-zinc-150 dark:border-zinc-800">
            <Button variant="outline" onClick={() => setDialogOpen(false)} className="rounded-lg h-10 text-xs">
              Cancelar
            </Button>
            
            {!(editingId && (form.status === "Recebido" || form.recebido)) ? (
              <Button onClick={save} className="bg-[#84A59D] hover:bg-[#6F9189] text-white rounded-lg h-10 text-xs">
                Salvar
              </Button>
            ) : (
              <Button onClick={() => setDialogOpen(false)} className="bg-[#84A59D] hover:bg-[#6F9189] text-white rounded-lg h-10 text-xs">
                OK (Visualizar)
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* DIALOG: PAYMENT WRITE-OFF (BAIXA DE RECEBIMENTO) */}
      <Dialog open={writeOffOpen} onOpenChange={setWriteOffOpen}>
        <DialogContent className="w-[92%] sm:max-w-md bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-100 rounded-2xl shadow-xl p-5 sm:p-6 border border-zinc-250 dark:border-zinc-800">
          <DialogHeader className="pb-2 border-b border-zinc-150 dark:border-zinc-800">
            <DialogTitle className="text-base font-bold flex items-center gap-1.5 text-zinc-900 dark:text-zinc-50">
              <Check className="w-5 h-5 text-emerald-500" />
              <span>Confirmar Baixa de Recebimento</span>
            </DialogTitle>
            <DialogDescription className="sr-only">
              Confirme o recebimento desta conta preenchendo a data e forma de pagamento correspondentes.
            </DialogDescription>
          </DialogHeader>
          
          {writeOffReceita && (
            <div className="py-4 space-y-4">
              <p className="text-xs text-zinc-550 dark:text-zinc-400">
                Você está prestes a registrar o recebimento da seguinte receita. Esta ação registrará o seu nome de usuário e a data/hora do registro para fins de auditoria financeira.
              </p>
              
              <div className="bg-zinc-50 dark:bg-zinc-950 p-4 rounded-xl space-y-2 border border-zinc-200 dark:border-zinc-850">
                <div className="text-xs"><span className="text-zinc-400 font-semibold uppercase block text-[10px]">Receita</span> <b className="text-zinc-800 dark:text-zinc-100">{writeOffReceita.descricao}</b></div>
                <div className="grid grid-cols-2 gap-2 mt-2">
                  <div className="text-xs"><span className="text-zinc-400 font-semibold uppercase block text-[10px]">Valor</span> <b className="text-emerald-600 font-mono">{fmtBRL(writeOffReceita.valor)}</b></div>
                  <div className="text-xs"><span className="text-zinc-400 font-semibold uppercase block text-[10px]">Cliente</span> <b>{writeOffReceita.cliente || "Consumidor Final"}</b></div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs font-bold text-zinc-650 dark:text-zinc-350">Data de Recebimento</Label>
                  <Input
                    type="date"
                    value={writeOffDate}
                    onChange={(e) => setWriteOffDate(e.target.value)}
                    className="mt-1.5 h-10 bg-zinc-50 dark:bg-zinc-950 border-zinc-250 dark:border-zinc-800 rounded-lg text-xs"
                  />
                </div>

                <div>
                  <Label className="text-xs font-bold text-zinc-650 dark:text-zinc-350">Forma de Recebimento</Label>
                  <Select value={writeOffPaymentMethod} onValueChange={setWriteOffPaymentMethod}>
                    <SelectTrigger className="mt-1.5 h-10 bg-zinc-50 dark:bg-zinc-950 border-zinc-250 dark:border-zinc-800 rounded-lg text-xs">
                      <SelectValue placeholder="Selecione..." />
                    </SelectTrigger>
                    <SelectContent className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-850 dark:text-zinc-150">
                      {FORMAS_PAGAMENTO.map(f => (
                        <SelectItem key={f} value={f}>{f}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="gap-2 pt-3 border-t border-zinc-150 dark:border-zinc-800">
            <Button variant="outline" onClick={() => { setWriteOffOpen(false); setWriteOffReceita(null); }} className="rounded-lg text-xs h-10">
              Cancelar
            </Button>
            <Button onClick={confirmWriteOff} className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs h-10 flex items-center gap-1 font-bold">
              <Check className="w-4 h-4" /> Confirmar Recebimento
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* DIALOG: CONFIRM DELETE */}
      <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <DialogContent className="w-[92%] sm:max-w-md bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-100 rounded-2xl shadow-xl p-5 sm:p-6 border border-zinc-250 dark:border-zinc-800">
          <DialogHeader>
            <DialogTitle className="text-zinc-900 dark:text-zinc-50">Confirmar Exclusão</DialogTitle>
            <DialogDescription className="sr-only">
              Deseja confirmar a exclusão desta receita? Ela poderá ser recuperada no painel de excluídos.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 text-xs text-zinc-550 dark:text-zinc-400 leading-relaxed">
            Tem certeza que deseja excluir esta receita? Ela será enviada para o painel de "Excluídos", onde poderá ser auditada ou restaurada a qualquer momento.
          </div>
          <DialogFooter className="gap-2 pt-2">
            <Button variant="outline" onClick={() => setDeleteConfirmOpen(false)} className="rounded-lg text-xs h-10">
              Cancelar
            </Button>
            <Button onClick={confirmDelete} className="bg-rose-500 hover:bg-rose-600 text-white rounded-lg text-xs h-10 font-bold">
              Excluir receita
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* CONFIRM REVERT PAYMENT DIALOG */}
      <Dialog open={revertConfirmOpen} onOpenChange={setRevertConfirmOpen}>
        <DialogContent className="w-[92%] sm:max-w-md bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-100 rounded-2xl shadow-xl p-5 sm:p-6 border border-zinc-250 dark:border-zinc-800">
          <DialogHeader className="pb-2 border-b border-zinc-150 dark:border-zinc-800">
            <DialogTitle className="text-base font-bold flex items-center gap-1.5 text-zinc-900 dark:text-zinc-50">
              <RefreshCw className="w-5 h-5 text-amber-500" />
              <span>Confirmar Estorno de Recebimento</span>
            </DialogTitle>
            <DialogDescription className="sr-only">
              Deseja confirmar o estorno de recebimento desta receita?
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
            Tem certeza que deseja estornar o recebimento desta receita? O título voltará para o status **"Em Aberto"**, todos os logs de auditoria de recebimento serão limpos, e os campos de valor/vencimento serão desbloqueados para edição ou exclusão.
          </div>
          <DialogFooter className="gap-2 pt-3 border-t border-zinc-150 dark:border-zinc-800">
            <Button variant="outline" onClick={() => setRevertConfirmOpen(false)} className="rounded-lg text-xs h-10">
              Cancelar
            </Button>
            <Button onClick={handleRevertWriteOff} className="bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-xs h-10 font-bold">
              Confirmar Estorno
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AuditModal 
        isOpen={auditOpen} 
        onClose={() => setAuditOpen(false)} 
        modulo="receita" 
        tituloModulo="Receitas" 
        onRestoreSuccess={load}
      />
    </div>
  );
}
