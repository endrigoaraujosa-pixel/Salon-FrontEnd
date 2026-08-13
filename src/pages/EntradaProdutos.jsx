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
  
  // Natureza da Operação & Integração Financeira States
  const [naturezaOperacao, setNaturezaOperacao] = useState("compra_prazo");
  const [gerarFinanceiro, setGerarFinanceiro] = useState(true);
  const [condicaoPagamento, setCondicaoPagamento] = useState("avista");
  const [qtdParcelas, setQtdParcelas] = useState("1");
  const [vencimentoPrimeiraParcela, setVencimentoPrimeiraParcela] = useState(getTodayDateString());
  const [categoriaDespesa, setCategoriaDespesa] = useState("Suprimentos");

  // Items List
  const [itens, setItens] = useState([]);
  
  // Current Item Form
  const [selectedProdutoId, setSelectedProdutoId] = useState("");
  const [itemQuantidade, setItemQuantidade] = useState("");
  const [itemValorCusto, setItemValorCusto] = useState("");

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

  const handleNaturezaChange = (val) => {
    setNaturezaOperacao(val);
    const nonFinancialOps = ["bonificacao", "garantia", "troca", "transferencia"];
    if (nonFinancialOps.includes(val)) {
      setGerarFinanceiro(false);
    } else {
      setGerarFinanceiro(true);
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
    setNaturezaOperacao("compra_prazo");
    setGerarFinanceiro(true);
    setCondicaoPagamento("avista");
    setQtdParcelas("1");
    setVencimentoPrimeiraParcela(getTodayDateString());
    setCategoriaDespesa("Suprimentos");
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
        natureza_operacao: naturezaOperacao,
        gerar_financeiro: gerarFinanceiro,
        condicao_pagamento: condicaoPagamento,
        qtd_parcelas: parseInt(qtdParcelas) || 1,
        vencimento_primeira_parcela: vencimentoPrimeiraParcela || dataEntrada,
        categoria_despesa: categoriaDespesa || "Suprimentos",
        itens: itens.map(item => ({
          produto_id: item.produto_id,
          quantidade: item.quantidade,
          valor_custo: item.valor_custo
        }))
      };

      await http.post("/estoque/entradas", payload);

      if (naturezaOperacao === "compra_prazo" && gerarFinanceiro) {
        const nParc = parseInt(qtdParcelas) || 1;
        toast.success(`Entrada registrada e ${nParc} parcela(s) em aberto gerada(s) no Contas a Pagar!`);
      } else if (naturezaOperacao === "compra_vista" && gerarFinanceiro) {
        toast.success("Entrada registrada e despesa quitada gerada no Contas a Pagar!");
      } else {
        toast.success("Entrada de estoque registrada com sucesso (sem lançamento financeiro)!");
      }
      
      setLoading(false);
      resetAll();
      navigate("/estoque");
    } catch (error) {
      setLoading(false);
      const msg = error.response?.data?.detail || "Erro ao registrar a entrada de produtos.";
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
              <Label className="text-xs font-semibold text-zinc-650 dark:text-zinc-400">Natureza da Operação / Tipo *</Label>
              <div className="mt-1">
                <Select value={naturezaOperacao} onValueChange={handleNaturezaChange}>
                  <SelectTrigger className="w-full text-xs font-medium">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
                    <SelectItem value="compra_prazo">Compra a Prazo (Gera Contas a Pagar)</SelectItem>
                    <SelectItem value="compra_vista">Compra à Vista (Gera Lançamento Quitado)</SelectItem>
                    <SelectItem value="bonificacao">Bonificação / Brinde (Sem Financeiro)</SelectItem>
                    <SelectItem value="garantia">Reposição em Garantia (Sem Financeiro)</SelectItem>
                    <SelectItem value="troca">Troca / Devolução (Sem Financeiro)</SelectItem>
                    <SelectItem value="transferencia">Transferência entre Unidades (Sem Financeiro)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Integração Financeira Card */}
            <div className="p-3.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-950/40 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
                  <DollarSign className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  Gerar no Contas a Pagar
                </span>
                <input
                  type="checkbox"
                  checked={gerarFinanceiro}
                  onChange={(e) => setGerarFinanceiro(e.target.checked)}
                  disabled={["bonificacao", "garantia", "troca", "transferencia"].includes(naturezaOperacao)}
                  className="w-4 h-4 text-emerald-600 rounded border-zinc-300 focus:ring-emerald-500 cursor-pointer"
                />
              </div>

              {gerarFinanceiro && naturezaOperacao === "compra_prazo" && (
                <div className="space-y-3 pt-2 border-t border-zinc-200 dark:border-zinc-800 animate-in fade-in duration-200">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-[11px] font-semibold text-zinc-600 dark:text-zinc-400">Parcelas</Label>
                      <Select value={String(qtdParcelas)} onValueChange={setQtdParcelas}>
                        <SelectTrigger className="h-9 text-xs mt-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
                          <SelectItem value="1">1x (30 dias)</SelectItem>
                          <SelectItem value="2">2x (30/60 dias)</SelectItem>
                          <SelectItem value="3">3x (30/60/90 dias)</SelectItem>
                          <SelectItem value="4">4x</SelectItem>
                          <SelectItem value="5">5x</SelectItem>
                          <SelectItem value="6">6x</SelectItem>
                          <SelectItem value="10">10x</SelectItem>
                          <SelectItem value="12">12x</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label className="text-[11px] font-semibold text-zinc-600 dark:text-zinc-400">Venc. 1ª Parcela</Label>
                      <Input
                        type="date"
                        value={vencimentoPrimeiraParcela}
                        onChange={(e) => setVencimentoPrimeiraParcela(e.target.value)}
                        className="h-9 text-xs mt-1"
                      />
                    </div>
                  </div>

                  <div>
                    <Label className="text-[11px] font-semibold text-zinc-600 dark:text-zinc-400">Categoria Financeira</Label>
                    <Input
                      value={categoriaDespesa}
                      onChange={(e) => setCategoriaDespesa(e.target.value)}
                      placeholder="Ex: Suprimentos"
                      className="h-9 text-xs mt-1"
                    />
                  </div>

                  {valorTotalNota > 0 && (
                    <div className="bg-emerald-50/50 dark:bg-emerald-950/20 p-2.5 rounded-lg border border-emerald-200 dark:border-emerald-900/50 text-[11px] text-emerald-800 dark:text-emerald-300">
                      <span className="font-bold">Previsão: </span>
                      {parseInt(qtdParcelas) || 1} parcela(s) de {fmtBRL(valorTotalNota / (parseInt(qtdParcelas) || 1))}
                    </div>
                  )}
                </div>
              )}

              {gerarFinanceiro && naturezaOperacao === "compra_vista" && (
                <div className="pt-2 border-t border-zinc-200 dark:border-zinc-800 space-y-2 animate-in fade-in duration-200">
                  <p className="text-[11px] text-emerald-700 dark:text-emerald-400 font-medium">
                    ✓ Será gerada 1 despesa com status <span className="font-bold uppercase">Pago</span> na data da entrada ({dataEntrada}).
                  </p>
                  <div>
                    <Label className="text-[11px] font-semibold text-zinc-600 dark:text-zinc-400">Categoria Financeira</Label>
                    <Input
                      value={categoriaDespesa}
                      onChange={(e) => setCategoriaDespesa(e.target.value)}
                      placeholder="Ex: Suprimentos"
                      className="h-9 text-xs mt-1"
                    />
                  </div>
                </div>
              )}

              {!gerarFinanceiro && (
                <p className="text-[11px] text-amber-700 dark:text-amber-400 font-medium pt-1">
                  ⓘ Entrada sem custo financeiro. Apenas o saldo em estoque e custo serão atualizados.
                </p>
              )}
            </div>

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
    </div>
  );
}
