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
              <Route path="/agenda" element={<Agenda />} />
              <Route path="/clientes" element={<Clientes />} />
              <Route path="/clientes/:id/historico" element={<ClienteHistorico />} />
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
              <Route path="/usuarios" element={<Usuarios />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
