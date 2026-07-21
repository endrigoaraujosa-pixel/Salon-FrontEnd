import React from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth";
import { PageHeader } from "../components/Page";
import { Card } from "../components/ui/card";
import { Sliders, ChevronRight, ShieldCheck, Building, MessageCircle, Lock } from "lucide-react";

export default function Configuracoes() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const isAdmin = user?.role === "admin";
  const permissoes = user?.perfil?.permissoes || {};

  const hasPermission = (permKey) => {
    if (isAdmin) return true;
    if (permissoes[permKey] === true) return true;
    // Verifica permissões agrupadas (ex: "perfis" verifica se tem "perfis.algo")
    const hasGroup = Object.keys(permissoes).some(
      k => k.startsWith(`${permKey}.`) && permissoes[k] === true
    );
    if (hasGroup) return true;
    // Retrocompatibilidade formato antigo
    if (permissoes.menus && permissoes.menus[permKey] === true) return true;
    return false;
  };

  const options = [
    {
      title: "Perfis de Acesso",
      description: "Gerencie perfis de acesso (Administrador, Funcionário) e configure permissões de menus, ações e visibilidade financeira.",
      icon: ShieldCheck,
      route: "/configuracoes/perfis-acesso",
      permKey: "configuracoes.perfis_acesso",
      color: "text-blue-500",
      bgColor: "bg-blue-55 dark:bg-blue-950/20"
    },
    {
      title: "Empresas",
      description: "Cadastre e edite as informações de sua empresa (Nome Fantasia, CNPJ, Inscrição Estadual, etc.).",
      icon: Building,
      route: "/configuracoes/empresa",
      permKey: "configuracoes.empresa",
      color: "text-indigo-500",
      bgColor: "bg-indigo-50 dark:bg-indigo-950/20"
    },
    {
      title: "WhatsApp",
      description: "Gerencie a rotina de envio automático de lembretes de agendamento via WhatsApp.",
      icon: MessageCircle,
      route: "/configuracoes/whatsapp",
      permKey: "configuracoes.whatsapp",
      color: "text-emerald-600 dark:text-emerald-450",
      bgColor: "bg-emerald-50 dark:bg-emerald-950/15"
    },
    {
      title: "Configurações",
      description: "Gerencie as diretrizes e regras gerais do sistema, como o controle de valores de agendamentos.",
      icon: Sliders,
      route: "/configuracoes/gerais",
      permKey: "configuracoes.sistema",
      color: "text-purple-600 dark:text-purple-450",
      bgColor: "bg-purple-50 dark:bg-purple-950/15"
    },
    {
      title: "Agendamento Online",
      description: "Defina os dias e horários de funcionamento disponíveis para o portal de agendamento online.",
      icon: Sliders,
      route: "/configuracoes/agendamento-online",
      permKey: "configuracoes.sistema",
      color: "text-amber-500",
      bgColor: "bg-amber-50 dark:bg-amber-950/15"
    }
  ];


  return (
    <div className="p-6 lg:p-8 fade-in min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-800 dark:text-zinc-200">
      <PageHeader 
        overline="Painel de Controle" 
        title="Configurações do Sistema" 
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-6">
        {options.map((opt, i) => {
          const allowed = hasPermission(opt.permKey);
          return (
            <Card 
              key={i} 
              onClick={() => allowed && opt.route && navigate(opt.route)}
              className={`p-6 border border-zinc-200 dark:border-zinc-850 bg-white dark:bg-zinc-900 rounded-2xl shadow-sm transition-all duration-200 
                ${allowed 
                  ? "cursor-pointer hover:shadow-md hover:border-zinc-300 dark:hover:border-zinc-700 transform hover:-translate-y-0.5" 
                  : "opacity-60 cursor-not-allowed"
                }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className={`p-3 rounded-xl ${opt.bgColor} ${allowed ? opt.color : "text-zinc-400 dark:text-zinc-500"} flex-shrink-0`}>
                  <opt.icon className="w-6 h-6" />
                </div>
                {allowed ? (
                  <ChevronRight className="w-5 h-5 text-zinc-400 dark:text-zinc-650 transition-transform duration-200 group-hover:translate-x-1 mt-1" />
                ) : (
                  <Lock className="w-4 h-4 text-zinc-400 dark:text-zinc-500 mt-1.5" />
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

              {allowed ? (
                <div className="mt-4 text-xs font-semibold text-[#84A59D] hover:text-[#6F9189] flex items-center gap-1">
                  Acessar painel &rarr;
                </div>
              ) : (
                <div className="mt-4 text-xs font-semibold text-amber-500 dark:text-amber-400 flex items-center gap-1.5">
                  <Lock className="w-3 h-3" />
                  Sem permissão de acesso
                </div>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}
