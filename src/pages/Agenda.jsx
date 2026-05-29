import { useState, useEffect, useMemo, useRef } from "react";
import http from "../api";
import { PageHeader, EmptyState } from "../components/Page";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Textarea } from "../components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "../components/ui/dialog";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "../components/ui/select";
import StatusBadge, { STATUS_LABELS } from "../components/StatusBadge";
import { Calendar as CalIcon, Plus, ChevronLeft, ChevronRight, Trash2, Edit2, CreditCard, CalendarDays, X, User, Users, Clock, FileText, Scissors, CheckCircle2, History, Package, PlusCircle, ShoppingCart } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import AgendaTimeline from "../components/AgendaTimeline";
import { useAuth } from "../auth";
import SearchableSelect from "../components/SearchableSelect";
import AuditModal from "../components/AuditModal";
import PasswordConfirmDialog from "../components/PasswordConfirmDialog";
import "./Agenda.css";

const fmtBRL = (n) => (n || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
export const fmtHour = (s) => new Date(s.replace('Z', '')).toLocaleTimeString("pt-BR", { timeZone: "America/Recife", hour: "2-digit", minute: "2-digit" });

const toDateInput = (d) => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const toDatetimeLocalInput = (dtStr) => {
  if (!dtStr) return "";
  const raw = typeof dtStr === 'string' ? dtStr : dtStr.toISOString();
  const d = new Date(raw.replace('Z', ''));
  if (isNaN(d.getTime())) return "";
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const hours = String(d.getHours()).padStart(2, "0");
  const minutes = String(d.getMinutes()).padStart(2, "0");
  return `${year}-${month}-${day}T${hours}:${minutes}`;
};

export default function Agenda() {
  const { user: me } = useAuth();
  const today = useMemo(() => new Date(), []);
  const [data, setData] = useState(toDateInput(today));
  const [view, setView] = useState("dia");
  const [monthCursor, setMonthCursor] = useState({ y: today.getFullYear(), m: today.getMonth() + 1 });
  const [agendamentos, setAgendamentos] = useState([]);
  const [monthEvents, setMonthEvents] = useState({});
  const [clientes, setClientes] = useState([]);
  const [servicos, setServicos] = useState([]);
  const [colaboradores, setColaboradores] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [selectedAddCategory, setSelectedAddCategory] = useState("all");
  const [serviceSearch, setServiceSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(null);
  const [openSenha, setOpenSenha] = useState(false);
  const [senhaData, setSenhaData] = useState({ agendamento_id: null, novo_status: null, email: "", senha: "" });
  const [carregandoSenha, setCarregandoSenha] = useState(false);
  const [openResumo, setOpenResumo] = useState(false);
  const [resumoAgendamento, setResumoAgendamento] = useState(null);
  const [profsDialogOpen, setProfsDialogOpen] = useState(false);
  const [missingProfs, setMissingProfs] = useState([]);
  const [pendingAgendamento, setPendingAgendamento] = useState(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [pastDateConfirmOpen, setPastDateConfirmOpen] = useState(false);
  const [auditOpen, setAuditOpen] = useState(false);
  const nav = useNavigate();

  const [openNewClient, setOpenNewClient] = useState(false);
  const [clientForm, setClientForm] = useState({ nome: "", telefone: "", email: "" });
  const [savingClient, setSavingClient] = useState(false);
  const [openEditSenha, setOpenEditSenha] = useState(false);
  const [pendingEditAgendamento, setPendingEditAgendamento] = useState(null);
  const [authCredentials, setAuthCredentials] = useState(null);
  const [conflictConfirmOpen, setConflictConfirmOpen] = useState(false);
  const [conflictMessage, setConflictMessage] = useState("");

  const [produtos, setProdutos] = useState([]);
  const [utilizedProductsOpen, setUtilizedProductsOpen] = useState(false);
  const [selectedItemIndex, setSelectedItemIndex] = useState(null);
  const [tempUtilizedProducts, setTempUtilizedProducts] = useState([]);
  const [agForUtilized, setAgForUtilized] = useState(null);
  const [selectedProdToAdd, setSelectedProdToAdd] = useState("");
  const [utilizedAuthOpen, setUtilizedAuthOpen] = useState(false);
  const [utilizedAuthCredentials, setUtilizedAuthCredentials] = useState(null);
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [selectedInsumos, setSelectedInsumos] = useState("all");
  const [selectedColaborador, setSelectedColaborador] = useState("all");

  const getInsumosStatus = (a) => {
    let hasRequired = false;
    let hasPending = false;

    for (const item of (a.itens || [])) {
      const s = servicos.find(x => x.id === item.servico_id);
      const linkedCount = s?.produtos_vinculados?.length || 0;
      if (linkedCount > 0) {
        hasRequired = true;
        const utilizedCount = item.produtos_utilizados?.length || 0;
        if (utilizedCount === 0) {
          hasPending = true;
        }
      }
    }

    if (!hasRequired) return "none";
    return hasPending ? "pending" : "launched";
  };

  const filteredAgendamentos = useMemo(() => {
    return agendamentos.filter(a => {
      if (selectedStatus !== "all" && a.status !== selectedStatus) return false;

      if (selectedInsumos !== "all") {
        const insumosStatus = getInsumosStatus(a);
        if (selectedInsumos === "pending" && insumosStatus !== "pending") return false;
        if (selectedInsumos === "launched" && insumosStatus !== "launched") return false;
      }

      if (selectedColaborador !== "all") {
        const itens = a.itens || [];
        if (selectedColaborador === "none") {
          // Show only appointments where ALL items have no collaborator
          const hasAnyColab = itens.some(i => i.colaborador_id && i.colaborador_id !== "none");
          if (hasAnyColab) return false;
        } else {
          // Show only appointments where at least one item belongs to this collaborator
          const hasColab = itens.some(i => i.colaborador_id === selectedColaborador);
          if (!hasColab) return false;
        }
      }

      return true;
    });
  }, [agendamentos, selectedStatus, selectedInsumos, selectedColaborador, servicos]);

  const openUtilizedProducts = (agendamento, itemIndex) => {
    const item = agendamento.itens[itemIndex];
    const s = servicos.find(x => x.id === item.servico_id);
    
    // Get all linked product IDs
    const linkedProductIds = (s?.produtos_vinculados || []).map(pv => pv.produto_id);
    
    // Get all currently saved utilized product IDs
    const savedUtilized = item.produtos_utilizados || [];
    const savedProductIds = savedUtilized.map(pu => pu.produto_id);
    
    // Combine both lists uniquely
    const allProductIds = Array.from(new Set([...linkedProductIds, ...savedProductIds]));
    
    // Build rows for spreadsheet-like grid
    const rows = allProductIds.map(pid => {
      const prod = produtos.find(p => p.id === pid);
      const saved = savedUtilized.find(pu => pu.produto_id === pid);
      const savedCusto = (saved && saved.custo_unitario != null) ? Number(saved.custo_unitario) : null;
      const finalCusto = (savedCusto !== null && savedCusto > 0) ? savedCusto : Number(prod?.custo_unitario || 0);
      
      return {
        produto_id: pid,
        nome: prod?.nome || "Produto desconhecido",
        unidade: prod?.unidade_medida || "un",
        quantidade_estoque: prod?.quantidade_estoque || 0,
        custo_unitario: finalCusto,
        quantidade: saved ? String(saved.quantidade || 0) : "",
        isLinked: linkedProductIds.includes(pid)
      };
    });

    setAgForUtilized(agendamento);
    setSelectedItemIndex(itemIndex);
    setTempUtilizedProducts(rows);
    setSelectedProdToAdd("");
    setUtilizedProductsOpen(true);
  };

  const handleAddExtraProduct = (prodId) => {
    if (tempUtilizedProducts.some(row => row.produto_id === prodId)) {
      toast.error("Este produto já está na lista.");
      return;
    }
    const prod = produtos.find(p => p.id === prodId);
    if (!prod) return;

    setTempUtilizedProducts([
      ...tempUtilizedProducts,
      {
        produto_id: prodId,
        nome: prod.nome,
        unidade: prod.unidade_medida || "un",
        quantidade_estoque: prod.quantidade_estoque,
        custo_unitario: Number(prod.custo_unitario || 0),
        quantidade: "",
        isLinked: false
      }
    ]);
    setSelectedProdToAdd("");
  };

  const handleUpdateTempProductQty = (index, val) => {
    setTempUtilizedProducts(tempUtilizedProducts.map((p, i) => i === index ? { ...p, quantidade: val } : p));
  };

  const handleRemoveTempProduct = (index) => {
    setTempUtilizedProducts(tempUtilizedProducts.filter((_, i) => i !== index));
  };

  const saveUtilizedProductsWithCreds = async (creds) => {
    if (!agForUtilized || selectedItemIndex === null) return;
    
    // Filter to only include products with utilized quantity > 0
    const activeConsumption = tempUtilizedProducts
      .filter(row => Number(row.quantidade || 0) > 0)
      .map(row => ({
        produto_id: row.produto_id,
        quantidade: Number(row.quantidade || 0),
        custo_unitario: row.custo_unitario
      }));

    try {
      const updatedItens = agForUtilized.itens.map((item, idx) => {
        if (idx === selectedItemIndex) {
          return {
            ...item,
            produtos_utilizados: activeConsumption
          };
        }
        return item;
      });

      const payload = {
        cliente_id: agForUtilized.cliente_id,
        data_hora: agForUtilized.data_hora,
        observacoes: agForUtilized.observacoes || "",
        itens_selecionados: updatedItens.map(x => ({
          servico_id: x.servico_id,
          colaborador_id: x.colaborador_id,
          auxiliar_id: x.auxiliar_id,
          produtos_utilizados: x.produtos_utilizados || [],
          valor: x.valor,
          valor_original: x.valor_original
        }))
      };

      const params = creds ? { params: { ...creds, only_insumos: true } } : { params: { only_insumos: true } };
      const res = await http.put(`/agendamentos/${agForUtilized.id}`, payload, params);
      
      toast.success("Consumo de produtos atualizado com sucesso!");
      setUtilizedProductsOpen(false);
      
      loadDay(data);
      loadMonth(monthCursor.y, monthCursor.m);
      
      const refreshedAg = res.data;
      setResumoAgendamento(refreshedAg);
    } catch (e) {
      const errorMsg = e.response?.data?.detail || "Erro ao salvar consumo de produtos";
      toast.error(errorMsg);
    }
  };

  const saveUtilizedProducts = async () => {
    await saveUtilizedProductsWithCreds(utilizedAuthCredentials);
  };

  const saveNewClient = async () => {
    if (!clientForm.nome || !clientForm.nome.trim()) {
      toast.error("Nome do cliente é obrigatório");
      return;
    }
    setSavingClient(true);
    try {
      const res = await http.post("/clientes", clientForm);
      const newClient = res.data;
      toast.success("Cliente cadastrado com sucesso!");

      const r = await http.get("/clientes");
      setClientes(r.data || []);

      setForm(f => ({ ...f, cliente_id: newClient.id }));
      setOpenNewClient(false);
    } catch (e) {
      toast.error(e.response?.data?.detail || "Erro ao cadastrar cliente");
    } finally {
      setSavingClient(false);
    }
  };

  const [now, setNow] = useState(new Date());
  const timelineScrollRef = useRef(null);

  useEffect(() => {
    const timer = setInterval(() => {
      setNow(new Date());
    }, 10000);
    return () => clearInterval(timer);
  }, []);

  const isSelectedDayToday = useMemo(() => {
    const todayStr = toDateInput(new Date());
    return data === todayStr;
  }, [data]);

  const HOUR_HEIGHT = 80;

  const currentTimeTop = useMemo(() => {
    if (!isSelectedDayToday) return 0;
    const hrs = now.getHours();
    const mins = now.getMinutes();
    return ((hrs * 60 + mins) * HOUR_HEIGHT) / 60;
  }, [now, isSelectedDayToday]);

  // Auto scroll to current time on mount or day change
  useEffect(() => {
    if (timelineScrollRef.current) {
      if (isSelectedDayToday) {
        const hrs = new Date().getHours();
        const scrollPos = Math.max(0, (hrs - 2) * HOUR_HEIGHT);
        timelineScrollRef.current.scrollTop = scrollPos;
      } else {
        // Scroll to standard shift hours (e.g. 08:00)
        timelineScrollRef.current.scrollTop = 8 * HOUR_HEIGHT;
      }
    }
  }, [data, isSelectedDayToday]);

  // Parse agendamentos to absolute visual blocks with overlap handling
  const timelineBlocks = useMemo(() => {
    const parsed = agendamentos.map((a) => {
      const d = new Date(a.data_hora);
      const startMin = d.getHours() * 60 + d.getMinutes();
      // Calculate duration of the appointment
      const dur = a.itens?.reduce((acc, item) => {
        const s = servicos.find(x => x.id === item.servico_id);
        return acc + (s?.duracao_minutos || 0);
      }, 0) || 60;

      return {
        ...a,
        startMin,
        dur,
        top: (startMin * HOUR_HEIGHT) / 60,
        height: Math.max((dur * HOUR_HEIGHT) / 60, 48),
      };
    });

    // Sort by start time to arrange overlapping columns
    const sorted = [...parsed].sort((x, y) => x.startMin - y.startMin);

    const cols = [];
    sorted.forEach((event) => {
      let colIndex = 0;
      while (colIndex < cols.length) {
        const lastInCol = cols[colIndex][cols[colIndex].length - 1];
        if (lastInCol.startMin + lastInCol.dur <= event.startMin) {
          break;
        }
        colIndex++;
      }
      if (!cols[colIndex]) {
        cols[colIndex] = [];
      }
      cols[colIndex].push(event);
      event.colIndex = colIndex;
    });

    // Add total column count to each event for width subdivision
    sorted.forEach((event) => {
      let colCount = 1;
      cols.forEach((col, idx) => {
        const overlaps = col.some((other) => {
          if (other.id === event.id) return false;
          return (
            event.startMin < other.startMin + other.dur &&
            event.startMin + event.dur > other.startMin
          );
        });
        if (overlaps) {
          colCount = Math.max(colCount, idx + 1);
        }
      });
      event.colCount = Math.max(colCount, event.colIndex + 1);
    });

    return sorted;
  }, [agendamentos, servicos]);

  const formatSelectedDate = (dateStr) => {
    if (!dateStr) return "";
    const parts = dateStr.split("-");
    const date = new Date(parts[0], parts[1] - 1, parts[2]);
    const formatted = date.toLocaleDateString("pt-BR", { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    return formatted.charAt(0).toUpperCase() + formatted.slice(1);
  };

  const loadDay = (d) => http.get("/agendamentos", { params: { data: d } }).then((r) => setAgendamentos(r.data || []));

  const loadMonth = (y, m) => {
    const ms = `${y}-${String(m).padStart(2, "0")}`;
    return http.get("/agendamentos", { params: { mes: ms } }).then((r) => {
      const map = {};
      const dados = r.data || [];
      dados.forEach((a) => {
        const day = a.data_hora.slice(8, 10);
        map[day] = (map[day] || 0) + 1;
      });
      setMonthEvents(map);
    });
  };

  useEffect(() => {
    Promise.all([
      loadDay(data),
      loadMonth(today.getFullYear(), today.getMonth() + 1),
      http.get("/clientes").then((r) => setClientes(r.data || [])),
      http.get("/servicos").then((r) => setServicos(r.data || [])),
      http.get("/colaboradores").then((r) => setColaboradores(r.data || [])),
      http.get("/categorias").then((r) => setCategorias(r.data || [])),
      http.get("/produtos").then((r) => setProdutos(r.data || [])),
    ]);
  }, []);

  useEffect(() => {
    loadDay(data);
  }, [data]);

  useEffect(() => {
    loadMonth(monthCursor.y, monthCursor.m);
  }, [monthCursor]);

  const handleConfirmEditConcluido = async (email, password) => {
    try {
      await http.get(`/agendamentos/${pendingEditAgendamento.id}`, { params: { email, password } });
      setAuthCredentials({ email, password });
      setForm({
        id: pendingEditAgendamento.id,
        cliente_id: pendingEditAgendamento.cliente_id,
        data_hora: toDatetimeLocalInput(pendingEditAgendamento.data_hora),
        itens_selecionados: pendingEditAgendamento.itens || [],
        observacoes: pendingEditAgendamento.observacoes || ""
      });
      setOpen(true);
      setOpenEditSenha(false);
      setPendingEditAgendamento(null);
    } catch (e) {
      throw new Error(e.response?.data?.detail || "Erro de autorização. Verifique usuário, senha e permissões.");
    }
  };

  const doSave = async (ignorarConflito = false) => {
    try {
      const payload = ignorarConflito ? { ...form, ignorar_conflito: true } : form;
      if (form.id) {
        await http.put(`/agendamentos/${form.id}`, payload, authCredentials ? { params: authCredentials } : undefined);
        toast.success("Agendamento atualizado");
      } else {
        await http.post("/agendamentos", payload);
        toast.success("Agendamento criado");
      }
      setOpen(false);
      setForm(null);
      setAuthCredentials(null);
      loadDay(data);
      loadMonth(monthCursor.y, monthCursor.m);
    } catch (e) {
      const errorMsg = e.response?.data?.detail || "Erro ao salvar agendamento";
      if (errorMsg.includes("Conflito de horário")) {
        setConflictMessage(errorMsg);
        setConflictConfirmOpen(true);
      } else {
        toast.error(errorMsg);
      }
    }
  };

  const save = async () => {
    if (!form.cliente_id) {
      toast.error("Selecione um cliente");
      return;
    }
    if (!form.data_hora) {
      toast.error("Selecione data e hora");
      return;
    }
    if (form.itens_selecionados.length === 0) {
      toast.error("Adicione pelo menos um serviço");
      return;
    }
    for (const item of form.itens_selecionados) {
      if (item.colaborador_id && item.auxiliar_id && item.colaborador_id === item.auxiliar_id) {
        const s = servicos.find(x => x.id === item.servico_id);
        toast.error(`O colaborador principal e o auxiliar não podem ser a mesma pessoa. (Serviço: ${s?.nome || ""})`);
        return;
      }
    }

    // Verificar se a data é no passado (tolerância de 5 minutos)
    const dataAgendamento = new Date(form.data_hora);
    const agora = new Date();
    if (dataAgendamento < new Date(agora.getTime() - 5 * 60000)) {
      setPastDateConfirmOpen(true);
      return;
    }

    await doSave();
  };

  const del = (id) => {
    if (!me?.pode_excluir_agendamento) {
      toast.error("Você não tem permissão para excluir agendamentos.");
      return;
    }
    setDeletingId(id);
    setDeleteConfirmOpen(true);
  };

  const confirmDelete = async () => {
    if (!deletingId) return;
    try {
      await http.delete(`/agendamentos/${deletingId}`);
      toast.success("Agendamento excluído");
      setDeleteConfirmOpen(false);
      setDeletingId(null);
      loadDay(data);
      loadMonth(monthCursor.y, monthCursor.m);
    } catch (e) {
      toast.error(e.response?.data?.detail || "Erro ao excluir agendamento");
    }
  };

  const changeStatus = async (id, status, agendamento) => {
    if (agendamento?.status === "concluido" && status !== "concluido") {
      setSenhaData({ agendamento_id: id, novo_status: status, email: "", senha: "" });
      setOpenSenha(true);
      return;
    }

    if (status === "concluido") {
      try {
        const agendamentoResponse = await http.get(`/agendamentos/${id}`);
        const agendData = agendamentoResponse.data;

        // Validar se todos os serviços possuem profissional
        const semProfs = (agendData.itens || []).filter(item => !item.colaborador_id || item.colaborador_id === "none");
        if (semProfs.length > 0) {
          setPendingAgendamento(agendData);
          setMissingProfs((agendData.itens || []).map(item => ({
            servico_id: item.servico_id,
            nome: item.nome,
            colaborador_id: item.colaborador_id && item.colaborador_id !== "none" ? item.colaborador_id : "",
            auxiliar_id: item.auxiliar_id && item.auxiliar_id !== "none" ? item.auxiliar_id : ""
          })));
          setProfsDialogOpen(true);
          return;
        }

        const totalPago = agendData.total_pago || 0;
        if (totalPago < agendData.valor_total - 0.01) {
          toast.error("Agendamento não está totalmente pago. Registre o pagamento antes de concluir.");
          setTimeout(() => {
            nav(`/agendamentos/${id}/pagamento`);
          }, 1500);
          return;
        }
        await http.post(`/agendamentos/${id}/status`, { status });
        toast.success("Agendamento concluído");
        loadDay(data);
        loadMonth(monthCursor.y, monthCursor.m);
      } catch (e) {
        const errorMsg = e.response?.data?.detail || e.message || "Erro ao atualizar status";
        console.error("Erro ao marcar como concluído:", e.response?.data);
        toast.error(errorMsg);
      }
      return;
    }

    try {
      await http.post(`/agendamentos/${id}/status`, { status });
      toast.success("Status atualizado");
      loadDay(data);
    } catch (e) {
      toast.error(e.response?.data?.detail || "Erro ao atualizar status");
    }
  };

  const confirmAndConclude = async () => {
    for (let p of missingProfs) {
      if (!p.colaborador_id || p.colaborador_id === "none") {
        toast.error(`Selecione o profissional principal para o serviço: ${p.nome}`);
        return;
      }
      if (p.auxiliar_id && p.auxiliar_id !== "none" && p.colaborador_id === p.auxiliar_id) {
        toast.error(`O colaborador principal e o auxiliar não podem ser a mesma pessoa. (Serviço: ${p.nome})`);
        return;
      }
    }

    try {
      const updatePayload = {
        cliente_id: pendingAgendamento.cliente_id,
        data_hora: pendingAgendamento.data_hora,
        observacoes: pendingAgendamento.observacoes || "",
        itens_selecionados: missingProfs.map(x => ({
          servico_id: x.servico_id,
          colaborador_id: x.colaborador_id,
          auxiliar_id: x.auxiliar_id === "none" ? null : x.auxiliar_id
        }))
      };

      await http.put(`/agendamentos/${pendingAgendamento.id}`, updatePayload);
      setProfsDialogOpen(false);
      toast.success("Profissionais associados com sucesso!");

      await changeStatus(pendingAgendamento.id, "concluido");
      setPendingAgendamento(null);
    } catch (e) {
      toast.error(e.response?.data?.detail || "Erro ao associar profissionais");
    }
  };

  const confirmarMudancaStatus = async () => {
    if (!senhaData.email) {
      toast.error("Digite seu email");
      return;
    }
    if (!senhaData.senha) {
      toast.error("Digite sua senha");
      return;
    }

    setCarregandoSenha(true);
    try {
      console.log("Alterando status com credenciais...");
      await http.post(`/agendamentos/${senhaData.agendamento_id}/status`, {
        status: senhaData.novo_status,
        senha: senhaData.senha
      });
      console.log("Status alterado com sucesso!");
      toast.success("Status atualizado com sucesso");
      setOpenSenha(false);
      setSenhaData({ agendamento_id: null, novo_status: null, email: "", senha: "" });
      loadDay(data);
      loadMonth(monthCursor.y, monthCursor.m);
      return;
    } catch (e) {
      let errorMsg = "Erro ao alterar status";
      if (e.response?.data?.detail) {
        errorMsg = typeof e.response.data.detail === "string" ? e.response.data.detail : JSON.stringify(e.response.data.detail);
      } else if (e.message) {
        errorMsg = e.message;
      }
      console.error("Erro ao alterar status:", errorMsg);
      toast.error(errorMsg);
    } finally {
      setCarregandoSenha(false);
    }
  };

  const addServico = (sid) => {
    const s = servicos.find(x => x.id === sid);
    if (!s) return;
    setForm(f => ({
      ...f,
      itens_selecionados: [
        ...f.itens_selecionados,
        {
          servico_id: sid,
          colaborador_id: "",
          auxiliar_id: "",
          valor: s.valor,
          valor_original: s.valor
        }
      ]
    }));
  };

  const updateItemValor = (index, val) => {
    setForm(f => {
      const itens = [...f.itens_selecionados];
      itens[index].valor = val === "" ? "" : Number(val);
      return { ...f, itens_selecionados: itens };
    });
  };

  const removeServico = (index) => {
    setForm(f => ({
      ...f,
      itens_selecionados: f.itens_selecionados.filter((_, i) => i !== index)
    }));
  };

  const updateItemColab = (index, cid) => {
    setForm(f => {
      const itens = [...f.itens_selecionados];
      if (cid && cid !== "none" && itens[index].auxiliar_id && cid === itens[index].auxiliar_id) {
        toast.error("O profissional principal não pode ser o mesmo que o auxiliar.");
        return f;
      }
      itens[index].colaborador_id = cid;
      return { ...f, itens_selecionados: itens };
    });
  };

  const updateItemAux = (index, cid) => {
    setForm(f => {
      const itens = [...f.itens_selecionados];
      if (cid && cid !== "none" && itens[index].colaborador_id && cid === itens[index].colaborador_id) {
        toast.error("O profissional auxiliar não pode ser o mesmo que o principal.");
        return f;
      }
      itens[index].auxiliar_id = cid;
      return { ...f, itens_selecionados: itens };
    });
  };

  const [observacoesResumo, setObservacoesResumo] = useState("");
  const [savingResumoObs, setSavingResumoObs] = useState(false);

  const openResumoModal = (a) => {
    setResumoAgendamento(a);
    setObservacoesResumo(a.observacoes || "");
    setOpenResumo(true);
  };

  const handleSaveResumoObs = async () => {
    if (!resumoAgendamento) return;
    setSavingResumoObs(true);
    try {
      await http.put(`/agendamentos/${resumoAgendamento.id}/observacoes`, {
        observacoes: observacoesResumo
      });
      toast.success("Observações salvas com sucesso!");
      setAgendamentos(prev => prev.map(x => x.id === resumoAgendamento.id ? { ...x, observacoes: observacoesResumo } : x));
      setResumoAgendamento(prev => ({ ...prev, observacoes: observacoesResumo }));
    } catch (e) {
      toast.error(e.response?.data?.detail || "Erro ao salvar observações");
    } finally {
      setSavingResumoObs(false);
    }
  };

  const openNew = () => {
    setForm({
      cliente_id: "",
      data_hora: new Date().toISOString().substring(0, 10) + 'T' + new Date().toLocaleTimeString().substring(0, 5),
      itens_selecionados: [],
      observacoes: ""
    });
    
    setOpen(true);
  };

  const openEdit = (a) => {
    if (a.status === "concluido") {
      setPendingEditAgendamento(a);
      setOpenEditSenha(true);
      return;
    }
    setAuthCredentials(null);
    setForm({
      id: a.id,
      cliente_id: a.cliente_id,
      data_hora: toDatetimeLocalInput(a.data_hora),
      itens_selecionados: a.itens || [],
      observacoes: a.observacoes || ""
    });
    setOpen(true);
  };

  const valorTotal = form?.itens_selecionados.reduce((sum, item) => {
    const s = servicos.find(x => x.id === item.servico_id);
    return sum + (item.valor !== undefined && item.valor !== null && item.valor !== "" ? Number(item.valor) : (s?.valor || 0));
  }, 0) || 0;

  const duracaoTotal = form?.itens_selecionados.reduce((sum, item) => {
    const s = servicos.find(x => x.id === item.servico_id);
    return sum + (s?.duracao_minutos || 0);
  }, 0) || 0;

  return (
    <div className="agenda-container w-full overflow-x-hidden">
      <PageHeader title="Agenda" />
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
        <div className="flex items-center flex-wrap gap-2 w-full sm:w-auto">
          <div className="view-toggle">
            <button className={`view-toggle-btn flex-1 sm:flex-none ${view === "dia" ? "view-toggle-btn-active" : ""}`} onClick={() => setView("dia")}>Dia</button>
            <button className={`view-toggle-btn flex-1 sm:flex-none ${view === "timeline" ? "view-toggle-btn-active" : ""}`} onClick={() => setView("timeline")}>Timeline</button>
            <button className={`view-toggle-btn flex-1 sm:flex-none ${view === "calendario" ? "view-toggle-btn-active" : ""}`} onClick={() => setView("calendario")}>Calendário</button>
          </div>
          <Button
            variant="outline"
            onClick={() => setAuditOpen(true)}
            className="flex items-center gap-1.5 text-xs font-semibold text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200 border border-zinc-200 dark:border-zinc-800 h-9"
          >
            <History className="w-3.5 h-3.5" />
            <span>Excluídos</span>
          </Button>
        </div>
        <button className="btn-primary w-full sm:w-auto justify-center" onClick={openNew}><Plus className="w-4 h-4 mr-2" /> Novo Agendamento</button>
      </div>

      {view !== "calendario" && (
        <div className="flex items-center gap-3 mb-4 flex-wrap bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-3 shadow-sm select-none">
          <div className="flex flex-col gap-1">
            <span className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">Data</span>
            <Input type="date" value={data} onChange={(e) => setData(e.target.value)} className="w-40 h-9 text-xs" />
          </div>
          <div className="flex flex-col gap-1 w-44">
            <span className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">Status do Serviço</span>
            <Select value={selectedStatus} onValueChange={setSelectedStatus}>
              <SelectTrigger className="h-9 text-xs bg-white dark:bg-zinc-950 border-zinc-250 dark:border-zinc-850">
                <SelectValue placeholder="Todos os Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os Status</SelectItem>
                <SelectItem value="agendado">Agendado</SelectItem>
                <SelectItem value="confirmado">Confirmado</SelectItem>
                <SelectItem value="em_andamento">Em andamento</SelectItem>
                <SelectItem value="concluido">Concluído</SelectItem>
                <SelectItem value="cancelado">Cancelado</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1 w-44">
            <span className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">Insumos/Produtos</span>
            <Select value={selectedInsumos} onValueChange={setSelectedInsumos}>
              <SelectTrigger className="h-9 text-xs bg-white dark:bg-zinc-950 border-zinc-250 dark:border-zinc-850">
                <SelectValue placeholder="Todos os Insumos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os Insumos</SelectItem>
                <SelectItem value="pending">Insumos Pendentes</SelectItem>
                <SelectItem value="launched">Insumos Lançados</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1 w-52">
            <span className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">Colaborador</span>
            <Select value={selectedColaborador} onValueChange={setSelectedColaborador}>
              <SelectTrigger className="h-9 text-xs bg-white dark:bg-zinc-950 border-zinc-250 dark:border-zinc-850">
                <SelectValue placeholder="Todos os Colaboradores" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os Colaboradores</SelectItem>
                <SelectItem value="none">Sem colaborador</SelectItem>
                {colaboradores.map(c => (
                  <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      )}

      {view === "dia" ? (
        <>
          {filteredAgendamentos.length === 0 ? (
            <EmptyState title="Sem agendamentos" description="Nenhum agendamento correspondente aos filtros aplicados" />
          ) : (
            <div className="space-y-2">
              {filteredAgendamentos.map((a) => (
                <div key={a.id} className="agenda-card fade-in cursor-pointer hover:shadow-md transition-all duration-200" onClick={() => openResumoModal(a)}>
                  <div className="agenda-time">
                    <div className="agenda-time-hour">{fmtHour(a.data_hora).split(":")[0]}</div>
                    <div className="agenda-time-duration">{fmtHour(a.data_hora)}</div>
                  </div>
                  <div className="agenda-content">
                    <div className="agenda-client-name flex items-center gap-2">
                      {a.cliente_nome}
                      {a.numero && (
                        <span className="text-[10px] font-mono font-bold bg-[#EAF0EE] text-[#3A4F4A] px-1.5 py-0.5 rounded">
                          {String(a.numero).padStart(6, "0")} | S
                        </span>
                      )}
                    </div>
                    <div className="agenda-services">{a.itens?.map((i) => servicos.find(s => s.id === i.servico_id)?.nome).join(", ")}</div>
                    <div className="agenda-professionals flex items-center gap-2 flex-wrap">
                      <span>{a.itens?.map((i) => colaboradores.find(c => c.id === i.colaborador_id)?.nome).filter(Boolean).join(", ")}</span>
                      {(() => {
                        const insStatus = getInsumosStatus(a);
                        if (insStatus === "pending") {
                          return (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 border border-amber-200/40 dark:border-amber-900/30">
                              <Package className="w-3 h-3 text-amber-500" /> Insumos Pendentes
                            </span>
                          );
                        }
                        if (insStatus === "launched") {
                          return (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200/40 dark:border-emerald-900/30">
                              <Package className="w-3 h-3 text-emerald-500" /> Insumos Lançados
                            </span>
                          );
                        }
                        return null;
                      })()}
                    </div>
                  </div>
                  <div className="agenda-price">
                    <div className="agenda-price-value">{fmtBRL(a.valor_total)}</div>
                    <div className="mt-1"><StatusBadge status={a.status} /></div>
                  </div>
                  <div className="agenda-actions" onClick={(e) => e.stopPropagation()}>
                    <Select value={a.status || "agendado"} onValueChange={(v) => changeStatus(a.id, v, a)}>
                      <SelectTrigger className="w-36 h-8 text-xs" data-testid={`status-select-${a.id}`}><SelectValue /></SelectTrigger>
                      <SelectContent>{Object.entries(STATUS_LABELS).filter(([k]) => k && k.trim()).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
                    </Select>
                    <Button size="sm" variant="ghost" onClick={() => nav(`/agendamentos/${a.id}/pagamento`)} title="Pagamento"><CreditCard className="w-4 h-4" /></Button>
                    {me && (
                      <Button
                        size="sm"
                        variant="ghost"
                        title={a.status === "concluido" ? "Não é permitido realizar vendas diretas para agendamento pago" : "Nova venda direta para este cliente"}
                        disabled={a.status === "concluido"}
                        onClick={() => nav(`/vendas-diretas?cliente_id=${a.cliente_id}&from=agenda`)}
                        className={`text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-950/30 ${
                          a.status === "concluido" ? "opacity-50 cursor-not-allowed text-zinc-400 hover:text-zinc-400 hover:bg-transparent" : ""
                        }`}
                      >
                        <ShoppingCart className="w-4 h-4" />
                      </Button>
                    )}
                    <Button size="sm" variant="ghost" onClick={() => openEdit(a)}><Edit2 className="w-4 h-4" /></Button>
                    <Button size="sm" variant="ghost" onClick={() => del(a.id)}><Trash2 className="w-4 h-4 text-rose-500" /></Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      ) : view === "timeline" ? (
        <AgendaTimeline data={data} selectedStatus={selectedStatus} selectedInsumos={selectedInsumos} selectedColaborador={selectedColaborador} servicos={servicos} colaboradores={colaboradores} onCardClick={openResumoModal} />
      ) : (
        <>
          <div className="flex items-center gap-2 mb-4">
            <Button size="sm" variant="outline" onClick={() => setMonthCursor(m => ({ ...m, m: m.m === 1 ? 12 : m.m - 1, y: m.m === 1 ? m.y - 1 : m.y }))}><ChevronLeft className="w-4 h-4" /></Button>
            <span className="text-sm font-semibold text-center min-w-[150px]" style={{ color: "#3A4F4A" }}>{new Date(monthCursor.y, monthCursor.m - 1).toLocaleDateString("pt-BR", { month: "long", year: "numeric" })}</span>
            <Button size="sm" variant="outline" onClick={() => setMonthCursor(m => ({ ...m, m: m.m === 12 ? 1 : m.m + 1, y: m.m === 12 ? m.y + 1 : m.y }))}><ChevronRight className="w-4 h-4" /></Button>
          </div>
          <div className="month-grid">
            <div className="weekday-header">Dom</div>
            <div className="weekday-header">Seg</div>
            <div className="weekday-header">Ter</div>
            <div className="weekday-header">Qua</div>
            <div className="weekday-header">Qui</div>
            <div className="weekday-header">Sex</div>
            <div className="weekday-header">Sab</div>
            {(() => {
              const firstDay = new Date(monthCursor.y, monthCursor.m - 1, 1).getDay();
              const daysInMonth = new Date(monthCursor.y, monthCursor.m, 0).getDate();
              const days = [];
              for (let i = 0; i < firstDay; i++) days.push(null);
              for (let i = 1; i <= daysInMonth; i++) days.push(i);
              return days.map((day, idx) => {
                if (!day) return <div key={`empty-${idx}`}></div>;
                const isToday = day === today.getDate() && monthCursor.m === today.getMonth() + 1 && monthCursor.y === today.getFullYear();
                const hasEvents = monthEvents[String(day).padStart(2, "0")] > 0;
                return (
                  <button
                    key={day}
                    onClick={() => {
                      setData(toDateInput(new Date(monthCursor.y, monthCursor.m - 1, day)));
                      setView("dia");
                    }}
                    className={`month-day ${isToday ? "month-day-today" : ""}`}
                  >
                    <div className="month-day-number">{day}</div>
                    {hasEvents && (
                      <div className="event-badge">
                        <CalendarDays className="w-3 h-3" />
                        {monthEvents[String(day).padStart(2, "0")]}
                      </div>
                    )}
                  </button>
                );
              });
            })()}
          </div>
        </>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="dialog-content w-[95vw] max-w-[95vw] sm:max-w-3xl rounded-2xl dark:bg-zinc-900 dark:border-zinc-800 p-5 sm:p-6" aria-describedby="dialog-agendamento">
          <DialogHeader className="dialog-header">
            <DialogTitle className="dialog-title">{form?.id ? "Editar Agendamento" : "Novo Agendamento"}</DialogTitle>
          </DialogHeader>
          <div id="dialog-agendamento" className="sr-only">Formulario para criar ou editar agendamento</div>
          {form && (
            <div className="dialog-body">
              <div className="grid-2 mb-4">
                <div className="form-group">
                  <Label className="form-label">Cliente *</Label>
                  <div className="flex gap-2">
                    <SearchableSelect
                      placeholder="Selecione um cliente"
                      searchPlaceholder="Pesquisar cliente pelo nome..."
                      triggerTestId="ag-cliente"
                      className="flex-1"
                      options={clientes
                        .filter(c => c.id && c.id.trim())
                        .map(c => ({
                          value: c.id,
                          label: c.telefone ? `${c.nome} — ${c.telefone}` : c.nome
                        }))
                      }
                      value={form.cliente_id}
                      onValueChange={(v) => setForm({ ...form, cliente_id: v })}
                    />
                    <Button type="button" size="icon" variant="outline" className="h-10 w-10 border-[#84A59D] text-[#3A4F4A] hover:bg-[#EAF0EE] shrink-0" onClick={() => { setClientForm({ nome: "", telefone: "", email: "" }); setOpenNewClient(true); }} title="Cadastrar Novo Cliente">
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
                <div className="form-group">
                  <Label className="form-label">Data e hora *</Label>
                  <Input type="datetime-local" value={form.data_hora} onChange={(e) => setForm({ ...form, data_hora: e.target.value })} className="form-input" />
                </div>
              </div>

              <div className="space-y-3 mb-4">
                <div>
                  <Label className="text-xs text-zinc-500 mb-1 block">1. Selecionar Categoria do Serviço</Label>
                  <SearchableSelect
                    placeholder="Todas as categorias"
                    searchPlaceholder="Pesquisar categoria..."
                    options={[
                      { value: "all", label: "Todas as categorias" },
                      { value: "none", label: "Sem categoria" },
                      ...categorias
                        .filter(c => c.tipo === "servico" || c.tipo === "ambos")
                        .map(c => ({ value: c.id, label: c.nome }))
                    ]}
                    value={selectedAddCategory}
                    onValueChange={(val) => setSelectedAddCategory(val)}
                  />
                </div>

                <div>
                  <Label className="text-xs text-zinc-500 mb-1 block">2. Escolher o Serviço</Label>
                  <SearchableSelect
                    placeholder="Escolha um serviço para adicionar..."
                    searchPlaceholder="Pesquisar serviço pelo nome..."
                    options={servicos
                      .filter(s => s.id && s.id.trim())
                      .filter(s => {
                        const matchesCategory =
                          selectedAddCategory === "all" ||
                          (selectedAddCategory === "none" && !s.categoria_id) ||
                          s.categoria_id === selectedAddCategory;
                        return matchesCategory;
                      })
                      .map((s) => ({
                        value: s.id,
                        label: `${s.nome} — ${fmtBRL(s.valor)} (${s.duracao_minutos}min)`
                      }))
                    }
                    value=""
                    onValueChange={(val) => { if (val) { addServico(val); } }}
                  />
                </div>
              </div>

              <div className="services-list mb-4">
                {form.itens_selecionados.map((item, index) => {
                  const s = servicos.find(x => x.id === item.servico_id);
                  return (
                    <div key={index} className="service-item-card">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-semibold service-item-card-name">{s?.nome}</span>
                        <Button size="sm" variant="ghost" onClick={() => removeServico(index)}><X className="w-4 h-4 text-rose-500" /></Button>
                      </div>
                      <div className="text-xs service-item-card-info">Duração: {s?.duracao_minutos}min • Valor Base: {fmtBRL(s?.valor)}</div>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                        <div className="form-group">
                          <Label className="form-label flex items-center gap-1"><User className="w-3 h-3" /> Profissional Principal</Label>
                          <Select value={item.colaborador_id || "none"} onValueChange={(v) => updateItemColab(index, v === "none" ? "" : v)}>
                            <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Selecione" /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">Selecione um profissional</SelectItem>
                              {colaboradores.filter(c => c.id && c.id.trim()).map(c => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="form-group">
                          <Label className="form-label flex items-center gap-1"><Users className="w-3 h-3" /> Auxiliar (Opcional)</Label>
                          <Select value={item.auxiliar_id || "none"} onValueChange={(v) => updateItemAux(index, v === "none" ? "" : v)}>
                            <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Nenhum" /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">Nenhum</SelectItem>
                              {colaboradores.filter(c => c.id && c.id.trim()).map(c => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="form-group">
                          <Label className="form-label flex items-center gap-1"><span className="text-[10px] font-bold text-zinc-400">R$</span> Valor Cobrado</Label>
                          <Input
                            type="number"
                            step="0.01"
                            placeholder="0,00"
                            value={item.valor !== undefined ? item.valor : (s?.valor || "")}
                            onChange={(e) => updateItemValor(index, e.target.value)}
                            className="h-8 text-xs bg-white border border-zinc-200 rounded px-2"
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="form-group mb-4">
                <Label className="form-label">Observações</Label>
                <Textarea
                  rows={2}
                  value={form.observacoes}
                  onChange={(e) => setForm({ ...form, observacoes: e.target.value })}
                  className="form-input"
                  style={{ resize: "none" }}
                />
              </div>

              <div className="total-box">
                <div className="total-label">Total: {duracaoTotal}min</div>
                <div className="total-value">{fmtBRL(valorTotal)}</div>
              </div>
            </div>
          )}
          <DialogFooter><Button data-testid="save-ag-btn" onClick={save} className="btn-primary w-full">Salvar Agendamento</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={openNewClient} onOpenChange={setOpenNewClient}>
        <DialogContent className="dialog-content w-[95vw] max-w-[95vw] sm:max-w-md p-5 sm:p-6 rounded-2xl dark:bg-zinc-900 dark:border-zinc-800" style={{ maxWidth: "26rem" }} aria-describedby="dialog-novo-cliente">
          <DialogHeader className="dialog-header">
            <DialogTitle className="dialog-title">Novo Cliente</DialogTitle>
          </DialogHeader>
          <div id="dialog-novo-cliente" className="sr-only">Cadastrar um novo cliente no sistema</div>
          <div className="dialog-body">
            <div className="form-group mb-3">
              <Label className="form-label">Nome *</Label>
              <Input
                placeholder="Nome do cliente"
                value={clientForm.nome}
                onChange={(e) => setClientForm({ ...clientForm, nome: e.target.value })}
                disabled={savingClient}
                className="form-input"
              />
            </div>
            <div className="form-group mb-3">
              <Label className="form-label">Telefone</Label>
              <Input
                placeholder="(00) 00000-0000"
                value={clientForm.telefone}
                onChange={(e) => setClientForm({ ...clientForm, telefone: e.target.value })}
                disabled={savingClient}
                className="form-input"
              />
            </div>
            <div className="form-group mb-4">
              <Label className="form-label">Email</Label>
              <Input
                type="email"
                placeholder="cliente@email.com"
                value={clientForm.email}
                onChange={(e) => setClientForm({ ...clientForm, email: e.target.value })}
                disabled={savingClient}
                className="form-input"
              />
            </div>
          </div>
          <DialogFooter className="flex justify-end gap-2 mt-4 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpenNewClient(false)}
              disabled={savingClient}
              className="px-4 py-2"
            >
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={saveNewClient}
              disabled={savingClient}
              className="btn-primary px-4 py-2 bg-[#84A59D] hover:bg-[#6F9189]"
            >
              {savingClient ? "Salvando..." : "Salvar Cliente"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={openSenha} onOpenChange={(v) => { setOpenSenha(v); if (!v) setSenhaData({ agendamento_id: null, novo_status: null, email: "", senha: "" }); }}>
        <DialogContent className="dialog-content w-[95vw] max-w-[95vw] sm:max-w-md p-5 sm:p-6 rounded-2xl dark:bg-zinc-900 dark:border-zinc-800" aria-describedby="dialog-senha">
          <DialogHeader className="dialog-header"><DialogTitle className="dialog-title">Confirmar alteracao de status</DialogTitle></DialogHeader>
          <div id="dialog-senha" className="sr-only">Dialogo para confirmar alteracao de agendamento concluido</div>
          <div className="dialog-body">
            <p className="text-sm mb-4" style={{ color: "#52525b" }}>Este agendamento ja foi concluido. Para alterar seu status, digite suas credenciais:</p>
            <div className="form-group mb-4">
              <Label className="form-label">Email</Label>
              <Input type="email" placeholder="seu@email.com" value={senhaData.email} onChange={(e) => setSenhaData({ ...senhaData, email: e.target.value })} disabled={carregandoSenha} className="form-input" />
            </div>
            <div className="form-group">
              <Label className="form-label">Sua senha</Label>
              <Input type="password" placeholder="Digite sua senha" value={senhaData.senha} onChange={(e) => setSenhaData({ ...senhaData, senha: e.target.value })} onKeyPress={(e) => e.key === "Enter" && !carregandoSenha && confirmarMudancaStatus()} disabled={carregandoSenha} className="form-input" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setOpenSenha(false); setSenhaData({ agendamento_id: null, novo_status: null, email: "", senha: "" }); }} disabled={carregandoSenha}>Cancelar</Button>
            <Button onClick={confirmarMudancaStatus} className="btn-primary" disabled={carregandoSenha}>{carregandoSenha ? "Validando..." : "Confirmar"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={openResumo} onOpenChange={setOpenResumo}>
        <DialogContent className="dialog-content w-[95vw] max-w-[95vw] sm:max-w-3xl md:max-w-4xl lg:max-w-5xl rounded-2xl p-5 sm:p-8 overflow-y-auto max-h-[90vh]" aria-describedby="dialog-resumo">
          <DialogHeader className="dialog-header flex flex-row items-center justify-between border-b border-zinc-150 dark:border-zinc-800 pb-4">
            <DialogTitle className="dialog-title flex items-center gap-2 justify-between w-full">
              <span className="flex items-center gap-3 text-xl sm:text-2xl font-semibold text-zinc-800 dark:text-zinc-100">
                <CalendarDays className="w-6 h-6 text-[#84A59D]" />
                Resumo do Atendimento
              </span>
              {resumoAgendamento?.numero && (
                <span className="text-sm sm:text-base font-mono font-bold bg-[#EAF0EE] text-[#3A4F4A] px-4 py-1.5 rounded-full mr-6">
                  {String(resumoAgendamento.numero).padStart(6, "0")} | S
                </span>
              )}
            </DialogTitle>
          </DialogHeader>
          <div id="dialog-resumo" className="sr-only">Resumo detalhado do agendamento selecionado</div>
          {resumoAgendamento && (
            <div className="dialog-body grid grid-cols-1 md:grid-cols-2 gap-8 mt-6">
              
              {/* Coluna Esquerda: Informações Gerais, Status Interativo e Notas */}
              <div className="space-y-6">
                {/* Cliente e Status */}
                {/* Cliente e Status */}
                <div className="flex items-center justify-between bg-[#F8FBFB] dark:bg-[#1a2322] p-5 rounded-2xl border border-[#E8EFEF] dark:border-[#2e3e3b] shadow-xs">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-[#EAF0EE] flex items-center justify-center text-[#3A4F4A] font-semibold text-xl">
                      {resumoAgendamento.cliente_nome?.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h3 className="font-display font-semibold text-zinc-800 dark:text-zinc-100 text-lg sm:text-xl">{resumoAgendamento.cliente_nome}</h3>
                      <p className="text-xs text-zinc-400">Cliente cadastrado(a)</p>
                    </div>
                  </div>
                  <StatusBadge status={resumoAgendamento.status} />
                </div>
 
                {/* Data e Hora */}
                <div className="grid grid-cols-2 gap-5">
                  <div className="bg-zinc-55 dark:bg-zinc-900 p-4 sm:p-5 rounded-xl border border-zinc-150 dark:border-zinc-800 flex items-center gap-3 shadow-xs">
                    <CalIcon className="w-6 h-6 text-[#84A59D]" />
                    <div>
                      <p className="text-[10px] sm:text-xs uppercase tracking-wider text-zinc-400 font-bold">Data</p>
                      <p className="text-sm sm:text-base font-semibold text-zinc-700 dark:text-zinc-200">
                        {new Date(resumoAgendamento.data_hora).toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" })}
                      </p>
                    </div>
                  </div>
                  <div className="bg-zinc-55 dark:bg-zinc-900 p-4 sm:p-5 rounded-xl border border-zinc-150 dark:border-zinc-800 flex items-center gap-3 shadow-xs">
                    <Clock className="w-6 h-6 text-[#84A59D]" />
                    <div>
                      <p className="text-[10px] sm:text-xs uppercase tracking-wider text-zinc-400 font-bold">Horário</p>
                      <p className="text-sm sm:text-base font-semibold text-zinc-700 dark:text-zinc-200">
                        {fmtHour(resumoAgendamento.data_hora)}
                      </p>
                    </div>
                  </div>
                </div>
 
                {/* Agendado por — info discreta */}
                {(resumoAgendamento.criado_por_nome || resumoAgendamento.criado_em) && (
                  <div className="flex items-center gap-1.5 text-xs text-zinc-400 dark:text-zinc-650 italic select-none pt-0.5">
                    <User className="w-3.5 h-3.5 flex-shrink-0" />
                    <span>
                      Agendado
                      {resumoAgendamento.criado_por_nome && (
                        <> por <strong className="font-semibold not-italic text-zinc-500 dark:text-zinc-500">{resumoAgendamento.criado_por_nome}</strong></>
                      )}
                      {resumoAgendamento.criado_em && (
                        <> em {new Date(resumoAgendamento.criado_em).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })}</>
                      )}
                    </span>
                  </div>
                )}
 
                {/* Observações */}
                <div className="space-y-3 pt-4 border-t border-zinc-150 dark:border-zinc-800">
                  <h4 className="text-xs sm:text-sm uppercase tracking-wider text-zinc-500 dark:text-zinc-400 font-bold flex items-center gap-2">
                    <FileText className="w-4.5 h-4.5 text-[#84A59D]" /> Observações do Atendimento
                  </h4>
                  <div className="flex flex-col gap-3">
                    <Textarea
                      placeholder="Digite observações importantes sobre este atendimento..."
                      value={observacoesResumo}
                      onChange={(e) => setObservacoesResumo(e.target.value)}
                      className="w-full h-36 text-sm sm:text-base bg-zinc-50 dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 leading-relaxed rounded-xl shadow-inner p-3.5"
                    />
                    <Button 
                      onClick={handleSaveResumoObs}
                      disabled={savingResumoObs}
                      size="default" 
                      className="self-end bg-[#84A59D] hover:bg-[#6F9189] text-xs sm:text-sm h-10 px-5 flex items-center gap-1 text-white font-bold rounded-lg shadow-sm"
                    >
                      {savingResumoObs ? "Salvando..." : "Salvar Observação"}
                    </Button>
                  </div>
                </div>
              </div>
  
              {/* Coluna Direita: Serviços, Produtos e Valores */}
              <div className="space-y-6 flex flex-col justify-between">
                {/* Serviços e Profissionais */}
                <div className="space-y-3">
                  <h4 className="text-xs sm:text-sm uppercase tracking-wider text-zinc-400 font-bold flex items-center gap-2">
                    <Scissors className="w-4.5 h-4.5 text-[#84A59D]" /> Serviços Agendados
                  </h4>
                  <div className="space-y-4 max-h-[440px] overflow-y-auto pr-1">
                    {resumoAgendamento.itens?.map((item, idx) => {
                      const s = servicos.find(x => x.id === item.servico_id);
                      const mainColab = colaboradores.find(c => c.id === item.colaborador_id)?.nome;
                      const auxColab = colaboradores.find(c => c.id === item.auxiliar_id)?.nome;
                      return (
                        <div key={idx} className="bg-[#F8FBFB] dark:bg-[#1a2322] border border-[#E8EFEF] dark:border-[#2e3e3b] p-5 rounded-xl flex flex-col gap-3 shadow-xs">
                          <div className="flex items-center justify-between">
                            <span className="font-semibold text-base sm:text-lg text-zinc-800 dark:text-zinc-200">{item.nome || s?.nome || "Serviço"}</span>
                            <span className="text-base sm:text-lg font-bold text-[#3A4F4A] dark:text-[#EAF0EE]">{fmtBRL(item.valor)}</span>
                          </div>
 
                          {/* Box de detalhamento de negociação do valor */}
                          <div className="bg-white/80 dark:bg-zinc-900/50 p-3.5 rounded-lg border border-zinc-200/50 dark:border-zinc-800/80 text-xs sm:text-sm space-y-1.5 mt-0.5">
                            <div className="flex justify-between items-center text-zinc-500 dark:text-zinc-400">
                              <span>Valor de Tabela (Base):</span>
                              <span className="font-mono">{fmtBRL(item.valor_original !== undefined && item.valor_original !== null ? item.valor_original : item.valor)}</span>
                            </div>
                            <div className="flex justify-between items-center text-[#3A4F4A] dark:text-[#84A59D] font-semibold">
                              <span>Valor Acordado/Negociado:</span>
                              <span className="font-mono">{fmtBRL(item.valor)}</span>
                            </div>
                            {(() => {
                              const valBase = Number(item.valor_original !== undefined && item.valor_original !== null ? item.valor_original : item.valor);
                              const valCobrado = Number(item.valor);
                              const diferenca = valCobrado - valBase;
                              if (Math.abs(diferenca) > 0.01) {
                                const isDesconto = diferenca < 0;
                                return (
                                  <div className="flex justify-between items-center pt-1.5 border-t border-dashed border-zinc-200 dark:border-zinc-800 text-xs mt-0.5">
                                    <span className={isDesconto ? "text-rose-600 dark:text-rose-450 font-semibold" : "text-emerald-600 dark:text-emerald-450 font-semibold"}>
                                      {isDesconto ? "Diferença (Desconto):" : "Diferença (Ajuste Negociado):"}
                                    </span>
                                    <span className={`font-mono font-bold ${isDesconto ? "text-rose-600 dark:text-rose-455" : "text-emerald-600 dark:text-emerald-455"}`}>
                                      {isDesconto ? "-" : "+"}{fmtBRL(Math.abs(diferenca))}
                                    </span>
                                  </div>
                                );
                              }
                              return null;
                            })()}
                          </div>
 
                          <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs sm:text-sm text-zinc-500 mt-0.5">
                            <span className="flex items-center gap-1 bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded"><Clock className="w-3.5 h-3.5 text-[#84A59D]" /> {s?.duracao_minutos} min</span>
                            {mainColab && (
                              <span className="flex items-center gap-1 bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded"><User className="w-3.5 h-3.5 text-[#84A59D]" /> Profissional: <strong>{mainColab}</strong></span>
                            )}
                            {auxColab && (
                              <span className="flex items-center gap-1 bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded"><Users className="w-3.5 h-3.5 text-[#84A59D]" /> Auxiliar: <strong>{auxColab}</strong></span>
                            )}
                          </div>
 
                          {/* Utilized Products Section */}
                          <div className="mt-3 pt-3 border-t border-dashed border-[#E8EFEF] dark:border-[#2e3e3b]">
                            <div className="flex items-center justify-between">
                              <span className="text-xs sm:text-sm font-semibold text-zinc-500 flex items-center gap-1">
                                <Package className="w-3.5 h-3.5 text-[#84A59D]" /> Consumo de Produtos
                              </span>
                              <Button 
                                onClick={() => {
                                  openUtilizedProducts(resumoAgendamento, idx);
                                }}
                                variant="ghost" 
                                className="h-8 px-3 text-xs text-[#3A4F4A] hover:bg-[#EAF0EE] flex items-center gap-1 border border-zinc-200 bg-white"
                              >
                                <PlusCircle className="w-3.5 h-3.5" /> Informar Consumo
                              </Button>
                            </div>
                            {item.produtos_utilizados && item.produtos_utilizados.length > 0 ? (
                              <div className="mt-2.5 space-y-1.5">
                                {item.produtos_utilizados.map((pu, pidx) => {
                                  const prod = produtos.find(p => p.id === pu.produto_id);
                                  return (
                                    <div key={pidx} className="flex justify-between items-center text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-850 px-3 py-1.5 rounded-lg border border-zinc-150/40 dark:border-zinc-800/30">
                                      <span className="font-medium text-zinc-700 dark:text-zinc-300">{prod?.nome || "Carregando..."}</span>
                                      <span className="font-mono font-bold text-zinc-800 dark:text-zinc-200">{pu.quantidade} {prod?.unidade || "un"}</span>
                                    </div>
                                  );
                                })}
                              </div>
                            ) : (
                              <p className="text-xs sm:text-sm text-zinc-400 italic mt-1 bg-zinc-50/50 dark:bg-zinc-950/20 px-2 py-1 rounded text-center">Nenhum produto informado</p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
 
                {/* Valores Totais */}
                <div className="total-box mt-auto p-4 sm:p-5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-55 dark:bg-zinc-900 shadow-sm flex items-center justify-between">
                  <div className="total-label flex items-center gap-1.5 text-zinc-550 dark:text-zinc-400 font-semibold text-xs sm:text-sm">
                    <Clock className="w-4.5 h-4.5 text-[#84A59D]" />
                    Duração Total: {resumoAgendamento.itens?.reduce((sum, item) => sum + (servicos.find(x => x.id === item.servico_id)?.duracao_minutos || 0), 0)} min
                  </div>
                  <div className="total-value text-xl sm:text-2xl font-extrabold text-[#3A4F4A] dark:text-[#EAF0EE]">{fmtBRL(resumoAgendamento.valor_total)}</div>
                </div>
              </div>
 
            </div>
          )}
          <DialogFooter className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-zinc-100 dark:border-zinc-800 w-full mt-5">
            <Button variant="outline" onClick={() => setOpenResumo(false)} className="sm:flex-1 h-11 px-5 text-xs sm:text-sm font-medium">Fechar</Button>
            {resumoAgendamento && (
              <>
                <Button variant="outline" onClick={() => { setOpenResumo(false); openEdit(resumoAgendamento); }} className="sm:flex-1 h-11 px-5 border-[#84A59D] text-[#3A4F4A] hover:bg-[#EAF0EE] font-medium text-xs sm:text-sm">
                  <Edit2 className="w-4 h-4 mr-2" /> Editar Atendimento
                </Button>
                {resumoAgendamento.status !== "concluido" && (
                  <Button onClick={() => { setOpenResumo(false); nav(`/agendamentos/${resumoAgendamento.id}/pagamento`); }} className="btn-primary sm:flex-1 h-11 px-5 font-bold text-xs sm:text-sm">
                    <CreditCard className="w-4 h-4 mr-2" /> Registrar Pagamento
                  </Button>
                )}
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* Dialog para informar profissionais ausentes ao concluir status */}
      <Dialog open={profsDialogOpen} onOpenChange={setProfsDialogOpen}>
        <DialogContent className="w-[95vw] max-w-[95vw] sm:max-w-lg p-5 sm:p-6 rounded-2xl dark:bg-zinc-900 dark:border-zinc-800">
          <DialogHeader>
            <DialogTitle className="font-display text-xl font-bold flex items-center gap-2 text-zinc-800">
              <CheckCircle2 className="w-6 h-6 text-[#84A59D]" />
              Informar Profissionais
            </DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <p className="text-sm text-zinc-500 leading-relaxed">
              Para concluir este atendimento e calcular as comissões corretamente, selecione quem realizou cada um dos serviços abaixo:
            </p>
            <div className="space-y-4 max-h-[300px] overflow-y-auto pr-1">
              {missingProfs.map((item, i) => (
                <div key={item.servico_id} className="p-4 bg-zinc-50 border border-zinc-200 rounded-xl space-y-3">
                  <div className="font-semibold text-zinc-700 text-sm">{item.nome}</div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs text-zinc-500">Profissional Principal</Label>
                      <Select
                        value={item.colaborador_id}
                        onValueChange={(v) => {
                          if (v && v !== "none" && item.auxiliar_id && v === item.auxiliar_id) {
                            toast.error("O profissional principal não pode ser o mesmo que o auxiliar.");
                            return;
                          }
                          setMissingProfs(missingProfs.map((x, idx) => idx === i ? { ...x, colaborador_id: v } : x));
                        }}
                      >
                        <SelectTrigger className="bg-white"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                        <SelectContent>
                          {colaboradores.map((c) => (
                            <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-xs text-zinc-500">Auxiliar (Opcional)</Label>
                      <Select
                        value={item.auxiliar_id || "none"}
                        onValueChange={(v) => {
                          const val = v === "none" ? null : v;
                          if (val && val !== "none" && item.colaborador_id && val === item.colaborador_id) {
                            toast.error("O profissional auxiliar não pode ser o mesmo que o principal.");
                            return;
                          }
                          setMissingProfs(missingProfs.map((x, idx) => idx === i ? { ...x, auxiliar_id: val } : x));
                        }}
                      >
                        <SelectTrigger className="bg-white"><SelectValue placeholder="Nenhum" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Nenhum</SelectItem>
                          {colaboradores.map((c) => (
                            <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setProfsDialogOpen(false)}>Cancelar</Button>
            <Button onClick={confirmAndConclude} className="bg-[#84A59D] hover:bg-[#6F9189]">
              Confirmar e Concluir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de confirmação de exclusão */}
      <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <DialogContent className="w-[95vw] max-w-[95vw] sm:max-w-md p-5 sm:p-6 rounded-2xl dark:bg-zinc-900 dark:border-zinc-800">
          <DialogHeader>
            <DialogTitle>Confirmar exclusão de agendamento</DialogTitle>
          </DialogHeader>
          <div className="py-4 text-sm text-zinc-600 dark:text-zinc-400">
            Tem certeza que deseja excluir este agendamento? Esta ação pode ser desfeita a qualquer momento a partir da tela de "Excluídos". Qualquer produto utilizado será retornado ao estoque.
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDeleteConfirmOpen(false)}>Cancelar</Button>
            <Button onClick={confirmDelete} className="bg-rose-500 hover:bg-rose-600 text-white">Excluir</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de confirmação de data passada */}
      <Dialog open={pastDateConfirmOpen} onOpenChange={setPastDateConfirmOpen}>
        <DialogContent className="w-[95vw] max-w-[95vw] sm:max-w-md p-5 sm:p-6 rounded-2xl dark:bg-zinc-900 dark:border-zinc-800" aria-describedby="dialog-data-passada">
          <DialogHeader>
            <DialogTitle>Agendamento em data passada</DialogTitle>
          </DialogHeader>
          <div id="dialog-data-passada" className="py-4 text-sm text-zinc-600">
            A data informada é uma data passada. Deseja continuar com o agendamento?
          </div>
          <DialogFooter className="gap-2 flex flex-col sm:flex-row">
            <Button variant="outline" className="w-full sm:w-auto" onClick={() => setPastDateConfirmOpen(false)}>Não</Button>
            <Button className="bg-[#84A59D] hover:bg-[#6F9189] w-full sm:w-auto" onClick={async () => { setPastDateConfirmOpen(false); await doSave(); }}>Sim</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <AuditModal
        isOpen={auditOpen}
        onClose={() => setAuditOpen(false)}
        modulo="agendamento"
        tituloModulo="Agenda"
        onRestoreSuccess={() => loadDay(data)}
      />
      <PasswordConfirmDialog
        open={openEditSenha}
        onOpenChange={setOpenEditSenha}
        onConfirm={handleConfirmEditConcluido}
        title="Autorização Necessária"
        description="Este agendamento já foi concluído. Informe usuário e senha de um administrador com permissão específica para editá-lo."
        requireCredentials={true}
      />
      <Dialog open={conflictConfirmOpen} onOpenChange={setConflictConfirmOpen}>
        <DialogContent className="w-[95vw] max-w-[95vw] sm:max-w-md p-5 sm:p-6 rounded-2xl dark:bg-zinc-900 dark:border-zinc-800">
          <DialogHeader>
            <DialogTitle>Conflito de Horário</DialogTitle>
          </DialogHeader>
          <div className="py-4 text-sm text-zinc-600 dark:text-zinc-400">
            {conflictMessage}.
            <br /><br />
            <b>Deseja incluí-lo mesmo assim?</b>
          </div>
          <DialogFooter className="gap-2 flex flex-col sm:flex-row">
            <Button variant="outline" className="w-full sm:w-auto" onClick={() => setConflictConfirmOpen(false)}>Não</Button>
            <Button className="bg-[#84A59D] hover:bg-[#6F9189] w-full sm:w-auto" onClick={async () => { setConflictConfirmOpen(false); await doSave(true); }}>Sim</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={utilizedProductsOpen} onOpenChange={setUtilizedProductsOpen}>
        <DialogContent className="w-[95vw] max-w-[95vw] sm:max-w-4xl p-5 sm:p-7 rounded-2xl dark:bg-zinc-900 dark:border-zinc-800 max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display text-xl font-bold flex items-center gap-2 text-zinc-800 dark:text-zinc-150">
              <Package className="w-6 h-6 text-[#84A59D]" />
              Produtos Utilizados no Serviço
            </DialogTitle>
          </DialogHeader>
          {agForUtilized && selectedItemIndex !== null && (() => {
            const item = agForUtilized.itens[selectedItemIndex];
            const s = servicos.find(x => x.id === item.servico_id);
            return (
              <div className="py-4 space-y-5">
                {/* Cabeçalho do Serviço */}
                <div className="bg-[#F8FBFB] dark:bg-[#1a2322] p-4 rounded-xl border border-[#E8EFEF] dark:border-[#2e3e3b] flex justify-between items-center flex-wrap gap-3">
                  <div>
                    <div className="text-xs text-zinc-400 dark:text-zinc-500 uppercase font-bold tracking-wider">Serviço</div>
                    <div className="font-semibold text-[#3A4F4A] dark:text-[#84A59D] text-base">{item.nome || s?.nome}</div>
                    <div className="text-[11px] text-zinc-450 dark:text-zinc-500 mt-1">
                      Cliente: <span className="font-semibold text-zinc-650 dark:text-zinc-400">{agForUtilized.cliente_nome}</span> · Atendimento: <span className="font-semibold text-zinc-650 dark:text-zinc-400">{String(agForUtilized.numero || 0).padStart(6, "0")} | S</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-zinc-400 dark:text-zinc-500 uppercase font-bold tracking-wider">Valor do Serviço</div>
                    <div className="font-extrabold text-zinc-800 dark:text-zinc-200 text-lg">{fmtBRL(item.valor)}</div>
                  </div>
                </div>

                {/* Planilha de Insumos */}
                <div className="space-y-2">
                  <div className="text-xs text-zinc-550 dark:text-zinc-400 font-bold uppercase tracking-wider">Planilha de Insumos</div>
                  {tempUtilizedProducts.length === 0 ? (
                    <div className="text-center py-10 border border-dashed border-zinc-200 dark:border-zinc-800 rounded-xl text-zinc-450 dark:text-zinc-500 text-sm">
                      Nenhum produto cadastrado para este serviço.
                    </div>
                  ) : (
                    <div className="border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-x-auto bg-white dark:bg-zinc-950 w-full min-w-0 shadow-sm">
                      <table className="w-full text-sm min-w-[650px]">
                        <thead className="bg-zinc-50 dark:bg-zinc-900 text-xs uppercase tracking-wider text-zinc-500 dark:text-zinc-450 border-b border-zinc-200 dark:border-zinc-800">
                          <tr>
                            <th className="px-5 py-3.5 text-left font-semibold">Produto</th>
                            <th className="px-5 py-3.5 text-center font-semibold w-32">Estoque Disponível</th>
                            <th className="px-5 py-3.5 text-right font-semibold w-36">Custo Unitário</th>
                            <th className="px-5 py-3.5 text-center font-semibold w-40">Qtd. Utilizada</th>
                            <th className="px-5 py-3.5 text-right font-semibold w-36">Custo Total</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-150 dark:divide-zinc-800">
                          {tempUtilizedProducts.map((row, idx) => {
                            const totalCost = Number(row.quantidade || 0) * Number(row.custo_unitario || 0);
                            return (
                              <tr key={row.produto_id} className="hover:bg-zinc-50/40 dark:hover:bg-zinc-900/40 transition-colors">
                                <td className="px-5 py-4">
                                  <div className="flex items-center gap-2">
                                    <span className="font-semibold text-zinc-800 dark:text-zinc-200">{row.nome}</span>
                                    {!row.isLinked && (
                                      <span className="inline-flex px-1.5 py-0.5 bg-amber-50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400 border border-amber-250/20 rounded text-[9px] font-bold uppercase">Extra</span>
                                    )}
                                    {!row.isLinked && (
                                      <button
                                        type="button"
                                        onClick={() => handleRemoveTempProduct(idx)}
                                        className="text-rose-500 hover:text-rose-600 p-1.5 rounded-md hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors ml-auto flex items-center justify-center"
                                        title="Remover Produto Extra"
                                      >
                                        <Trash2 className="w-4 h-4" />
                                      </button>
                                    )}
                                  </div>
                                </td>
                                <td className="px-5 py-4 text-center text-zinc-500 dark:text-zinc-400 font-mono text-xs">
                                  {Number(Number(row.quantidade_estoque || 0).toFixed(3))} {row.unidade}
                                </td>
                                <td className="px-5 py-4 text-right text-zinc-600 dark:text-zinc-400 font-mono text-xs">
                                  {fmtBRL(row.custo_unitario)}/{row.unidade}
                                </td>
                                <td className="px-5 py-4 text-center">
                                  <div className="flex items-center justify-center">
                                    <div className="relative flex items-center w-28">
                                      <Input 
                                        type="number" 
                                        min="0" 
                                        step="0.001"
                                        placeholder="0.000"
                                        value={row.quantidade} 
                                        onChange={(e) => handleUpdateTempProductQty(idx, e.target.value)}
                                        className="w-full h-9 text-center bg-zinc-50 dark:bg-zinc-900 font-semibold border-zinc-200 dark:border-zinc-800 font-mono text-xs pr-10"
                                      />
                                      <span className="absolute right-3 text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase pointer-events-none select-none">{row.unidade}</span>
                                    </div>
                                  </div>
                                </td>
                                <td className="px-5 py-4 text-right font-bold text-zinc-800 dark:text-zinc-350 font-mono text-xs">
                                  {fmtBRL(totalCost)}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                {/* Adição de Outros Produtos */}
                <div className="flex flex-col sm:flex-row sm:items-center gap-3 pt-3 pb-1 border-t border-zinc-150 dark:border-zinc-800">
                  <span className="text-xs text-zinc-500 dark:text-zinc-400 font-bold uppercase tracking-wider whitespace-nowrap">Adicionar Insumo Extra:</span>
                  <div className="w-full sm:w-80">
                    <SearchableSelect
                      placeholder="Selecione um produto extra..."
                      searchPlaceholder="Pesquisar produto pelo nome..."
                      className="w-full h-10 text-xs"
                      options={produtos
                        .filter(p => !tempUtilizedProducts.some(row => row.produto_id === p.id))
                        .map(p => ({
                          value: p.id,
                          label: `${p.nome} (${Number(Number(p.quantidade_estoque || 0).toFixed(3))} ${p.unidade_medida || "un"})`
                        }))
                      }
                      value={selectedProdToAdd}
                      onValueChange={(val) => {
                        if (val) {
                          handleAddExtraProduct(val);
                        }
                      }}
                    />
                  </div>
                </div>

                {/* Totalizador de Custo */}
                <div className="bg-[#F8FBFB] dark:bg-[#1a2322] border border-[#E8EFEF] dark:border-[#2e3e3b] p-4 rounded-xl flex items-center justify-between shadow-xs">
                  <div className="flex items-center gap-2">
                    <Package className="w-5 h-5 text-[#84A59D]" />
                    <div>
                      <span className="text-xs text-zinc-400 dark:text-zinc-500 font-bold uppercase tracking-wider block">Custo Total do Consumo</span>
                      <span className="text-[10px] text-zinc-400 dark:text-zinc-550">Calculado automaticamente com base no consumo</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="font-mono text-xl font-extrabold text-[#3A4F4A] dark:text-[#84A59D]">
                      {fmtBRL(
                        tempUtilizedProducts.reduce(
                          (sum, row) => sum + Number(row.quantidade || 0) * Number(row.custo_unitario || 0),
                          0
                        )
                      )}
                    </span>
                  </div>
                </div>
              </div>
            );
          })()}
          <DialogFooter className="gap-2 pt-2 border-t border-zinc-100 dark:border-zinc-800">
            <Button variant="outline" onClick={() => setUtilizedProductsOpen(false)} className="w-full sm:w-auto">Cancelar</Button>
            <Button onClick={saveUtilizedProducts} className="bg-[#84A59D] hover:bg-[#6F9189] w-full sm:w-auto font-bold text-white">
              Salvar Consumo
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog para autorização de alteração de consumo de produtos em agendamentos concluídos */}
      <PasswordConfirmDialog
        open={utilizedAuthOpen}
        onOpenChange={setUtilizedAuthOpen}
        onConfirm={async (email, password) => {
          try {
            await http.get(`/agendamentos/${agForUtilized.id}`, { params: { email, password } });
            setUtilizedAuthCredentials({ email, password });
            setUtilizedAuthOpen(false);
            setTimeout(() => {
              saveUtilizedProductsWithCreds({ email, password });
            }, 100);
          } catch (e) {
            throw new Error(e.response?.data?.detail || "Erro de autorização. Verifique usuário, senha e permissões.");
          }
        }}
        title="Autorização Necessária"
        description="Este agendamento já foi concluído. Informe usuário e senha de um administrador com permissão específica para alterar o consumo de produtos."
        requireCredentials={true}
      />
    </div>
  );
}
