import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import http from "../api";
import { PageHeader } from "../components/Page";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Card } from "../components/ui/card";
import { 
  AlertCircle, CheckCircle2, CreditCard, Info, Coins, QrCode, NotebookPen, Landmark, ArrowLeft
} from "lucide-react";
import { toast } from "sonner";

const FORMAS_CONFIG = [
  { v: "dinheiro", l: "Dinheiro", desc: "Recebimentos em espécie. Sem taxas adicionais.", icon: Coins, color: "text-emerald-500", bgColor: "bg-emerald-50 dark:bg-emerald-950/20" },
  { v: "pix", l: "Pix", desc: "Transferências instantâneas via chave Pix. Sem taxas adicionais.", icon: QrCode, color: "text-blue-500", bgColor: "bg-blue-50 dark:bg-blue-950/20" },
  { v: "fiado", l: "Fiado (Conta Cliente)", desc: "Venda a prazo para acerto posterior no saldo do cliente.", icon: NotebookPen, color: "text-amber-500", bgColor: "bg-amber-50 dark:bg-amber-950/20" },
  { v: "cartao_credito", l: "Cartão de Crédito", desc: "Pagamentos em crédito. Taxa descontada no faturamento e DRE.", icon: CreditCard, color: "text-indigo-500", bgColor: "bg-indigo-50 dark:bg-indigo-950/20" },
  { v: "cartao_debito", l: "Cartão de Débito", desc: "Pagamentos em débito. Taxa descontada no faturamento e DRE.", icon: Landmark, color: "text-violet-500", bgColor: "bg-violet-50 dark:bg-violet-950/20" }
];

export default function CadastroTipoPagamento() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [taxas, setTaxas] = useState([]);
  const [savingTaxas, setSavingTaxas] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const rTaxas = await http.get("/configuracoes/taxas-cartao");
      setTaxas(rTaxas.data);
    } catch (e) {
      toast.error("Erro ao carregar taxas de cartão");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const getTaxaValue = (forma) => {
    const found = taxas.find(t => t.forma_pagamento === forma);
    return found ? found.percentual : 0;
  };

  const getDiasValue = (forma) => {
    const found = taxas.find(t => t.forma_pagamento === forma);
    return found ? (found.dias_recebimento || 0) : 0;
  };

  const updateTaxa = (forma, percentual) => {
    const val = parseFloat(percentual) || 0;
    if (taxas.some(t => t.forma_pagamento === forma)) {
      setTaxas(taxas.map(t => 
        t.forma_pagamento === forma 
          ? { ...t, percentual: val }
          : t
      ));
    } else {
      setTaxas([...taxas, { forma_pagamento: forma, percentual: val, ativo: 1, dias_recebimento: 0 }]);
    }
  };

  const updateDias = (forma, dias) => {
    const val = parseInt(dias) || 0;
    if (taxas.some(t => t.forma_pagamento === forma)) {
      setTaxas(taxas.map(t => 
        t.forma_pagamento === forma 
          ? { ...t, dias_recebimento: val }
          : t
      ));
    } else {
      setTaxas([...taxas, { forma_pagamento: forma, percentual: 0, ativo: 1, dias_recebimento: val }]);
    }
  };

  const saveTaxas = async () => {
    setSavingTaxas(true);
    try {
      // Save rates for credit and debit
      const formsToSave = ["cartao_credito", "cartao_debito"];
      for (const forma of formsToSave) {
        const percentual = getTaxaValue(forma);
        const dias = getDiasValue(forma);
        await http.post("/configuracoes/taxas-cartao", {
          forma_pagamento: forma,
          percentual: percentual,
          ativo: 1,
          dias_recebimento: dias
        });
      }
      toast.success("Tipos de pagamento e taxas salvos com sucesso!");
      loadData();
    } catch (e) {
      toast.error(e.response?.data?.detail || "Erro ao salvar taxas");
    } finally {
      setSavingTaxas(false);
    }
  };

  if (loading) return <div className="p-8 text-zinc-400">Carregando tipos de pagamento...</div>;

  return (
    <div className="p-6 lg:p-8 fade-in min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-800 dark:text-zinc-200">
      {/* Back Button */}
      <Button 
        variant="ghost" 
        onClick={() => navigate("/cadastros")} 
        className="mb-4 text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
      >
        <ArrowLeft className="w-4 h-4 mr-1" /> Voltar para Cadastros
      </Button>

      <PageHeader 
        overline="Cadastros" 
        title="Cadastro de Tipo de Pagamento" 
      />

      <div className="space-y-6 mt-6">
        <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900/60 rounded-xl p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-blue-700 dark:text-blue-450 leading-relaxed">
            <strong>Tipos de Pagamento e Taxas:</strong> Gerencie as formas de recebimento aceitas no seu estabelecimento. Configure abaixo as taxas de desconto cobradas pelas operadoras e o prazo para recebimento dos valores para os cartões de crédito e débito.
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {FORMAS_CONFIG.map((forma) => {
            const isCard = forma.v === "cartao_credito" || forma.v === "cartao_debito";
            const currentTaxa = getTaxaValue(forma.v);
            const currentDias = getDiasValue(forma.v);

            return (
              <Card key={forma.v} className="p-6 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl flex flex-col justify-between shadow-sm">
                <div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`p-3 rounded-xl ${forma.bgColor} ${forma.color}`}>
                        <forma.icon className="w-6 h-6" />
                      </div>
                      <div>
                        <h3 className="font-display font-bold text-lg text-zinc-900 dark:text-zinc-50">
                          {forma.l}
                        </h3>
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-400 mt-1">
                          Ativo
                        </span>
                      </div>
                    </div>
                  </div>
                  <p className="text-sm text-zinc-550 dark:text-zinc-450 mt-4 leading-relaxed">
                    {forma.desc}
                  </p>
                </div>

                {isCard ? (
                  <div className="mt-6 pt-6 border-t border-zinc-150 dark:border-zinc-800 space-y-4">
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <Label htmlFor={`taxa-${forma.v}`} className="text-xs font-bold text-zinc-550 dark:text-zinc-400 uppercase tracking-wider">
                          Taxa da Operadora
                        </Label>
                        <p className="text-xs text-zinc-450 dark:text-zinc-500 mt-0.5">
                          Dedução automática no faturamento
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Input
                          id={`taxa-${forma.v}`}
                          type="number"
                          step="0.01"
                          min="0"
                          max="100"
                          value={currentTaxa}
                          onChange={(e) => updateTaxa(forma.v, e.target.value)}
                          className="w-24 text-right bg-zinc-50 dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 rounded-lg text-sm font-bold"
                          placeholder="0.00"
                        />
                        <span className="text-base font-bold text-zinc-500">%</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <Label htmlFor={`prazo-${forma.v}`} className="text-xs font-bold text-zinc-550 dark:text-zinc-400 uppercase tracking-wider">
                          Prazo de Recebimento
                        </Label>
                        <p className="text-xs text-zinc-450 dark:text-zinc-500 mt-0.5">
                          Tempo para o valor cair na conta
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Input
                          id={`prazo-${forma.v}`}
                          type="number"
                          min="0"
                          max="365"
                          value={currentDias}
                          onChange={(e) => updateDias(forma.v, e.target.value)}
                          className="w-24 text-right bg-zinc-50 dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 rounded-lg text-sm font-bold"
                          placeholder="0"
                        />
                        <span className="text-sm font-semibold text-zinc-500">dias</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="mt-6 pt-6 border-t border-zinc-150 dark:border-zinc-800 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Taxa da Operadora</span>
                      <span className="text-sm font-bold text-emerald-600 dark:text-emerald-500">0.00% (Sem Taxa)</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Prazo de Recebimento</span>
                      <span className="text-sm font-bold text-emerald-600 dark:text-emerald-500">Imediato (0 dias)</span>
                    </div>
                  </div>
                )}
              </Card>
            );
          })}
        </div>

        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-6 shadow-sm">
          <h3 className="font-display text-base font-bold mb-4 text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
            <Info className="w-4 h-4 text-[#84A59D]" />
            <span>Demonstrativo Financeiro (DRE)</span>
          </h3>
          <div className="space-y-2 text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed">
            As taxas salvas serão aplicadas no momento do recebimento das vendas. O valor líquido será creditado no caixa, e o valor retido pelas operadoras será lançado sob despesas operacionais financeiras.
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-zinc-200 dark:border-zinc-900">
          <Button 
            onClick={saveTaxas} 
            disabled={savingTaxas}
            className="bg-[#84A59D] hover:bg-[#6F9189] text-white h-10 px-6 text-sm rounded-lg font-bold transition-all shadow-sm"
          >
            {savingTaxas ? "Salvando..." : "Salvar Configurações"}
          </Button>
        </div>
      </div>
    </div>
  );
}
