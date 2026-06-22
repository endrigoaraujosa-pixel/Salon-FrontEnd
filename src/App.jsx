import React from "react";
import "./App.css";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./auth";
import { ThemeProvider } from "./ThemeProvider";
import { Toaster } from "./components/ui/sonner";
import Login from "./pages/Login";
import Layout from "./pages/Layout";
import Dashboard from "./pages/Dashboard";
import Clientes from "./pages/Clientes";
import ClienteHistorico from "./pages/ClienteHistorico";
import Colaboradores from "./pages/Colaboradores";
import Servicos from "./pages/Servicos";
import Produtos from "./pages/Produtos";
import Categorias from "./pages/Categorias";
import Agenda from "./pages/Agenda";
import Pagamento from "./pages/Pagamento";
import VendasDiretas from "./pages/VendasDiretas";
import VendaPagamento from "./pages/VendaPagamento";
import Comissoes from "./pages/Comissoes";
import Relatorios from "./pages/Relatorios";
import Usuarios from "./pages/Usuarios";
import Despesas from "./pages/Despesas";
import OutrasReceitas from "./pages/OutrasReceitas";
import Configuracoes from "./pages/Configuracoes";
import ConfiguracoesTaxas from "./pages/ConfiguracoesTaxas";
import ConfiguracoesFornecedores from "./pages/ConfiguracoesFornecedores";
import PerfisAcesso from "./pages/PerfisAcesso";
import EntradaProdutos from "./pages/EntradaProdutos";
import Inventario from "./pages/Inventario";
import Estoque from "./pages/Estoque";
import ConfiguracoesEmpresa from "./pages/ConfiguracoesEmpresa";
import ConfiguracoesWhatsApp from "./pages/ConfiguracoesWhatsApp";
import ConfiguracoesGerais from "./pages/ConfiguracoesGerais";
import AgendaWhatsAppHistorico from "./pages/AgendaWhatsAppHistorico";
import CadastroTipoPagamento from "./pages/CadastroTipoPagamento";
import CadastroDescontos from "./pages/CadastroDescontos";
import Cadastros from "./pages/Cadastros";
import ConfiguracoesMotivosEstoque from "./pages/ConfiguracoesMotivosEstoque";
import ClienteCreditoExtrato from "./pages/ClienteCreditoExtrato";
import http from "./api";

const Protected = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Carregando...</div>;
  if (!user) return <Navigate to="/login" replace />;
  return children;
};

const AdminRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Carregando...</div>;
  if (!user || user.role !== "admin") return <Navigate to="/" replace />;
  return children;
};

const PermissionRoute = ({ children, permKey }) => {
  const { user, loading } = useAuth();
  if (loading) return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Carregando...</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (user.role === "admin") return children;
  const perfil = user.perfil;
  if (!perfil || !perfil.permissoes || !perfil.permissoes.menus || !perfil.permissoes.menus[permKey]) {
    return <Navigate to="/" replace />;
  }
  return children;
};

const generateAppleTouchIcon = (logoUrl) => {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = 180;
      canvas.height = 180;
      const ctx = canvas.getContext("2d");

      // Draw solid white background to prevent black transparency on iOS
      ctx.fillStyle = "#FFFFFF";
      ctx.fillRect(0, 0, 180, 180);

      // Safe zone size: 144x144 (15% padding on each side)
      const maxDim = 144;
      let w = img.width;
      let h = img.height;
      const ratio = w / h;

      if (w > h) {
        w = maxDim;
        h = maxDim / ratio;
      } else {
        h = maxDim;
        w = maxDim * ratio;
      }

      const x = (180 - w) / 2;
      const y = (180 - h) / 2;

      ctx.drawImage(img, x, y, w, h);
      resolve(canvas.toDataURL("image/png"));
    };
    img.onerror = () => {
      resolve(logoUrl);
    };
    img.src = logoUrl;
  });
};

function App() {
  React.useEffect(() => {
    const updateBrandIcons = async () => {
      try {
        const response = await http.get("/configuracoes/empresa/public");
        if (response.data && response.data.logomarca) {
          const logoUrl = response.data.logomarca;
          
          // Update favicon
          let favicon = document.getElementById("favicon");
          if (!favicon) {
            favicon = document.querySelector("link[rel*='icon']");
          }
          if (favicon) {
            favicon.href = logoUrl;
            if (logoUrl.startsWith("data:image/")) {
              const mime = logoUrl.substring(logoUrl.indexOf(":") + 1, logoUrl.indexOf(";"));
              favicon.type = mime;
            }
          }

          // Update apple-touch-icon
          let appleIcon = document.getElementById("apple-touch-icon");
          if (!appleIcon) {
            appleIcon = document.querySelector("link[rel='apple-touch-icon']");
          }
          if (!appleIcon) {
            appleIcon = document.createElement("link");
            appleIcon.id = "apple-touch-icon";
            appleIcon.rel = "apple-touch-icon";
            document.head.appendChild(appleIcon);
          }
          if (appleIcon) {
            const processedIcon = await generateAppleTouchIcon(logoUrl);
            appleIcon.href = processedIcon;
          }
        }
      } catch (err) {
        console.error("Erro ao carregar ícones da empresa:", err);
      }
    };
    
    updateBrandIcons();
    window.addEventListener("empresa_updated", updateBrandIcons);
    return () => {
      window.removeEventListener("empresa_updated", updateBrandIcons);
    };
  }, []);

  return (
    <ThemeProvider>

      <AuthProvider>
        <BrowserRouter>
          <Toaster position="top-right" richColors />
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route element={<Protected><Layout /></Protected>}>
              <Route path="/" element={<Dashboard />} />
              <Route path="/agenda" element={<Agenda />} />
              <Route path="/clientes" element={<Clientes />} />
              <Route path="/clientes/:id/historico" element={<ClienteHistorico />} />
              <Route path="/clientes/credito/extrato" element={<ClienteCreditoExtrato />} />
              <Route path="/colaboradores" element={<AdminRoute><Colaboradores /></AdminRoute>} />
              <Route path="/servicos" element={<Servicos />} />
              <Route path="/produtos" element={<Produtos />} />
              <Route path="/estoque" element={<Estoque />} />
              <Route path="/estoque/entrada" element={<EntradaProdutos />} />
              <Route path="/estoque/inventario" element={<Inventario />} />
              <Route path="/categorias" element={<Categorias />} />
              <Route path="/agendamentos/:id/pagamento" element={<Pagamento />} />
              <Route path="/vendas-diretas" element={<VendasDiretas />} />
              <Route path="/vendas-diretas/:id/pagamento" element={<VendaPagamento />} />
              <Route path="/despesas" element={<AdminRoute><Despesas /></AdminRoute>} />
              <Route path="/outras-receitas" element={<AdminRoute><OutrasReceitas /></AdminRoute>} />
              <Route path="/comissoes" element={<Comissoes />} />
              <Route path="/relatorios" element={<AdminRoute><Relatorios /></AdminRoute>} />
              <Route path="/configuracoes" element={<AdminRoute><Configuracoes /></AdminRoute>} />
              <Route path="/configuracoes/taxas-cartao" element={<AdminRoute><ConfiguracoesTaxas /></AdminRoute>} />
              <Route path="/configuracoes/fornecedores" element={<AdminRoute><ConfiguracoesFornecedores /></AdminRoute>} />
              <Route path="/configuracoes/perfis-acesso" element={<AdminRoute><PerfisAcesso /></AdminRoute>} />
              <Route path="/configuracoes/empresa" element={<AdminRoute><ConfiguracoesEmpresa /></AdminRoute>} />
              <Route path="/configuracoes/whatsapp" element={<AdminRoute><ConfiguracoesWhatsApp /></AdminRoute>} />
              <Route path="/configuracoes/gerais" element={<AdminRoute><ConfiguracoesGerais /></AdminRoute>} />
              <Route path="/cadastros" element={<PermissionRoute permKey="cadastros"><Cadastros /></PermissionRoute>} />
              <Route path="/cadastros/fornecedores" element={<PermissionRoute permKey="cadastros"><ConfiguracoesFornecedores /></PermissionRoute>} />
              <Route path="/cadastros/tipo-pagamento" element={<PermissionRoute permKey="cadastros"><CadastroTipoPagamento /></PermissionRoute>} />
              <Route path="/cadastros/descontos" element={<PermissionRoute permKey="cadastros"><CadastroDescontos /></PermissionRoute>} />
              <Route path="/cadastros/motivos-estoque" element={<PermissionRoute permKey="cadastros"><ConfiguracoesMotivosEstoque /></PermissionRoute>} />
              <Route path="/agenda/whatsapp-historico" element={<PermissionRoute permKey="agenda"><AgendaWhatsAppHistorico /></PermissionRoute>} />
              <Route path="/usuarios" element={<Usuarios />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
