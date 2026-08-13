import React, { useEffect, useState } from "react";
import http from "../api";
import { PageHeader } from "../components/Page";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "../components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "../components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "../components/ui/tabs";
import { 
  Plus, Trash2, Edit2, AlertCircle, History, Check, DollarSign, 
  Calendar, Filter, FileText, Ban, RefreshCw, X, AlertTriangle, Clock 
} from "lucide-react";
import { toast } from "sonner";
import AuditModal from "../components/AuditModal";

const fmtBRL = (n) => (n || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const fmtDT = (s) => s ? new Date(s + 'T12:00:00').toLocaleDateString("pt-BR") : "-";

const CATEGORIAS = [
  "Aluguel",
  "Salários",
  "Água/Luz",
  "Internet",
  "Telefone",
  "Manutenção",
  "Limpeza",
  "Suprimentos",
  "Publicidade",
  "Seguros",
  "Impostos",
  "Outros"
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

export default function Despesas() {
  const [despesas, setDespesas] = useState([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [tab, setTab] = useState("fixo");
  const [auditOpen, setAuditOpen] = useState(false);
  const [fornecedoresList, setFornecedoresList] = useState([]);
  const [revertConfirmOpen, setRevertConfirmOpen] = useState(false);
  const [revertId, setRevertId] = useState(null);
  
  // Payment write-off modal states
  const [paymentConfirmOpen, setPaymentConfirmOpen] = useState(false);
  const [paymentExpense, setPaymentExpense] = useState(null);
  const [paymentDate, setPaymentDate] = useState(getTodayDateString());

  const [filterSearch, setFilterSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState("todos");
  const [filterStatus, setFilterStatus] = useState("todos");
  const [filterMonth, setFilterMonth] = useState("todos");
  const [filterFornecedor, setFilterFornecedor] = useState("todos");

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
    tipo: "fixo",
    categoria: "",
    data_documento: "",
    data_vencimento: "",
    data_pagamento: "",
    pago: false,
    status: "Aberto",
    numero_documento: "",
    fornecedor: "",
    observacoes: ""
  });

  const load = () => {
    http.get("/despesas")
      .then((r) => setDespesas(r.data))
      .catch(() => setDespesas([]));
  };

  const loadFornecedores = () => {
    http.get("/fornecedores")
      .then((r) => setFornecedoresList(r.data))
      .catch(() => setFornecedoresList([]));
  };

  useEffect(() => { 
    load(); 
    loadFornecedores();
  }, []);

  const resetForm = () => {
    setForm({
      descricao: "",
      valor: "",
      tipo: "fixo",
      categoria: "",
      data_documento: "",
      data_vencimento: "",
      data_pagamento: "",
      pago: false,
      status: "Aberto",
      numero_documento: "",
      fornecedor: "",
      observacoes: ""
    });
    setEditingId(null);
  };

  const openDialog = (despesa = null) => {
    loadFornecedores();
    if (despesa) {
      setForm({
        ...despesa,
        // Make sure fields are defined
        data_documento: despesa.data_documento || "",
        numero_documento: despesa.numero_documento || "",
        fornecedor: despesa.fornecedor || "",
        status: despesa.status || (despesa.pago ? "Pago" : "Aberto"),
        observacoes: despesa.observacoes || ""
      });
      setEditingId(despesa.id);
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
      // Synchronize pago based on status
      pago: form.status === "Pago"
    };

    try {
      if (editingId) {
        await http.put(`/despesas/${editingId}`, payload);
        toast.success("Despesa atualizada com sucesso");
      } else {
        await http.post("/despesas", payload);
        toast.success("Despesa criada com sucesso");
      }
      setDialogOpen(false);
      resetForm();
      load();
    } catch (e) {
      toast.error(e.response?.data?.detail || "Erro ao salvar despesa");
    }
  };

  const triggerRevertPayment = (id) => {
    setRevertId(id);
    setRevertConfirmOpen(true);
  };

  const handleRevertPayment = async () => {
    if (!revertId) return;
    try {
      await http.put(`/despesas/${revertId}`, { pago: false, status: "Aberto" });
      toast.success("Pagamento estornado com sucesso");
      setRevertConfirmOpen(false);
      setRevertId(null);
      setDialogOpen(false);
      resetForm();
      load();
    } catch (e) {
      toast.error(e.response?.data?.detail || "Erro ao estornar pagamento");
    }
  };

  const deleteDespesa = (id, isPaid) => {
    if (isPaid) {
      toast.error("Não é possível excluir uma despesa que já foi paga. Estorne o pagamento primeiro.");
      return;
    }
    setDeletingId(id);
    setDeleteConfirmOpen(true);
  };

  const confirmDelete = async () => {
    if (!deletingId) return;
    try {
      await http.delete(`/despesas/${deletingId}`);
      toast.success("Despesa enviada para excluídos");
      setDeleteConfirmOpen(false);
      setDeletingId(null);
      load();
    } catch (e) {
      toast.error(e.response?.data?.detail || "Erro ao excluir despesa");
    }
  };

  // Direct quick write-off action
  const openPaymentWriteOff = (despesa) => {
    setPaymentExpense(despesa);
    setPaymentDate(getTodayDateString());
    setPaymentConfirmOpen(true);
  };

  const confirmPaymentWriteOff = async () => {
    if (!paymentExpense) return;
    try {
      await http.put(`/despesas/${paymentExpense.id}`, {
        pago: true,
        status: "Pago",
        data_pagamento: paymentDate
      });
      toast.success("Baixa de pagamento registrada com sucesso!");
      setPaymentConfirmOpen(false);
      setPaymentExpense(null);
      load();
    } catch (e) {
      toast.error(e.response?.data?.detail || "Erro ao registrar baixa de pagamento");
    }
  };

  // Helper date logic to check overdue status & close due dates
  const isVencida = (d) => {
    if (d.pago || d.status === 'Pago' || d.status === 'Cancelado' || !d.data_vencimento) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const venc = new Date(d.data_vencimento + 'T12:00:00');
    return venc < today;
  };

  const isProximoVencimento = (d) => {
    if (d.pago || d.status === 'Pago' || d.status === 'Cancelado' || !d.data_vencimento) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const venc = new Date(d.data_vencimento + 'T12:00:00');
    const diffTime = venc - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays >= 0 && diffDays <= 3; // due today or within next 3 days
  };

  // Filter despesas based on type tab and other filters
  const getFilteredDespesas = () => {
    return despesas.filter(d => {
      // Filter by Fixa vs Variável tab
      if (d.tipo !== tab) return false;

      // Filter by Search Query (descricao, fornecedor, numero_documento)
      if (filterSearch.trim()) {
        const query = filterSearch.toLowerCase();
        const descMatch = (d.descricao || "").toLowerCase().includes(query);
        const fornMatch = (d.fornecedor || "").toLowerCase().includes(query);
        const docMatch = (d.numero_documento || "").toLowerCase().includes(query);
        if (!descMatch && !fornMatch && !docMatch) return false;
      }

      // Filter by Fornecedor
      if (filterFornecedor !== "todos") {
        const fornMatch = (d.fornecedor || "") === filterFornecedor;
        if (!fornMatch) return false;
      }

      // Filter by Category
      if (filterCategory !== "todos" && d.categoria !== filterCategory) return false;

      // Filter by Month
      if (filterMonth !== "todos") {
        const targetDate = (d.pago || d.status === 'Pago')
          ? (d.data_pagamento || d.data_vencimento || d.data_documento)
          : (d.data_vencimento || d.data_documento);
        if (!targetDate || !targetDate.startsWith(filterMonth)) return false;
      }

      // Filter by Status
      if (filterStatus !== "todos") {
        if (filterStatus === "Vencido") {
          return isVencida(d);
        }
        return d.status === filterStatus;
      }

      return true;
    });
  };

  const filteredDespesas = tab === "relatorios" ? [] : getFilteredDespesas();

  // Metrics for active tab
  const totalDespesas = filteredDespesas.reduce((sum, d) => sum + (Number(d.valor) || 0), 0);
  const totalPago = filteredDespesas.filter(d => d.pago || d.status === 'Pago').reduce((sum, d) => sum + (Number(d.valor) || 0), 0);
  const totalAberto = filteredDespesas.filter(d => d.status === 'Aberto' && !isVencida(d)).reduce((sum, d) => sum + (Number(d.valor) || 0), 0);
  const totalVencido = filteredDespesas.filter(d => isVencida(d)).reduce((sum, d) => sum + (Number(d.valor) || 0), 0);

  // ----------------------------------------------------
  // REPORT CALCULATIONS (For selected period)
  // ----------------------------------------------------
  const getPeriodExpenses = () => {
    return despesas.filter(d => {
      const date = (d.pago || d.status === 'Pago')
        ? (d.data_pagamento || d.data_vencimento || d.data_documento)
        : (d.data_vencimento || d.data_documento);
      if (!date) return false;
      return date >= repFrom && date <= repTo;
    });
  };

  const periodExpenses = getPeriodExpenses();
  const repTotalVal = periodExpenses.reduce((sum, d) => sum + (Number(d.valor) || 0), 0);
  const repPaidExpenses = periodExpenses.filter(d => d.pago || d.status === 'Pago');
  const repPaidVal = repPaidExpenses.reduce((sum, d) => sum + (Number(d.valor) || 0), 0);
  
  const repOpenExpenses = periodExpenses.filter(d => d.status === 'Aberto' && !isVencida(d));
  const repOpenVal = repOpenExpenses.reduce((sum, d) => sum + (Number(d.valor) || 0), 0);

  const repOverdueExpenses = periodExpenses.filter(d => isVencida(d));
  const repOverdueVal = repOverdueExpenses.reduce((sum, d) => sum + (Number(d.valor) || 0), 0);

  const repCancelledExpenses = periodExpenses.filter(d => d.status === 'Cancelado');
  const repCancelledVal = repCancelledExpenses.reduce((sum, d) => sum + (Number(d.valor) || 0), 0);

  // Group by category
  const getCategoryBreakdown = () => {
    const breakdown = {};
    CATEGORIAS.forEach(c => breakdown[c] = 0);
    breakdown["Outras / Não Informada"] = 0;

    periodExpenses.forEach(d => {
      if (d.status === 'Cancelado') return; // skip cancelled in standard expense reports
      const cat = d.categoria || "Outras / Não Informada";
      if (breakdown[cat] !== undefined) {
        breakdown[cat] += Number(d.valor) || 0;
      } else {
        breakdown["Outras / Não Informada"] += Number(d.valor) || 0;
      }
    });

    return Object.entries(breakdown)
      .map(([category, amount]) => ({
        category,
        amount,
        percentage: repTotalVal > 0 ? (amount / repTotalVal) * 100 : 0
      }))
      .filter(item => item.amount > 0)
      .sort((a, b) => b.amount - a.amount);
  };

  const categoryBreakdown = getCategoryBreakdown();

  const handlePeriodPreset = (days) => {
    const today = new Date();
    const toStr = today.toISOString().split("T")[0];
    let fromDate = new Date();
    if (days === 'month') {
      setRepFrom(getFirstDayOfMonthString());
      setRepTo(toStr);
    } else {
      fromDate.setDate(today.getDate() - days);
      const fromStr = fromDate.toISOString().split("T")[0];
      setRepFrom(fromStr);
      setRepTo(toStr);
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 fade-in min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-800 dark:text-zinc-200">
      <PageHeader 
        overline="Financeiro" 
        title="Contas a Pagar (Despesas)" 
        action={
          <Button onClick={() => openDialog()} className="bg-[#84A59D] hover:bg-[#6F9189] text-white shadow-sm flex items-center gap-1.5 rounded-lg font-semibold">
            <Plus className="w-4 h-4 mr-0.5" /> Nova despesa
          </Button>
        } 
      />

      {/* Main Tabs Selection */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <Tabs value={tab} onValueChange={setTab} className="w-full sm:w-auto">
          <TabsList className="bg-zinc-200 dark:bg-zinc-900 p-1 rounded-lg">
            <TabsTrigger value="fixo" className="rounded-md font-medium text-xs px-4 py-2">Despesas Fixas</TabsTrigger>
            <TabsTrigger value="variavel" className="rounded-md font-medium text-xs px-4 py-2">Despesas Variáveis</TabsTrigger>
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
                  placeholder="Pesquisar por descrição, fornecedor ou documento..."
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

            <div className="w-full md:w-44">
              <Label className="text-[10px] uppercase font-bold text-zinc-400 dark:text-zinc-500 tracking-wider">Fornecedor</Label>
              <div className="mt-1">
                <Select value={filterFornecedor} onValueChange={setFilterFornecedor}>
                  <SelectTrigger className="h-10 text-xs bg-zinc-50 dark:bg-zinc-950 border-zinc-250 dark:border-zinc-800 rounded-lg">
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-800 dark:text-zinc-150">
                    <SelectItem value="todos">Todos os Fornecedores</SelectItem>
                    {fornecedoresList.map((f) => (
                      <SelectItem key={f.id} value={f.nome_razosocial}>{f.nome_razosocial}</SelectItem>
                    ))}
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
                    <SelectItem value="Pago">Pago</SelectItem>
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
              <div className="text-xs font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">Total Despesas</div>
              <div className="font-display text-2xl font-bold mt-1.5 text-zinc-900 dark:text-zinc-50">{fmtBRL(totalDespesas)}</div>
            </div>
            
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 shadow-sm border-l-4 border-l-emerald-500">
              <div className="text-xs font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">Pago</div>
              <div className="font-display text-2xl font-bold mt-1.5 text-emerald-600 dark:text-emerald-500">{fmtBRL(totalPago)}</div>
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

          {/* Expenses Table */}
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-sm overflow-x-auto">
            {filteredDespesas.length === 0 ? (
              <div className="p-16 text-center text-zinc-400 dark:text-zinc-500">
                <AlertCircle className="w-10 h-10 mx-auto mb-3 opacity-40 text-zinc-400" />
                <p className="text-sm font-semibold">Nenhuma despesa encontrada</p>
                <p className="text-xs mt-1">Experimente alterar os filtros ou cadastrar uma nova despesa.</p>
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-zinc-50 dark:bg-zinc-900/50 text-xs uppercase tracking-wider font-semibold text-zinc-500 dark:text-zinc-400 border-b border-zinc-250 dark:border-zinc-800">
                  <tr>
                    <th className="px-4 py-3 text-left">Documento / Descrição</th>
                    <th className="px-4 py-3 text-left">Fornecedor</th>
                    <th className="px-4 py-3 text-left">Categoria</th>
                    <th className="px-4 py-3 text-right">Valor</th>
                    <th className="px-4 py-3 text-center">Vencimento</th>
                    <th className="px-4 py-3 text-center">Status</th>
                    <th className="px-4 py-3 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-150 dark:divide-zinc-850">
                  {filteredDespesas.map((d) => {
                    const overdue = isVencida(d);
                    const nearDue = isProximoVencimento(d);
                    
                    let rowBg = "hover:bg-zinc-50 dark:hover:bg-zinc-950/40 transition-colors";
                    if (overdue) {
                      rowBg = "bg-rose-50/40 dark:bg-rose-950/10 hover:bg-rose-50/60 border-l-4 border-l-rose-500 transition-colors";
                    } else if (nearDue) {
                      rowBg = "bg-amber-50/40 dark:bg-amber-950/10 hover:bg-amber-50/60 border-l-4 border-l-amber-500 transition-colors";
                    }

                    return (
                      <tr key={d.id} className={rowBg}>
                        <td className="px-4 py-3.5">
                          <div className="font-semibold text-zinc-800 dark:text-zinc-200 flex items-center gap-1.5">
                            {d.descricao}
                            {d.entrada_estoque_id && (
                              <span className="px-1.5 py-0.5 bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 text-[9px] font-bold rounded">
                                NF Entrada
                              </span>
                            )}
                          </div>
                          <div className="text-[10px] text-zinc-400 dark:text-zinc-500 flex items-center gap-2 mt-0.5">
                            {d.numero_documento && <span>Doc: #{d.numero_documento}</span>}
                            {d.data_documento && <span>Data Doc: {fmtDT(d.data_documento)}</span>}
                          </div>
                        </td>
                        <td className="px-4 py-3.5 text-zinc-650 dark:text-zinc-300 font-medium">
                          {d.fornecedor || <span className="text-zinc-350 dark:text-zinc-600">-</span>}
                        </td>
                        <td className="px-4 py-3.5">
                          <span className="px-2 py-0.5 bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 rounded-md text-xs font-semibold">
                            {d.categoria || "Geral"}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 text-right font-display font-bold text-zinc-850 dark:text-zinc-50">
                          {fmtBRL(Number(d.valor))}
                        </td>
                        <td className="px-4 py-3.5 text-center text-zinc-600 dark:text-zinc-400 font-medium">
                          {d.data_vencimento ? (
                            <div className="flex flex-col items-center justify-center">
                              <span>{fmtDT(d.data_vencimento)}</span>
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

                            if (d.status === "Pago" || d.pago) {
                              badgeStyle = "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400";
                              statusText = "Pago";
                            } else if (d.status === "Cancelado") {
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
                                {(d.status === "Pago" || d.pago) && d.baixado_por && (
                                  <span className="text-[8px] text-zinc-450 dark:text-zinc-500 mt-1 max-w-[100px] truncate" title={`Baixado por ${d.baixado_por}`}>
                                    Por: {d.baixado_por}
                                  </span>
                                )}
                              </div>
                            );
                          })()}
                        </td>
                        <td className="px-4 py-3.5 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1">
                            {!d.pago && d.status !== "Pago" && d.status !== "Cancelado" && (
                              <Button 
                                size="icon" 
                                variant="ghost" 
                                onClick={() => openPaymentWriteOff(d)}
                                className="w-8 h-8 rounded-full text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/20"
                                title="Confirmar pagamento da conta (Baixar)"
                              >
                                <Check className="w-4 h-4" />
                              </Button>
                            )}

                            <Button 
                              size="icon" 
                              variant="ghost" 
                              onClick={() => openDialog(d)}
                              className="w-8 h-8 rounded-full text-blue-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/20"
                            >
                              <Edit2 className="w-4 h-4" />
                            </Button>
                            
                            <Button 
                              size="icon" 
                              variant="ghost" 
                              onClick={() => deleteDespesa(d.id, d.pago || d.status === "Pago")}
                              disabled={d.pago || d.status === "Pago"}
                              className={`w-8 h-8 rounded-full ${d.pago || d.status === "Pago" ? "text-zinc-350 dark:text-zinc-700 cursor-not-allowed" : "text-rose-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/20"}`}
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

          {/* Period Financial Metrics */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 shadow-sm">
              <div className="text-xs font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">Total do Período</div>
              <div className="font-display text-2xl font-bold mt-1 text-zinc-900 dark:text-zinc-50">{fmtBRL(repTotalVal)}</div>
              <div className="text-[10px] text-zinc-400 dark:text-zinc-500 mt-1">{periodExpenses.filter(x => x.status !== 'Cancelado').length} contas ativas</div>
            </div>

            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 shadow-sm border-l-4 border-l-emerald-500">
              <div className="text-xs font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">Contas Pagas</div>
              <div className="font-display text-2xl font-bold mt-1 text-emerald-600 dark:text-emerald-500">{fmtBRL(repPaidVal)}</div>
              <div className="text-[10px] text-zinc-400 dark:text-zinc-500 mt-1">{repPaidExpenses.length} quitadas</div>
            </div>

            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 shadow-sm border-l-4 border-l-amber-500">
              <div className="text-xs font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">Contas Em Aberto</div>
              <div className="font-display text-2xl font-bold mt-1 text-amber-600 dark:text-amber-500">{fmtBRL(repOpenVal)}</div>
              <div className="text-[10px] text-zinc-400 dark:text-zinc-500 mt-1">{repOpenExpenses.length} a vencer</div>
            </div>

            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 shadow-sm border-l-4 border-l-rose-500">
              <div className="text-xs font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">Contas Vencidas</div>
              <div className="font-display text-2xl font-bold mt-1 text-rose-600 dark:text-rose-500">{fmtBRL(repOverdueVal)}</div>
              <div className="text-[10px] text-zinc-400 dark:text-zinc-500 mt-1">{repOverdueExpenses.length} em atraso</div>
            </div>

            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 shadow-sm">
              <div className="text-xs font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 font-medium">Canceladas</div>
              <div className="font-display text-2xl font-bold mt-1 text-zinc-400 dark:text-zinc-500">{fmtBRL(repCancelledVal)}</div>
              <div className="text-[10px] text-zinc-400 dark:text-zinc-500 mt-1">{repCancelledExpenses.length} anuladas</div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Category Chart Section */}
            <div className="lg:col-span-1 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 shadow-sm">
              <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-650 dark:text-zinc-300 mb-4 flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-[#84A59D]" /> Despesas por Categoria
              </h3>
              
              {categoryBreakdown.length === 0 ? (
                <div className="p-12 text-center text-zinc-400 dark:text-zinc-500 text-xs">
                  Sem despesas ativas neste período.
                </div>
              ) : (
                <div className="space-y-4">
                  {categoryBreakdown.map((item, idx) => (
                    <div key={idx} className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs font-medium">
                        <span className="text-zinc-700 dark:text-zinc-300">{item.category}</span>
                        <div className="text-right">
                          <span className="font-bold mr-1">{fmtBRL(item.amount)}</span>
                          <span className="text-zinc-400 text-[10px]">({item.percentage.toFixed(1)}%)</span>
                        </div>
                      </div>
                      
                      <div className="w-full h-2.5 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                        <div 
                          className="h-full rounded-full bg-[#84A59D]" 
                          style={{ width: `${item.percentage}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Paid and Open Lists Section */}
            <div className="lg:col-span-2 space-y-6">
              {/* Contas em Aberto & Vencidas */}
              <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 shadow-sm">
                <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-650 dark:text-zinc-300 mb-4 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <AlertCircle className="w-4 h-4 text-amber-500" /> Contas Pendentes do Período
                  </span>
                  <span className="text-xs bg-amber-500/10 text-amber-600 dark:text-amber-500 px-2 py-0.5 rounded-full font-bold">
                    {fmtBRL(repOpenVal + repOverdueVal)}
                  </span>
                </h3>

                {repOpenExpenses.length === 0 && repOverdueExpenses.length === 0 ? (
                  <div className="p-8 text-center text-zinc-400 dark:text-zinc-500 text-xs">
                    Nenhuma conta pendente neste período.
                  </div>
                ) : (
                  <div className="overflow-x-auto max-h-72 custom-scrollbar">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-zinc-50 dark:bg-zinc-900/60 sticky top-0 text-[10px] uppercase font-bold text-zinc-400">
                        <tr>
                          <th className="p-2.5">Descrição</th>
                          <th className="p-2.5">Fornecedor</th>
                          <th className="p-2.5 text-center">Vencimento</th>
                          <th className="p-2.5 text-right">Valor</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                        {[...repOverdueExpenses, ...repOpenExpenses].map(d => {
                          const overdue = isVencida(d);
                          return (
                            <tr key={d.id} className={`${overdue ? "bg-rose-50/20 dark:bg-rose-950/5 text-rose-900 dark:text-rose-450" : "hover:bg-zinc-50/50"}`}>
                              <td className="p-2.5 font-semibold">{d.descricao}</td>
                              <td className="p-2.5 text-zinc-550 dark:text-zinc-400">{d.fornecedor || "-"}</td>
                              <td className={`p-2.5 text-center font-medium ${overdue ? "text-rose-500 font-bold" : ""}`}>
                                {fmtDT(d.data_vencimento)}
                                {overdue && <span className="block text-[8px] tracking-wide uppercase font-black text-rose-500 mt-0.5">VENCIDA</span>}
                              </td>
                              <td className="p-2.5 text-right font-bold font-mono">{fmtBRL(Number(d.valor))}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Contas Quitadas / Pagas */}
              <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 shadow-sm">
                <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-650 dark:text-zinc-300 mb-4 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Check className="w-4 h-4 text-emerald-500" /> Contas Pagas do Período
                  </span>
                  <span className="text-xs bg-emerald-500/10 text-emerald-600 dark:text-emerald-500 px-2 py-0.5 rounded-full font-bold">
                    {fmtBRL(repPaidVal)}
                  </span>
                </h3>

                {repPaidExpenses.length === 0 ? (
                  <div className="p-8 text-center text-zinc-400 dark:text-zinc-500 text-xs">
                    Nenhuma conta paga neste período.
                  </div>
                ) : (
                  <div className="overflow-x-auto max-h-72 custom-scrollbar">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-zinc-50 dark:bg-zinc-900/60 sticky top-0 text-[10px] uppercase font-bold text-zinc-400">
                        <tr>
                          <th className="p-2.5">Descrição</th>
                          <th className="p-2.5">Pago Em</th>
                          <th className="p-2.5">Quem Baixou</th>
                          <th className="p-2.5 text-right">Valor</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800 text-zinc-650 dark:text-zinc-350">
                        {repPaidExpenses.map(d => (
                          <tr key={d.id} className="hover:bg-zinc-50/50">
                            <td className="p-2.5 font-semibold text-zinc-800 dark:text-zinc-200">{d.descricao}</td>
                            <td className="p-2.5 font-medium">{fmtDT(d.data_pagamento || d.data_vencimento)}</td>
                            <td className="p-2.5 text-[11px]">
                              <span>{d.baixado_por || "Sistema"}</span>
                              {d.baixado_em && (
                                <span className="block text-[9px] text-zinc-400">
                                  {new Date(d.baixado_em).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}
                                </span>
                              )}
                            </td>
                            <td className="p-2.5 text-right font-bold text-emerald-650 dark:text-emerald-450 font-mono">{fmtBRL(Number(d.valor))}</td>
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

      {/* DIALOG: CREATE / EDIT EXPENSE */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="w-[92%] sm:max-w-lg bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-100 rounded-2xl shadow-xl overflow-y-auto max-h-[92vh] p-5 sm:p-6 border border-zinc-250 dark:border-zinc-800">
          <DialogHeader className="pb-3 border-b border-zinc-150 dark:border-zinc-800">
            <DialogTitle className="text-lg font-bold text-zinc-900 dark:text-zinc-50">
              {editingId ? "Editar Despesa" : "Nova Despesa"}
            </DialogTitle>
            <DialogDescription className="sr-only">
              Formulário para criar ou editar os dados de contas a pagar e despesas financeiras.
            </DialogDescription>
          </DialogHeader>

          {/* SECURITY: PAID STATUS WARNING BANNER */}
          {editingId && (form.status === "Pago" || form.pago) && (
            <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-250 dark:border-amber-900/60 p-3.5 rounded-xl text-xs text-amber-800 dark:text-amber-400 flex flex-col gap-2 shadow-sm my-1">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 text-amber-500 mt-0.5" />
                <div>
                  <span className="font-bold">⚠️ Esta despesa já foi paga.</span> Os dados fundamentais de valor e vencimento estão bloqueados para auditoria e controle de integridade financeira.
                </div>
              </div>
              <div className="flex justify-end mt-1">
                <Button 
                  size="sm" 
                  variant="outline" 
                  onClick={() => triggerRevertPayment(editingId)}
                  className="bg-amber-100 hover:bg-amber-200 dark:bg-amber-950/40 dark:hover:bg-amber-900/50 text-amber-800 dark:text-amber-400 text-[10px] font-bold py-1 h-7 border-amber-300 dark:border-amber-800 flex items-center gap-1 rounded-md"
                >
                  <RefreshCw className="w-3 h-3" /> Estornar Baixa (Liberar Edição)
                </Button>
              </div>
            </div>
          )}

          {/* WHO/WHEN INFORMATION BANNER */}
          {editingId && (form.status === "Pago" || form.pago) && form.baixado_por && (
            <div className="bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-850 px-3.5 py-2.5 rounded-xl text-[11px] text-zinc-500 dark:text-zinc-400 flex items-center justify-between">
              <span><b>Baixado por:</b> {form.baixado_por}</span>
              {form.baixado_em && (
                <span><b>Em:</b> {new Date(form.baixado_em).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}</span>
              )}
            </div>
          )}

          <div className="space-y-4 py-3">
            <div>
              <Label className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">Descrição</Label>
              <Input
                value={form.descricao}
                onChange={(e) => setForm({ ...form, descricao: e.target.value })}
                disabled={editingId && (form.status === "Pago" || form.pago)}
                placeholder="Ex: Aluguel do salão"
                className="mt-1 bg-zinc-50 dark:bg-zinc-950 border-zinc-250 dark:border-zinc-800 rounded-lg"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">Valor</Label>
                <Input
                  type="text"
                  value={form.valor}
                  onChange={(e) => setForm({ ...form, valor: e.target.value })}
                  disabled={editingId && (form.status === "Pago" || form.pago)}
                  placeholder="0,00"
                  className="mt-1 bg-zinc-50 dark:bg-zinc-950 border-zinc-250 dark:border-zinc-800 rounded-lg"
                />
              </div>
              <div>
                <Label className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">Tipo</Label>
                <Select 
                  value={form.tipo} 
                  onValueChange={(v) => setForm({ ...form, tipo: v })}
                  disabled={editingId && (form.status === "Pago" || form.pago)}
                >
                  <SelectTrigger className="mt-1 bg-zinc-50 dark:bg-zinc-950 border-zinc-250 dark:border-zinc-800 rounded-lg">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="fixo">Fixa</SelectItem>
                    <SelectItem value="variavel">Variável</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-xs font-semibold text-zinc-550 dark:text-zinc-400">Fornecedor</Label>
                <Select
                  value={form.fornecedor || "sem_fornecedor"}
                  onValueChange={(val) => setForm({ ...form, fornecedor: val === "sem_fornecedor" ? "" : val })}
                  disabled={editingId && (form.status === "Pago" || form.pago)}
                >
                  <SelectTrigger className="mt-1 bg-zinc-50 dark:bg-zinc-950 border-zinc-250 dark:border-zinc-800 rounded-lg text-xs h-10 w-full text-left">
                    <SelectValue placeholder="Selecione o fornecedor..." />
                  </SelectTrigger>
                  <SelectContent className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-800 dark:text-zinc-150 rounded-xl max-h-56">
                    <SelectItem value="sem_fornecedor" className="text-zinc-400 dark:text-zinc-500">Sem Fornecedor</SelectItem>
                    {fornecedoresList.map((f) => (
                      <SelectItem key={f.id} value={f.nome_razosocial}>
                        {f.nome_razosocial}
                      </SelectItem>
                    ))}
                    {form.fornecedor && form.fornecedor !== "sem_fornecedor" && !fornecedoresList.some(f => f.nome_razosocial === form.fornecedor) && (
                      <SelectItem value={form.fornecedor}>
                        {form.fornecedor} (Histórico/Não Cadastrado)
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
                  disabled={editingId && (form.status === "Pago" || form.pago)}
                  placeholder="Ex: NF-12345"
                  className="mt-1 bg-zinc-50 dark:bg-zinc-950 border-zinc-250 dark:border-zinc-800 rounded-lg text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">Categoria</Label>
                <Select 
                  value={form.categoria || "Nenhuma"} 
                  onValueChange={(v) => setForm({ ...form, categoria: v === "Nenhuma" ? "" : v })}
                  disabled={editingId && (form.status === "Pago" || form.pago)}
                >
                  <SelectTrigger className="mt-1 bg-zinc-50 dark:bg-zinc-950 border-zinc-250 dark:border-zinc-800 rounded-lg text-xs">
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Nenhuma">Nenhuma</SelectItem>
                    {CATEGORIAS.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">Status</Label>
                <Select 
                  value={form.status} 
                  onValueChange={(v) => setForm({ ...form, status: v, pago: v === "Pago" })}
                  disabled={editingId && (form.status === "Pago" || form.pago)}
                >
                  <SelectTrigger className="mt-1 bg-zinc-50 dark:bg-zinc-950 border-zinc-250 dark:border-zinc-800 rounded-lg text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Aberto">Em Aberto</SelectItem>
                    <SelectItem value="Pago">Pago</SelectItem>
                    <SelectItem value="Cancelado">Cancelado</SelectItem>
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
                  disabled={editingId && (form.status === "Pago" || form.pago)}
                  className="mt-1 bg-zinc-50 dark:bg-zinc-950 border-zinc-250 dark:border-zinc-800 rounded-lg text-xs"
                />
              </div>

              <div>
                <Label className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">Vencimento</Label>
                <Input
                  type="date"
                  value={form.data_vencimento}
                  onChange={(e) => setForm({ ...form, data_vencimento: e.target.value })}
                  disabled={editingId && (form.status === "Pago" || form.pago)}
                  className="mt-1 bg-zinc-50 dark:bg-zinc-950 border-zinc-250 dark:border-zinc-800 rounded-lg text-xs"
                />
              </div>

              <div>
                <Label className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">Pagamento</Label>
                <Input
                  type="date"
                  value={form.data_pagamento}
                  onChange={(e) => setForm({ ...form, data_pagamento: e.target.value })}
                  disabled={(editingId && (form.status === "Pago" || form.pago)) || form.status !== "Pago"}
                  className="mt-1 bg-zinc-50 dark:bg-zinc-950 border-zinc-250 dark:border-zinc-800 rounded-lg text-xs disabled:opacity-50"
                />
              </div>
            </div>

            <div>
              <Label className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">Observações</Label>
              <textarea
                value={form.observacoes}
                onChange={(e) => setForm({ ...form, observacoes: e.target.value })}
                placeholder="Notas adicionais, detalhes de parcelamento..."
                rows="2"
                className="w-full mt-1 p-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-250 dark:border-zinc-800 rounded-lg text-xs outline-none focus:border-[#84A59D] transition-colors resize-none"
              />
            </div>
          </div>
          
          <DialogFooter className="gap-2 pt-3 border-t border-zinc-150 dark:border-zinc-800">
            <Button variant="outline" onClick={() => setDialogOpen(false)} className="rounded-lg h-10 text-xs">
              Cancelar
            </Button>
            
            {!(editingId && (form.status === "Pago" || form.pago)) ? (
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

      {/* DIALOG: PAYMENT WRITE-OFF (BAIXA DE PAGAMENTO) */}
      <Dialog open={paymentConfirmOpen} onOpenChange={setPaymentConfirmOpen}>
        <DialogContent className="w-[92%] sm:max-w-md bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-100 rounded-2xl shadow-xl p-5 sm:p-6 border border-zinc-250 dark:border-zinc-800">
          <DialogHeader className="pb-2 border-b border-zinc-150 dark:border-zinc-800">
            <DialogTitle className="text-base font-bold flex items-center gap-1.5 text-zinc-900 dark:text-zinc-50">
              <Check className="w-5 h-5 text-emerald-500" />
              <span>Confirmar Baixa de Pagamento</span>
            </DialogTitle>
            <DialogDescription className="sr-only">
              Confirme a baixa de pagamento da despesa informando a data correspondente.
            </DialogDescription>
          </DialogHeader>
          
          {paymentExpense && (
            <div className="py-4 space-y-4">
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Você está prestes a registrar a baixa de pagamento da seguinte despesa. Esta ação registrará o seu nome de usuário e a data/hora exata do registro para fins de auditoria interna.
              </p>
              
              <div className="bg-zinc-50 dark:bg-zinc-950 p-4 rounded-xl space-y-2 border border-zinc-200 dark:border-zinc-850">
                <div className="text-xs"><span className="text-zinc-400 font-semibold uppercase block text-[10px]">Despesa</span> <b className="text-zinc-800 dark:text-zinc-100">{paymentExpense.descricao}</b></div>
                <div className="grid grid-cols-2 gap-2 mt-2">
                  <div className="text-xs"><span className="text-zinc-400 font-semibold uppercase block text-[10px]">Valor</span> <b className="text-emerald-600 font-mono">{fmtBRL(paymentExpense.valor)}</b></div>
                  <div className="text-xs"><span className="text-zinc-400 font-semibold uppercase block text-[10px]">Vencimento</span> <b>{fmtDT(paymentExpense.data_vencimento)}</b></div>
                </div>
              </div>

              <div>
                <Label className="text-xs font-bold text-zinc-650 dark:text-zinc-350">Data do Pagamento Efetuado</Label>
                <Input
                  type="date"
                  value={paymentDate}
                  onChange={(e) => setPaymentDate(e.target.value)}
                  className="mt-1.5 h-10 bg-zinc-50 dark:bg-zinc-950 border-zinc-250 dark:border-zinc-800 rounded-lg text-xs"
                />
              </div>
            </div>
          )}

          <DialogFooter className="gap-2 pt-3 border-t border-zinc-150 dark:border-zinc-800">
            <Button variant="outline" onClick={() => { setPaymentConfirmOpen(false); setPaymentExpense(null); }} className="rounded-lg text-xs h-10">
              Cancelar
            </Button>
            <Button onClick={confirmPaymentWriteOff} className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs h-10 flex items-center gap-1 font-bold">
              <Check className="w-4 h-4" /> Confirmar Pagamento
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* DIALOG: CONFIRM DELETE */}
      <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <DialogContent className="sm:max-w-md bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-100 rounded-2xl shadow-xl p-6 border border-zinc-250 dark:border-zinc-800">
          <DialogHeader>
            <DialogTitle className="text-zinc-900 dark:text-zinc-50">Confirmar Exclusão</DialogTitle>
            <DialogDescription className="sr-only">
              Deseja confirmar a exclusão desta despesa? Ela poderá ser recuperada no painel de excluídos.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
            Tem certeza que deseja excluir esta despesa? Ela será enviada para o painel de "Excluídos", onde poderá ser auditada ou restaurada a qualquer momento.
          </div>
          <DialogFooter className="gap-2 pt-2">
            <Button variant="outline" onClick={() => setDeleteConfirmOpen(false)} className="rounded-lg text-xs h-10">
              Cancelar
            </Button>
            <Button onClick={confirmDelete} className="bg-rose-500 hover:bg-rose-600 text-white rounded-lg text-xs h-10 font-bold">
              Excluir despesa
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
              <span>Confirmar Estorno de Baixa</span>
            </DialogTitle>
            <DialogDescription className="sr-only">
              Deseja confirmar o estorno de pagamento desta despesa?
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
            Tem certeza que deseja estornar o pagamento desta despesa? O título voltará para o status **"Em Aberto"**, todos os logs de auditoria de baixa serão limpos, e os campos de valor/vencimento serão desbloqueados para edição ou exclusão.
          </div>
          <DialogFooter className="gap-2 pt-3 border-t border-zinc-150 dark:border-zinc-800">
            <Button variant="outline" onClick={() => setRevertConfirmOpen(false)} className="rounded-lg text-xs h-10">
              Cancelar
            </Button>
            <Button onClick={handleRevertPayment} className="bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-xs h-10 font-bold">
              Confirmar Estorno
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AuditModal 
        isOpen={auditOpen} 
        onClose={() => setAuditOpen(false)} 
        modulo="despesa" 
        tituloModulo="Despesas" 
        onRestoreSuccess={load}
      />
    </div>
  );
}
