import React, { useEffect, useState, useRef } from "react";
import http from "../api";
import { PageHeader, EmptyState } from "../components/Page";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Textarea } from "../components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "../components/ui/dialog";
import { Users, Plus, Edit2, Trash2, Search, History, Printer, TrendingUp, Calendar, List, Loader2, AlertCircle, ChevronLeft, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth";
import AuditModal from "../components/AuditModal";
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from "../components/ui/tooltip";

const blank = { nome: "", telefone: "", email: "", data_nascimento: "", endereco: "", observacoes: "", foto: null };

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

export default function Clientes() {
  const [list, setList] = useState([]);
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [form, setForm] = useState(blank);
  const [auditOpen, setAuditOpen] = useState(false);
  const [permitirClienteDuplicado, setPermitirClienteDuplicado] = useState(false);
  const [nameError, setNameError] = useState(false);
  const [duplicateConfirm, setDuplicateConfirm] = useState({ open: false, message: "", resolve: null });
  const [whatsappStatus, setWhatsappStatus] = useState(null); // null, 'checking', 'exists', 'not_exists', 'error'
  const nomeInputRef = useRef(null);
  const nav = useNavigate();
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const canCreate = isAdmin || user?.perfil?.permissoes?.["clientes.criar"] === true;
  const canEdit = isAdmin || user?.perfil?.permissoes?.["clientes.editar"] === true;
  const canDelete = isAdmin || user?.perfil?.permissoes?.["clientes.excluir"] === true;

  // Controle de Paginação
  const [currentPage, setCurrentPage] = useState(1);

  // Crédito de Clientes States
  const [trabalharCredito, setTrabalharCredito] = useState(false);
  const [manualCreditOpen, setManualCreditOpen] = useState(false);
  const [selectedClienteForCredit, setSelectedClienteForCredit] = useState(null);
  const [creditOpType, setCreditOpType] = useState("adicionar"); // "adicionar" or "remover"
  const [creditValue, setCreditValue] = useState("");
  const [creditReason, setCreditReason] = useState("");
  const [creditSubmitting, setCreditSubmitting] = useState(false);

  const podeVisualizarExtrato = user?.role === "admin" || user?.perfil?.permissoes?.["clientes.credito.visualizar"] === true || !!user?.perfil?.permissoes?.acoes?.["credito.extrato"];
  const podeAdicionarCredito = user?.role === "admin" || user?.perfil?.permissoes?.["clientes.credito.gerenciar"] === true || !!user?.perfil?.permissoes?.acoes?.["credito.adicionar"];
  const podeRemoverCredito = user?.role === "admin" || user?.perfil?.permissoes?.["clientes.credito.gerenciar"] === true || !!user?.perfil?.permissoes?.acoes?.["credito.remover"];

  const handleCreditoManual = (cliente, op) => {
    setSelectedClienteForCredit(cliente);
    setCreditOpType(op);
    setCreditValue("");
    setCreditReason("");
    setManualCreditOpen(true);
  };

  const submitManualCredit = async () => {
    if (!creditValue || Number(creditValue) <= 0) {
      toast.error("Por favor, informe um valor maior que zero.");
      return;
    }
    setCreditSubmitting(true);
    try {
      const endpoint = `/clientes/${selectedClienteForCredit.id}/credito/${creditOpType}`;
      await http.post(endpoint, {
        valor: Number(creditValue),
        observacao: creditReason,
        motivo: creditReason
      });
      toast.success("Movimentação de crédito realizada com sucesso!");
      setManualCreditOpen(false);
      load();
    } catch (e) {
      toast.error(e.response?.data?.detail || "Erro ao realizar movimentação de crédito");
    } finally {
      setCreditSubmitting(false);
    }
  };

  const handlePhotoChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error("A imagem deve ter no máximo 5MB");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const MAX_WIDTH = 256;
        const MAX_HEIGHT = 256;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, width, height);

        const base64 = canvas.toDataURL("image/jpeg", 0.7);
        setForm(prev => ({ ...prev, foto: base64 }));
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
  };

  // Relatório de Clientes / Ranking
  const [reportOpen, setReportOpen] = useState(false);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [rankingType, setRankingType] = useState("consumo");
  const [empresa, setEmpresa] = useState(null);

  const load = () => {
    http.get("/clientes").then((r) => setList(r.data));
    http.get("/configuracoes/empresa").then((r) => setEmpresa(r.data)).catch(() => { });
    http.get("/configuracoes/sistema").then((r) => {
      if (r.data) {
        setPermitirClienteDuplicado(!!r.data.permitir_cliente_duplicado);
        setTrabalharCredito(!!r.data.trabalhar_credito_cliente);
      }
    }).catch(() => { });
  };
  useEffect(() => { load(); }, []);

  const save = async () => {
    if (!form.nome || !form.nome.trim()) {
      toast.error("O preenchimento do campo Nome é obrigatório para a conclusão do cadastro.");
      setNameError(true);
      nomeInputRef.current?.focus();
      return;
    }

    let cleanPhoneDigits = "";
    if (form.telefone) {
      cleanPhoneDigits = form.telefone.replace(/\D/g, "");
      if (cleanPhoneDigits.length > 0) {
        if (cleanPhoneDigits.length < 10) {
          toast.error("O número de telefone deve conter o DDD e pelo menos 8 ou 9 dígitos.");
          return;
        }
      }
    }

    const cleanNameInput = form.nome.trim().toLowerCase();
    const duplicateName = list.find(c =>
      c.id !== form.id &&
      (c.nome || "").trim().toLowerCase() === cleanNameInput
    );

    let duplicatePhone = null;
    if (cleanPhoneDigits) {
      duplicatePhone = list.find(c =>
        c.id !== form.id &&
        (c.telefone || "").replace(/\D/g, "") === cleanPhoneDigits
      );
    }

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

    try {
      if (form.id) await http.put(`/clientes/${form.id}`, form);
      else await http.post("/clientes", form);
      toast.success("Cliente salvo");
      setOpen(false); setForm(blank); load();
    } catch (e) { toast.error(e.response?.data?.detail || "Erro ao salvar"); }
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

  const del = (id) => {
    setDeletingId(id);
    setDeleteConfirmOpen(true);
  };

  const confirmDelete = async () => {
    if (!deletingId) return;
    try {
      await http.delete(`/clientes/${deletingId}`);
      toast.success("Cliente removido");
      setDeleteConfirmOpen(false);
      setDeletingId(null);
      load();
    } catch (e) {
      toast.error(e.response?.data?.detail || "Erro ao remover");
    }
  };

  const edit = async (c) => {
    setNameError(false);
    setWhatsappStatus(null);
    const phone = formatPhone(c.telefone || "")
    setForm({ ...c, telefone: phone });
    await checkWhatsapp(phone)
    setOpen(true);
  };

  const checkWhatsapp = async (value) => {
    if (!value || value.replace(/\D/g, "").length < 10) {
      setWhatsappStatus(null);
      return;
    }
    setWhatsappStatus("checking");
    try {
      const { data } = await http.post("/configuracoes/whatsapp/check-number", { phone: value });
      if (data.exists) {
        setWhatsappStatus("exists");
      } else {
        setWhatsappStatus("not_exists");
      }
    } catch (e) {
      console.error("Erro ao checar whatsapp:", e);
      setWhatsappStatus("error");
    }
  };

  const generatePDF = async () => {
    try {
      const params = new URLSearchParams();
      if (startDate) params.append("startDate", startDate);
      if (endDate) params.append("endDate", endDate);
      params.append("type", rankingType);
      if (rankingType !== "todos") {
        params.append("limit", "10");
      }

      const response = await http.get(`/clientes/ranking?${params.toString()}`);
      const data = response.data;

      const printWindow = window.open("", "_blank");
      if (!printWindow) {
        return toast.error("Por favor, permita popups para emitir o relatório.");
      }

      const isRanking = rankingType !== "todos";
      const rankingTitleText = rankingType === "consumo"
        ? "TOP 10 Clientes por Consumo Financeiro"
        : rankingType === "visitas"
          ? "TOP 10 Clientes por Frequência de Visitas"
          : "Relatório Geral - Clientes Cadastrados";

      const filterPeriodText = (startDate || endDate)
        ? `Período: ${startDate ? new Date(startDate + "T00:00:00").toLocaleDateString("pt-BR") : "Início"} até ${endDate ? new Date(endDate + "T00:00:00").toLocaleDateString("pt-BR") : "Fim"}`
        : "Período: Todo o histórico";

      const rowsHtml = data.map((item, idx) => {
        let medalHtml = `<span class="rank-badge">${idx + 1}</span>`;
        if (isRanking) {
          if (idx === 0) medalHtml = `<span class="rank-badge gold">1</span>`;
          else if (idx === 1) medalHtml = `<span class="rank-badge silver">2</span>`;
          else if (idx === 2) medalHtml = `<span class="rank-badge bronze">3</span>`;
        }

        return `
          <tr>
            <td style="text-align: center; width: 80px;">${medalHtml}</td>
            <td class="font-bold">${item.nome}</td>
            <td style="text-align: center;">${item.total_visitas} ${item.total_visitas === 1 ? 'visita' : 'visitas'}</td>
            <td style="text-align: right;" class="finance-col font-mono font-bold">R$ ${(item.total_gasto || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
          </tr>
        `;
      }).join("");

      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Relatório - ${rankingTitleText}</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;600;700;800&family=Manrope:wght@400;500;600;700&display=swap');
            
            @page {
              size: A4 portrait;
              margin: 15mm 15mm 20mm 15mm;
            }
            
            body {
              font-family: 'Manrope', sans-serif;
              color: #1e293b;
              margin: 0;
              padding: 0;
              font-size: 11pt;
              line-height: 1.5;
              background: #fff;
            }
            
            .header-table {
              width: 100%;
              border-collapse: collapse;
              margin-bottom: 25px;
            }
            
            .logo-section {
              font-family: 'Outfit', sans-serif;
              font-weight: 800;
              font-size: 24pt;
              color: #84A59D;
              letter-spacing: -0.5px;
            }
            
            .subtitle {
              font-size: 9pt;
              color: #64748b;
              text-transform: uppercase;
              letter-spacing: 1px;
              margin-bottom: 2px;
              font-weight: 600;
            }
            
            .report-title-section {
              text-align: right;
            }
            
            .report-title {
              font-family: 'Outfit', sans-serif;
              font-weight: 700;
              font-size: 16pt;
              color: #0f172a;
              margin: 0 0 5px 0;
            }
            
            .report-meta {
              font-size: 9pt;
              color: #64748b;
              font-weight: 500;
            }
            
            .divider {
              height: 2px;
              background: linear-gradient(90deg, #84A59D 0%, #f1f5f9 100%);
              margin-bottom: 20px;
            }
            
            .filter-badge {
              display: inline-block;
              background-color: #f1f5f9;
              border: 1px solid #e2e8f0;
              border-radius: 6px;
              padding: 6px 12px;
              font-size: 9.5pt;
              color: #475569;
              font-weight: 600;
              margin-bottom: 25px;
            }
            
            .ranking-table {
              width: 100%;
              border-collapse: collapse;
              margin-bottom: 30px;
            }
            
            .ranking-table th {
              background-color: #f8fafc;
              border-bottom: 2px solid #e2e8f0;
              color: #475569;
              font-weight: 700;
              font-size: 9.5pt;
              text-transform: uppercase;
              letter-spacing: 0.5px;
              padding: 12px 10px;
            }
            
            .ranking-table td {
              padding: 12px 10px;
              border-bottom: 1px solid #f1f5f9;
              font-size: 10.5pt;
              color: #334155;
            }
            
            .ranking-table tr:hover td {
              background-color: #f8fafc;
            }
            
            .font-bold {
              font-weight: 700;
              color: #0f172a;
            }
            
            .font-mono {
              font-family: monospace;
            }
            
            .rank-badge {
              display: inline-flex;
              align-items: center;
              justify-content: center;
              width: 26px;
              height: 26px;
              border-radius: 50%;
              background-color: #e2e8f0;
              color: #475569;
              font-weight: 800;
              font-size: 9pt;
            }
            
            .rank-badge.gold {
              background-color: #fef3c7;
              color: #d97706;
              border: 1px solid #fde68a;
            }
            
            .rank-badge.silver {
              background-color: #f1f5f9;
              color: #475569;
              border: 1px solid #cbd5e1;
            }
            
            .rank-badge.bronze {
              background-color: #ffedd5;
              color: #ea580c;
              border: 1px solid #fed7aa;
            }
            
            .footer {
              position: fixed;
              bottom: 0;
              left: 0;
              right: 0;
              text-align: center;
              font-size: 8pt;
              color: #94a3b8;
              border-top: 1px solid #e2e8f0;
              padding-top: 8px;
            }
          </style>
        </head>
        <body>
          <table class="header-table">
            <tr>
              <td>
                ${empresa?.logomarca 
                  ? `<img src="${empresa.logomarca}" style="max-height: 80px; max-width: 240px; object-fit: contain; margin-bottom: 5px;" />` 
                  : `
                    <div class="subtitle">Sistema de Gestão</div>
                    <div class="logo-section">${empresa?.nome_fantasia || "Salon Studio"}</div>
                  `
                }
              </td>
              <td class="report-title-section">
                <h1 class="report-title">${rankingTitleText}</h1>
                <div class="report-meta">Gerado em: ${new Date().toLocaleDateString("pt-BR")} às ${new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</div>
              </td>
            </tr>
          </table>
          
          <div class="divider"></div>
          
          <div class="filter-badge">
            <strong>Filtro aplicado:</strong> ${filterPeriodText}
          </div>
          
          <table class="ranking-table">
            <thead>
              <tr>
                <th style="text-align: center; width: 80px;">${isRanking ? 'Posição' : 'Item'}</th>
                <th style="text-align: left;">Nome do Cliente</th>
                <th style="text-align: center; width: 150px;">Frequência (Visitas)</th>
                <th style="text-align: right; width: 180px;">Consumo Total</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml || '<tr><td colspan="4" style="text-align: center; color: #94a3b8; padding: 30px;">Nenhum registro encontrado no período selecionado.</td></tr>'}
            </tbody>
          </table>
          
          <div class="footer">
            ${empresa?.nome_fantasia || "Salon Studio"} &copy; ${new Date().getFullYear()} &bull; Relatório Gerencial de Clientes &bull; Página 1 de 1
          </div>
          
          <script>
            window.onload = function() {
              window.print();
            };
          </script>
        </body>
        </html>
      `);
      printWindow.document.close();
      setReportOpen(false);
    } catch (e) {
      console.error(e);
      toast.error("Erro ao emitir relatório. Tente novamente.");
    }
  };

  const normalizeText = (str) => !str ? "" : str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  const filtered = list.filter((c) => normalizeText(c.nome).includes(normalizeText(q)) || c.telefone?.includes(q));

  // Resetar página atual quando a busca (q) mudar
  useEffect(() => {
    setCurrentPage(1);
  }, [q]);

  const itemsPerPage = 50;
  const totalPages = Math.ceil(filtered.length / itemsPerPage);
  const activePage = Math.min(Math.max(1, currentPage), Math.max(1, totalPages));
  const paginatedItems = filtered.slice((activePage - 1) * itemsPerPage, activePage * itemsPerPage);

  return (
    <TooltipProvider>
      <div className="p-6 lg:p-8 fade-in">
      <PageHeader
        overline="Cadastro"
        title={
          <span className="flex items-center gap-2">
            Clientes
            <span className="text-xs font-normal text-zinc-400 bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 px-2 py-0.5 rounded-full">
              {list.length} cadastrados
            </span>
          </span>
        }
        action={
          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            <Button
              onClick={() => {
                setStartDate("");
                setEndDate("");
                setRankingType("consumo");
                setReportOpen(true);
              }}
              variant="outline"
              className="flex-1 sm:flex-initial border-zinc-300 dark:border-zinc-800 font-semibold h-10 text-sm flex items-center justify-center gap-1.5"
            >
              <Printer className="w-4 h-4" /> Emitir PDF
            </Button>

            <Dialog open={open} onOpenChange={(v) => { setOpen(v); setNameError(false); setWhatsappStatus(null); if (!v) setForm(blank); }}>
              {canCreate && (
                <Button onClick={() => setOpen(true)} data-testid="add-cliente-btn" className="flex-1 sm:flex-initial bg-[#84A59D] hover:bg-[#6F9189] text-white font-bold h-10 flex items-center justify-center gap-1.5">
                  <Plus className="w-4 h-4" /> Novo cliente
                </Button>
              )}
              <DialogContent className="w-[95vw] max-w-[95vw] sm:max-w-lg max-h-[80vh] sm:max-h-[90vh] overflow-y-auto p-5 sm:p-6 rounded-2xl dark:bg-zinc-900 dark:border-zinc-800">
                <DialogHeader><DialogTitle className="text-zinc-900 dark:text-zinc-50">{form.id ? "Editar" : "Novo"} cliente</DialogTitle></DialogHeader>
                <div className="space-y-3">
                  <div className="flex flex-col items-center justify-center gap-2 pb-2">
                    <div className="relative group cursor-pointer" onClick={() => document.getElementById("client-avatar-upload").click()}>
                      <div className="w-24 h-24 rounded-full overflow-hidden border-2 border-zinc-200 dark:border-zinc-800 flex items-center justify-center bg-zinc-50 dark:bg-zinc-950">
                        {form.foto ? (
                          <img src={form.foto} alt="Preview" className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-zinc-400 dark:text-zinc-500 font-bold text-2xl">
                            {form.nome ? form.nome.charAt(0).toUpperCase() : <Users className="w-8 h-8" />}
                          </span>
                        )}
                      </div>
                      <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <span className="text-white text-xs font-semibold">Alterar</span>
                      </div>
                    </div>
                    <input
                      id="client-avatar-upload"
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handlePhotoChange}
                    />
                    {form.foto && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="text-rose-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/20 text-xs h-7 px-2"
                        onClick={() => setForm(prev => ({ ...prev, foto: null }))}
                      >
                        Remover foto
                      </Button>
                    )}
                  </div>
                  <div>
                    <Label className={`font-semibold ${nameError ? "text-rose-500" : "text-zinc-700 dark:text-zinc-300"}`}>Nome *</Label>
                    <Input
                      ref={nomeInputRef}
                      data-testid="cliente-nome"
                      value={form.nome}
                      onChange={(e) => {
                        setForm({ ...form, nome: e.target.value });
                        if (e.target.value.trim()) {
                          setNameError(false);
                        }
                      }}
                      className={`h-10 mt-1 dark:bg-zinc-950 ${nameError ? "border-rose-500 focus-visible:ring-rose-500 focus-visible:border-rose-500" : ""}`}
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <Label className="font-semibold text-zinc-700 dark:text-zinc-300">Telefone</Label>
                      <Input
                        data-testid="cliente-telefone"
                        value={form.telefone}
                        onChange={(e) => {
                          setForm({ ...form, telefone: formatPhone(e.target.value) });
                          if (whatsappStatus) setWhatsappStatus(null);
                        }}
                        onBlur={(e) => checkWhatsapp(e.target.value)}
                        placeholder="(XX) XXXXX-XXXX"
                        className="h-10 mt-1 dark:bg-zinc-950"
                      />
                      {whatsappStatus === "checking" && <span className="text-[11px] text-zinc-500 mt-1 flex items-center gap-1">Verificando WhatsApp... <Loader2 className="w-3 h-3 animate-spin" /></span>}
                      {whatsappStatus === "exists" && <span className="text-[11px] text-[#84A59D] font-medium mt-1 block">✓ Possui WhatsApp</span>}
                      {whatsappStatus === "not_exists" && <span className="text-[11px] text-amber-500 font-medium mt-1 block">⚠ Não possui WhatsApp</span>}
                      {whatsappStatus === "error" && <span className="text-[11px] text-rose-500 font-medium mt-1 block">Erro ao verificar WhatsApp</span>}
                    </div>
                    <div>
                      <Label className="font-semibold text-zinc-700 dark:text-zinc-300">Email</Label>
                      <Input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="h-10 mt-1 dark:bg-zinc-950" />
                    </div>
                  </div>
                  <div>
                    <Label className="font-semibold text-zinc-700 dark:text-zinc-300">Data nascimento</Label>
                    <Input type="date" value={form.data_nascimento || ""} onChange={(e) => setForm({ ...form, data_nascimento: e.target.value })} className="h-10 mt-1 dark:bg-zinc-950" />
                  </div>
                  <div>
                    <Label className="font-semibold text-zinc-700 dark:text-zinc-300">Endereço</Label>
                    <Input value={form.endereco} onChange={(e) => setForm({ ...form, endereco: e.target.value })} className="h-10 mt-1 dark:bg-zinc-950" />
                  </div>
                  <div>
                    <Label className="font-semibold text-zinc-700 dark:text-zinc-300">Observações</Label>
                    <Textarea rows={2} value={form.observacoes} onChange={(e) => setForm({ ...form, observacoes: e.target.value })} className="mt-1 dark:bg-zinc-950" />
                  </div>
                </div>
                <DialogFooter className="flex flex-col sm:flex-row gap-2.5 mt-4 pt-4 border-t border-zinc-150 dark:border-zinc-800">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setOpen(false)}
                    className="w-full sm:w-auto h-10 border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 font-semibold"
                  >
                    Cancelar
                  </Button>
                  <Button
                    data-testid="save-cliente-btn"
                    onClick={save}
                    className="w-full sm:w-auto bg-[#84A59D] hover:bg-[#6F9189] text-white font-bold h-10"
                  >
                    Salvar
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        }
      />

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div className="relative w-full sm:max-w-sm">
          <Search className="w-4.5 h-4.5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
          <Input data-testid="search-clientes" placeholder="Buscar por nome ou telefone..." value={q} onChange={(e) => setQ(e.target.value)} className="pl-9 w-full h-10" />
        </div>
        <Button
          variant="outline"
          onClick={() => setAuditOpen(true)}
          className="flex items-center justify-center gap-1.5 text-sm font-semibold text-zinc-500 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-800 w-full sm:w-auto h-10 shrink-0"
        >
          <History className="w-4 h-4" />
          <span>Excluídos</span>
        </Button>
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={Users} title="Nenhum cliente" hint="Cadastre seu primeiro cliente para começar." />
      ) : (
        <>
          {/* Visualização em Tabela para Desktop */}
          <div className="hidden sm:block bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-x-auto shadow-xs">
            <table className="w-full text-sm">
              <thead className="bg-zinc-50 dark:bg-zinc-900 text-xs uppercase tracking-wider text-zinc-500 dark:text-zinc-400 border-b border-zinc-200 dark:border-zinc-800">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold">Nome</th>
                  <th className="px-4 py-3 text-left font-semibold">Telefone</th>
                  <th className="px-4 py-3 text-left font-semibold">Email</th>
                  {trabalharCredito && <th className="px-4 py-3 text-left font-semibold">Saldo de Crédito</th>}
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800 text-zinc-700 dark:text-zinc-300">
                {paginatedItems.map((c) => (
                  <tr key={c.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-900/50 transition-colors" data-testid={`cliente-row-${c.id}`}>
                    <td className="px-4 py-3 font-semibold text-zinc-900 dark:text-zinc-100">
                      <div className="flex items-center gap-3">
                        <div className="w-16 h-16 rounded-full overflow-hidden bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-xl text-zinc-650 dark:text-zinc-300 font-bold shrink-0 border border-zinc-100 dark:border-zinc-800 shadow-sm">
                          {c.foto ? (
                            <img src={c.foto} alt={c.nome} className="w-full h-full object-cover" />
                          ) : (
                            c.nome?.charAt(0).toUpperCase()
                          )}
                        </div>
                        <span>{c.nome}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 font-mono">{c.telefone || "-"}</td>
                    <td className="px-4 py-3">{c.email || "-"}</td>
                    {trabalharCredito && (
                      <td className="px-4 py-3">
                        <div className="font-semibold text-emerald-600 dark:text-emerald-450">
                          R$ {Number(c.saldo_credito || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                        </div>
                        {c.data_ultima_movimentacao_credito && (
                          <div className="text-[10px] text-zinc-400 dark:text-zinc-500 font-normal mt-0.5">
                            Última mov.: {new Date(c.data_ultima_movimentacao_credito).toLocaleDateString("pt-BR")}
                          </div>
                        )}
                      </td>
                    )}
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-3.5">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => nav(`/clientes/${c.id}/historico`)}
                              className="text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 p-2 h-8 w-8"
                            >
                              <History className="w-4 h-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Histórico de Atendimentos</p>
                          </TooltipContent>
                        </Tooltip>
                        
                        {trabalharCredito && (
                          <>
                            {podeVisualizarExtrato && (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => nav(`/clientes/credito/extrato?clienteId=${c.id}`)}
                                    className="text-[#84A59D] hover:text-[#6F9189] dark:text-[#84A59D] p-2 h-8 w-8"
                                  >
                                    <TrendingUp className="w-4 h-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>Extrato de Crédito</p>
                                </TooltipContent>
                              </Tooltip>
                            )}
                            {podeAdicionarCredito && (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => handleCreditoManual(c, 'adicionar')}
                                    className="text-emerald-500 hover:text-emerald-600 p-2 h-8 w-8"
                                  >
                                    <Plus className="w-4 h-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>Adicionar Crédito</p>
                                </TooltipContent>
                              </Tooltip>
                            )}
                            {podeRemoverCredito && (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => handleCreditoManual(c, 'remover')}
                                    className="text-rose-500 hover:text-rose-600 p-2 h-8 w-8"
                                  >
                                    <Plus className="w-4 h-4 rotate-45" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>Remover/Débito de Crédito</p>
                                </TooltipContent>
                              </Tooltip>
                            )}
                          </>
                        )}
                        
                        {canEdit && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={async () => await edit(c)}
                                data-testid={`edit-cliente-${c.id}`}
                                className="text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 p-2 h-8 w-8"
                              >
                                <Edit2 className="w-4 h-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Editar Cliente</p>
                            </TooltipContent>
                          </Tooltip>
                        )}
                        
                        {canDelete && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => del(c.id)}
                                data-testid={`delete-cliente-${c.id}`}
                                className="text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 p-2 h-8 w-8"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Excluir Cliente</p>
                            </TooltipContent>
                          </Tooltip>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Visualização em Lista de Cards para Mobile */}
          <div className="block sm:hidden space-y-4">
            {paginatedItems.map((c) => (
              <div
                key={c.id}
                className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-4.5 rounded-xl shadow-xs flex flex-col gap-3"
                data-testid={`cliente-card-${c.id}`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-20 h-20 rounded-full overflow-hidden bg-[#EAF0EE] dark:bg-zinc-850 text-[#3A4F4A] dark:text-[#EAF0EE] font-extrabold text-2xl flex items-center justify-center shrink-0 border border-zinc-100 dark:border-zinc-800 shadow-sm">
                    {c.foto ? (
                      <img src={c.foto} alt={c.nome} className="w-full h-full object-cover" />
                    ) : (
                      c.nome?.charAt(0).toUpperCase()
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h4 className="font-extrabold text-zinc-900 dark:text-zinc-50 text-[18px] sm:text-xl truncate tracking-tight leading-snug">{c.nome}</h4>
                    <p className="text-xs text-zinc-400 dark:text-zinc-500 font-semibold mt-0.5">Cliente cadastrado(a)</p>
                  </div>
                </div>

                <div className="space-y-1.5 text-xs text-zinc-650 dark:text-zinc-400 pt-2 border-t border-zinc-100 dark:border-zinc-800">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-zinc-400 dark:text-zinc-500 w-16 uppercase tracking-wider text-[9px]">Telefone:</span>
                    <span className="font-mono text-zinc-800 dark:text-zinc-200">{c.telefone || "Não informado"}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-zinc-400 dark:text-zinc-500 w-16 uppercase tracking-wider text-[9px]">Email:</span>
                    <span className="truncate text-zinc-800 dark:text-zinc-200">{c.email || "Não informado"}</span>
                  </div>
                  {trabalharCredito && (
                    <div className="flex flex-col gap-0.5">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-zinc-400 dark:text-zinc-500 w-16 uppercase tracking-wider text-[9px]">Saldo:</span>
                        <span className="font-semibold text-emerald-600 dark:text-emerald-450">
                          R$ {Number(c.saldo_credito || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                      {c.data_ultima_movimentacao_credito && (
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-zinc-400 dark:text-zinc-500 w-16 uppercase tracking-wider text-[9px]">Últ. Mov.:</span>
                          <span className="text-zinc-700 dark:text-zinc-300 font-normal">
                            {new Date(c.data_ultima_movimentacao_credito).toLocaleDateString("pt-BR")}
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {trabalharCredito && (podeVisualizarExtrato || podeAdicionarCredito || podeRemoverCredito) && (
                  <div className="flex items-center gap-3 pt-2 border-t border-zinc-100 dark:border-zinc-800 mt-1">
                    {podeVisualizarExtrato && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => nav(`/clientes/credito/extrato?clienteId=${c.id}`)}
                        className="flex-1 h-9 text-xs font-semibold flex items-center justify-center gap-1.5 border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300"
                      >
                        <TrendingUp className="w-3.5 h-3.5" /> Extrato
                      </Button>
                    )}
                    {podeAdicionarCredito && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleCreditoManual(c, 'adicionar')}
                        className="flex-1 h-9 text-xs font-semibold flex items-center justify-center gap-1.5 border-zinc-200 dark:border-zinc-700 text-emerald-600 dark:text-emerald-450"
                      >
                        <Plus className="w-3.5 h-3.5" /> Crédito
                      </Button>
                    )}
                    {podeRemoverCredito && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleCreditoManual(c, 'remover')}
                        className="flex-1 h-9 text-xs font-semibold flex items-center justify-center gap-1.5 border-zinc-200 dark:border-zinc-700 text-rose-600 dark:text-rose-450"
                      >
                        <Plus className="w-3.5 h-3.5 rotate-45" /> Débito
                      </Button>
                    )}
                  </div>
                )}

                <div className="flex items-center gap-3 pt-2 border-t border-zinc-100 dark:border-zinc-800 mt-1">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => nav(`/clientes/${c.id}/historico`)}
                    className="flex-1 h-9 text-xs font-semibold flex items-center justify-center gap-1.5 border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300"
                  >
                    <History className="w-3.5 h-3.5" /> Histórico
                  </Button>
                  {canEdit && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={async () => await edit(c)}
                      data-testid={`edit-cliente-card-${c.id}`}
                      className="flex-1 h-9 text-xs font-semibold flex items-center justify-center gap-1.5 border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300"
                    >
                      <Edit2 className="w-3.5 h-3.5" /> Editar
                    </Button>
                  )}
                  {canDelete && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => del(c.id)}
                      data-testid={`delete-cliente-card-${c.id}`}
                      className="flex-1 h-9 text-xs font-semibold flex items-center justify-center gap-1.5 border-zinc-200 dark:border-zinc-700 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30"
                    >
                      <Trash2 className="w-3.5 h-3.5" /> Excluir
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Controles de Paginação */}
          {totalPages > 1 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-6 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 shadow-xs select-none">
              <span className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">
                Exibindo <span className="font-semibold text-zinc-800 dark:text-zinc-200">{Math.min(filtered.length, (activePage - 1) * itemsPerPage + 1)}</span> a{" "}
                <span className="font-semibold text-zinc-800 dark:text-zinc-200">{Math.min(filtered.length, activePage * itemsPerPage)}</span> de{" "}
                <span className="font-semibold text-zinc-800 dark:text-zinc-200">{filtered.length}</span> registros
              </span>
              <div className="flex items-center gap-1.5 flex-wrap">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={activePage === 1}
                  className="h-8 px-2.5 text-xs font-semibold gap-1 dark:border-zinc-800"
                >
                  <ChevronLeft className="w-4 h-4" /> Anterior
                </Button>
                
                {/* Botões das Páginas */}
                {(() => {
                  const pages = [];
                  const maxVisiblePages = 5;
                  let startPage = Math.max(1, activePage - Math.floor(maxVisiblePages / 2));
                  let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
                  
                  if (endPage - startPage + 1 < maxVisiblePages) {
                    startPage = Math.max(1, endPage - maxVisiblePages + 1);
                  }

                  if (startPage > 1) {
                    pages.push(
                      <Button
                        key={1}
                        variant={activePage === 1 ? "default" : "outline"}
                        size="sm"
                        onClick={() => setCurrentPage(1)}
                        className={`h-8 w-8 text-xs font-bold ${activePage === 1 ? "bg-[#84A59D] hover:bg-[#6F9189] text-white border-[#84A59D]" : "dark:border-zinc-800 text-zinc-650 dark:text-zinc-300"}`}
                      >
                        1
                      </Button>
                    );
                    if (startPage > 2) {
                      pages.push(<span key="dots-start" className="text-zinc-400 dark:text-zinc-600 px-1 text-xs">...</span>);
                    }
                  }

                  for (let p = startPage; p <= endPage; p++) {
                    pages.push(
                      <Button
                        key={p}
                        variant={activePage === p ? "default" : "outline"}
                        size="sm"
                        onClick={() => setCurrentPage(p)}
                        className={`h-8 w-8 text-xs font-bold ${activePage === p ? "bg-[#84A59D] hover:bg-[#6F9189] text-white border-[#84A59D]" : "dark:border-zinc-800 text-zinc-650 dark:text-zinc-300"}`}
                      >
                        {p}
                      </Button>
                    );
                  }

                  if (endPage < totalPages) {
                    if (endPage < totalPages - 1) {
                      pages.push(<span key="dots-end" className="text-zinc-400 dark:text-zinc-600 px-1 text-xs">...</span>);
                    }
                    pages.push(
                      <Button
                        key={totalPages}
                        variant={activePage === totalPages ? "default" : "outline"}
                        size="sm"
                        onClick={() => setCurrentPage(totalPages)}
                        className={`h-8 w-8 text-xs font-bold ${activePage === totalPages ? "bg-[#84A59D] hover:bg-[#6F9189] text-white border-[#84A59D]" : "dark:border-zinc-800 text-zinc-650 dark:text-zinc-300"}`}
                      >
                        {totalPages}
                      </Button>
                    );
                  }

                  return pages;
                })()}

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={activePage === totalPages}
                  className="h-8 px-2.5 text-xs font-semibold gap-1 dark:border-zinc-800"
                >
                  Próxima <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Dialog de confirmação de exclusão */}
      <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <DialogContent className="w-[95vw] max-w-[95vw] sm:max-w-md p-5 sm:p-6 rounded-2xl dark:bg-zinc-900 dark:border-zinc-800">
          <DialogHeader>
            <DialogTitle className="text-zinc-900 dark:text-zinc-50">Confirmar exclusão</DialogTitle>
          </DialogHeader>
          <div className="py-4 text-sm text-zinc-650 dark:text-zinc-400">
            Tem certeza que deseja excluir este cliente? Esta ação pode ser desfeita a qualquer momento a partir da tela de "Excluídos".
          </div>
          <DialogFooter className="flex flex-col sm:flex-row gap-2.5 mt-2 pt-2 border-t border-zinc-150 dark:border-zinc-850">
            <Button variant="outline" onClick={() => setDeleteConfirmOpen(false)} className="w-full sm:w-auto border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-350">Cancelar</Button>
            <Button onClick={confirmDelete} className="w-full sm:w-auto bg-rose-500 hover:bg-rose-600 text-white font-bold">Excluir</Button>
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
              variant="outline"
              onClick={() => handleDuplicateConfirmResponse(false)}
              className="w-full sm:w-auto border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-350 font-semibold"
            >
              Não
            </Button>
            <Button
              onClick={() => handleDuplicateConfirmResponse(true)}
              className="w-full sm:w-auto bg-[#84A59D] hover:bg-[#6F9189] text-white font-bold"
            >
              Sim
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AuditModal
        isOpen={auditOpen}
        onClose={() => setAuditOpen(false)}
        modulo="cliente"
        tituloModulo="Clientes"
        onRestoreSuccess={load}
      />

      {/* Modal de Emissão do Relatório / Ranking de Clientes */}
      <Dialog open={reportOpen} onOpenChange={setReportOpen}>
        <DialogContent className="w-[95vw] max-w-[95vw] sm:max-w-lg max-h-[80vh] sm:max-h-[90vh] overflow-y-auto p-5 sm:p-6 bg-white dark:bg-zinc-950 rounded-2xl border border-zinc-150 dark:border-zinc-850 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Printer className="w-5 h-5 text-[#84A59D]" />
              <span className="font-display font-bold text-zinc-900 dark:text-zinc-50">Relatório de Clientes</span>
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-5 py-3">
            {/* Tipo de Ranking */}
            <div>
              <Label className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 block mb-2.5">Tipo do Relatório</Label>
              <div className="grid grid-cols-3 gap-2.5">
                <div
                  onClick={() => setRankingType("consumo")}
                  className={`p-3.5 rounded-xl border-2 text-center cursor-pointer transition-all flex flex-col items-center justify-center min-h-[110px] ${rankingType === "consumo"
                    ? "border-[#84A59D] bg-[#84A59D]/5 text-zinc-900 dark:text-zinc-50"
                    : "border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-900 text-zinc-500"
                    }`}
                >
                  <TrendingUp className={`w-5 h-5 mb-1.5 ${rankingType === "consumo" ? "text-[#84A59D]" : "text-zinc-400"}`} />
                  <span className="text-xs font-bold block leading-tight">TOP 10 Consumo</span>
                  <span className="text-[9px] text-zinc-400 block mt-1 leading-normal">Por valor gasto</span>
                </div>

                <div
                  onClick={() => setRankingType("visitas")}
                  className={`p-3.5 rounded-xl border-2 text-center cursor-pointer transition-all flex flex-col items-center justify-center min-h-[110px] ${rankingType === "visitas"
                    ? "border-[#84A59D] bg-[#84A59D]/5 text-zinc-900 dark:text-zinc-50"
                    : "border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-900 text-zinc-500"
                    }`}
                >
                  <Users className={`w-5 h-5 mb-1.5 ${rankingType === "visitas" ? "text-[#84A59D]" : "text-zinc-400"}`} />
                  <span className="text-xs font-bold block leading-tight">TOP 10 Visitas</span>
                  <span className="text-[9px] text-zinc-400 block mt-1 leading-normal">Por atendimentos</span>
                </div>

                <div
                  onClick={() => setRankingType("todos")}
                  className={`p-3.5 rounded-xl border-2 text-center cursor-pointer transition-all flex flex-col items-center justify-center min-h-[110px] ${rankingType === "todos"
                    ? "border-[#84A59D] bg-[#84A59D]/5 text-zinc-900 dark:text-zinc-50"
                    : "border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-900 text-zinc-500"
                    }`}
                >
                  <List className={`w-5 h-5 mb-1.5 ${rankingType === "todos" ? "text-[#84A59D]" : "text-zinc-400"}`} />
                  <span className="text-xs font-bold block leading-tight">Lista Completa</span>
                  <span className="text-[9px] text-zinc-400 block mt-1 leading-normal">Ordem alfabética</span>
                </div>
              </div>
            </div>

            {/* Período de Filtro */}
            <div className="space-y-2">
              <Label className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 block">Filtrar por Período</Label>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <span className="text-[10px] uppercase font-bold tracking-wider text-zinc-400 block">De:</span>
                  <div className="relative">
                    <Calendar className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" />
                    <Input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="pl-9 h-10 text-xs bg-zinc-50 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800"
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] uppercase font-bold tracking-wider text-zinc-400 block">Até:</span>
                  <div className="relative">
                    <Calendar className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" />
                    <Input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="pl-9 h-10 text-xs bg-zinc-50 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800"
                    />
                  </div>
                </div>
              </div>
              <p className="text-[10px] text-zinc-400 mt-1">Deixe as datas em branco para incluir todo o histórico registrado.</p>
            </div>
          </div>

          <DialogFooter className="gap-2 pt-2 border-t border-zinc-100 dark:border-zinc-900">
            <Button variant="outline" onClick={() => setReportOpen(false)} className="w-full sm:w-auto h-10 font-semibold border-zinc-200 dark:border-zinc-800">
              Cancelar
            </Button>
            <Button
              onClick={generatePDF}
              className="bg-[#84A59D] hover:bg-[#6F9189] text-white w-full sm:w-auto h-10 font-bold"
            >
              <Printer className="w-4 h-4 mr-1.5" />
              Gerar PDF
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de Crédito Manual */}
      <Dialog open={manualCreditOpen} onOpenChange={setManualCreditOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>
              {creditOpType === "adicionar" ? "Adicionar Crédito Manual" : "Remover Crédito Manual"}
            </DialogTitle>
          </DialogHeader>
          {selectedClienteForCredit && (
            <div className="space-y-4 py-4">
              <div className="space-y-1">
                <span className="text-xs text-zinc-450 dark:text-zinc-500 font-bold block uppercase tracking-wide">Cliente</span>
                <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{selectedClienteForCredit.nome}</span>
              </div>
              
              <div className="bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200/50 dark:border-emerald-900/60 rounded-xl p-3.5 flex flex-col gap-1.5">
                <div className="flex items-start gap-2.5">
                  <AlertCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-450 shrink-0 mt-0.5" />
                  <div className="text-xs text-emerald-850 dark:text-emerald-350 leading-normal">
                    <strong>Saldo atual:</strong> R$ {Number(selectedClienteForCredit.saldo_credito || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                  </div>
                </div>
                {selectedClienteForCredit.data_ultima_movimentacao_credito && (
                  <div className="text-[11px] text-zinc-500 dark:text-zinc-400 pl-6.5">
                    <strong>Última movimentação:</strong> {new Date(selectedClienteForCredit.data_ultima_movimentacao_credito).toLocaleDateString("pt-BR")} às {new Date(selectedClienteForCredit.data_ultima_movimentacao_credito).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                  </div>
                )}
              </div>

              <div className="space-y-1">
                <Label htmlFor="credit-value" className="text-xs font-bold text-zinc-700 dark:text-zinc-300 uppercase tracking-wide">Valor (R$)</Label>
                <Input
                  id="credit-value"
                  type="number"
                  placeholder="0,00"
                  step="0.01"
                  min="0.01"
                  value={creditValue}
                  onChange={(e) => setCreditValue(e.target.value)}
                  className="h-11 font-bold text-[15px]"
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="credit-reason" className="text-xs font-bold text-zinc-700 dark:text-zinc-300 uppercase tracking-wide">Motivo / Observação</Label>
                <Textarea
                  id="credit-reason"
                  placeholder="Descreva o motivo desta movimentação..."
                  value={creditReason}
                  onChange={(e) => setCreditReason(e.target.value)}
                  rows={3}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setManualCreditOpen(false)}>Cancelar</Button>
            <Button 
              onClick={submitManualCredit} 
              disabled={creditSubmitting}
              className={`${creditOpType === "adicionar" ? "bg-emerald-600 hover:bg-emerald-700 text-white font-semibold" : "bg-rose-600 hover:bg-rose-700 text-white font-semibold"}`}
            >
              {creditSubmitting ? "Gravando..." : "Confirmar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      </div>
    </TooltipProvider>
  );
}
