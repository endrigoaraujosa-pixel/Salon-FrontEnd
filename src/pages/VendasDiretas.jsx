import React, { useEffect, useState, useRef } from "react";
import http from "../api";
import { PageHeader, EmptyState } from "../components/Page";
import { cn } from "@/lib/utils";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "../components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "../components/ui/dialog";
import VendaReceiptModal from "../components/VendaReceiptModal";
import AuditModal from "../components/AuditModal";
import { ShoppingBag, ShoppingCart, Plus, Minus, Trash2, CreditCard, Calendar, Lock, Search, History, ChevronLeft, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../auth";
import SearchableSelect from "../components/SearchableSelect";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
} from "../components/ui/pagination";
import { formatAgendaDateTime } from "../lib/date";

const fmtBRL = (n) => (n || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const fmtDT = (s) => formatAgendaDateTime(s);

const STATUS_COLORS = {
  pendente: "bg-amber-100 text-amber-700",
  pago: "bg-emerald-100 text-emerald-700",
};

export default function VendasDiretas() {
  const { user } = useAuth();
  const canCriarVenda = user?.role === 'admin' || user?.perfil?.permissoes?.['vendas.criar'] === true || user?.perfil?.permissoes?.acoes?.['vendas.criar'];
  const canLancarPagamento = user?.role === 'admin' || user?.perfil?.permissoes?.['vendas.pagamento'] === true || user?.perfil?.permissoes?.acoes?.['vendas.pagamento'];

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
  const [configSistema, setConfigSistema] = useState(null);
  const [confirmRemoveIdx, setConfirmRemoveIdx] = useState(null);
  const [editingQtdIdx, setEditingQtdIdx] = useState(null);
  const [editingQtdVal, setEditingQtdVal] = useState("");
  const [form, setForm] = useState({ produto_id: "", quantidade: 1, preco_unitario: "", colaborador_id: "", cliente_id: "", data_venda: getTodayStr() });
  const [startDate, setStartDate] = useState(getTodayStr());
  const [endDate, setEndDate] = useState(getTodayStr());
  const [filterProdutoId, setFilterProdutoId] = useState("all");
  const [filterColaboradorId, setFilterColaboradorId] = useState("all");
  const [filterClienteId, setFilterClienteId] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [novaVendaItens, setNovaVendaItens] = useState([]);
  const [fromAgenda, setFromAgenda] = useState(false);
  const dialogOpenedOnce = useRef(false); // guard to skip reset-on-close at initial mount
  const [currentStep, setCurrentStep] = useState(1);
  const [isMobile, setIsMobile] = useState(typeof window !== "undefined" ? window.innerWidth < 768 : false);
  const quantityInputRef = useRef(null);
  const handleCreateNovaVendaRef = useRef();
  const nav = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (typeof window === "undefined") return;
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Pagination states
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);

  const load = (pageNum = page) => {
    http.get("/vendas-diretas", {
      params: {
        page: pageNum,
        limit: 50,
        data_inicio: startDate,
        data_fim: endDate,
        cliente_id: filterClienteId,
        colaborador_id: filterColaboradorId,
        produto_id: filterProdutoId,
        search: searchQuery
      }
    }).then((r) => {
      setList(r.data.data || []);
      setPage(r.data.page || 1);
      setTotalPages(r.data.pages || 1);
      setTotalRecords(r.data.total || 0);
    });
  };

  const prevFilters = useRef({ startDate, endDate, filterProdutoId, filterColaboradorId, filterClienteId, searchQuery });

  useEffect(() => {
    const filtersChanged =
      prevFilters.current.startDate !== startDate ||
      prevFilters.current.endDate !== endDate ||
      prevFilters.current.filterProdutoId !== filterProdutoId ||
      prevFilters.current.filterColaboradorId !== filterColaboradorId ||
      prevFilters.current.filterClienteId !== filterClienteId ||
      prevFilters.current.searchQuery !== searchQuery;

    prevFilters.current = { startDate, endDate, filterProdutoId, filterColaboradorId, filterClienteId, searchQuery };

    if (filtersChanged) {
      if (page !== 1) {
        setPage(1);
      } else {
        load(1);
      }
    } else {
      load(page);
    }
  }, [page, startDate, endDate, filterProdutoId, filterColaboradorId, filterClienteId, searchQuery]);

  useEffect(() => {
    // Removido o filtro p.ativo (não existe na tabela)
    http.get("/produtos").then((r) => setProdutos(r.data));
    http.get("/colaboradores").then((r) => setColaboradores(r.data));
    http.get("/clientes").then((r) => setClientes(r.data));
    http.get("/categorias").then((r) => {
      const all = r.data || [];
      // Filtramos ativos no frontend para evitar problemas de parsing boolean (true/'true'/1) no backend SQLite
      setCategorias(all.filter(c => c.ativo !== false && c.ativo !== 0 && c.ativo !== '0'));
    });
    http.get("/configuracoes/sistema").then((r) => setConfigSistema(r.data || null)).catch(() => {});
  }, []);

  // Open new sale dialog pre-filled with client when navigated from Agenda
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const clienteIdFromUrl = params.get("cliente_id");
    const fromAgendaParam = params.get("from") === "agenda";
    if (clienteIdFromUrl) {
      if (!canCriarVenda) {
        toast.error("Acesso negado: Você não tem permissão para realizar vendas.");
        nav("/vendas-diretas", { replace: true });
        return;
      }
      setForm(f => ({ ...f, cliente_id: clienteIdFromUrl }));
      setFromAgenda(fromAgendaParam);
      setOpen(true);
      // Remove the query param from the URL without re-navigation
      nav("/vendas-diretas", { replace: true });
    }
  }, [location.search, canCriarVenda]);

  useEffect(() => {
    if (!open) {
      // Skip the very first execution (initial mount with open=false)
      // to avoid overwriting state set by the location effect
      if (!dialogOpenedOnce.current) return;
      const wasFromAgenda = fromAgenda;
      setNovaVendaItens([]);
      setSelectedAddCategory("all");
      setFromAgenda(false);
      setCurrentStep(1);
      setForm({ produto_id: "", quantidade: 1, colaborador_id: "", cliente_id: "", data_venda: getTodayStr() });
      // Se veio da agenda e fechou o modal sem salvar, volta para a agenda
      if (wasFromAgenda) {
        nav("/agenda");
      }
    } else {
      dialogOpenedOnce.current = true;
    }
  }, [open]);

  // Auto preencher preço unitário ao selecionar produto
  useEffect(() => {
    if (form.produto_id) {
      const prod = produtos.find(p => p.id === form.produto_id);
      if (prod) {
        setForm(f => ({ ...f, preco_unitario: prod.preco_venda }));
      }
    }
  }, [form.produto_id, produtos]);

  // Autofocus input de quantidade quando um produto é selecionado
  useEffect(() => {
    if (form.produto_id && quantityInputRef.current) {
      quantityInputRef.current.focus();
      quantityInputRef.current.select();
    }
  }, [form.produto_id]);

  // Atalhos de teclado quando o modal de Nova Venda está aberto
  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e) => {
      if (e.key === "F2") {
        e.preventDefault();
        const btn = document.querySelector('[data-testid="venda-produto"]');
        if (btn) {
          btn.focus();
          btn.click();
        }
      } else if (e.key === "F4") {
        e.preventDefault();
        if (handleCreateNovaVendaRef.current) {
          handleCreateNovaVendaRef.current();
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open]);

  const produto = produtos.find((p) => p.id === form.produto_id);
  const valorPrev = produto ? produto.preco_venda * form.quantidade : 0;

  const handleCreateNovaVenda = async (force = false) => {
    if (novaVendaItens.length === 0) {
      toast.error("Adicione pelo menos um produto ao carrinho.");
      return;
    }
    if (!form.colaborador_id) {
      toast.error("Informe o profissional responsável pela venda.");
      return;
    }
    if (form.data_venda) {
      const today = getTodayStr();
      if (form.data_venda > today) {
        toast.error("A data da venda não pode ser uma data futura.");
        return;
      }
    }
    try {
      const payload = {
        colaborador_id: form.colaborador_id,
        data_venda: form.data_venda,
        itens: novaVendaItens.map(item => ({
          produto_id: item.produto_id,
          quantidade: Number(item.quantidade),
          preco_unitario: Number(item.preco_unitario)
        })),
        forcar_venda: force
      };
      if (form.cliente_id) payload.cliente_id = form.cliente_id;

      console.log("Enviando payload nova venda:", payload);
      const { data } = await http.post("/vendas-diretas", payload);
      console.log("Resposta:", data);

      if (canLancarPagamento) {
        toast.success("Venda criada! Registre o pagamento.");
        const wasFromAgenda = fromAgenda;
        setOpen(false);
        load();
        nav(`/vendas-diretas/${data.id}/pagamento`, { state: { fromAgenda: wasFromAgenda } });
      } else {
        toast.success("Venda criada com sucesso.");
        setOpen(false);
        load();
      }
    } catch (e) {
      console.error("Erro:", e);
      if (e.response?.data?.code === 'ESTOQUE_INSUFICIENTE') {
        if (configSistema?.permitir_estoque_negativo) {
          toast.warning("Estoque insuficiente. A operação será concluída e o produto ficará com saldo negativo.");
          await handleCreateNovaVenda(true);
        } else {
          toast.error(e.response.data.detail || "Estoque insuficiente para concluir esta venda.");
        }
      } else {
        toast.error(e.response?.data?.detail || "Erro ao criar venda");
      }
    }
  };

  handleCreateNovaVendaRef.current = handleCreateNovaVenda;

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
    const qtyPerUnit = Number(prod.quantidade_por_unidade || 0);
    const maxAllowed = qtyPerUnit > 0 ? (prod.quantidade_estoque / qtyPerUnit) : prod.quantidade_estoque;
    const formattedMax = qtyPerUnit > 0 
      ? `${Number(maxAllowed.toFixed(2))} ${prod.unidade_medida || 'un'} (${Number(prod.quantidade_estoque.toFixed(3))} ${prod.unidade_medida_insumo || 'un'})`
      : `${Number(prod.quantidade_estoque.toFixed(3))} ${prod.unidade_medida || 'un'}`;

    const customUnitPrice = (configSistema?.permitir_alterar_preco_produto_venda && form.preco_unitario !== "" && !isNaN(Number(form.preco_unitario)) && Number(form.preco_unitario) >= 0)
      ? Number(form.preco_unitario)
      : prod.preco_venda;

    if (itemExistenteIdx !== -1) {
      const novaQtd = novaVendaItens[itemExistenteIdx].quantidade + qtd;
      if (novaQtd > maxAllowed) {
        if (configSistema?.permitir_estoque_negativo) {
          toast.warning(`Estoque insuficiente. A operação será concluída e o produto "${prod.nome}" ficará com saldo negativo.`);
        } else {
          toast.error(`Estoque insuficiente para "${prod.nome}". Disponível: ${formattedMax}`);
          return;
        }
      }
      const copia = [...novaVendaItens];
      copia[itemExistenteIdx].quantidade = novaQtd;
      copia[itemExistenteIdx].preco_unitario = customUnitPrice;
      setNovaVendaItens(copia);
    } else {
      if (qtd > maxAllowed) {
        if (configSistema?.permitir_estoque_negativo) {
          toast.warning(`Estoque insuficiente. A operação será concluída e o produto "${prod.nome}" ficará com saldo negativo.`);
        } else {
          toast.error(`Estoque insuficiente para "${prod.nome}". Disponível: ${formattedMax}`);
          return;
        }
      }
      setNovaVendaItens([
        ...novaVendaItens,
        {
          produto_id: prod.id,
          produto_nome: prod.nome,
          preco_unitario: customUnitPrice,
          preco_cadastrado: prod.preco_venda,
          quantidade: qtd
        }
      ]);
    }
    setForm({ ...form, produto_id: "", quantidade: 1, preco_unitario: "" });
    toast.success(`"${prod.nome}" adicionado!`);

    setTimeout(() => {
      const btn = document.querySelector('[data-testid="venda-produto"]');
      if (btn) btn.focus();
    }, 100);
  };

  const handleIncrementNovaVendaQtd = (idx, delta) => {
    const item = novaVendaItens[idx];
    const prod = produtos.find(p => p.id === item.produto_id);
    const novaQtd = item.quantidade + delta;
    if (novaQtd <= 0) {
      setNovaVendaItens(novaVendaItens.filter((_, i) => i !== idx));
      return;
    }
    if (prod) {
      const qtyPerUnit = Number(prod.quantidade_por_unidade || 0);
      const maxAllowed = qtyPerUnit > 0 ? (prod.quantidade_estoque / qtyPerUnit) : prod.quantidade_estoque;
      if (novaQtd > maxAllowed) {
        if (configSistema?.permitir_estoque_negativo) {
          toast.warning(`Estoque insuficiente. A operação será concluída e o produto "${prod.nome}" ficará com saldo negativo.`);
        } else {
          const formattedMax = qtyPerUnit > 0 
            ? `${Number(maxAllowed.toFixed(2))} ${prod.unidade_medida || 'un'} (${Number(prod.quantidade_estoque.toFixed(3))} ${prod.unidade_medida_insumo || 'un'})`
            : `${Number(prod.quantidade_estoque.toFixed(3))} ${prod.unidade_medida || 'un'}`;
          toast.error(`Estoque insuficiente para "${prod.nome}". Disponível: ${formattedMax}`);
          return;
        }
      }
    }
    const copia = [...novaVendaItens];
    copia[idx].quantidade = novaQtd;
    setNovaVendaItens(copia);
  };

  const handleSetNovaVendaQtd = (idx, qty) => {
    if (qty <= 0) {
      return;
    }
    const item = novaVendaItens[idx];
    const prod = produtos.find(p => p.id === item.produto_id);
    if (prod) {
      const qtyPerUnit = Number(prod.quantidade_por_unidade || 0);
      const maxAllowed = qtyPerUnit > 0 ? (prod.quantidade_estoque / qtyPerUnit) : prod.quantidade_estoque;
      if (qty > maxAllowed) {
        if (configSistema?.permitir_estoque_negativo) {
          toast.warning(`Estoque insuficiente. A operação será concluída e o produto "${prod.nome}" ficará com saldo negativo.`);
        } else {
          const formattedMax = qtyPerUnit > 0 
            ? `${Number(maxAllowed.toFixed(2))} ${prod.unidade_medida || 'un'} (${Number(prod.quantidade_estoque.toFixed(3))} ${prod.unidade_medida_insumo || 'un'})`
            : `${Number(prod.quantidade_estoque.toFixed(3))} ${prod.unidade_medida || 'un'}`;
          toast.error(`Estoque insuficiente para "${prod.nome}". Disponível: ${formattedMax}`);
          return;
        }
      }
    }
    const copia = [...novaVendaItens];
    copia[idx].quantidade = qty;
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
    const update = async (force = false) => {
      try {
        await http.put(`/vendas-diretas/${carrinhoVendaId}/carrinho/itens/${idx}`, { 
          quantidade: novaQtd,
          forcar_venda: force
        });
        await loadCarrinho(carrinhoVendaId);
        load();
      } catch (e) {
        if (e.response?.data?.code === 'ESTOQUE_INSUFICIENTE') {
          if (configSistema?.permitir_estoque_negativo) {
            toast.warning("Estoque insuficiente. A operação será concluída e o produto ficará com saldo negativo.");
            await update(true);
          } else {
            toast.error(e.response.data.detail || "Estoque insuficiente.");
          }
        } else {
          toast.error(e.response?.data?.detail || "Erro ao atualizar quantidade.");
        }
      }
    };
    await update();
    setCarrinhoSaving(false);
  };

  const handleSaveQtd = async (idx) => {
    const val = Number(editingQtdVal);
    if (isNaN(val) || val <= 0) {
      toast.error("Quantidade inválida.");
      return;
    }
    setCarrinhoSaving(true);
    const update = async (force = false) => {
      try {
        await http.put(`/vendas-diretas/${carrinhoVendaId}/carrinho/itens/${idx}`, { 
          quantidade: val,
          forcar_venda: force
        });
        await loadCarrinho(carrinhoVendaId);
        load();
      } catch (e) {
        if (e.response?.data?.code === 'ESTOQUE_INSUFICIENTE') {
          if (configSistema?.permitir_estoque_negativo) {
            toast.warning("Estoque insuficiente. A operação será concluída e o produto ficará com saldo negativo.");
            await update(true);
          } else {
            toast.error(e.response.data.detail || "Estoque insuficiente.");
          }
        } else {
          toast.error(e.response?.data?.detail || "Erro ao atualizar quantidade.");
        }
      }
    };
    await update();
    setCarrinhoSaving(false);
    setEditingQtdIdx(null);
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

  const filteredList = list;

  return (
    <div className="p-4 sm:p-6 lg:p-8 fade-in w-full overflow-x-hidden">
      <PageHeader overline="Balcão" title="Vendas Diretas" action={
        <Dialog open={open} onOpenChange={(val) => {
          if (val && !canCriarVenda) {
            toast.error("Acesso negado: Permissão insuficiente para realizar vendas.");
            return;
          }
          setOpen(val);
        }}>
          {canCriarVenda ? (
            <DialogTrigger asChild>
              <Button data-testid="add-venda-btn" className="bg-[#84A59D] hover:bg-[#6F9189] w-full sm:w-auto">
                <Plus className="w-4 h-4 mr-1" /> Nova venda
              </Button>
            </DialogTrigger>
          ) : (
            <Button 
              disabled 
              data-testid="add-venda-btn" 
              className="bg-[#84A59D] hover:bg-[#6F9189] w-full sm:w-auto opacity-50 cursor-not-allowed"
            >
              <Plus className="w-4 h-4 mr-1" /> Nova venda
            </Button>
          )}
          <DialogContent className="w-[95vw] max-w-[95vw] md:max-w-6xl w-full p-0 gap-0 flex flex-col overflow-hidden bg-white dark:bg-zinc-900 shadow-2xl rounded-2xl border-0 md:h-[85vh] md:max-h-[90vh]" style={{ maxHeight: '90vh' }}>
            {/* fixed header */}
            <div className="px-6 sm:px-8 pt-6 pb-5 border-b border-zinc-100 dark:border-zinc-800 shrink-0 bg-zinc-50/80 dark:bg-zinc-900/80 backdrop-blur-md">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-3 text-lg font-bold text-zinc-950 dark:text-zinc-50">
                  <div className="p-2 bg-[#EAF0EE] dark:bg-emerald-900/30 text-[#3A4F4A] dark:text-emerald-450 rounded-xl shadow-sm">
                    <Plus className="w-6 h-6" />
                  </div>
                  <div>
                    <span className="block font-display text-xl font-extrabold text-zinc-950 dark:text-zinc-50 font-sans">Nova Venda Direta</span>
                    <span className="text-xs text-zinc-705 dark:text-zinc-305 font-semibold mt-0.5">Preencha os dados e adicione os itens ao carrinho</span>
                  </div>
                </DialogTitle>
              </DialogHeader>
            </div>

            {/* Stepper indicator (Mobile only) */}
            {isMobile && (
              <div className="px-4 py-3 border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50 flex justify-between items-center text-xs font-semibold text-zinc-700 dark:text-zinc-300 select-none shrink-0">
                {[
                  { step: 1, label: "Dados" },
                  { step: 2, label: "Produtos" },
                  { step: 3, label: "Carrinho" },
                  { step: 4, label: "Resumo" }
                ].map((s) => (
                  <div key={s.step} className="flex items-center gap-1.5">
                    <span className={cn(
                      "w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black transition-all",
                      currentStep === s.step
                        ? "bg-[#3A4F4A] text-white dark:bg-emerald-500 dark:text-zinc-950 scale-110"
                        : currentStep > s.step
                          ? "bg-[#EAF0EE] text-[#3A4F4A] dark:bg-emerald-900/30 dark:text-emerald-400"
                          : "bg-zinc-200 text-zinc-400 dark:bg-zinc-800 dark:text-zinc-700"
                    )}>
                      {s.step}
                    </span>
                    <span className={cn(
                      "hidden sm:inline font-sans",
                      currentStep === s.step ? "text-[#3A4F4A] dark:text-emerald-400 font-bold" : ""
                    )}>
                      {s.label}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* Split layout: Two columns on desktop, active stepper panel on mobile */}
            <div className="flex-1 overflow-y-auto md:overflow-hidden md:flex md:flex-row bg-zinc-50/30 dark:bg-zinc-950/50">
              
              {/* LEFT COLUMN (Form + selection) on Desktop / STEP 1 & 2 on Mobile */}
              <div className={cn(
                "md:w-[55%] md:flex md:flex-col md:gap-4 md:overflow-y-auto md:p-6 md:border-r md:border-zinc-200 md:dark:border-zinc-800 p-4 space-y-4",
                isMobile ? ((currentStep === 1 || currentStep === 2) ? "block" : "hidden") : "flex"
              )}>
                
                {/* 1. Dados gerais (Always block on desktop, only step 1 on mobile) */}
                <div className={cn(
                  "bg-white dark:bg-zinc-900 p-4 border border-zinc-200 dark:border-zinc-800/80 rounded-xl shadow-xs space-y-3",
                  isMobile ? (currentStep === 1 ? "block" : "hidden") : "block"
                )}>
                  <div className="text-xs font-black text-zinc-650 dark:text-zinc-400 uppercase tracking-wider block">
                    Dados da Venda
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {/* Responsável */}
                    <div className="space-y-1">
                      <Label className="text-xs text-zinc-700 dark:text-zinc-300 font-bold">Responsável *</Label>
                      <SearchableSelect
                        placeholder="Profissional..."
                        searchPlaceholder="Pesquisar profissional..."
                        options={colaboradores.filter(c => c.ativo).map((c) => ({
                          value: c.id,
                          label: c.nome
                        }))}
                        value={form.colaborador_id || ""}
                        onValueChange={(v) => setForm({ ...form, colaborador_id: v })}
                      />
                    </div>

                    {/* Cliente */}
                    <div className="space-y-1">
                      <Label className="text-xs text-zinc-700 dark:text-zinc-300 font-bold">
                        Cliente {fromAgenda ? "*" : "(opcional)"}
                      </Label>
                      {fromAgenda ? (
                        <div className="flex items-center gap-2 h-10 px-3 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-md">
                          <span className="text-xs font-semibold text-zinc-950 dark:text-zinc-50 truncate">
                            {clientes.find(c => c.id === form.cliente_id)?.nome || "Vinculado"}
                          </span>
                          <span className="text-[8px] font-black uppercase text-emerald-600 dark:text-emerald-450 bg-emerald-50 dark:bg-emerald-950/30 px-1.5 py-0.5 rounded shrink-0">Agenda</span>
                        </div>
                      ) : (
                        <SearchableSelect
                          placeholder="Consumidor Final"
                          searchPlaceholder="Pesquisar cliente..."
                          options={clientes.map((c) => ({
                            value: c.id,
                            label: c.telefone ? `${c.nome} — ${c.telefone}` : c.nome
                          }))}
                          value={form.cliente_id || ""}
                          onValueChange={(v) => setForm({ ...form, cliente_id: v })}
                        />
                      )}
                    </div>

                    {/* Data */}
                    <div className="space-y-1">
                      <Label className="text-xs text-zinc-700 dark:text-zinc-300 font-bold">Data da Venda *</Label>
                      <Input
                        type="date"
                        max={getTodayStr()}
                        value={form.data_venda || ""}
                        onChange={(e) => setForm({ ...form, data_venda: e.target.value })}
                        className="h-10 border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 text-xs font-semibold focus:ring-1 focus:ring-[#84A59D]"
                      />
                    </div>
                  </div>
                </div>

                {/* 2. Inclusão de Produtos (Always block on desktop, only step 2 on mobile) */}
                <div className={cn(
                  "bg-white dark:bg-zinc-900 p-4 border border-zinc-200 dark:border-zinc-800/80 rounded-xl shadow-xs space-y-3",
                  isMobile ? (currentStep === 2 ? "block" : "hidden") : "block"
                )}>
                  <div className="text-xs font-black text-zinc-650 dark:text-zinc-400 uppercase tracking-wider block">
                    Adicionar Itens
                  </div>

                  <div className="grid grid-cols-12 gap-3">
                    {/* Categoria */}
                    <div className="col-span-12 md:col-span-4 space-y-1">
                      <Label className="text-xs text-zinc-700 dark:text-zinc-300 font-bold">Categoria (Filtro)</Label>
                      <SearchableSelect
                        placeholder="Todas"
                        searchPlaceholder="Pesquisar..."
                        options={[
                          { value: "all", label: "Todas" },
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

                    {/* Produto */}
                    <div className="col-span-12 md:col-span-8 space-y-1">
                      <Label className="text-xs text-zinc-700 dark:text-zinc-300 font-bold">Pesquisar Produto (F2) *</Label>
                      <SearchableSelect
                        placeholder="Selecione o produto..."
                        searchPlaceholder="Pesquisar produto pelo nome..."
                        triggerTestId="venda-produto"
                        options={produtos
                          .filter(p => {
                            if (p.uso_exclusivo_servicos) return false;
                            const matchesCategory =
                              selectedAddCategory === "all" ||
                              (selectedAddCategory === "none" && !p.categoria_id) ||
                              p.categoria_id === selectedAddCategory;
                            return matchesCategory;
                          })
                          .map((p) => {
                            const qtyPerUnit = Number(p.quantidade_por_unidade || 0);
                            const qtyStr = qtyPerUnit > 0 
                              ? `${Number((p.quantidade_estoque / qtyPerUnit).toFixed(2))} ${p.unidade_medida || 'un'} (${Number(p.quantidade_estoque.toFixed(3))} ${p.unidade_medida_insumo || 'un'})`
                              : `${Number(p.quantidade_estoque.toFixed(3))} ${p.unidade_medida || 'un'}`;
                            return {
                              value: p.id,
                              label: `${p.nome} — ${fmtBRL(p.preco_venda)} (Estoque: ${qtyStr})`
                            };
                          })
                        }
                        value={form.produto_id}
                        onValueChange={(val) => setForm({ ...form, produto_id: val })}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-12 gap-3">
                    {/* Qtd */}
                    <div className={cn(
                      configSistema?.permitir_alterar_preco_produto_venda
                        ? "col-span-4 md:col-span-3 space-y-1"
                        : "col-span-5 md:col-span-4 space-y-1"
                    )}>
                      <Label className="text-xs text-zinc-700 dark:text-zinc-300 font-bold">Quantidade *</Label>
                      <Input
                        ref={quantityInputRef}
                        data-testid="venda-qtd"
                        type="number"
                        min="0.01"
                        step="0.01"
                        value={form.quantidade}
                        onChange={(e) => setForm({ ...form, quantidade: e.target.value })}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            handleAddNovaVendaItem();
                          }
                        }}
                        className="h-10 border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 text-xs font-semibold focus:ring-1 focus:ring-[#84A59D]"
                      />
                    </div>

                    {/* Preço Unitário (apenas se a regra permitir_alterar_preco_produto_venda estiver ativa) */}
                    {configSistema?.permitir_alterar_preco_produto_venda && (
                      <div className="col-span-4 md:col-span-4 space-y-1">
                        <Label className="text-xs text-zinc-700 dark:text-zinc-300 font-bold">Preço Unit. (R$) *</Label>
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          value={form.preco_unitario}
                          onChange={(e) => setForm({ ...form, preco_unitario: e.target.value })}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              handleAddNovaVendaItem();
                            }
                          }}
                          placeholder={produto ? String(produto.preco_venda) : "0.00"}
                          className="h-10 border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 text-xs font-semibold focus:ring-1 focus:ring-[#84A59D]"
                        />
                      </div>
                    )}

                    {/* Botão */}
                    <div className={cn(
                      "flex items-end",
                      configSistema?.permitir_alterar_preco_produto_venda
                        ? "col-span-4 md:col-span-5"
                        : "col-span-7 md:col-span-8"
                    )}>
                      <Button
                        type="button"
                        onClick={handleAddNovaVendaItem}
                        className="w-full bg-[#84A59D] hover:bg-[#6F9189] dark:bg-emerald-600 dark:hover:bg-emerald-700 text-white shadow-sm h-10 font-bold text-xs tracking-wide transition-all hover:scale-[1.01]"
                      >
                        <Plus className="w-4 h-4 mr-1.5" /> Adicionar (Enter)
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Selected Product Info Card (Always block on desktop, only step 2 on mobile) */}
                <div className={cn(
                  isMobile ? (currentStep === 2 ? "block" : "hidden") : "block"
                )}>
                  {produto && (
                    <div className="bg-[#EAF0EE]/30 dark:bg-emerald-950/10 p-4 border border-zinc-200/80 dark:border-emerald-800/20 rounded-xl space-y-2.5">
                      <div className="text-xs font-bold text-[#263532] dark:text-emerald-400 uppercase tracking-widest block font-sans">
                        Informações do Produto
                      </div>
                      <div className="grid grid-cols-3 gap-3">
                        {/* Preço */}
                        <div className="flex items-center gap-1.5">
                          <div className="p-1 bg-[#EAF0EE] dark:bg-emerald-950/40 text-[#263532] dark:text-emerald-450 rounded-md shrink-0">
                            <span className="text-[10px] font-bold font-mono">R$</span>
                          </div>
                          <div className="min-w-0">
                            <span className="text-[9px] text-zinc-650 dark:text-zinc-400 uppercase tracking-wider block font-semibold">Preço</span>
                            <span className="text-xs font-bold text-zinc-950 dark:text-zinc-100 font-mono truncate block">
                              {fmtBRL(produto.preco_venda)}
                            </span>
                          </div>
                        </div>

                        {/* Estoque */}
                        <div className="flex items-center gap-1.5">
                          <div className="p-1 bg-[#EAF0EE] dark:bg-emerald-950/40 text-[#263532] dark:text-emerald-450 rounded-md shrink-0">
                            <ShoppingCart className="w-3.5 h-3.5" />
                          </div>
                          <div className="min-w-0">
                            <span className="text-[9px] text-zinc-655 dark:text-zinc-400 uppercase tracking-wider block font-semibold">Estoque</span>
                            <span className="text-xs font-bold text-zinc-955 dark:text-zinc-100 font-mono truncate block">
                              {(() => {
                                const qtyPerUnit = Number(produto.quantidade_por_unidade || 0);
                                return qtyPerUnit > 0
                                  ? `${Number((produto.quantidade_estoque / qtyPerUnit).toFixed(2))} ${produto.unidade_medida || 'un'}`
                                  : `${Number(produto.quantidade_estoque.toFixed(2))} ${produto.unidade_medida || 'un'}`;
                              })()}
                            </span>
                          </div>
                        </div>

                        {/* Comissão */}
                        <div className="flex items-center gap-1.5">
                          <div className="p-1 bg-[#EAF0EE] dark:bg-emerald-950/40 text-[#263532] dark:text-emerald-450 rounded-md shrink-0">
                            <span className="text-[10px] font-bold font-mono">%</span>
                          </div>
                          <div className="min-w-0">
                            <span className="text-[9px] text-zinc-655 dark:text-zinc-400 uppercase tracking-wider block font-semibold">Comissão</span>
                            <span className="text-xs font-bold text-zinc-955 dark:text-zinc-100 truncate block">
                              {produto.comissao > 0 ? `${Number(produto.comissao)}%` : "N/A"}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* RIGHT COLUMN (Cart & Financial Summary) on Desktop / STEP 3 & 4 on Mobile */}
              <div className={cn(
                "md:w-[45%] md:flex md:flex-col md:overflow-hidden md:bg-zinc-50/50 md:dark:bg-zinc-900/30",
                isMobile ? ((currentStep === 3 || currentStep === 4) ? "block" : "hidden") : "flex"
              )}>
                {/* Header or Cart Title (Desktop only) */}
                {!isMobile && (
                  <div className="flex px-4 pt-4 justify-between items-center text-xs font-black text-zinc-650 dark:text-zinc-400 uppercase tracking-wider select-none shrink-0">
                    <span>Itens no Carrinho</span>
                    <span className="bg-[#EAF0EE] dark:bg-zinc-800 text-[#3A4F4A] dark:text-zinc-300 px-2 py-0.5 rounded font-mono text-[10px]">
                      {novaVendaItens.length} produto(s)
                    </span>
                  </div>
                )}

                {/* Cart list (Always visible on desktop, only Step 3 on mobile) */}
                <div className={cn(
                  "md:flex-1 md:overflow-y-auto md:p-4 p-4 space-y-4",
                  isMobile ? (currentStep === 3 ? "block" : "hidden") : "block"
                )}>
                  {novaVendaItens.length > 0 ? (
                    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden shadow-xs">
                      <table className="w-full text-xs">
                        <thead className="bg-zinc-50 dark:bg-zinc-955 text-[10px] uppercase font-bold text-zinc-700 dark:text-zinc-300 border-b border-zinc-200 dark:border-zinc-800">
                          <tr>
                            <th className="px-3 py-2 text-left">Produto</th>
                            <th className="px-2 py-2 text-right">Unit.</th>
                            <th className="px-2 py-2 text-center w-28">Qtd</th>
                            <th className="px-2 py-2 text-right">Total</th>
                            <th className="px-2 py-2"></th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                          {novaVendaItens.map((item, idx) => {
                            const prodOrig = produtos.find(p => p.id === item.produto_id);
                            const origPrice = item.preco_cadastrado || (prodOrig ? prodOrig.preco_venda : item.preco_unitario);
                            const diff = item.preco_unitario - origPrice;
                            const eDesconto = diff < -0.001;
                            const eAcrescimo = diff > 0.001;

                            return (
                              <tr key={idx} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-900/30">
                                <td className="px-3 py-2.5 font-bold text-zinc-950 dark:text-zinc-100 max-w-[120px] truncate" title={item.produto_nome}>
                                  <div>
                                    <span className="block truncate">{item.produto_nome}</span>
                                    {eDesconto && (
                                      <span className="inline-block text-[9px] px-1 py-0.2 bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 font-extrabold rounded mt-0.5">
                                        Desconto
                                      </span>
                                    )}
                                    {eAcrescimo && (
                                      <span className="inline-block text-[9px] px-1 py-0.2 bg-blue-100 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400 font-extrabold rounded mt-0.5">
                                        Acréscimo
                                      </span>
                                    )}
                                  </div>
                                </td>
                                <td className="px-2 py-2.5 text-right font-mono text-zinc-700 dark:text-zinc-300 font-bold">
                                  {configSistema?.permitir_alterar_preco_produto_venda ? (
                                    <input
                                      type="number"
                                      min="0"
                                      step="0.01"
                                      value={item.preco_unitario}
                                      onChange={(e) => {
                                        const val = Number(e.target.value);
                                        if (!isNaN(val) && val >= 0) {
                                          const copia = [...novaVendaItens];
                                          copia[idx].preco_unitario = val;
                                          setNovaVendaItens(copia);
                                        }
                                      }}
                                      className="w-16 h-6 text-xs text-right font-bold border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-950 rounded px-1 font-mono focus:ring-1 focus:ring-[#84A59D]"
                                    />
                                  ) : (
                                    fmtBRL(item.preco_unitario)
                                  )}
                                </td>
                                <td className="px-2 py-2.5">
                                  <div className="flex items-center gap-1 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-850 p-0.5 rounded-lg w-full max-w-[90px] mx-auto">
                                    <button
                                      type="button"
                                      onClick={() => handleIncrementNovaVendaQtd(idx, -1)}
                                      className="w-5 h-5 rounded bg-white dark:bg-zinc-800 flex items-center justify-center text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700"
                                    >
                                      <Minus className="w-2.5 h-2.5" />
                                    </button>
                                    <input
                                      type="number"
                                      min="0.01"
                                      step="0.01"
                                      value={item.quantidade}
                                      onChange={(e) => {
                                        const val = Number(e.target.value);
                                        if (!isNaN(val)) {
                                          handleSetNovaVendaQtd(idx, val);
                                        }
                                      }}
                                      className="w-8 h-5 text-[10px] font-bold text-center border-none bg-transparent focus-visible:ring-0 p-0 text-zinc-950 dark:text-zinc-100 font-mono"
                                    />
                                    <button
                                      type="button"
                                      onClick={() => handleIncrementNovaVendaQtd(idx, 1)}
                                      className="w-5 h-5 rounded bg-white dark:bg-zinc-800 flex items-center justify-center text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700"
                                    >
                                      <Plus className="w-2.5 h-2.5" />
                                    </button>
                                  </div>
                                </td>
                                <td className="px-2 py-2.5 text-right font-bold font-mono text-[#263532] dark:text-emerald-400">
                                  {fmtBRL(item.preco_unitario * item.quantidade)}
                                </td>
                                <td className="px-2 py-2.5 text-center">
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveNovaVendaItem(idx)}
                                    className="p-1 rounded text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/20"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-xl p-8 flex flex-col items-center justify-center text-center bg-white dark:bg-zinc-900/50 shadow-sm min-h-[220px]">
                      <div className="p-3 bg-[#EAF0EE] dark:bg-emerald-900/20 text-[#3A4F4A] dark:text-emerald-500 rounded-xl mb-3">
                        <ShoppingCart className="w-6 h-6" />
                      </div>
                      <h4 className="font-bold text-zinc-950 dark:text-zinc-100 text-sm">O carrinho está vazio</h4>
                      <p className="text-xs text-zinc-700 dark:text-zinc-300 mt-1 max-w-xs leading-relaxed font-semibold">Adicione produtos pelo painel de produtos para continuar.</p>
                    </div>
                  )}
                </div>

                {/* Sticky Summary & Action Buttons (Always visible on desktop, only Step 4 on mobile) */}
                <div className={cn(
                  "md:shrink-0 md:border-t md:border-zinc-200 md:dark:border-zinc-800 md:bg-white md:dark:bg-zinc-900/50 p-4 space-y-4",
                  isMobile ? (currentStep === 4 ? "block" : "hidden") : "block"
                )}>
                  {/* Financial Summary */}
                  <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-3 space-y-2 shadow-xs">
                    <div className="flex justify-between items-center text-xs font-bold text-zinc-700 dark:text-zinc-300">
                      <span>Itens lançados:</span>
                      <span className="font-mono text-zinc-950 dark:text-zinc-100 font-black">
                        {novaVendaItens.length}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-xs font-bold text-zinc-700 dark:text-zinc-300">
                      <span>Subtotal:</span>
                      <span className="font-mono text-zinc-955 dark:text-zinc-100 font-black">
                        {fmtBRL(novaVendaItens.reduce((acc, item) => acc + (item.preco_unitario * item.quantidade), 0))}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-xs font-bold text-zinc-700 dark:text-zinc-300">
                      <span>Desconto:</span>
                      <span className="font-mono text-zinc-955 dark:text-zinc-100 font-black">{fmtBRL(0)}</span>
                    </div>
                    <div className="flex justify-between items-center text-xs font-bold text-zinc-700 dark:text-zinc-300">
                      <span>Acréscimos:</span>
                      <span className="font-mono text-zinc-955 dark:text-zinc-100 font-black">{fmtBRL(0)}</span>
                    </div>
                    <div className="border-t border-zinc-150 dark:border-zinc-800 pt-2 flex justify-between items-center">
                      <span className="text-xs font-black text-zinc-950 dark:text-zinc-100 uppercase tracking-wider">Total Geral:</span>
                      <span className="font-black text-xl text-[#1e2a27] dark:text-emerald-350 font-mono">
                        {fmtBRL(novaVendaItens.reduce((acc, item) => acc + (item.preco_unitario * item.quantidade), 0))}
                      </span>
                    </div>
                  </div>

                  {/* Desktop Action Buttons */}
                  {!isMobile && (
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        className="w-1/3 h-11 border-zinc-255 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 font-bold text-xs"
                        onClick={() => setOpen(false)}
                      >
                        Cancelar (Esc)
                      </Button>
                      <Button
                        data-testid="save-venda-btn"
                        onClick={() => handleCreateNovaVenda()}
                        disabled={novaVendaItens.length === 0}
                        className="w-2/3 h-11 bg-[#84A59D] hover:bg-[#6F9189] dark:bg-emerald-600 dark:hover:bg-emerald-700 text-white font-bold text-xs shadow-md transition-transform hover:scale-[1.01]"
                      >
                        <CreditCard className="w-4 h-4 mr-1.5" /> Ir para pagamento (F4)
                      </Button>
                    </div>
                  )}
                </div>
              </div>

            </div>

            {/* Mobile Navigation Footer (Visible only on mobile) */}
            {isMobile && (
              <div className="px-4 py-3 border-t border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 flex justify-between gap-3 shrink-0">
                {currentStep > 1 ? (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setCurrentStep(currentStep - 1)}
                    className="w-1/2 h-11 border-zinc-200 text-zinc-700 dark:text-zinc-300 font-bold text-xs"
                  >
                    <ChevronLeft className="w-4 h-4 mr-1" /> Voltar
                  </Button>
                ) : (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setOpen(false)}
                    className="w-1/2 h-11 border-zinc-200 text-zinc-750 font-bold text-xs"
                  >
                    Cancelar
                  </Button>
                )}

                {currentStep < 4 ? (
                  <Button
                    type="button"
                    onClick={() => {
                      if (currentStep === 1 && !form.colaborador_id) {
                        toast.error("Selecione o profissional responsável.");
                        return;
                      }
                      if (currentStep === 2 && novaVendaItens.length === 0) {
                        toast.error("Adicione pelo menos um produto ao carrinho.");
                        return;
                      }
                      setCurrentStep(currentStep + 1);
                    }}
                    className="w-1/2 h-11 bg-[#84A59D] hover:bg-[#6F9189] text-white font-bold text-xs"
                  >
                    Avançar <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                ) : (
                  <Button
                    onClick={() => handleCreateNovaVenda()}
                    disabled={novaVendaItens.length === 0}
                    className="w-1/2 h-11 bg-[#84A59D] hover:bg-[#6F9189] text-white font-bold text-xs"
                  >
                    <CreditCard className="w-4 h-4 mr-1" /> Pagar (F4)
                  </Button>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>
      } />

      {/* Search and Filters Bar */}
      <div className="bg-white border border-zinc-200 rounded-xl p-4 mb-6 shadow-sm space-y-4">
        {/* Row 1: Date Filters */}
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center w-full lg:w-auto">
            <div className="w-full sm:w-64">
              <Label className="text-xs text-zinc-700 dark:text-zinc-300 font-bold mb-1 block">Pesquisa</Label>
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
              <Label className="text-xs text-zinc-700 dark:text-zinc-300 font-bold mb-1 block">Data Inicial</Label>
              <Input
                type="date"
                className="w-full sm:w-44 focus:ring-2 focus:ring-[#84A59D] transition-all bg-transparent text-foreground border-input"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div className="w-full sm:w-auto">
              <Label className="text-xs text-zinc-700 dark:text-zinc-300 font-bold mb-1 block">Data Final</Label>
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
            <Label className="text-xs text-zinc-700 dark:text-zinc-300 font-bold mb-1 block">Filtrar por Produto</Label>
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
            <Label className="text-xs text-zinc-700 dark:text-zinc-300 font-bold mb-1 block">Filtrar por Vendedor</Label>
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
            <Label className="text-xs text-zinc-700 dark:text-zinc-300 font-bold mb-1 block">Filtrar por Cliente</Label>
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
                    <Button
                      size="default"
                      variant="outline"
                      className="h-11 px-4 rounded-xl shadow-sm font-semibold border-zinc-200 text-[#3A4F4A] hover:bg-[#EAF0EE]"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (!canLancarPagamento) {
                          toast.error("Você não tem permissão para lançar pagamentos.");
                          return;
                        }
                        nav(`/vendas-diretas/${v.id}/pagamento`);
                      }}
                      data-testid={`pay-venda-mob-${v.id}`}
                    >
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
                        onClick={(e) => {
                          e.stopPropagation();
                          if (!canLancarPagamento) {
                            toast.error("Você não tem permissão para lançar pagamentos.");
                            return;
                          }
                          nav(`/vendas-diretas/${v.id}/pagamento`);
                        }}
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

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4 p-4 border border-zinc-200 rounded-xl bg-white dark:bg-zinc-900 shadow-sm mt-4">
              <div className="text-xs text-zinc-500 dark:text-zinc-400">
                Mostrando <strong>{(page - 1) * 50 + 1}</strong> a <strong>{Math.min(page * 50, totalRecords)}</strong> de <strong>{totalRecords}</strong> registros
              </div>
              <Pagination className="mx-0 w-auto">
                <PaginationContent>
                  <PaginationItem>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      disabled={page === 1}
                      onClick={() => setPage(page - 1)}
                      className="flex items-center gap-1 text-xs"
                    >
                      <ChevronLeft className="h-4 w-4" />
                      <span>Anterior</span>
                    </Button>
                  </PaginationItem>

                  {Array.from({ length: totalPages }, (_, idx) => idx + 1).map((p) => {
                    if (p === 1 || p === totalPages || (p >= page - 2 && p <= page + 2)) {
                      return (
                        <PaginationItem key={p}>
                          <Button
                            type="button"
                            variant={p === page ? "outline" : "ghost"}
                            size="sm"
                            onClick={() => setPage(p)}
                            className={`h-8 w-8 text-xs p-0 ${p === page ? 'font-bold border-zinc-300 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-800' : ''}`}
                          >
                            {p}
                          </Button>
                        </PaginationItem>
                      );
                    } else if (p === page - 3 || p === page + 3) {
                      return (
                        <PaginationItem key={p}>
                          <span className="px-2 text-zinc-400 text-xs">...</span>
                        </PaginationItem>
                      );
                    }
                    return null;
                  })}

                  <PaginationItem>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      disabled={page === totalPages}
                      onClick={() => setPage(page + 1)}
                      className="flex items-center gap-1 text-xs"
                    >
                      <span>Próximo</span>
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            </div>
          )}
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
                          .filter(p => p.quantidade_estoque > 0 && !p.uso_exclusivo_servicos)
                          .map(p => {
                            const qtyPerUnit = Number(p.quantidade_por_unidade || 0);
                            const qtyStr = qtyPerUnit > 0 
                              ? `${Number((p.quantidade_estoque / qtyPerUnit).toFixed(2))} ${p.unidade_medida || 'un'} (${Number(p.quantidade_estoque.toFixed(3))} ${p.unidade_medida_insumo || 'un'})`
                              : `${Number(p.quantidade_estoque.toFixed(3))} ${p.unidade_medida || 'un'}`;
                            return {
                              value: p.id,
                              label: `${p.nome} — ${fmtBRL(p.preco_venda)} (Estoque: ${qtyStr})`
                            };
                          })
                        }
                        value=""
                        onValueChange={async (prodId) => {
                          if (!prodId) return;
                          const prod = produtos.find(p => p.id === prodId);
                          if (prod) {
                            setCarrinhoSaving(true);
                            const add = async (force = false) => {
                              try {
                                await http.post(`/vendas-diretas/${carrinhoVendaId}/carrinho/itens`, {
                                  produto_id: prodId,
                                  quantidade: 1,
                                  preco_unitario: prod.preco_venda,
                                  forcar_venda: force
                                });
                                toast.success(`"${prod.nome}" adicionado!`);
                                await loadCarrinho(carrinhoVendaId);
                                load();
                              } catch (e) {
                                if (e.response?.data?.code === 'ESTOQUE_INSUFICIENTE') {
                                  const confirmResult = window.confirm(
                                    `${e.response.data.detail}\n\nDeseja continuar mesmo deixando o estoque negativo?`
                                  );
                                  if (confirmResult) {
                                    await add(true);
                                  }
                                } else {
                                  toast.error(e.response?.data?.detail || "Erro ao adicionar produto.");
                                }
                              }
                            };
                            await add();
                            setCarrinhoSaving(false);
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
                          <div className="flex items-center gap-2 mt-0.5">
                            {configSistema?.permitir_alterar_preco_produto_venda && !carrinhoData.bloqueado ? (
                              <div className="flex items-center gap-1">
                                <span className="text-xs text-zinc-500 font-semibold">R$</span>
                                <input
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  defaultValue={item.preco_unitario}
                                  onBlur={async (e) => {
                                    const val = Number(e.target.value);
                                    if (!isNaN(val) && val >= 0 && val !== item.preco_unitario) {
                                      setCarrinhoSaving(true);
                                      try {
                                        await http.put(`/vendas-diretas/${carrinhoVendaId}/carrinho/itens/${idx}`, {
                                          quantidade: item.quantidade,
                                          preco_unitario: val
                                        });
                                        await loadCarrinho(carrinhoVendaId);
                                        load();
                                      } catch (err) {
                                        toast.error("Erro ao atualizar preço unitário.");
                                      } finally {
                                        setCarrinhoSaving(false);
                                      }
                                    }
                                  }}
                                  className="w-20 h-6 text-xs font-bold border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-950 rounded px-1 text-right font-mono"
                                />
                                <span className="text-xs text-zinc-500 font-semibold">/ un</span>
                              </div>
                            ) : (
                              <p className="text-xs text-zinc-500 dark:text-zinc-400 font-semibold">
                                {fmtBRL(item.preco_unitario)} / un
                              </p>
                            )}
                          </div>
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
                  onClick={() => {
                    if (!canLancarPagamento) {
                      toast.error("Você não tem permissão para lançar pagamentos.");
                      return;
                    }
                    setCarrinhoOpen(false);
                    nav(`/vendas-diretas/${carrinhoVendaId}/pagamento`);
                  }}
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