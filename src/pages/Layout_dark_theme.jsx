import React from "react";
import { NavLink, useNavigate, Outlet } from "react-router-dom";
import { useAuth } from "../auth";
import { LayoutDashboard, Calendar, Users, Scissors, Package, UserCog, LogOut, ShoppingBag, Wallet, BarChart3, UsersRound, DollarSign, TrendingUp } from "lucide-react";
import { Button } from "../components/ui/button";
import ThemeToggle from "../components/ThemeToggle";

const nav = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/agenda", label: "Agenda", icon: Calendar },
  { to: "/clientes", label: "Clientes", icon: Users },
  { to: "/colaboradores", label: "Colaboradores", icon: UserCog, adminOnly: true },
  { to: "/servicos", label: "Serviços", icon: Scissors },
  { to: "/produtos", label: "Produtos", icon: Package },
  { to: "/vendas-diretas", label: "Vendas", icon: ShoppingBag },
  { to: "/despesas", label: "Despesas", icon: DollarSign },
  { to: "/outras-receitas", label: "Outras Receitas", icon: TrendingUp },
  { to: "/comissoes", label: "Comissões", icon: Wallet },
  { to: "/relatorios", label: "Relatórios", icon: BarChart3 },
  { to: "/configuracoes/taxas-cartao", label: "Configurações", icon: UserCog, adminOnly: true },
  { to: "/usuarios", label: "Usuários", icon: UsersRound, adminOnly: true },
];

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const doLogout = async () => {
    await logout();
    navigate("/login");
  };

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      <aside className="w-64 bg-card border-r border-border flex flex-col" data-testid="sidebar">
        <div className="h-16 px-6 flex items-center gap-2 border-b border-border">
          <div className="w-8 h-8 rounded-lg brand-gradient flex items-center justify-center">
            <Scissors className="w-4 h-4 text-white" />
          </div>
          <span className="font-display text-lg font-semibold tracking-tight">Salon Studio</span>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-1">
          {nav.filter((n) => !n.adminOnly || user?.role === "admin").map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              end={n.end}
              data-testid={`nav-${n.label.toLowerCase()}`}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isActive ? "bg-[#EAF0EE] text-[#3A4F4A] dark:bg-[#3A4F4A] dark:text-[#EAF0EE]" : "text-muted-foreground hover:bg-muted dark:hover:bg-muted"
                }`
              }
            >
              <n.icon className="w-4 h-4" /> {n.label}
            </NavLink>
          ))}
        </nav>
        <div className="p-3 border-t border-border space-y-3">
          <div className="flex justify-center">
            <ThemeToggle />
          </div>
          <div className="px-3 py-2">
            <div className="text-xs uppercase tracking-wider text-muted-foreground">Usuária</div>
            <div className="font-medium text-sm text-foreground">{user?.name}</div>
            <div className="text-xs text-muted-foreground">{user?.email}</div>
          </div>
          <Button onClick={doLogout} variant="ghost" size="sm" className="w-full justify-start text-muted-foreground hover:text-foreground" data-testid="logout-btn">
            <LogOut className="w-4 h-4 mr-2" /> Sair
          </Button>
        </div>
      </aside>
      <main className="flex-1 overflow-x-hidden">
        <Outlet />
      </main>
    </div>
  );
}
