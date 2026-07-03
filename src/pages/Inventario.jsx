import React, { useState, useEffect } from "react";
import http from "../api";
import { PageHeader } from "../components/Page";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../components/ui/table";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "../components/ui/tabs";
import { Card, CardContent } from "../components/ui/card";
import { useAuth } from "../auth";
import { 
  Package, Search, CheckCircle2, History, AlertTriangle, 
  ArrowUpRight, ArrowDownRight, RefreshCw, ClipboardCheck, 
  MessageSquare, Play, XCircle, Check, Layers, Coins
} from "lucide-react";
import { toast } from "sonner";
import PasswordConfirmDialog from "../components/PasswordConfirmDialog";
import { 
  AlertDialog, 
  AlertDialogContent, 
  AlertDialogHeader, 
  AlertDialogFooter, 
  AlertDialogTitle, 
  AlertDialogDescription, 
  AlertDialogAction, 
  AlertDialogCancel 
} from "../components/ui/alert-dialog";

const fmtBRL = (n) => (n || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const fmtDT = (s) => s ? new Date(s).toLocaleString("pt-BR") : "-";

export default function Inventario() {
  const { user } = useAuth();
  const canInventariar = user?.role === 'admin' || user?.perfil?.permissoes?.['estoque.inventariar'] === true || user?.perfil?.permissoes?.acoes?.['estoque.inventariar'];
  const [activeTab, setActiveTab] = useState("assistido");
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
  const [zerarConfirmOpen, setZerarConfirmOpen] = useState(false);
  const [concluirConfirmOpen, setConcluirConfirmOpen] = useState(false);
  const [itemsParaSalvar, setItemsParaSalvar] = useState([]);
  const [produtos, setProdutos] = useState([]);
  const [movimentacoes, setMovimentacoes] = useState([]);
  const [protocolos, setProtocolos] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(false);

  // Assisted Inventory state
  const [inventarioIniciado, setInventarioIniciado] = useState(false);
  const [contagens, setContagens] = useState({}); // { [prodId]: "value" }
  const [obsGeral, setObsGeral] = useState("");
  const [savingInventario, setSavingInventario] = useState(false);

  // States for unit adjustment
  const [selectedProductId, setSelectedProductId] = useState("");
  const [quantidadeContada, setQuantidadeContada] = useState("");
  const [observacoes, setObservacoes] = useState("");

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [prodRes, movRes, protRes] = await Promise.all([
        http.get("/produtos"),
        http.get("/estoque/movimentacoes"),
        http.get("/estoque/inventario/protocolos")
      ]);
      setProdutos(prodRes.data.filter(p => p.deletado !== "S"));
      setMovimentacoes(movRes.data);
      setProtocolos(protRes.data);
    } catch (error) {
      toast.error("Erro ao carregar dados do inventário.");
    } finally {
      setLoading(false);
    }
  };

  // 1. Assisted Inventory functions
  const handleStartInventario = () => {
    const initialContagens = {};
    // Start with empty counts, only items filled by user will be adjusted
    produtos.forEach(p => {
      initialContagens[p.id] = "";
    });
    setContagens(initialContagens);
    setObsGeral("");
    setInventarioIniciado(true);
    toast.success("Inventário Assistido iniciado! Digite as contagens físicas dos produtos.");
  };

  const handleCancelInventario = () => {
    if (window.confirm("Deseja realmente cancelar este inventário? Todo o progresso digitado será perdido.")) {
      setInventarioIniciado(false);
      setContagens({});
      setObsGeral("");
    }
  };

  const handleUpdateContagem = (prodId, val) => {
    setContagens(prev => ({
      ...prev,
      [prodId]: val
    }));
  };

  const handleSaveInventarioAssistido = () => {
    const items = [];
    let hasInvalid = false;

    Object.entries(contagens).forEach(([prodId, val]) => {
      if (val === "" || val === undefined) return; // skip uncounted
      const num = parseFloat(val);
      if (isNaN(num) || num < 0) {
        hasInvalid = true;
        return;
      }
      items.push({
        produto_id: prodId,
        quantidade_contada: num
      });
    });

    if (hasInvalid) {
      return toast.error("Por favor, verifique as contagens informadas. Valores não podem ser negativos.");
    }

    if (items.length === 0) {
      return toast.error("Nenhum produto foi contado ainda.");
    }

    setItemsParaSalvar(items);
    setConcluirConfirmOpen(true);
  };

  const handleProceedConcluir = async () => {
    setConcluirConfirmOpen(false);
    setSavingInventario(true);
    try {
      const res = await http.post("/estoque/inventario/assistido", {
        itens: itemsParaSalvar,
        observacao: obsGeral
      });
      toast.success(`Inventário fechado com sucesso! Protocolo: ${res.data.protocolo.numero_protocolo}`);
      setInventarioIniciado(false);
      setContagens({});
      setObsGeral("");
      loadData();
    } catch (e) {
      toast.error(e.response?.data?.detail || "Erro ao salvar inventário.");
    } finally {
      setSavingInventario(false);
    }
  };

  const handleZerarTudoLote = () => {
    setZerarConfirmOpen(true);
  };

  const handleProceedZerar = () => {
    setZerarConfirmOpen(false);
    setPasswordDialogOpen(true);
  };

  const handleConfirmZeragem = async (email, password) => {
    try {
      await http.post("/estoque/inventario/autorizar-zeragem", { email, password });
      
      const novasContagens = { ...contagens };
      produtos.forEach(p => {
        const valorAtual = contagens[p.id];
        if (valorAtual === "" || valorAtual === undefined || valorAtual === null) {
          novasContagens[p.id] = "0";
        }
      });
      setContagens(novasContagens);
      toast.success("Contagem física dos produtos não inventariados definida como 0. Clique em Concluir para aplicar a zeragem.");
    } catch (e) {
      throw new Error(e.response?.data?.detail || "Erro de autorização. Verifique usuário, senha e permissões.");
    }
  };

  // 2. Unit adjustment functions
  const handleSelectProduct = (prod) => {
    setSelectedProductId(prod.id);
    setQuantidadeContada(Number(prod.quantidade_estoque.toFixed(3)));
    setObservacoes("");
  };

  const handleSaveUnitAdjustment = async (prodId, countedVal, obs) => {
    const prod = produtos.find(p => p.id === prodId);
    if (!prod) return;

    const counted = parseFloat(countedVal);
    if (isNaN(counted) || counted < 0) {
      toast.error("A quantidade contada deve ser um número não negativo.");
      return;
    }

    try {
      const payload = {
        produto_id: prodId,
        quantidade_contada: counted,
        observacoes: obs
      };

      const res = await http.post("/estoque/inventario/ajuste", payload);
      const diff = res.data.diferenca;
      
      const unitLabel = Number(prod.quantidade_por_unidade || 0) > 0 
        ? (prod.unidade_medida_insumo || 'un') 
        : (prod.unidade_medida || 'un');
      toast.success(
        `Ajuste registrado! Novo estoque: ${counted.toFixed(3)} ${unitLabel} (${diff > 0 ? '+' : ''}${diff.toFixed(3)} ${unitLabel})`
      );

      if (selectedProductId === prodId) {
        setSelectedProductId("");
        setQuantidadeContada("");
        setObservacoes("");
      }

      loadData();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Erro ao salvar o ajuste.");
    }
  };

  // Real-time calculation helpers for active inventory
  const calcActiveStats = () => {
    let conferidos = 0;
    let divergentes = 0;
    let difFinanceira = 0;

    Object.entries(contagens).forEach(([prodId, val]) => {
      if (val === "" || val === undefined) return;
      const num = parseFloat(val);
      if (isNaN(num)) return;

      const p = produtos.find(prod => prod.id === prodId);
      if (!p) return;

      conferidos++;
      const diff = Number((num - p.quantidade_estoque).toFixed(3));
      if (diff !== 0) {
        divergentes++;
        difFinanceira += Math.abs(diff * (p.custo_unitario || 0));
      }
    });

    return { conferidos, divergentes, difFinanceira };
  };

  const activeStats = calcActiveStats();

  // Filter products based on search
  const filteredProducts = produtos.filter(p => 
    p.nome.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (p.categoria && p.categoria.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="p-4 sm:p-6 lg:p-8 fade-in min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-800 dark:text-zinc-200">
      <PageHeader 
        overline="Estoque" 
        title="Inventário físico & Rastreabilidade" 
        action={
          <Button 
            variant="outline" 
            onClick={loadData} 
            disabled={loading}
            className="flex items-center gap-1.5 border-zinc-250 dark:border-zinc-850 h-10"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Atualizar Dados
          </Button>
        } 
      />

      <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-4">
        <TabsList className="bg-zinc-200 dark:bg-zinc-900 p-1 rounded-lg mb-6 flex flex-wrap gap-1">
          <TabsTrigger value="assistido" className="rounded-md font-medium text-xs px-5 py-2 flex items-center gap-1.5">
            <ClipboardCheck className="w-4 h-4" /> Inventário Assistido (Lote)
          </TabsTrigger>
          <TabsTrigger value="protocolos" className="rounded-md font-medium text-xs px-5 py-2 flex items-center gap-1.5">
            <Layers className="w-4 h-4" /> Protocolos Concluídos
          </TabsTrigger>
          <TabsTrigger value="unitario" className="rounded-md font-medium text-xs px-5 py-2 flex items-center gap-1.5">
            <Package className="w-4 h-4" /> Ajuste Unitário Rápido
          </TabsTrigger>
          <TabsTrigger value="historico" className="rounded-md font-medium text-xs px-5 py-2 flex items-center gap-1.5">
            <History className="w-4 h-4" /> Histórico de Movimentações
          </TabsTrigger>
        </TabsList>

        {/* TAB 1: INVENTÁRIO ASSISTIDO (LOTE) */}
        <TabsContent value="assistido" className="space-y-6">
          {!canInventariar ? (
            <Card className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-850 p-8 text-center max-w-xl mx-auto shadow-md rounded-2xl">
              <AlertTriangle className="w-14 h-14 mx-auto mb-4 text-rose-500 animate-pulse" />
              <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-50">Acesso Restrito</h3>
              <p className="text-sm text-zinc-450 dark:text-zinc-500 mt-2 leading-relaxed">
                Você não possui permissão para realizar operações de inventário ou zeragem em lote.
                Por favor, entre em contato com o administrador do sistema para obter acesso.
              </p>
            </Card>
          ) : !inventarioIniciado ? (
            <Card className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-850 p-8 text-center max-w-xl mx-auto shadow-md rounded-2xl">
              <ClipboardCheck className="w-14 h-14 mx-auto mb-4 text-[#84A59D]" />
              <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-50">Iniciar Novo Inventário Assistido</h3>
              <p className="text-sm text-zinc-450 dark:text-zinc-500 mt-2 leading-relaxed">
                Este fluxo permite realizar a contagem física de múltiplos produtos em lote. O sistema calcula a divergência física e financeira em tempo real antes de aplicar as correções e gerar um protocolo de auditoria.
              </p>
              <Button 
                onClick={handleStartInventario}
                className="mt-6 bg-[#84A59D] hover:bg-[#6F9189] text-white font-bold h-11 px-6 shadow-sm rounded-lg flex items-center gap-2 mx-auto"
              >
                <Play className="w-4 h-4" /> Iniciar Contagem em Lote
              </Button>
            </Card>
          ) : (
            <div className="space-y-6">
              {/* Stats & Header for active count */}
              <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
                <Card className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-850 p-4 shadow-sm flex items-center gap-3">
                  <div className="p-2.5 bg-blue-50 dark:bg-blue-950/20 text-blue-600 rounded-xl">
                    <Package className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-zinc-400 dark:text-zinc-500">Produtos Conferidos</span>
                    <div className="font-display text-xl font-bold text-zinc-800 dark:text-zinc-150">
                      {activeStats.conferidos} <span className="text-xs font-normal text-zinc-400">de {produtos.length}</span>
                    </div>
                  </div>
                </Card>

                <Card className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-850 p-4 shadow-sm flex items-center gap-3">
                  <div className="p-2.5 bg-amber-50 dark:bg-amber-950/20 text-amber-600 rounded-xl">
                    <AlertTriangle className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-zinc-400 dark:text-zinc-500">Com Divergência</span>
                    <div className="font-display text-xl font-bold text-amber-600 dark:text-amber-500">
                      {activeStats.divergentes}
                    </div>
                  </div>
                </Card>

                <Card className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-850 p-4 shadow-sm flex items-center gap-3">
                  <div className="p-2.5 bg-rose-50 dark:bg-rose-950/20 text-rose-600 rounded-xl">
                    <Coins className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-zinc-400 dark:text-zinc-500">Divergência Financeira</span>
                    <div className="font-display text-xl font-bold text-rose-600 dark:text-rose-500">
                      {fmtBRL(activeStats.difFinanceira)}
                    </div>
                  </div>
                </Card>

                <Card className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-850 p-4 shadow-sm flex flex-col justify-center">
                  <div className="flex gap-2 w-full">
                    <Button 
                      variant="outline"
                      onClick={handleCancelInventario}
                      className="flex-1 h-10 text-xs border-zinc-250 dark:border-zinc-800 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/20 font-bold"
                    >
                      <XCircle className="w-3.5 h-3.5 mr-1" /> Cancelar
                    </Button>
                    <Button 
                      onClick={handleSaveInventarioAssistido}
                      disabled={savingInventario || activeStats.conferidos === 0}
                      className="flex-1 h-10 text-xs bg-[#84A59D] hover:bg-[#6F9189] text-white font-bold"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Concluir
                    </Button>
                  </div>
                </Card>
              </div>

              {/* General observation input */}
              <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-850 p-4 rounded-xl shadow-sm space-y-2">
                <Label htmlFor="obsGeral" className="font-bold text-xs text-zinc-500 uppercase tracking-wider">Observações / Justificativa do Lote</Label>
                <Input 
                  id="obsGeral"
                  placeholder="Ex: Inventário Geral Mensal de Junho/2026, Auditoria de Estoque no Almoxarifado"
                  value={obsGeral}
                  onChange={(e) => setObsGeral(e.target.value)}
                  className="rounded-lg border-zinc-250 dark:border-zinc-800"
                />
              </div>

              {/* Search products filter & Quick actions */}
              <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
                <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-850 rounded-xl p-4 shadow-sm flex items-center gap-3 flex-1 w-full">
                  <Search className="w-4 h-4 text-zinc-400 shrink-0" />
                  <input
                    type="text"
                    placeholder="Filtrar produtos por nome..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-transparent border-0 outline-none text-sm text-zinc-800 dark:text-zinc-150"
                  />
                </div>
                <Button
                  onClick={handleZerarTudoLote}
                  variant="outline"
                  className="w-full sm:w-auto h-12 text-xs border-rose-200 dark:border-rose-800 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/20 font-bold px-4 rounded-xl flex items-center gap-2"
                >
                  <AlertTriangle className="w-4 h-4 text-rose-500" /> Zerar Tudo (Lote)
                </Button>
              </div>

              {/* Inventory count table */}
              <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-850 rounded-xl shadow-sm overflow-hidden">
                <Table>
                  <TableHeader className="bg-zinc-50 dark:bg-zinc-900/50">
                    <TableRow>
                      <TableHead className="font-semibold">Produto</TableHead>
                      <TableHead className="text-right font-semibold">Estoque Sistema</TableHead>
                      <TableHead className="w-36 text-center font-semibold">Físico Contado</TableHead>
                      <TableHead className="text-right font-semibold">Divergência</TableHead>
                      <TableHead className="text-right font-semibold">Val. Divergente</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredProducts.map((p) => {
                      const val = contagens[p.id] || "";
                      const currentStock = p.quantidade_estoque;
                      const numVal = parseFloat(val);
                      
                      let diff = null;
                      let finDiff = null;

                      if (!isNaN(numVal) && val !== "") {
                        diff = Number((numVal - currentStock).toFixed(3));
                        finDiff = diff * (p.custo_unitario || 0);
                      }

                      const unitLabel = Number(p.quantidade_por_unidade || 0) > 0 
                        ? (p.unidade_medida_insumo || 'un') 
                        : (p.unidade_medida || 'un');

                      return (
                        <TableRow key={p.id} className="hover:bg-zinc-50/50 transition-colors">
                          <TableCell className="font-medium">
                            <div>{p.nome}</div>
                            <span className="text-[10px] text-zinc-400 dark:text-zinc-500 uppercase font-semibold">{p.categoria || "Geral"}</span>
                          </TableCell>
                          <TableCell className="text-right font-mono font-bold text-zinc-650 dark:text-zinc-400">
                            {Number(currentStock.toFixed(3))} {unitLabel}
                          </TableCell>
                          <TableCell className="text-center py-2">
                            <Input 
                              type="number"
                              step="0.001"
                              min="0"
                              placeholder="-"
                              value={val}
                              onChange={(e) => handleUpdateContagem(p.id, e.target.value)}
                              className="w-28 text-center mx-auto font-mono font-semibold h-9 rounded-lg border-zinc-250 dark:border-zinc-800"
                            />
                          </TableCell>
                          <TableCell className={`text-right font-mono font-bold whitespace-nowrap ${
                            diff === null 
                              ? "text-zinc-400" 
                              : diff > 0 
                                ? "text-emerald-600 dark:text-emerald-500" 
                                : diff < 0 
                                  ? "text-rose-600 dark:text-rose-500" 
                                  : "text-zinc-500"
                          }`}>
                            {diff === null ? "-" : `${diff > 0 ? '+' : ''}${diff.toFixed(3)} ${unitLabel}`}
                          </TableCell>
                          <TableCell className={`text-right font-mono font-bold whitespace-nowrap ${
                            finDiff === null 
                              ? "text-zinc-400" 
                              : finDiff > 0 
                                ? "text-emerald-600 dark:text-emerald-500" 
                                : finDiff < 0 
                                  ? "text-rose-600 dark:text-rose-500" 
                                  : "text-zinc-500"
                          }`}>
                            {finDiff === null ? "-" : fmtBRL(Math.abs(finDiff))}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </TabsContent>

        {/* TAB 2: PROTOCOLOS CONCLUÍDOS */}
        <TabsContent value="protocolos">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-850 rounded-xl shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-zinc-150 dark:border-zinc-850 shrink-0">
              <h3 className="font-semibold text-zinc-800 dark:text-zinc-200 text-sm">Protocolos de Inventário Concluídos</h3>
              <p className="text-[10px] text-zinc-400 dark:text-zinc-500 font-medium">Histórico de auditoria de fechamento de inventários em lote.</p>
            </div>

            <div className="overflow-x-auto min-h-60">
              <Table>
                <TableHeader className="bg-zinc-50 dark:bg-zinc-900/50">
                  <TableRow>
                    <TableHead className="font-semibold">Protocolo</TableHead>
                    <TableHead className="font-semibold">Data / Hora</TableHead>
                    <TableHead className="font-semibold">Responsável</TableHead>
                    <TableHead className="text-right font-semibold">Itens Conferidos</TableHead>
                    <TableHead className="text-right font-semibold">Com Divergência</TableHead>
                    <TableHead className="text-right font-semibold">Divergência Financeira</TableHead>
                    <TableHead className="font-semibold">Justificativa / Obs</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {protocolos.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-12 text-zinc-400 dark:text-zinc-500">
                        Nenhum protocolo de inventário registrado.
                      </TableCell>
                    </TableRow>
                  ) : (
                    protocolos.map((p) => (
                      <TableRow key={p.id} className="hover:bg-zinc-50/50 transition-colors">
                        <TableCell className="font-mono text-xs font-bold text-zinc-900 dark:text-zinc-50">
                          {p.numero_protocolo}
                        </TableCell>
                        <TableCell className="font-mono text-xs text-zinc-500 whitespace-nowrap">
                          {fmtDT(p.data_conferenca || p.createdAt)}
                        </TableCell>
                        <TableCell className="text-sm font-semibold">{p.usuario_nome}</TableCell>
                        <TableCell className="text-right font-mono text-zinc-750 dark:text-zinc-400">{p.qtd_conferida}</TableCell>
                        <TableCell className="text-right font-mono font-bold text-amber-600 dark:text-amber-500">{p.qtd_divergencias}</TableCell>
                        <TableCell className="text-right font-mono font-black text-rose-600 dark:text-rose-500">{fmtBRL(p.valor_divergencia)}</TableCell>
                        <TableCell className="text-zinc-500 max-w-xs truncate" title={p.observacao}>
                          {p.observacao || "-"}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </TabsContent>

        {/* TAB 3: AJUSTE UNITÁRIO RÁPIDO */}
        <TabsContent value="unitario" className="space-y-6">
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            
            {/* Left: Product List to select & adjust */}
            <div className="xl:col-span-2 space-y-4">
              <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 shadow-sm flex items-center gap-3">
                <Search className="w-4 h-4 text-zinc-400 shrink-0" />
                <input
                  type="text"
                  placeholder="Pesquisar produto por nome ou categoria..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-transparent border-0 outline-none text-sm text-zinc-800 dark:text-zinc-150"
                />
                {searchQuery && (
                  <button 
                    onClick={() => setSearchQuery("")} 
                    className="text-xs text-zinc-400 hover:text-zinc-600 font-semibold"
                  >
                    Limpar
                  </button>
                )}
              </div>

              <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-sm overflow-hidden">
                <Table>
                  <TableHeader className="bg-zinc-50 dark:bg-zinc-900/50">
                    <TableRow>
                      <TableHead className="font-semibold">Produto</TableHead>
                      <TableHead className="font-semibold">Categoria</TableHead>
                      <TableHead className="text-right font-semibold">Estoque Atual</TableHead>
                      <TableHead className="text-right font-semibold">Custo Unitário</TableHead>
                      <TableHead className="w-24"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredProducts.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-12 text-zinc-400 dark:text-zinc-500">
                          Nenhum produto cadastrado ou correspondente à busca.
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredProducts.map((p) => {
                        const isSelected = selectedProductId === p.id;
                        return (
                          <TableRow 
                            key={p.id} 
                            className={`transition-colors ${
                              isSelected 
                                ? "bg-[#EAF0EE]/30 dark:bg-[#3A4F4A]/10 hover:bg-[#EAF0EE]/40" 
                                : "hover:bg-zinc-50/50"
                            }`}
                          >
                            <TableCell className="font-medium">
                              <div>{p.nome}</div>
                              {p.fornecedor && <span className="text-[10px] text-zinc-400 dark:text-zinc-500">Fornecedor: {p.fornecedor}</span>}
                            </TableCell>
                            <TableCell>
                              <span className="text-xs bg-zinc-100 dark:bg-zinc-800 text-zinc-650 dark:text-zinc-400 px-2 py-0.5 rounded-md font-semibold">
                                {p.categoria || "Geral"}
                              </span>
                            </TableCell>
                            <TableCell className="text-right font-mono font-bold text-zinc-700 dark:text-zinc-300">
                              {(() => {
                                const qty = Number(p.quantidade_estoque.toFixed(3));
                                const qtyPerUnit = Number(p.quantidade_por_unidade || 0);
                                if (qtyPerUnit > 0) {
                                  const eq = Number((qty / qtyPerUnit).toFixed(2));
                                  return `${qty} ${p.unidade_medida_insumo || 'un'} (${eq} ${p.unidade_medida || 'un'})`;
                                }
                                return `${qty} ${p.unidade_medida || 'un'}`;
                              })()}
                            </TableCell>
                            <TableCell className="text-right font-mono text-zinc-550 dark:text-zinc-450">
                              {fmtBRL(p.custo_unitario)}
                            </TableCell>
                            <TableCell className="text-right">
                              <Button 
                                size="sm" 
                                variant={isSelected ? "secondary" : "outline"} 
                                onClick={() => handleSelectProduct(p)}
                                className={`text-xs font-bold ${
                                  isSelected 
                                    ? "bg-[#3A4F4A] hover:bg-[#2b3a37] text-white" 
                                    : "border-zinc-350 hover:bg-zinc-50"
                                }`}
                              >
                                Selecionar
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>

            {/* Right: Selected Product Adjustment Pane */}
            <div className="xl:col-span-1">
              {selectedProductId ? (
                (() => {
                  const prod = produtos.find(p => p.id === selectedProductId);
                  const currentStock = prod.quantidade_estoque;
                  const countedStock = parseFloat(quantidadeContada);
                  const difference = !isNaN(countedStock) ? Number((countedStock - currentStock).toFixed(3)) : 0;
                  
                  return (
                    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 shadow-sm space-y-5 sticky top-6 animate-in slide-in-from-right-4 duration-200">
                      <div className="border-b pb-3 flex items-start gap-2.5">
                        <div className="p-2 bg-[#EAF0EE] dark:bg-[#1a2e2a] text-[#3A4F4A] dark:text-[#84A59D] rounded-xl shrink-0">
                          <Package className="w-5 h-5" />
                        </div>
                        <div>
                          <h4 className="font-bold text-zinc-900 dark:text-zinc-50 leading-tight">{prod.nome}</h4>
                          <span className="text-[10px] text-zinc-450 dark:text-zinc-500 uppercase tracking-wider font-bold">{prod.categoria || "Sem Categoria"}</span>
                        </div>
                      </div>

                      {/* Stock Summary */}
                      <div className="grid grid-cols-2 gap-4">
                        <div className="bg-zinc-50 dark:bg-zinc-950/20 p-3 rounded-lg border">
                          <span className="text-[10px] uppercase font-bold text-zinc-400 dark:text-zinc-500 tracking-wider">Estoque Atual</span>
                          <div className="font-mono text-base font-bold mt-1 text-zinc-700 dark:text-zinc-300">
                            {(() => {
                              const qty = Number(currentStock.toFixed(3));
                              const qtyPerUnit = Number(prod.quantidade_por_unidade || 0);
                              if (qtyPerUnit > 0) {
                                const eq = Number((qty / qtyPerUnit).toFixed(2));
                                  return `${qty} ${prod.unidade_medida_insumo || 'un'} (${eq} ${prod.unidade_medida || 'un'})`;
                              }
                              return `${qty} ${prod.unidade_medida || 'un'}`;
                            })()}
                          </div>
                        </div>

                        <div className={`p-3 rounded-lg border ${
                          difference > 0 
                            ? "bg-emerald-50/50 dark:bg-emerald-950/10 border-emerald-200" 
                            : difference < 0 
                              ? "bg-rose-50/50 dark:bg-rose-950/10 border-rose-200" 
                              : "bg-zinc-50 dark:bg-zinc-950/10 border-zinc-200"
                        }`}>
                          <span className="text-[10px] uppercase font-bold text-zinc-400 dark:text-zinc-500 tracking-wider">Diferença</span>
                          <div className={`font-mono text-base font-black mt-1 flex items-center gap-0.5 ${
                            difference > 0 
                              ? "text-emerald-600 dark:text-emerald-500" 
                              : difference < 0 
                                ? "text-rose-600 dark:text-rose-500" 
                                : "text-zinc-500 dark:text-zinc-400"
                          }`}>
                            {difference > 0 && <ArrowUpRight className="w-4 h-4 shrink-0" />}
                            {difference < 0 && <ArrowDownRight className="w-4 h-4 shrink-0" />}
                            {(() => {
                              const qty = difference;
                              const qtyPerUnit = Number(prod.quantidade_por_unidade || 0);
                              const prefix = qty > 0 ? "+" : "";
                              if (qtyPerUnit > 0) {
                                const eq = Number((qty / qtyPerUnit).toFixed(2));
                                const eqPrefix = eq > 0 ? "+" : "";
                                return `${prefix}${qty.toFixed(3)} ${prod.unidade_medida_insumo || 'un'} (${eqPrefix}${eq.toFixed(2)} ${prod.unidade_medida || 'un'})`;
                              }
                              return `${prefix}${qty.toFixed(3)} ${prod.unidade_medida || 'un'}`;
                            })()}
                          </div>
                        </div>
                      </div>

                      {/* Adjustment Fields */}
                      <div className="space-y-4">
                        <div>
                          <Label className="text-xs font-semibold text-zinc-650 dark:text-zinc-400">Estoque Contado (Físico) *</Label>
                          <Input 
                            type="number" 
                            step="0.001"
                            value={quantidadeContada}
                            onChange={(e) => setQuantidadeContada(e.target.value)}
                            className="mt-1 font-mono font-bold text-lg"
                            placeholder="0.000"
                          />
                          <p className="text-[10px] text-zinc-400 dark:text-zinc-500 mt-1">Informe a quantidade física real contada no armário/prateleira.</p>
                        </div>

                        <div>
                          <Label className="text-xs font-semibold text-zinc-650 dark:text-zinc-400 flex items-center gap-1.5">
                            <MessageSquare className="w-3.5 h-3.5 text-zinc-400" />
                            Motivo / Observação do Ajuste
                          </Label>
                          <Input 
                            value={observacoes}
                            onChange={(e) => setObservacoes(e.target.value)}
                            className="mt-1"
                            placeholder="Ex: Quebra, Perda, Ajuste Anual, Divergência..."
                          />
                        </div>
                      </div>

                      {/* Save Button */}
                      <div className="flex gap-2 pt-2">
                        <Button 
                          variant="outline" 
                          className="flex-1"
                          onClick={() => {
                            setSelectedProductId("");
                            setQuantidadeContada("");
                            setObservacoes("");
                          }}
                        >
                          Cancelar
                        </Button>
                        <Button 
                          className="flex-1 bg-[#3A4F4A] hover:bg-[#2b3a37] text-white font-bold"
                          onClick={() => handleSaveUnitAdjustment(prod.id, quantidadeContada, observacoes)}
                        >
                          Salvar Ajuste
                        </Button>
                      </div>
                    </div>
                  );
                })()
              ) : (
                <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-8 shadow-sm text-center text-zinc-400 dark:text-zinc-500 sticky top-6">
                  <ClipboardCheck className="w-10 h-10 mx-auto mb-3 opacity-30 text-[#84A59D]" />
                  <p className="text-sm font-semibold">Nenhum produto selecionado</p>
                  <p className="text-xs mt-1 leading-relaxed">
                    Selecione um produto na lista da esquerda para registrar a conferência e realizar ajustes de estoque.
                  </p>
                </div>
              )}
            </div>
          </div>
        </TabsContent>

        {/* TAB 4: HISTÓRICO DE MOVIMENTAÇÕES */}
        <TabsContent value="historico">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-850 rounded-xl shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-zinc-150 dark:border-zinc-850 shrink-0 flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-zinc-800 dark:text-zinc-200 text-sm">Histórico de Auditoria & Rastreabilidade de Estoque</h3>
                <p className="text-[10px] text-zinc-400 dark:text-zinc-500 font-medium">Registro cronológico completo de entradas, saídas, consumos e ajustes.</p>
              </div>
            </div>

            <div className="overflow-x-auto min-h-60">
              <Table>
                <TableHeader className="bg-zinc-50 dark:bg-zinc-900/50">
                  <TableRow>
                    <TableHead className="font-semibold">Data / Hora</TableHead>
                    <TableHead className="font-semibold">Produto</TableHead>
                    <TableHead className="text-center font-semibold">Tipo</TableHead>
                    <TableHead className="text-right font-semibold">Quantidade</TableHead>
                    <TableHead className="text-right font-semibold">Estoque Anterior</TableHead>
                    <TableHead className="text-right font-semibold">Estoque Atual</TableHead>
                    <TableHead className="font-semibold">Responsável</TableHead>
                    <TableHead className="font-semibold">Motivo / Origem</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {movimentacoes.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-12 text-zinc-400 dark:text-zinc-500">
                        Nenhuma movimentação de estoque registrada.
                      </TableCell>
                    </TableRow>
                  ) : (
                    movimentacoes.map((m) => {
                      let typeBadge = "bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400";
                      let typeText = "Entrada";
                      
                      if (m.tipo === "saida") {
                        typeBadge = "bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400";
                        typeText = "Saída";
                      } else if (m.tipo === "ajuste") {
                        typeBadge = "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400";
                        typeText = "Ajuste";
                      }

                      const prod = produtos.find(p => p.id === m.produto_id);
                      const unitLabel = prod
                        ? (Number(prod.quantidade_por_unidade || 0) > 0
                          ? (prod.unidade_medida_insumo || 'un')
                          : (prod.unidade_medida || 'un'))
                        : 'un';

                      return (
                        <TableRow key={m.id} className="hover:bg-zinc-50/50 transition-colors">
                          <TableCell className="font-mono text-xs whitespace-nowrap text-zinc-500 dark:text-zinc-450">
                            {fmtDT(m.createdAt)}
                          </TableCell>
                          <TableCell className="font-semibold">
                            {m.produto_nome}
                          </TableCell>
                          <TableCell className="text-center">
                            <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${typeBadge}`}>
                              {typeText}
                            </span>
                          </TableCell>
                          <TableCell className={`text-right font-mono font-bold ${
                            m.quantidade > 0 
                              ? "text-emerald-600 dark:text-emerald-500" 
                              : m.quantidade < 0 
                                ? "text-rose-600 dark:text-rose-500" 
                                : "text-zinc-500"
                          }`}>
                            {m.quantidade > 0 ? "+" : ""}{Number(m.quantidade.toFixed(3))} {unitLabel}
                          </TableCell>
                          <TableCell className="text-right font-mono text-zinc-500 dark:text-zinc-400">
                            {Number(m.quantidade_anterior.toFixed(3))} {unitLabel}
                          </TableCell>
                          <TableCell className="text-right font-mono font-bold text-zinc-800 dark:text-zinc-200">
                            {Number(m.quantidade_atual.toFixed(3))} {unitLabel}
                          </TableCell>
                          <TableCell className="text-sm font-semibold">{m.usuario_nome || "-"}</TableCell>
                          <TableCell className="text-zinc-600 dark:text-zinc-350 max-w-xs truncate" title={m.motivo}>
                            {m.motivo || "-"}
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      <PasswordConfirmDialog
        open={passwordDialogOpen}
        onOpenChange={setPasswordDialogOpen}
        onConfirm={handleConfirmZeragem}
        title="Autorizar Zeragem em Lote"
        description="Esta operação definirá a contagem física de TODOS os produtos ativos como 0. Informe usuário e senha de um supervisor/administrador com permissão para zerar estoque para autorizar."
        requireCredentials={true}
      />

      <AlertDialog open={zerarConfirmOpen} onOpenChange={setZerarConfirmOpen}>
        <AlertDialogContent className="max-w-md bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-xl p-6">
          <AlertDialogHeader className="space-y-3">
            <div className="mx-auto sm:mx-0 w-12 h-12 rounded-full bg-rose-50 dark:bg-rose-950/30 flex items-center justify-center border border-rose-100 dark:border-rose-900/50">
              <AlertTriangle className="w-6 h-6 text-rose-600 dark:text-rose-500" />
            </div>
            <AlertDialogTitle className="text-lg font-bold text-zinc-900 dark:text-zinc-50">
              Deseja zerar o inventário em lote?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed">
              Esta operação definirá a contagem física de <strong>todos os produtos ativos</strong> como 0.00. 
              <br /><br />
              Isso poderá gerar grandes divergências e afetar o saldo de estoque caso você conclua o lote. Deseja continuar?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-6 flex flex-col-reverse sm:flex-row gap-2">
            <AlertDialogCancel className="w-full sm:w-auto h-11 border-zinc-200 dark:border-zinc-850 text-zinc-700 dark:text-zinc-350 hover:bg-zinc-50 dark:hover:bg-zinc-800 font-semibold rounded-xl">
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleProceedZerar}
              className="w-full sm:w-auto h-11 bg-rose-600 hover:bg-rose-700 dark:bg-rose-700 dark:hover:bg-rose-800 text-white font-semibold rounded-xl border-0"
            >
              Sim, Continuar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={concluirConfirmOpen} onOpenChange={setConcluirConfirmOpen}>
        <AlertDialogContent className="max-w-md bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-xl p-6">
          <AlertDialogHeader className="space-y-3">
            <div className="mx-auto sm:mx-0 w-12 h-12 rounded-full bg-emerald-50 dark:bg-emerald-950/30 flex items-center justify-center border border-emerald-100 dark:border-emerald-900/50">
              <ClipboardCheck className="w-6 h-6 text-emerald-600 dark:text-emerald-500" />
            </div>
            <AlertDialogTitle className="text-lg font-bold text-zinc-900 dark:text-zinc-50">
              Concluir Inventário
            </AlertDialogTitle>
            <AlertDialogDescription className="text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed">
              Deseja realmente finalizar este inventário? 
              <br /><br />
              As contagens físicas de <strong>{itemsParaSalvar.length} produtos</strong> serão processadas e aplicadas imediatamente ao saldo de estoque do sistema.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-6 flex flex-col-reverse sm:flex-row gap-2">
            <AlertDialogCancel className="w-full sm:w-auto h-11 border-zinc-200 dark:border-zinc-850 text-zinc-700 dark:text-zinc-350 hover:bg-zinc-50 dark:hover:bg-zinc-800 font-semibold rounded-xl">
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleProceedConcluir}
              className="w-full sm:w-auto h-11 bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-700 dark:hover:bg-emerald-800 text-white font-semibold rounded-xl border-0"
            >
              Confirmar Conclusão
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
