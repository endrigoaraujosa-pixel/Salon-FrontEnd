import React, { useState, useEffect } from "react";
import http from "../api";
import { PageHeader } from "../components/Page";
import SearchableSelect from "../components/SearchableSelect";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Textarea } from "../components/ui/textarea";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "../components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "../components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../components/ui/table";
import { 
  Package, Plus, Trash2, Calendar, FileText, CheckCircle, 
  HelpCircle, DollarSign, User, ListPlus, ArrowLeft, RefreshCw 
} from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

const fmtBRL = (n) => (n || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const getTodayDateString = () => new Date().toLocaleDateString('en-CA');

export default function EntradaProdutos() {
  const navigate = useNavigate();
  const [produtos, setProdutos] = useState([]);
  const [fornecedores, setFornecedores] = useState([]);
  const [loading, setLoading] = useState(false);

  // Entrada Form States
  const [fornecedorId, setFornecedorId] = useState("");
  const [fornecedorNome, setFornecedorNome] = useState("");
  const [dataEntrada, setDataEntrada] = useState(getTodayDateString());
  const [numeroNota, setNumeroNota] = useState("");
  const [serieNota, setSerieNota] = useState("");
  const [observacoes, setObservacoes] = useState("");
  
  // Items List
  const [itens, setItens] = useState([]);
  
  // Current Item Form
  const [selectedProdutoId, setSelectedProdutoId] = useState("");
  const [itemQuantidade, setItemQuantidade] = useState("");
  const [itemValorCusto, setItemValorCusto] = useState("");

  // Post-entry Contas a Pagar Prompt Dialog
  const [promptOpen, setPromptOpen] = useState(false);
  const [savedEntrada, setSavedEntrada] = useState(null);

  // Contas a Pagar (Despesa) Modal Form
  const [expenseDialogOpen, setExpenseDialogOpen] = useState(false);
  const [expenseForm, setExpenseForm] = useState({
    descricao: "",
    valor: "",
    tipo: "variavel",
    categoria: "Estoque",
    data_documento: "",
    data_vencimento: "",
    pago: false,
    status: "Aberto",
    numero_documento: "",
    fornecedor: "",
    observacoes: ""
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [prodRes, fornRes] = await Promise.all([
        http.get("/produtos"),
        http.get("/fornecedores")
      ]);
      setProdutos(prodRes.data.filter(p => p.deletado !== "S"));
      setFornecedores(fornRes.data.filter(f => f.deletado !== "S"));
    } catch (error) {
      toast.error("Erro ao carregar dados de produtos e fornecedores.");
    }
  };

  const handleFornecedorChange = (value) => {
    setFornecedorId(value);
    if (value === "manual") {
      setFornecedorNome("");
    } else {
      const f = fornecedores.find(x => x.id === value);
      setFornecedorNome(f ? f.nome_razosocial : "");
    }
  };

  const handleAddProduto = () => {
    if (!selectedProdutoId) {
      toast.error("Selecione um produto.");
      return;
    }
    const qte = parseFloat(itemQuantidade);
    if (isNaN(qte) || qte <= 0) {
      toast.error("A quantidade deve ser maior que zero.");
      return;
    }
    const custo = parseFloat(itemValorCusto);
    if (isNaN(custo) || custo < 0) {
      toast.error("O custo não pode ser negativo.");
      return;
    }

    const prod = produtos.find(p => p.id === selectedProdutoId);
    if (!prod) return;

    // Check if product is already in the entry items list
    const existingIndex = itens.findIndex(item => item.produto_id === selectedProdutoId);
    if (existingIndex >= 0) {
      const updated = [...itens];
      const newQte = updated[existingIndex].quantidade + qte;
      updated[existingIndex].quantidade = Number(newQte.toFixed(3));
      // update cost to latest cost entered
      updated[existingIndex].valor_custo = custo;
      updated[existingIndex].subtotal = Number((newQte * custo).toFixed(2));
      setItens(updated);
    } else {
      setItens([...itens, {
        produto_id: selectedProdutoId,
        produto_nome: prod.nome,
        unidade_medida: prod.unidade_medida || "un",
        quantidade: Number(qte.toFixed(3)),
        valor_custo: custo,
        subtotal: Number((qte * custo).toFixed(2))
      }]);
    }

    // Reset current item fields
    setSelectedProdutoId("");
    setItemQuantidade("");
    setItemValorCusto("");
    toast.success("Produto adicionado à lista.");
  };

  const handleRemoveItem = (index) => {
    setItens(itens.filter((_, i) => i !== index));
  };

  const valorTotalNota = itens.reduce((sum, item) => sum + item.subtotal, 0);

  const resetAll = () => {
    setFornecedorId("");
    setFornecedorNome("");
    setDataEntrada(getTodayDateString());
    setNumeroNota("");
    setSerieNota("");
    setObservacoes("");
    setItens([]);
    setSelectedProdutoId("");
    setItemQuantidade("");
    setItemValorCusto("");
  };

  const handleSaveEntrada = async () => {
    if (!fornecedorNome.trim()) {
      toast.error("Por favor, preencha ou selecione o fornecedor.");
      return;
    }
    if (!numeroNota.trim()) {
      toast.error("Por favor, preencha o Número da Nota (NF).");
      return;
    }
    if (!serieNota.trim()) {
      toast.error("Por favor, preencha a Série da Nota Fiscal.");
      return;
    }
    if (!dataEntrada) {
      toast.error("Informe a data da entrada.");
      return;
    }
    if (itens.length === 0) {
      toast.error("Adicione pelo menos um produto à entrada.");
      return;
    }

    setLoading(true);
    try {
      const payload = {
        fornecedor_id: fornecedorId === "manual" ? null : fornecedorId,
        fornecedor_nome: fornecedorNome.trim(),
        data_entrada: dataEntrada,
        numero_nota: numeroNota.trim(),
        serie_nota: serieNota.trim(),
        observacoes: observacoes,
        itens: itens.map(item => ({
          produto_id: item.produto_id,
          quantidade: item.quantidade,
          valor_custo: item.valor_custo
        }))
      };

      const res = await http.post("/estoque/entradas", payload);
      toast.success("Entrada de estoque registrada com sucesso!");
      
      const saved = res.data.entrada;
      setSavedEntrada(saved);
      
      // Open dialog asking if they want to generate an Accounts Payable (Contas a Pagar)
      setPromptOpen(true);
      setLoading(false);
    } catch (error) {
      setLoading(false);
      const msg = error.response?.data?.detail || "Erro ao registrar a entrada de produtos.";
      toast.error(msg);
    }
  };

  // If user says "NO" on accounts payable generation
  const handleCancelExpense = () => {
    setPromptOpen(false);
    resetAll();
    loadData();
    navigate("/estoque");
  };

  // If user says "YES" to generate expense
  const handleProceedToExpense = () => {
    setPromptOpen(false);
    
    // Auto-fill expense form fields
    setExpenseForm({
      descricao: `Entrada de Estoque - NF: ${savedEntrada.numero_nota || "S/N"} (Série: ${savedEntrada.serie_nota || "S/S"})`,
      valor: savedEntrada.valor_total,
      tipo: "variavel",
      categoria: "Suprimentos", // standard category from existing list
      data_documento: savedEntrada.data_entrada,
      data_vencimento: savedEntrada.data_entrada, // defaults to same date
      pago: false,
      status: "Aberto",
      numero_documento: `${savedEntrada.numero_nota} (Série: ${savedEntrada.serie_nota})`,
      fornecedor: savedEntrada.fornecedor_nome,
      observacoes: savedEntrada.observacoes || ""
    });

    setExpenseDialogOpen(true);
  };

  const handleSaveExpense = async () => {
    try {
      if (!expenseForm.descricao.trim()) {
        toast.error("Descrição da despesa é obrigatória.");
        return;
      }
      
      const valorStr = String(expenseForm.valor).replace(",", ".");
      const valorNum = parseFloat(valorStr);
      if (isNaN(valorNum) || valorNum <= 0) {
        toast.error("O valor da despesa deve ser maior que zero.");
        return;
      }

      const payload = {
        ...expenseForm,
        valor: valorNum,
        pago: expenseForm.status === "Pago"
      };

      await http.post("/despesas", payload);
      toast.success("Contas a Pagar gerado com sucesso!");
      setExpenseDialogOpen(false);
      resetAll();
      navigate("/estoque");
    } catch (error) {
      const msg = error.response?.data?.detail || "Erro ao salvar o Contas a Pagar.";
      toast.error(msg);
    }
  };

  const fornecedorOptions = [
    { value: "manual", label: "-- Inserir Nome Manualmente --" },
    ...fornecedores.map((f) => ({
      value: f.id,
      label: f.nome_razosocial
    }))
  ];

  const produtoOptions = produtos.map((p) => {
    const qtyPerUnit = Number(p.quantidade_por_unidade || 0);
    const qtyStr = qtyPerUnit > 0 
      ? `${Number((p.quantidade_estoque / qtyPerUnit).toFixed(2))} ${p.unidade_medida || 'un'} (${Number(p.quantidade_estoque.toFixed(3))} ${p.unidade_medida_insumo || 'un'})`
      : `${Number(p.quantidade_estoque.toFixed(3))} ${p.unidade_medida || 'un'}`;
    return {
      value: p.id,
      label: `${p.nome} (${p.unidade_medida || "un"}) - Estoque atual: ${qtyStr}`
    };
  });

  return (
    <div className="p-4 sm:p-6 lg:p-8 fade-in min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-800 dark:text-zinc-200">
      <PageHeader 
        overline="Estoque" 
        title="Entrada de Produtos" 
        action={
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              onClick={() => navigate("/relatorios?tab=estoque_entradas")} 
              className="flex items-center gap-1.5 border-zinc-250 dark:border-zinc-850 text-emerald-700 dark:text-emerald-400 bg-emerald-50/50 dark:bg-emerald-950/20 hover:bg-emerald-100"
            >
              <FileText className="w-4 h-4 text-emerald-600" /> Relatório de Entradas
            </Button>
            <Button 
              variant="outline" 
              onClick={() => navigate("/estoque")} 
              className="flex items-center gap-1.5 border-zinc-250 dark:border-zinc-850"
            >
              <ArrowLeft className="w-4 h-4" /> Voltar para Estoque
            </Button>
          </div>
        } 
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-4">
        {/* Left Side: Header Entry Form */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-800 rounded-xl p-5 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider flex items-center gap-1.5 border-b pb-2">
              <FileText className="w-4 h-4 text-[#84A59D]" />
              Dados da Nota / Entrada
            </h3>

            <div>
              <Label className="text-xs font-semibold text-zinc-650 dark:text-zinc-400">Fornecedor *</Label>
              <div className="mt-1">
                <SearchableSelect
                  options={fornecedorOptions}
                  value={fornecedorId}
                  onValueChange={handleFornecedorChange}
                  placeholder="Selecione o Fornecedor..."
                  searchPlaceholder="Buscar fornecedor..."
                  emptyText="Nenhum fornecedor encontrado."
                />
              </div>
            </div>

            {fornecedorId === "manual" && (
              <div className="animate-in slide-in-from-top-1 duration-200">
                <Label className="text-xs font-semibold text-zinc-650 dark:text-zinc-400">Nome do Fornecedor Manual *</Label>
                <Input 
                  value={fornecedorNome} 
                  onChange={(e) => setFornecedorNome(e.target.value)} 
                  placeholder="Nome Fantasia / Razão Social" 
                  className="mt-1" 
                />
              </div>
            )}

            <div>
              <Label className="text-xs font-semibold text-zinc-650 dark:text-zinc-400">Data da Entrada *</Label>
              <div className="relative mt-1">
                <Input 
                  type="date" 
                  value={dataEntrada} 
                  onChange={(e) => setDataEntrada(e.target.value)} 
                  className="w-full"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-xs font-semibold text-zinc-650 dark:text-zinc-400">Número da Nota (NF) *</Label>
                <Input 
                  value={numeroNota} 
                  onChange={(e) => setNumeroNota(e.target.value)} 
                  placeholder="Ex: 48921" 
                  className="mt-1 font-mono" 
                />
              </div>

              <div>
                <Label className="text-xs font-semibold text-zinc-650 dark:text-zinc-400">Série da Nota Fiscal *</Label>
                <Input 
                  value={serieNota} 
                  onChange={(e) => setSerieNota(e.target.value)} 
                  placeholder="Ex: 1" 
                  className="mt-1 font-mono" 
                />
              </div>
            </div>

            <div>
              <Label className="text-xs font-semibold text-zinc-650 dark:text-zinc-400">Observações da Entrada</Label>
              <Textarea 
                value={observacoes} 
                onChange={(e) => setObservacoes(e.target.value)} 
                placeholder="Observações complementares..." 
                className="mt-1 h-20 resize-none" 
              />
            </div>
          </div>
        </div>

        {/* Right Side: Adding Products & Table */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-800 rounded-xl p-5 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider flex items-center gap-1.5 border-b pb-2">
              <ListPlus className="w-4 h-4 text-[#84A59D]" />
              Adicionar Produtos da Entrada
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
              <div className="md:col-span-4">
                <Label className="text-xs font-semibold text-zinc-650 dark:text-zinc-400">Produto *</Label>
                <div className="mt-1">
                  <SearchableSelect
                    options={produtoOptions}
                    value={selectedProdutoId}
                    onValueChange={setSelectedProdutoId}
                    placeholder="Selecione o Produto..."
                    searchPlaceholder="Buscar produto..."
                    emptyText="Nenhum produto encontrado."
                  />
                </div>
              </div>

              <div className="md:col-span-2">
                <Label className="text-xs font-semibold text-zinc-650 dark:text-zinc-400">Qtd *</Label>
                <Input 
                  type="number" 
                  step="0.001" 
                  value={itemQuantidade} 
                  onChange={(e) => setItemQuantidade(e.target.value)} 
                  placeholder="1"
                  className="mt-1 font-mono"
                />
              </div>

              <div className="md:col-span-2">
                <Label className="text-xs font-semibold text-zinc-650 dark:text-zinc-400">Custo *</Label>
                <Input 
                  type="number" 
                  step="0.01" 
                  value={itemValorCusto} 
                  onChange={(e) => setItemValorCusto(e.target.value)} 
                  placeholder="0,00"
                  className="mt-1 font-mono"
                />
              </div>

              <div className="md:col-span-2">
                <Label className="text-xs font-semibold text-zinc-650 dark:text-zinc-400">Subtotal</Label>
                <div className="h-10 border border-zinc-300 dark:border-zinc-800 rounded-lg bg-zinc-50/50 dark:bg-zinc-950/20 px-3 flex items-center justify-end font-mono text-sm font-semibold tracking-tight text-zinc-700 dark:text-zinc-300 mt-1">
                  {fmtBRL((parseFloat(itemQuantidade) || 0) * (parseFloat(itemValorCusto) || 0))}
                </div>
              </div>

              <div className="md:col-span-2">
                <Button 
                  onClick={handleAddProduto} 
                  type="button" 
                  className="w-full h-10 bg-[#84A59D] hover:bg-[#6F9189] text-white flex items-center justify-center gap-1.5 font-bold shadow-xs rounded-lg"
                >
                  <Plus className="w-4 h-4" /> Adicionar
                </Button>
              </div>
            </div>
          </div>

          {/* Table list of Items added */}
          <div className="bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-800 rounded-xl shadow-sm overflow-hidden flex flex-col">
            <div className="px-5 py-4 border-b border-zinc-150 dark:border-zinc-850 bg-zinc-50/30 dark:bg-zinc-900/10 flex items-center justify-between shrink-0">
              <h3 className="font-semibold text-zinc-800 dark:text-zinc-200 text-sm">Itens da Entrada ({itens.length})</h3>
              <div className="text-right">
                <span className="text-xs text-zinc-450 dark:text-zinc-500 mr-2 uppercase tracking-wider font-bold">Total da Entrada</span>
                <span className="font-display text-lg font-black text-[#3A4F4A] dark:text-[#EAF0EE]">{fmtBRL(valorTotalNota)}</span>
              </div>
            </div>

            <div className="flex-1 overflow-x-auto min-h-60 max-h-96">
              <Table>
                <TableHeader className="bg-zinc-50/50 dark:bg-zinc-950/25">
                  <TableRow>
                    <TableHead className="font-semibold text-zinc-600 dark:text-zinc-400">Produto</TableHead>
                    <TableHead className="text-right font-semibold text-zinc-600 dark:text-zinc-400">Qtd. Adicionada</TableHead>
                    <TableHead className="text-right font-semibold text-zinc-600 dark:text-zinc-400">Valor de Custo</TableHead>
                    <TableHead className="text-right font-semibold text-zinc-600 dark:text-zinc-400">Subtotal</TableHead>
                    <TableHead className="w-10"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {itens.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-12 text-zinc-400 dark:text-zinc-500 text-sm">
                        <Package className="w-8 h-8 mx-auto mb-2 opacity-30" />
                        Nenhum produto adicionado. Use os campos acima para incluir os itens da nota fiscal.
                      </TableCell>
                    </TableRow>
                  ) : (
                    itens.map((item, index) => (
                      <TableRow key={index} className="hover:bg-zinc-50/50 transition-colors">
                        <TableCell className="font-medium">{item.produto_nome}</TableCell>
                        <TableCell className="text-right font-mono font-medium text-zinc-700 dark:text-zinc-300">
                          {item.quantidade} {item.unidade_medida}
                        </TableCell>
                        <TableCell className="text-right font-mono text-zinc-600 dark:text-zinc-400">
                          {fmtBRL(item.valor_custo)}
                        </TableCell>
                        <TableCell className="text-right font-mono font-bold text-zinc-800 dark:text-zinc-200">
                          {fmtBRL(item.subtotal)}
                        </TableCell>
                        <TableCell className="text-center">
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={() => handleRemoveItem(index)}
                            className="h-8 w-8 text-rose-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/20 rounded-md"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>

            <div className="px-5 py-4 border-t border-zinc-150 dark:border-zinc-850 bg-zinc-50/30 dark:bg-zinc-900/10 flex justify-end gap-3 shrink-0">
              <Button 
                variant="outline" 
                onClick={resetAll} 
                className="border-zinc-300 hover:bg-zinc-100 dark:border-zinc-800 dark:hover:bg-zinc-900"
              >
                Limpar Tudo
              </Button>
              <Button 
                onClick={handleSaveEntrada} 
                disabled={loading || itens.length === 0} 
                className="bg-[#3A4F4A] hover:bg-[#2b3a37] text-white font-bold px-6 shadow-sm rounded-lg flex items-center gap-1.5"
              >
                {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                Registrar Entrada
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Post Entry - Generation of Contas a Pagar Prompt */}
      <Dialog open={promptOpen} onOpenChange={setPromptOpen}>
        <DialogContent className="w-[95vw] max-w-[95vw] sm:max-w-md bg-white dark:bg-zinc-950 rounded-2xl border border-zinc-100 dark:border-zinc-800 shadow-2xl p-5 sm:p-6">
          <DialogHeader className="flex flex-col items-center text-center">
            <div className="w-12 h-12 rounded-full bg-[#EAF0EE] dark:bg-[#1a2e2a] flex items-center justify-center mb-3">
              <HelpCircle className="w-6 h-6 text-[#3A4F4A] dark:text-[#84A59D]" />
            </div>
            <DialogTitle className="font-display font-bold text-lg text-zinc-900 dark:text-zinc-50">
              Entrada Registrada com Sucesso!
            </DialogTitle>
            <DialogDescription className="text-xs text-zinc-450 dark:text-zinc-500 mt-1 leading-relaxed">
              O estoque e o custo unitário dos produtos foram atualizados.
            </DialogDescription>
          </DialogHeader>

          <div className="py-4 text-center text-sm font-semibold text-zinc-700 dark:text-zinc-300">
            Deseja gerar um Contas a Pagar para esta entrada?
          </div>

          <DialogFooter className="flex sm:flex-row gap-2 mt-2 w-full">
            <Button 
              variant="outline" 
              onClick={handleCancelExpense} 
              className="flex-1 border-zinc-250 dark:border-zinc-850 hover:bg-zinc-100"
            >
              Não
            </Button>
            <Button 
              onClick={handleProceedToExpense} 
              className="flex-1 bg-[#84A59D] hover:bg-[#6F9189] text-white font-semibold flex items-center justify-center gap-1"
            >
              Sim
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Accounts Payable (Contas a Pagar / Despesa) Prefilled Modal */}
      <Dialog open={expenseDialogOpen} onOpenChange={setExpenseDialogOpen}>
        <DialogContent className="w-[95vw] max-w-[95vw] sm:max-w-lg bg-white dark:bg-zinc-950 rounded-2xl border border-zinc-100 dark:border-zinc-800 p-0 overflow-hidden flex flex-col max-h-[90vh]">
          {/* Header */}
          <div className="px-6 pt-5 pb-4 border-b border-zinc-100 dark:border-zinc-800 shrink-0 bg-zinc-50/50 dark:bg-zinc-900/20">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2.5 text-base font-bold text-zinc-800 dark:text-zinc-100">
                <div className="p-1.5 bg-[#EAF0EE] dark:bg-[#1a2e2a] text-[#3A4F4A] dark:text-[#84A59D] rounded-lg">
                  <DollarSign className="w-5 h-5" />
                </div>
                <div>
                  <span className="block font-display text-base font-bold text-zinc-950 dark:text-zinc-50">Gerar Contas a Pagar</span>
                  <span className="text-[10px] text-zinc-400 dark:text-zinc-500 font-medium">Os campos foram preenchidos automaticamente. Revise antes de salvar.</span>
                </div>
              </DialogTitle>
            </DialogHeader>
          </div>

          {/* Form Content */}
          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
            <div>
              <Label className="text-xs font-semibold text-zinc-650 dark:text-zinc-400">Fornecedor</Label>
              <div className="mt-1 relative">
                <Input value={expenseForm.fornecedor} readOnly className="bg-zinc-100/60 dark:bg-zinc-900/40 text-zinc-550 border-zinc-200" />
                <User className="w-4 h-4 text-zinc-400 absolute right-3 top-3" />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label className="text-xs font-semibold text-zinc-650 dark:text-zinc-400">Valor Total (R$)</Label>
                <Input value={fmtBRL(expenseForm.valor)} readOnly className="mt-1 bg-zinc-100/60 dark:bg-zinc-900/40 text-zinc-550 font-mono font-bold" />
              </div>
              
              <div>
                <Label className="text-xs font-semibold text-zinc-650 dark:text-zinc-400">Data de Vencimento *</Label>
                <Input 
                  type="date" 
                  value={expenseForm.data_vencimento} 
                  onChange={(e) => setExpenseForm({ ...expenseForm, data_vencimento: e.target.value })} 
                  className="mt-1" 
                />
              </div>
            </div>

            <div>
              <Label className="text-xs font-semibold text-zinc-650 dark:text-zinc-400">Descrição do Contas a Pagar *</Label>
              <Input 
                value={expenseForm.descricao} 
                onChange={(e) => setExpenseForm({ ...expenseForm, descricao: e.target.value })} 
                placeholder="Ex: Compra de Estoque" 
                className="mt-1" 
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label className="text-xs font-semibold text-zinc-650 dark:text-zinc-400">Tipo de Despesa</Label>
                <Input value="Variável" readOnly className="mt-1 bg-zinc-100/60 dark:bg-zinc-900/40 text-zinc-550" />
              </div>
              <div>
                <Label className="text-xs font-semibold text-zinc-650 dark:text-zinc-400">Categoria Financeira</Label>
                <Input value="Suprimentos (Estoque)" readOnly className="mt-1 bg-zinc-100/60 dark:bg-zinc-900/40 text-zinc-550" />
              </div>
            </div>

            <div>
              <Label className="text-xs font-semibold text-zinc-650 dark:text-zinc-400 font-medium">Observações</Label>
              <Textarea 
                value={expenseForm.observacoes} 
                onChange={(e) => setExpenseForm({ ...expenseForm, observacoes: e.target.value })} 
                className="mt-1 h-16 resize-none" 
              />
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/20 shrink-0 flex gap-2 justify-end">
            <Button 
              type="button" 
              variant="outline" 
              className="border-zinc-300 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-900" 
              onClick={() => {
                setExpenseDialogOpen(false);
                resetAll();
                loadData();
                navigate("/produtos");
              }}
            >
              Cancelar Contas a Pagar
            </Button>
            <Button 
              onClick={handleSaveExpense} 
              className="bg-[#3A4F4A] hover:bg-[#2b3a37] text-white shadow-xs font-semibold px-6"
            >
              Salvar Contas a Pagar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
