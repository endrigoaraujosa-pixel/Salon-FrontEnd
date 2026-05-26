import React from "react";
import { useNavigate } from "react-router-dom";
import { PageHeader } from "../components/Page";
import { Card } from "../components/ui/card";
import { CreditCard, Users, Sliders, ChevronRight } from "lucide-react";

export default function Configuracoes() {
  const navigate = useNavigate();

  const options = [
    {
      title: "Taxas de Cartão",
      description: "Configure os percentuais de desconto cobrados pelas operadoras de cartão para o faturamento e DRE.",
      icon: CreditCard,
      route: "/configuracoes/taxas-cartao",
      active: true,
      color: "text-emerald-500",
      bgColor: "bg-emerald-50 dark:bg-emerald-950/20"
    },
    {
      title: "Fornecedores",
      description: "Gerencie a rede de parceiros e fornecedores de produtos e serviços para suas compras e custos.",
      icon: Users,
      route: "/configuracoes/fornecedores",
      active: true,
      color: "text-[#84A59D]",
      bgColor: "bg-[#EAF0EE] dark:bg-[#3A4F4A]/20"
    },
    {
      title: "Outras Configurações",
      description: "Novas opções de customização e parâmetros do sistema serão disponibilizadas em breve.",
      icon: Sliders,
      route: null,
      active: false,
      color: "text-zinc-400 dark:text-zinc-500",
      bgColor: "bg-zinc-100 dark:bg-zinc-900"
    }
  ];

  return (
    <div className="p-6 lg:p-8 fade-in min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-800 dark:text-zinc-200">
      <PageHeader 
        overline="Painel de Controle" 
        title="Configurações do Sistema" 
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-6">
        {options.map((opt, i) => (
          <Card 
            key={i} 
            onClick={() => opt.active && opt.route && navigate(opt.route)}
            className={`p-6 border border-zinc-200 dark:border-zinc-850 bg-white dark:bg-zinc-900 rounded-2xl shadow-sm transition-all duration-200 
              ${opt.active 
                ? "cursor-pointer hover:shadow-md hover:border-zinc-300 dark:hover:border-zinc-700 transform hover:-translate-y-0.5" 
                : "opacity-60 cursor-not-allowed"
              }`}
          >
            <div className="flex items-start justify-between gap-4">
              <div className={`p-3 rounded-xl ${opt.bgColor} ${opt.color} flex-shrink-0`}>
                <opt.icon className="w-6 h-6" />
              </div>
              {opt.active && (
                <ChevronRight className="w-5 h-5 text-zinc-400 dark:text-zinc-650 transition-transform duration-200 group-hover:translate-x-1 mt-1" />
              )}
            </div>

            <div className="mt-5">
              <h3 className="font-display font-bold text-lg text-zinc-900 dark:text-zinc-50">
                {opt.title}
              </h3>
              <p className="text-sm text-zinc-550 dark:text-zinc-400 mt-2 leading-relaxed">
                {opt.description}
              </p>
            </div>

            {opt.active ? (
              <div className="mt-4 text-xs font-semibold text-[#84A59D] hover:text-[#6F9189] flex items-center gap-1">
                Acessar painel &rarr;
              </div>
            ) : (
              <div className="mt-4 text-xs font-semibold text-zinc-400 dark:text-zinc-500">
                Em breve
              </div>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
}
