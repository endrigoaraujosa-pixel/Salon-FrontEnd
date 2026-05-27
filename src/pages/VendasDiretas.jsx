import React, { useEffect, useState } from "react";
import http from "../api";
import { PageHeader, EmptyState } from "../components/Page";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "../components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "../components/ui/dialog";
import VendaReceiptModal from "../components/VendaReceiptModal";
import AuditModal from "../components/AuditModal";
import { ShoppingBag, ShoppingCart, Plus, Minus, Trash2, CreditCard, Calendar, Lock, Search, History } from "lucide-react";
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
  const [carrinhoOpen, setCarrinhoOpen] = useState(false);
  const [receiptOpen, setReceiptOpen] = useState(false);
  const [auditOpen, setAuditOpen] = useState(false);
  const [receiptVendaId, setReceiptVendaId] = useState(null);

  const openReceipt = (id) => {
    setReceiptVendaId(id);
    setReceiptOpen(true);
  };
  const [carrinhoVendaId, setCarrinhoVendaId] = useState(null);
  const [carrinhoData, setCarrinhoData] = useState(null);
  const [carrinhoLoading, setCarrinhoLoading] = useState(false);
  const [carrinhoSaving, setCarrinhoSaving] = useState(false);
  const [confirmRemoveIdx, setConfirmRemoveIdx] = useState(null);
  const [editingQtdIdx, setEditingQtdIdx] = useState(null);
  const [editingQtdVal, setEditingQtdVal] = useState("");
  const [form, setForm] = useState({ produto_id: "", quantidade: 1, colaborador_id: "", cliente_id: "" });
  const [startDate, setStartDate] = useState(getTodayStr());
  const [endDate, setEndDate] = useState(getTodayStr());
  const [filterProdutoId, setFilterProdutoId] = useState("all");
  const [filterColaboradorId, setFilterColaboradorId] = useState("all");
  const [filterClienteId, setFilterClienteId] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [novaVendaItens, setNovaVendaItens] = useState([]);
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
    http.get("/categorias").then((r) => {
      const all = r.data || [];
      // Filtramos ativos no frontend para evitar problemas de parsing boolean (true/'true'/1) no backend SQLite
      setCategorias(all.filter(c => c.ativo !== false && c.ativo !== 0 && c.ativo !== '0'));
    });
  }, []);

  useEffect(() => {
    if (!open) {
      setNovaVendaItens([]);
      setSelectedAddCategory("all");
      setForm({ produto_id: "", quantidade: 1, colaborador_id: "", cliente_id: "" });
    }
  }, [open]);

  const produto = produtos.find((p) => p.id === form.produto_id);
  const valorPrev = produto ? produto.preco_venda * form.quantidade : 0;

  const save = async () => {
    if (novaVendaItens.length === 0) {
      toast.error("Adicione pelo menos um produto ao carrinho.");
      return;
    }
    if (!form.colaborador_id) {
      toast.error("Informe o profissional responsável pela venda.");
      return;
    }
    try {
      const payload = {
        colaborador_id: form.colaborador_id,
        itens: novaVendaItens.map(item => ({
          produto_id: item.produto_id,
          quantidade: Number(item.quantidade)
        }))
      };
      if (form.cliente_id) payload.cliente_id = form.cliente_id;

      console.log("Enviando payload nova venda:", payload);
      const { data } = await http.post("/vendas-diretas", payload);
      console.log("Resposta:", data);

      toast.success("Venda criada! Registre o pagamento.");
      setOpen(false);
      load();
      nav(`/vendas-diretas/${data.id}/pagamento`);
    } catch (e) {
      console.error("Erro:", e);
      toast.error(e.response?.data?.detail || "Erro ao criar venda");
    }
  };

  const handleAddNovaVendaItem = () => {
    if (!form.produto_id) {
      toast.error("Selecione um produto.");
      return;
    }
    const prod = produtos.find(p => p.id === form.produto_id);
    if (!prod) {
      toast.error("Produto não encontrado.");
      return;
    }
    const qtd = Number(form.quantidade);
    if (isNaN(qtd) || qtd <= 0) {
      toast.error("Quantidade inválida.");
      return;
    }

    const itemExistenteIdx = novaVendaItens.findIndex(item => item.produto_id === prod.id);
    if (itemExistenteIdx !== -1) {
      const novaQtd = novaVendaItens[itemExistenteIdx].quantidade + qtd;
      if (novaQtd > prod.quantidade_estoque) {
        toast.error(`Estoque insuficiente. Disponível: ${Number(Number(prod.quantidade_estoque || 0).toFixed(3))}`);
        return;
      }
      const copia = [...novaVendaItens];
      copia[itemExistenteIdx].quantidade = novaQtd;
      setNovaVendaItens(copia);
    } else {
      if (qtd > prod.quantidade_estoque) {
        toast.error(`Estoque insuficiente. Disponível: ${Number(Number(prod.quantidade_estoque || 0).toFixed(3))}`);
        return;
      }
      setNovaVendaItens([
        ...novaVendaItens,
        {
          produto_id: prod.id,
          produto_nome: prod.nome,
          preco_unitario: prod.preco_venda,
          quantidade: qtd
        }
      ]);
    }
    setForm({ ...form, produto_id: "" });
    toast.success(`"${prod.nome}" adicionado!`);
  };

  const handleIncrementNovaVendaQtd = (idx, delta) => {
    const item = novaVendaItens[idx];
    const prod = produtos.find(p => p.id === item.produto_id);
    const novaQtd = item.quantidade + delta;
    if (novaQtd <= 0) {
      setNovaVendaItens(novaVendaItens.filter((_, i) => i !== idx));
      return;
    }
    if (prod && novaQtd > prod.quantidade_estoque) {
      toast.error(`Estoque insuficiente. Disponível: ${Number(Number(prod.quantidade_estoque || 0).toFixed(3))}`);
      return;
    }
    const copia = [...novaVendaItens];
    copia[idx].quantidade = novaQtd;
    setNovaVendaItens(copia);
  };

  const handleRemoveNovaVendaItem = (idx) => {
    setNovaVendaItens(novaVendaItens.filter((_, i) => i !== idx));
  };

  const del = (id) => {
    const sale = list.find((v) => v.id === id);
    const temPagamentos = sale && ((Number(sale.valor_pago) > 0) || sale.status === "pago");
    if (temPagamentos) {
      toast.error("Não é permitido excluir uma venda que possui pagamentos registrados.");
      return;
    }
    setDeletingId(id);
    setDeleteConfirmOpen(true);
  };

  const confirmDelete = async () => {
    if (!deletingId) return;
    try {
      await http.delete(`/vendas-diretas/${deletingId}`);
      toast.success("Venda excluída com sucesso.");
      setDeleteConfirmOpen(false);
      setDeletingId(null);
      load();
    } catch (e) {
      toast.error(e.response?.data?.detail || "Erro ao excluir venda");
    }
  };

  const loadCarrinho = async (vendaId) => {
    setCarrinhoLoading(true);
    try {
      const r = await http.get(`/vendas-diretas/${vendaId}/carrinho`);
      setCarrinhoData(r.data);
    } catch (e) {
      toast.error("Erro ao carregar carrinho.");
    } finally {
      setCarrinhoLoading(false);
    }
  };

  const openCarrinhoModal = (vendaId) => {
    setCarrinhoVendaId(vendaId);
    setCarrinhoOpen(true);
    loadCarrinho(vendaId);
  };

  const handleUpdateCartCliente = async (clienteId) => {
    setCarrinhoSaving(true);
    try {
      const finalClienteId = clienteId === "none" ? null : clienteId;
      await http.put(`/vendas-diretas/${carrinhoVendaId}/cliente`, {
        cliente_id: finalClienteId
      });
      toast.success("Cliente da venda atualizado com sucesso!");
      await loadCarrinho(carrinhoVendaId);
      load();
    } catch (e) {
      toast.error(e.response?.data?.detail || "Erro ao atualizar cliente da venda.");
    } finally {
      setCarrinhoSaving(false);
    }
  };

  const handleIncrementQtd = async (idx, delta) => {
    const item = carrinhoData.itens[idx];
    const novaQtd = Number(item.quantidade) + delta;
    if (novaQtd <= 0) {
      setConfirmRemoveIdx(idx);
      return;
    }
    setCarrinhoSaving(true);
    try {
      await http.put(`/vendas-diretas/${carrinhoVendaId}/carrinho/itens/${idx}`, { quantidade: novaQtd });
      await loadCarrinho(carrinhoVendaId);
      load();
    } catch (e) {
      toast.error(e.response?.data?.detail || "Erro ao atualizar quantidade.");
    } finally {
      setCarrinhoSaving(false);
    }
  };

  const handleSaveQtd = async (idx) => {
    const val = Number(editingQtdVal);
    if (isNaN(val) || val <= 0) {
      toast.error("Quantidade inválida.");
      return;
    }
    setCarrinhoSaving(true);
    try {
      await http.put(`/vendas-diretas/${carrinhoVendaId}/carrinho/itens/${idx}`, { quantidade: val });
      await loadCarrinho(carrinhoVendaId);
      load();
    } catch (e) {
      toast.error(e.response?.data?.detail || "Erro ao atualizar quantidade.");
    } finally {
      setCarrinhoSaving(false);
      setEditingQtdIdx(null);
    }
  };

  const handleRemoveCartItem = async (idx) => {
    setCarrinhoSaving(true);
    try {
      await http.delete(`/vendas-diretas/${carrinhoVendaId}/carrinho/itens/${idx}`);
      await loadCarrinho(carrinhoVendaId);
      load();
    } catch (e) {
      toast.error(e.response?.data?.detail || "Erro ao remover produto.");
    } finally {
      setCarrinhoSaving(false);
      setConfirmRemoveIdx(null);
    }
  };

  const filteredList = list.filter((v) => {
    // 0. Search Query Filter (name, number, client, collaborator)
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const numStr = v.numero_venda ? String(v.numero_venda).padStart(6, '0') : '';
      const formattedNum = v.numero_venda ? `${numStr} | V`.toLowerCase() : '';
      const matches =
        (v.produto_nome && v.produto_nome.toLowerCase().includes(query)) ||
        (v.cliente_nome && v.cliente_nome.toLowerCase().includes(query)) ||
        (v.colaborador_nome && v.colaborador_nome.toLowerCase().includes(query)) ||
        numStr.includes(query) ||
        formattedNum.includes(query);
      if (!matches) return false;
    }
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
          <DialogContent className="w-[95vw] max-w-[95vw] sm:max-w-5xl w-full p-0 gap-0 flex flex-col overflow-hidden bg-white dark:bg-zinc-900 shadow-2xl rounded-2xl border-0" style={{ maxHeight: '85vh' }}>
            {/* fixed header */}
            <div className="px-6 sm:px-8 pt-6 pb-5 border-b border-zinc-100 dark:border-zinc-800 shrink-0 bg-zinc-50/80 dark:bg-zinc-900/80 backdrop-blur-md">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-3 text-lg font-bold text-zinc-800 dark:text-zinc-100">
                  <div className="p-2 bg-[#EAF0EE] dark:bg-emerald-900/30 text-[#3A4F4A] dark:text-emerald-400 rounded-xl shadow-sm">
                    <Plus className="w-6 h-6" />
                  </div>
                  <div>
                    <span className="block font-display text-xl font-extrabold text-zinc-950 dark:text-zinc-50">Nova Venda Direta</span>
                    <span className="text-xs text-zinc-500 dark:text-zinc-400 font-medium mt-0.5">Preencha os dados e adicione os itens ao carrinho</span>
                  </div>
                </DialogTitle>
              </DialogHeader>
            </div>

            {/* Scrollable body */}
            <div className="flex-1 overflow-y-auto px-6 sm:px-8 py-6 space-y-6 bg-zinc-50/30 dark:bg-zinc-950/50">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 bg-white dark:bg-zinc-900 p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
                {/* 1. Category */}
                <div className="space-y-2">
                  <Label className="text-sm text-zinc-600 dark:text-zinc-300 font-bold block tracking-wide">1. Categoria do Produto</Label>
                  <SearchableSelect
                    placeholder="Todas as categorias"
                    searchPlaceholder="Pesquisar categoria..."
                    options={[
                      { value: "all", label: "Todas as categorias" },
                      { value: "none", label: "Sem categoria" },
                      ...categorias
                        .filter(c => c.tipo && (c.tipo.toLowerCase() === "produto" || c.tipo.toLowerCase() === "ambos"))
                        .map(c => ({
                          value: c.id,
                          label: c.nome
                        }))
                    ]}
                    value={selectedAddCategory}
                    onValueChange={(val) => { setSelectedAddCategory(val); setForm({ ...form, produto_id: "" }); }}
                  />
                </div>

                {/* 2. Product */}
                <div className="space-y-2">
                  <Label className="text-sm text-zinc-600 dark:text-zinc-300 font-bold block tracking-wide">2. Selecionar Produto</Label>
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
                        label: `${p.nome} — ${fmtBRL(p.preco_venda)} (Estoque: ${Number(Number(p.quantidade_estoque || 0).toFixed(3))})`
                      }))
                    }
                    value={form.produto_id}
                    onValueChange={(val) => setForm({ ...form, produto_id: val })}
                  />
                </div>
              </div>

              {/* Qtd and Add button */}
              <div className="flex flex-col sm:flex-row items-end gap-4 bg-white dark:bg-zinc-900 p-5 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-sm">
                <div className="w-full sm:w-1/3 space-y-2">
                  <Label className="text-sm text-zinc-600 dark:text-zinc-300 font-bold block tracking-wide">Quantidade *</Label>
                  <Input
                    data-testid="venda-qtd"
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={form.quantidade}
                    onChange={(e) => setForm({ ...form, quantidade: e.target.value })}
                    className="h-11 border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-950 text-base font-semibold focus:ring-2 focus:ring-[#84A59D]"
                  />
                </div>
                <div className="w-full sm:flex-1">
                  <Button
                    type="button"
                    onClick={handleAddNovaVendaItem}
                    className="w-full bg-[#84A59D] hover:bg-[#6F9189] dark:bg-emerald-600 dark:hover:bg-emerald-700 text-white shadow-md h-11 font-bold text-sm tracking-wide transition-all hover:scale-[1.01]"
                  >
                    <Plus className="w-5 h-5 mr-2" /> Adicionar Produto
                  </Button>
                </div>
              </div>

              {/* Vendedor & Cliente select */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 bg-white dark:bg-zinc-900 p-5 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-sm">
                <div className="space-y-2">
                  <Label className="text-sm text-zinc-600 dark:text-zinc-300 font-bold block tracking-wide">Responsável pela Venda *</Label>
                  <SearchableSelect
                    placeholder="Selecione o profissional..."
                    searchPlaceholder="Pesquisar profissional pelo nome..."
                    options={colaboradores.filter(c => c.ativo).map((c) => ({
                      value: c.id,
                      label: c.nome
                    }))}
                    value={form.colaborador_id || ""}
                    onValueChange={(v) => setForm({ ...form, colaborador_id: v })}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm text-zinc-600 dark:text-zinc-300 font-bold block tracking-wide">Cliente (opcional)</Label>
                  <SearchableSelect
                    placeholder="Selecione o cliente..."
                    searchPlaceholder="Pesquisar cliente pelo nome..."
                    options={clientes.map((c) => ({
                      value: c.id,
                      label: c.telefone ? `${c.nome} — ${c.telefone}` : c.nome
                    }))}
                    value={form.cliente_id || ""}
                    onValueChange={(v) => setForm({ ...form, cliente_id: v })}
                  />
                </div>
              </div>

              {/* Temporary Cart items list */}
              {novaVendaItens.length > 0 ? (
                <div className="space-y-4">
                  <h3 className="text-sm font-extrabold text-zinc-500 dark:text-zinc-400 uppercase tracking-widest block pl-1 border-l-4 border-[#84A59D] dark:border-emerald-500">
                    Itens no Carrinho
                  </h3>
                  <div className="space-y-1.5">
                    {novaVendaItens.map((item, idx) => (
                      <div key={idx} className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-4 py-3 transition-all duration-200 hover:border-zinc-300 dark:hover:border-zinc-700 hover:shadow-sm">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <p className="font-bold text-sm text-zinc-900 dark:text-zinc-100 leading-tight truncate">{item.produto_nome}</p>
                            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5 font-semibold">
                              {fmtBRL(item.preco_unitario)} / un
                            </p>
                          </div>

                          <div className="flex items-center justify-between sm:justify-end gap-4 border-t sm:border-t-0 pt-2.5 sm:pt-0 border-zinc-100 dark:border-zinc-800">
                            {/* Incr / Decr */}
                            <div className="flex items-center gap-1 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 p-0.5 rounded-lg shadow-xs">
                              <button
                                type="button"
                                onClick={() => handleIncrementNovaVendaQtd(idx, -1)}
                                className="w-7 h-7 rounded-md bg-white dark:bg-zinc-800 flex items-center justify-center text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700 hover:text-zinc-900 dark:hover:text-white transition-colors"
                                title="Diminuir"
                              >
                                <Minus className="w-3.5 h-3.5" />
                              </button>
                              <span className="w-10 text-center text-xs font-black text-zinc-800 dark:text-zinc-200">
                                {item.quantidade}
                              </span>
                              <button
                                type="button"
                                onClick={() => handleIncrementNovaVendaQtd(idx, 1)}
                                className="w-7 h-7 rounded-md bg-white dark:bg-zinc-800 flex items-center justify-center text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700 hover:text-zinc-900 dark:hover:text-white transition-colors"
                                title="Aumentar"
                              >
                                <Plus className="w-3.5 h-3.5" />
                              </button>
                            </div>

                            {/* Subtotal */}
                            <div className="text-right min-w-[80px]">
                              <div className="text-[10px] text-zinc-400 dark:text-zinc-500 font-bold uppercase tracking-widest">Subtotal</div>
                              <div className="font-bold text-sm text-[#3A4F4A] dark:text-emerald-400 font-mono leading-tight mt-0.5">
                                {fmtBRL(item.preco_unitario * item.quantidade)}
                              </div>
                            </div>

                            {/* Remove */}
                            <button
                              type="button"
                              onClick={() => handleRemoveNovaVendaItem(idx)}
                              className="p-1.5 rounded-lg text-rose-500 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/30 dark:text-rose-400 dark:hover:bg-rose-900/50 dark:hover:text-rose-300 transition-colors shrink-0"
                              title="Remover produto"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-3xl p-10 flex flex-col items-center justify-center text-center bg-white dark:bg-zinc-900/50 shadow-sm">
                  <div className="p-4 bg-[#EAF0EE] dark:bg-emerald-900/20 text-[#3A4F4A] dark:text-emerald-500 rounded-2xl mb-4">
                    <ShoppingCart className="w-8 h-8" />
                  </div>
                  <h4 className="font-display font-extrabold text-zinc-800 dark:text-zinc-200 text-lg">O carrinho está vazio</h4>
                  <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-2 max-w-sm leading-relaxed">Selecione uma categoria, um produto e informe a quantidade acima para começar a adicionar itens.</p>
                </div>
              )}
            </div>

            {/* fixed footer */}
            <div className="px-6 sm:px-8 py-5 border-t border-zinc-100 dark:border-zinc-800 bg-zinc-50/80 dark:bg-zinc-900/80 backdrop-blur-md shrink-0">
              <div className="flex items-center justify-between bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl px-6 py-4 mb-5 shadow-sm">
                <div className="text-sm text-zinc-500 dark:text-zinc-400 font-semibold flex items-center gap-3">
                  <span className="font-black text-[#3A4F4A] dark:text-zinc-900 text-base bg-[#EAF0EE] dark:bg-emerald-400 px-3.5 py-1.5 rounded-xl shadow-inner">
                    {novaVendaItens.length}
                  </span>
                  <span>item(ns) selecionados</span>
                </div>
                <div className="text-right">
                  <div className="text-xs text-zinc-400 dark:text-zinc-500 font-extrabold uppercase tracking-widest">Total da Venda</div>
                  <div className="font-black text-3xl text-[#3A4F4A] dark:text-emerald-400 leading-none mt-1">
                    {fmtBRL(novaVendaItens.reduce((acc, item) => acc + (item.preco_unitario * item.quantidade), 0))}
                  </div>
                </div>
              </div>
              <div className="flex flex-col sm:flex-row gap-3 justify-end">
                <Button type="button" variant="outline" className="h-12 px-6 border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 font-bold text-zinc-700 dark:text-zinc-300" onClick={() => setOpen(false)}>Cancelar</Button>
                <Button
                  data-testid="save-venda-btn"
                  onClick={save}
                  disabled={novaVendaItens.length === 0}
                  className="h-12 px-8 bg-[#84A59D] hover:bg-[#6F9189] dark:bg-emerald-600 dark:hover:bg-emerald-700 text-white shadow-lg font-bold text-base transition-transform hover:scale-[1.02]"
                >
                  <CreditCard className="w-5 h-5 mr-2" /> Criar e ir para pagamento
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      } />

      {/* Search and Filters Bar */}
      <div className="bg-white border border-zinc-200 rounded-xl p-4 mb-6 shadow-sm space-y-4">
        {/* Row 1: Date Filters */}
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center w-full lg:w-auto">
            <div className="w-full sm:w-64">
              <Label className="text-xs text-zinc-500 font-medium mb-1 block">Pesquisa</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-zinc-400 w-4 h-4" />
                <Input
                  placeholder="Pesquisar por venda..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 focus:ring-2 focus:ring-[#84A59D] transition-all bg-transparent text-foreground border-input h-10 w-full"
                />
              </div>
            </div>
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
            {(startDate !== getTodayStr() || endDate !== getTodayStr() || filterProdutoId !== "all" || filterColaboradorId !== "all" || filterClienteId !== "all" || searchQuery !== "") && (
              <Button
                variant="ghost"
                className="text-rose-500 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/30"
                onClick={() => {
                  setStartDate(getTodayStr());
                  setEndDate(getTodayStr());
                  setFilterProdutoId("all");
                  setFilterColaboradorId("all");
                  setFilterClienteId("all");
                  setSearchQuery("");
                }}
              >
                Limpar Filtros
              </Button>
            )}
            <Button
              variant="outline"
              onClick={() => setAuditOpen(true)}
              className="flex items-center gap-1.5 border-zinc-200 text-zinc-500 hover:bg-zinc-50 hover:text-zinc-800"
            >
              <History className="w-4 h-4" /> Excluídos
            </Button>
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
              <div key={v.id} className="bg-white border border-zinc-200 rounded-xl p-4 shadow-sm hover:shadow transition-shadow cursor-pointer" onClick={() => openReceipt(v.id)}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-zinc-400 font-medium">{fmtDT(v.data_venda)}</span>
                    {v.numero_venda && (
                      <span className="text-[10px] font-mono font-bold bg-[#EAF0EE] text-[#3A4F4A] px-1.5 py-0.5 rounded">
                        {String(v.numero_venda).padStart(6, "0")} | V
                      </span>
                    )}
                  </div>
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
                  <div className="flex items-center gap-3">
                    <Button
                      size="default"
                      variant="outline"
                      className="h-11 px-4 rounded-xl shadow-sm font-semibold border-zinc-200 text-[#3A4F4A] hover:bg-[#EAF0EE]"
                      onClick={(e) => { e.stopPropagation(); openCarrinhoModal(v.id); }}
                      title="Ver/Editar Carrinho"
                    >
                      <ShoppingCart className="w-5 h-5 mr-2 text-zinc-500" /> Carrinho
                    </Button>
                    <Button size="default" variant="outline" className="h-11 px-4 rounded-xl shadow-sm font-semibold border-zinc-200 text-[#3A4F4A] hover:bg-[#EAF0EE]" onClick={(e) => { e.stopPropagation(); nav(`/vendas-diretas/${v.id}/pagamento`); }} data-testid={`pay-venda-mob-${v.id}`}>
                      <CreditCard className="w-5 h-5 mr-2" /> Pagar
                    </Button>
                    <Button size="default" variant="ghost" className="h-11 w-11 rounded-xl shadow-sm border border-zinc-100 text-rose-500 hover:bg-rose-50 hover:border-rose-200 ml-4" onClick={(e) => { e.stopPropagation(); del(v.id); }}>
                      <Trash2 className="w-5 h-5" />
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
                  <th className="px-4 py-3 text-left">Código</th>
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
                  <tr key={v.id} className="hover:bg-zinc-50/60 cursor-pointer" onClick={() => openReceipt(v.id)}>
                    <td className="px-4 py-3 font-mono font-bold text-xs text-[#3A4F4A] whitespace-nowrap">
                      {v.numero_venda ? (
                        <span className="bg-[#EAF0EE] px-1.5 py-0.5 rounded whitespace-nowrap">
                          {String(v.numero_venda).padStart(6, "0")} | V
                        </span>
                      ) : "—"}
                    </td>
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
                    <td className="px-4 py-3 text-right space-x-3">
                      <Button
                        size="default"
                        variant="ghost"
                        className="h-10 w-10 rounded-lg hover:bg-[#EAF0EE] border border-transparent hover:border-[#84A59D]/30"
                        onClick={(e) => { e.stopPropagation(); openCarrinhoModal(v.id); }}
                        title="Ver/Editar Carrinho"
                      >
                        <ShoppingCart className="w-5 h-5 text-zinc-500 hover:text-[#84A59D]" />
                      </Button>
                      <Button
                        size="default"
                        variant="ghost"
                        className="h-10 w-10 rounded-lg hover:bg-zinc-100 border border-transparent hover:border-zinc-200"
                        onClick={(e) => { e.stopPropagation(); nav(`/vendas-diretas/${v.id}/pagamento`); }}
                        title="Pagar Venda"
                        data-testid={`pay-venda-${v.id}`}
                      >
                        <CreditCard className="w-5 h-5 text-zinc-600" />
                      </Button>
                      <Button
                        size="default"
                        variant="ghost"
                        className="ml-6 h-10 w-10 rounded-lg hover:bg-rose-50 border border-transparent hover:border-rose-200"
                        title="Excluir Venda"
                        onClick={(e) => { e.stopPropagation(); del(v.id); }}
                      >
                        <Trash2 className="w-5 h-5 text-rose-500" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Dialog do Carrinho de Compras */}
      <Dialog open={carrinhoOpen} onOpenChange={(o) => { if (!o) { setCarrinhoOpen(false); setConfirmRemoveIdx(null); setEditingQtdIdx(null); } }}>
        <DialogContent className="w-[95vw] max-w-[95vw] sm:max-w-4xl w-full p-0 gap-0 flex flex-col overflow-hidden bg-white dark:bg-zinc-900 shadow-2xl rounded-2xl border-0" style={{ maxHeight: '85vh' }}>

          {/* Cabeçalho */}
          <div className="px-6 sm:px-8 pt-6 pb-5 border-b border-zinc-100 dark:border-zinc-800 shrink-0 bg-zinc-50/80 dark:bg-zinc-900/80 backdrop-blur-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-3 text-lg font-bold text-zinc-800 dark:text-zinc-100">
                <div className="p-2 bg-[#EAF0EE] dark:bg-emerald-900/30 text-[#3A4F4A] dark:text-emerald-400 rounded-xl shadow-sm">
                  <ShoppingCart className="w-6 h-6" />
                </div>
                <div>
                  <span className="block font-display text-xl font-extrabold text-zinc-950 dark:text-zinc-50">Carrinho da Venda</span>
                  {carrinhoData && (
                    <span className="font-mono text-xs bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 px-2.5 py-0.5 rounded-full font-bold mt-1 inline-block">
                      VENDA #${String(carrinhoData.numero_venda).padStart(6, '0')}
                    </span>
                  )}
                </div>
              </DialogTitle>
            </DialogHeader>

            {/* Banner de bloqueio */}
            {carrinhoData?.bloqueado && (
              <div className="mt-4 flex items-start gap-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 rounded-xl px-5 py-4 text-amber-700 dark:text-amber-500 shadow-sm">
                <Lock className="w-5 h-5 shrink-0 mt-0.5 text-amber-600 dark:text-amber-500" />
                <div>
                  <span className="font-bold text-sm block">Carrinho Bloqueado</span>
                  <span className="text-sm leading-relaxed opacity-90 mt-0.5 block">{carrinhoData.mensagem_bloqueio}</span>
                </div>
              </div>
            )}
          </div>

          {/* Corpo rolável */}
          <div className="flex-1 overflow-y-auto px-6 sm:px-8 py-6 space-y-6 bg-zinc-50/30 dark:bg-zinc-950/50">
            {carrinhoLoading ? (
              <div className="flex flex-col items-center justify-center py-20 gap-3">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#84A59D] dark:border-emerald-500" />
                <p className="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-widest">Buscando itens do carrinho...</p>
              </div>
            ) : carrinhoData ? (
              <>
                {/* Informar ou Trocar Cliente da Venda */}
                <div className="p-5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-sm space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-extrabold text-zinc-500 dark:text-zinc-400 uppercase tracking-widest block">
                      Cliente da Venda
                    </Label>
                    {carrinhoData.cliente_nome && (
                      <span className="text-xs bg-[#EAF0EE] dark:bg-emerald-900/30 text-[#3A4F4A] dark:text-emerald-400 px-2.5 py-1 rounded-lg font-bold">
                        Atual: {carrinhoData.cliente_nome}
                      </span>
                    )}
                  </div>
                  <SearchableSelect
                    placeholder="Selecione ou mude o cliente..."
                    searchPlaceholder="Pesquisar cliente..."
                    disabled={carrinhoData.bloqueado || carrinhoSaving}
                    options={[
                      { value: "none", label: "Sem Cliente (Consumidor Final)" },
                      ...clientes.map(c => ({
                        value: c.id,
                        label: c.telefone ? `${c.nome} — ${c.telefone}` : c.nome
                      }))
                    ]}
                    value={carrinhoData.cliente_id || "none"}
                    onValueChange={handleUpdateCartCliente}
                  />
                </div>

                {/* Busca rápida de produtos para adicionar ao carrinho */}
                {!carrinhoData.bloqueado && (
                  <div className="p-5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-sm space-y-3">
                    <Label className="text-sm font-extrabold text-zinc-500 dark:text-zinc-400 uppercase tracking-widest block">Adicionar Produto ao Carrinho</Label>
                    <div className="relative">
                      <SearchableSelect
                        placeholder="Pesquise por nome do produto para adicionar..."
                        searchPlaceholder="Digite o nome..."
                        options={produtos
                          .filter(p => p.quantidade_estoque > 0)
                          .map(p => ({
                            value: p.id,
                            label: `${p.nome} — ${fmtBRL(p.preco_venda)} (Estoque: ${Number(Number(p.quantidade_estoque || 0).toFixed(3))})`
                          }))
                        }
                        value=""
                        onValueChange={async (prodId) => {
                          if (!prodId) return;
                          const prod = produtos.find(p => p.id === prodId);
                          if (prod) {
                            setCarrinhoSaving(true);
                            try {
                              await http.post(`/vendas-diretas/${carrinhoVendaId}/carrinho/itens`, {
                                produto_id: prodId,
                                quantidade: 1,
                                preco_unitario: prod.preco_venda
                              });
                              toast.success(`"${prod.nome}" adicionado!`);
                              await loadCarrinho(carrinhoVendaId);
                              load();
                            } catch (e) {
                              toast.error(e.response?.data?.detail || "Erro ao adicionar produto.");
                            } finally {
                              setCarrinhoSaving(false);
                            }
                          }
                        }}
                      />
                    </div>
                  </div>
                )}

                {/* Lista de itens */}
                <div className="space-y-1.5">
                  {(carrinhoData.itens || []).map((item, idx) => (
                    <div
                      key={idx}
                      className={`rounded-xl border px-4 py-3 transition-all duration-200 ${confirmRemoveIdx === idx
                          ? 'border-rose-300 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/20'
                          : 'border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:border-zinc-300 dark:hover:border-zinc-700 hover:shadow-sm'
                        }`}
                    >
                      {/* Grid adaptável para mobile e desktop */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">

                        {/* Info Produto */}
                        <div className="min-w-0 flex-1">
                          <p className="font-bold text-sm text-zinc-900 dark:text-zinc-100 leading-tight truncate">{item.produto_nome}</p>
                          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5 font-semibold">
                            {fmtBRL(item.preco_unitario)} / un
                          </p>
                        </div>

                        {/* Controles do carrinho (Qtd + Subtotal + Excluir) */}
                        <div className="flex items-center justify-between sm:justify-end gap-4 border-t sm:border-t-0 pt-2.5 sm:pt-0 border-zinc-100 dark:border-zinc-800">

                          {/* Botões táteis de incrementar / decrementar quantidade */}
                          {!carrinhoData.bloqueado ? (
                            <div className="flex items-center gap-1 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 p-0.5 rounded-lg shadow-xs">
                              {/* Botão Menos */}
                              <button
                                disabled={carrinhoSaving}
                                onClick={() => handleIncrementQtd(idx, -1)}
                                className="w-7 h-7 rounded-md bg-white dark:bg-zinc-800 flex items-center justify-center text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700 hover:text-zinc-900 dark:hover:text-white disabled:opacity-50 transition-colors"
                                title="Diminuir"
                              >
                                <Minus className="w-3.5 h-3.5" />
                              </button>

                              {/* Visualização de quantidade (clicável para edição manual) */}
                              {editingQtdIdx === idx ? (
                                <Input
                                  type="number" min="0.01" step="0.01"
                                  value={editingQtdVal}
                                  onChange={e => setEditingQtdVal(e.target.value)}
                                  className="w-12 h-7 text-xs font-black text-center border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 focus-visible:ring-2 focus:ring-[#84A59D] p-0"
                                  autoFocus
                                  onBlur={() => handleSaveQtd(idx)}
                                  onKeyDown={e => {
                                    if (e.key === 'Enter') handleSaveQtd(idx);
                                    if (e.key === 'Escape') setEditingQtdIdx(null);
                                  }}
                                />
                              ) : (
                                <span
                                  onClick={() => { setEditingQtdIdx(idx); setEditingQtdVal(String(item.quantidade)); }}
                                  className="w-10 text-center text-xs font-black text-zinc-800 dark:text-zinc-200 cursor-pointer hover:bg-white dark:hover:bg-zinc-800 hover:rounded-md py-1 transition-all"
                                  title="Clique para digitar quantidade"
                                >
                                  {item.quantidade}
                                </span>
                              )}

                              {/* Botão Mais */}
                              <button
                                disabled={carrinhoSaving}
                                onClick={() => handleIncrementQtd(idx, 1)}
                                className="w-7 h-7 rounded-md bg-white dark:bg-zinc-800 flex items-center justify-center text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700 hover:text-zinc-900 dark:hover:text-white disabled:opacity-50 transition-colors"
                                title="Aumentar"
                              >
                                <Plus className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ) : (
                            <div className="text-right">
                              <span className="text-[10px] text-zinc-500 dark:text-zinc-400 font-extrabold block uppercase tracking-widest">Qtd</span>
                              <span className="font-bold text-sm text-zinc-800 dark:text-zinc-200">{item.quantidade}</span>
                            </div>
                          )}

                          {/* Subtotal */}
                          <div className="text-right min-w-[80px]">
                            <div className="text-[10px] text-zinc-400 dark:text-zinc-500 font-bold uppercase tracking-widest">Subtotal</div>
                            <div className="font-bold text-sm text-[#3A4F4A] dark:text-emerald-400 font-mono leading-tight mt-0.5">{fmtBRL(item.subtotal)}</div>
                          </div>

                          {/* Botão de Excluir */}
                          {!carrinhoData.bloqueado && (
                            confirmRemoveIdx === idx ? (
                              <div className="flex items-center gap-1.5 shrink-0">
                                <button
                                  disabled={carrinhoSaving}
                                  onClick={() => handleRemoveCartItem(idx)}
                                  className="text-[10px] font-bold px-2 py-1.5 rounded-lg bg-rose-500 text-white hover:bg-rose-600 transition-colors disabled:opacity-50 shrink-0"
                                >
                                  {carrinhoSaving ? '...' : 'Remover'}
                                </button>
                                <button
                                  onClick={() => setConfirmRemoveIdx(null)}
                                  className="text-[10px] font-bold px-2 py-1.5 rounded-lg bg-zinc-200 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-300 dark:hover:bg-zinc-600 transition-colors shrink-0"
                                >
                                  Não
                                </button>
                              </div>
                            ) : (
                              <button
                                disabled={(carrinhoData.itens || []).length <= 1}
                                onClick={() => setConfirmRemoveIdx(idx)}
                                className="p-1.5 rounded-lg text-rose-500 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/30 dark:text-rose-400 dark:hover:bg-rose-900/50 dark:hover:text-rose-300 transition-colors shrink-0 disabled:opacity-20 disabled:cursor-not-allowed"
                                title="Remover item"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )
                          )}

                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            ) : null}
          </div>

          {/* Rodapé com totais */}
          <div className="px-6 sm:px-8 py-5 border-t border-zinc-100 dark:border-zinc-800 bg-zinc-50/80 dark:bg-zinc-900/80 backdrop-blur-md shrink-0">
            <div className="flex items-center justify-between bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl px-6 py-4 mb-5 shadow-sm">
              <div className="text-sm text-zinc-500 dark:text-zinc-400 font-semibold flex items-center gap-3">
                <span className="font-black text-[#3A4F4A] dark:text-zinc-900 text-base bg-[#EAF0EE] dark:bg-emerald-400 px-3.5 py-1.5 rounded-xl shadow-inner">{(carrinhoData?.itens || []).length}</span>
                <span>item(ns) lançados</span>
              </div>
              <div className="text-right">
                <div className="text-xs text-zinc-400 dark:text-zinc-500 font-extrabold uppercase tracking-widest">Valor Total da Venda</div>
                <div className="font-black text-3xl text-[#3A4F4A] dark:text-emerald-400 leading-none mt-1">{fmtBRL(carrinhoData?.valor_total || 0)}</div>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 justify-end">
              <Button type="button" variant="outline" className="h-12 px-6 border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 font-bold text-zinc-700 dark:text-zinc-300" onClick={() => setCarrinhoOpen(false)}>Fechar</Button>
              {carrinhoData && !carrinhoData.bloqueado && (
                <Button
                  onClick={() => { setCarrinhoOpen(false); nav(`/vendas-diretas/${carrinhoVendaId}/pagamento`) }}
                  className="h-12 px-8 bg-[#84A59D] hover:bg-[#6F9189] dark:bg-emerald-600 dark:hover:bg-emerald-700 text-white shadow-lg font-bold text-base transition-transform hover:scale-[1.02]"
                >
                  <CreditCard className="w-5 h-5 mr-2" /> Ir para Pagamento
                </Button>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog de confirmação de exclusão */}

      <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <DialogContent className="w-[95vw] max-w-[95vw] sm:max-w-md p-5 sm:p-6 rounded-2xl dark:bg-zinc-900 dark:border-zinc-800">
          <DialogHeader>
            <DialogTitle>Confirmar exclusão de venda</DialogTitle>
          </DialogHeader>
          <div className="py-4 text-sm text-zinc-600 dark:text-zinc-400">
            Tem certeza que deseja excluir esta venda direta? O produto será retornado ao estoque e os pagamentos vinculados serão estornados. Esta ação pode ser desfeita a qualquer momento a partir da tela de "Excluídos".
          </div>
          <DialogFooter className="gap-2 flex flex-col sm:flex-row">
            <Button variant="outline" className="w-full sm:w-auto" onClick={() => setDeleteConfirmOpen(false)}>Cancelar</Button>
            <Button onClick={confirmDelete} className="bg-rose-500 hover:bg-rose-600 text-white w-full sm:w-auto">Confirmar Exclusão</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* Modal de Recibo */}
      <VendaReceiptModal open={receiptOpen} onOpenChange={setReceiptOpen} vendaId={receiptVendaId} />
      <AuditModal
        isOpen={auditOpen}
        onClose={() => setAuditOpen(false)}
        modulo="venda_direta"
        tituloModulo="Vendas Diretas"
        onRestoreSuccess={load}
      />
    </div>
  );
}