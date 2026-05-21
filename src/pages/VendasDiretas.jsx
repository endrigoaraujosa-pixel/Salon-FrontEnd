import React, { useEffect, useState } from "react";
import http from "../api";
import { PageHeader, EmptyState } from "../components/Page";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "../components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "../components/ui/dialog";
import { ShoppingBag, Plus, Trash2, CreditCard, Calendar } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import SearchableSelect from "../components/SearchableSelect";

const fmtBRL = (n) => (n || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const fmtDT = (s) => new Date(s).toLocaleString("pt-BR");

const STATUS_COLORS = {
  pendente: "bg-amber-100 text-amber-700",
  pago: "bg-emerald-100 text-emerald-700",
};

export default function VendasDiretas() {
  const getTodayStr = () => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const [list, setList] = useState([]);
  const [produtos, setProdutos] = useState([]);
  const [colaboradores, setColaboradores] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [selectedAddCategory, setSelectedAddCategory] = useState("all");
  const [productSearch, setProductSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [form, setForm] = useState({ produto_id: "", quantidade: 1, colaborador_id: "", cliente_id: "" });
  const [startDate, setStartDate] = useState(getTodayStr());
  const [endDate, setEndDate] = useState(getTodayStr());
  const [filterProdutoId, setFilterProdutoId] = useState("all");
  const [filterColaboradorId, setFilterColaboradorId] = useState("all");
  const [filterClienteId, setFilterClienteId] = useState("all");
  const nav = useNavigate();

  const load = () => {
    http.get("/vendas-diretas").then((r) => setList(r.data));
  };
  
  useEffect(() => {
    load();
    // Removido o filtro p.ativo (não existe na tabela)
    http.get("/produtos").then((r) => setProdutos(r.data));
    http.get("/colaboradores").then((r) => setColaboradores(r.data));
    http.get("/clientes").then((r) => setClientes(r.data));
    http.get("/categorias").then((r) => setCategorias(r.data || []));
  }, []);

  const produto = produtos.find((p) => p.id === form.produto_id);
  const valorPrev = produto ? produto.preco_venda * form.quantidade : 0;

  const save = async () => {
    if (!form.produto_id || !form.quantidade) {
      toast.error("Produto e quantidade obrigatórios");
      return;
    }
    if (!form.colaborador_id) {
      toast.error("Informe o profissional responsável pela venda.");
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

  const filteredList = list.filter((v) => {
    // 1. Date Filter
    if (!v.data_venda) return false;
    const d = new Date(v.data_venda);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const saleDateStr = `${year}-${month}-${day}`;
    const matchesDate = saleDateStr >= startDate && saleDateStr <= endDate;
    if (!matchesDate) return false;

    // 2. Product Filter
    if (filterProdutoId !== "all" && v.produto_id !== filterProdutoId) {
      return false;
    }

    // 3. Collaborator Filter
    if (filterColaboradorId !== "all" && v.colaborador_id !== filterColaboradorId) {
      return false;
    }

    // 4. Client Filter
    if (filterClienteId !== "all") {
      if (filterClienteId === "none") {
        if (v.cliente_id) return false;
      } else if (v.cliente_id !== filterClienteId) {
        return false;
      }
    }

    return true;
  });

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
              <div className="space-y-3">
                <div>
                  <Label className="text-xs text-zinc-500 mb-1 block">1. Selecionar Categoria</Label>
                  <Select value={selectedAddCategory} onValueChange={(val) => { setSelectedAddCategory(val); setForm({ ...form, produto_id: "" }); }}>
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

                <div>
                  <Label className="text-xs text-zinc-500 mb-1 block">2. Selecionar o Produto *</Label>
                  <SearchableSelect
                    placeholder="Selecione o produto..."
                    searchPlaceholder="Pesquisar produto pelo nome..."
                    triggerTestId="venda-produto"
                    options={produtos
                      .filter(p => p.quantidade_estoque > 0)
                      .filter(p => {
                        const matchesCategory =
                          selectedAddCategory === "all" ||
                          (selectedAddCategory === "none" && !p.categoria_id) ||
                          p.categoria_id === selectedAddCategory;
                        return matchesCategory;
                      })
                      .map((p) => ({
                        value: p.id,
                        label: `${p.nome} — ${fmtBRL(p.preco_venda)} (estq: ${p.quantidade_estoque})`
                      }))
                    }
                    value={form.produto_id}
                    onValueChange={(val) => setForm({ ...form, produto_id: val })}
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <Label>Quantidade *</Label>
                  <Input data-testid="venda-qtd" type="number" min="1" step="0.01" value={form.quantidade} onChange={(e) => setForm({ ...form, quantidade: e.target.value })} />
                </div>
                <div>
                  <Label>Vendedor *</Label>
                  <Select value={form.colaborador_id || ""} onValueChange={(v) => setForm({ ...form, colaborador_id: v })}>
                    <SelectTrigger>
                      <SelectValue placeholder="—" />
                    </SelectTrigger>
                    <SelectContent>
                      {colaboradores.filter(c => c.ativo).map((c) => (
                        <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label>Cliente (opcional)</Label>
                <SearchableSelect
                  placeholder="Selecione um cliente..."
                  searchPlaceholder="Pesquisar cliente pelo nome..."
                  options={clientes.map((c) => ({
                    value: c.id,
                    label: c.telefone ? `${c.nome} — ${c.telefone}` : c.nome
                  }))}
                  value={form.cliente_id || ""}
                  onValueChange={(v) => setForm({ ...form, cliente_id: v })}
                />
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

      {/* Search and Filters Bar */}
      <div className="bg-white border border-zinc-200 rounded-xl p-4 mb-6 shadow-sm space-y-4">
        {/* Row 1: Date Filters */}
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center w-full lg:w-auto">
            <div className="w-full sm:w-auto">
              <Label className="text-xs text-zinc-500 font-medium mb-1 block">Data Inicial</Label>
              <Input
                type="date"
                className="w-full sm:w-44 focus:ring-2 focus:ring-[#84A59D] transition-all bg-transparent text-foreground border-input"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div className="w-full sm:w-auto">
              <Label className="text-xs text-zinc-500 font-medium mb-1 block">Data Final</Label>
              <Input
                type="date"
                className="w-full sm:w-44 focus:ring-2 focus:ring-[#84A59D] transition-all bg-transparent text-foreground border-input"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
          </div>
          <div className="flex gap-2 w-full lg:w-auto justify-end">
            <Button
              variant="outline"
              className="border-zinc-200 text-[#3A4F4A] hover:bg-[#EAF0EE] dark:border-border dark:text-[#EAF0EE] dark:hover:bg-[#3A4F4A]"
              onClick={() => {
                const today = getTodayStr();
                setStartDate(today);
                setEndDate(today);
              }}
            >
              <Calendar className="w-4 h-4 mr-2 text-zinc-400" /> Hoje
            </Button>
            <Button
              variant="outline"
              className="border-zinc-200 text-[#3A4F4A] hover:bg-[#EAF0EE] dark:border-border dark:text-[#EAF0EE] dark:hover:bg-[#3A4F4A]"
              onClick={() => {
                const d = new Date();
                const year = d.getFullYear();
                const month = String(d.getMonth() + 1).padStart(2, '0');
                setStartDate(`${year}-${month}-01`);
                const lastDay = new Date(year, d.getMonth() + 1, 0).getDate();
                setEndDate(`${year}-${month}-${String(lastDay).padStart(2, '0')}`);
              }}
            >
              <Calendar className="w-4 h-4 mr-2 text-zinc-400" /> Este Mês
            </Button>
            {(startDate !== getTodayStr() || endDate !== getTodayStr() || filterProdutoId !== "all" || filterColaboradorId !== "all" || filterClienteId !== "all") && (
              <Button
                variant="ghost"
                className="text-rose-500 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/30"
                onClick={() => {
                  setStartDate(getTodayStr());
                  setEndDate(getTodayStr());
                  setFilterProdutoId("all");
                  setFilterColaboradorId("all");
                  setFilterClienteId("all");
                }}
              >
                Limpar Filtros
              </Button>
            )}
          </div>
        </div>

        {/* Row 2: Product, Seller, and Client Filters */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border-t border-zinc-100 pt-4 dark:border-zinc-800">
          <div>
            <Label className="text-xs text-zinc-500 font-medium mb-1 block">Filtrar por Produto</Label>
            <SearchableSelect
              placeholder="Todos os produtos"
              searchPlaceholder="Pesquisar produto pelo nome..."
              options={[
                { value: "all", label: "Todos os produtos" },
                ...produtos.map((p) => ({
                  value: p.id,
                  label: p.nome
                }))
              ]}
              value={filterProdutoId}
              onValueChange={setFilterProdutoId}
            />
          </div>

          <div>
            <Label className="text-xs text-zinc-500 font-medium mb-1 block">Filtrar por Vendedor</Label>
            <SearchableSelect
              placeholder="Todos os vendedores"
              searchPlaceholder="Pesquisar vendedor pelo nome..."
              options={[
                { value: "all", label: "Todos os vendedores" },
                ...colaboradores.map((c) => ({
                  value: c.id,
                  label: c.nome
                }))
              ]}
              value={filterColaboradorId}
              onValueChange={setFilterColaboradorId}
            />
          </div>

          <div>
            <Label className="text-xs text-zinc-500 font-medium mb-1 block">Filtrar por Cliente</Label>
            <SearchableSelect
              placeholder="Todos os clientes"
              searchPlaceholder="Pesquisar cliente pelo nome..."
              options={[
                { value: "all", label: "Todos os clientes" },
                { value: "none", label: "Sem Cliente (Consumidor Final)" },
                ...clientes.map((c) => ({
                  value: c.id,
                  label: c.nome
                }))
              ]}
              value={filterClienteId}
              onValueChange={setFilterClienteId}
            />
          </div>
        </div>
      </div>

      {filteredList.length === 0 ? (
        <EmptyState icon={ShoppingBag} title="Nenhuma venda encontrada" hint="Não há registros de vendas no período selecionado." />
      ) : (
        <div className="space-y-4">
          {/* Mobile Card List (Visible only on mobile) */}
          <div className="space-y-3 sm:hidden">
            {filteredList.map((v) => (
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
                {filteredList.map((v) => (
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