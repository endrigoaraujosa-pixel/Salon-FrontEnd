import React, { useEffect, useState } from "react";
import http from "../api";
import { Users, Calendar, DollarSign, TrendingUp, Package, ArrowUpRight } from "lucide-react";
import { useAuth } from "../auth";

const Stat = ({ icon: Icon, label, value, hint, tone = "default" }) => (
  <div className="bg-white border border-zinc-200 rounded-xl p-5 hover:shadow-sm transition-shadow" data-testid={`kpi-${label.toLowerCase().replace(/\s/g, '-')}`}>
    <div className="flex items-start justify-between">
      <div className="w-9 h-9 rounded-lg bg-[#EAF0EE] flex items-center justify-center">
        <Icon className="w-4 h-4 text-[#3A4F4A]" />
      </div>
      {tone === "warning" && <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">Alerta</span>}
    </div>
    <div className="mt-4">
      <div className="text-xs uppercase tracking-wider text-zinc-400 font-medium">{label}</div>
      <div className="font-display text-3xl font-semibold tracking-tight mt-1">{value}</div>
      {hint && <div className="text-xs text-zinc-500 mt-1">{hint}</div>}
    </div>
  </div>
);

const fmtBRL = (n) => (n || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export default function Dashboard() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const [d, setD] = useState(null);
  
  useEffect(() => { 
    http.get("/dashboard").then((r) => setD(r.data)).catch((err) => {
      console.error("Erro ao carregar dashboard:", err);
      setD({
        faturamento_mes: 0,
        agendamentos_hoje: 0,
        ticket_medio: 0,
        total_clientes: 0,
        total_colaboradores: 0,
        atendimentos_mes: 0,
        top_servicos: [],
        estoque_baixo: 0
      });
    }); 
  }, []);
  
  if (!d) return <div className="p-8 text-zinc-400">Carregando...</div>;
  
  // Garantir que top_servicos seja um array
  const topServicos = d.top_servicos || [];
  
  return (
    <div className="p-6 lg:p-8 fade-in">
      <header className="mb-8">
        <div className="text-xs uppercase tracking-wider text-zinc-400">Visão geral</div>
        <h1 className="font-display text-4xl font-semibold tracking-tight mt-1">Dashboard</h1>
      </header>

      <div className={`grid grid-cols-2 ${isAdmin ? "lg:grid-cols-4" : "lg:grid-cols-3"} gap-4 mb-8`}>
        {isAdmin && <Stat icon={DollarSign} label="Faturamento Mês" value={fmtBRL(d.faturamento_mes)} hint={`${d.atendimentos_mes || 0} atendimentos`} />}
        <Stat icon={Calendar} label="Agendamentos Hoje" value={d.agendamentos_hoje || 0} />
        {isAdmin && <Stat icon={TrendingUp} label="Ticket Médio" value={fmtBRL(d.ticket_medio)} />}
        {!isAdmin && <Stat icon={TrendingUp} label="Atendimentos Mês" value={d.atendimentos_mes || 0} />}
        <Stat icon={Users} label="Clientes" value={d.total_clientes || 0} hint={isAdmin ? `${d.total_colaboradores || 0} profissionais` : undefined} />
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 bg-white border border-zinc-200 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display font-medium text-lg">Top Serviços do mês</h3>
            <ArrowUpRight className="w-4 h-4 text-zinc-400" />
          </div>
          {topServicos.length === 0 && <div className="text-sm text-zinc-400 py-8 text-center">Sem dados ainda</div>}
          {topServicos.length > 0 && (
            <ul className="divide-y divide-zinc-100">
              {topServicos.map((s, i) => (
                <li key={i} className="py-3 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="w-7 h-7 rounded-full bg-zinc-100 flex items-center justify-center text-xs font-medium text-zinc-600">{i + 1}</span>
                    <span className="font-medium text-sm">{s.nome}</span>
                  </div>
                  <div className="text-right">
                    {isAdmin && <div className="text-sm font-medium">{fmtBRL(s.total)}</div>}
                    <div className="text-xs text-zinc-400 font-medium">{s.qtd}x atendimentos</div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="bg-white border border-zinc-200 rounded-xl p-6">
          <div className="flex items-center gap-2 mb-1"><Package className="w-4 h-4 text-zinc-400" /><h3 className="font-display font-medium text-lg">Estoque</h3></div>
          <p className="text-sm text-zinc-500 mb-4">Produtos com nível baixo</p>
          <div className="font-display text-5xl font-semibold tracking-tight text-[#3A4F4A]">{d.estoque_baixo || 0}</div>
          <div className="text-xs text-zinc-500 mt-1">precisam reposição</div>
        </div>
      </div>
    </div>
  );
}