import React, { useEffect, useState } from "react";
import http from "../api";
import { PageHeader, EmptyState } from "../components/Page";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Switch } from "../components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "../components/ui/dialog";
import { Package, Plus, Edit2, Trash2, AlertTriangle, Percent } from "lucide-react";
import { toast } from "sonner";

const blank = { nome: "", categoria: "", unidade_medida: "un", quantidade_estoque: 0, estoque_minimo: 5, custo_unitario: 0, preco_venda: 0, fornecedor: "", ativo: true, comissao: 0 };
const fmtBRL = (n) => (n || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export default function Produtos() {
  const [list, setList] = useState([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(blank);
  const load = () => http.get("/produtos").then((r) => setList(r.data));
  useEffect(() => { load(); }, []);

  const save = async () => {
    try {
      const p = { ...form,
        quantidade_estoque: Number(form.quantidade_estoque),
        estoque_minimo: Number(form.estoque_minimo),
        custo_unitario: Number(form.custo_unitario),
        preco_venda: Number(form.preco_venda),
        comissao: Number(form.comissao || 0),
      };
      if (form.id) await http.put(`/produtos/${form.id}`, p); else await http.post("/produtos", p);
      toast.success("Salvo"); setOpen(false); setForm(blank); load();
    } catch { toast.error("Erro"); }
  };
  const del = async (id) => { if (!window.confirm("Excluir?")) return; await http.delete(`/produtos/${id}`); load(); };
  const edit = (p) => { setForm(p); setOpen(true); };

  return (
    <div className="p-6 lg:p-8 fade-in">
      <PageHeader overline="Estoque" title="Produtos" action={
        <Button onClick={() => { setForm(blank); setOpen(true); }} className="bg-[#84A59D] hover:bg-[#6F9189]"><Plus className="w-4 h-4 mr-1" /> Novo produto</Button>
      } />

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{form.id ? "Editar" : "Novo"} produto</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2 max-h-[70vh] overflow-y-auto pr-2">
            <div><Label>Nome *</Label><Input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Categoria</Label><Input value={form.categoria} onChange={(e) => setForm({ ...form, categoria: e.target.value })} /></div>
              <div><Label>Unidade</Label><Input value={form.unidade_medida} onChange={(e) => setForm({ ...form, unidade_medida: e.target.value })} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Estoque Atual</Label><Input type="number" value={form.quantidade_estoque} onChange={(e) => setForm({ ...form, quantidade_estoque: e.target.value })} /></div>
              <div><Label>Estoque Mínimo</Label><Input type="number" value={form.estoque_minimo} onChange={(e) => setForm({ ...form, estoque_minimo: e.target.value })} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Custo (R$)</Label><Input type="number" step="0.01" value={form.custo_unitario} onChange={(e) => setForm({ ...form, custo_unitario: e.target.value })} /></div>
              <div><Label>Preço de Venda (R$)</Label><Input type="number" step="0.01" value={form.preco_venda} onChange={(e) => setForm({ ...form, preco_venda: e.target.value })} /></div>
            </div>
            
            <div className="p-3 bg-blue-50 border border-blue-100 rounded-lg">
              <Label className="text-blue-800 flex items-center gap-1 mb-1"><Percent className="w-3 h-3" /> Comissão por Venda</Label>
              <div className="flex items-center gap-2">
                <Input type="number" step="0.1" value={form.comissao} onChange={(e) => setForm({ ...form, comissao: e.target.value })} className="bg-white" />
                <span className="text-sm text-blue-600 font-medium">%</span>
              </div>
              <p className="text-[10px] text-blue-500 mt-1">Percentual que o colaborador ganhará ao vender este produto.</p>
            </div>

            <div><Label>Fornecedor</Label><Input value={form.fornecedor} onChange={(e) => setForm({ ...form, fornecedor: e.target.value })} /></div>
            <div className="flex items-center gap-2 pt-2"><Switch checked={form.ativo} onCheckedChange={(v) => setForm({ ...form, ativo: v })} /><Label>Ativo</Label></div>
          </div>
          <DialogFooter><Button onClick={save} className="bg-[#84A59D] hover:bg-[#6F9189] w-full">Salvar Produto</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {list.length === 0 ? <EmptyState icon={Package} title="Nenhum produto" hint="Adicione produtos para controlar seu estoque." /> : (
        <div className="bg-white border border-zinc-200 rounded-xl overflow-x-auto shadow-sm">
          <table className="w-full text-sm">
            <thead className="bg-zinc-50 text-xs uppercase tracking-wider text-zinc-500">
              <tr>
                <th className="px-4 py-3 text-left font-semibold">Produto</th>
                <th className="px-4 py-3 text-left font-semibold">Categoria</th>
                <th className="px-4 py-3 text-right font-semibold">Estoque</th>
                <th className="px-4 py-3 text-right font-semibold">Preço</th>
                <th className="px-4 py-3 text-center font-semibold">Comissão</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {list.map((p) => {
                const baixo = p.quantidade_estoque <= p.estoque_minimo;
                return (
                  <tr key={p.id} className="hover:bg-zinc-50/60 transition-colors">
                    <td className="px-4 py-3 font-medium">{p.nome}</td>
                    <td className="px-4 py-3 text-zinc-600">{p.categoria || "-"}</td>
                    <td className="px-4 py-3 text-right">
                      <span className={`inline-flex items-center gap-1 ${baixo ? "text-amber-700 font-bold" : "text-zinc-700"}`}>
                        {baixo && <AlertTriangle className="w-3 h-3" />}
                        {p.quantidade_estoque} {p.unidade_medida}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-medium">{fmtBRL(p.preco_venda)}</td>
                    <td className="px-4 py-3 text-center">
                      {p.comissao > 0 ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                          {p.comissao}%
                        </span>
                      ) : (
                        <span className="text-zinc-400">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-1">
                        <Button size="sm" variant="ghost" onClick={() => edit(p)}><Edit2 className="w-4 h-4" /></Button>
                        <Button size="sm" variant="ghost" onClick={() => del(p.id)}><Trash2 className="w-4 h-4 text-rose-500" /></Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
