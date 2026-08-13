import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import http from "../api";
import { PageHeader } from "../components/Page";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "../components/ui/dialog";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Switch } from "../components/ui/switch";
import { useAuth } from "../auth";
import SearchableSelect from "../components/SearchableSelect";
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from "../components/ui/tooltip";
import { 
  Package, PlusCircle, ClipboardCheck, ArrowUpRight, 
  AlertTriangle, DollarSign, TrendingUp, History, 
  ArrowRight, Layers, CheckCircle2, Search, ArrowDownRight, RefreshCw, Eye, ArrowUp, ArrowDown, HelpCircle, FileText
} from "lucide-react";
import { toast } from "sonner";

const fmtBRL = (n) => (n || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const fmtDT = (s) => s ? new Date(s).toLocaleString("pt-BR") : "-";

const TIPO_LABELS = {
  saida_manual: "Saída Manual",
  perda: "Perda",
  consumo_interno: "Consumo Interno",
  ajuste_positivo: "Ajuste Positivo",
  ajuste_negativo: "Ajuste Negativo",
  transferencia: "Transferência"
};

const defaultMovForm = {
  produto_id: "",
  tipo: "saida_manual",
  quantidade: "",
  motivo_id: "",
  observacao: ""
};

export default function Estoque() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [produtos, setProdutos] = useState([]);
  const [movimentacoes, setMovimentacoes] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filtros na listagem
  const [productSearch, setProductSearch] = useState("");
  const [onlyLowStock, setOnlyLowStock] = useState(false);

  // Dialog Movimentação
  const [movimentacaoOpen, setMovimentacaoOpen] = useState(false);
  const [formMov, setFormMov] = useState(defaultMovForm);
  const [motivos, setMotivos] = useState([]);
  const [loadingMotivos, setLoadingMotivos] = useState(false);
  const [savingMov, setSavingMov] = useState(false);

  // Dialog Kardex (Histórico do Produto)
  const [kardexOpen, setKardexOpen] = useState(false);
  const [kardexProduct, setKardexProduct] = useState(null);
  const [kardexMovements, setKardexMovements] = useState([]);
  const [loadingKardex, setLoadingKardex] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [prodRes, movRes] = await Promise.all([
        http.get("/produtos"),
        http.get("/estoque/movimentacoes")
      ]);
      setProdutos(prodRes.data.filter(p => p.deletado !== "S"));
      setMovimentacoes(movRes.data.slice(0, 10)); // pega as 10 mais recentes para um histórico mais rico
    } catch (error) {
      toast.error("Erro ao carregar dados do painel de estoque.");
    } finally {
      setLoading(false);
    }
  };

  const loadMotivos = async (tipo) => {
    setLoadingMotivos(true);
    try {
      const res = await http.get(`/configuracoes/motivos-estoque?apenas_ativos=true&tipo=${tipo}`);
      setMotivos(res.data);
      setFormMov(prev => ({ ...prev, motivo_id: "" }));
    } catch (e) {
      toast.error("Erro ao carregar motivos.");
    } finally {
      setLoadingMotivos(false);
    }
  };

  useEffect(() => {
    if (movimentacaoOpen && formMov.tipo) {
      loadMotivos(formMov.tipo);
    }
  }, [formMov.tipo, movimentacaoOpen]);

  const handleOpenMov = (prod = null) => {
    setFormMov({
      ...defaultMovForm,
      produto_id: prod ? prod.id : ""
    });
    setMovimentacaoOpen(true);
  };

  const openKardex = async (p) => {
    setKardexProduct(p);
    setKardexOpen(true);
    setLoadingKardex(true);
    try {
      const res = await http.get(`/estoque/movimentacoes?produto_id=${p.id}`);
      setKardexMovements(res.data);
    } catch (error) {
      toast.error("Erro ao carregar histórico do produto.");
    } finally {
      setLoadingKardex(false);
    }
  };

  const handleSaveMov = async (e) => {
    e.preventDefault();
    if (!formMov.produto_id) {
      return toast.error("Selecione um produto.");
    }
    if (!formMov.tipo) {
      return toast.error("Selecione o tipo de movimentação.");
    }
    if (!formMov.quantidade || Number(formMov.quantidade) <= 0) {
      return toast.error("Informe uma quantidade válida e maior que zero.");
    }
    if (!formMov.motivo_id) {
      return toast.error("O motivo operacional da movimentação é obrigatório.");
    }

    setSavingMov(true);
    try {
      await http.post("/estoque/movimentacao", {
        produto_id: formMov.produto_id,
        tipo: formMov.tipo,
        quantidade: parseFloat(formMov.quantidade),
        motivo_id: formMov.motivo_id || null,
        observacao: formMov.observacao
      });
      toast.success("Movimentação registrada com sucesso!");
      setMovimentacaoOpen(false);
      loadData();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Erro ao registrar movimentação.");
    } finally {
      setSavingMov(false);
    }
  };

  // Cálculos do painel
  const totalItens = produtos.reduce((sum, p) => {
    const qtyPerUnit = Number(p.quantidade_por_unidade || 0);
    const equivalentQty = qtyPerUnit > 0 ? (Number(p.quantidade_estoque || 0) / qtyPerUnit) : Number(p.quantidade_estoque || 0);
    return sum + equivalentQty;
  }, 0);

  const totalValor = produtos.reduce((sum, p) => {
    const qtyPerUnit = Number(p.quantidade_por_unidade || 0);
    const cost = qtyPerUnit > 0 ? (Number(p.custo_unitario || 0) / qtyPerUnit) : Number(p.custo_unitario || 0);
    return sum + ((p.quantidade_estoque || 0) * cost);
  }, 0);

  const alertaBaixoEstoque = produtos.filter(p => p.quantidade_estoque <= p.estoque_minimo).length;

  // Filtragem dos produtos para o painel de status
  const filteredProducts = produtos.filter(p => {
    const matchesSearch = p.nome.toLowerCase().includes(productSearch.toLowerCase()) || 
                          (p.fornecedor && p.fornecedor.toLowerCase().includes(productSearch.toLowerCase()));
    
    if (onlyLowStock) {
      return matchesSearch && (p.quantidade_estoque <= p.estoque_minimo);
    }
    return matchesSearch;
  });

  const canMovimentar = user?.role === 'admin' || user?.perfil?.permissoes?.['estoque.movimentar'] === true || user?.perfil?.permissoes?.acoes?.['estoque.movimentar'];
  const canInventariar = user?.role === 'admin' || user?.perfil?.permissoes?.['estoque.inventariar'] === true || user?.perfil?.permissoes?.acoes?.['estoque.inventariar'];
  const canEntrada = user?.role === 'admin' || user?.perfil?.permissoes?.['estoque.entrada'] === true || user?.perfil?.permissoes?.acoes?.['estoque.entrada'];
  const canAjustar = user?.role === 'admin' || user?.perfil?.permissoes?.['estoque.ajustar'] === true;
  const selectedProduct = produtos.find(p => p.id === formMov.produto_id);

  return (
    <TooltipProvider delayDuration={150}>
      <div className="p-4 sm:p-6 lg:p-8 fade-in min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-800 dark:text-zinc-200 max-w-7xl mx-auto">
      
      {/* Header */}
      <PageHeader 
        overline="Estoque" 
        title="Painel Geral de Estoque" 
        action={
          <Button 
            onClick={loadData} 
            disabled={loading}
            variant="outline" 
            className="flex items-center gap-1.5 border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-900 h-10"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Atualizar
          </Button>
        } 
      />

      {/* Indicadores KPI */}
      <div className={`grid grid-cols-1 ${canAjustar ? "sm:grid-cols-2 lg:grid-cols-3" : "sm:grid-cols-1"} gap-6 mb-8 mt-4`}>
        {canAjustar && (
          <>
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 shadow-xs flex items-center justify-between hover:shadow-md transition-shadow">
              <div>
                <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">Saldo Total de Itens</span>
                <div className="font-display text-3xl font-extrabold mt-1 text-zinc-900 dark:text-zinc-50 tracking-tight">
                  {(totalItens || 0).toLocaleString("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: 3 })} <span className="text-sm font-normal text-zinc-400">itens</span>
                </div>
                <p className="text-[10px] text-zinc-400 dark:text-zinc-500 mt-1.5 font-medium">{produtos.length} produtos catalogados</p>
              </div>
              <div className="p-3 bg-[#EAF0EE] dark:bg-[#1a2e2a] text-[#3A4F4A] dark:text-[#84A59D] rounded-2xl">
                <Layers className="w-6 h-6" />
              </div>
            </div>

            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 shadow-xs flex items-center justify-between hover:shadow-md transition-shadow">
              <div>
                <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">Valor Ativo em Estoque</span>
                <div className="font-display text-3xl font-extrabold mt-1 text-[#3A4F4A] dark:text-[#EAF0EE] tracking-tight">
                  {fmtBRL(totalValor)}
                </div>
                <p className="text-[10px] text-zinc-400 dark:text-zinc-500 mt-1.5 font-medium">Preço de custo ponderado</p>
              </div>
              <div className="p-3 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-500 rounded-2xl">
                <DollarSign className="w-6 h-6" />
              </div>
            </div>
          </>
        )}

        <div className={`border rounded-2xl p-6 shadow-xs flex items-center justify-between hover:shadow-md transition-all ${
          alertaBaixoEstoque > 0 
            ? "bg-rose-50/20 dark:bg-rose-950/5 border-rose-200 dark:border-rose-900/50" 
            : "bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800"
        }`}>
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">Alertas de Baixo Estoque</span>
            <div className={`font-display text-3xl font-extrabold mt-1 tracking-tight ${
              alertaBaixoEstoque > 0 ? "text-rose-600 dark:text-rose-400" : "text-zinc-900 dark:text-zinc-50"
            }`}>
              {alertaBaixoEstoque}
            </div>
            <p className="text-[10px] text-zinc-400 dark:text-zinc-500 mt-1.5 font-medium">
              {alertaBaixoEstoque > 0 
                ? "Existem itens abaixo do limite crítico" 
                : "Todos os níveis estão seguros"}
            </p>
          </div>
          <div className={`p-3 rounded-2xl ${
            alertaBaixoEstoque > 0 
              ? "bg-rose-100 dark:bg-rose-900/40 text-rose-600 dark:text-rose-400" 
              : "bg-zinc-100 dark:bg-zinc-800 text-zinc-500"
          }`}>
            <AlertTriangle className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Grid de dois painéis de controle principais */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Painel Esquerdo: Situação de Estoque de Produtos */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-xs overflow-hidden">
            <div className="px-6 py-5 border-b border-zinc-100 dark:border-zinc-800 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h3 className="font-bold text-zinc-800 dark:text-zinc-100 text-base flex items-center gap-2">
                  <Package className="w-5 h-5 text-[#84A59D]" />
                  Status de Estoque por Produto
                </h3>
                <p className="text-xs text-zinc-400 dark:text-zinc-500 font-semibold mt-0.5">Consulte saldos e execute ajustes manuais rápidos.</p>
              </div>
            </div>

            {/* Barra de Busca e Filtros */}
            <div className="p-6 bg-zinc-50/50 dark:bg-zinc-900/20 border-b border-zinc-100 dark:border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-3 h-4 w-4 text-zinc-400" />
                <Input 
                  placeholder="Buscar por produto ou fornecedor..."
                  value={productSearch}
                  onChange={(e) => setProductSearch(e.target.value)}
                  className="pl-9 h-10 bg-white border-zinc-200 dark:border-zinc-800"
                />
              </div>

              <div className="flex items-center gap-3 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 px-4 py-2 rounded-xl shrink-0">
                <Switch 
                  id="only-low-stock"
                  checked={onlyLowStock}
                  onCheckedChange={setOnlyLowStock}
                />
                <Label htmlFor="only-low-stock" className="text-xs font-bold text-zinc-700 dark:text-zinc-300 cursor-pointer select-none">
                  Apenas estoque baixo
                </Label>
              </div>
            </div>

            {/* Lista de Produtos */}
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-zinc-50/50 dark:bg-zinc-900/40">
                  <TableRow>
                    <TableHead className="font-bold">Produto</TableHead>
                    <TableHead className="font-bold text-center">Nível / Status</TableHead>
                    <TableHead className="font-bold text-right">Saldo Atual</TableHead>
                    <TableHead className="font-bold text-right">Preço</TableHead>
                    <TableHead className="w-[120px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-12 text-zinc-400 dark:text-zinc-500 font-semibold">
                        <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-[#84A59D]" />
                        Carregando produtos...
                      </TableCell>
                    </TableRow>
                  ) : filteredProducts.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-16 text-zinc-400 dark:text-zinc-500 font-semibold">
                        Nenhum produto encontrado.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredProducts.map((p) => {
                      const baixo = p.quantidade_estoque < p.estoque_minimo;
                      const proximo = p.quantidade_estoque >= p.estoque_minimo && p.quantidade_estoque <= p.estoque_minimo * 1.2;
                      const pct = p.estoque_minimo > 0 ? (p.quantidade_estoque / p.estoque_minimo) * 100 : 100;

                      let statusColor = "bg-emerald-500";
                      let statusTextColor = "text-emerald-600 dark:text-emerald-400";
                      let statusText = "SAUDÁVEL";

                      if (baixo) {
                        statusColor = "bg-rose-500";
                        statusTextColor = "text-rose-500 dark:text-rose-400";
                        statusText = "ABAIXO DO MÍNIMO";
                      } else if (proximo && p.estoque_minimo > 0) {
                        statusColor = "bg-amber-500";
                        statusTextColor = "text-amber-600 dark:text-amber-400";
                        statusText = "PRÓXIMO AO MÍNIMO";
                      }
                      
                      return (
                        <TableRow key={p.id} className="hover:bg-zinc-50/30 transition-colors">
                          <TableCell className="py-4.5">
                            <div className="font-bold text-zinc-900 dark:text-zinc-50">{p.nome}</div>
                            {p.fornecedor && <div className="text-[10px] text-zinc-400 font-medium mt-0.5">{p.fornecedor}</div>}
                          </TableCell>
                          <TableCell className="align-middle">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <button 
                                  type="button"
                                  title={`${pct.toFixed(0)}% do mínimo de segurança (${(p.quantidade_estoque || 0).toLocaleString("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: 3 })} de ${(p.estoque_minimo || 0).toLocaleString("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: 3 })} ${p.unidade_medida || "un"})`}
                                  className="w-full max-w-[120px] mx-auto space-y-1.5 cursor-help text-left focus:outline-none focus:ring-0 block"
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
                                    <span className="text-zinc-400">Min: {(p.estoque_minimo || 0).toLocaleString("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: 3 })}</span>
                                  </div>
                                </button>
                              </TooltipTrigger>
                              <TooltipContent className="bg-zinc-900 text-white text-xs p-2 rounded-lg border border-zinc-800 shadow-md">
                                {pct.toFixed(0)}% do mínimo de segurança ({(p.quantidade_estoque || 0).toLocaleString("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: 3 })} de {(p.estoque_minimo || 0).toLocaleString("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: 3 })} {p.unidade_medida || "un"})
                              </TooltipContent>
                            </Tooltip>
                          </TableCell>
                          <TableCell className="text-right font-mono font-bold align-middle">
                            <span className={
                              p.quantidade_estoque < 0
                                ? "inline-block px-2 py-1 rounded bg-rose-50 text-rose-650 dark:bg-rose-950/40 dark:text-rose-400 font-extrabold border border-rose-250 text-xs"
                                : (baixo ? "text-rose-600 dark:text-rose-400" : "text-zinc-700 dark:text-zinc-300")
                            }>
                              {(() => {
                                const qty = Number((p.quantidade_estoque || 0).toFixed(3));
                                const formattedQty = qty.toLocaleString("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: 3 });
                                const qtyPerUnit = Number(p.quantidade_por_unidade || 0);
                                if (qtyPerUnit > 0) {
                                  const eq = Number((qty / qtyPerUnit).toFixed(3));
                                  const formattedEq = eq.toLocaleString("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: 3 });
                                  return `${formattedQty} ${p.unidade_medida_insumo || "un"} (${formattedEq} ${p.unidade_medida || "un"})`;
                                }
                                return `${formattedQty} ${p.unidade_medida || "un"}`;
                              })()}
                            </span>
                          </TableCell>
                          <TableCell className="text-right font-mono font-semibold text-zinc-800 dark:text-zinc-200 align-middle">
                            {fmtBRL(p.preco_venda)}
                          </TableCell>
                          <TableCell className="align-middle">
                            <div className="flex justify-end gap-1">
                              <Button 
                                size="sm" 
                                variant="ghost" 
                                onClick={() => openKardex(p)}
                                className="text-zinc-400 hover:text-[#84A59D] h-8 w-8 p-0"
                                title="Kardex / Histórico do Produto"
                              >
                                <History className="w-4 h-4" />
                              </Button>
                              <Button 
                                size="sm" 
                                variant="ghost" 
                                onClick={() => handleOpenMov(p)}
                                className="text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 h-8 w-8 p-0"
                                title="Lançar Movimentação Manual"
                              >
                                <PlusCircle className="w-4 h-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </Card>
        </div>

        {/* Painel Direito: Ações Rápidas & Histórico */}
        <div className="space-y-6">
          
          {/* Card de Ações Rápidas */}
          <Card className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-xs overflow-hidden">
            <div className="px-6 py-5 border-b border-zinc-200 dark:border-zinc-800">
              <h3 className="font-bold text-zinc-800 dark:text-zinc-200 text-sm">Ações Operacionais</h3>
            </div>
            <CardContent className="p-6 space-y-4">
                
                {/* Lançar Movimentação */}
                {canMovimentar && (
                  <div 
                    onClick={() => handleOpenMov()}
                    className="group border border-zinc-200 dark:border-zinc-800 hover:border-[#84A59D]/40 rounded-xl p-4 flex items-center justify-between cursor-pointer hover:bg-zinc-50/30 dark:hover:bg-zinc-950/20 transition-all duration-200"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 bg-[#EAF0EE] dark:bg-[#1a2e2a] text-[#3A4F4A] dark:text-[#84A59D] rounded-xl group-hover:scale-105 transition-transform">
                        <PlusCircle className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <h4 className="font-bold text-sm text-zinc-900 dark:text-zinc-100">Lançar Movimentação</h4>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <button
                                type="button"
                                onClick={(e) => e.stopPropagation()}
                                title="Registra movimentações manuais avulsas como saídas, quebras, perdas, consumo de insumos na loja ou ajustes pontuais."
                                className="cursor-help text-zinc-400 dark:text-zinc-500 hover:text-zinc-650 focus:outline-none focus:ring-0 shrink-0 inline-flex items-center"
                              >
                                <HelpCircle className="w-3.5 h-3.5" />
                              </button>
                            </TooltipTrigger>
                            <TooltipContent side="top" className="max-w-[240px] bg-zinc-900 dark:bg-zinc-800 text-white text-xs p-2.5 rounded-lg border border-zinc-800 shadow-md">
                              Registra movimentações manuais avulsas como saídas, quebras, perdas, consumo de insumos na loja ou ajustes pontuais.
                            </TooltipContent>
                          </Tooltip>
                        </div>
                        <p className="text-[10px] text-zinc-400 dark:text-zinc-400 font-semibold mt-0.5 uppercase tracking-wider">Saída, Ajuste, Perda ou Consumo</p>
                      </div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-zinc-400 group-hover:text-[#84A59D] transition-colors" />
                  </div>
                )}

                {/* Registrar Entrada */}
                <div 
                  onClick={() => {
                    if (canEntrada) {
                      navigate("/estoque/entrada");
                    } else {
                      toast.error("Acesso negado: Permissão insuficiente para registrar entradas de produtos.");
                    }
                  }}
                  className={`group border rounded-xl p-4 flex items-center justify-between transition-all duration-200 ${
                    canEntrada
                      ? "border-zinc-200 dark:border-zinc-800 hover:border-[#3A4F4A]/40 hover:bg-zinc-50/30 dark:hover:bg-zinc-950/20 cursor-pointer"
                      : "border-zinc-150 dark:border-zinc-900 opacity-60 bg-zinc-50/10 cursor-not-allowed"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-zinc-100 dark:bg-zinc-800 text-[#3A4F4A] dark:text-[#84A59D] rounded-xl group-hover:scale-105 transition-transform">
                      <Layers className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <h4 className="font-bold text-sm text-zinc-900 dark:text-zinc-100">Entrada de Produtos</h4>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button
                              type="button"
                              onClick={(e) => e.stopPropagation()}
                              title="Registra compras com fornecedores, atualiza quantidades no estoque e lança custos de aquisição."
                              className="cursor-help text-zinc-400 dark:text-zinc-500 hover:text-zinc-600 focus:outline-none focus:ring-0 shrink-0 inline-flex items-center"
                            >
                              <HelpCircle className="w-3.5 h-3.5" />
                            </button>
                          </TooltipTrigger>
                          <TooltipContent side="top" className="max-w-[240px] bg-zinc-900 dark:bg-zinc-800 text-white text-xs p-2.5 rounded-lg border border-zinc-800 shadow-md">
                            Registra compras com fornecedores, atualiza quantidades no estoque e lança custos de aquisição.
                          </TooltipContent>
                        </Tooltip>
                      </div>
                      <p className="text-[10px] text-zinc-400 dark:text-zinc-400 font-semibold mt-0.5 uppercase tracking-wider">Compras & Fornecedores</p>
                    </div>
                  </div>
                  <ArrowRight className={`w-4 h-4 transition-colors ${canEntrada ? "text-zinc-400 group-hover:text-[#3A4F4A]" : "text-zinc-300 dark:text-zinc-700"}`} />
                </div>

                {/* Inventário Assistido */}
                <div 
                  onClick={() => {
                    if (canInventariar) {
                      navigate("/estoque/inventario");
                    } else {
                      toast.error("Acesso negado: Permissão insuficiente para realizar inventário.");
                    }
                  }}
                  className={`group border rounded-xl p-4 flex items-center justify-between cursor-pointer transition-all duration-200 ${
                    canInventariar 
                      ? "border-zinc-200 dark:border-zinc-800 hover:border-[#3A4F4A]/40 hover:bg-zinc-50/30 dark:hover:bg-zinc-950/20" 
                      : "border-zinc-150 dark:border-zinc-900 opacity-60 bg-zinc-50/10 cursor-not-allowed"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-zinc-100 dark:bg-zinc-800 text-[#3A4F4A] dark:text-[#84A59D] rounded-xl group-hover:scale-105 transition-transform">
                      <ClipboardCheck className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <h4 className="font-bold text-sm text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
                          Inventário Assistido
                          {!canInventariar && <span className="text-[9px] bg-red-50 text-red-600 dark:bg-red-950/30 dark:text-red-400 px-1.5 py-0.5 rounded-md font-bold uppercase tracking-wider">Restrito</span>}
                        </h4>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button
                              type="button"
                              onClick={(e) => e.stopPropagation()}
                              title="Inicia uma contagem física geral em lote, calcula divergências com o sistema e gera protocolos de auditoria."
                              className="cursor-help text-zinc-400 dark:text-zinc-500 hover:text-zinc-600 focus:outline-none focus:ring-0 shrink-0 inline-flex items-center"
                            >
                              <HelpCircle className="w-3.5 h-3.5" />
                            </button>
                          </TooltipTrigger>
                          <TooltipContent side="top" className="max-w-[240px] bg-zinc-900 dark:bg-zinc-800 text-white text-xs p-2.5 rounded-lg border border-zinc-800 shadow-md">
                            Inicia uma contagem física geral em lote, calcula divergências com o sistema e gera protocolos de auditoria.
                          </TooltipContent>
                        </Tooltip>
                      </div>
                      <p className="text-[10px] text-zinc-400 dark:text-zinc-400 font-semibold mt-0.5 uppercase tracking-wider">Lote & Auditoria</p>
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-zinc-400 group-hover:text-[#3A4F4A] transition-colors" />
                </div>
            </CardContent>
          </Card>

          {/* Histórico Recente de Movimentações */}
          <Card className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-xs overflow-hidden">
            <div className="px-6 py-5 border-b border-zinc-150 dark:border-zinc-850 flex items-center justify-between">
              <h3 className="font-bold text-zinc-800 dark:text-zinc-200 text-sm flex items-center gap-1.5">
                <History className="w-4 h-4 text-[#84A59D]" />
                Histórico Recente
              </h3>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => navigate("/estoque/inventario")} 
                className="text-xs text-[#84A59D] hover:underline font-bold"
              >
                Ver tudo
              </Button>
            </div>
            
            <div className="divide-y divide-zinc-100 dark:divide-zinc-800 max-h-[380px] overflow-y-auto">
              {movimentacoes.length === 0 ? (
                <div className="p-8 text-center text-xs text-zinc-400 font-semibold">
                  Nenhuma movimentação no período.
                </div>
              ) : (
                movimentacoes.map((m) => {
                  const isPositive = m.quantidade > 0;
                  const isAjuste = m.tipo === "ajuste";
                  
                  return (
                    <div key={m.id} className="p-4 hover:bg-zinc-50/20 dark:hover:bg-zinc-900/20 transition-colors flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="font-bold text-sm text-zinc-850 dark:text-zinc-150 truncate" title={m.produto_nome}>
                          {m.produto_nome}
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <span className={`inline-block px-1.5 py-0.5 rounded text-[9px] font-extrabold uppercase tracking-wider ${
                            m.tipo === "saida" || m.tipo === "saida_manual" || m.tipo === "perda" || m.tipo === "consumo_interno"
                              ? "bg-rose-50 text-rose-600 border border-rose-100 dark:bg-rose-950/20 dark:text-rose-400 dark:border-rose-900/30"
                              : m.tipo === "ajuste" || m.tipo === "ajuste_positivo" || m.tipo === "ajuste_negativo"
                              ? "bg-amber-50 text-amber-600 border border-amber-100 dark:bg-amber-950/20 dark:text-amber-450 dark:border-amber-900/30"
                              : "bg-emerald-50 text-emerald-600 border border-emerald-100 dark:bg-emerald-950/20 dark:text-emerald-450 dark:border-emerald-900/30"
                          }`}>
                            {TIPO_LABELS[m.tipo] || m.tipo}
                          </span>
                          <span className="text-[10px] text-zinc-400 font-mono font-medium">{new Date(m.createdAt).toLocaleDateString("pt-BR")}</span>
                        </div>
                        {m.motivo && (
                          <div className="text-[10px] text-zinc-500 mt-1 italic truncate max-w-[180px]" title={m.motivo}>
                            "{m.motivo}"
                          </div>
                        )}
                      </div>
                      
                      <div className="text-right shrink-0">
                        <div className={`font-mono text-xs font-black flex items-center justify-end ${
                          isPositive ? "text-emerald-600" : "text-rose-600"
                        }`}>
                          {isPositive ? <ArrowUp className="w-3 h-3 mr-0.5 shrink-0" /> : <ArrowDown className="w-3 h-3 mr-0.5 shrink-0" />}
                          {isPositive ? "+" : ""}{(m.quantidade || 0).toLocaleString("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: 3 })}
                        </div>
                        <div className="text-[9px] text-zinc-400 mt-0.5 font-mono">
                          Saldo: {(m.quantidade_atual || 0).toLocaleString("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: 3 })}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </Card>
        </div>

      </div>

      {/* Dialog Movimentação Unificada */}
      <Dialog open={movimentacaoOpen} onOpenChange={setMovimentacaoOpen}>
        <DialogContent className="sm:max-w-md w-full bg-white dark:bg-zinc-900 border-0 rounded-2xl shadow-2xl p-6">
          <DialogHeader className="border-b border-zinc-150 dark:border-zinc-850 pb-4 mb-4">
            <DialogTitle className="flex items-center gap-2.5 text-lg font-bold text-zinc-950 dark:text-zinc-50">
              <Layers className="w-5 h-5 text-[#84A59D]" />
              Lançar Movimentação de Estoque
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSaveMov} className="space-y-4">
            {/* Produto */}
            <div className="space-y-1.5">
              <Label className="font-bold text-xs text-zinc-500 uppercase tracking-wider">Produto *</Label>
              <SearchableSelect
                options={produtos.map(p => ({
                  value: p.id,
                  label: `${p.nome} (Saldo: ${p.quantidade_estoque} ${p.unidade_medida_insumo || p.unidade_medida || 'un'})`
                }))}
                value={formMov.produto_id}
                onValueChange={(val) => setFormMov({ ...formMov, produto_id: val })}
                placeholder="Selecione o produto..."
                searchPlaceholder="Buscar produto..."
                emptyText="Nenhum produto encontrado."
                className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800"
              />
            </div>

            {/* Tipo */}
            <div className="space-y-1.5">
              <Label className="font-bold text-xs text-zinc-500 uppercase tracking-wider">Tipo da Movimentação *</Label>
              <select
                required
                value={formMov.tipo}
                onChange={(e) => setFormMov({ ...formMov, tipo: e.target.value })}
                className="w-full h-10 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 px-3 text-sm focus:outline-none text-zinc-900 dark:text-zinc-100"
              >
                {Object.entries(TIPO_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>

            {/* Motivo Operacional */}
            <div className="space-y-1.5">
              <Label className="font-bold text-xs text-zinc-500 uppercase tracking-wider flex items-center justify-between">
                <span>Motivo Operacional *</span>
                {loadingMotivos && <span className="text-[10px] text-zinc-400 lowercase animate-pulse">carregando...</span>}
              </Label>
              <select
                required
                value={formMov.motivo_id}
                onChange={(e) => setFormMov({ ...formMov, motivo_id: e.target.value })}
                disabled={loadingMotivos || motivos.length === 0}
                className="w-full h-10 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 px-3 text-sm focus:outline-none text-zinc-900 dark:text-zinc-100 disabled:opacity-50"
              >
                {motivos.length === 0 ? (
                  <option value="">Nenhum motivo ativo cadastrado</option>
                ) : (
                  <>
                    <option value="">Selecione um motivo...</option>
                    {motivos.map((m) => (
                      <option key={m.id} value={m.id}>{m.nome}</option>
                    ))}
                  </>
                )}
              </select>
            </div>

            {/* Quantidade */}
            <div className="space-y-1.5">
              <Label htmlFor="quantidade" className="font-bold text-xs text-zinc-500 uppercase tracking-wider">
                Quantidade * {selectedProduct ? `(${selectedProduct.unidade_medida_insumo || selectedProduct.unidade_medida || 'un'})` : ""}
              </Label>
              <Input
                id="quantidade"
                type="number"
                step="0.001"
                min="0.001"
                required
                placeholder="0,000"
                value={formMov.quantidade}
                onChange={(e) => setFormMov({ ...formMov, quantidade: e.target.value })}
                className="rounded-lg border-zinc-200 dark:border-zinc-800"
              />
            </div>

            {/* Justificativa */}
            <div className="space-y-1.5">
              <Label htmlFor="observacao" className="font-bold text-xs text-zinc-500 uppercase tracking-wider">Justificativa / Observação</Label>
              <Input
                id="observacao"
                placeholder="Descreva detalhes adicionais..."
                value={formMov.observacao}
                onChange={(e) => setFormMov({ ...formMov, observacao: e.target.value })}
                className="rounded-lg border-zinc-200 dark:border-zinc-800"
              />
            </div>

            <DialogFooter className="pt-4 border-t border-zinc-150 dark:border-zinc-850 gap-2 flex flex-col sm:flex-row -mx-6 -mb-6 px-6 pb-6 bg-zinc-50/50 dark:bg-zinc-900/10 mt-6 rounded-b-2xl">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setMovimentacaoOpen(false)}
                className="w-full sm:w-auto h-10 border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-350"
              >
                Cancelar
              </Button>
              <Button 
                type="submit" 
                disabled={savingMov}
                className="w-full sm:w-auto bg-[#84A59D] hover:bg-[#6F9189] text-white font-bold h-10 px-6 shadow-sm rounded-lg"
              >
                {savingMov ? "Gravando..." : "Gravar Movimentação"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog Kardex (Histórico do Produto) */}
      <Dialog open={kardexOpen} onOpenChange={setKardexOpen}>
        <DialogContent className="w-[95vw] max-w-[95vw] sm:max-w-4xl p-0 gap-0 flex flex-col overflow-hidden bg-white dark:bg-zinc-950 shadow-2xl rounded-2xl border-0" style={{ maxHeight: "90vh" }}>
          
          {/* Header */}
          <div className="px-6 py-5 border-b border-zinc-150 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/20 shrink-0">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-3 text-lg font-bold text-zinc-850 dark:text-zinc-100">
                <div className="p-2 bg-zinc-100 dark:bg-zinc-900 text-[#3A4F4A] dark:text-[#84A59D] rounded-xl animate-pulse-subtle">
                  <History className="w-5 h-5" />
                </div>
                <div>
                  <span className="block font-display text-lg font-bold">Ficha Kardex (Rastreabilidade)</span>
                  <span className="text-xs text-zinc-500 dark:text-zinc-400 font-semibold">{kardexProduct?.nome}</span>
                </div>
              </DialogTitle>
            </DialogHeader>
          </div>

          {/* KPIs Consolidados do Kardex */}
          {kardexProduct && (
            <div className="px-6 py-4 bg-zinc-50/30 dark:bg-zinc-900/10 border-b border-zinc-150 dark:border-zinc-850 grid grid-cols-1 sm:grid-cols-3 gap-4 shrink-0">
              <div className="bg-white dark:bg-zinc-900 p-3.5 rounded-xl border border-zinc-200 dark:border-zinc-800">
                <span className="text-[10px] uppercase font-bold text-zinc-400 dark:text-zinc-550 tracking-wider">Estoque Atual</span>
                <div className="font-mono text-base font-bold mt-0.5 text-zinc-800 dark:text-zinc-250">
                  {(() => {
                    const qty = Number((kardexProduct.quantidade_estoque || 0).toFixed(3));
                    const formattedQty = qty.toLocaleString("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: 3 });
                    const qtyPerUnit = Number(kardexProduct.quantidade_por_unidade || 0);
                    if (qtyPerUnit > 0) {
                      const eq = Number((qty / qtyPerUnit).toFixed(3));
                      const formattedEq = eq.toLocaleString("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: 3 });
                      return `${formattedQty} ${kardexProduct.unidade_medida_insumo || 'un'} (${formattedEq} ${kardexProduct.unidade_medida || 'un'})`;
                    }
                    return `${formattedQty} ${kardexProduct.unidade_medida || 'un'}`;
                  })()}
                </div>
              </div>

              <div className="bg-white dark:bg-zinc-900 p-3.5 rounded-xl border border-zinc-200 dark:border-zinc-800">
                <span className="text-[10px] uppercase font-bold text-zinc-400 dark:text-zinc-550 tracking-wider">Custo Unitário</span>
                <div className="font-mono text-base font-bold mt-0.5 text-zinc-800 dark:text-zinc-250">
                  {fmtBRL(kardexProduct.custo_unitario)}
                </div>
              </div>

              <div className="bg-white dark:bg-zinc-900 p-3.5 rounded-xl border border-zinc-200 dark:border-zinc-800">
                <span className="text-[10px] uppercase font-bold text-zinc-400 dark:text-zinc-550 tracking-wider">Valor em Estoque</span>
                <div className="font-mono text-base font-bold mt-0.5 text-emerald-600 dark:text-emerald-500">
                  {fmtBRL((kardexProduct.quantidade_estoque || 0) * (kardexProduct.custo_unitario || 0))}
                </div>
              </div>
            </div>
          )}

          {/* Listagem de movimentações do Kardex */}
          <div className="flex-1 overflow-y-auto p-6 min-h-60 bg-zinc-50/10 dark:bg-zinc-950">
            {loadingKardex ? (
              <div className="flex flex-col items-center justify-center py-20 text-zinc-400 gap-3">
                <RefreshCw className="w-8 h-8 animate-spin text-[#84A59D]" />
                <span className="text-sm font-semibold">Carregando histórico do produto...</span>
              </div>
            ) : kardexMovements.length === 0 ? (
              <div className="text-center py-20 text-zinc-400 dark:text-zinc-500">
                <Package className="w-12 h-12 mx-auto mb-3 opacity-30 text-[#84A59D]" />
                <p className="text-sm font-semibold">Nenhuma movimentação registrada</p>
                <p className="text-xs mt-1">Este produto ainda não registrou entradas, saídas ou ajustes.</p>
              </div>
            ) : (
              <div className="border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden bg-white dark:bg-zinc-900 shadow-xs">
                <Table>
                  <TableHeader className="bg-zinc-50 dark:bg-zinc-900/50">
                    <TableRow>
                      <TableHead className="font-semibold">Data / Hora</TableHead>
                      <TableHead className="text-center font-semibold">Tipo</TableHead>
                      <TableHead className="text-right font-semibold">Quantidade</TableHead>
                      <TableHead className="text-right font-semibold">Saldo Ant.</TableHead>
                      <TableHead className="text-right font-semibold">Saldo Atual</TableHead>
                      <TableHead className="font-semibold">Motivo</TableHead>
                      <TableHead className="font-semibold">Responsável</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {kardexMovements.map((m) => {
                      let typeBadge = "bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400";
                      let typeText = "Entrada";
                      
                      if (m.tipo === "saida" || m.tipo === "saida_manual" || m.tipo === "perda" || m.tipo === "consumo_interno") {
                        typeBadge = "bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400";
                        typeText = TIPO_LABELS[m.tipo] || "Saída";
                      } else if (m.tipo === "ajuste" || m.tipo === "ajuste_positivo" || m.tipo === "ajuste_negativo") {
                        typeBadge = "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400";
                        typeText = TIPO_LABELS[m.tipo] || "Ajuste";
                      }

                      const unitLabel = kardexProduct 
                        ? (Number(kardexProduct.quantidade_por_unidade || 0) > 0 
                          ? (kardexProduct.unidade_medida_insumo || 'un') 
                          : (kardexProduct.unidade_medida || 'un')) 
                        : 'un';

                      return (
                        <TableRow key={m.id} className="hover:bg-zinc-50/50 transition-colors">
                          <TableCell className="font-mono text-xs whitespace-nowrap text-zinc-500">
                            {new Date(m.createdAt).toLocaleString("pt-BR")}
                          </TableCell>
                          <TableCell className="text-center">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${typeBadge}`}>
                              {typeText}
                            </span>
                          </TableCell>
                          <TableCell className={`text-right font-mono font-bold whitespace-nowrap ${
                            m.quantidade > 0 
                              ? "text-emerald-600" 
                              : m.quantidade < 0 
                                ? "text-rose-600" 
                                : "text-zinc-500"
                          }`}>
                            {m.quantidade > 0 ? "+" : ""}{(m.quantidade || 0).toLocaleString("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: 3 })} {unitLabel}
                          </TableCell>
                          <TableCell className="text-right font-mono text-zinc-500 whitespace-nowrap">
                            {(m.quantidade_anterior || 0).toLocaleString("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: 3 })} {unitLabel}
                          </TableCell>
                          <TableCell className="text-right font-mono font-bold text-zinc-800 dark:text-zinc-200 whitespace-nowrap">
                            {(m.quantidade_atual || 0).toLocaleString("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: 3 })} {unitLabel}
                          </TableCell>
                          <TableCell className="text-xs text-zinc-650 dark:text-zinc-350 max-w-xs truncate" title={m.motivo}>
                            {m.motivo || "-"}
                          </TableCell>
                          <TableCell className="text-xs text-zinc-700 dark:text-zinc-300 whitespace-nowrap">
                            {m.usuario_nome || "Sistema"}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-zinc-150 dark:border-zinc-850 bg-zinc-50/50 dark:bg-zinc-900/20 shrink-0 flex justify-end">
            <Button variant="outline" className="h-10 font-bold border-zinc-250" onClick={() => setKardexOpen(false)}>
              Fechar
            </Button>
          </div>

        </DialogContent>
      </Dialog>
    </div>
    </TooltipProvider>
  );
}
