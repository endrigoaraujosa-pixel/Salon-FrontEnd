import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import http from "../api";
import { PageHeader } from "../components/Page";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Card } from "../components/ui/card";
import { 
  AlertCircle, CheckCircle2, ArrowLeft, CreditCard, Info 
} from "lucide-react";
import { toast } from "sonner";

const FORMAS = [
  { v: "cartao_credito", l: "Cartão Crédito" },
  { v: "cartao_debito", l: "Cartão Débito" }
];

export default function ConfiguracoesTaxas() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  
  // Taxas state
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

  useEffect(() => { loadData(); }, []);

  const updateTaxa = (forma, percentual) => {
    setTaxas(taxas.map(t => 
      t.forma_pagamento === forma 
        ? { ...t, percentual: parseFloat(percentual) || 0 }
        : t
    ));
  };

  const saveTaxas = async () => {
    setSavingTaxas(true);
    try {
      for (const taxa of taxas) {
        await http.post("/configuracoes/taxas-cartao", {
          forma_pagamento: taxa.forma_pagamento,
          percentual: taxa.percentual,
          ativo: taxa.ativo
        });
      }
      toast.success("Taxas de cartão atualizadas com sucesso!");
      loadData();
    } catch (e) {
      toast.error(e.response?.data?.detail || "Erro ao salvar taxas");
    } finally {
      setSavingTaxas(false);
    }
  };

  if (loading) return <div className="p-8 text-zinc-400">Carregando configurações...</div>;

  return (
    <div className="p-6 lg:p-8 fade-in min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-800 dark:text-zinc-200">
      
      {/* Back Button */}
      <Button 
        variant="ghost" 
        onClick={() => navigate("/configuracoes")} 
        className="mb-4 text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
      >
        <ArrowLeft className="w-4 h-4 mr-1" /> Voltar para Configurações
      </Button>

      <PageHeader 
        overline="Configurações" 
        title="Taxas de Cartão" 
      />

      <div className="space-y-6">
        <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900/60 rounded-xl p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-blue-700 dark:text-blue-450 leading-relaxed">
            <strong>Importante:</strong> As taxas configuradas aqui serão descontadas automaticamente no DRE como despesa operacional. Elas serão calculadas sobre o valor total recebido em cartão de crédito ou débito.
          </div>
        </div>

        <div className="grid gap-4">
          {taxas.map((taxa) => (
            <Card key={taxa.forma_pagamento} className="p-6 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <Label className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                    {FORMAS.find(f => f.v === taxa.forma_pagamento)?.l}
                  </Label>
                  <p className="text-sm text-zinc-550 dark:text-zinc-400 mt-1">
                    Taxa percentual cobrada pela operadora de pagamentos
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    value={taxa.percentual}
                    onChange={(e) => updateTaxa(taxa.forma_pagamento, e.target.value)}
                    className="w-24 text-right bg-zinc-50 dark:bg-zinc-950 border-zinc-200 dark:border-zinc-850 rounded-lg text-sm"
                    placeholder="0,00"
                  />
                  <span className="text-lg font-bold text-zinc-500">%</span>
                </div>
              </div>
              <div className="mt-3 text-xs">
                {taxa.percentual > 0 ? (
                  <span className="text-amber-600 dark:text-amber-500 font-medium">
                    ⚠️ Taxa de {taxa.percentual.toFixed(2)}% será descontada no DRE
                  </span>
                ) : (
                  <span className="text-emerald-600 dark:text-emerald-500 font-medium">
                    ✓ Sem taxa configurada (desconto zerado)
                  </span>
                )}
              </div>
            </Card>
          ))}
        </div>

        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-6">
          <h3 className="font-display text-base font-bold mb-4 text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
            <Info className="w-4 h-4 text-[#84A59D]" />
            <span>Exemplo Prático de Dedução</span>
          </h3>
          <div className="space-y-2 text-sm text-zinc-650 dark:text-zinc-400 leading-relaxed">
            <p>Ao realizar um atendimento ou venda de <strong>R$ 1.000,00</strong> paga em cartão de crédito (com taxa de <strong>2.5%</strong>):</p>
            <ul className="list-disc list-inside space-y-1.5 ml-2">
              <li>Faturamento Bruto: R$ 1.000,00</li>
              <li>Dedução de Taxa (2.5%): R$ 25,00</li>
              <li>Valor Líquido creditado na conta: R$ 975,00</li>
              <li><strong>No Demonstrativo de Resultados (DRE):</strong> O valor líquido será integrado, e os R$ 25,00 serão discriminados como custo operacional financeiro.</li>
            </ul>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-4 border-t border-zinc-200 dark:border-zinc-900">
          <Button variant="outline" onClick={loadData} className="h-10 text-xs rounded-lg">Cancelar</Button>
          <Button 
            onClick={saveTaxas} 
            disabled={savingTaxas}
            className="bg-[#84A59D] hover:bg-[#6F9189] text-white h-10 text-xs rounded-lg font-bold"
          >
            {savingTaxas ? "Salvando..." : "Salvar configurações"}
          </Button>
        </div>
      </div>
    </div>
  );
}
