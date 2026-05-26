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

const Protected = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Carregando...</div>;
  if (!user) return <Navigate to="/login" replace />;
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
              <Route path="/colaboradores" element={<Colaboradores />} />
              <Route path="/servicos" element={<Servicos />} />
              <Route path="/produtos" element={<Produtos />} />
              <Route path="/agendamentos/:id/pagamento" element={<Pagamento />} />
              <Route path="/vendas-diretas" element={<VendasDiretas />} />
              <Route path="/vendas-diretas/:id/pagamento" element={<VendaPagamento />} />
              <Route path="/despesas" element={<Despesas />} />
              <Route path="/outras-receitas" element={<OutrasReceitas />} />
              <Route path="/comissoes" element={<Comissoes />} />
              <Route path="/relatorios" element={<Relatorios />} />
              <Route path="/configuracoes" element={<Configuracoes />} />
              <Route path="/configuracoes/taxas-cartao" element={<ConfiguracoesTaxas />} />
              <Route path="/configuracoes/fornecedores" element={<ConfiguracoesFornecedores />} />
              <Route path="/usuarios" element={<Usuarios />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
