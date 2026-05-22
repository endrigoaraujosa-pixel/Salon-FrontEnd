import React, { useEffect, useState } from "react";
import http from "../api";
import { PageHeader } from "../components/Page";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "../components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "../components/ui/dialog";
import { Checkbox } from "../components/ui/checkbox";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "../components/ui/tabs";
import { Plus, Trash2, Edit2, AlertCircle, History } from "lucide-react";
import { toast } from "sonner";
import AuditModal from "../components/AuditModal";

const fmtBRL = (n) => (n || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const fmtDT = (s) => s ? new Date(s).toLocaleDateString("pt-BR") : "-";

const CATEGORIAS = [
  "Aluguel",
  "Salários",
  "Água/Luz",
  "Internet",
  "Telefone",
  "Manutenção",
  "Limpeza",
  "Suprimentos",
  "Publicidade",
  "Seguros",
  "Impostos",
  "Outros"
];

export default function Despesas() {
  const [despesas, setDespesas] = useState([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [tab, setTab] = useState("fixo");
  const [auditOpen, setAuditOpen] = useState(false);
  const [form, setForm] = useState({
    descricao: "",
    valor: "",
    tipo: "fixo",
    categoria: "",
    data_vencimento: "",
    data_pagamento: "",
    pago: false,
    observacoes: ""
  });

  const load = () => {
    http.get("/despesas").then((r) => setDespesas(r.data)).catch(() => setDespesas([]));
  };

  useEffect(() => { load(); }, []);

  const resetForm = () => {
    setForm({
      descricao: "",
      valor: "",
      tipo: "fixo",
      categoria: "",
      data_vencimento: "",
      data_pagamento: "",
      pago: false,
      observacoes: ""
    });
    setEditingId(null);
  };

  const openDialog = (despesa = null) => {
    if (despesa) {
      setForm(despesa);
      setEditingId(despesa.id);
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
    
    const valorStr = String(form.valor).replace(",", ".");
    const valorNum = parseFloat(valorStr);
    
    if (isNaN(valorNum) || valorNum <= 0) {
      toast.error("Valor deve ser maior que zero");
      return;
    }

    const payload = {
      ...form,
      valor: valorNum
    };

    try {
      if (editingId) {
        await http.put(`/despesas/${editingId}`, payload);
        toast.success("Despesa atualizada");
      } else {
        await http.post("/despesas", payload);
        toast.success("Despesa criada");
      }
      setDialogOpen(false);
      resetForm();
      load();
    } catch (e) {
      toast.error(e.response?.data?.detail || "Erro");
    }
  };

  const deleteDespesa = (id) => {
    setDeletingId(id);
    setDeleteConfirmOpen(true);
  };

  const confirmDelete = async () => {
    if (!deletingId) return;
    try {
      await http.delete(`/despesas/${deletingId}`);
      toast.success("Despesa removida");
      setDeleteConfirmOpen(false);
      setDeletingId(null);
      load();
    } catch (e) {
      toast.error(e.response?.data?.detail || "Erro");
    }
  };

  const filteredDespesas = despesas.filter(d => d.tipo === tab);
  const totalDespesas = filteredDespesas.reduce((sum, d) => sum + (Number(d.valor) || 0), 0);
  const totalPago = filteredDespesas.filter(d => d.pago).reduce((sum, d) => sum + (Number(d.valor) || 0), 0);
  const totalAberto = totalDespesas - totalPago;

  return (
    <div className="p-6 lg:p-8 fade-in">
      <PageHeader overline="Financeiro" title="Despesas" action={
        <Button onClick={() => openDialog()}><Plus className="w-4 h-4 mr-1" /> Nova despesa</Button>
      } />

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <Tabs value={tab} onValueChange={setTab} className="w-full sm:w-auto">
          <TabsList>
            <TabsTrigger value="fixo">Despesas Fixas</TabsTrigger>
            <TabsTrigger value="variavel">Despesas Variáveis</TabsTrigger>
          </TabsList>
        </Tabs>
        <Button 
          variant="outline" 
          onClick={() => setAuditOpen(true)}
          className="flex items-center gap-1.5 text-xs font-semibold text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200 border border-zinc-200 dark:border-zinc-800"
        >
          <History className="w-3.5 h-3.5" />
          <span>Excluídos</span>
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white border border-zinc-200 rounded-xl p-5">
          <div className="text-xs uppercase tracking-wider text-zinc-400">Total</div>
          <div className="font-display text-3xl font-semibold mt-1">{fmtBRL(totalDespesas)}</div>
        </div>
        <div className="bg-white border border-zinc-200 rounded-xl p-5">
          <div className="text-xs uppercase tracking-wider text-zinc-400">Pago</div>
          <div className="font-display text-3xl font-semibold mt-1 text-emerald-600">{fmtBRL(totalPago)}</div>
        </div>
        <div className="bg-white border border-zinc-200 rounded-xl p-5">
          <div className="text-xs uppercase tracking-wider text-zinc-400">Em aberto</div>
          <div className={`font-display text-3xl font-semibold mt-1 ${totalAberto > 0 ? "text-amber-600" : "text-emerald-600"}`}>{fmtBRL(totalAberto)}</div>
        </div>
      </div>

      <div className="bg-white border border-zinc-200 rounded-xl overflow-x-auto">
        {filteredDespesas.length === 0 ? (
          <div className="p-12 text-center text-zinc-400">
            <AlertCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
            Nenhuma despesa {tab === "fixo" ? "fixa" : "variável"}
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-zinc-50 text-xs uppercase tracking-wider text-zinc-500">
              <tr>
                <th className="px-4 py-3 text-left">Descrição</th>
                <th className="px-4 py-3 text-left">Categoria</th>
                <th className="px-4 py-3 text-right">Valor</th>
                <th className="px-4 py-3 text-left">Vencimento</th>
                <th className="px-4 py-3 text-center">Status</th>
                <th className="px-4 py-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {filteredDespesas.map((d) => (
                <tr key={d.id}>
                  <td className="px-4 py-3 font-medium text-zinc-700">{d.descricao}</td>
                  <td className="px-4 py-3 text-zinc-600">{d.categoria || "-"}</td>
                  <td className="px-4 py-3 text-right font-display font-semibold">{fmtBRL(Number(d.valor))}</td>
                  <td className="px-4 py-3 text-zinc-600">{fmtDT(d.data_vencimento)}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${d.pago ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>
                      {d.pago ? "Pago" : "Aberto"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right space-x-2">
                    <Button size="icon" variant="ghost" onClick={() => openDialog(d)}>
                      <Edit2 className="w-4 h-4 text-blue-500" />
                    </Button>
                    <Button size="icon" variant="ghost" onClick={() => deleteDespesa(d.id)}>
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
            <DialogTitle>{editingId ? "Editar despesa" : "Nova despesa"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Descrição</Label>
              <Input
                value={form.descricao}
                onChange={(e) => setForm({ ...form, descricao: e.target.value })}
                placeholder="Ex: Aluguel do salão"
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
                <Label>Tipo</Label>
                <Select value={form.tipo} onValueChange={(v) => setForm({ ...form, tipo: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="fixo">Fixa</SelectItem>
                    <SelectItem value="variavel">Variável</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Categoria</Label>
              <Select value={form.categoria || "Nenhuma"} onValueChange={(v) => setForm({ ...form, categoria: v === "Nenhuma" ? "" : v })}>
                <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Nenhuma">Nenhuma</SelectItem>
                  {CATEGORIAS.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Vencimento</Label>
                <Input
                  type="date"
                  value={form.data_vencimento}
                  onChange={(e) => setForm({ ...form, data_vencimento: e.target.value })}
                />
              </div>
              <div>
                <Label>Pagamento</Label>
                <Input
                  type="date"
                  value={form.data_pagamento}
                  onChange={(e) => setForm({ ...form, data_pagamento: e.target.value })}
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                checked={form.pago}
                onCheckedChange={(checked) => setForm({ ...form, pago: checked })}
              />
              <Label className="cursor-pointer">Marcado como pago</Label>
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
            Tem certeza que deseja excluir esta despesa? Esta ação não pode ser desfeita.
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
        modulo="despesa" 
        tituloModulo="Despesas" 
        onRestoreSuccess={load}
      />
    </div>
  );
}
