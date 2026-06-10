import React, { useState, useEffect } from "react";
import http from "../api";
import { PageHeader, EmptyState } from "../components/Page";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../components/ui/table";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "../components/ui/tabs";
import { 
  Package, Search, CheckCircle2, History, AlertTriangle, 
  ArrowUpRight, ArrowDownRight, RefreshCw, ClipboardCheck, MessageSquare 
} from "lucide-react";
import { toast } from "sonner";

const fmtBRL = (n) => (n || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const fmtDT = (s) => s ? new Date(s).toLocaleString("pt-BR") : "-";

export default function Inventario() {
  const [activeTab, setActiveTab] = useState("conferencia");
  const [produtos, setProdutos] = useState([]);
  const [movimentacoes, setMovimentacoes] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(false);

  // States for the active adjustment
  const [selectedProductId, setSelectedProductId] = useState("");
  const [quantidadeContada, setQuantidadeContada] = useState("");
  const [observacoes, setObservacoes] = useState("");

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
      setMovimentacoes(movRes.data);
    } catch (error) {
      toast.error("Erro ao carregar dados do inventário.");
    } finally {
      setLoading(false);
    }
  };

  const handleSelectProduct = (prod) => {
    setSelectedProductId(prod.id);
    setQuantidadeContada(Number(prod.quantidade_estoque.toFixed(3)));
    setObservacoes("");
  };

  const handleSaveAdjustment = async (prodId, countedVal, obs) => {
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

      // Clean active selection if it was this product
      if (selectedProductId === prodId) {
        setSelectedProductId("");
        setQuantidadeContada("");
        setObservacoes("");
      }

      loadData();
    } catch (error) {
      const msg = error.response?.data?.detail || "Erro ao salvar o ajuste de estoque.";
      toast.error(msg);
    }
  };

  // Filter products based on search
  const filteredProducts = produtos.filter(p => 
    p.nome.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (p.categoria && p.categoria.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="p-4 sm:p-6 lg:p-8 fade-in min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-800 dark:text-zinc-200">
      <PageHeader 
        overline="Estoque" 
        title="Inventário físico & Ajuste" 
        action={
          <Button 
            variant="outline" 
            onClick={loadData} 
            disabled={loading}
            className="flex items-center gap-1.5 border-zinc-250 dark:border-zinc-850"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Atualizar Dados
          </Button>
        } 
      />

      <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-4">
        <TabsList className="bg-zinc-200 dark:bg-zinc-900 p-1 rounded-lg mb-6">
          <TabsTrigger value="conferencia" className="rounded-md font-medium text-xs px-5 py-2 flex items-center gap-1.5">
            <ClipboardCheck className="w-4 h-4" /> Conferência Física & Ajuste
          </TabsTrigger>
          <TabsTrigger value="historico" className="rounded-md font-medium text-xs px-5 py-2 flex items-center gap-1.5">
            <History className="w-4 h-4" /> Histórico de Movimentações
          </TabsTrigger>
        </TabsList>

        {/* TAB 1: CONFERÊNCIA & AJUSTE */}
        <TabsContent value="conferencia" className="space-y-6">
          {/* Main adjustment pane */}
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
                          onClick={() => handleSaveAdjustment(prod.id, quantidadeContada, observacoes)}
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

        {/* TAB 2: HISTÓRICO DE MOVIMENTAÇÕES */}
        <TabsContent value="historico">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-zinc-150 dark:border-zinc-850 shrink-0">
              <h3 className="font-semibold text-zinc-800 dark:text-zinc-200 text-sm">Histórico de Auditoria & Rastreabilidade de Estoque</h3>
              <p className="text-[10px] text-zinc-400 dark:text-zinc-500 font-medium">Registro cronológico completo de entradas, saídas e ajustes manuais.</p>
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
                    <TableHead className="font-semibold">Motivo / Origem</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {movimentacoes.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-12 text-zinc-400 dark:text-zinc-500">
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
    </div>
  );
}
