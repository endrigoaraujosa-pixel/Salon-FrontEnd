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
import { Scissors, Plus, Edit2, Trash2, Clock, Package, X } from "lucide-react";
import { toast } from "sonner";

const blank = { nome: "", duracao_minutos: 60, valor: 0, descricao: "", ativo: true, produtos_vinculados: [] };
const fmtBRL = (n) => (n || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export default function Servicos() {
  const [list, setList] = useState([]);
  const [produtos, setProdutos] = useState([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(blank);

  const load = () => {
    http.get("/servicos").then((r) => setList(r.data));
    http.get("/produtos").then((r) => setProdutos(r.data));
  };

  useEffect(() => { load(); }, []);

  const save = async () => {
    if (!form.nome) return toast.error("Nome é obrigatório");
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

  const del = async (id) => { 
    if (!window.confirm("Excluir?")) return; 
    await http.delete(`/servicos/${id}`); 
    load(); 
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
              <div><Label>Duração (min)</Label><Input type="number" value={form.duracao_minutos} onChange={(e) => setForm({ ...form, duracao_minutos: e.target.value })} /></div>
              <div><Label>Valor (R$)</Label><Input type="number" step="0.01" value={form.valor} onChange={(e) => setForm({ ...form, valor: e.target.value })} /></div>
            </div>
            <div><Label>Descrição</Label><Textarea rows={2} value={form.descricao} onChange={(e) => setForm({ ...form, descricao: e.target.value })} /></div>
            
            <div className="space-y-3 border-t pt-4">
              <Label className="text-base font-semibold">Produtos Utilizados (Baixa Automática)</Label>
              <div className="flex gap-2">
                <Select onValueChange={addProduto}>
                  <SelectTrigger className="flex-1"><SelectValue placeholder="Adicionar produto ao serviço..." /></SelectTrigger>
                  <SelectContent>
                    {produtos.map(p => <SelectItem key={p.id} value={p.id}>{p.nome} (Estoque: {p.quantidade_estoque})</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                {(() => {
                  let pvs = form.produtos_vinculados;
                  if (typeof pvs === "string") {
                    try { pvs = JSON.parse(pvs); } catch { pvs = []; }
                  }
                  if (!Array.isArray(pvs)) pvs = [];

                  return pvs.map((pv) => {
                    const p = produtos.find(x => x.id === pv.produto_id);
                    return (
                      <div key={pv.produto_id} className="flex items-center gap-3 p-2 bg-zinc-50 border rounded-lg">
                        <Package className="w-4 h-4 text-zinc-400" />
                        <div className="flex-1 text-sm font-medium">{p?.nome}</div>
                        <div className="flex items-center gap-2">
                          <Label className="text-xs">Qtde:</Label>
                          <Input type="number" step="0.01" className="w-20 h-8 text-xs" value={pv.quantidade} onChange={(e) => updateProdQtde(pv.produto_id, e.target.value)} />
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
                  <div className="text-center py-4 border-2 border-dashed rounded-lg text-zinc-400 text-sm">Nenhum produto vinculado</div>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2"><Switch checked={form.ativo} onCheckedChange={(v) => setForm({ ...form, ativo: v })} /><Label>Ativo</Label></div>
          </div>
          <DialogFooter><Button onClick={save} className="bg-[#84A59D] hover:bg-[#6F9189] w-full">Salvar Serviço</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {list.length === 0 ? <EmptyState icon={Scissors} title="Nenhum serviço" hint="Cadastre os serviços do seu salão." /> : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {list.map((s) => (
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
    </div>
  );
}
