import React from "react";
import { NavLink, useNavigate, Outlet } from "react-router-dom";
import { useAuth } from "../auth";
import { 
  LayoutDashboard, Calendar, Users, Scissors, Package, UserCog, 
  LogOut, ShoppingBag, Wallet, BarChart3, UsersRound, DollarSign, 
  TrendingUp, Menu, X, Tags, ClipboardList, MessageSquare,
  FolderOpen, Megaphone
} from "lucide-react";

import { Button } from "../components/ui/button";
import ThemeToggle from "../components/ThemeToggle";
import { useTheme } from "../ThemeProvider";
import http from "../api";

const nav = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard, end: true, permKey: "dashboard.visualizar" },
  { to: "/agenda", label: "Agenda", icon: Calendar, permKey: "agenda.visualizar" },
  { to: "/agenda/whatsapp-historico", label: "Histórico WhatsApp", icon: MessageSquare, permKey: "agenda.whatsapp_historico" },
  { to: "/whatsapp/mensagem-massa", label: "Mensagem em Massa", icon: Megaphone, permKey: "configuracoes.whatsapp", whatsappOnly: true },
  { to: "/vendas-diretas", label: "Vendas", icon: ShoppingBag, permKey: "vendas.visualizar" },
  { to: "/clientes", label: "Clientes", icon: Users, permKey: "clientes.visualizar" },
  { to: "/colaboradores", label: "Colaboradores", icon: UserCog, permKey: "colaboradores.visualizar" },
  { to: "/categorias", label: "Categorias", icon: Tags, permKey: "cadastros.categorias" },
  { to: "/servicos", label: "Serviços", icon: Scissors, permKey: "servicos.visualizar" },
  { to: "/produtos", label: "Produtos", icon: Package, permKey: "produtos.visualizar" },
  { to: "/comissoes", label: "Comissões", icon: Wallet, permKey: "comissoes.visualizar" },
  { to: "/estoque", label: "Estoque", icon: ClipboardList, permKey: "estoque.visualizar" },
  { to: "/outras-receitas", label: "Outras Receitas", icon: TrendingUp, permKey: "receitas.visualizar" },
  { to: "/despesas", label: "Despesas", icon: DollarSign, permKey: "despesas.visualizar" },
  { to: "/relatorios", label: "Relatórios", icon: BarChart3, permKey: "relatorios" },
  { to: "/cadastros", label: "Cadastros", icon: FolderOpen, permKey: "cadastros.visualizar" },
  { to: "/configuracoes", label: "Configurações", icon: UserCog, permKey: "configuracoes" },
  { to: "/usuarios", label: "Usuários", icon: UsersRound, alwaysVisible: true },
];


export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { theme } = useTheme();
  const [menuOpen, setMenuOpen] = React.useState(false);
  const [nomeFantasia, setNomeFantasia] = React.useState("Salon Studio");
  const [logomarca, setLogomarca] = React.useState(null);
  const [whatsappAtivo, setWhatsappAtivo] = React.useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = React.useState(() => {
    return localStorage.getItem("sidebar_collapsed") === "true";
  });


  const loadEmpresa = () => {
    http.get("/configuracoes/empresa")
      .then((res) => {
        if (res.data) {
          if (res.data.nome_fantasia) {
            setNomeFantasia(res.data.nome_fantasia);
          } else {
            setNomeFantasia("Salon Studio");
          }
          setLogomarca(res.data.logomarca || null);
        }
      })
      .catch((err) => {
        console.error("Erro ao obter empresa:", err);
      });
  };

  const loadWhatsappConfig = () => {
    http.get("/configuracoes/whatsapp")
      .then((res) => {
        if (res.data) {
          setWhatsappAtivo(res.data.ativo === 1);
        }
      })
      .catch((err) => {
        console.error("Erro ao obter config whatsapp:", err);
      });
  };

  React.useEffect(() => {
    loadEmpresa();
    loadWhatsappConfig();

    // Listen to updates
    window.addEventListener("empresa_updated", loadEmpresa);
    window.addEventListener("whatsapp_config_updated", loadWhatsappConfig);
    return () => {
      window.removeEventListener("empresa_updated", loadEmpresa);
      window.removeEventListener("whatsapp_config_updated", loadWhatsappConfig);
    };
  }, []);

  const toggleSidebar = () => {
    setSidebarCollapsed(prev => {
      const next = !prev;
      localStorage.setItem("sidebar_collapsed", String(next));
      return next;
    });
  };

  const doLogout = async () => {
    await logout();
    navigate("/login");
  };

  const renderNavItems = (isMobile = false) => {
    return nav.filter((n) => {
      // Oculta itens exclusivos do WhatsApp quando o serviço está inativo
      if ((n.to === "/agenda/whatsapp-historico" || n.whatsappOnly) && !whatsappAtivo) {
        return false;
      }

      if (n.alwaysVisible) return true;

      if (user?.role === "admin") return true;
      const perfil = user?.perfil;
      if (!perfil || !perfil.permissoes) return false;
      
      const key = n.permKey;
      
      // Chave exata
      if (perfil.permissoes[key] === true) return true;
      
      // Permissão de grupo (ex: relatorios)
      const hasGroup = Object.keys(perfil.permissoes).some(
        k => k.startsWith(`${key}.`) && perfil.permissoes[k] === true
      );
      if (hasGroup) return true;

      // Retrocompatibilidade
      if (perfil.permissoes.menus && perfil.permissoes.menus[key] === true) return true;

      return false;
    }).map((n) => (
      <NavLink
        key={n.to}
        to={n.to}
        end={n.end}
        onClick={() => {
          if (isMobile) setMenuOpen(false);
        }}
        data-testid={`nav-${n.label.toLowerCase()}`}
        className={({ isActive }) =>
          `flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
            isActive 
              ? "bg-[#EAF0EE] text-[#3A4F4A] dark:bg-[#3A4F4A] dark:text-[#EAF0EE]" 
              : "text-muted-foreground hover:bg-muted dark:hover:bg-muted"
          }`
        }
      >
        <n.icon className="w-4 h-4" /> {n.label}
      </NavLink>
    ));
  };
  const activeLogo = logomarca;

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-background text-foreground">
      {/* Mobile Top Sticky Navbar */}
      <header className="mobile-only-header flex items-center justify-between h-16 px-4 bg-card border-b border-border z-30 shrink-0 sticky top-0">
        <div className="flex items-center gap-3">
          {activeLogo ? (
            <div className="h-[52px] w-auto max-w-[180px] overflow-hidden flex items-center justify-center shrink-0">
              <img 
                src={activeLogo} 
                alt="Logo" 
                className="h-full w-auto object-contain" 
                style={theme === "dark" ? { filter: "drop-shadow(0px 0px 4px rgba(255, 255, 255, 0.85))" } : undefined}
              />
            </div>
          ) : (
            <div className="w-9 h-9 rounded-lg brand-gradient flex items-center justify-center shrink-0">
              <Scissors className="w-4.5 h-4.5 text-white" />
            </div>
          )}
          <span 
            className="font-display text-base font-semibold tracking-tight truncate flex-1 min-w-0" 
            title={nomeFantasia}
          >
            {nomeFantasia}
          </span>
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
            <div className="h-20 px-6 flex items-center justify-between border-b border-border shrink-0">
              <div className="flex items-center gap-3">
                {activeLogo ? (
                  <div className="h-14 w-auto max-w-[180px] overflow-hidden flex items-center justify-center shrink-0">
                    <img 
                      src={activeLogo} 
                      alt="Logo" 
                      className="h-full w-auto object-contain" 
                      style={theme === "dark" ? { filter: "drop-shadow(0px 0px 4px rgba(255, 255, 255, 0.85))" } : undefined}
                    />
                  </div>
                ) : (
                  <div className="w-9 h-9 rounded-lg brand-gradient flex items-center justify-center shrink-0">
                    <Scissors className="w-4.5 h-4.5 text-white" />
                  </div>
                )}
                <span 
                  className="font-display text-lg font-semibold tracking-tight leading-tight line-clamp-2 break-words flex-1 min-w-0" 
                  title={nomeFantasia}
                >
                  {nomeFantasia}
                </span>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setMenuOpen(false)} className="h-8 w-8">
                <X className="w-4 h-4" />
              </Button>
            </div>
            
            <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
              {renderNavItems(true)}
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
      <aside 
        className={`desktop-only-sidebar bg-card border-r border-border flex flex-col h-screen sticky top-0 shrink-0 transition-all duration-300 ease-in-out ${
          sidebarCollapsed ? "w-0 opacity-0 overflow-hidden border-r-0" : "w-64 opacity-100"
        }`} 
        data-testid="sidebar"
      >
        <div className="h-20 px-6 flex items-center gap-3 border-b border-border shrink-0">
          {activeLogo ? (
            <div className="h-14 w-auto max-w-[180px] overflow-hidden flex items-center justify-center shrink-0">
              <img 
                src={activeLogo} 
                alt="Logo" 
                className="h-full w-auto object-contain animate-in fade-in zoom-in-95 duration-300" 
                style={theme === "dark" ? { filter: "drop-shadow(0px 0px 4px rgba(255, 255, 255, 0.85))" } : undefined}
              />
            </div>
          ) : (
            <div className="w-9 h-9 rounded-lg brand-gradient flex items-center justify-center shrink-0">
              <Scissors className="w-4.5 h-4.5 text-white" />
            </div>
          )}
          <span 
            className="font-display text-lg font-semibold tracking-tight leading-tight line-clamp-2 break-words flex-1 min-w-0" 
            title={nomeFantasia}
          >
            {nomeFantasia}
          </span>
        </div>
        
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {renderNavItems(false)}
        </nav>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 overflow-x-hidden min-h-screen flex flex-col">
        {/* Desktop Top Header Bar for Sidebar Toggle & Theme/User stats */}
        <header className="hidden md:flex items-center justify-between h-20 px-6 lg:px-8 bg-card border-b border-border z-20 sticky top-0 shrink-0 select-none">
          <div className="flex items-center gap-4">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={toggleSidebar} 
              className="h-10 w-10 text-muted-foreground hover:text-foreground"
              title={sidebarCollapsed ? "Exibir Menu" : "Ocultar Menu"}
            >
              <Menu className="w-5 h-5" />
            </Button>
            {sidebarCollapsed && (
              <div className="flex items-center gap-3 animate-in fade-in duration-200">
                {activeLogo ? (
                  <div className="h-[52px] w-auto max-w-[180px] overflow-hidden flex items-center justify-center shrink-0">
                    <img 
                      src={activeLogo} 
                      alt="Logo" 
                      className="h-full w-auto object-contain" 
                      style={theme === "dark" ? { filter: "drop-shadow(0px 0px 4px rgba(255, 255, 255, 0.85))" } : undefined}
                    />
                  </div>
                ) : (
                  <div className="w-9 h-9 rounded-lg brand-gradient flex items-center justify-center shrink-0">
                    <Scissors className="w-4.5 h-4.5 text-white" />
                  </div>
                )}
                <span 
                  className="font-display text-base font-semibold tracking-tight truncate flex-1 min-w-0" 
                  title={nomeFantasia}
                >
                  {nomeFantasia}
                </span>
              </div>
            )}
          </div>
          
          <div className="flex items-center gap-4">
            <div className="text-right hidden lg:block">
              <div className="font-semibold text-sm text-foreground">{user?.name}</div>
              <div className="text-xs text-muted-foreground mt-0.5">{user?.email}</div>
            </div>
            <ThemeToggle />
            <Button 
              onClick={doLogout} 
              variant="ghost" 
              size="icon" 
              className="h-9 w-9 text-muted-foreground hover:text-rose-500 hover:bg-rose-500/10 rounded-md"
              title="Sair"
            >
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </header>

        <div className="flex-1">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
