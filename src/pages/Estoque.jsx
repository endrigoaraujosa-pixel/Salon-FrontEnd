import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import http from "../api";
import { PageHeader } from "../components/Page";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../components/ui/table";
import { useAuth } from "../auth";
import { 
  Package, PlusCircle, ClipboardCheck, ArrowUpRight, 
  AlertTriangle, DollarSign, TrendingUp, History, 
  ArrowRight, Layers, FileDown, CheckCircle2 
} from "lucide-react";
import { toast } from "sonner";

const fmtBRL = (n) => (n || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const fmtDT = (s) => s ? new Date(s).toLocaleString("pt-BR") : "-";

export default function Estoque() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [produtos, setProdutos] = useState([]);
  const [movimentacoes, setMovimentacoes] = useState([]);
  const [loading, setLoading] = useState(true);

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
      setMovimentacoes(movRes.data.slice(0, 5)); // get 5 most recent
    } catch (error) {
      toast.error("Erro ao carregar dados do painel de estoque.");
    } finally {
      setLoading(false);
    }
  };

  // Calculations for dashboard indicators
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

  return (
    <div className="p-4 sm:p-6 lg:p-8 fade-in min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-800 dark:text-zinc-200">
      <PageHeader 
        overline="Estoque" 
        title="Painel Geral de Estoque" 
        action={
          <Button 
            onClick={loadData} 
            disabled={loading}
            variant="outline" 
            className="flex items-center gap-1.5 border-zinc-250 dark:border-zinc-850"
          >
            <History className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Atualizar
          </Button>
        } 
      />

      {/* Dashboard KPI cards */}
      <div className={`grid grid-cols-1 ${user?.role === "admin" ? "sm:grid-cols-2 lg:grid-cols-3" : ""} gap-4 mb-6 mt-4`}>
        {user?.role === "admin" && (
          <>
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 shadow-sm flex items-center justify-between">
              <div>
                <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">Saldo Total de Itens</span>
                <div className="font-display text-2xl font-bold mt-1 text-zinc-900 dark:text-zinc-50">
                  {Number(totalItens.toFixed(3))} <span className="text-sm font-normal text-zinc-450 dark:text-zinc-500">itens (equivalente)</span>
                </div>
                <p className="text-[10px] text-zinc-400 dark:text-zinc-500 mt-1">{produtos.length} produtos differentes</p>
              </div>
              <div className="p-3 bg-[#EAF0EE] dark:bg-[#1a2e2a] text-[#3A4F4A] dark:text-[#84A59D] rounded-xl">
                <Layers className="w-6 h-6" />
              </div>
            </div>

            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 shadow-sm flex items-center justify-between">
              <div>
                <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">Valor Ativo em Estoque</span>
                <div className="font-display text-2xl font-bold mt-1 text-[#3A4F4A] dark:text-[#EAF0EE]">
                  {fmtBRL(totalValor)}
                </div>
                <p className="text-[10px] text-zinc-400 dark:text-zinc-500 mt-1">Baseado no custo de compra unitário</p>
              </div>
              <div className="p-3 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-500 rounded-xl">
                <DollarSign className="w-6 h-6" />
              </div>
            </div>
          </>
        )}

        <div className={`border rounded-xl p-5 shadow-sm flex items-center justify-between ${
          alertaBaixoEstoque > 0 
            ? "bg-amber-50/20 dark:bg-amber-950/5 border-amber-250" 
            : "bg-white dark:bg-zinc-900 border-zinc-250 dark:border-zinc-800"
        }`}>
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">Alertas de Baixo Estoque</span>
            <div className={`font-display text-2xl font-bold mt-1 ${
              alertaBaixoEstoque > 0 ? "text-amber-600 dark:text-amber-500" : "text-zinc-900 dark:text-zinc-50"
            }`}>
              {alertaBaixoEstoque}
            </div>
            <p className="text-[10px] text-zinc-400 dark:text-zinc-500 mt-1">
              {alertaBaixoEstoque > 0 
                ? "Produtos com estoque igual ou abaixo do mínimo" 
                : "Todos os produtos em nível seguro"}
            </p>
          </div>
          <div className={`p-3 rounded-xl ${
            alertaBaixoEstoque > 0 
              ? "bg-amber-100 dark:bg-amber-950/40 text-amber-600" 
              : "bg-zinc-100 dark:bg-zinc-800 text-zinc-400"
          }`}>
            <AlertTriangle className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Main Options Cards: Entrada vs Inventário */}
      <h3 className="text-xs font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider mb-3">Ações de Gestão de Estoque</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        
        {/* Action 1: Entrada de Produtos */}
        <Card className="bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 hover:shadow-md transition-shadow duration-200 overflow-hidden flex flex-col justify-between">
          <CardContent className="p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-[#EAF0EE] dark:bg-[#1a2e2a] text-[#3A4F4A] dark:text-[#84A59D] rounded-xl shrink-0">
                <PlusCircle className="w-6 h-6" />
              </div>
              <div>
                <h4 className="font-bold text-base text-zinc-950 dark:text-zinc-50">Entrada de Produtos</h4>
                <p className="text-[10px] text-zinc-400 dark:text-zinc-500 uppercase tracking-wider font-semibold">Registrar Lotes & Custos</p>
              </div>
            </div>
            <p className="text-sm text-zinc-550 dark:text-zinc-400 leading-relaxed">
              Dê entrada em mercadorias vindas de seus fornecedores. Lance notas fiscais, preencha custos de aquisição e quantidades compradas, atualizando o estoque e gerando contas a pagar automaticamente.
            </p>
            <div className="pt-2">
              <Button 
                onClick={() => navigate("/estoque/entrada")} 
                className="w-full bg-[#84A59D] hover:bg-[#6F9189] text-white flex items-center justify-center gap-1.5 font-bold shadow-xs rounded-lg h-11"
              >
                Registrar Entrada <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Action 2: Inventário Físico */}
        <Card className="bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 hover:shadow-md transition-shadow duration-200 overflow-hidden flex flex-col justify-between">
          <CardContent className="p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-zinc-100 dark:bg-zinc-800 text-[#3A4F4A] dark:text-[#84A59D] rounded-xl shrink-0">
                <ClipboardCheck className="w-6 h-6" />
              </div>
              <div>
                <h4 className="font-bold text-base text-zinc-950 dark:text-zinc-50">Inventário Físico</h4>
                <p className="text-[10px] text-zinc-400 dark:text-zinc-500 uppercase tracking-wider font-semibold">Conferência & Auditoria</p>
              </div>
            </div>
            <p className="text-sm text-zinc-550 dark:text-zinc-400 leading-relaxed">
              Faça auditorias e contagem física dos produtos armazenados. Ajuste divergências de saldos causadas por perdas, quebras ou erros, com cálculo de diferença automatizado e histórico de justificativas.
            </p>
            <div className="pt-2">
              <Button 
                onClick={() => navigate("/estoque/inventario")} 
                className="w-full bg-[#3A4F4A] hover:bg-[#2b3a37] text-white flex items-center justify-center gap-1.5 font-bold shadow-xs rounded-lg h-11"
              >
                Realizar Ajuste físico <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          </CardContent>
        </Card>

      </div>

      {/* History of recent movements */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-sm overflow-hidden mt-6">
        <div className="px-5 py-4 border-b border-zinc-150 dark:border-zinc-850 bg-zinc-50/50 dark:bg-zinc-900/10 flex items-center justify-between shrink-0">
          <h3 className="font-semibold text-zinc-800 dark:text-zinc-200 text-sm flex items-center gap-1.5">
            <History className="w-4 h-4 text-[#84A59D]" />
            Movimentações Recentes (Últimas 5)
          </h3>
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => navigate("/estoque/inventario")} 
            className="text-xs text-[#84A59D] hover:underline font-semibold"
          >
            Ver Histórico Completo
          </Button>
        </div>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-zinc-50/50 dark:bg-zinc-950/20">
              <TableRow>
                <TableHead className="font-semibold">Data / Hora</TableHead>
                <TableHead className="font-semibold">Produto</TableHead>
                <TableHead className="text-center font-semibold">Tipo</TableHead>
                <TableHead className="text-right font-semibold">Quantidade</TableHead>
                <TableHead className="text-right font-semibold">Estoque Atual</TableHead>
                <TableHead className="font-semibold">Origem / Motivo</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {movimentacoes.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-10 text-zinc-400 dark:text-zinc-500 text-sm">
                    Nenhuma movimentação registrada no sistema.
                  </TableCell>
                </TableRow>
              ) : (
                movimentacoes.map((m) => {
                  let badgeStyle = "bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400";
                  let badgeText = "Entrada";

                  if (m.tipo === "saida") {
                    badgeStyle = "bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400";
                    badgeText = "Saída";
                  } else if (m.tipo === "ajuste") {
                    badgeStyle = "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400";
                    badgeText = "Ajuste";
                  }

                  const prod = produtos.find(p => p.id === m.produto_id);
                  let qtyText = "";
                  let qtyCurrentText = "";
                  
                  if (prod) {
                    const qtyPerUnit = Number(prod.quantidade_por_unidade || 0);
                    if (qtyPerUnit > 0) {
                      const eq = Number((m.quantidade / qtyPerUnit).toFixed(2));
                      const prefix = m.quantidade > 0 ? "+" : "";
                      const eqPrefix = eq > 0 ? "+" : "";
                      qtyText = `${prefix}${Number(m.quantidade.toFixed(3))} ${prod.unidade_medida_insumo || 'un'} (${eqPrefix}${eq} ${prod.unidade_medida || 'un'})`;
                      
                      const eqCurrent = Number((m.quantidade_atual / qtyPerUnit).toFixed(2));
                      qtyCurrentText = `${Number(m.quantidade_atual.toFixed(3))} ${prod.unidade_medida_insumo || 'un'} (${eqCurrent} ${prod.unidade_medida || 'un'})`;
                    } else {
                      const prefix = m.quantidade > 0 ? "+" : "";
                      qtyText = `${prefix}${Number(m.quantidade.toFixed(3))} ${prod.unidade_medida || 'un'}`;
                      qtyCurrentText = `${Number(m.quantidade_atual.toFixed(3))} ${prod.unidade_medida || 'un'}`;
                    }
                  } else {
                    const prefix = m.quantidade > 0 ? "+" : "";
                    qtyText = `${prefix}${Number(m.quantidade.toFixed(3))} un`;
                    qtyCurrentText = `${Number(m.quantidade_atual.toFixed(3))} un`;
                  }

                  return (
                    <TableRow key={m.id} className="hover:bg-zinc-50/30 transition-colors">
                      <TableCell className="font-mono text-xs text-zinc-500 whitespace-nowrap">
                        {fmtDT(m.createdAt)}
                      </TableCell>
                      <TableCell className="font-medium">{m.produto_nome}</TableCell>
                      <TableCell className="text-center">
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${badgeStyle}`}>
                          {badgeText}
                        </span>
                      </TableCell>
                      <TableCell className={`text-right font-mono font-bold whitespace-nowrap ${
                        m.quantidade > 0 
                          ? "text-emerald-600 dark:text-emerald-500" 
                          : m.quantidade < 0 
                            ? "text-rose-600 dark:text-rose-500" 
                            : "text-zinc-500"
                      }`}>
                        {qtyText}
                      </TableCell>
                      <TableCell className="text-right font-mono font-bold text-zinc-700 dark:text-zinc-300 whitespace-nowrap">
                        {qtyCurrentText}
                      </TableCell>
                      <TableCell className="text-zinc-500 max-w-xs truncate" title={m.motivo}>
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
    </div>
  );
}
