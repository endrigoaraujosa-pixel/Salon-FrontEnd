import React, { useEffect, useState } from "react";
import http from "../api";
import { PageHeader } from "../components/Page";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "../components/ui/tabs";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "../components/ui/select";
import { FileText, Banknote, Package, TrendingUp, User } from "lucide-react";

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
  
  // Estados para filtro por profissional
  const [colaboradores, setColaboradores] = useState([]);
  const [colaboradorId, setColaboradorId] = useState("todos");

  useEffect(() => {
    http.get("/colaboradores")
      .then((r) => setColaboradores(r.data))
      .catch(() => {});
  }, []);

  const reload = () => {
    const params = { data_inicio: from, data_fim: to };
    if (tab === "dre") http.get("/relatorios/dre", { params }).then((r) => setDre(r.data));
    if (tab === "caixa") {
      const caixaParams = { ...params, colaborador_id: colaboradorId };
      http.get("/relatorios/caixa", { params: caixaParams }).then((r) => setCaixa(r.data));
    }
    if (tab === "produtos") http.get("/relatorios/produtos", { params }).then((r) => setProdutos(r.data));
  };

  useEffect(() => { reload(); }, [tab, from, to, colaboradorId]);

  return (
    <div className="p-6 lg:p-8 fade-in max-w-7xl mx-auto">
      <PageHeader overline="Análise" title="Relatórios" />

      <div className="bg-white border border-zinc-200 rounded-xl p-4 mb-6 flex flex-wrap items-end gap-4 shadow-sm">
        <div>
          <Label className="text-xs uppercase font-bold text-zinc-400 tracking-wider">De</Label>
          <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="w-40" data-testid="rep-from" />
        </div>
        <div>
          <Label className="text-xs uppercase font-bold text-zinc-400 tracking-wider">Até</Label>
          <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="w-40" data-testid="rep-to" />
        </div>

        {tab === "caixa" && (
          <div className="w-64">
            <Label className="text-xs uppercase font-bold text-zinc-400 tracking-wider">Profissional</Label>
            <Select value={colaboradorId} onValueChange={setColaboradorId}>
              <SelectTrigger data-testid="rep-colab" className="bg-white">
                <SelectValue placeholder="Todos os usuários" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os usuários</SelectItem>
                {colaboradores.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        <div className="flex-1 min-w-[200px]">
          <Label className="text-xs uppercase font-bold text-zinc-400 tracking-wider">Atalhos de Período</Label>
          <PresetButtons onPick={(a, b) => { setFrom(a); setTo(b); }} />
        </div>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="mb-6 bg-zinc-100 p-1 rounded-lg">
          <TabsTrigger value="dre" data-testid="tab-dre" className="flex items-center gap-1.5"><FileText className="w-4 h-4" /> DRE</TabsTrigger>
          <TabsTrigger value="caixa" data-testid="tab-caixa" className="flex items-center gap-1.5"><Banknote className="w-4 h-4" /> Caixa</TabsTrigger>
          <TabsTrigger value="produtos" data-testid="tab-produtos" className="flex items-center gap-1.5"><Package className="w-4 h-4" /> Produtos</TabsTrigger>
        </TabsList>

        <TabsContent value="dre">
          {!dre ? <div className="text-zinc-400 p-8 text-center">Carregando...</div> : (
            <div className="grid lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 bg-white border border-zinc-200 rounded-xl p-6 space-y-4 shadow-sm">
                <h3 className="font-display text-lg font-medium text-zinc-800">Demonstração de Resultado</h3>
                <div className="space-y-3 text-sm divide-y divide-zinc-100">
                  <div className="pt-2"><Row label="Receita de Serviços" value={dre.receita_servicos} /></div>
                  <div className="pt-2"><Row label="Receita de Vendas Diretas" value={dre.receita_vendas_diretas} /></div>
                  <div className="pt-2"><Row label="Outras Receitas" value={dre.outras_receitas} /></div>
                  <div className="border-t border-zinc-200 pt-3"><Row label="Receita Bruta" value={dre.receita_bruta} bold /></div>
                  <div className="pt-2"><Row label="(-) Custo dos Produtos Vendidos" value={-dre.custo_produtos} negative /></div>
                  <div className="border-t border-zinc-200 pt-3"><Row label="Lucro Bruto" value={dre.lucro_bruto} bold highlight /></div>
                  
                  {/* Despesas */}
                  <div className="border-t border-zinc-200 pt-4 mt-4">
                    <div className="font-semibold text-zinc-800 mb-2">Despesas Operacionais</div>
                    <div className="space-y-2 pl-2">
                      <Row label="(-) Despesas Fixas" value={-dre.despesas.fixas} negative />
                      <Row label="(-) Despesas Variáveis" value={-dre.despesas.variaveis} negative />
                      <Row label="(-) Taxas de Cartão Crédito" value={-dre.taxas_cartao.credito} negative />
                      <Row label="(-) Taxas de Cartão Débito" value={-dre.taxas_cartao.debito} negative />
                    </div>
                    <div className="border-t border-zinc-100 pt-3 mt-2">
                      <Row label="Total Despesas Operacionais" value={-dre.despesas_operacionais} bold negative />
                    </div>
                  </div>
                  
                  <div className="border-t border-zinc-300 pt-3 mt-4">
                    <Row label="Lucro Líquido" value={dre.lucro_liquido} bold highlight />
                  </div>
                </div>
              </div>
              <div className="space-y-4">
                <div className="bg-white border border-zinc-200 rounded-xl p-5 shadow-sm">
                  <div className="text-xs uppercase tracking-wider text-zinc-400">Atendimentos</div>
                  <div className="font-display text-4xl font-semibold mt-1 text-[#3A4F4A]">{dre.total_atendimentos}</div>
                </div>
                <div className="bg-white border border-zinc-200 rounded-xl p-5 shadow-sm">
                  <div className="text-xs uppercase tracking-wider text-zinc-400">Vendas diretas</div>
                  <div className="font-display text-4xl font-semibold mt-1 text-[#3A4F4A]">{dre.total_vendas_diretas}</div>
                </div>
                <div className="bg-white border border-zinc-200 rounded-xl p-5 shadow-sm">
                  <div className="text-xs uppercase tracking-wider text-zinc-400">Taxas de cartão</div>
                  <div className="font-display text-2xl font-semibold mt-1 text-rose-600">{fmtBRL(dre.taxas_cartao.total)}</div>
                  <div className="text-xs text-zinc-500 mt-2 space-y-0.5">
                    <div>Crédito: {fmtBRL(dre.taxas_cartao.credito)}</div>
                    <div>Débito: {fmtBRL(dre.taxas_cartao.debito)}</div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </TabsContent>

        <TabsContent value="caixa">
          {!caixa ? <div className="text-zinc-400 p-8 text-center">Carregando...</div> : (
            <div className="space-y-6">
              <div className="bg-white border border-zinc-200 rounded-xl p-6 flex items-center justify-between shadow-sm">
                <div>
                  <div className="text-xs uppercase tracking-wider text-zinc-400">
                    {colaboradorId === "todos" 
                      ? "Total recebido no período (Todos os usuários)" 
                      : `Total recebido por ${colaboradores.find(c => c.id === colaboradorId)?.nome}`}
                  </div>
                  <div className="font-display text-4xl font-semibold mt-1 text-[#3A4F4A]">{fmtBRL(caixa.totais.geral)}</div>
                  <div className="text-xs text-zinc-500 mt-1">{caixa.total_pagamentos} pagamentos registrados</div>
                </div>
                <div className="bg-[#84A59D]/10 p-3 rounded-full">
                  {colaboradorId === "todos" ? (
                    <TrendingUp className="w-8 h-8 text-[#84A59D]" />
                  ) : (
                    <User className="w-8 h-8 text-[#84A59D]" />
                  )}
                </div>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                {["dinheiro", "pix", "cartao_credito", "cartao_debito", "vale"].map((k) => (
                  <div key={k} className="bg-white border border-zinc-200 rounded-xl p-5 shadow-sm hover:shadow transition-shadow">
                    <div className="text-xs uppercase tracking-wider text-zinc-400 font-semibold">{FORMA_LABELS[k]}</div>
                    <div className="font-display text-2xl font-bold mt-1.5 text-zinc-700">{fmtBRL(caixa.totais[k])}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </TabsContent>

        <TabsContent value="produtos">
          {!produtos ? <div className="text-zinc-400 p-8 text-center">Carregando...</div> : (
            produtos.produtos.length === 0 ? (
              <div className="bg-white border border-dashed border-zinc-200 rounded-xl p-12 text-center text-zinc-400 shadow-sm">
                Nenhuma venda de produto registrada no período.
              </div>
            ) : (
              <div className="bg-white border border-zinc-200 rounded-xl overflow-hidden shadow-sm">
                <table className="w-full text-sm">
                  <thead className="bg-zinc-50 text-xs uppercase tracking-wider text-zinc-500 border-b border-zinc-200">
                    <tr>
                      <th className="px-5 py-3 text-left">#</th>
                      <th className="px-5 py-3 text-left">Produto</th>
                      <th className="px-5 py-3 text-right">Qtd vendida</th>
                      <th className="px-5 py-3 text-right">Faturamento</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100">
                    {produtos.produtos.map((p, i) => (
                      <tr key={p.produto_id} className="hover:bg-zinc-50/55 transition-colors">
                        <td className="px-5 py-3 text-zinc-400 font-mono">{i + 1}</td>
                        <td className="px-5 py-3 font-semibold text-zinc-700">{p.produto_nome}</td>
                        <td className="px-5 py-3 text-right font-medium">{p.quantidade}</td>
                        <td className="px-5 py-3 text-right font-display font-semibold text-[#3A4F4A]">{fmtBRL(p.total)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

const Row = ({ label, value, bold, negative, highlight }) => (
  <div className={`flex items-center justify-between py-1 ${bold ? "text-base font-semibold" : "text-sm"} ${highlight ? "text-[#3A4F4A]" : ""}`}>
    <span className="text-zinc-600 font-medium">{label}</span>
    <span className={`font-display ${bold ? "text-xl font-bold" : ""} ${negative ? "text-rose-600" : ""} ${highlight ? "text-2xl text-[#3A4F4A]" : ""}`}>{fmtBRL(value)}</span>
  </div>
);
