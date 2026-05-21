import React, { useEffect, useState } from "react";
import http from "../api";
import { PageHeader, EmptyState } from "../components/Page";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Switch } from "../components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "../components/ui/dialog";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "../components/ui/select";
import { Package, Plus, Edit2, Trash2, AlertTriangle, Percent } from "lucide-react";
import { toast } from "sonner";

const blank = { nome: "", categoria: "", categoria_id: "", unidade_medida: "un", quantidade_estoque: 0, estoque_minimo: 5, custo_unitario: 0, preco_venda: 0, fornecedor: "", ativo: true, comissao: 0 };
const fmtBRL = (n) => (n || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export default function Produtos() {
  const [list, setList] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [open, setOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [form, setForm] = useState(blank);
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  const load = () => {
    http.get("/produtos").then((r) => setList(r.data));
    http.get("/categorias").then((r) => setCategorias(r.data));
  };
  useEffect(() => { load(); }, []);

  const save = async () => {
    try {
      if (!form.nome || !form.nome.trim()) {
        toast.error("O nome do produto é obrigatório");
        return;
      }
      if (!form.categoria_id) {
        toast.error("A categoria é obrigatória. Selecione uma categoria cadastrada.");
        return;
      }
      const p = { ...form,
        quantidade_estoque: Number(form.quantidade_estoque),
        estoque_minimo: Number(form.estoque_minimo),
        custo_unitario: Number(form.custo_unitario),
        preco_venda: Number(form.preco_venda),
        comissao: Number(form.comissao || 0),
      };
      if (form.id) await http.put(`/produtos/${form.id}`, p); else await http.post("/produtos", p);
      toast.success("Salvo"); setOpen(false); setForm(blank); load();
    } catch (err) {
      const msg = err.response?.data?.detail || "Erro ao salvar";
      toast.error(msg);
    }
  };
  
  const del = (id) => {
    setDeletingId(id);
    setDeleteConfirmOpen(true);
  };

  const confirmDelete = async () => {
    if (!deletingId) return;
    try {
      await http.delete(`/produtos/${deletingId}`);
      toast.success("Produto removido");
      setDeleteConfirmOpen(false);
      setDeletingId(null);
      load();
    } catch (e) {
      toast.error("Erro ao remover");
    }
  };

  const edit = (p) => { setForm(p); setOpen(true); };

  const filteredList = list.filter((p) => {
    const matchesSearch = p.nome.toLowerCase().includes(searchQuery.toLowerCase()) || 
      (p.fornecedor && p.fornecedor.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesCategory =
      selectedCategoryFilter === "all" ||
      (selectedCategoryFilter === "none" && !p.categoria_id) ||
      p.categoria_id === selectedCategoryFilter;
    return matchesSearch && matchesCategory;
  });

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
              <div>
                <Label>Categoria *</Label>
                <Select
                  value={form.categoria_id || ""}
                  onValueChange={(val) => {
                    const cat = categorias.find(c => c.id === val);
                    setForm({
                      ...form,
                      categoria_id: val,
                      categoria: cat ? cat.nome : ""
                    });
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a categoria *" />
                  </SelectTrigger>
                  <SelectContent>
                    {categorias.filter(c => c.tipo === "produto" || c.tipo === "ambos").map(c => (
                      <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
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

      <div className="mb-6 flex flex-col md:flex-row gap-4 max-w-2xl">
        <div className="flex-1">
          <Label className="text-xs text-zinc-500 mb-1 block">Pesquisar produto</Label>
          <Input
            placeholder="Pesquisar por nome ou fornecedor..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white"
          />
        </div>
        <div className="w-full md:w-64">
          <Label className="text-xs text-zinc-500 mb-1 block">Filtrar por Categoria</Label>
          <Select
            value={selectedCategoryFilter}
            onValueChange={setSelectedCategoryFilter}
          >
            <SelectTrigger className="bg-white">
              <SelectValue placeholder="Todas as categorias" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as categorias</SelectItem>
              <SelectItem value="none">Sem categoria</SelectItem>
              {categorias.filter(c => c.tipo === "produto" || c.tipo === "ambos").map(c => (
                <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {filteredList.length === 0 ? (
        <EmptyState
          icon={Package}
          title={searchQuery || selectedCategoryFilter !== "all" ? "Nenhum produto encontrado" : "Nenhum produto"}
          hint={searchQuery || selectedCategoryFilter !== "all" ? "Tente ajustar seus filtros de busca." : "Adicione produtos para controlar seu estoque."}
        />
      ) : (
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
              {filteredList.map((p) => {
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

      {/* Dialog de confirmação de exclusão */}
      <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Confirmar exclusão</DialogTitle>
          </DialogHeader>
          <div className="py-4 text-sm text-zinc-600 dark:text-zinc-400">
            Tem certeza que deseja excluir este produto? Esta ação não pode ser desfeita e afetará o estoque.
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
