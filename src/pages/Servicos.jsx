import React, { useEffect, useState } from "react";
import http from "../api";
import { PageHeader, EmptyState } from "../components/Page";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Textarea } from "../components/ui/textarea";
import { Switch } from "../components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "../components/ui/dialog";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "../components/ui/select";
import { Scissors, Plus, Edit2, Trash2, Clock, Package, X, History } from "lucide-react";
import { toast } from "sonner";
import AuditModal from "../components/AuditModal";

const blank = { nome: "", categoria_id: "", duracao_minutos: 60, valor: 0, descricao: "", ativo: true, produtos_vinculados: [] };
const fmtBRL = (n) => (n || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export default function Servicos() {
  const [list, setList] = useState([]);
  const [produtos, setProdutos] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [open, setOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [form, setForm] = useState(blank);
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [auditOpen, setAuditOpen] = useState(false);

  const load = () => {
    http.get("/servicos").then((r) => setList(r.data));
    http.get("/produtos").then((r) => setProdutos(r.data));
    http.get("/categorias").then((r) => setCategorias(r.data));
  };

  useEffect(() => { load(); }, []);

  const save = async () => {
    if (!form.nome || !form.nome.trim()) return toast.error("Nome é obrigatório");
    if (!form.categoria_id) return toast.error("A categoria é obrigatória. Selecione uma categoria cadastrada.");
    try {
      let pvs = form.produtos_vinculados;
      if (typeof pvs === "string") {
        try { pvs = JSON.parse(pvs); } catch { pvs = []; }
      }
      if (!Array.isArray(pvs)) pvs = [];

      const p = { 
        ...form, 
        valor: Number(form.valor), 
        duracao_minutos: Number(form.duracao_minutos),
        produtos_vinculados: pvs.map(pv => ({
          produto_id: pv.produto_id,
          quantidade: Number(pv.quantidade)
        }))
      };
      if (form.id) await http.put(`/servicos/${form.id}`, p); 
      else await http.post("/servicos", p);
      toast.success("Salvo"); setOpen(false); setForm(blank); load();
    } catch (e) { 
      toast.error(e.response?.data?.detail || "Erro ao salvar"); 
    }
  };

  const del = (id) => {
    setDeletingId(id);
    setDeleteConfirmOpen(true);
  };

  const confirmDelete = async () => {
    if (!deletingId) return;
    try {
      await http.delete(`/servicos/${deletingId}`);
      toast.success("Serviço removido");
      setDeleteConfirmOpen(false);
      setDeletingId(null);
      load();
    } catch (e) {
      toast.error(e.response?.data?.detail || "Erro ao remover");
    }
  };

  const edit = (s) => { 
    let pvs = s.produtos_vinculados;
    if (typeof pvs === "string") {
      try {
        pvs = JSON.parse(pvs);
      } catch (e) {
        pvs = [];
      }
    }
    setForm({
      ...s,
      produtos_vinculados: pvs || []
    }); 
    setOpen(true); 
  };

  const addProduto = (pid) => {
    let pvs = form.produtos_vinculados;
    if (typeof pvs === "string") {
      try { pvs = JSON.parse(pvs); } catch { pvs = []; }
    }
    if (!Array.isArray(pvs)) pvs = [];

    if (pvs.some(p => p.produto_id === pid)) return toast.error("Produto já adicionado");
    setForm({
      ...form,
      produtos_vinculados: [...pvs, { produto_id: pid, quantidade: 1 }]
    });
  };

  const removeProduto = (pid) => {
    let pvs = form.produtos_vinculados;
    if (typeof pvs === "string") {
      try { pvs = JSON.parse(pvs); } catch { pvs = []; }
    }
    if (!Array.isArray(pvs)) pvs = [];

    setForm({
      ...form,
      produtos_vinculados: pvs.filter(p => p.produto_id !== pid)
    });
  };

  const updateProdQtde = (pid, qtde) => {
    let pvs = form.produtos_vinculados;
    if (typeof pvs === "string") {
      try { pvs = JSON.parse(pvs); } catch { pvs = []; }
    }
    if (!Array.isArray(pvs)) pvs = [];

    setForm({
      ...form,
      produtos_vinculados: pvs.map(p => p.produto_id === pid ? { ...p, quantidade: qtde } : p)
    });
  };

  const filteredList = list.filter((s) => {
    const matchesSearch = s.nome.toLowerCase().includes(searchQuery.toLowerCase()) || 
      (s.descricao && s.descricao.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesCategory =
      selectedCategoryFilter === "all" ||
      (selectedCategoryFilter === "none" && !s.categoria_id) ||
      s.categoria_id === selectedCategoryFilter;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="p-6 lg:p-8 fade-in">
      <PageHeader overline="Catálogo" title="Serviços" action={
        <Button onClick={() => { setForm(blank); setOpen(true); }} className="bg-[#84A59D] hover:bg-[#6F9189]"><Plus className="w-4 h-4 mr-1" /> Novo serviço</Button>
      } />

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>{form.id ? "Editar" : "Novo"} serviço</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2 max-h-[70vh] overflow-y-auto pr-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2"><Label>Nome *</Label><Input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} /></div>
              <div className="col-span-2">
                <Label>Categoria *</Label>
                <Select
                  value={form.categoria_id || ""}
                  onValueChange={(val) => setForm({ ...form, categoria_id: val })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a categoria *" />
                  </SelectTrigger>
                  <SelectContent>
                    {categorias.filter(c => c.tipo === "servico" || c.tipo === "ambos").map(c => (
                      <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Duração (min)</Label><Input type="number" value={form.duracao_minutos} onChange={(e) => setForm({ ...form, duracao_minutos: e.target.value })} /></div>
              <div><Label>Valor (R$)</Label><Input type="number" step="0.01" value={form.valor} onChange={(e) => setForm({ ...form, valor: e.target.value })} /></div>
            </div>
            <div><Label>Descrição</Label><Textarea rows={2} value={form.descricao} onChange={(e) => setForm({ ...form, descricao: e.target.value })} /></div>
            
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label>Produtos Vinculados (Consumo automático no estoque)</Label>
                <div className="w-64">
                  <Select onValueChange={(val) => addProduto(val)}>
                    <SelectTrigger className="h-8"><SelectValue placeholder="Adicionar produto..." /></SelectTrigger>
                    <SelectContent>
                      {produtos.map(p => <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="border border-zinc-200 rounded-lg p-3 space-y-2 bg-zinc-50 max-h-40 overflow-y-auto">
                {(() => {
                  let pvs = form.produtos_vinculados;
                  if (typeof pvs === "string") {
                    try { pvs = JSON.parse(pvs); } catch { pvs = []; }
                  }
                  if (!Array.isArray(pvs)) pvs = [];

                  return pvs.map((pv) => {
                    const prod = produtos.find(x => x.id === pv.produto_id);
                    return (
                      <div key={pv.produto_id} className="flex items-center justify-between bg-white p-2 rounded border shadow-sm">
                        <span className="text-sm font-medium">{prod?.nome || "Carregando..."}</span>
                        <div className="flex items-center gap-2">
                          <Input
                            type="number"
                            min="1"
                            value={pv.quantidade}
                            onChange={(e) => updateProdQtde(pv.produto_id, parseInt(e.target.value) || 1)}
                            className="w-16 h-8 text-center"
                          />
                          <span className="text-xs text-zinc-500">{prod?.unidade || "un"}</span>
                        </div>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-rose-500" onClick={() => removeProduto(pv.produto_id)}><X className="w-4 h-4" /></Button>
                      </div>
                    );
                  });
                })()}
                {(() => {
                  let pvs = form.produtos_vinculados;
                  if (typeof pvs === "string") {
                    try { pvs = JSON.parse(pvs); } catch { pvs = []; }
                  }
                  return !pvs || pvs.length === 0;
                })() && (
                  <div className="text-center py-4 text-zinc-400 text-sm">Nenhum produto vinculado</div>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2"><Switch checked={form.ativo} onCheckedChange={(v) => setForm({ ...form, ativo: v })} /><Label>Ativo</Label></div>
          </div>
          <DialogFooter><Button onClick={save} className="bg-[#84A59D] hover:bg-[#6F9189] w-full">Salvar Serviço</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="mb-6 flex flex-col md:flex-row md:items-end gap-4 max-w-4xl">
        <div className="flex-1">
          <Label className="text-xs text-zinc-500 mb-1 block">Pesquisar serviço</Label>
          <Input
            placeholder="Pesquisar por nome ou descrição..."
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
              {categorias.filter(c => c.tipo === "servico" || c.tipo === "ambos").map(c => (
                <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button 
          variant="outline" 
          onClick={() => setAuditOpen(true)}
          className="flex items-center gap-1.5 text-xs font-semibold text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200 border border-zinc-200 dark:border-zinc-800 h-10 w-full md:w-auto"
        >
          <History className="w-3.5 h-3.5" />
          <span>Excluídos</span>
        </Button>
      </div>

      {filteredList.length === 0 ? (
        <EmptyState
          icon={Scissors}
          title={searchQuery || selectedCategoryFilter !== "all" ? "Nenhum serviço encontrado" : "Nenhum serviço"}
          hint={searchQuery || selectedCategoryFilter !== "all" ? "Tente ajustar seus filtros de busca." : "Cadastre os serviços do seu salão."}
        />
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredList.map((s) => (
            <div key={s.id} className="bg-white border border-zinc-200 rounded-xl p-5 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between">
                <div className="font-display text-lg font-medium">{s.nome}</div>
                <div className="text-xl font-display font-semibold text-[#3A4F4A]">{fmtBRL(s.valor)}</div>
              </div>
              <div className="flex items-center gap-1 mt-1 text-sm text-zinc-500"><Clock className="w-3 h-3" /> {s.duracao_minutos} min</div>
              {(() => {
                let pvs = s.produtos_vinculados;
                if (typeof pvs === "string") {
                  try { pvs = JSON.parse(pvs); } catch { pvs = []; }
                }
                return Array.isArray(pvs) && pvs.length > 0 ? (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {pvs.map((pv, i) => {
                      const p = produtos.find(x => x.id === pv.produto_id);
                      return <span key={i} className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800"><Package className="w-3 h-3 mr-1" /> {p?.nome} ({pv.quantidade})</span>
                    })}
                  </div>
                ) : null;
              })()}
              {s.descricao && <p className="text-sm text-zinc-600 mt-3 line-clamp-2">{s.descricao}</p>}
              <div className="mt-4 pt-3 border-t border-zinc-100 flex gap-2">
                <Button size="sm" variant="outline" onClick={() => edit(s)}><Edit2 className="w-3 h-3 mr-1" /> Editar</Button>
                <Button size="sm" variant="ghost" onClick={() => del(s.id)}><Trash2 className="w-3 h-3 text-rose-500" /></Button>
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
            Tem certeza que deseja excluir este serviço? Esta ação não pode ser desfeita.
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
        modulo="servico" 
        tituloModulo="Serviços" 
        onRestoreSuccess={load}
      />
    </div>
  );
}
