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

  const del = async (id) => {
    if (!window.confirm("Excluir venda e devolver ao estoque?")) return;
    await http.delete(`/vendas-diretas/${id}`);
    load();
  };

  return (
    <div className="p-6 lg:p-8 fade-in">
      <PageHeader overline="Balcão" title="Vendas Diretas" action={
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button data-testid="add-venda-btn" className="bg-[#84A59D] hover:bg-[#6F9189]">
              <Plus className="w-4 h-4 mr-1" /> Nova venda
            </Button>
          </DialogTrigger>
          <DialogContent>
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
              <div className="grid grid-cols-2 gap-3">
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
            <DialogFooter>
              <Button data-testid="save-venda-btn" onClick={save} className="bg-[#84A59D] hover:bg-[#6F9189]">
                Criar e ir para pagamento
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      } />

      {list.length === 0 ? (
        <EmptyState icon={ShoppingBag} title="Sem vendas" hint="Registre vendas de produtos no balcão." />
      ) : (
        <div className="bg-white border border-zinc-200 rounded-xl overflow-x-auto">
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
      )}
    </div>
  );
}