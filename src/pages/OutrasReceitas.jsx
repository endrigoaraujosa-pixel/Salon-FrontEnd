import React, { useEffect, useState } from "react";
import http from "../api";
import { PageHeader } from "../components/Page";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "../components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "../components/ui/dialog";
import { Plus, Trash2, Edit2, AlertCircle, History } from "lucide-react";
import { toast } from "sonner";
import AuditModal from "../components/AuditModal";

const fmtBRL = (n) => (n || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const fmtDT = (s) => s ? new Date(s).toLocaleDateString("pt-BR") : "-";

const CATEGORIAS = [
  "Juros",
  "Multas",
  "Devoluções",
  "Bônus",
  "Reembolsos",
  "Aluguel de espaço",
  "Venda de ativos",
  "Investimentos",
  "Outros"
];

export default function OutrasReceitas() {
  const [receitas, setReceitas] = useState([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [auditOpen, setAuditOpen] = useState(false);
  const [form, setForm] = useState({
    descricao: "",
    valor: "",
    categoria: "",
    data_recebimento: "",
    observacoes: ""
  });

  const load = () => {
    http.get("/outras-receitas").then((r) => setReceitas(r.data)).catch(() => setReceitas([]));
  };

  useEffect(() => { load(); }, []);

  const resetForm = () => {
    setForm({
      descricao: "",
      valor: "",
      categoria: "",
      data_recebimento: "",
      observacoes: ""
    });
    setEditingId(null);
  };

  const openDialog = (receita = null) => {
    if (receita) {
      setForm(receita);
      setEditingId(receita.id);
    } else {
      resetForm();
    }
    setDialogOpen(true);
  };

  const save = async () => {
    if (!form.descricao.trim()) {
      toast.error("Descrição obrigatória");
      return;
    }
    
    // Sanitização e validação numérica para pt-BR (ex: "123,45" -> 123.45)
    const valorS = String(form.valor || "").replace(",", ".");
    const valorNum = parseFloat(valorS);
    if (isNaN(valorNum) || valorNum <= 0) {
      toast.error("Valor deve ser maior que zero");
      return;
    }

    const payload = { ...form, valor: valorNum };

    try {
      if (editingId) {
        await http.put(`/outras-receitas/${editingId}`, payload);
        toast.success("Receita atualizada");
      } else {
        await http.post("/outras-receitas", payload);
        toast.success("Receita criada");
      }
      setDialogOpen(false);
      resetForm();
      load();
    } catch (e) {
      toast.error(e.response?.data?.detail || "Erro");
    }
  };

  const deleteReceita = (id) => {
    setDeletingId(id);
    setDeleteConfirmOpen(true);
  };

  const confirmDelete = async () => {
    if (!deletingId) return;
    try {
      await http.delete(`/outras-receitas/${deletingId}`);
      toast.success("Receita removida");
      setDeleteConfirmOpen(false);
      setDeletingId(null);
      load();
    } catch (e) {
      toast.error(e.response?.data?.detail || "Erro");
    }
  };

  const totalReceitas = receitas.reduce((sum, r) => sum + (r.valor || 0), 0);

  return (
    <div className="p-6 lg:p-8 fade-in">
      <PageHeader overline="Financeiro" title="Outras Receitas" action={
        <Button onClick={() => openDialog()}><Plus className="w-4 h-4 mr-1" /> Nova receita</Button>
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

      <div className="bg-white border border-zinc-200 rounded-xl p-5 mb-6">
        <div className="text-xs uppercase tracking-wider text-zinc-400">Total de outras receitas</div>
        <div className="font-display text-4xl font-semibold mt-1 text-emerald-600">{fmtBRL(totalReceitas)}</div>
      </div>

      <div className="bg-white border border-zinc-200 rounded-xl overflow-hidden">
        {receitas.length === 0 ? (
          <div className="p-12 text-center text-zinc-400">
            <AlertCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
            Nenhuma outra receita registrada
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-zinc-50 text-xs uppercase tracking-wider text-zinc-500">
              <tr>
                <th className="px-4 py-3 text-left">Descrição</th>
                <th className="px-4 py-3 text-left">Categoria</th>
                <th className="px-4 py-3 text-right">Valor</th>
                <th className="px-4 py-3 text-left">Data</th>
                <th className="px-4 py-3 text-left">Observações</th>
                <th className="px-4 py-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {receitas.map((r) => (
                <tr key={r.id}>
                  <td className="px-4 py-3 font-medium text-zinc-700">{r.descricao}</td>
                  <td className="px-4 py-3 text-zinc-600">{r.categoria || "-"}</td>
                  <td className="px-4 py-3 text-right font-display font-semibold text-emerald-600">{fmtBRL(r.valor)}</td>
                  <td className="px-4 py-3 text-zinc-600">{fmtDT(r.data_recebimento)}</td>
                  <td className="px-4 py-3 text-sm text-zinc-600">{r.observacoes || "-"}</td>
                  <td className="px-4 py-3 text-right space-x-2">
                    <Button size="icon" variant="ghost" onClick={() => openDialog(r)}>
                      <Edit2 className="w-4 h-4 text-blue-500" />
                    </Button>
                    <Button size="icon" variant="ghost" onClick={() => deleteReceita(r.id)}>
                      <Trash2 className="w-4 h-4 text-rose-500" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Dialog de criação/edição */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingId ? "Editar receita" : "Nova receita"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Descrição</Label>
              <Input
                value={form.descricao}
                onChange={(e) => setForm({ ...form, descricao: e.target.value })}
                placeholder="Ex: Juros recebidos"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Valor</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={form.valor}
                  onChange={(e) => setForm({ ...form, valor: e.target.value })}
                  placeholder="0,00"
                />
              </div>
              <div>
                <Label>Categoria</Label>
                <Select value={form.categoria} onValueChange={(v) => setForm({ ...form, categoria: v })}>
                  <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                  <SelectContent>
                    {CATEGORIAS.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Data de recebimento</Label>
              <Input
                type="date"
                value={form.data_recebimento}
                onChange={(e) => setForm({ ...form, data_recebimento: e.target.value })}
              />
            </div>
            <div>
              <Label>Observações</Label>
              <Input
                value={form.observacoes}
                onChange={(e) => setForm({ ...form, observacoes: e.target.value })}
                placeholder="Notas adicionais..."
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={save} className="bg-[#84A59D] hover:bg-[#6F9189]">Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de confirmação de exclusão */}
      <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Confirmar exclusão</DialogTitle>
          </DialogHeader>
          <div className="py-4 text-sm text-zinc-600 dark:text-zinc-400">
            Tem certeza que deseja excluir esta receita? Esta ação pode ser desfeita a qualquer momento a partir da tela de "Excluídos".
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
        modulo="receita" 
        tituloModulo="Outras Receitas" 
        onRestoreSuccess={load}
      />
    </div>
  );
}
