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

const blank = { name: "", email: "", senha: "", role: "funcionario", ativo: true, pode_alterar_concluido: false, pode_excluir_agendamento: false, pode_excluir_pagamento: false };

export default function Usuarios() {
  const { user: me } = useAuth();
  const [list, setList] = useState([]);
  const [open, setOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [deletingEmail, setDeletingEmail] = useState("");
  const [form, setForm] = useState(blank);
  const [auditOpen, setAuditOpen] = useState(false);

  const load = () => http.get("/users").then((r) => setList(r.data)).catch((e) => toast.error(e.response?.data?.detail || "Erro ao carregar"));
  useEffect(() => { load(); }, []);

  const save = async () => {
    if (!form.name || !form.email) { toast.error("Nome e email obrigatórios"); return; }
    if (!form.id && !form.senha) { toast.error("Senha obrigatória"); return; }
    
    const emailLower = form.email.toLowerCase().trim();
    const emailExists = list.some((u) => u.email.toLowerCase().trim() === emailLower && u.id !== form.id);
    if (emailExists) {
      toast.error("Este email já está cadastrado");
      return;
    }

    try {
      const payload = { 
        name: form.name, 
        email: form.email, 
        role: form.role, 
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
    setOpen(true); 
  };

  return (
    <div className="p-6 lg:p-8 fade-in">
      <PageHeader overline="Acessos" title="Usuários" action={
        <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setForm(blank); }}>
          <DialogTrigger asChild>
            <Button data-testid="add-user-btn" className="bg-[#84A59D] hover:bg-[#6F9189]"><Plus className="w-4 h-4 mr-1" /> Novo usuário</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>{form.id ? "Editar" : "Novo"} usuário</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>Nome *</Label><Input data-testid="user-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
              <div><Label>Email *</Label><Input data-testid="user-email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} autoComplete="off" /></div>
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
                <Label>Perfil *</Label>
                <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v })}>
                  <SelectTrigger data-testid="user-role"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Administrador</SelectItem>
                    <SelectItem value="funcionario">Funcionário</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={form.ativo} onCheckedChange={(v) => setForm({ ...form, ativo: v })} />
                <Label>Ativo</Label>
              </div>
              <div className="flex flex-col gap-2 bg-[#F8FBFB] dark:bg-[#1a2322] p-3 rounded-lg border border-[#E8EFEF] dark:border-[#2e3e3b] mt-2">
                <div className="text-[11px] font-semibold text-[#3A4F4A] uppercase tracking-wider mb-1">Permissões Especiais</div>
                <div className="flex items-center gap-2">
                  <Switch checked={form.pode_alterar_concluido} onCheckedChange={(v) => setForm({ ...form, pode_alterar_concluido: v })} />
                  <Label className="text-xs">Pode alterar/pagar agendamentos concluídos</Label>
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <Switch checked={form.pode_excluir_agendamento} onCheckedChange={(v) => setForm({ ...form, pode_excluir_agendamento: v })} />
                  <Label className="text-xs">Pode excluir agendamentos</Label>
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <Switch checked={form.pode_excluir_pagamento} onCheckedChange={(v) => setForm({ ...form, pode_excluir_pagamento: v })} />
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

      {list.length === 0 ? <EmptyState icon={UsersRound} title="Nenhum usuário" hint="Cadastre usuários para dar acesso ao sistema." /> : (
        <div className="bg-white border border-zinc-200 rounded-xl overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-zinc-50 text-xs uppercase tracking-wider text-zinc-500">
              <tr><th className="px-4 py-3 text-left">Nome</th><th className="px-4 py-3 text-left">Email</th><th className="px-4 py-3 text-left">Perfil</th><th className="px-4 py-3 text-left">Status</th><th></th></tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {list.map((u) => (
                <tr key={u.id} className="hover:bg-zinc-50/60" data-testid={`user-row-${u.id}`}>
                  <td className="px-4 py-3 font-medium">{u.name} {u.id === me?.id && <span className="text-xs text-zinc-400 ml-1">(você)</span>}</td>
                  <td className="px-4 py-3 text-zinc-600">{u.email}</td>
                  <td className="px-4 py-3">
                    {u.role === "admin" ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#EAF0EE] text-[#3A4F4A] text-xs font-medium"><Shield className="w-3 h-3" /> Admin</span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-700 text-xs font-medium">Funcionário</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${u.ativo ? "bg-emerald-100 text-emerald-700" : "bg-zinc-100 text-zinc-500"}`}>{u.ativo ? "Ativo" : "Inativo"}</span>
                  </td>
                  <td className="px-4 py-3 text-right space-x-1">
                    <Button size="sm" variant="ghost" onClick={() => edit(u)} data-testid={`edit-user-${u.id}`}><Edit2 className="w-4 h-4" /></Button>
                    <Button size="sm" variant="ghost" onClick={() => del(u.id, u.email)} data-testid={`delete-user-${u.id}`}><Trash2 className="w-4 h-4 text-rose-500" /></Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Dialog de confirmação de exclusão */}
      <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <DialogContent className="sm:max-w-md">
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