import React, { useEffect, useState } from "react";
import http from "../api";
import { PageHeader, EmptyState } from "../components/Page";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Switch } from "../components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "../components/ui/dialog";
import { UserCog, Plus, Edit2, Trash2, History } from "lucide-react";
import { toast } from "sonner";
import AuditModal from "../components/AuditModal";

const blank = { nome: "", cargo: "", telefone: "", comissao_principal: 40, comissao_auxiliar: 20, ativo: true };

export default function Colaboradores() {
  const [list, setList] = useState([]);
  const [open, setOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [form, setForm] = useState(blank);
  const [auditOpen, setAuditOpen] = useState(false);
  const load = () => http.get("/colaboradores").then((r) => setList(r.data));
  useEffect(() => { load(); }, []);

  const save = async () => {
    try {
      const payload = { ...form, comissao_principal: Number(form.comissao_principal), comissao_auxiliar: Number(form.comissao_auxiliar) };
      if (form.id) await http.put(`/colaboradores/${form.id}`, payload); else await http.post("/colaboradores", payload);
      toast.success("Salvo"); setOpen(false); setForm(blank); load();
    } catch { toast.error("Erro ao salvar"); }
  };
  
  const del = (id) => {
    setDeletingId(id);
    setDeleteConfirmOpen(true);
  };

  const confirmDelete = async () => {
    if (!deletingId) return;
    try {
      await http.delete(`/colaboradores/${deletingId}`);
      toast.success("Colaborador removido");
      setDeleteConfirmOpen(false);
      setDeletingId(null);
      load();
    } catch (e) {
      toast.error("Erro ao remover");
    }
  };

  const edit = (c) => { setForm(c); setOpen(true); };

  return (
    <div className="p-6 lg:p-8 fade-in">
      <PageHeader overline="Equipe" title="Colaboradores" action={
        <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setForm(blank); }}>
          <DialogTrigger asChild><Button data-testid="add-colaborador-btn" className="bg-[#84A59D] hover:bg-[#6F9189]"><Plus className="w-4 h-4 mr-1" /> Novo colaborador</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>{form.id ? "Editar" : "Novo"} colaborador</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>Nome *</Label><Input data-testid="colab-nome" value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Cargo</Label><Input value={form.cargo} onChange={(e) => setForm({ ...form, cargo: e.target.value })} /></div>
                <div><Label>Telefone</Label><Input value={form.telefone} onChange={(e) => setForm({ ...form, telefone: e.target.value })} /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Comissão principal (%)</Label><Input type="number" value={form.comissao_principal} onChange={(e) => setForm({ ...form, comissao_principal: e.target.value })} /></div>
                <div><Label>Comissão auxiliar (%)</Label><Input type="number" value={form.comissao_auxiliar} onChange={(e) => setForm({ ...form, comissao_auxiliar: e.target.value })} /></div>
              </div>
              <div className="flex items-center gap-2"><Switch checked={form.ativo} onCheckedChange={(v) => setForm({ ...form, ativo: v })} /><Label>Ativo</Label></div>
            </div>
            <DialogFooter><Button data-testid="save-colab-btn" onClick={save} className="bg-[#84A59D] hover:bg-[#6F9189]">Salvar</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      } />

      <div className="flex justify-end mb-4">
        <Button 
          variant="outline" 
          onClick={() => setAuditOpen(true)}
          className="flex items-center gap-1.5 text-xs font-semibold text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200 border border-zinc-200 dark:border-zinc-800"
        >
          <History className="w-3.5 h-3.5" />
          <span>Excluídos</span>
        </Button>
      </div>

      {list.length === 0 ? <EmptyState icon={UserCog} title="Nenhum colaborador" hint="Cadastre profissionais para começar a agendar." /> : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {list.map((c) => (
            <div key={c.id} className="bg-white border border-zinc-200 rounded-xl p-5" data-testid={`colab-card-${c.id}`}>
              <div className="flex items-start justify-between">
                <div>
                  <div className="font-display text-lg font-medium">{c.nome}</div>
                  <div className="text-sm text-zinc-500">{c.cargo || "—"}</div>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full ${c.ativo ? "bg-emerald-100 text-emerald-700" : "bg-zinc-100 text-zinc-500"}`}>{c.ativo ? "Ativo" : "Inativo"}</span>
              </div>
              <div className="mt-4 text-sm text-zinc-600 space-y-1">
                <div>📞 {c.telefone || "—"}</div>
                <div>Comissão: <b>{c.comissao_principal}%</b> / aux <b>{c.comissao_auxiliar}%</b></div>
              </div>
              <div className="mt-4 pt-3 border-t border-zinc-100 flex gap-2">
                <Button size="sm" variant="outline" onClick={() => edit(c)}><Edit2 className="w-3 h-3 mr-1" /> Editar</Button>
                <Button size="sm" variant="ghost" onClick={() => del(c.id)}><Trash2 className="w-3 h-3 text-rose-500" /></Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Dialog de confirmação de exclusão */}
      <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Confirmar exclusão</DialogTitle>
          </DialogHeader>
          <div className="py-4 text-sm text-zinc-600 dark:text-zinc-400">
            Tem certeza que deseja excluir este colaborador? Esta ação não pode ser desfeita e pode afetar agendas.
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
        modulo="colaborador" 
        tituloModulo="Colaboradores"
        onRestoreSuccess={load}
      />
    </div>
  );
}
