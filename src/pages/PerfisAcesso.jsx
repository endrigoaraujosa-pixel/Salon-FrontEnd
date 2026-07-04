import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import http from "../api";
import { PageHeader } from "../components/Page";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "../components/ui/dialog";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { 
  ShieldCheck, ShieldAlert, PlusCircle, Pencil, Trash2, 
  ArrowLeft, Check, CheckCircle2, Copy
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "../auth";

// Dicionário plano padrão de permissões (todas iniciadas como falso)
const defaultPermissions = {
  "dashboard.visualizar": false,
  "dashboard.faturamento": false,
  "agenda.visualizar": false,
  "agenda.criar": false,
  "agenda.editar": false,
  "agenda.status": false,
  "agenda.concluir": false,
  "agenda.pagamento": false,
  "agenda.pagamento.excluir": false,
  "agenda.aplicar_desconto": false,
  "agenda.aplicar_desconto.senha": false,
  "agenda.excluir": false,
  "agenda.whatsapp_historico": false,
  "clientes.visualizar": false,
  "clientes.criar": false,
  "clientes.editar": false,
  "clientes.excluir": false,
  "clientes.credito.visualizar": false,
  "clientes.credito.gerenciar": false,

  "colaboradores.visualizar": false,
  "colaboradores.dados_sensiveis": false,
  "colaboradores.criar": false,
  "colaboradores.editar": false,
  "colaboradores.excluir": false,
  "colaboradores.indisponibilidade": false,
  "servicos.visualizar": false,
  "servicos.criar": false,
  "servicos.editar": false,
  "servicos.excluir": false,
  "produtos.visualizar": false,
  "produtos.criar": false,
  "produtos.editar": false,
  "produtos.excluir": false,
  "estoque.visualizar": false,
  "estoque.entrada": false,
  "estoque.movimentar": false,
  "estoque.ajustar": false,
  "estoque.inventariar": false,
  "estoque.zerar": false,
  "vendas.visualizar": false,
  "vendas.criar": false,
  "vendas.editar": false,
  "vendas.pagamento": false,
  "vendas.aplicar_desconto": false,
  "vendas.aplicar_desconto.senha": false,
  "vendas.cancelar": false,
  "despesas.visualizar": false,
  "despesas.criar": false,
  "despesas.editar": false,
  "despesas.excluir": false,
  "receitas.visualizar": false,
  "receitas.criar": false,
  "receitas.editar": false,
  "receitas.excluir": false,
  "comissoes.visualizar": false,
  "comissoes.visualizar_todos": false,
  "comissoes.pagar": false,
  "comissoes.estornar": false,
  "relatorios.dre": false,
  "relatorios.caixa": false,
  "relatorios.cartoes": false,
  "relatorios.operacional": false,
  "relatorios.vendas": false,
  "relatorios.estoque": false,
  "cadastros.visualizar": false,
  "cadastros.categorias": false,
  "cadastros.taxas": false,
  "cadastros.fornecedores": false,
  "cadastros.pagamento": false,
  "cadastros.adquirentes": false,
  "cadastros.descontos": false,
  "cadastros.motivos_estoque": false,
  "configuracoes.empresa": false,
  "configuracoes.sistema": false,
  "configuracoes.whatsapp": false,
  "configuracoes.perfis_acesso": false,
  "usuarios.visualizar": false,
  "usuarios.criar": false,
  "usuarios.editar": false,
  "usuarios.excluir": false,
  "perfis.visualizar": false,
  "perfis.criar": false,
  "perfis.editar": false,
  "perfis.excluir": false,
  "auditoria.visualizar": false,
  "auditoria.restaurar": false
};

// Grupos estruturados para exibição no formulário
const permissionGroups = [
  {
    title: "Dashboard",
    permissions: [
      { key: "dashboard.visualizar", label: "Acessar Painel Principal", desc: "Permite ver os gráficos básicos do painel inicial." },
      { key: "dashboard.faturamento", label: "Visualizar Receita e Faturamento", desc: "Permite ver dados de faturamento mensal e ticket médio." }
    ]
  },
  {
    title: "Agenda",
    permissions: [
      { key: "agenda.visualizar", label: "Visualizar Agenda", desc: "Visualizar o calendário e listagem de agendamentos." },
      { key: "agenda.criar", label: "Criar Agendamentos", desc: "Agendar novos horários para os clientes." },
      { key: "agenda.editar", label: "Editar Agendamentos", desc: "Modificar profissionais, horários ou serviços." },
      { key: "agenda.status", label: "Alterar Status", desc: "Mudar status do agendamento (Confirmado, Em Andamento)." },
      { key: "agenda.concluir", label: "Concluir Agendamentos", desc: "Marcar agendamento como concluído." },
      { key: "agenda.pagamento", label: "Lançar Pagamentos", desc: "Registrar formas e valores pagos na agenda." },
      { key: "agenda.pagamento.excluir", label: "Excluir Pagamentos", desc: "Remover pagamentos vinculados a agendamentos." },
      { key: "agenda.aplicar_desconto", label: "Aplicar Descontos", desc: "Permitir descontos nos fechamentos da agenda." },
      { key: "agenda.aplicar_desconto.senha", label: "Aplicar Desconto (Senha)", desc: "Permite autorizar descontos na agenda por senha." },
      { key: "agenda.excluir", label: "Excluir Agendamentos", desc: "Excluir agendamentos fisicamente do sistema." },
      { key: "agenda.whatsapp_historico", label: "Histórico do WhatsApp", desc: "Consultar histórico de lembretes e envios de mensagens." }
    ]
  },
  {
    title: "Clientes",
    permissions: [
      { key: "clientes.visualizar", label: "Visualizar Clientes", desc: "Visualizar listagem, contatos e histórico." },
      { key: "clientes.criar", label: "Cadastrar Clientes", desc: "Cadastrar novos clientes no sistema." },
      { key: "clientes.editar", label: "Editar Clientes", desc: "Modificar dados cadastrais do cliente." },
      { key: "clientes.excluir", label: "Excluir Clientes", desc: "Arquivar/excluir cliente." },
      { key: "clientes.credito.visualizar", label: "Visualizar Extrato de Crédito", desc: "Consultar saldos e movimentações de saldo do cliente." },
      { key: "clientes.credito.gerenciar", label: "Gerenciar Crédito (Lançar/Estornar)", desc: "Adicionar/remover créditos manualmente e estornar." }
    ]
  },
  {
    title: "Colaboradores",
    permissions: [
      { key: "colaboradores.visualizar", label: "Visualizar Colaboradores", desc: "Visualizar listagem e cargo dos colaboradores." },
      { key: "colaboradores.dados_sensiveis", label: "Ver Dados Sensíveis (Comissão/Telefone)", desc: "Visualizar percentual de comissões e telefones privados." },
      { key: "colaboradores.criar", label: "Cadastrar Colaborador", desc: "Cadastrar novos profissionais." },
      { key: "colaboradores.editar", label: "Editar Colaborador", desc: "Editar dados do colaborador." },
      { key: "colaboradores.excluir", label: "Excluir Colaborador", desc: "Excluir cadastro do profissional." },
      { key: "colaboradores.indisponibilidade", label: "Gerenciar Indisponibilidades", desc: "Configurar folgas e bloqueios na agenda." }
    ]
  },
  {
    title: "Serviços",
    permissions: [
      { key: "servicos.visualizar", label: "Visualizar Serviços", desc: "Consultar catálogo de serviços." },
      { key: "servicos.criar", label: "Cadastrar Serviços", desc: "Cadastrar novos serviços." },
      { key: "servicos.editar", label: "Editar Serviços", desc: "Modificar tempos, preços e nomes de serviços." },
      { key: "servicos.excluir", label: "Excluir Serviços", desc: "Remover serviços." }
    ]
  },
  {
    title: "Produtos",
    permissions: [
      { key: "produtos.visualizar", label: "Visualizar Produtos", desc: "Consultar catálogo de produtos." },
      { key: "produtos.criar", label: "Cadastrar Produtos", desc: "Cadastrar novos produtos." },
      { key: "produtos.editar", label: "Editar Produtos", desc: "Modificar preços, marcas ou códigos." },
      { key: "produtos.excluir", label: "Excluir Produtos", desc: "Remover produtos." }
    ]
  },
  {
    title: "Estoque",
    permissions: [
      { key: "estoque.visualizar", label: "Visualizar Estoque", desc: "Acessar painel e consultar posição do estoque." },
      { key: "estoque.entrada", label: "Registrar Entradas", desc: "Registrar notas fiscais e compras de produtos." },
      { key: "estoque.movimentar", label: "Registrar Saídas/Consumo", desc: "Lançar saídas manuais, quebras e insumos." },
      { key: "estoque.ajustar", label: "Ajustar Estoque", desc: "Fazer ajustes rápidos na contagem do produto." },
      { key: "estoque.inventariar", label: "Inventariar Estoque", desc: "Concluir contagens físicas de inventário." },
      { key: "estoque.zerar", label: "Autorizar Zeragem", desc: "Permissão de supervisor para zerar itens em lote." }
    ]
  },
  {
    title: "Vendas Diretas (PDV)",
    permissions: [
      { key: "vendas.visualizar", label: "Visualizar Vendas", desc: "Visualizar histórico de vendas diretas feitas no caixa." },
      { key: "vendas.criar", label: "Realizar Vendas", desc: "Iniciar e vender produtos/serviços no PDV." },
      { key: "vendas.editar", label: "Editar Carrinho", desc: "Alterar itens no carrinho de compras." },
      { key: "vendas.pagamento", label: "Lançar Pagamentos", desc: "Registrar pagamentos da venda direta." },
      { key: "vendas.aplicar_desconto", label: "Aplicar Descontos", desc: "Aplicar descontos em vendas diretas." },
      { key: "vendas.aplicar_desconto.senha", label: "Aplicar Desconto (Senha)", desc: "Permite autorizar descontos nas vendas por senha." },
      { key: "vendas.cancelar", label: "Cancelar Vendas", desc: "Cancelar e estornar vendas fechadas." }
    ]
  },
  {
    title: "Financeiro (Fluxo de Caixa)",
    permissions: [
      { key: "despesas.visualizar", label: "Visualizar Despesas", desc: "Visualizar contas a pagar." },
      { key: "despesas.criar", label: "Lançar Despesas", desc: "Registrar saídas financeiras." },
      { key: "despesas.editar", label: "Editar Despesas", desc: "Alterar valores, vencimentos ou notas." },
      { key: "despesas.excluir", label: "Excluir Despesas", desc: "Excluir despesas." },
      { key: "receitas.visualizar", label: "Visualizar Outras Receitas", desc: "Visualizar contas a receber." },
      { key: "receitas.criar", label: "Lançar Outras Receitas", desc: "Registrar receitas avulsas fora de vendas." },
      { key: "receitas.editar", label: "Editar Receitas", desc: "Alterar outras receitas." },
      { key: "receitas.excluir", label: "Excluir Receitas", desc: "Excluir outras receitas." }
    ]
  },
  {
    title: "Comissões",
    permissions: [
      { key: "comissoes.visualizar", label: "Visualizar Minhas Comissões", desc: "Consultar próprio relatório de ganhos." },
      { key: "comissoes.visualizar_todos", label: "Ver Comissões de Todos", desc: "Visualizar relatórios de comissões de toda a equipe." },
      { key: "comissoes.pagar", label: "Pagar Comissão", desc: "Dar baixa em pagamentos de comissão." },
      { key: "comissoes.estornar", label: "Estornar Pagamento", desc: "Desfazer baixa de pagamento de comissão." }
    ]
  },
  {
    title: "Relatórios",
    permissions: [
      { key: "relatorios.dre", label: "Visualizar Relatório DRE", desc: "Acessar DRE e balanços de lucratividade." },
      { key: "relatorios.caixa", label: "Visualizar Relatório de Caixa", desc: "Visualizar fluxos de caixa e saldos." },
      { key: "relatorios.cartoes", label: "Visualizar Relatório de Cartões", desc: "Visualizar taxas de adquirentes e datas de liquidação." },
      { key: "relatorios.operacional", label: "Visualizar Resultados Operacionais", desc: "Visualizar ticket médio e desempenho." },
      { key: "relatorios.vendas", label: "Visualizar Relatório de Vendas", desc: "Consultar vendas de produtos e serviços." },
      { key: "relatorios.estoque", label: "Visualizar Relatório de Estoque", desc: "Acessar relatórios de insumos, perdas e valorização." }
    ]
  },
  {
    title: "Cadastros Gerais",
    permissions: [
      { key: "cadastros.visualizar", label: "Visualizar Painel de Cadastros", desc: "Acessar a central de cadastros operacionais." },
      { key: "cadastros.categorias", label: "Gerenciar Categorias", desc: "Cadastrar e editar categorias de produtos/serviços." },
      { key: "cadastros.taxas", label: "Gerenciar Taxas de Cartão", desc: "Editar taxas cobradas por operadoras de cartão." },
      { key: "cadastros.fornecedores", label: "Gerenciar Fornecedores", desc: "Cadastrar fornecedores." },
      { key: "cadastros.pagamento", label: "Gerenciar Tipos de Pagamento", desc: "Configurar formas de pagamento aceitas." },
      { key: "cadastros.adquirentes", label: "Gerenciar Adquirentes", desc: "Configurar adquirentes/maquininhas." },
      { key: "cadastros.descontos", label: "Gerenciar Cupons de Desconto", desc: "Gerenciar regras de cupom e descontos sob autorização." },
      { key: "cadastros.motivos_estoque", label: "Gerenciar Motivos de Movimentação", desc: "Gerenciar motivos de perdas e ajustes." }
    ]
  },
  {
    title: "Configurações Globais",
    permissions: [
      { key: "configuracoes.empresa", label: "Gerenciar Empresa", desc: "Editar dados cadastrais e logomarca da empresa." },
      { key: "configuracoes.sistema", label: "Gerenciar Sistema", desc: "Configurar regras internas e preferências." },
      { key: "configuracoes.whatsapp", label: "Gerenciar WhatsApp", desc: "Integrar celular e configurar envios de lembretes." },
      { key: "configuracoes.perfis_acesso", label: "Gerenciar Perfis de Acesso", desc: "Acessar a tela de perfis de acesso a partir das configurações." }
    ]
  },
  {
    title: "Usuários e Segurança",
    permissions: [
      { key: "usuarios.visualizar", label: "Visualizar Todos os Usuários", desc: "Visualizar o cadastro de todos os usuários. Sem esta permissão, cada pessoa vê apenas o próprio cadastro." },
      { key: "usuarios.criar", label: "Cadastrar Usuários", desc: "Cadastrar novos usuários no sistema." },
      { key: "usuarios.editar", label: "Editar Usuários", desc: "Editar perfis e dados de usuários." },
      { key: "usuarios.excluir", label: "Excluir Usuários", desc: "Remover usuários." },
      { key: "perfis.visualizar", label: "Visualizar Perfis de Acesso", desc: "Listar perfis de permissão existentes." },
      { key: "perfis.criar", label: "Cadastrar Perfis", desc: "Criar novas funções/perfis." },
      { key: "perfis.editar", label: "Editar Perfis", desc: "Alterar permissões e descrições dos perfis." },
      { key: "perfis.excluir", label: "Excluir Perfis", desc: "Remover perfis de acesso." }
    ]
  },
  {
    title: "Auditoria",
    permissions: [
      { key: "auditoria.visualizar", label: "Visualizar Lixeira", desc: "Consultar histórico de registros excluídos." },
      { key: "auditoria.restaurar", label: "Restaurar Registros", desc: "Restaurar dados que foram apagados." }
    ]
  }
];

export default function PerfisAcesso() {
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();
  const [perfis, setPerfis] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Dialog controls
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPerfil, setEditingPerfil] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [form, setForm] = useState({
    nome: "",
    descricao: "",
    permissoes: JSON.parse(JSON.stringify(defaultPermissions))
  });
  
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [perfilToDelete, setPerfilToDelete] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await http.get("/perfis-acesso");
      setPerfis(res.data);
    } catch (error) {
      toast.error("Erro ao carregar os perfis de acesso.");
    } finally {
      setLoading(false);
    }
  };

  const handleOpenNew = () => {
    setEditingPerfil(null);
    setForm({
      nome: "",
      descricao: "",
      permissoes: JSON.parse(JSON.stringify(defaultPermissions))
    });
    setDialogOpen(true);
  };

  const handleOpenEdit = (p) => {
    setEditingPerfil(p);
    
    // Normalização das permissões (garantir todas as chaves)
    const basePerms = JSON.parse(JSON.stringify(defaultPermissions));
    let rawPerms = p.permissoes || {};
    
    // Se for o formato antigo (menus e acoes), faz a conversão em tempo de exibição
    const mergedPerms = { ...basePerms };
    if (rawPerms.menus || rawPerms.acoes) {
      const menus = rawPerms.menus || {};
      const acoes = rawPerms.acoes || {};
      
      Object.keys(mergedPerms).forEach(key => {
        const parts = key.split('.');
        const mod = parts[0];
        
        if (key.endsWith('.visualizar') || key === 'relatorios' || key === 'configuracoes' || key === 'cadastros') {
          mergedPerms[key] = !!menus[mod];
        } else {
          // Ações gerais
          const actionWord = parts[1];
          if (actionWord === 'criar') mergedPerms[key] = !!(menus[mod] && acoes.criar);
          else if (actionWord === 'editar') mergedPerms[key] = !!(menus[mod] && acoes.editar);
          else if (actionWord === 'excluir') mergedPerms[key] = !!(menus[mod] && acoes.excluir);
          else if (actionWord === 'pagamento') mergedPerms[key] = !!(menus[mod] && acoes.realizar_pagamento);
          else if (rawPerms.acoes && rawPerms.acoes[key] !== undefined) {
            mergedPerms[key] = !!rawPerms.acoes[key];
          }
        }
      });
    } else {
      // Formato plano
      Object.keys(basePerms).forEach(key => {
        if (rawPerms[key] !== undefined) {
          mergedPerms[key] = !!rawPerms[key];
        }
      });
    }
    
    setForm({
      nome: p.nome,
      descricao: p.descricao || "",
      permissoes: mergedPerms
    });
    setDialogOpen(true);
  };

  const handleDuplicate = (p) => {
    setEditingPerfil(null); // Trata como novo perfil
    
    // Copiar permissões
    const basePerms = JSON.parse(JSON.stringify(defaultPermissions));
    let rawPerms = p.permissoes || {};
    const mergedPerms = { ...basePerms };
    
    if (rawPerms.menus || rawPerms.acoes) {
      const menus = rawPerms.menus || {};
      const acoes = rawPerms.acoes || {};
      
      Object.keys(mergedPerms).forEach(key => {
        const parts = key.split('.');
        const mod = parts[0];
        
        if (key.endsWith('.visualizar') || key === 'relatorios' || key === 'configuracoes' || key === 'cadastros') {
          mergedPerms[key] = !!menus[mod];
        } else {
          const actionWord = parts[1];
          if (actionWord === 'criar') mergedPerms[key] = !!(menus[mod] && acoes.criar);
          else if (actionWord === 'editar') mergedPerms[key] = !!(menus[mod] && acoes.editar);
          else if (actionWord === 'excluir') mergedPerms[key] = !!(menus[mod] && acoes.excluir);
          else if (actionWord === 'pagamento') mergedPerms[key] = !!(menus[mod] && acoes.realizar_pagamento);
          else if (rawPerms.acoes && rawPerms.acoes[key] !== undefined) {
            mergedPerms[key] = !!rawPerms.acoes[key];
          }
        }
      });
    } else {
      Object.keys(basePerms).forEach(key => {
        if (rawPerms[key] !== undefined) {
          mergedPerms[key] = !!rawPerms[key];
        }
      });
    }

    setForm({
      nome: `Cópia de ${p.nome}`,
      descricao: p.descricao ? `Cópia de: ${p.descricao}` : "",
      permissoes: mergedPerms
    });
    setDialogOpen(true);
    toast.info("Perfil clonado! Altere o nome e salve para registrar.");
  };

  const handleTogglePermission = (key) => {
    setForm(prev => {
      const updated = { ...prev };
      const nextValue = !updated.permissoes[key];
      updated.permissoes[key] = nextValue;

      // Lógica de Dependência Automática para Descontos
      if (key === 'agenda.aplicar_desconto.senha' && nextValue === true) {
        updated.permissoes['agenda.aplicar_desconto'] = true;
      }
      if (key === 'vendas.aplicar_desconto.senha' && nextValue === true) {
        updated.permissoes['vendas.aplicar_desconto'] = true;
      }
      if (key === 'agenda.aplicar_desconto' && nextValue === false) {
        updated.permissoes['agenda.aplicar_desconto.senha'] = false;
      }
      if (key === 'vendas.aplicar_desconto' && nextValue === false) {
        updated.permissoes['vendas.aplicar_desconto.senha'] = false;
      }

      const parts = key.split('.');
      const moduleName = parts[0];

      // Lógica de Dependência Automática
      // Uma chave é "pai de módulo" apenas se tiver exatamente 2 segmentos e terminar em .visualizar,
      // ou for uma das chaves especiais de grupo (relatorios, configuracoes, cadastros).
      // Chaves com 3+ segmentos (ex: clientes.credito.visualizar) são permissões simples.
      const isModuleParent = (
        (parts.length === 2 && key.endsWith('.visualizar')) ||
        key === 'relatorios' ||
        key === 'configuracoes' ||
        key === 'cadastros'
      );

      if (isModuleParent) {
        // Se desmarcou a visualização pai, desmarca todas as ações filhas do mesmo módulo
        if (nextValue === false) {
          Object.keys(updated.permissoes).forEach(k => {
            if (k.startsWith(`${moduleName}.`)) {
              updated.permissoes[k] = false;
            }
          });
        }
      } else if (!isModuleParent && nextValue === true) {
        // Se marcou qualquer ação filha (incluindo permissões de 3+ níveis),
        // ativa obrigatoriamente a visualização do módulo pai de 2 níveis.
        let parentKey = `${moduleName}.visualizar`;
        if (moduleName === 'relatorios' || moduleName === 'configuracoes' || moduleName === 'cadastros') {
          parentKey = moduleName;
        }
        if (updated.permissoes[parentKey] !== undefined) {
          updated.permissoes[parentKey] = true;
        }
      }
      return updated;
    });
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.nome.trim()) {
      return toast.error("O nome do perfil é obrigatório.");
    }

    const payload = {
      ...form,
      alterado_por: currentUser ? `${currentUser.name} (${currentUser.email})` : "Administrador"
    };

    try {
      if (editingPerfil) {
        await http.put(`/perfis-acesso/${editingPerfil.id}`, payload);
        toast.success("Perfil de acesso atualizado com sucesso!");
      } else {
        await http.post("/perfis-acesso", payload);
        toast.success("Perfil de acesso criado com sucesso!");
      }
      setDialogOpen(false);
      loadData();
    } catch (error) {
      const msg = error.response?.data?.detail || "Erro ao salvar perfil.";
      toast.error(msg);
    }
  };

  const handleOpenDelete = (p) => {
    setPerfilToDelete(p);
    setDeleteConfirmOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!perfilToDelete) return;
    try {
      await http.delete(`/perfis-acesso/${perfilToDelete.id}`);
      toast.success("Perfil de acesso excluído com sucesso!");
      setDeleteConfirmOpen(false);
      setPerfilToDelete(null);
      loadData();
    } catch (error) {
      const msg = error.response?.data?.detail || "Erro ao excluir perfil.";
      toast.error(msg);
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 fade-in min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-800 dark:text-zinc-200">
      <PageHeader 
        overline="Configurações" 
        title="Perfis de Acesso & Permissões" 
        action={
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              onClick={() => navigate("/configuracoes")} 
              className="flex items-center gap-1.5 border-zinc-250 dark:border-zinc-850"
            >
              <ArrowLeft className="w-4 h-4" /> Voltar
            </Button>
            <Button 
              onClick={handleOpenNew}
              className="bg-[#84A59D] hover:bg-[#6F9189] text-white flex items-center gap-1.5 font-bold shadow-xs rounded-lg h-10"
            >
              <PlusCircle className="w-4 h-4" /> Novo Perfil
            </Button>
          </div>
        } 
      />

      <div className="mt-6">
        {loading ? (
          <div className="text-center py-20 text-zinc-400 dark:text-zinc-500 font-semibold">
            Carregando perfis...
          </div>
        ) : perfis.length === 0 ? (
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-850 rounded-2xl p-12 text-center shadow-xs">
            <ShieldCheck className="w-12 h-12 text-zinc-300 dark:text-zinc-700 mx-auto mb-4" />
            <h3 className="font-bold text-lg text-zinc-900 dark:text-zinc-100">Nenhum perfil de acesso cadastrado</h3>
            <p className="text-sm text-zinc-400 dark:text-zinc-500 mt-2">Crie um novo perfil para associar aos colaboradores.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {perfis.map((p) => {
              // Contar número total de permissões ativas
              let activePermsCount = 0;
              if (p.permissoes) {
                if (p.permissoes.menus || p.permissoes.acoes) {
                  // Contar formato antigo
                  activePermsCount += Object.values(p.permissoes.menus || {}).filter(Boolean).length;
                  activePermsCount += Object.values(p.permissoes.acoes || {}).filter(Boolean).length;
                } else {
                  // Contar formato plano
                  activePermsCount = Object.values(p.permissoes).filter(Boolean).length;
                }
              }
              const isBaseProfile = p.id === 'admin-profile-uuid-00000000000000000' || p.id === 'func-profile-uuid-000000000000000000';

              return (
                <Card 
                  key={p.id}
                  className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-850 rounded-2xl hover:shadow-md transition-all duration-200 flex flex-col justify-between"
                >
                  <CardContent className="p-6 flex flex-col justify-between h-full space-y-4">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className={`p-2 rounded-lg ${
                            p.id === 'admin-profile-uuid-00000000000000000'
                              ? "bg-amber-50 dark:bg-amber-950/20 text-amber-600"
                              : "bg-blue-50 dark:bg-blue-950/20 text-blue-500"
                          }`}>
                            <ShieldCheck className="w-5 h-5" />
                          </div>
                          <h4 className="font-bold text-lg text-zinc-900 dark:text-zinc-50">{p.nome}</h4>
                        </div>
                        {isBaseProfile && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">
                            Padrão
                          </span>
                        )}
                      </div>

                      <p className="text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed min-h-[40px]">
                        {p.descricao || "Sem descrição informada."}
                      </p>
                    </div>

                    <div className="border-t border-zinc-100 dark:border-zinc-850 pt-3.5 space-y-2 text-xs">
                      <div className="flex justify-between items-center text-zinc-550 dark:text-zinc-400">
                        <span className="font-medium text-zinc-400 dark:text-zinc-500 block text-[10px] uppercase font-bold">Total de Acessos</span>
                        <span className="font-bold text-zinc-800 dark:text-zinc-200">
                          {activePermsCount} permissões
                        </span>
                      </div>
                      
                      {p.alterado_por && (
                        <div className="text-[10px] text-zinc-400 dark:text-zinc-500 pt-1 border-t border-dashed border-zinc-100 dark:border-zinc-800/80">
                          Última alteração por: <span className="font-semibold">{p.alterado_por}</span>
                        </div>
                      )}
                    </div>

                    <div className="flex justify-end gap-2 pt-2 border-t border-zinc-100 dark:border-zinc-850">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleDuplicate(p)}
                        className="flex items-center gap-1 border-zinc-200 dark:border-zinc-800 h-8 px-2 text-[11px]"
                        title="Duplicar este perfil"
                      >
                        <Copy className="w-3 h-3" /> Copiar
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleOpenEdit(p)}
                        className="flex items-center gap-1.5 border-zinc-250 dark:border-zinc-800 h-8 px-2.5 text-[11px]"
                      >
                        <Pencil className="w-3 h-3" /> Editar
                      </Button>
                      {!isBaseProfile && (
                        <Button 
                          variant="destructive" 
                          size="sm"
                          onClick={() => handleOpenDelete(p)}
                          className="flex items-center gap-1.5 h-8 px-2.5 text-[11px]"
                        >
                          <Trash2 className="w-3 h-3" /> Excluir
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Access Profile Form Dialog */}
      <Dialog open={dialogOpen} onOpenChange={(v) => { if (!v) setSearchTerm(""); setDialogOpen(v); }}>
        <DialogContent className="sm:max-w-4xl w-full p-0 overflow-hidden bg-white dark:bg-zinc-900 border-0 rounded-2xl shadow-2xl flex flex-col" style={{ maxHeight: "92vh" }}>
          <DialogHeader className="p-6 border-b border-zinc-150 dark:border-zinc-850 bg-zinc-50/50 dark:bg-zinc-900/10">
            <DialogTitle className="flex items-center gap-2.5 text-lg font-bold text-zinc-950 dark:text-zinc-50">
              <ShieldCheck className="w-5.5 h-5.5 text-[#84A59D]" />
              {editingPerfil ? `Editar Perfil: ${editingPerfil.nome}` : "Criar Novo Perfil de Acesso"}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* Header info */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-1 space-y-2">
                <Label htmlFor="nome" className="font-bold text-xs text-zinc-500 uppercase tracking-wider">Nome do Perfil *</Label>
                <Input 
                  id="nome"
                  required
                  placeholder="Ex: Supervisor, Atendente"
                  value={form.nome}
                  onChange={(e) => setForm({ ...form, nome: e.target.value })}
                  className="rounded-lg border-zinc-250 dark:border-zinc-800"
                />
              </div>
              <div className="md:col-span-2 space-y-2">
                <Label htmlFor="descricao" className="font-bold text-xs text-zinc-500 uppercase tracking-wider">Descrição das Permissões</Label>
                <Input 
                  id="descricao"
                  placeholder="Breve descrição da função deste perfil no sistema."
                  value={form.descricao}
                  onChange={(e) => setForm({ ...form, descricao: e.target.value })}
                  className="rounded-lg border-zinc-250 dark:border-zinc-800"
                />
              </div>
            </div>

            {/* Checklist of Permissions Grouped */}
            <div className="space-y-6 pt-4 border-t border-zinc-100 dark:border-zinc-850">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-2">
                <h4 className="font-bold text-xs text-zinc-450 dark:text-zinc-500 uppercase tracking-wider">
                  Definição de Acessos e Permissões Granulares
                </h4>
                <div className="w-full sm:w-72">
                  <Input 
                    type="text" 
                    placeholder="Pesquisar permissão (ex: clientes, relatórios)..." 
                    value={searchTerm} 
                    onChange={(e) => setSearchTerm(e.target.value)} 
                    className="h-8 text-xs rounded-lg border-zinc-250 dark:border-zinc-800"
                  />
                </div>
              </div>
              
              <div className="space-y-6">
                {(() => {
                  const filteredGroups = permissionGroups.map(group => {
                    if (!searchTerm.trim()) return group;
                    const normalizedSearch = searchTerm.toLowerCase();
                    const matchedPermissions = group.permissions.filter(perm => 
                      perm.label.toLowerCase().includes(normalizedSearch) ||
                      perm.key.toLowerCase().includes(normalizedSearch) ||
                      (perm.desc && perm.desc.toLowerCase().includes(normalizedSearch))
                    );
                    if (group.title.toLowerCase().includes(normalizedSearch)) {
                      return group;
                    }
                    if (matchedPermissions.length > 0) {
                      return {
                        ...group,
                        permissions: matchedPermissions
                      };
                    }
                    return null;
                  }).filter(Boolean);

                  if (filteredGroups.length === 0) {
                    return (
                      <div className="text-center py-8 text-sm text-zinc-450 dark:text-zinc-500 font-semibold bg-zinc-50/50 dark:bg-zinc-950/20 border border-dashed border-zinc-200 dark:border-zinc-800 rounded-2xl">
                        Nenhuma permissão encontrada para "{searchTerm}"
                      </div>
                    );
                  }

                  return filteredGroups.map((group) => {
                    // Contar quantos itens ativos no grupo
                    const groupPermsKeys = group.permissions.map(p => p.key);
                    const activeInGroupCount = groupPermsKeys.filter(k => form.permissoes[k] === true).length;
                    
                    return (
                      <div 
                        key={group.title}
                        className="bg-zinc-50/40 dark:bg-zinc-950/20 border border-zinc-200/80 dark:border-zinc-850 rounded-2xl p-4.5 space-y-3"
                      >
                        <div className="flex items-center justify-between border-b border-zinc-200/60 dark:border-zinc-850 pb-2">
                          <h5 className="font-bold text-sm text-zinc-900 dark:text-zinc-100">{group.title}</h5>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-zinc-150 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400">
                            {activeInGroupCount} de {group.permissions.length} ativos
                          </span>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {group.permissions.map((perm) => {
                            const hasAccess = form.permissoes[perm.key] === true;
                            
                            // Determinar se o checkbox deve ser desabilitado por dependência
                            // Se uma ação filha estiver ativa, e esta chave for a visualização, bloqueia
                            let isDependencyLocked = false;
                            const permParts = perm.key.split('.');
                            // Apenas chaves pai de módulo real (2 segmentos + .visualizar, ou grupos especiais) podem ser travadas
                            const isRealModuleParent = (
                              (permParts.length === 2 && perm.key.endsWith('.visualizar')) ||
                              perm.key === 'relatorios' ||
                              perm.key === 'configuracoes' ||
                              perm.key === 'cadastros'
                            );
                            if (isRealModuleParent) {
                              const mod = permParts[0];
                              const otherActiveKeys = Object.keys(form.permissoes).filter(
                                k => k.startsWith(`${mod}.`) && k !== perm.key && form.permissoes[k] === true
                              );
                              isDependencyLocked = otherActiveKeys.length > 0;
                            }

                            return (
                              <div 
                                key={perm.key}
                                onClick={() => {
                                  if (!isDependencyLocked) {
                                    handleTogglePermission(perm.key);
                                  } else {
                                    toast.info("Esta permissão de visualização não pode ser desativada pois há ações filhas ativas.");
                                  }
                                }}
                                className={`flex items-start justify-between p-3 rounded-xl border cursor-pointer select-none transition-all duration-200 ${
                                  hasAccess 
                                    ? "bg-emerald-50/40 dark:bg-emerald-950/20 border-emerald-300 dark:border-emerald-800/80 text-emerald-950 dark:text-emerald-400 font-medium" 
                                    : "bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-850/80 hover:bg-zinc-50/50 text-zinc-700 dark:text-zinc-350"
                                } ${isDependencyLocked ? "opacity-90 cursor-not-allowed" : ""}`}
                              >
                                <div className="space-y-0.5 pr-2.5">
                                  <span className="text-xs font-bold flex items-center gap-1.5">
                                    {perm.label}
                                    {isDependencyLocked && (
                                      <span className="text-[9px] bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-400 px-1 py-0.2 rounded font-semibold uppercase">Requerido</span>
                                    )}
                                  </span>
                                  <span className="text-[10px] text-zinc-400 dark:text-zinc-500 block leading-tight font-normal">{perm.desc}</span>
                                </div>
                                <div className={`w-5.5 h-5.5 rounded-lg border flex items-center justify-center transition-colors shrink-0 mt-0.5 ${
                                  hasAccess 
                                    ? "bg-emerald-500 border-emerald-600 text-white" 
                                    : "border-zinc-300 dark:border-zinc-700 bg-transparent"
                                }`}>
                                  {hasAccess && <Check className="w-3.5 h-3.5 stroke-[3.5]" />}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  });
                })()}
              </div>
            </div>

            <DialogFooter className="p-6 border-t border-zinc-150 dark:border-zinc-850/50 gap-2 flex flex-col sm:flex-row bg-zinc-50/50 dark:bg-zinc-900/10 -mx-6 -mb-6 mt-6">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setDialogOpen(false)}
                className="w-full sm:w-auto h-11 px-6 border-zinc-250 dark:border-zinc-850"
              >
                Cancelar
              </Button>
              <Button 
                type="submit" 
                className="w-full sm:w-auto bg-[#84A59D] hover:bg-[#6F9189] text-white font-bold h-11 px-6 shadow-sm rounded-lg"
              >
                Salvar Perfil
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-rose-600 dark:text-rose-500">
              <ShieldAlert className="w-5.5 h-5.5" />
              Confirmar Exclusão de Perfil
            </DialogTitle>
          </DialogHeader>
          <div className="py-2 text-sm text-zinc-550 dark:text-zinc-400 leading-relaxed">
            Deseja mesmo excluir o perfil de acesso <strong>{perfilToDelete?.nome}</strong>?
            <p className="text-xs text-rose-500 font-semibold mt-2">Esta operação não poderá ser desfeita e o perfil será permanentemente removido das configurações.</p>
          </div>
          <DialogFooter className="gap-2 flex flex-col sm:flex-row">
            <Button 
              variant="outline" 
              onClick={() => setDeleteConfirmOpen(false)}
              className="w-full sm:w-auto h-10 border-zinc-250 dark:border-zinc-850"
            >
              Cancelar
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleDeleteConfirm}
              className="w-full sm:w-auto h-10"
            >
              Excluir Perfil
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
