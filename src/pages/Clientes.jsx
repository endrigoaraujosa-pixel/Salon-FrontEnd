import React, { useEffect, useState } from "react";
import http from "../api";
import { PageHeader, EmptyState } from "../components/Page";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Textarea } from "../components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "../components/ui/dialog";
import { Users, Plus, Edit2, Trash2, Search, History } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

const blank = { nome: "", telefone: "", email: "", data_nascimento: "", endereco: "", observacoes: "" };

export default function Clientes() {
  const [list, setList] = useState([]);
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [form, setForm] = useState(blank);
  const nav = useNavigate();

  const load = () => http.get("/clientes").then((r) => setList(r.data));
  useEffect(() => { load(); }, []);

  const save = async () => {
    try {
      if (form.id) await http.put(`/clientes/${form.id}`, form);
      else await http.post("/clientes", form);
      toast.success("Cliente salvo");
      setOpen(false); setForm(blank); load();
    } catch (e) { toast.error("Erro ao salvar"); }
  };

  const del = (id) => {
    setDeletingId(id);
    setDeleteConfirmOpen(true);
  };

  const confirmDelete = async () => {
    if (!deletingId) return;
    try {
      await http.delete(`/clientes/${deletingId}`);
      toast.success("Cliente removido");
      setDeleteConfirmOpen(false);
      setDeletingId(null);
      load();
    } catch (e) {
      toast.error("Erro ao remover");
    }
  };

  const edit = (c) => { setForm(c); setOpen(true); };
  const filtered = list.filter((c) => c.nome?.toLowerCase().includes(q.toLowerCase()) || c.telefone?.includes(q));

  return (
    <div className="p-6 lg:p-8 fade-in">
      <PageHeader overline="Cadastro" title="Clientes" action={
        <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setForm(blank); }}>
          <DialogTrigger asChild>
            <Button data-testid="add-cliente-btn" className="bg-[#84A59D] hover:bg-[#6F9189]"><Plus className="w-4 h-4 mr-1" /> Novo cliente</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>{form.id ? "Editar" : "Novo"} cliente</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>Nome *</Label><Input data-testid="cliente-nome" value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Telefone</Label><Input data-testid="cliente-telefone" value={form.telefone} onChange={(e) => setForm({ ...form, telefone: e.target.value })} /></div>
                <div><Label>Email</Label><Input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
              </div>
              <div><Label>Data nascimento</Label><Input type="date" value={form.data_nascimento || ""} onChange={(e) => setForm({ ...form, data_nascimento: e.target.value })} /></div>
              <div><Label>Endereço</Label><Input value={form.endereco} onChange={(e) => setForm({ ...form, endereco: e.target.value })} /></div>
              <div><Label>Observações</Label><Textarea rows={2} value={form.observacoes} onChange={(e) => setForm({ ...form, observacoes: e.target.value })} /></div>
            </div>
            <DialogFooter><Button data-testid="save-cliente-btn" onClick={save} className="bg-[#84A59D] hover:bg-[#6F9189]">Salvar</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      } />

      <div className="relative mb-4 max-w-sm">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
        <Input data-testid="search-clientes" placeholder="Buscar por nome ou telefone..." value={q} onChange={(e) => setQ(e.target.value)} className="pl-9" />
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={Users} title="Nenhum cliente" hint="Cadastre seu primeiro cliente para começar." />
      ) : (
        <div className="bg-white border border-zinc-200 rounded-xl overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-zinc-50 text-xs uppercase tracking-wider text-zinc-500">
              <tr><th className="px-4 py-3 text-left">Nome</th><th className="px-4 py-3 text-left">Telefone</th><th className="px-4 py-3 text-left">Email</th><th className="px-4 py-3"></th></tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {filtered.map((c) => (
                <tr key={c.id} className="hover:bg-zinc-50/60" data-testid={`cliente-row-${c.id}`}>
                  <td className="px-4 py-3 font-medium">{c.nome}</td>
                  <td className="px-4 py-3 text-zinc-600">{c.telefone || "-"}</td>
                  <td className="px-4 py-3 text-zinc-600">{c.email || "-"}</td>
                  <td className="px-4 py-3 text-right space-x-1">
                    <Button size="sm" variant="ghost" onClick={() => nav(`/clientes/${c.id}/historico`)}><History className="w-4 h-4" /></Button>
                    <Button size="sm" variant="ghost" onClick={() => edit(c)} data-testid={`edit-cliente-${c.id}`}><Edit2 className="w-4 h-4" /></Button>
                    <Button size="sm" variant="ghost" onClick={() => del(c.id)} data-testid={`delete-cliente-${c.id}`}><Trash2 className="w-4 h-4 text-rose-500" /></Button>
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
            Tem certeza que deseja excluir este cliente? Esta ação não pode ser desfeita e pode afetar históricos.
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDeleteConfirmOpen(false)}>Cancelar</Button>
            <Button onClick={confirmDelete} className="bg-rose-500 hover:bg-rose-600 text-white">Excluir</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
