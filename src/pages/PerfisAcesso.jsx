import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import http from "../api";
import { PageHeader } from "../components/Page";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "../components/ui/dialog";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Textarea } from "../components/ui/textarea";
import { 
  ShieldCheck, ShieldAlert, PlusCircle, Pencil, Trash2, 
  ArrowLeft, Check, CheckCircle2, XCircle, LayoutDashboard,
  Calendar, Users, Scissors, UserCheck, Package, 
  Layers, ShoppingCart, TrendingDown, DollarSign, 
  Percent, BarChart3, Settings, UserPlus, FolderOpen
} from "lucide-react";
import { toast } from "sonner";

const defaultPermissions = {
  menus: {
    dashboard: false,
    agenda: false,
    clientes: false,
    servicos: false,
    colaboradores: false,
    produtos: false,
    estoque: false,
    vendas: false,
    despesas: false,
    receitas: false,
    comissoes: false,
    relatorios: false,
    configuracoes: false,
    usuarios: false,
    cadastros: false
  },
  acoes: {
    criar: false,
    editar: false,
    excluir: false,
    realizar_pagamento: false,
    is_admin: false
  }
};

const menuMetadata = [
  { key: "dashboard", label: "Dashboard / Painel", icon: LayoutDashboard },
  { key: "agenda", label: "Agenda / Agendamentos", icon: Calendar },
  { key: "clientes", label: "Clientes", icon: Users },
  { key: "servicos", label: "Serviços", icon: Scissors },
  { key: "colaboradores", label: "Colaboradores", icon: UserCheck },
  { key: "produtos", label: "Produtos", icon: Package },
  { key: "estoque", label: "Estoque (Painel & Entrada)", icon: Layers },
  { key: "vendas", label: "Vendas Diretas / PDV", icon: ShoppingCart },
  { key: "despesas", label: "Despesas / Contas a Pagar", icon: TrendingDown },
  { key: "receitas", label: "Outras Receitas", icon: DollarSign },
  { key: "comissoes", label: "Comissões", icon: Percent },
  { key: "relatorios", label: "Relatórios & DRE", icon: BarChart3 },
  { key: "cadastros", label: "Painel de Cadastros", icon: FolderOpen },
  { key: "configuracoes", label: "Configurações Gerais", icon: Settings },
  { key: "usuarios", label: "Usuários do Sistema", icon: UserPlus }
];

export default function PerfisAcesso() {
  const navigate = useNavigate();
  const [perfis, setPerfis] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Dialog controls
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPerfil, setEditingPerfil] = useState(null);
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
    // ensure permissions object has all fields properly populated in case of backward compat
    const basePerms = JSON.parse(JSON.stringify(defaultPermissions));
    const mergedPerms = {
      menus: { ...basePerms.menus, ...(p.permissoes?.menus || {}) },
      acoes: { ...basePerms.acoes, ...(p.permissoes?.acoes || {}) }
    };
    
    setForm({
      nome: p.nome,
      descricao: p.descricao || "",
      permissoes: mergedPerms
    });
    setDialogOpen(true);
  };

  const handleToggleMenu = (menuKey) => {
    setForm(prev => {
      const updated = { ...prev };
      updated.permissoes.menus[menuKey] = !updated.permissoes.menus[menuKey];
      return updated;
    });
  };

  const handleToggleAcao = (acaoKey) => {
    setForm(prev => {
      const updated = { ...prev };
      updated.permissoes.acoes[acaoKey] = !updated.permissoes.acoes[acaoKey];
      return updated;
    });
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.nome.trim()) {
      return toast.error("O nome do perfil é obrigatório.");
    }

    try {
      if (editingPerfil) {
        await http.put(`/perfis-acesso/${editingPerfil.id}`, form);
        toast.success("Perfil de acesso atualizado com sucesso!");
      } else {
        await http.post("/perfis-acesso", form);
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
              const activeMenusCount = Object.values(p.permissoes?.menus || {}).filter(Boolean).length;
              const activeAcoesCount = Object.values(p.permissoes?.acoes || {}).filter(Boolean).length;
              const isBaseProfile = p.id === 'admin-profile-uuid-0000000000000000000' || p.id === 'func-profile-uuid-0000000000000000000';

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
                            p.id === 'admin-profile-uuid-0000000000000000000'
                              ? "bg-amber-50 dark:bg-amber-950/20 text-amber-600"
                              : "bg-blue-50 dark:bg-blue-950/20 text-blue-500"
                          }`}>
                            <ShieldCheck className="w-5 h-5" />
                          </div>
                          <h4 className="font-bold text-lg text-zinc-900 dark:text-zinc-50">{p.nome}</h4>
                        </div>
                        {isBaseProfile && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">
                            Padrão do Sistema
                          </span>
                        )}
                      </div>

                      <p className="text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed min-h-[40px]">
                        {p.descricao || "Sem descrição informada."}
                      </p>
                    </div>

                    <div className="border-t border-zinc-100 dark:border-zinc-850 pt-4">
                      <h5 className="text-[10px] font-bold text-zinc-450 dark:text-zinc-500 uppercase tracking-wider mb-2">Visão Geral de Acessos</h5>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div className="bg-zinc-50 dark:bg-zinc-950/40 p-2.5 rounded-xl border border-zinc-150 dark:border-zinc-850/50">
                          <span className="text-zinc-400 dark:text-zinc-500 block text-[9px] uppercase font-bold">Menus & Telas</span>
                          <span className="font-bold text-zinc-800 dark:text-zinc-200 mt-1 block">
                            {activeMenusCount} de {menuMetadata.length}
                          </span>
                        </div>
                        <div className="bg-zinc-50 dark:bg-zinc-950/40 p-2.5 rounded-xl border border-zinc-150 dark:border-zinc-850/50">
                          <span className="text-zinc-400 dark:text-zinc-500 block text-[9px] uppercase font-bold">Ações & Operações</span>
                          <span className="font-bold text-zinc-800 dark:text-zinc-200 mt-1 block">
                            {activeAcoesCount} de 5
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-end gap-2 pt-2 border-t border-zinc-100 dark:border-zinc-850">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleOpenEdit(p)}
                        className="flex items-center gap-1.5 border-zinc-250 dark:border-zinc-800 h-9 px-3"
                      >
                        <Pencil className="w-3.5 h-3.5" /> Editar
                      </Button>
                      {!isBaseProfile && (
                        <Button 
                          variant="destructive" 
                          size="sm"
                          onClick={() => handleOpenDelete(p)}
                          className="flex items-center gap-1.5 h-9 px-3"
                        >
                          <Trash2 className="w-3.5 h-3.5" /> Excluir
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
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-4xl w-full p-0 overflow-hidden bg-white dark:bg-zinc-900 border-0 rounded-2xl shadow-2xl flex flex-col" style={{ maxHeight: "90vh" }}>
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

            {/* Checklist of Permissions Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pt-4 border-t border-zinc-100 dark:border-zinc-850">
              
              {/* Column 1 & 2: Menus do Sistema */}
              <div className="lg:col-span-2 space-y-3">
                <h4 className="font-bold text-xs text-zinc-450 dark:text-zinc-500 uppercase tracking-wider border-b pb-1.5">
                  1. Acesso aos Menus do Sistema
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {menuMetadata.map((menu) => {
                    const Icon = menu.icon;
                    const hasAccess = form.permissoes.menus[menu.key];

                    return (
                      <div 
                        key={menu.key}
                        onClick={() => handleToggleMenu(menu.key)}
                        className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer select-none transition-all duration-200 ${
                          hasAccess 
                            ? "bg-emerald-50 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-400 font-bold" 
                            : "bg-white dark:bg-zinc-950/40 border-zinc-200 dark:border-zinc-850 hover:bg-zinc-50/50 text-zinc-700 dark:text-zinc-300"
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <div className={`p-1.5 rounded ${hasAccess ? "bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300" : "bg-zinc-100 dark:bg-zinc-800 text-zinc-450 dark:text-zinc-500"}`}>
                            <Icon className="w-4 h-4" />
                          </div>
                          <span className="text-xs font-semibold">{menu.label}</span>
                        </div>
                        <div className={`w-5 h-5 rounded-full border flex items-center justify-center transition-colors ${
                          hasAccess ? "bg-emerald-500 border-emerald-600 text-white" : "border-zinc-300 dark:border-zinc-700 bg-transparent"
                        }`}>
                          {hasAccess && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Column 3: Ações Permitidas */}
              <div className="lg:col-span-1 space-y-4">
                <div>
                  <h4 className="font-bold text-xs text-zinc-450 dark:text-zinc-500 uppercase tracking-wider border-b pb-1.5 mb-3">
                    2. Ações & Alterações
                  </h4>
                  <div className="space-y-3">
                    {/* Acesso de Administrador */}
                    <div 
                      onClick={() => handleToggleAcao("is_admin")}
                      className={`flex items-center justify-between p-3.5 rounded-xl border cursor-pointer select-none transition-all duration-200 ${
                        form.permissoes.acoes.is_admin 
                          ? "bg-amber-50 dark:bg-amber-950/20 border-amber-300 dark:border-amber-800 text-amber-800 dark:text-amber-500 font-bold" 
                          : "bg-white dark:bg-zinc-950/40 border-zinc-200 dark:border-zinc-850 hover:bg-zinc-50/50 text-zinc-700 dark:text-zinc-300"
                      }`}
                    >
                      <div>
                        <span className="text-xs font-bold block">Acesso de Administrador</span>
                        <span className="text-[10px] text-zinc-450 dark:text-zinc-500 block mt-0.5">Concede privilégios totais de administração</span>
                      </div>
                      <div className={`w-5 h-5 rounded-full border flex items-center justify-center transition-colors shrink-0 ${
                        form.permissoes.acoes.is_admin ? "bg-amber-500 border-amber-600 text-white" : "border-zinc-300 dark:border-zinc-700 bg-transparent"
                      }`}>
                        {form.permissoes.acoes.is_admin && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                      </div>
                    </div>

                    {/* Criar */}
                    <div 
                      onClick={() => handleToggleAcao("criar")}
                      className={`flex items-center justify-between p-3.5 rounded-xl border cursor-pointer select-none transition-all duration-200 ${
                        form.permissoes.acoes.criar 
                          ? "bg-emerald-50 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-400 font-bold" 
                          : "bg-white dark:bg-zinc-950/40 border-zinc-200 dark:border-zinc-850 hover:bg-zinc-50/50 text-zinc-700 dark:text-zinc-300"
                      }`}
                    >
                      <div>
                        <span className="text-xs font-bold block">Inclusão (Criar)</span>
                        <span className="text-[10px] text-zinc-450 dark:text-zinc-500 block mt-0.5">Cadastrar novos registros no sistema</span>
                      </div>
                      <div className={`w-5 h-5 rounded-full border flex items-center justify-center transition-colors shrink-0 ${
                        form.permissoes.acoes.criar ? "bg-emerald-500 border-emerald-600 text-white" : "border-zinc-300 dark:border-zinc-700 bg-transparent"
                      }`}>
                        {form.permissoes.acoes.criar && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                      </div>
                    </div>

                    {/* Editar */}
                    <div 
                      onClick={() => handleToggleAcao("editar")}
                      className={`flex items-center justify-between p-3.5 rounded-xl border cursor-pointer select-none transition-all duration-200 ${
                        form.permissoes.acoes.editar 
                          ? "bg-emerald-50 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-400 font-bold" 
                          : "bg-white dark:bg-zinc-950/40 border-zinc-200 dark:border-zinc-850 hover:bg-zinc-50/50 text-zinc-700 dark:text-zinc-300"
                      }`}
                    >
                      <div>
                        <span className="text-xs font-bold block">Edição (Editar)</span>
                        <span className="text-[10px] text-zinc-450 dark:text-zinc-500 block mt-0.5">Modificar dados de itens existentes</span>
                      </div>
                      <div className={`w-5 h-5 rounded-full border flex items-center justify-center transition-colors shrink-0 ${
                        form.permissoes.acoes.editar ? "bg-emerald-500 border-emerald-600 text-white" : "border-zinc-300 dark:border-zinc-700 bg-transparent"
                      }`}>
                        {form.permissoes.acoes.editar && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                      </div>
                    </div>

                    {/* Excluir */}
                    <div 
                      onClick={() => handleToggleAcao("excluir")}
                      className={`flex items-center justify-between p-3.5 rounded-xl border cursor-pointer select-none transition-all duration-200 ${
                        form.permissoes.acoes.excluir 
                          ? "bg-emerald-50 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-400 font-bold" 
                          : "bg-white dark:bg-zinc-950/40 border-zinc-200 dark:border-zinc-850 hover:bg-zinc-50/50 text-zinc-700 dark:text-zinc-300"
                      }`}
                    >
                      <div>
                        <span className="text-xs font-bold block">Exclusão (Excluir)</span>
                        <span className="text-[10px] text-zinc-450 dark:text-zinc-500 block mt-0.5">Apagar ou arquivar dados permanentemente</span>
                      </div>
                      <div className={`w-5 h-5 rounded-full border flex items-center justify-center transition-colors shrink-0 ${
                        form.permissoes.acoes.excluir ? "bg-emerald-500 border-emerald-600 text-white" : "border-zinc-300 dark:border-zinc-700 bg-transparent"
                      }`}>
                        {form.permissoes.acoes.excluir && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                      </div>
                    </div>

                    {/* Realizar Pagamentos */}
                    <div 
                      onClick={() => handleToggleAcao("realizar_pagamento")}
                      className={`flex items-center justify-between p-3.5 rounded-xl border cursor-pointer select-none transition-all duration-200 ${
                        form.permissoes.acoes.realizar_pagamento 
                          ? "bg-emerald-50 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-400 font-bold" 
                          : "bg-white dark:bg-zinc-950/40 border-zinc-200 dark:border-zinc-850 hover:bg-zinc-50/50 text-zinc-700 dark:text-zinc-300"
                      }`}
                    >
                      <div>
                        <span className="text-xs font-bold block">Realizar Pagamentos</span>
                        <span className="text-[10px] text-zinc-450 dark:text-zinc-500 block mt-0.5">Permitir recebimento de serviços e produtos</span>
                      </div>
                      <div className={`w-5 h-5 rounded-full border flex items-center justify-center transition-colors shrink-0 ${
                        form.permissoes.acoes.realizar_pagamento ? "bg-emerald-500 border-emerald-600 text-white" : "border-zinc-300 dark:border-zinc-700 bg-transparent"
                      }`}>
                        {form.permissoes.acoes.realizar_pagamento && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-blue-50/25 dark:bg-blue-950/5 border border-blue-200/50 rounded-xl p-4 space-y-2 mt-4">
                  <h5 className="text-[11px] font-bold text-blue-700 dark:text-blue-400 uppercase tracking-wide">💡 Dica de Segurança</h5>
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-450 leading-relaxed">
                    Você pode alterar os limites de visualização financeira e de relatórios de um perfil desmarcando os respectivos menus de <strong>Despesas</strong>, <strong>Outras Receitas</strong>, <strong>Comissões</strong> e <strong>Relatórios</strong>.
                  </p>
                </div>
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
