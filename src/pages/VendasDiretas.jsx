import React, { useEffect, useState } from "react";
import http from "../api";
import { PageHeader, EmptyState } from "../components/Page";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "../components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "../components/ui/dialog";
import { ShoppingBag, Plus, Trash2, CreditCard } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

const fmtBRL = (n) => (n || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const fmtDT = (s) => new Date(s).toLocaleString("pt-BR");

const STATUS_COLORS = {
  pendente: "bg-amber-100 text-amber-700",
  pago: "bg-emerald-100 text-emerald-700",
};

export default function VendasDiretas() {
  const [list, setList] = useState([]);
  const [produtos, setProdutos] = useState([]);
  const [colaboradores, setColaboradores] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [open, setOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [form, setForm] = useState({ produto_id: "", quantidade: 1, colaborador_id: "", cliente_id: "" });
  const nav = useNavigate();

  const load = () => http.get("/vendas-diretas").then((r) => setList(r.data));
  
  useEffect(() => {
    load();
    // Removido o filtro p.ativo (não existe na tabela)
    http.get("/produtos").then((r) => setProdutos(r.data.filter((p) => p.quantidade_estoque > 0)));
    http.get("/colaboradores").then((r) => setColaboradores(r.data.filter((c) => c.ativo)));
    http.get("/clientes").then((r) => setClientes(r.data));
  }, []);

  const produto = produtos.find((p) => p.id === form.produto_id);
  const valorPrev = produto ? produto.preco_venda * form.quantidade : 0;

  const save = async () => {
    if (!form.produto_id || !form.quantidade) {
      toast.error("Produto e quantidade obrigatórios");
      return;
    }
    try {
      const payload = { 
        produto_id: form.produto_id, 
        quantidade: Number(form.quantidade) 
      };
      if (form.colaborador_id) payload.colaborador_id = form.colaborador_id;
      if (form.cliente_id) payload.cliente_id = form.cliente_id;
      
      console.log("Enviando payload:", payload);
      const { data } = await http.post("/vendas-diretas", payload);
      console.log("Resposta:", data);
      
      toast.success("Venda criada! Registre o pagamento.");
      // Fechar o dialog
      setOpen(false);
      // Resetar o formulário
      setForm({ produto_id: "", quantidade: 1, colaborador_id: "", cliente_id: "" });
      // Recarregar a lista
      load();
      // Navegar para a página de pagamento
      nav(`/vendas-diretas/${data.id}/pagamento`);
    } catch (e) { 
      console.error("Erro:", e);
      toast.error(e.response?.data?.detail || "Erro ao criar venda"); 
    }
  };

  const del = (id) => {
    setDeletingId(id);
    setDeleteConfirmOpen(true);
  };

  const confirmDelete = async () => {
    if (!deletingId) return;
    try {
      await http.delete(`/vendas-diretas/${deletingId}`);
      toast.success("Venda excluída e produto retornado ao estoque");
      setDeleteConfirmOpen(false);
      setDeletingId(null);
      load();
    } catch (e) {
      toast.error("Erro ao excluir venda");
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 fade-in w-full overflow-x-hidden">
      <PageHeader overline="Balcão" title="Vendas Diretas" action={
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button data-testid="add-venda-btn" className="bg-[#84A59D] hover:bg-[#6F9189] w-full sm:w-auto">
              <Plus className="w-4 h-4 mr-1" /> Nova venda
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader><DialogTitle>Nova venda direta</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div>
                <Label>Produto *</Label>
                <Select value={form.produto_id || ""} onValueChange={(v) => setForm({ ...form, produto_id: v })}>
                  <SelectTrigger data-testid="venda-produto">
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {produtos.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.nome} — {fmtBRL(p.preco_venda)} (estq: {p.quantidade_estoque})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <Label>Quantidade *</Label>
                  <Input data-testid="venda-qtd" type="number" min="1" step="0.01" value={form.quantidade} onChange={(e) => setForm({ ...form, quantidade: e.target.value })} />
                </div>
                <div>
                  <Label>Vendedor</Label>
                  <Select value={form.colaborador_id || ""} onValueChange={(v) => setForm({ ...form, colaborador_id: v })}>
                    <SelectTrigger>
                      <SelectValue placeholder="—" />
                    </SelectTrigger>
                    <SelectContent>
                      {colaboradores.map((c) => (
                        <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label>Cliente (opcional)</Label>
                <Select value={form.cliente_id || ""} onValueChange={(v) => setForm({ ...form, cliente_id: v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="—" />
                  </SelectTrigger>
                  <SelectContent>
                    {clientes.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {produto && (
                <div className="bg-[#EAF0EE] rounded-lg p-3 flex items-center justify-between">
                  <span className="text-sm text-zinc-600">Total da venda</span>
                  <span className="font-display text-lg font-semibold text-[#3A4F4A]">{fmtBRL(valorPrev)}</span>
                </div>
              )}
            </div>
            <DialogFooter className="flex flex-col sm:flex-row gap-2 mt-4">
              <Button data-testid="save-venda-btn" onClick={save} className="bg-[#84A59D] hover:bg-[#6F9189] w-full">
                Criar e ir para pagamento
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      } />

      {list.length === 0 ? (
        <EmptyState icon={ShoppingBag} title="Sem vendas" hint="Registre vendas de produtos no balcão." />
      ) : (
        <div className="space-y-4">
          {/* Mobile Card List (Visible only on mobile) */}
          <div className="space-y-3 sm:hidden">
            {list.map((v) => (
              <div key={v.id} className="bg-white border border-zinc-200 rounded-xl p-4 shadow-sm hover:shadow transition-shadow">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-zinc-400 font-medium">{fmtDT(v.data_venda)}</span>
                  <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ${STATUS_COLORS[v.status]}`}>
                    {v.status === "pago" ? "Pago" : "Pendente"}
                  </span>
                </div>
                <h4 className="font-display font-bold text-zinc-800 text-sm leading-snug">{v.produto_nome}</h4>
                <div className="text-xs text-zinc-500 mt-2 space-y-1">
                  <div>Qtd: <strong>{v.quantidade}</strong></div>
                  <div>Vendedor: <strong>{v.colaborador_nome || "—"}</strong></div>
                  <div>Cliente: <strong>{v.cliente_nome || "—"}</strong></div>
                </div>
                <div className="flex items-center justify-between border-t border-zinc-100 pt-3 mt-3">
                  <div>
                    <span className="text-[10px] text-zinc-400 uppercase tracking-wider block">Total</span>
                    <span className="font-display font-bold text-[#3A4F4A] text-base">{fmtBRL(v.valor_total)}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {v.status !== "pago" && (
                      <Button size="sm" variant="outline" className="h-9 px-3 border-zinc-200 text-[#3A4F4A] hover:bg-[#EAF0EE]" onClick={() => nav(`/vendas-diretas/${v.id}/pagamento`)} data-testid={`pay-venda-mob-${v.id}`}>
                        <CreditCard className="w-4 h-4 mr-1.5" /> Pagar
                      </Button>
                    )}
                    <Button size="sm" variant="ghost" className="h-9 w-9 text-rose-500 hover:bg-rose-50" onClick={() => del(v.id)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Desktop Table View (Visible on larger screens) */}
          <div className="hidden sm:block bg-white border border-zinc-200 rounded-xl overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-zinc-50 text-xs uppercase tracking-wider text-zinc-500">
                <tr>
                  <th className="px-4 py-3 text-left">Data</th>
                  <th className="px-4 py-3 text-left">Produto</th>
                  <th className="px-4 py-3 text-left">Qtd</th>
                  <th className="px-4 py-3 text-left">Vendedor</th>
                  <th className="px-4 py-3 text-left">Cliente</th>
                  <th className="px-4 py-3 text-right">Total</th>
                  <th className="px-4 py-3">Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {list.map((v) => (
                  <tr key={v.id} className="hover:bg-zinc-50/60">
                    <td className="px-4 py-3">{fmtDT(v.data_venda)}</td>
                    <td className="px-4 py-3 font-medium">{v.produto_nome}</td>
                    <td className="px-4 py-3">{v.quantidade}</td>
                    <td className="px-4 py-3">{v.colaborador_nome || "—"}</td>
                    <td className="px-4 py-3">{v.cliente_nome || "—"}</td>
                    <td className="px-4 py-3 text-right font-medium">{fmtBRL(v.valor_total)}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[v.status]}`}>
                        {v.status === "pago" ? "Pago" : "Pendente"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right space-x-1">
                      {v.status !== "pago" && (
                        <Button size="sm" variant="ghost" onClick={() => nav(`/vendas-diretas/${v.id}/pagamento`)} data-testid={`pay-venda-${v.id}`}>
                          <CreditCard className="w-4 h-4" />
                        </Button>
                      )}
                      <Button size="sm" variant="ghost" onClick={() => del(v.id)}>
                        <Trash2 className="w-4 h-4 text-rose-500" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Dialog de confirmação de exclusão */}
      <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Confirmar exclusão de venda</DialogTitle>
          </DialogHeader>
          <div className="py-4 text-sm text-zinc-600 dark:text-zinc-400">
            Tem certeza que deseja excluir esta venda direta? O produto será retornado ao estoque e os pagamentos vinculados serão estornados. Esta ação não pode ser desfeita.
          </div>
          <DialogFooter className="gap-2 flex flex-col sm:flex-row">
            <Button variant="outline" className="w-full sm:w-auto" onClick={() => setDeleteConfirmOpen(false)}>Cancelar</Button>
            <Button onClick={confirmDelete} className="bg-rose-500 hover:bg-rose-600 text-white w-full sm:w-auto">Confirmar Exclusão</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}