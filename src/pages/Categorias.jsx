import React, { useEffect, useState } from "react";
import http from "../api";
import { PageHeader, EmptyState } from "../components/Page";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Switch } from "../components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "../components/ui/dialog";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "../components/ui/select";
import { Tags, Plus, Edit2, Trash2, Check, X } from "lucide-react";
import { toast } from "sonner";

const blank = { nome: "", tipo: "ambos", ativo: true };

export default function Categorias() {
  const [list, setList] = useState([]);
  const [open, setOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [form, setForm] = useState(blank);
  const [search, setSearch] = useState("");

  const load = () => {
    http.get("/categorias").then((r) => setList(r.data));
  };

  useEffect(() => {
    load();
  }, []);

  const save = async () => {
    if (!form.nome) return toast.error("Nome é obrigatório");
    try {
      if (form.id) {
        await http.put(`/categorias/${form.id}`, form);
      } else {
        await http.post("/categorias", form);
      }
      toast.success("Categoria salva com sucesso!");
      setOpen(false);
      setForm(blank);
      load();
    } catch (e) {
      toast.error("Erro ao salvar categoria");
    }
  };

  const del = (id) => {
    setDeletingId(id);
    setDeleteConfirmOpen(true);
  };

  const confirmDelete = async () => {
    if (!deletingId) return;
    try {
      await http.delete(`/categorias/${deletingId}`);
      toast.success("Categoria removida");
      setDeleteConfirmOpen(false);
      setDeletingId(null);
      load();
    } catch (e) {
      toast.error("Erro ao remover categoria");
    }
  };

  const edit = (cat) => {
    setForm(cat);
    setOpen(true);
  };

  const filteredList = list.filter((cat) =>
    cat.nome.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-6 lg:p-8 fade-in">
      <PageHeader
        overline="Catálogo"
        title="Categorias"
        action={
          <Button
            onClick={() => {
              setForm(blank);
              setOpen(true);
            }}
            className="bg-[#84A59D] hover:bg-[#6F9189]"
          >
            <Plus className="w-4 h-4 mr-1" /> Nova categoria
          </Button>
        }
      />

      <div className="mb-6 flex gap-4 max-w-md">
        <div className="relative flex-1">
          <Input
            placeholder="Pesquisar categoria por nome..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full"
          />
        </div>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{form.id ? "Editar" : "Nova"} categoria</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>Nome *</Label>
              <Input
                value={form.nome}
                onChange={(e) => setForm({ ...form, nome: e.target.value })}
                placeholder="Ex: Cabelo, Manicure, Produtos Home Care"
              />
            </div>
            <div>
              <Label>Tipo de Categoria *</Label>
              <Select
                value={form.tipo}
                onValueChange={(val) => setForm({ ...form, tipo: val })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="produto">Produtos</SelectItem>
                  <SelectItem value="servico">Serviços</SelectItem>
                  <SelectItem value="ambos">Ambos (Produtos & Serviços)</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-[11px] text-zinc-500 mt-1">
                Define se esta categoria estará disponível para produtos, serviços ou ambos.
              </p>
            </div>
            <div className="flex items-center gap-2 pt-2">
              <Switch
                checked={form.ativo}
                onCheckedChange={(v) => setForm({ ...form, ativo: v })}
              />
              <Label>Ativa</Label>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={save} className="bg-[#84A59D] hover:bg-[#6F9189] w-full">
              Salvar Categoria
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {filteredList.length === 0 ? (
        <EmptyState
          icon={Tags}
          title="Nenhuma categoria encontrada"
          hint={search ? "Tente outro termo de pesquisa." : "Cadastre categorias para organizar seus produtos e serviços."}
        />
      ) : (
        <div className="bg-white border border-zinc-200 rounded-xl overflow-x-auto shadow-sm">
          <table className="w-full text-sm">
            <thead className="bg-zinc-50 text-xs uppercase tracking-wider text-zinc-500">
              <tr>
                <th className="px-6 py-3 text-left font-semibold">Nome</th>
                <th className="px-6 py-3 text-left font-semibold">Tipo</th>
                <th className="px-6 py-3 text-center font-semibold">Status</th>
                <th className="px-6 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {filteredList.map((cat) => (
                <tr key={cat.id} className="hover:bg-zinc-50/60 transition-colors">
                  <td className="px-6 py-3 font-medium text-zinc-900">{cat.nome}</td>
                  <td className="px-6 py-3">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-zinc-100 text-zinc-800 capitalize">
                      {cat.tipo === "ambos"
                        ? "Ambos"
                        : cat.tipo === "produto"
                        ? "Produtos"
                        : "Serviços"}
                    </span>
                  </td>
                  <td className="px-6 py-3 text-center">
                    {cat.ativo ? (
                      <span className="inline-flex items-center gap-1 text-emerald-600 font-medium">
                        <Check className="w-4 h-4" /> Ativa
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-rose-500 font-medium">
                        <X className="w-4 h-4" /> Inativa
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-3 text-right">
                    <div className="flex justify-end gap-1">
                      <Button size="sm" variant="ghost" onClick={() => edit(cat)}>
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => del(cat.id)}>
                        <Trash2 className="w-4 h-4 text-rose-500" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Confirmar exclusão</DialogTitle>
          </DialogHeader>
          <div className="py-4 text-sm text-zinc-600 dark:text-zinc-400">
            Tem certeza que deseja excluir esta categoria? Esta ação não pode ser desfeita. Os produtos e serviços vinculados a ela permanecerão no sistema, mas sem uma categoria vinculada.
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDeleteConfirmOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={confirmDelete} className="bg-rose-500 hover:bg-rose-600 text-white">
              Excluir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
