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
import CadastroAdquirentes from "./pages/CadastroAdquirentes";
import Cadastros from "./pages/Cadastros";
import ConfiguracoesMotivosEstoque from "./pages/ConfiguracoesMotivosEstoque";
import ClienteCreditoExtrato from "./pages/ClienteCreditoExtrato";

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

const PermissionRoute = ({ children, permission }) => {
  const { user, loading } = useAuth();
  if (loading) return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Carregando...</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (user.role === "admin") return children;
  
  const perfil = user.perfil;
  if (!perfil || !perfil.permissoes) {
    return <Navigate to="/" replace />;
  }

  // Permite verificar se o perfil possui a chave plana diretamente
  if (perfil.permissoes[permission] === true) {
    return children;
  }

  // Permite agrupamentos de rotas (ex: "relatorios" permite se tiver qualquer relatorios.algo)
  const hasGroupPermission = Object.keys(perfil.permissoes).some(
    k => k.startsWith(`${permission}.`) && perfil.permissoes[k] === true
  );
  if (hasGroupPermission) {
    return children;
  }

  // Retrocompatibilidade para o formato antigo
  if (perfil.permissoes.menus && perfil.permissoes.menus[permission] === true) {
    return children;
  }

  return <Navigate to="/" replace />;
};


function App() {
  return (
    <ThemeProvider>

      <AuthProvider>
        <BrowserRouter>
          <Toaster position="top-right" richColors />
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route element={<Protected><Layout /></Protected>}>
              <Route path="/" element={<Dashboard />} />
              <Route path="/agenda" element={<PermissionRoute permission="agenda.visualizar"><Agenda /></PermissionRoute>} />
              <Route path="/clientes" element={<PermissionRoute permission="clientes.visualizar"><Clientes /></PermissionRoute>} />
              <Route path="/clientes/:id/historico" element={<PermissionRoute permission="clientes.visualizar"><ClienteHistorico /></PermissionRoute>} />
              <Route path="/clientes/credito/extrato" element={<PermissionRoute permission="clientes.credito.visualizar"><ClienteCreditoExtrato /></PermissionRoute>} />
              <Route path="/colaboradores" element={<PermissionRoute permission="colaboradores.visualizar"><Colaboradores /></PermissionRoute>} />
              <Route path="/servicos" element={<PermissionRoute permission="servicos.visualizar"><Servicos /></PermissionRoute>} />
              <Route path="/produtos" element={<PermissionRoute permission="produtos.visualizar"><Produtos /></PermissionRoute>} />
              <Route path="/estoque" element={<PermissionRoute permission="estoque.visualizar"><Estoque /></PermissionRoute>} />
              <Route path="/estoque/entrada" element={<PermissionRoute permission="estoque.entrada"><EntradaProdutos /></PermissionRoute>} />
              <Route path="/estoque/inventario" element={<PermissionRoute permission="estoque.inventariar"><Inventario /></PermissionRoute>} />
              <Route path="/categorias" element={<PermissionRoute permission="cadastros.categorias"><Categorias /></PermissionRoute>} />
              <Route path="/agendamentos/:id/pagamento" element={<PermissionRoute permission="agenda.pagamento"><Pagamento /></PermissionRoute>} />
              <Route path="/vendas-diretas" element={<PermissionRoute permission="vendas.visualizar"><VendasDiretas /></PermissionRoute>} />
              <Route path="/vendas-diretas/:id/pagamento" element={<PermissionRoute permission="vendas.pagamento"><VendaPagamento /></PermissionRoute>} />
              <Route path="/despesas" element={<PermissionRoute permission="despesas.visualizar"><Despesas /></PermissionRoute>} />
              <Route path="/outras-receitas" element={<PermissionRoute permission="receitas.visualizar"><OutrasReceitas /></PermissionRoute>} />
              <Route path="/comissoes" element={<PermissionRoute permission="comissoes.visualizar"><Comissoes /></PermissionRoute>} />
              <Route path="/relatorios" element={<PermissionRoute permission="relatorios"><Relatorios /></PermissionRoute>} />
              <Route path="/configuracoes" element={<PermissionRoute permission="configuracoes"><Configuracoes /></PermissionRoute>} />
              <Route path="/configuracoes/taxas-cartao" element={<PermissionRoute permission="cadastros.taxas"><ConfiguracoesTaxas /></PermissionRoute>} />
              <Route path="/configuracoes/fornecedores" element={<PermissionRoute permission="cadastros.fornecedores"><ConfiguracoesFornecedores /></PermissionRoute>} />
              <Route path="/configuracoes/perfis-acesso" element={<PermissionRoute permission="configuracoes.perfis_acesso"><PerfisAcesso /></PermissionRoute>} />
              <Route path="/configuracoes/empresa" element={<PermissionRoute permission="configuracoes.empresa"><ConfiguracoesEmpresa /></PermissionRoute>} />
              <Route path="/configuracoes/whatsapp" element={<PermissionRoute permission="configuracoes.whatsapp"><ConfiguracoesWhatsApp /></PermissionRoute>} />
              <Route path="/configuracoes/gerais" element={<PermissionRoute permission="configuracoes.sistema"><ConfiguracoesGerais /></PermissionRoute>} />
              <Route path="/cadastros" element={<PermissionRoute permission="cadastros.visualizar"><Cadastros /></PermissionRoute>} />
              <Route path="/cadastros/fornecedores" element={<PermissionRoute permission="cadastros.fornecedores"><ConfiguracoesFornecedores /></PermissionRoute>} />
              <Route path="/cadastros/tipo-pagamento" element={<PermissionRoute permission="cadastros.pagamento"><CadastroTipoPagamento /></PermissionRoute>} />
              <Route path="/cadastros/adquirentes" element={<PermissionRoute permission="cadastros.adquirentes"><CadastroAdquirentes /></PermissionRoute>} />
              <Route path="/cadastros/descontos" element={<PermissionRoute permission="cadastros.descontos"><CadastroDescontos /></PermissionRoute>} />
              <Route path="/cadastros/motivos-estoque" element={<PermissionRoute permission="cadastros.motivos_estoque"><ConfiguracoesMotivosEstoque /></PermissionRoute>} />
              <Route path="/agenda/whatsapp-historico" element={<PermissionRoute permission="agenda.whatsapp_historico"><AgendaWhatsAppHistorico /></PermissionRoute>} />
              <Route path="/usuarios" element={<Usuarios />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
