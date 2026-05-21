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
import { Calendar as CalIcon, Plus, ChevronLeft, ChevronRight, Trash2, Edit2, CreditCard, CalendarDays, X, User, Users, Clock, FileText, Scissors, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import AgendaTimeline from "../components/AgendaTimeline";
import { useAuth } from "../auth";
import "./Agenda.css";

const fmtBRL = (n) => (n || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const fmtHour = (s) => new Date(s).toLocaleTimeString("pt-BR", { timeZone: "America/Recife", hour: "2-digit", minute: "2-digit" });

const toDateInput = (d) => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const toDatetimeLocalInput = (dtStr) => {
  if (!dtStr) return "";
  const d = new Date(dtStr);
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
  const nav = useNavigate();

  const [openNewClient, setOpenNewClient] = useState(false);
  const [clientForm, setClientForm] = useState({ nome: "", telefone: "", email: "" });
  const [savingClient, setSavingClient] = useState(false);

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
    ]);
  }, []);

  useEffect(() => {
    loadDay(data);
  }, [data]);

  useEffect(() => {
    loadMonth(monthCursor.y, monthCursor.m);
  }, [monthCursor]);

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
    try {
      if (form.id) {
        await http.put(`/agendamentos/${form.id}`, form);
        toast.success("Agendamento atualizado");
      } else {
        await http.post("/agendamentos", form);
        toast.success("Agendamento criado");
      }
      setOpen(false);
      setForm(null);
      loadDay(data);
      loadMonth(monthCursor.y, monthCursor.m);
    } catch (e) {
      toast.error(e.response.data.detail || "Erro ao salvar agendamento");
    }
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
      itens_selecionados: [...f.itens_selecionados, { servico_id: sid, colaborador_id: "", auxiliar_id: "" }]
    }));
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
      itens[index].colaborador_id = cid;
      return { ...f, itens_selecionados: itens };
    });
  };

  const updateItemAux = (index, cid) => {
    setForm(f => {
      const itens = [...f.itens_selecionados];
      itens[index].auxiliar_id = cid;
      return { ...f, itens_selecionados: itens };
    });
  };

  const openResumoModal = (a) => {
    setResumoAgendamento(a);
    setOpenResumo(true);
  };

  const openNew = () => {
    setForm({
      cliente_id: "",
      data_hora: toDatetimeLocalInput(new Date()),
      itens_selecionados: [],
      observacoes: ""
    });
    setOpen(true);
  };

  const openEdit = (a) => {
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
    return sum + (s?.valor || 0);
  }, 0) || 0;

  const duracaoTotal = form?.itens_selecionados.reduce((sum, item) => {
    const s = servicos.find(x => x.id === item.servico_id);
    return sum + (s?.duracao_minutos || 0);
  }, 0) || 0;

  return (
    <div className="agenda-container w-full overflow-x-hidden">
      <PageHeader title="Agenda" />
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
        <div className="view-toggle w-full sm:w-auto">
          <button className={`view-toggle-btn flex-1 sm:flex-none ${view === "dia" ? "view-toggle-btn-active" : ""}`} onClick={() => setView("dia")}>Dia</button>
          <button className={`view-toggle-btn flex-1 sm:flex-none ${view === "timeline" ? "view-toggle-btn-active" : ""}`} onClick={() => setView("timeline")}>Timeline</button>
          <button className={`view-toggle-btn flex-1 sm:flex-none ${view === "calendario" ? "view-toggle-btn-active" : ""}`} onClick={() => setView("calendario")}>Calendário</button>
        </div>
        <button className="btn-primary w-full sm:w-auto justify-center" onClick={openNew}><Plus className="w-4 h-4 mr-2" /> Novo Agendamento</button>
      </div>

      {view === "dia" ? (
        <>
          <div className="flex items-center gap-2 mb-4">
            <Input type="date" value={data} onChange={(e) => setData(e.target.value)} className="w-40" />
          </div>
          {agendamentos.length === 0 ? (
            <EmptyState title="Sem agendamentos" description="Nenhum agendamento para este dia" />
          ) : (
            <div className="space-y-2">
              {agendamentos.map((a) => (
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
                          #{String(a.numero).padStart(4, "0")}
                        </span>
                      )}
                    </div>
                    <div className="agenda-services">{a.itens?.map((i) => servicos.find(s => s.id === i.servico_id)?.nome).join(", ")}</div>
                    <div className="agenda-professionals">{a.itens?.map((i) => colaboradores.find(c => c.id === i.colaborador_id)?.nome).filter(Boolean).join(", ")}</div>
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
                    <Button size="sm" variant="ghost" onClick={() => openEdit(a)}><Edit2 className="w-4 h-4" /></Button>
                    <Button size="sm" variant="ghost" onClick={() => del(a.id)}><Trash2 className="w-4 h-4 text-rose-500" /></Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      ) : view === "timeline" ? (
        <AgendaTimeline data={data} servicos={servicos} colaboradores={colaboradores} onCardClick={openResumoModal} />
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
        <DialogContent className="dialog-content sm:max-w-3xl" aria-describedby="dialog-agendamento">
          <DialogHeader className="dialog-header"><DialogTitle className="dialog-title">{form?.id ? "Editar Agendamento" : "Novo Agendamento"}</DialogTitle></DialogHeader>
          <div id="dialog-agendamento" className="sr-only">Formulario para criar ou editar agendamento</div>
          {form && (
            <div className="dialog-body">
              <div className="grid-2 mb-4">
                <div className="form-group">
                  <Label className="form-label">Cliente *</Label>
                  <div className="flex gap-2">
                    <Select value={form.cliente_id} onValueChange={(v) => setForm({ ...form, cliente_id: v })}>
                      <SelectTrigger data-testid="ag-cliente" className="flex-1"><SelectValue placeholder="Selecione um cliente" /></SelectTrigger>
                      <SelectContent>
                        {clientes.filter(c => c.id && c.id.trim()).map(c => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}
                      </SelectContent>
                    </Select>
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

              <div className="form-group mb-4">
                <Label className="form-label">Adicionar Serviço</Label>
                <Select onValueChange={(v) => { if (v) { addServico(v); } }}>
                  <SelectTrigger><SelectValue placeholder="Escolha um serviço para adicionar..." /></SelectTrigger>
                  <SelectContent>
                    {servicos.filter(s => s.id && s.id.trim()).map(s => <SelectItem key={s.id} value={s.id}>{s.nome} - {fmtBRL(s.valor)}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div className="services-list mb-4">
                {form.itens_selecionados.map((item, index) => {
                  const s = servicos.find(x => x.id === item.servico_id);
                  return (
                    <div key={index} style={{ backgroundColor: "#F0F5F4", borderRadius: "0.5rem", padding: "0.75rem", marginBottom: "0.5rem", border: "1px solid #E0E7E6" }}>
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-semibold" style={{ color: "#3A4F4A" }}>{s?.nome}</span>
                        <Button size="sm" variant="ghost" onClick={() => removeServico(index)}><X className="w-4 h-4 text-rose-500" /></Button>
                      </div>
                      <div className="text-xs" style={{ color: "#a1a1aa", marginBottom: "0.5rem" }}>{s?.duracao_minutos}min • {fmtBRL(s?.valor)}</div>
                      <div className="grid-2">
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
        <DialogContent className="dialog-content" style={{ maxWidth: "26rem" }} aria-describedby="dialog-novo-cliente">
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
        <DialogContent className="dialog-content" aria-describedby="dialog-senha">
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
        <DialogContent className="dialog-content sm:max-w-lg" aria-describedby="dialog-resumo">
          <DialogHeader className="dialog-header flex flex-row items-center justify-between">
            <DialogTitle className="dialog-title flex items-center gap-2 justify-between w-full">
              <span className="flex items-center gap-2">
                <CalendarDays className="w-5 h-5 text-[#84A59D]" />
                Resumo do Atendimento
              </span>
              {resumoAgendamento?.numero && (
                <span className="text-xs font-mono font-bold bg-[#EAF0EE] text-[#3A4F4A] px-2.5 py-0.5 rounded-full mr-6">
                  Nº {String(resumoAgendamento.numero).padStart(4, "0")}
                </span>
              )}
            </DialogTitle>
          </DialogHeader>
          <div id="dialog-resumo" className="sr-only">Resumo detalhado do agendamento selecionado</div>
          {resumoAgendamento && (
            <div className="dialog-body space-y-5">
              {/* Cliente e Status */}
              <div className="flex items-start justify-between bg-[#F8FBFB] dark:bg-[#1a2322] p-4 rounded-xl border border-[#E8EFEF] dark:border-[#2e3e3b]">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-[#EAF0EE] flex items-center justify-center text-[#3A4F4A] font-semibold text-lg">
                    {resumoAgendamento.cliente_nome?.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h3 className="font-display font-semibold text-zinc-800 dark:text-zinc-100">{resumoAgendamento.cliente_nome}</h3>
                    <p className="text-xs text-zinc-400">Cliente cadastrado(a)</p>
                  </div>
                </div>
                <StatusBadge status={resumoAgendamento.status} />
              </div>

              {/* Data e Hora */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-zinc-50 dark:bg-zinc-900 p-3 rounded-xl border border-zinc-100 dark:border-zinc-800 flex items-center gap-3">
                  <CalIcon className="w-5 h-5 text-zinc-400" />
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-zinc-400 font-medium">Data</p>
                    <p className="text-sm font-semibold text-zinc-700 dark:text-zinc-200">
                      {new Date(resumoAgendamento.data_hora).toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" })}
                    </p>
                  </div>
                </div>
                <div className="bg-zinc-50 dark:bg-zinc-900 p-3 rounded-xl border border-zinc-100 dark:border-zinc-800 flex items-center gap-3">
                  <Clock className="w-5 h-5 text-zinc-400" />
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-zinc-400 font-medium">Horário</p>
                    <p className="text-sm font-semibold text-zinc-700 dark:text-zinc-200">
                      {fmtHour(resumoAgendamento.data_hora)}
                    </p>
                  </div>
                </div>
              </div>

              {/* Serviços e Profissionais */}
              <div className="space-y-2">
                <h4 className="text-xs uppercase tracking-wider text-zinc-400 font-semibold flex items-center gap-1.5">
                  <Scissors className="w-3.5 h-3.5" /> Serviços Agendados
                </h4>
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {resumoAgendamento.itens?.map((item, idx) => {
                    const s = servicos.find(x => x.id === item.servico_id);
                    const mainColab = colaboradores.find(c => c.id === item.colaborador_id)?.nome;
                    const auxColab = colaboradores.find(c => c.id === item.auxiliar_id)?.nome;
                    return (
                      <div key={idx} className="bg-[#F8FBFB] dark:bg-[#1a2322] border border-[#E8EFEF] dark:border-[#2e3e3b] p-3 rounded-xl flex flex-col gap-2">
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-sm text-zinc-800 dark:text-zinc-200">{s?.nome || "Serviço"}</span>
                          <span className="text-sm font-semibold text-[#3A4F4A]">{fmtBRL(s?.valor)}</span>
                        </div>
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-zinc-500">
                          <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {s?.duracao_minutos} min</span>
                          {mainColab && (
                            <span className="flex items-center gap-1"><User className="w-3 h-3" /> Profissional: <strong>{mainColab}</strong></span>
                          )}
                          {auxColab && (
                            <span className="flex items-center gap-1"><Users className="w-3 h-3" /> Auxiliar: <strong>{auxColab}</strong></span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Observações */}
              {resumoAgendamento.observacoes && (
                <div className="space-y-1">
                  <h4 className="text-xs uppercase tracking-wider text-zinc-400 font-semibold flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5" /> Observações
                  </h4>
                  <div className="bg-zinc-50 dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 p-3 rounded-xl text-sm text-zinc-600 dark:text-zinc-400 italic">
                    "{resumoAgendamento.observacoes}"
                  </div>
                </div>
              )}

              {/* Valores Totais */}
              <div className="total-box mt-2">
                <div className="total-label flex items-center gap-1">
                  <Clock className="w-4 h-4 text-zinc-400" />
                  Duração Total: {resumoAgendamento.itens?.reduce((sum, item) => sum + (servicos.find(x => x.id === item.servico_id)?.duracao_minutos || 0), 0)} min
                </div>
                <div className="total-value">{fmtBRL(resumoAgendamento.valor_total)}</div>
              </div>
            </div>
          )}
          <DialogFooter className="flex gap-2">
            <Button variant="outline" onClick={() => setOpenResumo(false)} className="flex-1">Fechar</Button>
            {resumoAgendamento && (
              <>
                <Button variant="outline" onClick={() => { setOpenResumo(false); openEdit(resumoAgendamento); }} className="flex-1 border-[#84A59D] text-[#3A4F4A] hover:bg-[#EAF0EE]">
                  <Edit2 className="w-4 h-4 mr-2" /> Editar
                </Button>
                {resumoAgendamento.status !== "concluido" && (
                  <Button onClick={() => { setOpenResumo(false); nav(`/agendamentos/${resumoAgendamento.id}/pagamento`); }} className="btn-primary flex-1">
                    <CreditCard className="w-4 h-4 mr-2" /> Pagar
                  </Button>
                )}
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* Dialog para informar profissionais ausentes ao concluir status */}
      <Dialog open={profsDialogOpen} onOpenChange={setProfsDialogOpen}>
        <DialogContent className="sm:max-w-lg">
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
                        onValueChange={(v) => setMissingProfs(missingProfs.map((x, idx) => idx === i ? { ...x, colaborador_id: v } : x))}
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
                        onValueChange={(v) => setMissingProfs(missingProfs.map((x, idx) => idx === i ? { ...x, auxiliar_id: v === "none" ? null : v } : x))}
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
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Confirmar exclusão de agendamento</DialogTitle>
          </DialogHeader>
          <div className="py-4 text-sm text-zinc-600 dark:text-zinc-400">
            Tem certeza que deseja excluir este agendamento? Esta ação removerá o agendamento permanentemente e estornará qualquer produto retornado ao estoque.
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
