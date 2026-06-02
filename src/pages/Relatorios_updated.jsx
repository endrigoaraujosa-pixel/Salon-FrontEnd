import React, { useEffect, useState } from "react";
import http from "../api";
import { PageHeader } from "../components/Page";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "../components/ui/tabs";
import { FileText, Banknote, Package, TrendingUp, ArrowDownCircle, DollarSign } from "lucide-react";

const fmtBRL = (n) => (n || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const todayStr = () => new Date().toISOString().split("T")[0];
const firstDayMonth = () => { const d = new Date(); d.setDate(1); return d.toISOString().split("T")[0]; };

const FORMA_LABELS = {
  dinheiro: "Dinheiro", pix: "PIX",
  cartao_credito: "Cartão Crédito", cartao_debito: "Cartão Débito",
  vale: "Vale-alimentação", geral: "Total geral"
};

const PresetButtons = ({ onPick }) => {
  const presets = [
    { l: "Hoje", from: todayStr(), to: todayStr() },
    { l: "Esta semana", from: (() => { const d = new Date(); d.setDate(d.getDate() - d.getDay()); return d.toISOString().split("T")[0]; })(), to: todayStr() },
    { l: "Este mês", from: firstDayMonth(), to: todayStr() },
    { l: "Últimos 30 dias", from: (() => { const d = new Date(); d.setDate(d.getDate() - 30); return d.toISOString().split("T")[0]; })(), to: todayStr() },
  ];
  return (
    <div className="flex flex-wrap gap-1">
      {presets.map((p) => <Button key={p.l} size="sm" variant="outline" onClick={() => onPick(p.from, p.to)}>{p.l}</Button>)}
    </div>
  );
};

export default function Relatorios() {
  const [from, setFrom] = useState(firstDayMonth());
  const [to, setTo] = useState(todayStr());
  const [tab, setTab] = useState("dre");
  const [dre, setDre] = useState(null);
  const [caixa, setCaixa] = useState(null);
  const [produtos, setProdutos] = useState(null);

  const reload = () => {
    const params = { data_inicio: from, data_fim: to };
    if (tab === "dre") http.get("/relatorios/dre", { params }).then((r) => setDre(r.data));
    if (tab === "caixa") http.get("/relatorios/caixa", { params }).then((r) => setCaixa(r.data));
    if (tab === "produtos") http.get("/relatorios/produtos", { params }).then((r) => setProdutos(r.data));
  };
  useEffect(() => { reload(); }, [tab, from, to]);

  return (
    <div className="p-6 lg:p-8 fade-in">
      <PageHeader overline="Análise" title="Relatórios" />

      <div className="bg-white border border-zinc-200 rounded-xl p-4 mb-6 flex flex-wrap items-end gap-3">
        <div><Label>De</Label><Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="w-40" data-testid="rep-from" /></div>
        <div><Label>Até</Label><Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="w-40" data-testid="rep-to" /></div>
        <div className="flex-1"><Label>Atalhos</Label><PresetButtons onPick={(a, b) => { setFrom(a); setTo(b); }} /></div>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="mb-6">
          <TabsTrigger value="dre" data-testid="tab-dre"><FileText className="w-4 h-4 mr-1" /> DRE</TabsTrigger>
          <TabsTrigger value="caixa" data-testid="tab-caixa"><Banknote className="w-4 h-4 mr-1" /> Caixa</TabsTrigger>
          <TabsTrigger value="produtos" data-testid="tab-produtos"><Package className="w-4 h-4 mr-1" /> Produtos</TabsTrigger>
        </TabsList>

        <TabsContent value="dre">
          {!dre ? <div className="text-zinc-400">Carregando...</div> : (
            <div className="grid lg:grid-cols-3 gap-4">
              <div className="lg:col-span-2 bg-white border border-zinc-200 rounded-xl p-6 space-y-4">
                <h3 className="font-display text-lg font-medium">Demonstração de Resultado</h3>
                <div className="space-y-2 text-sm">
                  <Row label="Receita de Serviços" value={dre.receita_servicos} />
                  <Row label="Receita de Vendas Diretas" value={dre.receita_vendas_diretas} />
                  <Row label="Outras Receitas" value={dre.outras_receitas} />
                  <div className="border-t border-zinc-200 pt-2"><Row label="Receita Bruta" value={dre.receita_bruta} bold /></div>
                  <Row label="(-) Custo dos Produtos Vendidos" value={-dre.custo_produtos} negative />
                  <div className="border-t border-zinc-200 pt-2"><Row label="Lucro Bruto" value={dre.lucro_bruto} bold highlight /></div>
                  
                  {/* Despesas */}
                  <div className="border-t border-zinc-200 pt-2 mt-4">
                    <div className="font-medium text-zinc-700 mb-2">Despesas Operacionais</div>
                    <Row label="(-) Despesas Fixas" value={-dre.despesas.fixas} negative />
                    <Row label="(-) Despesas Variáveis" value={-dre.despesas.variaveis} negative />
                    <Row label="(-) Taxas de Cartão Crédito" value={-dre.taxas_cartao.credito} negative />
                    <Row label="(-) Taxas de Cartão Débito" value={-dre.taxas_cartao.debito} negative />
                    <div className="border-t border-zinc-200 pt-2">
                      <Row label="Total Despesas Operacionais" value={-dre.despesas_operacionais} bold negative />
                    </div>
                  </div>
                  
                  <div className="border-t border-zinc-200 pt-2 mt-4">
                    <Row label="Lucro Líquido" value={dre.lucro_liquido} bold highlight />
                  </div>
                </div>
              </div>
              <div className="space-y-4">
                <div className="bg-white border border-zinc-200 rounded-xl p-5"><div className="text-xs uppercase tracking-wider text-zinc-400">Atendimentos</div><div className="font-display text-4xl font-semibold mt-1">{dre.total_atendimentos}</div></div>
                <div className="bg-white border border-zinc-200 rounded-xl p-5"><div className="text-xs uppercase tracking-wider text-zinc-400">Vendas diretas</div><div className="font-display text-4xl font-semibold mt-1">{dre.total_vendas_diretas}</div></div>
                <div className="bg-white border border-zinc-200 rounded-xl p-5">
                  <div className="text-xs uppercase tracking-wider text-zinc-400">Taxas de cartão</div>
                  <div className="font-display text-2xl font-semibold mt-1 text-rose-600">{fmtBRL(dre.taxas_cartao.total)}</div>
                  <div className="text-xs text-zinc-500 mt-1 space-y-0.5">
                    <div>Crédito: {fmtBRL(dre.taxas_cartao.credito)} {dre.taxas_cartao.credito_dias !== undefined && `(Prazo: ${dre.taxas_cartao.credito_dias}d)`}</div>
                    <div>Débito: {fmtBRL(dre.taxas_cartao.debito)} {dre.taxas_cartao.debito_dias !== undefined && `(Prazo: ${dre.taxas_cartao.debito_dias}d)`}</div>
                  </div>
                  {dre.taxas_cartao.pmr !== undefined && (
                    <div className="mt-3 pt-3 border-t border-zinc-100 dark:border-zinc-800 text-xs text-zinc-650 flex items-center justify-between font-semibold">
                      <span>Prazo Médio de Recebimento (PMR)</span>
                      <span className="text-zinc-850 dark:text-zinc-100 font-bold bg-zinc-50 dark:bg-zinc-950 px-2 py-0.5 border border-zinc-150 dark:border-zinc-800 rounded">{dre.taxas_cartao.pmr} dias</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </TabsContent>

        <TabsContent value="caixa">
          {!caixa ? <div className="text-zinc-400">Carregando...</div> : (
            <div>
              <div className="bg-white border border-zinc-200 rounded-xl p-5 mb-4 flex items-center justify-between">
                <div>
                  <div className="text-xs uppercase tracking-wider text-zinc-400">Total recebido no período</div>
                  <div className="font-display text-4xl font-semibold mt-1 text-[#3A4F4A]">{fmtBRL(caixa.totais.geral)}</div>
                  <div className="text-xs text-zinc-500 mt-1">{caixa.total_pagamentos} pagamentos</div>
                </div>
                <TrendingUp className="w-10 h-10 text-zinc-200" />
              </div>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                {["dinheiro", "pix", "cartao_credito", "cartao_debito", "vale"].map((k) => (
                  <div key={k} className="bg-white border border-zinc-200 rounded-xl p-4">
                    <div className="text-xs uppercase tracking-wider text-zinc-400">{FORMA_LABELS[k]}</div>
                    <div className="font-display text-2xl font-semibold mt-1">{fmtBRL(caixa.totais[k])}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </TabsContent>

        <TabsContent value="produtos">
          {!produtos ? <div className="text-zinc-400">Carregando...</div> : (
            produtos.produtos.length === 0 ? <div className="bg-white border border-dashed border-zinc-200 rounded-xl p-12 text-center text-zinc-400">Nenhuma venda no período</div> :
            <div className="bg-white border border-zinc-200 rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-zinc-50 text-xs uppercase tracking-wider text-zinc-500"><tr><th className="px-4 py-3 text-left">#</th><th className="px-4 py-3 text-left">Produto</th><th className="px-4 py-3 text-right">Qtd vendida</th><th className="px-4 py-3 text-right">Faturamento</th></tr></thead>
                <tbody className="divide-y divide-zinc-100">
                  {produtos.produtos.map((p, i) => (
                    <tr key={p.produto_id}>
                      <td className="px-4 py-3 text-zinc-500">{i + 1}</td>
                      <td className="px-4 py-3 font-medium">{p.produto_nome}</td>
                      <td className="px-4 py-3 text-right">{p.quantidade}</td>
                      <td className="px-4 py-3 text-right font-display font-semibold text-[#3A4F4A]">{fmtBRL(p.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

const Row = ({ label, value, bold, negative, highlight }) => (
  <div className={`flex items-center justify-between ${bold ? "text-base font-medium" : "text-sm"} ${highlight ? "text-[#3A4F4A]" : ""}`}>
    <span className="text-zinc-700">{label}</span>
    <span className={`font-display ${bold ? "text-xl font-semibold" : ""} ${negative ? "text-rose-600" : ""} ${highlight ? "text-2xl text-[#3A4F4A]" : ""}`}>{fmtBRL(value)}</span>
  </div>
);
