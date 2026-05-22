import React from "react";
import { NavLink, useNavigate, Outlet } from "react-router-dom";
import { useAuth } from "../auth";
import { LayoutDashboard, Calendar, Users, Scissors, Package, UserCog, LogOut, ShoppingBag, Wallet, BarChart3, UsersRound, DollarSign, TrendingUp, Menu, X, Tags } from "lucide-react";
import { Button } from "../components/ui/button";
import ThemeToggle from "../components/ThemeToggle";

const nav = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/agenda", label: "Agenda", icon: Calendar },
  { to: "/clientes", label: "Clientes", icon: Users },
  { to: "/colaboradores", label: "Colaboradores", icon: UserCog },
  { to: "/servicos", label: "Serviços", icon: Scissors },
  { to: "/produtos", label: "Produtos", icon: Package },
  { to: "/categorias", label: "Categorias", icon: Tags },
  { to: "/vendas-diretas", label: "Vendas", icon: ShoppingBag },
  { to: "/despesas", label: "Despesas", icon: DollarSign, adminOnly: true },
  { to: "/outras-receitas", label: "Outras Receitas", icon: TrendingUp, adminOnly: true },
  { to: "/comissoes", label: "Comissões", icon: Wallet, adminOnly: true },
  { to: "/relatorios", label: "Relatórios", icon: BarChart3, adminOnly: true },
  { to: "/configuracoes/taxas-cartao", label: "Configurações", icon: UserCog, adminOnly: true },
  { to: "/usuarios", label: "Usuários", icon: UsersRound, adminOnly: true },
];

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = React.useState(false);

  const doLogout = async () => {
    await logout();
    navigate("/login");
  };

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-background text-foreground">
      {/* Mobile Top Sticky Navbar */}
      <header className="mobile-only-header flex items-center justify-between h-16 px-4 bg-card border-b border-border z-30 shrink-0 sticky top-0">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg brand-gradient flex items-center justify-center">
            <Scissors className="w-4 h-4 text-white" />
          </div>
          <span className="font-display text-base font-semibold tracking-tight">Salon Studio</span>
        </div>
        <Button variant="ghost" size="icon" onClick={() => setMenuOpen(true)} className="h-10 w-10">
          <Menu className="w-6 h-6" />
        </Button>
      </header>

      {/* Mobile Sidebar Backdrop & Drawer Overlay */}
      {menuOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          {/* Backdrop */}
          <div className="fixed inset-0 bg-black/50" onClick={() => setMenuOpen(false)} />
          
          {/* Drawer Content */}
          <aside className="relative w-64 bg-card border-r border-border flex flex-col h-full z-50 animate-in slide-in-from-left duration-200" data-testid="sidebar-mobile">
            <div className="h-16 px-6 flex items-center justify-between border-b border-border shrink-0">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg brand-gradient flex items-center justify-center">
                  <Scissors className="w-4 h-4 text-white" />
                </div>
                <span className="font-display text-lg font-semibold tracking-tight">Salon Studio</span>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setMenuOpen(false)} className="h-8 w-8">
                <X className="w-4 h-4" />
              </Button>
            </div>
            
            <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
              {nav.filter((n) => !n.adminOnly || user?.role === "admin").map((n) => (
                <NavLink
                  key={n.to}
                  to={n.to}
                  end={n.end}
                  onClick={() => setMenuOpen(false)}
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
            
            <div className="p-2 border-t border-border shrink-0 bg-muted/20 dark:bg-muted/10">
              <div className="flex items-center justify-between gap-2 px-2 py-1">
                <div className="min-w-0 flex-1">
                  <div className="font-medium text-xs text-foreground truncate" title={user?.name}>{user?.name}</div>
                  <div className="text-[10px] text-muted-foreground truncate" title={user?.email}>{user?.email}</div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <ThemeToggle />
                  <Button 
                    onClick={doLogout} 
                    variant="ghost" 
                    size="icon" 
                    className="h-7 w-7 text-muted-foreground hover:text-rose-500 hover:bg-rose-500/10 rounded-md" 
                    data-testid="logout-btn"
                    title="Sair"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            </div>
          </aside>
        </div>
      )}

      {/* Desktop Sticky Sidebar */}
      <aside className="desktop-only-sidebar w-64 bg-card border-r border-border flex flex-col h-screen sticky top-0 shrink-0" data-testid="sidebar">
        <div className="h-16 px-6 flex items-center gap-2 border-b border-border shrink-0">
          <div className="w-8 h-8 rounded-lg brand-gradient flex items-center justify-center">
            <Scissors className="w-4 h-4 text-white" />
          </div>
          <span className="font-display text-lg font-semibold tracking-tight">Salon Studio</span>
        </div>
        
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
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
        
        <div className="p-2 border-t border-border shrink-0 bg-muted/20 dark:bg-muted/10">
          <div className="flex items-center justify-between gap-2 px-2 py-1">
            <div className="min-w-0 flex-1">
              <div className="font-medium text-xs text-foreground truncate" title={user?.name}>{user?.name}</div>
              <div className="text-[10px] text-muted-foreground truncate" title={user?.email}>{user?.email}</div>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <ThemeToggle />
              <Button 
                onClick={doLogout} 
                variant="ghost" 
                size="icon" 
                className="h-7 w-7 text-muted-foreground hover:text-rose-500 hover:bg-rose-500/10 rounded-md" 
                data-testid="logout-btn"
                title="Sair"
              >
                <LogOut className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 overflow-x-hidden min-h-screen">
        <Outlet />
      </main>
    </div>
  );
}
