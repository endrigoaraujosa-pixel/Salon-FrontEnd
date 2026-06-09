import React, { useEffect, useState } from "react";
import http from "../api";
import { PageHeader, EmptyState } from "../components/Page";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Switch } from "../components/ui/switch";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "../components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "../components/ui/dialog";
import { UsersRound, Plus, Edit2, Trash2, Shield, History } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "../auth";
import AuditModal from "../components/AuditModal";

const blank = { name: "", email: "", senha: "", role: "funcionario", perfil_acesso_id: "func-profile-uuid-000000000000000000", colaborador_id: "", ativo: true, pode_alterar_concluido: false, pode_excluir_agendamento: false, pode_excluir_pagamento: false };

export default function Usuarios() {
  const { user: me } = useAuth();
  const [list, setList] = useState([]);
  const [perfis, setPerfis] = useState([]);
  const [colaboradores, setColaboradores] = useState([]);
  const [open, setOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [deletingEmail, setDeletingEmail] = useState("");
  const [form, setForm] = useState(blank);
  const [confirmarSenha, setConfirmarSenha] = useState("");
  const [auditOpen, setAuditOpen] = useState(false);

  const load = () => http.get("/users").then((r) => setList(r.data)).catch((e) => toast.error(e.response?.data?.detail || "Erro ao carregar"));
  useEffect(() => { 
    load(); 
    http.get("/perfis-acesso").then((r) => setPerfis(r.data)).catch(() => {});
    http.get("/colaboradores").then((r) => setColaboradores(r.data || [])).catch(() => {});
  }, []);

  const save = async () => {
    if (!form.name || !form.email) { toast.error("Nome e email obrigatórios"); return; }
    if (!form.id && !form.senha) { toast.error("Senha obrigatória"); return; }
    
    const emailLower = form.email.toLowerCase().trim();
    const emailExists = list.some((u) => u.email.toLowerCase().trim() === emailLower && u.id !== form.id);
    if (emailExists) {
      toast.error("Este email já está cadastrado");
      return;
    }

    if ((!form.id && form.senha) || (form.id && form.senha && form.senha.trim())) {
      if (form.senha !== confirmarSenha) {
        toast.error("As senhas informadas não coincidem");
        return;
      }
    }

    try {
      const payload = { 
        name: form.name, 
        email: form.email, 
        role: form.role, 
        perfil_acesso_id: form.perfil_acesso_id || "func-profile-uuid-000000000000000000",
        colaborador_id: form.colaborador_id || null,
        ativo: form.ativo,
        pode_alterar_concluido: form.pode_alterar_concluido,
        pode_excluir_agendamento: form.pode_excluir_agendamento,
        pode_excluir_pagamento: form.pode_excluir_pagamento
      };
      
      // Só enviar senha se foi preenchida
      if (form.senha && form.senha.trim()) {
        payload.senha = form.senha;
      }
      
      if (form.id) {
        await http.put(`/users/${form.id}`, payload);
        toast.success("Usuário atualizado");
      } else {
        await http.post("/users", { ...payload, senha: form.senha });
        toast.success("Usuário criado");
      }
      setOpen(false);
      setForm(blank);
      load();
    } catch (e) { 
      toast.error(e.response?.data?.detail || "Erro ao salvar"); 
    }
  };

  const del = (id, email) => {
    setDeletingId(id);
    setDeletingEmail(email);
    setDeleteConfirmOpen(true);
  };

  const confirmDelete = async () => {
    if (!deletingId) return;
    try { 
      await http.delete(`/users/${deletingId}`); 
      toast.success("Removido com sucesso"); 
      setDeleteConfirmOpen(false);
      setDeletingId(null);
      setDeletingEmail("");
      load(); 
    }
    catch (e) { 
      toast.error(e.response?.data?.detail || "Erro"); 
    }
  };

  const edit = (u) => { 
    setForm({ ...u, senha: "" }); 
    setConfirmarSenha("");
    setOpen(true); 
  };

  const isAdmin = me?.role === "admin";

  return (
    <div className="p-6 lg:p-8 fade-in">
      <PageHeader overline="Acessos" title="Usuários" action={
        <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) { setForm(blank); setConfirmarSenha(""); } }}>
          {isAdmin && (
            <DialogTrigger asChild>
              <Button data-testid="add-user-btn" className="bg-[#84A59D] hover:bg-[#6F9189]"><Plus className="w-4 h-4 mr-1" /> Novo usuário</Button>
            </DialogTrigger>
          )}
          <DialogContent className="w-[95vw] max-w-[95vw] sm:max-w-md p-5 sm:p-6 rounded-2xl dark:bg-zinc-900 dark:border-zinc-800">
            <DialogHeader><DialogTitle>{form.id ? "Editar" : "Novo"} usuário</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>Nome *</Label><Input data-testid="user-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} disabled={!isAdmin} /></div>
              <div><Label>Email *</Label><Input data-testid="user-email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} autoComplete="off" disabled={!isAdmin} /></div>
              <div>
                <Label>{form.id ? "Nova senha (deixe vazio para manter)" : "Senha *"}</Label>
                <Input 
                  data-testid="user-password" 
                  type="password" 
                  value={form.senha || ""} 
                  onChange={(e) => setForm({ ...form, senha: e.target.value })} 
                  placeholder={form.id ? "Digite uma nova senha se quiser alterar" : "Senha obrigatória"}
                  autoComplete="new-password"
                />
              </div>
              <div>
                <Label>{form.id ? "Confirmar nova senha" : "Confirmar senha *"}</Label>
                <Input 
                  data-testid="user-confirm-password" 
                  type="password" 
                  value={confirmarSenha} 
                  onChange={(e) => setConfirmarSenha(e.target.value)} 
                  placeholder={form.id ? "Confirme a nova senha" : "Confirme a senha"}
                  autoComplete="new-password"
                />
              </div>
              <div>
                <Label>Perfil *</Label>
                <Select value={form.perfil_acesso_id || "func-profile-uuid-000000000000000000"} onValueChange={(v) => {
                  const p = perfis.find(x => x.id === v);
                  const chosenRole = (p?.nome === "Administrador" || p?.permissoes?.acoes?.is_admin) ? "admin" : "funcionario";
                  setForm({ ...form, perfil_acesso_id: v, role: chosenRole });
                }} disabled={!isAdmin}>
                  <SelectTrigger data-testid="user-role"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {perfis.map(p => (
                      <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Colaborador Vinculado</Label>
                <Select value={form.colaborador_id || "nenhum"} onValueChange={(v) => setForm({ ...form, colaborador_id: v === "nenhum" ? null : v })} disabled={!isAdmin}>
                  <SelectTrigger data-testid="user-colab"><SelectValue placeholder="Selecione o colaborador" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="nenhum">Nenhum</SelectItem>
                    {colaboradores.map(c => (
                      <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={form.ativo} onCheckedChange={(v) => setForm({ ...form, ativo: v })} disabled={!isAdmin} />
                <Label>Ativo</Label>
              </div>
              <div className="flex flex-col gap-2 bg-[#F8FBFB] dark:bg-[#1a2322] p-3 rounded-lg border border-[#E8EFEF] dark:border-[#2e3e3b] mt-2">
                <div className="text-[11px] font-semibold text-[#3A4F4A] uppercase tracking-wider mb-1">Permissões Especiais</div>
                <div className="flex items-center gap-2">
                  <Switch checked={form.pode_alterar_concluido} onCheckedChange={(v) => setForm({ ...form, pode_alterar_concluido: v })} disabled={!isAdmin} />
                  <Label className="text-xs">Pode alterar/pagar agendamentos concluídos</Label>
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <Switch checked={form.pode_excluir_agendamento} onCheckedChange={(v) => setForm({ ...form, pode_excluir_agendamento: v })} disabled={!isAdmin} />
                  <Label className="text-xs">Pode excluir agendamentos</Label>
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <Switch checked={form.pode_excluir_pagamento} onCheckedChange={(v) => setForm({ ...form, pode_excluir_pagamento: v })} disabled={!isAdmin} />
                  <Label className="text-xs">Permitir exclusão de pagamentos e cancelamento de vendas</Label>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button data-testid="save-user-btn" onClick={save} className="bg-[#84A59D] hover:bg-[#6F9189]">Salvar</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      } />

      {isAdmin && (
        <div className="flex justify-end mb-4">
          <Button 
            variant="outline" 
            onClick={() => setAuditOpen(true)}
            className="flex items-center gap-1.5 text-xs font-semibold text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
          >
            <History className="w-3.5 h-3.5" />
            <span>Excluídos</span>
          </Button>
        </div>
      )}

      {list.length === 0 ? <EmptyState icon={UsersRound} title="Nenhum usuário" hint="Cadastre usuários para dar acesso ao sistema." /> : (
        <div className="space-y-4">
          <div className="hidden md:block bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-x-auto shadow-sm">
            <table className="w-full text-[15px]">
              <thead className="bg-zinc-50 dark:bg-zinc-900/50 text-sm uppercase tracking-wider text-zinc-500 dark:text-zinc-400 border-b border-zinc-200 dark:border-zinc-800">
                <tr>
                  <th className="px-4 py-3.5 text-left font-semibold">Nome</th>
                  <th className="px-4 py-3.5 text-left font-semibold">Email</th>
                  <th className="px-4 py-3.5 text-left font-semibold">Colaborador Vinculado</th>
                  <th className="px-4 py-3.5 text-left font-semibold">Perfil</th>
                  <th className="px-4 py-3.5 text-left font-semibold">Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/80">
                {list.map((u) => (
                  <tr key={u.id} className="hover:bg-zinc-50/60 dark:hover:bg-zinc-900/20" data-testid={`user-row-${u.id}`}>
                    <td className="px-4 py-3.5 font-semibold text-zinc-900 dark:text-zinc-100">
                      {u.name} {u.id === me?.id && <span className="text-xs text-zinc-400 dark:text-zinc-550 ml-1 font-normal">(você)</span>}
                    </td>
                    <td className="px-4 py-3.5 text-zinc-650 dark:text-zinc-400">{u.email}</td>
                    <td className="px-4 py-3.5 text-zinc-700 dark:text-zinc-300 font-semibold">
                      {colaboradores.find(c => c.id === u.colaborador_id)?.nome || <span className="text-zinc-400 dark:text-zinc-600 font-normal">—</span>}
                    </td>
                    <td className="px-4 py-3.5">
                      {(() => {
                        const p = perfis.find(x => x.id === u.perfil_acesso_id);
                        if (p) {
                          return (
                            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${
                              p.id === 'admin-profile-uuid-00000000000000000'
                                ? "bg-amber-50 dark:bg-amber-950/20 text-amber-600"
                                : "bg-blue-50 dark:bg-blue-950/20 text-blue-500"
                            }`}>
                              <Shield className="w-3.5 h-3.5" /> {p.nome}
                            </span>
                          );
                        }
                        return u.role === "admin" ? (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 dark:bg-amber-950/20 text-amber-600 text-xs font-bold"><Shield className="w-3.5 h-3.5" /> Administrador</span>
                        ) : (
                          <span className="px-3 py-1 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 text-xs font-bold">Funcionário</span>
                        );
                      })()}
                    </td>
                    <td className="px-4 py-3.5">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${u.ativo ? "bg-emerald-100 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-450" : "bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400"}`}>{u.ativo ? "Ativo" : "Inativo"}</span>
                    </td>
                    <td className="px-4 py-3.5 text-right space-x-1">
                      <Button size="sm" variant="ghost" onClick={() => edit(u)} data-testid={`edit-user-${u.id}`} className="hover:bg-zinc-100 dark:hover:bg-zinc-800"><Edit2 className="w-4 h-4" /></Button>
                      {isAdmin && (
                        <Button size="sm" variant="ghost" onClick={() => del(u.id, u.email)} data-testid={`delete-user-${u.id}`} className="hover:bg-rose-50 dark:hover:bg-rose-950/30"><Trash2 className="w-4 h-4 text-rose-500" /></Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Card-Based View */}
          <div className="grid grid-cols-1 gap-4 md:hidden">
            {list.map((u) => (
              <div 
                key={u.id} 
                className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-4.5 space-y-4 shadow-sm"
                data-testid={`user-card-${u.id}`}
              >
                {/* Header card: Name and Status */}
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h4 className="font-bold text-zinc-900 dark:text-zinc-50 flex items-center gap-2 flex-wrap">
                      <span className="text-[17px]">{u.name}</span>
                      {u.id === me?.id && (
                        <span className="text-[10px] bg-zinc-100 dark:bg-zinc-800 text-zinc-550 dark:text-zinc-400 px-1.5 py-0.5 rounded-md font-bold uppercase tracking-wider">
                          você
                        </span>
                      )}
                    </h4>
                    <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1 break-all font-medium">{u.email}</p>
                  </div>
                  <span className={`px-2.5 py-1 rounded-full text-xs font-bold shrink-0 ${
                    u.ativo 
                      ? "bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-450" 
                      : "bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-450"
                  }`}>
                    {u.ativo ? "Ativo" : "Inativo"}
                  </span>
                </div>

                {/* Perfil & Colaborador Info */}
                <div className="grid grid-cols-2 gap-4 py-3 border-t border-b border-zinc-100 dark:border-zinc-800/80 text-sm">
                  <div>
                    <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 block mb-1.5">Perfil de Acesso</span>
                    {(() => {
                      const p = perfis.find(x => x.id === u.perfil_acesso_id);
                      if (p) {
                        return (
                          <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold ${
                            p.id === 'admin-profile-uuid-00000000000000000'
                              ? "bg-amber-50 dark:bg-amber-950/20 text-amber-600"
                              : "bg-blue-50 dark:bg-blue-950/20 text-blue-500"
                          }`}>
                            <Shield className="w-3 h-3" /> {p.nome}
                          </span>
                        );
                      }
                      return u.role === "admin" ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-50 dark:bg-amber-950/20 text-amber-600 text-xs font-bold">
                          <Shield className="w-3 h-3" /> Administrador
                        </span>
                      ) : (
                        <span className="px-2.5 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 text-xs font-bold">
                          Funcionário
                        </span>
                      );
                    })()}
                  </div>
                  <div>
                    <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 block mb-1.5">Colaborador</span>
                    <span className="font-bold text-zinc-800 dark:text-zinc-200">
                      {colaboradores.find(c => c.id === u.colaborador_id)?.nome || <span className="text-zinc-400 dark:text-zinc-600 font-normal">—</span>}
                    </span>
                  </div>
                </div>

                {/* Actions Footer */}
                <div className="flex items-center justify-end gap-2 pt-1.5">
                  <Button 
                    size="sm" 
                    variant="outline" 
                    onClick={() => edit(u)} 
                    data-testid={`edit-user-mobile-${u.id}`}
                    className="h-10 px-4 border-zinc-250 dark:border-zinc-800 text-zinc-750 dark:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-800 flex items-center justify-center gap-1.5 text-sm font-semibold rounded-xl"
                  >
                    <Edit2 className="w-4 h-4" />
                    <span>Editar</span>
                  </Button>
                  {isAdmin && (
                    <Button 
                      size="sm" 
                      variant="outline" 
                      onClick={() => del(u.id, u.email)} 
                      data-testid={`delete-user-mobile-${u.id}`}
                      className="h-10 px-4 border-zinc-250 dark:border-zinc-800 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 flex items-center justify-center gap-1.5 text-sm font-semibold rounded-xl"
                    >
                      <Trash2 className="w-4 h-4" />
                      <span>Excluir</span>
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Dialog de confirmação de exclusão */}
      <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <DialogContent className="w-[95vw] max-w-[95vw] sm:max-w-md p-5 sm:p-6 rounded-2xl dark:bg-zinc-900 dark:border-zinc-800">
          <DialogHeader>
            <DialogTitle>Confirmar exclusão</DialogTitle>
          </DialogHeader>
          <div className="py-4 text-sm text-zinc-600 dark:text-zinc-400">
            Tem certeza que deseja excluir o usuário <b>{deletingEmail}</b>? Esta ação pode ser desfeita a qualquer momento a partir da tela de "Excluídos".
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDeleteConfirmOpen(false)}>Cancelar</Button>
            <Button onClick={confirmDelete} className="bg-rose-500 hover:bg-rose-600 text-white">Excluir</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <AuditModal 
        isOpen={auditOpen} 
        onClose={() => setAuditOpen(false)} 
        modulo="usuario" 
        tituloModulo="Usuários" 
        onRestoreSuccess={load}
      />
    </div>
  );
}