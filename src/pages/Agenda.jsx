import { useState, useEffect, useMemo, useRef } from "react";
import http from "../api";
import { PageHeader, EmptyState } from "../components/Page";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Textarea } from "../components/ui/textarea";
import { Checkbox } from "../components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger } from "../components/ui/dialog";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "../components/ui/select";
import StatusBadge, { STATUS_LABELS } from "../components/StatusBadge";
import { Calendar as CalIcon, Plus, ChevronLeft, ChevronRight, Trash2, Edit2, CreditCard, CalendarDays, X, User, Users, Clock, FileText, Scissors, CheckCircle2, History, Package, PlusCircle, ShoppingCart, Loader2, Printer, AlertTriangle, AlertCircle, CalendarOff, Globe, Check, XCircle, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import AgendaTimeline from "../components/AgendaTimeline";
import { useAuth } from "../auth";
import SearchableSelect from "../components/SearchableSelect";
import AuditModal from "../components/AuditModal";
import PasswordConfirmDialog from "../components/PasswordConfirmDialog";
import { formatAgendaDateTime as libFormatAgendaDateTime } from "../lib/date";
import "./Agenda.css";

const fmtBRL = (n) => (n || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const fmtBRLProp = (n) => {
  const val = Number(n || 0);
  if (val === 0) return "R$ 0,00";
  const hasMoreDecimals = (val * 100) % 1 !== 0;
  return val.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
    maximumFractionDigits: hasMoreDecimals ? 4 : 2
  });
};
export const fmtHour = (s) => new Date(s).toLocaleTimeString("pt-BR", { timeZone: "America/Recife", hour: "2-digit", minute: "2-digit" });

const toDateInput = (d) => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const toDateInputInTimezone = (dtStr) => {
  if (!dtStr) return "";
  const d = new Date(dtStr);
  if (isNaN(d.getTime())) return "";
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Recife",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  });
  const parts = formatter.formatToParts(d);
  const getValue = (type) => parts.find(p => p.type === type).value;
  return `${getValue("year")}-${getValue("month")}-${getValue("day")}`;
};

const toDatetimeLocalInput = (dtStr) => {
  if (!dtStr) return "";
  const d = new Date(dtStr);
  if (isNaN(d.getTime())) return "";
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Recife",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  });
  const parts = formatter.formatToParts(d);
  const getValue = (type) => parts.find(p => p.type === type).value;
  let hour = getValue("hour");
  if (hour === "24") hour = "00";
  return `${getValue("year")}-${getValue("month")}-${getValue("day")}T${hour}:${getValue("minute")}`;
};

const AgendaCardSkeleton = () => (
  <div className="agenda-card animate-pulse border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-4 rounded-xl flex items-center gap-4">
    <div className="agenda-time flex flex-col items-center justify-center min-w-[64px] space-y-1">
      <div className="h-6 w-10 bg-zinc-200 dark:bg-zinc-800 rounded"></div>
      <div className="h-3.5 w-12 bg-zinc-200 dark:bg-zinc-800 rounded"></div>
    </div>
    <div className="agenda-content flex-1 space-y-2">
      <div className="h-5 w-40 bg-zinc-200 dark:bg-zinc-800 rounded"></div>
      <div className="h-4 w-60 bg-zinc-150 dark:bg-zinc-800/80 rounded"></div>
      <div className="h-3 w-32 bg-zinc-100 dark:bg-zinc-900 rounded"></div>
    </div>
    <div className="agenda-price text-right min-w-[120px] space-y-2">
      <div className="h-5.5 w-16 bg-zinc-200 dark:bg-zinc-800 rounded ml-auto"></div>
      <div className="h-5 w-20 bg-zinc-150 dark:bg-zinc-850 rounded-full ml-auto"></div>
    </div>
    <div className="agenda-actions flex items-center gap-2">
      <div className="h-8 w-24 bg-zinc-150 dark:bg-zinc-800 rounded"></div>
      <div className="h-8 w-8 bg-zinc-150 dark:bg-zinc-800 rounded-full"></div>
      <div className="h-8 w-8 bg-zinc-150 dark:bg-zinc-800 rounded-full"></div>
    </div>
  </div>
);

const CalendarSkeleton = () => (
  <div className="month-grid animate-pulse">
    <div className="weekday-header">Dom</div>
    <div className="weekday-header">Seg</div>
    <div className="weekday-header">Ter</div>
    <div className="weekday-header">Qua</div>
    <div className="weekday-header">Qui</div>
    <div className="weekday-header">Sex</div>
    <div className="weekday-header">Sáb</div>
    {Array.from({ length: 35 }).map((_, idx) => (
      <div key={idx} className="month-day bg-zinc-50 dark:bg-zinc-950/50 min-h-[80px] rounded-lg border border-zinc-100 dark:border-zinc-800/80 p-2 flex flex-col justify-between">
        <div className="h-4 w-6 bg-zinc-200 dark:bg-zinc-800 rounded"></div>
        {idx % 4 === 0 && (
          <div className="h-5 w-16 bg-zinc-150 dark:bg-zinc-800 rounded mt-2"></div>
        )}
      </div>
    ))}
  </div>
);

const renderConflictMessage = (msg) => {
  if (!msg) return null;
  if (!msg.includes("Conflito de indisponibilidade")) {
    return <span>{msg}</span>;
  }
  
  const prefix = "Conflito de indisponibilidade: ";
  const content = msg.startsWith(prefix) ? msg.slice(prefix.length) : msg;
  const items = content.split("; ");
  
  return (
    <div>
      <span className="font-bold text-red-600 dark:text-red-400">Conflito de indisponibilidade:</span>
      <ul className="mt-2 space-y-1.5 pl-1">
        {items.map((item, idx) => {
          const colabPrefix = "O colaborador ";
          const possuiIndex = item.indexOf(" possui ");
          const motivoPrefix = " Motivo: ";
          const motivoIndex = item.indexOf(motivoPrefix);
          
          if (possuiIndex !== -1 && item.startsWith(colabPrefix)) {
            const colabNome = item.slice(colabPrefix.length, possuiIndex);
            let resto = "";
            let motivo = "";
            
            if (motivoIndex !== -1) {
              resto = item.slice(possuiIndex, motivoIndex);
              motivo = item.slice(motivoIndex + motivoPrefix.length);
            } else {
              resto = item.slice(possuiIndex);
            }
            
            return (
              <li key={idx} className="text-zinc-600 dark:text-zinc-400 text-xs sm:text-sm leading-relaxed">
                • O colaborador <strong className="text-zinc-900 dark:text-zinc-100 font-bold">{colabNome}</strong>
                {resto}
                {motivo && (
                  <>
                    {" "}Motivo: <strong className="text-zinc-900 dark:text-zinc-100 font-bold">{motivo}</strong>
                  </>
                )}
              </li>
            );
          }
          
          return <li key={idx} className="text-zinc-600 dark:text-zinc-400 text-xs sm:text-sm leading-relaxed">• {item}</li>;
        })}
      </ul>
    </div>
  );
};

export default function Agenda() {
  const { user: me } = useAuth();
  const isAdmin = me?.role === "admin";
  const canCreate = isAdmin || me?.perfil?.permissoes?.["agenda.criar"] === true;
  const canOnline = isAdmin || me?.perfil?.permissoes?.["agenda.solicitacoes_online"] === true;
  const canEdit = isAdmin || me?.perfil?.permissoes?.["agenda.editar"] === true;
  const canChangeStatus = isAdmin || me?.perfil?.permissoes?.["agenda.status"] === true;
  const canConclude = isAdmin || me?.perfil?.permissoes?.["agenda.concluir"] === true;
  const canModifyStatus = canChangeStatus || canConclude;
  const canRegisterPayment = isAdmin || me?.perfil?.permissoes?.["agenda.pagamento"] === true;
  const canDelete = isAdmin || me?.perfil?.permissoes?.["agenda.excluir"] === true || (!me?.perfil_acesso_id && me?.pode_excluir_agendamento);
  const canManageIndisponibilidade = isAdmin || me?.perfil?.permissoes?.["colaboradores.indisponibilidade"] === true;
  const canCriarVenda = isAdmin || me?.perfil?.permissoes?.["vendas.criar"] === true || me?.perfil?.permissoes?.acoes?.["vendas.criar"];
  const today = useMemo(() => new Date(), []);
  const [data, setData] = useState(toDateInput(today));
  const [view, setView] = useState("dia");
  const [monthCursor, setMonthCursor] = useState({ y: today.getFullYear(), m: today.getMonth() + 1 });
  const [agendamentos, setAgendamentos] = useState([]);
  const [searchNumero, setSearchNumero] = useState("");
  const [monthEvents, setMonthEvents] = useState({});
  const [indisponibilidades, setIndisponibilidades] = useState([]);
  const [openIndisponibilidade, setOpenIndisponibilidade] = useState(false);
  const [formIndisponibilidade, setFormIndisponibilidade] = useState({
    id: null,
    colaborador_id: "",
    data_hora_inicio: "",
    data_hora_fim: "",
    motivo: ""
  });
  const [loadingIndisponibilidade, setLoadingIndisponibilidade] = useState(false);
  const [openIndispDetails, setOpenIndispDetails] = useState(false);
  const [selectedIndisp, setSelectedIndisp] = useState(null);
  const [deleteConfirmOpenIndisp, setDeleteConfirmOpenIndisp] = useState(false);
  const [pendingDeleteIndispId, setPendingDeleteIndispId] = useState(null);
  const [loading, setLoading] = useState(true);
  const isMounted = useRef(false);
  const [clientes, setClientes] = useState([]);
  const [servicos, setServicos] = useState([]);
  const [configSistema, setConfigSistema] = useState(null);
  const [colaboradores, setColaboradores] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [selectedAddCategory, setSelectedAddCategory] = useState("all");
  const [serviceSearch, setServiceSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(null);
  const [openSenha, setOpenSenha] = useState(false);
  const [senhaData, setSenhaData] = useState({ agendamento_id: null, novo_status: null, email: "", senha: "", motivo: "" });
  const [carregandoSenha, setCarregandoSenha] = useState(false);
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [cancelMotivo, setCancelMotivo] = useState("");
  const [cancelAgendamentoId, setCancelAgendamentoId] = useState(null);
  const [cancellandoStatus, setCancellandoStatus] = useState("cancelado");
  const [exibirCancelados, setExibirCancelados] = useState(false);
  const [openResumo, setOpenResumo] = useState(false);
  const [resumoAgendamento, setResumoAgendamento] = useState(null);
  const [previewPhoto, setPreviewPhoto] = useState(null);
  const [profsDialogOpen, setProfsDialogOpen] = useState(false);
  const [missingProfs, setMissingProfs] = useState([]);
  const [pendingAgendamento, setPendingAgendamento] = useState(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [pastDateConfirmOpen, setPastDateConfirmOpen] = useState(false);
  const [auditOpen, setAuditOpen] = useState(false);
  
  const [solicitacoes, setSolicitacoes] = useState([]);
  const [openSolicitacoes, setOpenSolicitacoes] = useState(false);
  const [loadingSolicitacoes, setLoadingSolicitacoes] = useState(false);
  const [solicitacaoEditions, setSolicitacaoEditions] = useState({});

  const updateSolEdition = (solId, sol, field, value) => {
    setSolicitacaoEditions(prev => {
      const current = prev[solId] || {
        data_hora: toDatetimeLocalInput(sol.data_hora_desejada || sol.data_hora),
        profissional_id: sol.profissional_id || ''
      };
      return {
        ...prev,
        [solId]: {
          ...current,
          [field]: value
        }
      };
    });
  };
  
  const nav = useNavigate();

  const [openNewClient, setOpenNewClient] = useState(false);
  const [clientForm, setClientForm] = useState({ nome: "", telefone: "", email: "" });
  const [savingClient, setSavingClient] = useState(false);
  const [clientNameError, setClientNameError] = useState(false);
  const [clientWhatsappStatus, setClientWhatsappStatus] = useState(null); // null, 'checking', 'exists', 'not_exists', 'error'
  const [duplicateConfirm, setDuplicateConfirm] = useState({ open: false, message: "", resolve: null });
  const clientNomeInputRef = useRef(null);

  const [conflictConfirmOpen, setConflictConfirmOpen] = useState(false);
  const [conflictMessage, setConflictMessage] = useState("");

  const [openRelatorioDialog, setOpenRelatorioDialog] = useState(false);
  const [repDataInicio, setRepDataInicio] = useState(toDateInput(today));
  const [repDataFim, setRepDataFim] = useState(toDateInput(today));
  const [repStatus, setRepStatus] = useState("all");
  const [repColaborador, setRepColaborador] = useState("all");
  const [repResults, setRepResults] = useState([]);
  const [repLoading, setRepLoading] = useState(false);
  const [hasGeneratedReport, setHasGeneratedReport] = useState(false);
  const [empresa, setEmpresa] = useState(null);

  const handleOpenRelatorio = () => {
    setRepDataInicio(toDateInput(today));
    setRepDataFim(toDateInput(today));
    setRepStatus("all");
    setRepColaborador("all");
    setRepResults([]);
    setHasGeneratedReport(false);
    setOpenRelatorioDialog(true);
  };

  const generateReportPDFWithData = (dataList) => {
    try {
      const printWindow = window.open("", "_blank");
      if (!printWindow) {
        toast.error("Por favor, permita pop-ups para gerar o relatório.");
        return;
      }

      const currentDate = new Date().toLocaleDateString("pt-BR");
      const currentTime = new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });

      const colabName = repColaborador === "all" 
        ? "Todos os colaboradores" 
        : repColaborador === "none"
          ? "Sem colaborador"
          : colaboradores.find(c => String(c.id) === String(repColaborador))?.nome || "Colaborador";

      const statusName = {
        all: "Todos os status",
        agendado: "Agendado",
        confirmado: "Confirmado",
        em_andamento: "Em andamento",
        concluido: "Concluído",
        cancelado: "Cancelado"
      }[repStatus];

      const totalRevenue = dataList.reduce((sum, a) => sum + (Number(a.valor_total) || 0), 0);

      const groups = {};
      dataList.forEach(a => {
        const dateKey = toDateInputInTimezone(a.data_hora);
        if (!groups[dateKey]) {
          groups[dateKey] = [];
        }
        groups[dateKey].push(a);
      });
      const sortedGroups = Object.keys(groups)
        .sort()
        .map(dateKey => ({
          date: dateKey,
          appointments: groups[dateKey]
        }));

      const kpiColumnsStyle = isAdmin ? "grid-template-columns: repeat(2, 1fr);" : "grid-template-columns: 1fr;";

      let htmlContent = `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>Relatório de Agendamentos</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;600;700&family=Manrope:wght@400;500;600;700&display=swap" rel="stylesheet">
  <style>
    body {
      font-family: 'Manrope', sans-serif;
      color: #1f2937;
      margin: 0;
      padding: 30px;
      background-color: #ffffff;
      font-size: 11px;
      line-height: 1.5;
    }
    h1, h2, h3, .font-display {
      font-family: 'Outfit', sans-serif;
      margin: 0;
    }
    .header {
      border-bottom: 2px solid #84A59D;
      padding-bottom: 15px;
      margin-bottom: 25px;
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
    }
    .header-left h1 {
      font-size: 22px;
      font-weight: 700;
      color: #3A4F4A;
      letter-spacing: -0.02em;
    }
    .header-left p {
      margin: 4px 0 0 0;
      color: #6b7280;
      font-size: 10px;
    }
    .header-right {
      text-align: right;
      color: #6b7280;
      font-size: 10px;
    }
    .header-right .brand {
      font-size: 14px;
      font-weight: 700;
      color: #84A59D;
      font-family: 'Outfit', sans-serif;
      margin-bottom: 3px;
    }
    
    .filters-summary {
      background-color: #f9fafb;
      border: 1px solid #e5e7eb;
      border-radius: 8px;
      padding: 10px 15px;
      margin-bottom: 20px;
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 10px;
    }
    .filter-item {
      display: flex;
      flex-direction: column;
    }
    .filter-label {
      font-size: 9px;
      font-weight: 700;
      color: #9ca3af;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    .filter-value {
      font-size: 11px;
      font-weight: 600;
      color: #374151;
    }

    /* KPI grid */
    .kpi-container {
      display: grid;
      ${kpiColumnsStyle}
      gap: 15px;
      margin-bottom: 25px;
    }
    .kpi-card {
      border: 1px solid #e5e7eb;
      border-radius: 12px;
      padding: 12px 15px;
      background-color: #ffffff;
      box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
    }
    .kpi-card.highlight {
      background-color: #fafdfd;
      border-color: #e1eeed;
    }
    .kpi-title {
      font-size: 9px;
      font-weight: 700;
      color: #9ca3af;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    .kpi-value {
      font-family: 'Outfit', sans-serif;
      font-size: 18px;
      font-weight: 700;
      color: #374151;
      margin-top: 4px;
    }
    .kpi-card.highlight .kpi-value {
      color: #3A4F4A;
    }
    .kpi-subtitle {
      font-size: 8px;
      color: #9ca3af;
      margin-top: 2px;
    }

    .date-section {
      margin-bottom: 25px;
      page-break-inside: avoid;
    }
    .date-header {
      background-color: #f4f7f6;
      border-left: 4px solid #84A59D;
      padding: 8px 12px;
      margin-bottom: 12px;
      font-family: 'Outfit', sans-serif;
      font-size: 13px;
      font-weight: 700;
      color: #3A4F4A;
      border-radius: 0 6px 6px 0;
    }
    
    .report-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 15px;
    }
    .report-table th {
      background-color: #f9fafb;
      font-size: 9px;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: #6b7280;
      border-bottom: 1.5px solid #e5e7eb;
      padding: 8px 12px;
      font-weight: 700;
      text-align: left;
    }
    .report-table td {
      padding: 8px 12px;
      border-bottom: 1px solid #f3f4f6;
      font-size: 10px;
      vertical-align: top;
    }
    .report-table tr:hover {
      background-color: #fcfcfc;
    }
    
    .services-list {
      margin: 0;
      padding: 0;
      list-style: none;
    }
    .services-list li {
      display: flex;
      justify-content: space-between;
      font-size: 9.5px;
      color: #4b5563;
      margin-bottom: 2px;
    }

    .numeric {
      text-align: right;
    }
    .center {
      text-align: center;
    }
    .font-mono {
      font-family: monospace;
    }
    
    .status-badge {
      display: inline-block;
      padding: 1px 6px;
      border-radius: 10px;
      font-size: 8px;
      font-weight: 700;
      text-transform: uppercase;
      text-align: center;
    }
    .status-agendado {
      background-color: #eff6ff;
      color: #1d4ed8;
      border: 1px solid #dbeafe;
    }
    .status-confirmado {
      background-color: #f5f3ff;
      color: #6d28d9;
      border: 1px solid #ede9fe;
    }
    .status-em_andamento {
      background-color: #fff7ed;
      color: #c2410c;
      border: 1px solid #ffedd5;
    }
    .status-concluido {
      background-color: #ecfdf5;
      color: #047857;
      border: 1px solid #d1fae5;
    }
    .status-cancelado {
      background-color: #fef2f2;
      color: #b91c1c;
      border: 1px solid #fee2e2;
    }

    @media print {
      body {
        padding: 0;
        font-size: 10px;
      }
      .kpi-card {
        box-shadow: none;
      }
      .date-section {
        page-break-inside: avoid;
      }
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="header-left">
      <h1>Relatório de Agendamentos</h1>
      <p>Gerado a partir da programação da agenda de atendimentos.</p>
    </div>
    <div class="header-right">
      ${empresa?.logomarca 
        ? `<img src="${empresa.logomarca}" style="max-height: 80px; max-width: 240px; object-fit: contain; margin-bottom: 5px;" />` 
        : `<div class="brand">${empresa?.nome_fantasia || "Salon Studio"}</div>`
      }
      <div>Gerado em ${currentDate} às ${currentTime}</div>
    </div>
  </div>

  <div class="filters-summary">
    <div class="filter-item">
      <span class="filter-label">Período</span>
      <span class="filter-value">${new Date(repDataInicio + 'T12:00:00').toLocaleDateString('pt-BR')} a ${new Date(repDataFim + 'T12:00:00').toLocaleDateString('pt-BR')}</span>
    </div>
    <div class="filter-item">
      <span class="filter-label">Colaborador</span>
      <span class="filter-value">${colabName}</span>
    </div>
    <div class="filter-item">
      <span class="filter-label">Status Agendamentos</span>
      <span class="filter-value">${statusName}</span>
    </div>
    <div class="filter-item">
      <span class="filter-label">Total Gerado</span>
      <span class="filter-value">${dataList.length} registros</span>
    </div>
  </div>

  <div class="kpi-container">
    <div class="kpi-card">
      <div class="kpi-title">Total de Atendimentos</div>
      <div class="kpi-value">${dataList.length}</div>
      <div class="kpi-subtitle">Agendamentos no período</div>
    </div>
    ${isAdmin ? `
    <div class="kpi-card highlight">
      <div class="kpi-title">Faturamento Previsto</div>
      <div class="kpi-value">${fmtBRL(totalRevenue)}</div>
      <div class="kpi-subtitle">Soma total dos atendimentos filtrados</div>
    </div>
    ` : ''}
  </div>
`;

      sortedGroups.forEach((group) => {
        htmlContent += `
        <div class="date-section">
          <div class="date-header">${formatSelectedDate(group.date)}</div>
          <table class="report-table">
            <thead>
              <tr>
                <th style="width: 80px;">Horário</th>
                <th>Cliente</th>
                <th style="width: 110px;" class="center">Status</th>
                <th style="width: ${isAdmin ? '320px' : '440px'};">Serviços Agendados${isAdmin ? ' (Valor Unitário)' : ''}</th>
                ${isAdmin ? '<th style="width: 120px;" class="numeric">Valor Total</th>' : ''}
              </tr>
            </thead>
            <tbody>
        `;

        group.appointments.forEach((a) => {
          const formattedHour = fmtHour(a.data_hora);
          const statusBadge = `<span class="status-badge status-${a.status}">${a.status === 'em_andamento' ? 'em andamento' : a.status}</span>`;
          
          let servicesLi = `<ul class="services-list">`;
          a.itens?.forEach((item) => {
            const serv = servicos.find(s => s.id === item.servico_id);
            const colab = colaboradores.find(c => c.id === item.colaborador_id);
            const aux = item.auxiliar_id ? colaboradores.find(c => c.id === item.auxiliar_id) : null;
            const colabText = colab ? ` <span style="font-size: 8px; color: #6b7280; font-weight: normal; margin-left: 5px;">(${colab.nome}${aux ? ` / Aux: ${aux.nome}` : ''})</span>` : '';
            
            servicesLi += `<li>
              <span>${item.nome || serv?.nome || "Serviço"}${colabText}</span>
              ${isAdmin ? `<span class="font-mono">${fmtBRL(item.valor)}</span>` : ''}
            </li>`;
          });
          servicesLi += `</ul>`;

          htmlContent += `
            <tr>
              <td class="font-mono font-semibold">${formattedHour}</td>
              <td style="font-weight: 600;">${a.cliente_nome}</td>
              <td class="center">${statusBadge}</td>
              <td>${servicesLi}</td>
              ${isAdmin ? `<td class="numeric font-mono font-bold" style="color: #3A4F4A;">${fmtBRL(a.valor_total)}</td>` : ''}
            </tr>
          `;
        });

        htmlContent += `
            </tbody>
          </table>
        </div>
        `;
      });

      htmlContent += `
  <div style="margin-top: 35px; text-align: center; font-size: 8px; color: #9ca3af; border-top: 1px dashed #e5e7eb; padding-top: 15px; page-break-inside: avoid;">
    <p style="margin: 0;">Relatório gerado automaticamente pelo sistema Studio App. Documento para fins de controle interno e conferência.</p>
    <p style="margin: 2px 0 0 0;">© ${new Date().getFullYear()} Salon Studio - Todos os direitos reservados.</p>
  </div>
</body>
</html>
      `;

      printWindow.document.write(htmlContent);
      printWindow.document.close();
      printWindow.onload = () => {
        printWindow.focus();
        printWindow.print();
      };
    } catch (error) {
      console.error(error);
      toast.error("Erro ao gerar o relatório em PDF.");
    }
  };

  const handleGerarRelatorio = async () => {
    if (!repDataInicio || !repDataFim) {
      toast.error("Informe a data inicial e final.");
      return;
    }
    setRepLoading(true);
    try {
      const res = await http.get("/agendamentos", {
        params: {
          data_inicio: repDataInicio,
          data_fim: repDataFim
        }
      });
      
      let filtered = res.data || [];
      
      // Filtrar por status
      if (repStatus !== "all") {
        filtered = filtered.filter(a => a.status === repStatus);
      }
      
      // Filtrar por colaborador
      if (repColaborador !== "all") {
        filtered = filtered.filter(a => {
          const itens = a.itens || [];
          if (repColaborador === "none") {
            return !itens.some(i => i.colaborador_id && i.colaborador_id !== "none");
          } else {
            return itens.some(i => i.colaborador_id === repColaborador || i.auxiliar_id === repColaborador);
          }
        });
      }
      
      setRepResults(filtered);
      setHasGeneratedReport(true);

      if (filtered.length === 0) {
        toast.info("Nenhum registro encontrado para gerar o PDF.");
        return;
      }

      generateReportPDFWithData(filtered);
    } catch (e) {
      toast.error(e.response?.data?.detail || "Erro ao carregar dados do relatório");
    } finally {
      setRepLoading(false);
    }
  };

  const groupedReportResults = useMemo(() => {
    const groups = {};
    repResults.forEach(a => {
      const dateKey = toDateInputInTimezone(a.data_hora);
      if (!groups[dateKey]) {
        groups[dateKey] = [];
      }
      groups[dateKey].push(a);
    });
    return Object.keys(groups)
      .sort()
      .map(dateKey => ({
        date: dateKey,
        appointments: groups[dateKey]
      }));
  }, [repResults]);

  const reportTotalRevenue = useMemo(() => {
    return repResults.reduce((sum, a) => sum + (Number(a.valor_total) || 0), 0);
  }, [repResults]);

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

      if (searchNumero && searchNumero.trim()) {
        const numStr = String(a.numero || "");
        const searchVal = searchNumero.trim();
        const paddedNum = numStr.padStart(6, "0");
        if (!numStr.includes(searchVal) && !paddedNum.includes(searchVal)) {
          return false;
        }
      }

      return true;
    });
  }, [agendamentos, selectedStatus, selectedInsumos, selectedColaborador, searchNumero, servicos]);

  const filteredIndisponibilidades = useMemo(() => {
    return indisponibilidades.filter(indisp => {
      if (selectedColaborador !== "all") {
        if (indisp.colaborador_id !== selectedColaborador) {
          return false;
        }
      }
      if (searchNumero && searchNumero.trim()) {
        return false;
      }
      if (selectedStatus !== "all") {
        return false;
      }
      if (selectedInsumos !== "all") {
        return false;
      }
      return true;
    });
  }, [indisponibilidades, selectedColaborador, searchNumero, selectedStatus, selectedInsumos]);

  const unifiedAgendaItems = useMemo(() => {
    const items = [
      ...filteredAgendamentos.map(a => ({ type: "agendamento", date: new Date(a.data_hora), data: a })),
      ...filteredIndisponibilidades.map(i => ({ type: "indisponibilidade", date: new Date(i.data_hora_inicio), data: i }))
    ];
    items.sort((x, y) => {
      const diff = x.date.getTime() - y.date.getTime();
      if (diff !== 0) return diff;
      if (x.type === "indisponibilidade" && y.type !== "indisponibilidade") return -1;
      if (x.type !== "indisponibilidade" && y.type === "indisponibilidade") return 1;
      return 0;
    });
    return items;
  }, [filteredAgendamentos, filteredIndisponibilidades]);

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

      // custo_unitario = cost of the whole package (never altered)
      const custoUnitario = Number(prod?.custo_unitario || 0);
      const quantidadePorUnidade = Number(prod?.quantidade_por_unidade || 0);

      // custo_proporcional = cost per unit of measure (e.g. per gram/ml)
      // Priority: value already saved in the appointment -> recalculate from product
      const savedProporcional = (saved?.custo_proporcional != null) ? Number(saved.custo_proporcional) : null;
      const custoProporcional = (savedProporcional !== null && savedProporcional > 0)
        ? savedProporcional
        : (quantidadePorUnidade > 0 ? custoUnitario / quantidadePorUnidade : custoUnitario);

      return {
        produto_id: pid,
        nome: prod?.nome || "Produto desconhecido",
        unidade: prod?.unidade_medida || "un",
        unidade_medida_insumo: prod?.unidade_medida_insumo || "un",
        quantidade_estoque: prod?.quantidade_estoque || 0,
        custo_unitario: custoUnitario,
        quantidade_por_unidade: quantidadePorUnidade,
        custo_proporcional: custoProporcional,
        quantidade: saved ? Number(saved.quantidade || 0).toFixed(3) : "",
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

    const custoUnitario = Number(prod.custo_unitario || 0);
    const quantidadePorUnidade = Number(prod.quantidade_por_unidade || 0);
    const custoProporcional = quantidadePorUnidade > 0
      ? custoUnitario / quantidadePorUnidade
      : custoUnitario;

    setTempUtilizedProducts([
      ...tempUtilizedProducts,
      {
        produto_id: prodId,
        nome: prod.nome,
        unidade: prod.unidade_medida || "un",
        unidade_medida_insumo: prod.unidade_medida_insumo || "un",
        quantidade_estoque: prod.quantidade_estoque,
        custo_unitario: custoUnitario,
        quantidade_por_unidade: quantidadePorUnidade,
        custo_proporcional: custoProporcional,
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
        custo_unitario: row.custo_unitario,
        quantidade_por_unidade: row.quantidade_por_unidade || 0,
        custo_proporcional: row.custo_proporcional || row.custo_unitario,
        unidade_medida_insumo: row.unidade_medida_insumo || "un"
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

      if (creds) {
        payload.auth_email = creds.email;
        payload.auth_password = creds.password;
      }

      const params = { params: { only_insumos: true } };
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

  const formatPhone = (val) => {
    if (!val) return "";
    const digits = val.replace(/\D/g, "");
    const cleanDigits = digits.slice(0, 11);

    if (cleanDigits.length <= 2) {
      return cleanDigits;
    }
    if (cleanDigits.length <= 6) {
      return `(${cleanDigits.slice(0, 2)}) ${cleanDigits.slice(2)}`;
    }
    if (cleanDigits.length <= 10) {
      return `(${cleanDigits.slice(0, 2)}) ${cleanDigits.slice(2, 6)}-${cleanDigits.slice(6)}`;
    }
    return `(${cleanDigits.slice(0, 2)}) ${cleanDigits.slice(2, 7)}-${cleanDigits.slice(7)}`;
  };

  const checkClientWhatsapp = async (value) => {
    if (!value || value.replace(/\D/g, "").length < 10) {
      setClientWhatsappStatus(null);
      return;
    }
    setClientWhatsappStatus("checking");
    try {
      const { data } = await http.post("/configuracoes/whatsapp/check-number", { phone: value });
      if (data.exists) {
        setClientWhatsappStatus("exists");
      } else {
        setClientWhatsappStatus("not_exists");
      }
    } catch (e) {
      console.error("Erro ao checar whatsapp:", e);
      setClientWhatsappStatus("error");
    }
  };

  const showDuplicateConfirm = (message) => {
    return new Promise((resolve) => {
      setDuplicateConfirm({ open: true, message, resolve });
    });
  };

  const handleDuplicateConfirmResponse = (accepted) => {
    if (duplicateConfirm.resolve) {
      duplicateConfirm.resolve(accepted);
    }
    setDuplicateConfirm({ open: false, message: "", resolve: null });
  };

  const saveNewClient = async () => {
    if (!clientForm.nome || !clientForm.nome.trim()) {
      toast.error("O preenchimento do campo Nome é obrigatório para a conclusão do cadastro.");
      setClientNameError(true);
      clientNomeInputRef.current?.focus();
      return;
    }

    let cleanPhoneDigits = "";
    if (clientForm.telefone) {
      cleanPhoneDigits = clientForm.telefone.replace(/\D/g, "");
      if (cleanPhoneDigits.length > 0) {
        if (cleanPhoneDigits.length < 10) {
          toast.error("O número de telefone deve conter o DDD e pelo menos 8 ou 9 dígitos.");
          return;
        }
      }
    }

    const cleanNameInput = clientForm.nome.trim().toLowerCase();
    const duplicateName = clientes.find(c =>
      (c.nome || "").trim().toLowerCase() === cleanNameInput
    );

    let duplicatePhone = null;
    if (cleanPhoneDigits) {
      duplicatePhone = clientes.find(c =>
        (c.telefone || "").replace(/\D/g, "") === cleanPhoneDigits
      );
    }

    const permitirClienteDuplicado = !!configSistema?.permitir_cliente_duplicado;

    if (permitirClienteDuplicado) {
      if (duplicateName) {
        const confirmName = await showDuplicateConfirm("Já existe um cliente cadastrado com esse nome. Deseja continuar mesmo assim?");
        if (!confirmName) return;
      }
      if (duplicatePhone) {
        const confirmPhone = await showDuplicateConfirm(`Já existe um cliente cadastrado com este número de telefone. O cliente é: ${duplicatePhone.nome}. Deseja continuar mesmo assim?`);
        if (!confirmPhone) return;
      }
    } else {
      if (duplicateName) {
        toast.error("Já existe um cliente cadastrado com esse nome.");
        return;
      }
      if (duplicatePhone) {
        toast.error(`Já existe um cliente cadastrado com este número de telefone (${duplicatePhone.nome}).`);
        return;
      }
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
      setClientNameError(false);
      setClientWhatsappStatus(null);
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

  const loadDay = (d, num = searchNumero) => {
    const params = {};
    if (num && num.trim() !== "") {
      params.numero = num.trim();
      setIndisponibilidades([]);
      return http.get("/agendamentos", { params }).then((r) => setAgendamentos(r.data || []));
    } else {
      params.data = d;
      const fetchAgend = http.get("/agendamentos", { params }).then((r) => setAgendamentos(r.data || []));
      const fetchIndisp = http.get("/colaboradores/indisponibilidade", { params: { data: d } }).then((r) => setIndisponibilidades(r.data || []));
      return Promise.all([fetchAgend, fetchIndisp]);
    }
  };

  const loadMonth = (y, m) => {
    const ms = `${y}-${String(m).padStart(2, "0")}`;
    return http.get("/agendamentos", { params: { mes: ms } }).then((r) => {
      const map = {};
      const dados = r.data || [];
      dados.forEach((a) => {
        if (a.status !== "cancelado") {
          const day = new Date(a.data_hora).toLocaleDateString("pt-BR", { timeZone: "America/Recife", day: "2-digit" });
          if (!map[day]) {
            map[day] = {
              count: 0,
              hasPending: false
            };
          }
          map[day].count += 1;
          if (a.status !== "concluido") {
            map[day].hasPending = true;
          }
        }
      });
      setMonthEvents(map);
    });
  };

  const loadSolicitacoes = () => {
    if (!canOnline) return Promise.resolve();
    return http.get("/solicitacoes-online").then((r) => setSolicitacoes(r.data || [])).catch(() => {});
  };

  useEffect(() => {
    setLoading(true);
    Promise.all([
      loadDay(data),
      loadMonth(today.getFullYear(), today.getMonth() + 1),
      loadSolicitacoes(),
      http.get("/clientes").then((r) => setClientes(r.data || [])),
      http.get("/servicos").then((r) => setServicos(r.data || [])),
      http.get("/colaboradores").then((r) => setColaboradores(r.data || [])),
      http.get("/categorias").then((r) => setCategorias(r.data || [])),
      http.get("/produtos").then((r) => setProdutos(r.data || [])),
      http.get("/configuracoes/empresa").then((r) => setEmpresa(r.data || null)).catch(() => {}),
      http.get("/configuracoes/sistema").then((r) => setConfigSistema(r.data || null)).catch(() => {})
    ]).finally(() => {
      setLoading(false);
      isMounted.current = true;
    });
  }, []);

  useEffect(() => {
    if (!isMounted.current) return;
    setLoading(true);
    loadDay(data, searchNumero).finally(() => setLoading(false));
  }, [data, searchNumero]);

  useEffect(() => {
    if (!isMounted.current) return;
    setLoading(true);
    loadMonth(monthCursor.y, monthCursor.m).finally(() => setLoading(false));
  }, [monthCursor]);

  useEffect(() => {
    if (openSenha) {
      setSenhaData((prev) => ({ ...prev, email: "", senha: "" }));
    }
  }, [openSenha]);



  const doSave = async (ignorarConflito = false) => {
    try {
      const payload = ignorarConflito ? { ...form, ignorar_conflito: true } : form;
      if (form.id) {
        const res = await http.put(`/agendamentos/${form.id}`, payload);
        if (res.data?.warning) {
          toast.warning(res.data.warning, { duration: 8000 });
        } else {
          toast.success("Agendamento atualizado");
        }
      } else {
        await http.post("/agendamentos", payload);
        toast.success("Agendamento criado");
      }
      setOpen(false);
      setForm(null);
      loadDay(data);
      loadMonth(monthCursor.y, monthCursor.m);
    } catch (e) {
      const errorMsg = e.response?.data?.detail || "Erro ao salvar agendamento";
      if (errorMsg.includes("Conflito de horário") || errorMsg.includes("Conflito de indisponibilidade")) {
        setConflictMessage(errorMsg);
        setConflictConfirmOpen(true);
      } else {
        toast.error(errorMsg);
      }
    }
  };

  const handleAprovarSolicitacao = async (id, originalSol) => {
    setLoadingSolicitacoes(true);
    try {
      const edition = solicitacaoEditions[id];
      const payload = {};
      
      if (edition?.data_hora) {
        payload.data_hora = new Date(edition.data_hora).toISOString();
      }
      if (edition?.profissional_id !== undefined) {
        payload.profissional_id = edition.profissional_id === "" ? null : edition.profissional_id;
      }

      await http.post(`/solicitacoes-online/${id}/aprovar`, payload);
      toast.success("Solicitação aprovada e agendamento criado com sucesso!");
      loadSolicitacoes();
      loadDay(data);
      loadMonth(monthCursor.y, monthCursor.m);
    } catch (e) {
      toast.error(e.response?.data?.detail || "Erro ao aprovar solicitação");
    } finally {
      setLoadingSolicitacoes(false);
    }
  };

  const handleRejeitarSolicitacao = async (id) => {
    setLoadingSolicitacoes(true);
    try {
      await http.post(`/solicitacoes-online/${id}/rejeitar`);
      toast.success("Solicitação rejeitada com sucesso.");
      loadSolicitacoes();
    } catch (e) {
      toast.error(e.response?.data?.detail || "Erro ao rejeitar solicitação");
    } finally {
      setLoadingSolicitacoes(false);
    }
  };

  const openRegisterIndisponibilidade = () => {
    const userColabId = me?.colaborador_id || "";
    const initialColabId = colaboradores.some(c => c.id === userColabId && c.ativo) ? userColabId : "";
    
    setFormIndisponibilidade({
      id: null,
      colaborador_id: initialColabId,
      data_hora_inicio: `${data}T09:00`,
      data_hora_fim: `${data}T10:00`,
      motivo: ""
    });
    setOpenIndisponibilidade(true);
  };

  const handleOpenEditIndisponibilidade = (indisp) => {
    setOpenIndispDetails(false);
    setFormIndisponibilidade({
      id: indisp.id,
      colaborador_id: indisp.colaborador_id,
      data_hora_inicio: toDatetimeLocalInput(indisp.data_hora_inicio),
      data_hora_fim: toDatetimeLocalInput(indisp.data_hora_fim),
      motivo: indisp.motivo || ""
    });
    setOpenIndisponibilidade(true);
  };

  const handleOpenDetailsIndisponibilidade = (indisp) => {
    setSelectedIndisp(indisp);
    setOpenIndispDetails(true);
  };

  const handleSaveIndisponibilidade = async () => {
    if (!canManageIndisponibilidade) {
      toast.error("Você não tem permissão para gerenciar indisponibilidades.");
      return;
    }
    const { id, colaborador_id, data_hora_inicio, data_hora_fim, motivo } = formIndisponibilidade;
    
    if (!colaborador_id) {
      toast.error("Selecione um colaborador");
      return;
    }
    if (!data_hora_inicio) {
      toast.error("Selecione a data/hora de início");
      return;
    }
    if (!data_hora_fim) {
      toast.error("Selecione a data/hora de fim");
      return;
    }
    
    const start = new Date(data_hora_inicio);
    const end = new Date(data_hora_fim);
    if (start.getTime() >= end.getTime()) {
      toast.error("A data/hora de início deve ser anterior à de fim");
      return;
    }
    
    if (motivo && motivo.length > 200) {
      toast.error("O motivo deve ter no máximo 200 caracteres");
      return;
    }

    setLoadingIndisponibilidade(true);
    try {
      if (id) {
        await http.put(`/colaboradores/indisponibilidade/${id}`, formIndisponibilidade);
        toast.success("Indisponibilidade atualizada com sucesso");
      } else {
        await http.post("/colaboradores/indisponibilidade", formIndisponibilidade);
        toast.success("Indisponibilidade registrada com sucesso");
      }
      setOpenIndisponibilidade(false);
      loadDay(data);
    } catch (error) {
      const errorMsg = error.response?.data?.detail || "Erro ao salvar indisponibilidade";
      toast.error(errorMsg);
    } finally {
      setLoadingIndisponibilidade(false);
    }
  };

  const handleDeleteIndisponibilidade = (id) => {
    if (!canManageIndisponibilidade) {
      toast.error("Você não tem permissão para excluir indisponibilidades.");
      return;
    }
    setPendingDeleteIndispId(id);
    setDeleteConfirmOpenIndisp(true);
  };

  const confirmDeleteIndisponibilidade = async () => {
    if (!pendingDeleteIndispId) return;
    try {
      await http.delete(`/colaboradores/indisponibilidade/${pendingDeleteIndispId}`);
      toast.success("Indisponibilidade excluída com sucesso");
      setDeleteConfirmOpenIndisp(false);
      setPendingDeleteIndispId(null);
      setOpenIndispDetails(false);
      loadDay(data);
    } catch (error) {
      toast.error(error.response?.data?.detail || "Erro ao excluir indisponibilidade");
    }
  };

  const handleStartDateChange = (val) => {
    setFormIndisponibilidade(prev => {
      const updated = { ...prev, data_hora_inicio: val };
      if (val && !prev.id) {
        try {
          const startDate = new Date(val);
          if (!isNaN(startDate.getTime())) {
            const endDate = new Date(startDate.getTime() + 60 * 60 * 1000);
            const yyyy = endDate.getFullYear();
            const mm = String(endDate.getMonth() + 1).padStart(2, "0");
            const dd = String(endDate.getDate()).padStart(2, "0");
            const hh = String(endDate.getHours()).padStart(2, "0");
            const min = String(endDate.getMinutes()).padStart(2, "0");
            updated.data_hora_fim = `${yyyy}-${mm}-${dd}T${hh}:${min}`;
          }
        } catch (e) {
          console.error("Error calculating end date", e);
        }
      }
      return updated;
    });
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

    if (configSistema?.bloquear_valor_agendamento_menor) {
      for (const item of form.itens_selecionados) {
        const s = servicos.find(x => x.id === item.servico_id);
        if (s) {
          const valorCobrado = item.valor !== undefined && item.valor !== null && item.valor !== '' ? Number(item.valor) : Number(s.valor || 0);
          if (valorCobrado < Number(s.valor || 0)) {
            toast.error(`O valor cobrado para o serviço "${s.nome}" (R$ ${valorCobrado.toFixed(2)}) não pode ser inferior ao valor cadastrado (R$ ${Number(s.valor || 0).toFixed(2)}).`);
            return;
          }
        }
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
    if (!canDelete) {
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
    const isConcluindo = status === "concluido";
    if (isConcluindo) {
      if (!canConclude) {
        toast.error("Você não tem permissão para concluir agendamentos.");
        return;
      }
    } else {
      if (!canChangeStatus) {
        toast.error("Você não tem permissão para alterar o status de agendamentos.");
        return;
      }
    }

    if (status === "cancelado") {
      setCancelAgendamentoId(id);
      setCancelMotivo("");
      if (agendamento?.status === "concluido") {
        setCancellandoStatus("cancelado_concluido");
      } else {
        setCancellandoStatus("cancelado");
      }
      setCancelModalOpen(true);
      return;
    }

    if (agendamento?.status === "concluido" && status !== "concluido") {
      setSenhaData({ agendamento_id: id, novo_status: status, email: "", senha: "", motivo: "" });
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
            auxiliar_id: item.auxiliar_id && item.auxiliar_id !== "none" ? item.auxiliar_id : "",
            valor: item.valor,
            valor_original: item.valor_original
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
          auxiliar_id: x.auxiliar_id === "none" ? null : x.auxiliar_id,
          valor: x.valor,
          valor_original: x.valor_original
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
    if (!senhaData.email || !senhaData.email.trim()) {
      toast.error("Digite seu email");
      return;
    }
    if (!senhaData.senha || !senhaData.senha.trim()) {
      toast.error("Digite sua senha");
      return;
    }

    setCarregandoSenha(true);
    try {
      console.log("Alterando status com credenciais...");
      await http.post(`/agendamentos/${senhaData.agendamento_id}/status`, {
        status: senhaData.novo_status,
        senha: senhaData.senha,
        motivo: senhaData.motivo
      });
      console.log("Status alterado com sucesso!");
      toast.success("Status updated successfully");
      setOpenSenha(false);
      setSenhaData({ agendamento_id: null, novo_status: null, email: "", senha: "", motivo: "" });
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
      const valNum = val === "" ? "" : Number(val);
      itens[index].valor = valNum;
      
      const temDesconto = !!f.desconto_aplicado;
      const temPagamento = Number(f.valor_pago || 0) > 0;
      
      if (!temDesconto && !temPagamento) {
        itens[index].valor_original = valNum;
      }
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
      data_hora: toDateInput(new Date()) + 'T' + new Date().toLocaleTimeString().substring(0, 5),
      itens_selecionados: [],
      observacoes: "",
      status: "agendado",
      valor_pago: 0,
      desconto_aplicado: null
    });
    
    setOpen(true);
  };

  const openEdit = (a) => {
    setForm({
      id: a.id,
      cliente_id: a.cliente_id,
      data_hora: toDatetimeLocalInput(a.data_hora),
      itens_selecionados: a.itens || [],
      observacoes: a.observacoes || "",
      status: a.status,
      valor_pago: a.valor_pago,
      desconto_aplicado: a.desconto_aplicado
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
          <Button
            variant="outline"
            onClick={handleOpenRelatorio}
            className="flex items-center gap-1.5 text-xs font-semibold text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200 border border-zinc-200 dark:border-zinc-800 h-9"
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Relatório</span>
          </Button>
          {canManageIndisponibilidade && (
            <Button
              variant="outline"
              onClick={openRegisterIndisponibilidade}
              className="flex items-center gap-1.5 text-xs font-semibold text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200 border border-zinc-200 dark:border-zinc-800 h-9"
            >
              <AlertCircle className="w-3.5 h-3.5" />
              <span>Registrar Indisponibilidade</span>
            </Button>
          )}
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          {canOnline && (
            <Button 
              variant="outline" 
              onClick={() => {
                loadSolicitacoes();
                setOpenSolicitacoes(true);
              }}
              className="relative w-full sm:w-auto h-10 border-zinc-200 dark:border-zinc-800"
            >
              <Globe className="w-4 h-4 mr-2" /> 
              Online
              {solicitacoes.filter(s => s.status === 'pendente').length > 0 && (
                <span className="absolute -top-2 -right-2 bg-rose-500 text-white text-[10px] font-bold w-5 h-5 flex items-center justify-center rounded-full animate-bounce">
                  {solicitacoes.filter(s => s.status === 'pendente').length}
                </span>
              )}
            </Button>
          )}
          {canCreate && (
            <button className="btn-primary w-full sm:w-auto justify-center" onClick={openNew}><Plus className="w-4 h-4 mr-2" /> Novo</button>
          )}
        </div>
      </div>

      {view !== "calendario" && (
        <div className="flex items-center gap-3 mb-4 flex-wrap bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-3 shadow-sm select-none">
          <div className="flex flex-col gap-1">
            <span className="text-[10px] font-bold text-zinc-400 dark:text-zinc-550 uppercase tracking-wider">Data</span>
            <Input type="date" value={data} onChange={(e) => setData(e.target.value)} className="w-40 h-9 text-xs" />
          </div>
          <div className="flex flex-col gap-1 w-40">
            <span className="text-[10px] font-bold text-zinc-400 dark:text-zinc-550 uppercase tracking-wider">Nº do Serviço</span>
            <Input
              type="text"
              placeholder="Buscar número..."
              value={searchNumero}
              onChange={(e) => setSearchNumero(e.target.value)}
              className="h-9 text-xs bg-white dark:bg-zinc-950 border-zinc-250 dark:border-zinc-850"
            />
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
          {view === "timeline" && (
            <div className="flex items-center gap-2 h-9 self-end mb-0.5 ml-2">
              <Checkbox
                id="exibir-cancelados-checkbox"
                checked={exibirCancelados}
                onCheckedChange={setExibirCancelados}
              />
              <Label
                htmlFor="exibir-cancelados-checkbox"
                className="text-xs font-semibold text-zinc-650 dark:text-zinc-400 cursor-pointer select-none"
              >
                Exibir agendamentos cancelados
              </Label>
            </div>
          )}
        </div>
      )}

      {loading ? (
        view === "dia" ? (
          <div className="space-y-2">
            <AgendaCardSkeleton />
            <AgendaCardSkeleton />
            <AgendaCardSkeleton />
          </div>
        ) : view === "timeline" ? (
          <AgendaTimeline
            data={data}
            selectedStatus={selectedStatus}
            selectedInsumos={selectedInsumos}
            selectedColaborador={selectedColaborador}
            searchNumero={searchNumero}
            servicos={servicos}
            colaboradores={colaboradores}
            onCardClick={openResumoModal}
            onUnavailabilityClick={handleOpenDetailsIndisponibilidade}
            loading={true}
            exibirCancelados={exibirCancelados}
          />
        ) : (
          <>
            <div className="flex items-center gap-2 mb-4">
              <Button size="sm" variant="outline" disabled><ChevronLeft className="w-4 h-4" /></Button>
              <span className="text-sm font-semibold text-center min-w-[150px] text-zinc-400 dark:text-zinc-550">{new Date(monthCursor.y, monthCursor.m - 1).toLocaleDateString("pt-BR", { month: "long", year: "numeric" })}</span>
              <Button size="sm" variant="outline" disabled><ChevronRight className="w-4 h-4" /></Button>
            </div>
            <CalendarSkeleton />
          </>
        )
      ) : view === "dia" ? (
        <>
          {unifiedAgendaItems.length === 0 ? (
            <EmptyState title="Sem registros" description="Nenhum agendamento ou indisponibilidade correspondente aos filtros aplicados" />
          ) : (
            <div className="space-y-2">
              {unifiedAgendaItems.map((item) => {
                if (item.type === "agendamento") {
                  const a = item.data;
                  return (
                    <div key={a.id} className="agenda-card fade-in cursor-pointer hover:shadow-md transition-all duration-200" onClick={() => openResumoModal(a)}>
                      <div className="agenda-time">
                        <div className="agenda-time-hour">{fmtHour(a.data_hora).split(":")[0]}</div>
                        <div className="agenda-time-duration">{fmtHour(a.data_hora)}</div>
                      </div>
                      <div className="agenda-content">
                        <div className="agenda-client-name flex items-center gap-2 flex-wrap">
                          <span>{a.cliente_nome}</span>
                          {a.numero && (
                            <span className="text-[10px] font-mono font-bold bg-[#EAF0EE] text-[#3A4F4A] px-1.5 py-0.5 rounded">
                              {String(a.numero).padStart(6, "0")} | S
                            </span>
                          )}
                          {a.data_hora && toDateInputInTimezone(a.data_hora) !== data && (
                            <span className="text-[10px] font-bold bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400 border border-blue-200/40 dark:border-blue-900/30 px-1.5 py-0.5 rounded">
                              Agendado para: {new Date(a.data_hora).toLocaleDateString('pt-BR', { timeZone: 'America/Recife' })}
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
                        <Select value={a.status || "agendado"} onValueChange={(v) => changeStatus(a.id, v, a)} disabled={!canModifyStatus}>
                          <SelectTrigger className="w-36 h-8 text-xs" data-testid={`status-select-${a.id}`}><SelectValue /></SelectTrigger>
                          <SelectContent>{Object.entries(STATUS_LABELS).filter(([k]) => k && k.trim()).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
                        </Select>
                        {canRegisterPayment && (
                          <Button size="sm" variant="ghost" onClick={() => nav(`/agendamentos/${a.id}/pagamento`)} title="Pagamento"><CreditCard className="w-4 h-4" /></Button>
                        )}
                        {me && (
                          <Button
                            size="sm"
                            variant="ghost"
                            title={
                              !canCriarVenda
                                ? "Acesso negado: Você não tem permissão para realizar vendas"
                                : a.status === "concluido"
                                  ? "Não é permitido realizar vendas diretas para agendamento pago"
                                  : "Nova venda direta para este cliente"
                            }
                            disabled={a.status === "concluido" || !canCriarVenda}
                            onClick={() => nav(`/vendas-diretas?cliente_id=${a.cliente_id}&from=agenda`)}
                            className={`text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-950/30 ${
                              a.status === "concluido" || !canCriarVenda ? "opacity-50 cursor-not-allowed text-zinc-400 hover:text-zinc-400 hover:bg-transparent" : ""
                            }`}
                          >
                            <ShoppingCart className="w-4 h-4" />
                          </Button>
                        )}
                        {canEdit && a.status !== "concluido" && (
                          <Button size="sm" variant="ghost" onClick={() => openEdit(a)}><Edit2 className="w-4 h-4" /></Button>
                        )}
                        {canDelete && (
                          <Button size="sm" variant="ghost" onClick={() => del(a.id)}><Trash2 className="w-4 h-4 text-rose-500" /></Button>
                        )}
                      </div>
                    </div>
                  );
                } else {
                  const i = item.data;
                  const isOwn = me?.role === "admin" || (me?.colaborador_id === i.colaborador_id);
                  return (
                    <div 
                      key={i.id} 
                      className="agenda-card agenda-card-unavailability fade-in border-l-4 border-l-sky-500 cursor-pointer hover:shadow-md transition-all duration-200" 
                      onClick={() => handleOpenDetailsIndisponibilidade(i)}
                    >
                      <div className="agenda-time">
                        <div className="agenda-time-hour text-sky-700 dark:text-sky-300">{fmtHour(i.data_hora_inicio).split(":")[0]}</div>
                        <div className="agenda-time-duration text-sky-600 dark:text-sky-400">{fmtHour(i.data_hora_inicio)} - {fmtHour(i.data_hora_fim)}</div>
                      </div>
                      <div className="agenda-content flex-1">
                        <div className="agenda-client-name text-sky-950 dark:text-sky-100 font-bold flex items-center gap-2 flex-wrap">
                          <CalendarOff className="w-4 h-4 text-sky-600 dark:text-sky-400 shrink-0" />
                          <span>INDISPONIBILIDADE: {colaboradores.find(c => c.id === i.colaborador_id)?.nome || "Colaborador"}</span>
                        </div>
                        <div className="agenda-services text-sky-700 dark:text-sky-300 mt-1 font-medium">
                          {i.motivo ? i.motivo : <span className="italic text-zinc-400 dark:text-zinc-650">Sem motivo específico</span>}
                        </div>
                      </div>
                      <div className="agenda-price">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-sky-100 dark:bg-sky-950/40 text-sky-800 dark:text-sky-400 border border-sky-200/40 dark:border-sky-900/30">
                          Indisponível
                        </span>
                      </div>
                      <div className="agenda-actions" onClick={(e) => e.stopPropagation()}>
                        <Button 
                          size="sm" 
                          variant="ghost" 
                          onClick={() => handleOpenEditIndisponibilidade(i)} 
                          title="Editar Indisponibilidade"
                          className="text-zinc-600 hover:text-zinc-700 dark:text-zinc-400"
                        >
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        {me && (
                          <Button 
                            size="sm" 
                            variant="ghost" 
                            onClick={() => handleDeleteIndisponibilidade(i.id)} 
                            title="Excluir Indisponibilidade"
                            className="text-red-500 hover:text-red-700 dark:text-red-400"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                }
              })}
            </div>
          )}
        </>
      ) : view === "timeline" ? (
        <AgendaTimeline data={data} selectedStatus={selectedStatus} selectedInsumos={selectedInsumos} selectedColaborador={selectedColaborador} searchNumero={searchNumero} servicos={servicos} colaboradores={colaboradores} onCardClick={openResumoModal} onUnavailabilityClick={handleOpenDetailsIndisponibilidade} loading={false} exibirCancelados={exibirCancelados} />
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
                const dayData = monthEvents[String(day).padStart(2, "0")];
                const hasEvents = dayData && dayData.count > 0;
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
                      <div className={`event-badge ${dayData.hasPending ? "status-pending" : "status-completed"}`}>
                        <CalendarDays className="w-3 h-3" />
                        {dayData.count}
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
                            disabled={Number(form.valor_pago || 0) > 0 || form.status === 'concluido'}
                            className="h-8 text-xs bg-white border border-zinc-200 rounded px-2 disabled:opacity-70 disabled:bg-zinc-50"
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

      {/* Modal de Solicitações Online */}
      <Dialog open={openSolicitacoes} onOpenChange={(open) => { setOpenSolicitacoes(open); if (open) loadSolicitacoes(); }}>
        <DialogContent className="dialog-content w-[95vw] max-w-[95vw] sm:max-w-2xl p-5 sm:p-6 rounded-2xl dark:bg-zinc-900 dark:border-zinc-800" aria-describedby="dialog-solicitacoes">
          <DialogHeader className="dialog-header">
            <DialogTitle className="dialog-title flex items-center justify-between gap-2 w-full pr-6">
              <div className="flex items-center gap-2">
                <Globe className="w-5 h-5 text-[#84A59D]" /> Solicitações Online Pendentes
              </div>
              <Button size="sm" variant="ghost" onClick={loadSolicitacoes} className="h-8 text-xs text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200">
                <RefreshCw className="w-3.5 h-3.5 mr-1" /> Atualizar
              </Button>
            </DialogTitle>
          </DialogHeader>
          <div id="dialog-solicitacoes" className="sr-only">Lista de solicitações de agendamento feitas online pelos clientes</div>
          <div className="dialog-body space-y-4 py-4 max-h-[60vh] overflow-y-auto pr-2">
            {solicitacoes.filter(s => s.status === 'pendente').length === 0 ? (
              <div className="text-center py-10 text-zinc-500 dark:text-zinc-400">
                <Globe className="w-12 h-12 mx-auto mb-3 opacity-20" />
                <p>Nenhuma solicitação pendente no momento.</p>
              </div>
            ) : (
              solicitacoes.filter(s => s.status === 'pendente').map(sol => {
                const edition = solicitacaoEditions[sol.id] || {};
                const currentValDateTime = edition.data_hora !== undefined ? edition.data_hora : toDatetimeLocalInput(sol.data_hora_desejada || sol.data_hora);
                const currentValProf = edition.profissional_id !== undefined ? edition.profissional_id : (sol.profissional_id || '');

                return (
                  <div key={sol.id} className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 shadow-sm relative">
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="font-bold text-lg text-zinc-900 dark:text-zinc-100">{sol.nome_cliente || sol.cliente_nome}</div>
                        <div className="text-sm text-zinc-600 dark:text-zinc-400 mb-2">{sol.telefone || sol.cliente_telefone}</div>
                        <div className="flex items-center gap-2 text-sm font-medium bg-blue-50 dark:bg-blue-900/20 text-blue-800 dark:text-blue-300 px-3 py-1.5 rounded-lg w-fit">
                          <CalendarDays className="w-4 h-4" />
                          {new Date(sol.data_hora_desejada || sol.data_hora).toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </div>
                        <div className="mt-3 text-sm font-semibold text-zinc-700 dark:text-zinc-300">
                          {(Array.isArray(sol.servicos) ? sol.servicos : (typeof sol.servicos === 'string' ? (() => { try { return JSON.parse(sol.servicos); } catch(e) { return []; } })() : [])).map((s, i) => (
                            <div key={i} className="flex items-center gap-2">
                              <span className="w-1.5 h-1.5 rounded-full bg-[#84A59D]"></span>
                              {s.servico_nome} {s.colaborador_nome ? `(Prof: ${s.colaborador_nome})` : ''}
                            </div>
                          ))}
                        </div>

                        {/* Editor de Horário e Profissional antes de Aprovar */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4 p-3 bg-zinc-50 dark:bg-zinc-900/40 rounded-xl border border-zinc-100 dark:border-zinc-800/60 max-w-md">
                          <div className="form-group">
                            <label className="text-[10px] font-bold text-zinc-500 mb-1 block uppercase tracking-wider">Ajustar Data e Hora</label>
                            <Input
                              type="datetime-local"
                              value={currentValDateTime}
                              onChange={(e) => updateSolEdition(sol.id, sol, 'data_hora', e.target.value)}
                              className="h-8 text-xs bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800"
                            />
                          </div>
                          <div className="form-group">
                            <label className="text-[10px] font-bold text-zinc-500 mb-1 block uppercase tracking-wider">Mudar Profissional</label>
                            <select
                              value={currentValProf}
                              onChange={(e) => updateSolEdition(sol.id, sol, 'profissional_id', e.target.value)}
                              className="w-full h-8 rounded-md border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 px-2 py-1 text-xs outline-none focus:ring-1 focus:ring-[#84A59D]"
                            >
                              <option value="">Qualquer Profissional</option>
                              {colaboradores.map(colab => (
                                <option key={colab.id} value={colab.id}>{colab.nome}</option>
                              ))}
                            </select>
                          </div>
                        </div>
                      </div>
                      <div className="flex sm:flex-col gap-2 w-full sm:w-auto mt-4 sm:mt-0">
                        <Button 
                          onClick={() => handleAprovarSolicitacao(sol.id, sol)} 
                          disabled={loadingSolicitacoes}
                          className="flex-1 sm:flex-none bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-10"
                        >
                          <Check className="w-4 h-4 mr-2" /> Aprovar
                        </Button>
                        <Button 
                          onClick={() => handleRejeitarSolicitacao(sol.id)} 
                          variant="outline" 
                          disabled={loadingSolicitacoes}
                          className="flex-1 sm:flex-none text-rose-600 hover:text-rose-700 hover:bg-rose-50 border-rose-200 h-10"
                        >
                          <XCircle className="w-4 h-4 mr-2" /> Rejeitar
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenSolicitacoes(false)}>Fechar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={openNewClient}
        onOpenChange={(v) => {
          setOpenNewClient(v);
          setClientNameError(false);
          setClientWhatsappStatus(null);
          if (!v) setClientForm({ nome: "", telefone: "", email: "" });
        }}
      >
        <DialogContent className="dialog-content w-[95vw] max-w-[95vw] sm:max-w-md p-5 sm:p-6 rounded-2xl dark:bg-zinc-900 dark:border-zinc-800" style={{ maxWidth: "26rem" }} aria-describedby="dialog-novo-cliente">
          <DialogHeader className="dialog-header">
            <DialogTitle className="dialog-title">Novo Cliente</DialogTitle>
          </DialogHeader>
          <div id="dialog-novo-cliente" className="sr-only">Cadastrar um novo cliente no sistema</div>
          <div className="dialog-body">
            <div className="form-group mb-3">
              <Label className={`form-label ${clientNameError ? "text-rose-500" : ""}`}>Nome *</Label>
              <Input
                ref={clientNomeInputRef}
                placeholder="Nome do cliente"
                value={clientForm.nome}
                onChange={(e) => {
                  setClientForm({ ...clientForm, nome: e.target.value });
                  if (e.target.value.trim()) {
                    setClientNameError(false);
                  }
                }}
                disabled={savingClient}
                className={`form-input ${clientNameError ? "border-rose-500 focus-visible:ring-rose-500 focus-visible:border-rose-500" : ""}`}
              />
            </div>
            <div className="form-group mb-3">
              <Label className="form-label">Telefone</Label>
              <Input
                placeholder="(XX) XXXXX-XXXX"
                value={clientForm.telefone}
                onChange={(e) => {
                  setClientForm({ ...clientForm, telefone: formatPhone(e.target.value) });
                  if (clientWhatsappStatus) setClientWhatsappStatus(null);
                }}
                onBlur={(e) => checkClientWhatsapp(e.target.value)}
                disabled={savingClient}
                className="form-input"
              />
              {clientWhatsappStatus === "checking" && <span className="text-[11px] text-zinc-500 mt-1 flex items-center gap-1">Verificando WhatsApp... <Loader2 className="w-3 h-3 animate-spin" /></span>}
              {clientWhatsappStatus === "exists" && <span className="text-[11px] text-[#84A59D] font-medium mt-1 block">✓ Possui WhatsApp</span>}
              {clientWhatsappStatus === "not_exists" && <span className="text-[11px] text-amber-500 font-medium mt-1 block">⚠ Não possui WhatsApp</span>}
              {clientWhatsappStatus === "error" && <span className="text-[11px] text-rose-500 font-medium mt-1 block">Erro ao verificar WhatsApp</span>}
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

      {/* Modal de confirmação de duplicidade de cliente */}
      <Dialog open={duplicateConfirm.open} onOpenChange={(v) => { if (!v) handleDuplicateConfirmResponse(false); }}>
        <DialogContent className="w-[95vw] max-w-[95vw] sm:max-w-md p-5 sm:p-6 rounded-2xl dark:bg-zinc-900 dark:border-zinc-800">
          <DialogHeader>
            <DialogTitle className="text-zinc-900 dark:text-zinc-50 flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-amber-500" />
              Confirmação de duplicidade
            </DialogTitle>
          </DialogHeader>
          <div className="py-4 text-sm text-zinc-650 dark:text-zinc-400 leading-relaxed">
            {duplicateConfirm.message}
          </div>
          <DialogFooter className="flex flex-col sm:flex-row gap-2.5 mt-2 pt-2 border-t border-zinc-150 dark:border-zinc-850">
            <Button
              type="button"
              variant="outline"
              onClick={() => handleDuplicateConfirmResponse(false)}
              className="w-full sm:w-auto border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-350 font-semibold"
            >
              Não
            </Button>
            <Button
              type="button"
              onClick={() => handleDuplicateConfirmResponse(true)}
              className="w-full sm:w-auto bg-[#84A59D] hover:bg-[#6F9189] text-white font-bold"
            >
              Sim
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
              <Label className="form-label" htmlFor="secure-status-email">Email</Label>
              <Input
                id="secure-status-email"
                name="secure-status-email"
                type="email"
                placeholder="seu@email.com"
                value={senhaData.email}
                onChange={(e) => setSenhaData({ ...senhaData, email: e.target.value })}
                disabled={carregandoSenha}
                className="form-input"
                autoComplete="nope"
              />
            </div>
            <div className="form-group">
              <Label className="form-label" htmlFor="secure-status-password">Sua senha</Label>
              <Input
                id="secure-status-password"
                name="secure-status-password"
                type="password"
                placeholder="Digite sua senha"
                value={senhaData.senha}
                onChange={(e) => setSenhaData({ ...senhaData, senha: e.target.value })}
                onKeyPress={(e) => e.key === "Enter" && !carregandoSenha && confirmarMudancaStatus()}
                disabled={carregandoSenha}
                className="form-input"
                autoComplete="new-password"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setOpenSenha(false); setSenhaData({ agendamento_id: null, novo_status: null, email: "", senha: "", motivo: "" }); }} disabled={carregandoSenha}>Cancelar</Button>
            <Button onClick={confirmarMudancaStatus} className="btn-primary" disabled={carregandoSenha}>{carregandoSenha ? "Validando..." : "Confirmar"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog para motivo do cancelamento */}
      <Dialog open={cancelModalOpen} onOpenChange={(v) => { if (!v) setCancelModalOpen(false); }}>
        <DialogContent className="dialog-content w-[95vw] max-w-[95vw] sm:max-w-md p-5 sm:p-6 rounded-2xl dark:bg-zinc-900 dark:border-zinc-800" aria-describedby="dialog-cancelar-motivo">
          <DialogHeader className="dialog-header">
            <DialogTitle className="dialog-title flex items-center gap-2 text-rose-600 dark:text-rose-400">
              <CalendarOff className="w-5 h-5" />
              <span>Motivo do Cancelamento</span>
            </DialogTitle>
          </DialogHeader>
          <div id="dialog-cancelar-motivo" className="sr-only">Dialogo para inserir o motivo do cancelamento do agendamento</div>
          <div className="dialog-body py-4">
            <Label htmlFor="cancel-motive-input" className="form-label mb-2 block font-medium text-xs text-zinc-600 dark:text-zinc-400">
              Por favor, informe o motivo do cancelamento (máximo 100 caracteres):
            </Label>
            <Textarea
              id="cancel-motive-input"
              value={cancelMotivo}
              onChange={(e) => setCancelMotivo(e.target.value)}
              placeholder="Digite o motivo do cancelamento..."
              maxLength={100}
              rows={3}
              className="form-input text-xs w-full resize-none bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg p-2.5"
            />
            <div className="text-[10px] text-zinc-450 dark:text-zinc-500 mt-1.5 text-right">
              {cancelMotivo.length} / 100 caracteres
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => {
                setCancelModalOpen(false);
                setCancelAgendamentoId(null);
                setCancelMotivo("");
              }}
            >
              Cancelar
            </Button>
            <Button
              onClick={async () => {
                if (!cancelMotivo || !cancelMotivo.trim()) {
                  toast.error("O motivo do cancelamento é obrigatório.");
                  return;
                }
                if (cancelMotivo.length > 100) {
                  toast.error("O motivo do cancelamento deve ter no máximo 100 caracteres.");
                  return;
                }

                if (cancellandoStatus === "cancelado_concluido") {
                  setCancelModalOpen(false);
                  setSenhaData({
                    agendamento_id: cancelAgendamentoId,
                    novo_status: "cancelado",
                    email: "",
                    senha: "",
                    motivo: cancelMotivo.trim()
                  });
                  setOpenSenha(true);
                } else {
                  try {
                    await http.post(`/agendamentos/${cancelAgendamentoId}/status`, {
                      status: "cancelado",
                      motivo: cancelMotivo.trim()
                    });
                    toast.success("Agendamento cancelado com sucesso");
                    setCancelModalOpen(false);
                    setCancelAgendamentoId(null);
                    setCancelMotivo("");
                    loadDay(data);
                    loadMonth(monthCursor.y, monthCursor.m);
                  } catch (e) {
                    toast.error(e.response?.data?.detail || "Erro ao cancelar agendamento");
                  }
                }
              }}
              className="bg-rose-600 hover:bg-rose-700 text-white font-bold"
            >
              Confirmar Cancelamento
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={openResumo} onOpenChange={setOpenResumo}>
        <DialogContent className="dialog-content w-[95vw] max-w-[95vw] sm:max-w-3xl md:max-w-4xl lg:max-w-5xl rounded-2xl p-5 sm:p-8 overflow-y-auto max-h-[90vh] dark:bg-zinc-900 dark:border-zinc-800" aria-describedby="dialog-resumo">
          <DialogHeader className="dialog-header border-b border-zinc-150 dark:border-zinc-800 pb-4">
            <DialogTitle className="dialog-title w-full">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pr-8">
                <span className="flex items-center gap-2.5 text-xl sm:text-2xl font-extrabold text-zinc-800 dark:text-zinc-100">
                  <CalendarDays className="w-6.5 h-6.5 text-[#84A59D] shrink-0" />
                  Resumo do Atendimento
                </span>
                {resumoAgendamento?.numero && (
                  <span className="self-start sm:self-center text-xs sm:text-sm font-mono font-bold bg-[#EAF0EE] text-[#3A4F4A] dark:bg-zinc-800 dark:text-zinc-200 px-3 py-1 rounded-full shrink-0">
                    Atendimento {String(resumoAgendamento.numero).padStart(6, "0")}
                  </span>
                )}
              </div>
            </DialogTitle>
          </DialogHeader>
          <div id="dialog-resumo" className="sr-only">Resumo detalhado do agendamento selecionado</div>
          {resumoAgendamento && (
            <div className="dialog-body grid grid-cols-1 md:grid-cols-2 gap-8 mt-6">
              
              {/* Coluna Esquerda: Informações Gerais, Status Interativo e Notas */}
              <div className="space-y-6">
                {/* Cliente e Status */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between bg-[#F8FBFB] dark:bg-[#1a2322] p-5 rounded-2xl border border-[#E8EFEF] dark:border-[#2e3e3b] shadow-xs gap-4">
                  <div className="flex items-center gap-4 min-w-0">
                    {(() => {
                      const client = clientes.find(c => c.id === resumoAgendamento.cliente_id);
                      if (client?.foto) {
                        return (
                          <img 
                            src={client.foto} 
                            alt={resumoAgendamento.cliente_nome} 
                            onClick={() => setPreviewPhoto(client.foto)}
                            className="w-20 h-20 rounded-full object-cover shrink-0 border border-zinc-200 dark:border-zinc-800 shadow-sm cursor-pointer hover:opacity-90 transition-opacity"
                            title="Clique para ampliar"
                          />
                        );
                      }
                      return (
                        <div className="w-20 h-20 rounded-full bg-[#EAF0EE] dark:bg-zinc-800 flex items-center justify-center text-[#3A4F4A] dark:text-[#EAF0EE] font-semibold text-3xl shrink-0 border border-zinc-100 dark:border-zinc-800">
                          {resumoAgendamento.cliente_nome?.charAt(0).toUpperCase()}
                        </div>
                      );
                    })()}
                    <div className="min-w-0">
                      <h3 className="font-display font-bold text-zinc-800 dark:text-zinc-100 text-lg sm:text-xl truncate leading-tight">{resumoAgendamento.cliente_nome}</h3>
                      <p className="text-xs text-zinc-400 dark:text-zinc-500 font-medium mt-0.5">Cliente cadastrado(a)</p>
                    </div>
                  </div>
                  <div className="shrink-0 self-start sm:self-center">
                    <StatusBadge status={resumoAgendamento.status} />
                  </div>
                </div>
 
                {/* Data e Hora */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="bg-zinc-50 dark:bg-zinc-950 p-4 sm:p-5 rounded-xl border border-zinc-150 dark:border-zinc-800/80 flex items-center gap-3.5 shadow-xs">
                    <div className="p-2.5 bg-[#EAF0EE] dark:bg-zinc-800 text-[#84A59D] rounded-xl shrink-0 flex items-center justify-center">
                      <CalIcon className="w-5.5 h-5.5" />
                    </div>
                    <div>
                      <p className="text-[10px] sm:text-xs uppercase tracking-wider text-zinc-400 dark:text-zinc-500 font-bold">Data</p>
                      <p className="text-sm sm:text-base font-bold text-zinc-700 dark:text-zinc-200 mt-0.5">
                        {new Date(resumoAgendamento.data_hora).toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" })}
                      </p>
                    </div>
                  </div>
                  <div className="bg-zinc-50 dark:bg-zinc-950 p-4 sm:p-5 rounded-xl border border-zinc-150 dark:border-zinc-800/80 flex items-center gap-3.5 shadow-xs">
                    <div className="p-2.5 bg-[#EAF0EE] dark:bg-zinc-800 text-[#84A59D] rounded-xl shrink-0 flex items-center justify-center">
                      <Clock className="w-5.5 h-5.5" />
                    </div>
                    <div>
                      <p className="text-[10px] sm:text-xs uppercase tracking-wider text-zinc-400 dark:text-zinc-500 font-bold">Horário</p>
                      <p className="text-sm sm:text-base font-bold text-zinc-700 dark:text-zinc-200 mt-0.5">
                        {fmtHour(resumoAgendamento.data_hora)}
                      </p>
                    </div>
                  </div>
                </div>
 
                {/* Agendado por — info discreta */}
                {(resumoAgendamento.criado_por_nome || resumoAgendamento.criado_em) && (
                  <div className="flex items-center gap-2 text-xs text-zinc-400 dark:text-zinc-500 italic select-none pt-1">
                    <User className="w-4 h-4 text-[#84A59D] shrink-0" />
                    <span className="leading-none">
                      Agendado
                      {resumoAgendamento.criado_por_nome && (
                        <> por <strong className="font-semibold not-italic text-zinc-650 dark:text-zinc-400">{resumoAgendamento.criado_por_nome}</strong></>
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
                    <Scissors className="w-4.5 h-4.5 text-[#84A59D]" /> 
                    Serviços Agendados
                    <span className="px-1.5 py-0.5 text-[10px] font-bold bg-[#EAF0EE] text-[#3A4F4A] dark:bg-zinc-800 dark:text-zinc-300 rounded-full select-none">
                      {resumoAgendamento.itens?.length || 0}
                    </span>
                  </h4>
                  <div className="space-y-4 max-h-[440px] overflow-y-auto pr-1">
                    {resumoAgendamento.itens?.map((item, idx) => {
                      const s = servicos.find(x => x.id === item.servico_id);
                      const mainColab = colaboradores.find(c => c.id === item.colaborador_id)?.nome;
                      const auxColab = colaboradores.find(c => c.id === item.auxiliar_id)?.nome;
                      return (
                        <div key={idx} className="bg-[#F8FBFB] dark:bg-[#1a2322] border border-[#E8EFEF] dark:border-[#2e3e3b] p-5 rounded-xl flex flex-col gap-3 shadow-xs">
                          <div className="flex items-start justify-between gap-3">
                            <span className="font-bold text-base sm:text-lg text-zinc-800 dark:text-zinc-150 leading-tight min-w-0 break-words">{item.nome || s?.nome || "Serviço"}</span>
                            <span className="text-base sm:text-lg font-extrabold text-[#3A4F4A] dark:text-[#EAF0EE] shrink-0">{fmtBRL(item.valor)}</span>
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
                                      <span className={isDesconto ? "text-rose-600 dark:text-rose-450 font-semibold" : "text-emerald-600 dark:text-emerald-455 font-semibold"}>
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
 
                          <div className="flex flex-wrap items-center gap-2 mt-1">
                            <span className="inline-flex items-center gap-1.5 bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-350 px-2.5 py-1 rounded-md text-xs font-semibold">
                              <Clock className="w-4 h-4 text-[#84A59D]" /> {s?.duracao_minutos} min
                            </span>
                            {mainColab && (
                              <span className="inline-flex items-center gap-1.5 bg-zinc-100 dark:bg-zinc-800 text-zinc-650 dark:text-zinc-350 px-2.5 py-1 rounded-md text-xs font-semibold">
                                <User className="w-4 h-4 text-[#84A59D]" /> Profissional: <strong className="font-bold text-zinc-800 dark:text-zinc-200">{mainColab}</strong>
                              </span>
                            )}
                            {auxColab && (
                              <span className="inline-flex items-center gap-1.5 bg-zinc-100 dark:bg-zinc-800 text-zinc-650 dark:text-zinc-350 px-2.5 py-1 rounded-md text-xs font-semibold">
                                <Users className="w-4 h-4 text-[#84A59D]" /> Auxiliar: <strong className="font-bold text-zinc-800 dark:text-zinc-200">{auxColab}</strong>
                              </span>
                            )}
                          </div>
 
                          {/* Utilized Products Section */}
                          <div className="mt-3 pt-3 border-t border-dashed border-[#E8EFEF] dark:border-[#2e3e3b]">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                              <span className="text-xs sm:text-sm font-semibold text-zinc-500 flex items-center gap-2">
                                <Package className="w-4.5 h-4.5 text-[#84A59D]" /> Consumo de Produtos
                              </span>
                              {canEdit && (
                                <Button 
                                  onClick={() => {
                                    openUtilizedProducts(resumoAgendamento, idx);
                                  }}
                                  variant="ghost" 
                                  className="h-8 px-3 text-xs text-[#3A4F4A] dark:text-zinc-300 hover:bg-[#EAF0EE] dark:hover:bg-zinc-850 flex items-center gap-1.5 border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 w-full sm:w-auto justify-center font-semibold"
                                >
                                  <PlusCircle className="w-4 h-4" /> Informar Consumo
                                </Button>
                              )}
                            </div>
                            {item.produtos_utilizados && item.produtos_utilizados.length > 0 ? (
                              <div className="mt-2.5 space-y-1.5">
                                {item.produtos_utilizados.map((pu, pidx) => {
                                  const prod = produtos.find(p => p.id === pu.produto_id);
                                  return (
                                    <div key={pidx} className="flex justify-between items-center text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-850 px-3 py-1.5 rounded-lg border border-zinc-150/40 dark:border-zinc-800/30">
                                      <span className="font-medium text-zinc-700 dark:text-zinc-300">{prod?.nome || "Carregando..."}</span>
                                      <span className="font-mono font-bold text-zinc-800 dark:text-zinc-200">{Number(pu.quantidade || 0).toFixed(3)} {pu.unidade_medida_insumo || "un"}</span>
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
                <div className="total-box mt-auto p-4 sm:p-5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="total-label flex items-center gap-2 text-zinc-600 dark:text-zinc-400 font-semibold text-xs sm:text-sm">
                    <Clock className="w-4.5 h-4.5 text-[#84A59D]" />
                    Duração Total: {resumoAgendamento.itens?.reduce((sum, item) => sum + (servicos.find(x => x.id === item.servico_id)?.duracao_minutos || 0), 0)} min
                  </div>
                  <div className="total-value text-xl sm:text-2xl font-extrabold text-[#3A4F4A] dark:text-[#EAF0EE]">{fmtBRL(resumoAgendamento.valor_total)}</div>
                </div>
              </div>
 
            </div>
          )}
          <DialogFooter className="flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-3 pt-4 border-t border-zinc-150 dark:border-zinc-800 w-full mt-5">
            <Button 
              variant="outline" 
              onClick={() => setOpenResumo(false)} 
              className="flex-1 sm:flex-initial h-11 px-6 text-sm font-medium border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300"
            >
              Fechar
            </Button>
            {canEdit && resumoAgendamento && resumoAgendamento.status !== "concluido" && (
              <Button 
                variant="outline" 
                onClick={() => { setOpenResumo(false); openEdit(resumoAgendamento); }} 
                className="flex-1 sm:flex-initial h-11 px-6 border-[#84A59D] text-[#3A4F4A] dark:text-[#EAF0EE] hover:bg-[#EAF0EE] dark:hover:bg-[#3A4F4A]/20 font-semibold text-sm flex items-center justify-center gap-2"
              >
                <Edit2 className="w-4 h-4" /> Editar Atendimento
              </Button>
            )}
            {canRegisterPayment && resumoAgendamento && resumoAgendamento.status !== "concluido" && (
              <Button 
                onClick={() => { setOpenResumo(false); nav(`/agendamentos/${resumoAgendamento.id}/pagamento`); }} 
                className="flex-1 sm:flex-initial h-11 px-6 bg-[#84A59D] hover:bg-[#6F9189] text-white font-bold text-sm flex items-center justify-center gap-2 shadow-sm"
              >
                <CreditCard className="w-4 h-4" /> Registrar Pagamento
              </Button>
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

      <Dialog open={conflictConfirmOpen} onOpenChange={setConflictConfirmOpen}>
        <DialogContent className="w-[95vw] max-w-[95vw] sm:max-w-md p-5 sm:p-6 rounded-2xl dark:bg-zinc-900 dark:border-zinc-800">
          <DialogHeader>
            <DialogTitle>
              {conflictMessage.includes("indisponibilidade") ? "Conflito de Indisponibilidade" : "Conflito de Horário"}
            </DialogTitle>
          </DialogHeader>
          <div className="py-4 text-sm text-zinc-600 dark:text-zinc-400">
            {renderConflictMessage(conflictMessage)}
            <br /><br />
            <b>
              {conflictMessage.includes("indisponibilidade") 
                ? "Deseja continuar com o agendamento mesmo assim?" 
                : "Deseja incluí-lo mesmo assim?"}
            </b>
          </div>
          <DialogFooter className="gap-2 flex flex-col sm:flex-row">
            <Button variant="outline" className="w-full sm:w-auto" onClick={() => setConflictConfirmOpen(false)}>Não</Button>
            <Button className="bg-[#84A59D] hover:bg-[#6F9189] w-full sm:w-auto" onClick={async () => { setConflictConfirmOpen(false); await doSave(true); }}>Sim</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog para Cadastrar/Editar Indisponibilidade */}
      <Dialog open={openIndisponibilidade} onOpenChange={setOpenIndisponibilidade}>
        <DialogContent className="w-[95vw] max-w-[95vw] sm:max-w-md p-5 sm:p-6 rounded-2xl dark:bg-zinc-900 dark:border-zinc-800">
          <DialogHeader>
            <DialogTitle className="font-display font-bold text-zinc-800 dark:text-zinc-150">
              {formIndisponibilidade.id ? "Editar Indisponibilidade" : "Registrar Indisponibilidade"}
            </DialogTitle>
            <DialogDescription className="text-xs text-zinc-500">
              Defina o período e o motivo da indisponibilidade do colaborador.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-1">
              <Label htmlFor="indisp-colab" className="text-zinc-650 dark:text-zinc-400 text-xs font-semibold">Colaborador</Label>
              <Select 
                value={formIndisponibilidade.colaborador_id} 
                onValueChange={(val) => setFormIndisponibilidade(prev => ({ ...prev, colaborador_id: val }))}
                disabled={(!isAdmin && !canManageIndisponibilidade) || !!formIndisponibilidade.id}
              >
                <SelectTrigger id="indisp-colab" className="w-full h-10 text-xs">
                  <SelectValue placeholder="Selecione um colaborador" />
                </SelectTrigger>
                <SelectContent>
                  {colaboradores.filter(c => c.ativo).map(c => (
                    <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label htmlFor="indisp-inicio" className="text-zinc-650 dark:text-zinc-400 text-xs font-semibold">Início</Label>
                <Input 
                  id="indisp-inicio"
                  type="datetime-local" 
                  value={formIndisponibilidade.data_hora_inicio} 
                  onChange={(e) => handleStartDateChange(e.target.value)}
                  className="w-full h-10 text-xs"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="indisp-fim" className="text-zinc-650 dark:text-zinc-400 text-xs font-semibold">Fim</Label>
                <Input 
                  id="indisp-fim"
                  type="datetime-local" 
                  value={formIndisponibilidade.data_hora_fim} 
                  onChange={(e) => setFormIndisponibilidade(prev => ({ ...prev, data_hora_fim: e.target.value }))}
                  className="w-full h-10 text-xs"
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label htmlFor="indisp-motivo" className="text-zinc-650 dark:text-zinc-400 text-xs font-semibold">Motivo (Opcional)</Label>
              <Textarea 
                id="indisp-motivo"
                placeholder="Ex: Consulta médica, treinamento..." 
                value={formIndisponibilidade.motivo} 
                onChange={(e) => setFormIndisponibilidade(prev => ({ ...prev, motivo: e.target.value }))}
                maxLength={200}
                className="w-full min-h-[80px] text-xs"
              />
              <span className="text-[10px] text-zinc-450 block text-right">
                {formIndisponibilidade.motivo?.length || 0}/200 caracteres
              </span>
            </div>
          </div>
          <DialogFooter className="gap-2 flex flex-col sm:flex-row">
            <Button 
              variant="outline" 
              className="w-full sm:w-auto" 
              onClick={() => setOpenIndisponibilidade(false)}
              disabled={loadingIndisponibilidade}
            >
              Cancelar
            </Button>
            <Button 
              className="bg-[#84A59D] hover:bg-[#6F9189] text-white w-full sm:w-auto" 
              onClick={handleSaveIndisponibilidade}
              disabled={loadingIndisponibilidade}
            >
              {loadingIndisponibilidade ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de Detalhes da Indisponibilidade */}
      <Dialog open={openIndispDetails} onOpenChange={setOpenIndispDetails}>
        <DialogContent className="w-[95vw] max-w-[95vw] sm:max-w-md p-5 sm:p-6 rounded-2xl dark:bg-zinc-900 dark:border-zinc-800">
          <DialogHeader>
            <DialogTitle className="font-display font-bold text-zinc-800 dark:text-zinc-150 flex items-center gap-2">
              <CalendarOff className="w-5 h-5 text-sky-600 dark:text-sky-400" />
              <span>Período de Indisponibilidade</span>
            </DialogTitle>
          </DialogHeader>
          {selectedIndisp && (
            <div className="space-y-4 py-4 text-sm text-zinc-650 dark:text-zinc-400">
              <div>
                <span className="font-bold block text-xs uppercase text-zinc-400">Colaborador</span>
                <span className="text-zinc-800 dark:text-zinc-200 font-semibold">
                  {colaboradores.find(c => c.id === selectedIndisp.colaborador_id)?.nome || "Colaborador"}
                </span>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="font-bold block text-xs uppercase text-zinc-400">Início</span>
                  <span className="text-zinc-850 dark:text-zinc-200">
                    {libFormatAgendaDateTime(selectedIndisp.data_hora_inicio)}
                  </span>
                </div>
                <div>
                  <span className="font-bold block text-xs uppercase text-zinc-400">Fim</span>
                  <span className="text-zinc-850 dark:text-zinc-200">
                    {libFormatAgendaDateTime(selectedIndisp.data_hora_fim)}
                  </span>
                </div>
              </div>

              <div>
                <span className="font-bold block text-xs uppercase text-zinc-400">Motivo</span>
                <span className="text-zinc-850 dark:text-zinc-200">
                  {selectedIndisp.motivo || <span className="italic text-zinc-400">Sem motivo específico</span>}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-3 border-t border-zinc-150 dark:border-zinc-800 text-[11px] text-zinc-500 dark:text-zinc-500">
                <div>
                  <span className="font-bold block text-[10px] uppercase text-zinc-400">Registrado por</span>
                  <span className="text-zinc-700 dark:text-zinc-300 font-semibold">
                    {selectedIndisp.criado_por_nome || "Não informado"}
                  </span>
                </div>
                <div>
                  <span className="font-bold block text-[10px] uppercase text-zinc-400">Data do Registro</span>
                  <span className="text-zinc-700 dark:text-zinc-300 font-semibold">
                    {selectedIndisp.criado_em ? libFormatAgendaDateTime(selectedIndisp.criado_em) : "Não informada"}
                  </span>
                </div>
              </div>
            </div>
          )}
          <DialogFooter className="gap-2 flex flex-col sm:flex-row">
            <Button 
              variant="outline" 
              className="w-full sm:w-auto" 
              onClick={() => setOpenIndispDetails(false)}
            >
              Fechar
            </Button>
            {selectedIndisp && me && (
              <Button 
                className="bg-zinc-100 hover:bg-zinc-200 text-zinc-800 dark:bg-zinc-800 dark:hover:bg-zinc-700 dark:text-zinc-200 w-full sm:w-auto flex items-center justify-center gap-1"
                onClick={() => handleOpenEditIndisponibilidade(selectedIndisp)}
              >
                <Edit2 className="w-3.5 h-3.5" /> Editar
              </Button>
            )}
            {selectedIndisp && me && (
              <Button 
                className="bg-rose-500 hover:bg-rose-600 text-white w-full sm:w-auto flex items-center justify-center gap-1"
                onClick={() => handleDeleteIndisponibilidade(selectedIndisp.id)}
              >
                <Trash2 className="w-3.5 h-3.5" /> Excluir
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de Confirmação para Excluir Indisponibilidade */}
      <Dialog open={deleteConfirmOpenIndisp} onOpenChange={setDeleteConfirmOpenIndisp}>
        <DialogContent className="w-[95vw] max-w-[95vw] sm:max-w-md p-5 sm:p-6 rounded-2xl dark:bg-zinc-900 dark:border-zinc-800">
          <DialogHeader>
            <DialogTitle>Confirmar Exclusão</DialogTitle>
            <DialogDescription className="text-xs text-zinc-500">
              Tem certeza que deseja excluir este período de indisponibilidade? O registro poderá ser restaurado através do botão "Excluídos".
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 flex flex-col sm:flex-row mt-4">
            <Button 
              variant="outline" 
              className="w-full sm:w-auto" 
              onClick={() => { setDeleteConfirmOpenIndisp(false); setPendingDeleteIndispId(null); }}
            >
              Cancelar
            </Button>
            <Button 
              className="bg-rose-500 hover:bg-rose-600 text-white w-full sm:w-auto" 
              onClick={confirmDeleteIndisponibilidade}
            >
              Confirmar Exclusão
            </Button>
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
                            // Use custo_proporcional (cost per unit of measure) for calculation
                            // Falls back to custo_unitario for legacy records without quantidade_por_unidade
                            const custoProp = Number(row.custo_proporcional || row.custo_unitario || 0);
                            const totalCost = Number(row.quantidade || 0) * custoProp;
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
                                  {Number(row.quantidade_por_unidade) > 0 ? (
                                    <span>
                                      {Number((Number(row.quantidade_estoque || 0) / Number(row.quantidade_por_unidade)).toFixed(2))} {row.unidade || 'un'} ({Number(row.quantidade_estoque || 0).toFixed(3)} {row.unidade_medida_insumo || 'un'})
                                    </span>
                                  ) : (
                                    <span>{Number(row.quantidade_estoque || 0).toFixed(3)} {row.unidade}</span>
                                  )}
                                </td>
                                <td className="px-5 py-4 text-right text-zinc-600 dark:text-zinc-400 font-mono text-xs">
                                  <div className="font-bold text-zinc-800 dark:text-zinc-200">
                                    {Number(row.quantidade_por_unidade) > 0 ? (
                                      <span>Embalagem: {fmtBRL(row.custo_unitario)}/{Number(row.quantidade_por_unidade).toFixed(3)}{row.unidade_medida_insumo || row.unidade}</span>
                                    ) : (
                                      <span>{fmtBRL(row.custo_unitario)}/{row.unidade}</span>
                                    )}
                                  </div>
                                </td>
                                <td className="px-5 py-4 text-center">
                                  <div className="flex items-center justify-center">
                                    <div className="relative flex items-center w-28">
                                      <Input 
                                        type="text" 
                                        inputMode="decimal"
                                        placeholder="0.000"
                                        value={row.quantidade} 
                                        onChange={(e) => {
                                          let val = e.target.value;
                                          // Permitir apenas dígitos e um separador decimal
                                          val = val.replace(/[^0-9.,]/g, "");
                                          const parts = val.split(/[.,]/);
                                          if (parts.length > 2) {
                                            val = parts[0] + "." + parts.slice(1).join("");
                                          } else if (val.includes(",")) {
                                            val = val.replace(",", ".");
                                          }
                                          handleUpdateTempProductQty(idx, val);
                                        }}
                                        onBlur={(e) => {
                                          const val = e.target.value;
                                          if (val !== "" && !isNaN(val)) {
                                            handleUpdateTempProductQty(idx, Number(val).toFixed(3));
                                          }
                                        }}
                                        className="w-full h-9 text-center bg-zinc-50 dark:bg-zinc-900 font-semibold border-zinc-200 dark:border-zinc-800 font-mono text-xs pr-10"
                                      />
                                      <span className="absolute right-3 text-[10px] font-bold text-zinc-400 dark:text-zinc-550 uppercase pointer-events-none select-none">{row.unidade_medida_insumo || row.unidade}</span>
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
                        .filter(p => !p.ocultar_insumos && !tempUtilizedProducts.some(row => row.produto_id === p.id))
                        .map(p => {
                          const qtyPerUnit = Number(p.quantidade_por_unidade || 0);
                          const qtyStr = qtyPerUnit > 0 
                            ? `${Number((p.quantidade_estoque / qtyPerUnit).toFixed(2))} ${p.unidade_medida || 'un'} (${Number(p.quantidade_estoque.toFixed(3))} ${p.unidade_medida_insumo || 'un'})`
                            : `${Number(p.quantidade_estoque.toFixed(3))} ${p.unidade_medida || 'un'}`;
                          return {
                            value: p.id,
                            label: `${p.nome} (${qtyStr})`
                          };
                        })
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
                          (sum, row) => sum + Number(row.quantidade || 0) * Number(row.custo_proporcional || row.custo_unitario || 0),
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
            await http.get(`/agendamentos/${agForUtilized.id}`, { headers: { 'x-auth-email': email, 'x-auth-password': password } });
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

      {/* Lightbox para visualização de foto ampliada */}
      <Dialog open={!!previewPhoto} onOpenChange={() => setPreviewPhoto(null)}>
        <DialogContent className="sm:max-w-md p-6 bg-zinc-900 dark:bg-zinc-950 border border-zinc-800 dark:border-zinc-900 shadow-2xl flex flex-col items-center justify-center rounded-2xl [&>button]:text-zinc-400 [&>button]:hover:text-zinc-150">
          {previewPhoto && (
            <img 
              src={previewPhoto} 
              alt="Foto de Perfil Ampliada" 
              className="max-w-full max-h-[75vh] rounded-xl object-contain shadow-md"
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Dialog: Relatório de Agendamentos */}
      <Dialog open={openRelatorioDialog} onOpenChange={setOpenRelatorioDialog}>
        <DialogContent className="w-full max-w-full sm:max-w-4xl h-full sm:h-auto max-h-screen sm:max-h-[90vh] p-4 sm:p-7 rounded-none sm:rounded-2xl dark:bg-zinc-900 dark:border-zinc-800 flex flex-col gap-4 overflow-y-auto [&>button]:text-zinc-400 [&>button]:hover:text-zinc-150">
          <DialogHeader className="pb-2 border-b border-zinc-100 dark:border-zinc-850">
            <DialogTitle className="font-display text-xl font-bold flex items-center gap-2 text-zinc-800 dark:text-zinc-150">
              <FileText className="w-6 h-6 text-[#84A59D]" />
              Relatório de Agendamentos
            </DialogTitle>
            <DialogDescription className="sr-only">
              Defina os filtros para gerar o relatório consolidado de atendimentos agendados.
            </DialogDescription>
          </DialogHeader>

          {/* Filtros */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 bg-zinc-50 dark:bg-zinc-950 p-4 rounded-xl border border-zinc-150 dark:border-zinc-850">
            <div className="flex flex-col gap-1">
              <Label className="text-[10px] font-bold text-zinc-400 dark:text-zinc-550 uppercase tracking-wider">Data Inicial</Label>
              <Input
                type="date"
                value={repDataInicio}
                onChange={(e) => setRepDataInicio(e.target.value)}
                className="h-9 text-xs bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800"
              />
            </div>
            <div className="flex flex-col gap-1">
              <Label className="text-[10px] font-bold text-zinc-400 dark:text-zinc-550 uppercase tracking-wider">Data Final</Label>
              <Input
                type="date"
                value={repDataFim}
                onChange={(e) => setRepDataFim(e.target.value)}
                className="h-9 text-xs bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800"
              />
            </div>
            <div className="flex flex-col gap-1">
              <Label className="text-[10px] font-bold text-zinc-400 dark:text-zinc-550 uppercase tracking-wider">Status do Serviço</Label>
              <Select value={repStatus} onValueChange={setRepStatus}>
                <SelectTrigger className="h-9 text-xs bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800">
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
            <div className="flex flex-col gap-1">
              <Label className="text-[10px] font-bold text-zinc-400 dark:text-zinc-550 uppercase tracking-wider">Colaborador</Label>
              <Select value={repColaborador} onValueChange={setRepColaborador}>
                <SelectTrigger className="h-9 text-xs bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800">
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

          <div className="flex flex-col sm:flex-row justify-end gap-2">
            <Button
              variant="outline"
              onClick={async () => {
                if (!repDataInicio || !repDataFim) {
                  toast.error("Informe a data inicial e final.");
                  return;
                }
                setRepLoading(true);
                try {
                  const res = await http.get("/agendamentos", {
                    params: {
                      data_inicio: repDataInicio,
                      data_fim: repDataFim
                    }
                  });
                  let filtered = res.data || [];
                  if (repStatus !== "all") {
                    filtered = filtered.filter(a => a.status === repStatus);
                  }
                  if (repColaborador !== "all") {
                    filtered = filtered.filter(a => {
                      const itens = a.itens || [];
                      if (repColaborador === "none") {
                        return !itens.some(i => i.colaborador_id && i.colaborador_id !== "none");
                      } else {
                        return itens.some(i => i.colaborador_id === repColaborador || i.auxiliar_id === repColaborador);
                      }
                    });
                  }
                  setRepResults(filtered);
                  setHasGeneratedReport(true);
                  if (filtered.length === 0) {
                    toast.info("Nenhum agendamento encontrado.");
                  }
                } catch (e) {
                  toast.error(e.response?.data?.detail || "Erro ao carregar dados");
                } finally {
                  setRepLoading(false);
                }
              }}
              disabled={repLoading}
              className="text-xs h-9 order-2 sm:order-1"
            >
              Visualizar em Tela
            </Button>
            <Button
              onClick={handleGerarRelatorio}
              disabled={repLoading}
              className="bg-[#84A59D] hover:bg-[#6F9189] text-white text-xs font-bold px-5 h-9 rounded-lg flex items-center justify-center gap-1.5 order-1 sm:order-2"
            >
              {repLoading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Carregando...
                </>
              ) : (
                <>
                  <Printer className="w-3.5 h-3.5" />
                  Gerar Relatório (PDF)
                </>
              )}
            </Button>
          </div>

          {/* Área de Resultados */}
          <div className="flex-1 min-h-[250px] flex flex-col overflow-hidden">
            {!hasGeneratedReport ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-8 border border-dashed border-zinc-200 dark:border-zinc-800 rounded-xl text-zinc-400 dark:text-zinc-550 select-none">
                <FileText className="w-12 h-12 text-[#84A59D]/40 mb-2" />
                <p className="text-sm font-semibold">Filtros definidos</p>
                <p className="text-xs">Defina o período e filtros acima e clique em "Visualizar" ou "Gerar Relatório (PDF)".</p>
              </div>
            ) : repResults.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-8 border border-dashed border-zinc-200 dark:border-zinc-800 rounded-xl text-zinc-400 dark:text-zinc-550 select-none">
                <CalendarDays className="w-12 h-12 text-[#84A59D]/40 mb-2" />
                <p className="text-sm font-semibold">Nenhum atendimento encontrado</p>
                <p className="text-xs">Nenhum agendamento corresponde aos filtros no período selecionado.</p>
              </div>
            ) : (
              <div className="space-y-4 flex flex-col flex-1 overflow-hidden">
                {/* Resumo Consolidado */}
                <div className={`grid ${isAdmin ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-1'} gap-3 bg-[#F8FBFB] dark:bg-[#1a2322] border border-[#E8EFEF] dark:border-[#2e3e3b] p-4 rounded-xl shadow-xs`}>
                  <div className="flex flex-col justify-center">
                    <span className="text-[10px] text-zinc-400 dark:text-zinc-550 font-bold uppercase tracking-wider block">Total de Atendimentos</span>
                    <span className="text-lg font-extrabold text-zinc-850 dark:text-zinc-100">{repResults.length}</span>
                  </div>
                  {isAdmin && (
                    <div className="flex flex-col justify-center sm:text-right">
                      <span className="text-[10px] text-zinc-400 dark:text-zinc-550 font-bold uppercase tracking-wider block">Faturamento Previsto</span>
                      <span className="text-lg font-mono font-extrabold text-[#3A4F4A] dark:text-[#84A59D]">
                        {fmtBRL(reportTotalRevenue)}
                      </span>
                    </div>
                  )}
                </div>

                {/* Lista agrupada com barra de rolagem */}
                <div className="space-y-6 flex-1 overflow-y-auto pr-1">
                  {groupedReportResults.map((group) => (
                    <div key={group.date} className="space-y-2.5">
                      {/* Cabeçalho da Data */}
                      <div className="bg-zinc-100 dark:bg-zinc-850 px-3 py-1.5 rounded-lg border border-zinc-200/50 dark:border-zinc-800/60 sticky top-0 z-10">
                        <span className="text-xs font-bold text-zinc-750 dark:text-zinc-300">
                          {formatSelectedDate(group.date)}
                        </span>
                      </div>

                      {/* Lista de Atendimentos */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {group.appointments.map((a) => (
                          <div key={a.id} className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-850 p-3.5 rounded-xl shadow-xs flex flex-col gap-2.5">
                            {/* Cliente, Horário e Status */}
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                              <div className="flex items-center gap-2 min-w-0 flex-wrap">
                                <span className="text-xs font-bold text-zinc-450 dark:text-zinc-550 font-mono bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 px-1.5 py-0.5 rounded shrink-0">
                                  {fmtHour(a.data_hora)}
                                </span>
                                <span className="text-sm font-bold text-zinc-800 dark:text-zinc-150 truncate">
                                  {a.cliente_nome}
                                </span>
                              </div>
                              <div className="self-start sm:self-auto">
                                <StatusBadge status={a.status} />
                              </div>
                            </div>

                            {/* Serviços Agendados */}
                            <div className="bg-zinc-50 dark:bg-zinc-900/60 p-2.5 rounded-lg border border-zinc-150/60 dark:border-zinc-850/50 space-y-1.5">
                              <span className="text-[10px] font-bold text-zinc-400 dark:text-zinc-550 uppercase tracking-wider block">Serviços</span>
                              {a.itens?.map((item, idx) => {
                                const serv = servicos.find(s => s.id === item.servico_id);
                                return (
                                  <div key={idx} className="flex justify-between items-start sm:items-center gap-2 text-xs text-zinc-650 dark:text-zinc-350">
                                    <span className="font-medium truncate">
                                      {item.nome || serv?.nome || "Serviço"}
                                      {(() => {
                                        const colab = colaboradores.find(c => c.id === item.colaborador_id);
                                        const aux = item.auxiliar_id ? colaboradores.find(c => c.id === item.auxiliar_id) : null;
                                        if (colab) {
                                          return (
                                            <span className="text-[10px] text-zinc-450 dark:text-zinc-500 ml-1.5 font-normal">
                                              ({colab.nome}{aux ? ` / Aux: ${aux.nome}` : ""})
                                            </span>
                                          );
                                        }
                                        return null;
                                      })()}
                                    </span>
                                    {isAdmin && (
                                      <span className="font-semibold font-mono text-zinc-550 dark:text-zinc-400 shrink-0">{fmtBRL(item.valor)}</span>
                                    )}
                                  </div>
                                );
                              })}
                            </div>

                            {/* Valor Total do Atendimento */}
                            {isAdmin && (
                              <div className="flex justify-between items-center border-t border-dashed border-zinc-150 dark:border-zinc-800 pt-2">
                                <span className="text-[10px] font-bold text-zinc-400 dark:text-zinc-550 uppercase tracking-wider">Valor Total</span>
                                <span className="text-sm font-bold font-mono text-zinc-800 dark:text-zinc-250">{fmtBRL(a.valor_total)}</span>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="pt-2 border-t border-zinc-100 dark:border-zinc-850 flex flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={() => setOpenRelatorioDialog(false)} className="w-full sm:w-auto text-xs h-9">
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
