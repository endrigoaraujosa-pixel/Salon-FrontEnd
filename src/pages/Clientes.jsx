import React, { useEffect, useState } from "react";
import http from "../api";
import { PageHeader, EmptyState } from "../components/Page";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Textarea } from "../components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "../components/ui/dialog";
import { Users, Plus, Edit2, Trash2, Search, History, Printer, TrendingUp, Calendar, List } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import AuditModal from "../components/AuditModal";

const blank = { nome: "", telefone: "", email: "", data_nascimento: "", endereco: "", observacoes: "" };

export default function Clientes() {
  const [list, setList] = useState([]);
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [form, setForm] = useState(blank);
  const [auditOpen, setAuditOpen] = useState(false);
  const nav = useNavigate();

  // Relatório de Clientes / Ranking
  const [reportOpen, setReportOpen] = useState(false);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [rankingType, setRankingType] = useState("consumo");
  const [empresa, setEmpresa] = useState(null);

  const load = () => {
    http.get("/clientes").then((r) => setList(r.data));
    http.get("/configuracoes/empresa").then((r) => setEmpresa(r.data)).catch(() => {});
  };
  useEffect(() => { load(); }, []);

  const save = async () => {
    try {
      if (form.id) await http.put(`/clientes/${form.id}`, form);
      else await http.post("/clientes", form);
      toast.success("Cliente salvo");
      setOpen(false); setForm(blank); load();
    } catch (e) { toast.error(e.response?.data?.detail || "Erro ao salvar"); }
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

  const edit = (c) => { setForm(c); setOpen(true); };

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
                <div class="subtitle">Sistema de Gestão</div>
                <div class="logo-section">${empresa?.nome_fantasia || "Salon Studio"}</div>
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

  const filtered = list.filter((c) => c.nome?.toLowerCase().includes(q.toLowerCase()) || c.telefone?.includes(q));

  return (
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

            <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setForm(blank); }}>
              <DialogTrigger asChild>
                <Button data-testid="add-cliente-btn" className="flex-1 sm:flex-initial bg-[#84A59D] hover:bg-[#6F9189] text-white font-bold h-10 flex items-center justify-center gap-1.5">
                  <Plus className="w-4 h-4" /> Novo cliente
                </Button>
              </DialogTrigger>
              <DialogContent className="w-[95vw] max-w-[95vw] sm:max-w-lg p-5 sm:p-6 rounded-2xl dark:bg-zinc-900 dark:border-zinc-800">
                <DialogHeader><DialogTitle className="text-zinc-900 dark:text-zinc-50">{form.id ? "Editar" : "Novo"} cliente</DialogTitle></DialogHeader>
                <div className="space-y-3">
                  <div>
                    <Label className="font-semibold text-zinc-700 dark:text-zinc-300">Nome *</Label>
                    <Input data-testid="cliente-nome" value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} className="h-10 mt-1 dark:bg-zinc-950" />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <Label className="font-semibold text-zinc-700 dark:text-zinc-300">Telefone</Label>
                      <Input data-testid="cliente-telefone" value={form.telefone} onChange={(e) => setForm({ ...form, telefone: e.target.value })} className="h-10 mt-1 dark:bg-zinc-950" />
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
          <div className="hidden sm:block bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden shadow-xs">
            <table className="w-full text-sm">
              <thead className="bg-zinc-50 dark:bg-zinc-900 text-xs uppercase tracking-wider text-zinc-500 dark:text-zinc-400 border-b border-zinc-200 dark:border-zinc-800">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold">Nome</th>
                  <th className="px-4 py-3 text-left font-semibold">Telefone</th>
                  <th className="px-4 py-3 text-left font-semibold">Email</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800 text-zinc-700 dark:text-zinc-300">
                {filtered.map((c) => (
                  <tr key={c.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-900/50 transition-colors" data-testid={`cliente-row-${c.id}`}>
                    <td className="px-4 py-3 font-semibold text-zinc-900 dark:text-zinc-100">{c.nome}</td>
                    <td className="px-4 py-3 font-mono">{c.telefone || "-"}</td>
                    <td className="px-4 py-3">{c.email || "-"}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button size="sm" variant="ghost" onClick={() => nav(`/clientes/${c.id}/historico`)} title="Histórico" className="text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"><History className="w-4 h-4" /></Button>
                        <Button size="sm" variant="ghost" onClick={() => edit(c)} data-testid={`edit-cliente-${c.id}`} title="Editar" className="text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"><Edit2 className="w-4 h-4" /></Button>
                        <Button size="sm" variant="ghost" onClick={() => del(c.id)} data-testid={`delete-cliente-${c.id}`} title="Excluir" className="text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30"><Trash2 className="w-4 h-4" /></Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Visualização em Lista de Cards para Mobile */}
          <div className="block sm:hidden space-y-4">
            {filtered.map((c) => (
              <div 
                key={c.id} 
                className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-4.5 rounded-xl shadow-xs flex flex-col gap-3"
                data-testid={`cliente-card-${c.id}`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-[#EAF0EE] dark:bg-zinc-850 text-[#3A4F4A] dark:text-[#EAF0EE] font-extrabold text-lg flex items-center justify-center shrink-0">
                    {c.nome?.charAt(0).toUpperCase()}
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
                </div>

                <div className="flex items-center gap-2 pt-2 border-t border-zinc-100 dark:border-zinc-800 mt-1">
                  <Button 
                    size="sm" 
                    variant="outline" 
                    onClick={() => nav(`/clientes/${c.id}/historico`)}
                    className="flex-1 h-9 text-xs font-semibold flex items-center justify-center gap-1.5 border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300"
                  >
                    <History className="w-3.5 h-3.5" /> Histórico
                  </Button>
                  <Button 
                    size="sm" 
                    variant="outline" 
                    onClick={() => edit(c)}
                    data-testid={`edit-cliente-card-${c.id}`}
                    className="flex-1 h-9 text-xs font-semibold flex items-center justify-center gap-1.5 border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300"
                  >
                    <Edit2 className="w-3.5 h-3.5" /> Editar
                  </Button>
                  <Button 
                    size="sm" 
                    variant="outline" 
                    onClick={() => del(c.id)}
                    data-testid={`delete-cliente-card-${c.id}`}
                    className="h-9 px-3 border-zinc-200 dark:border-zinc-700 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 flex items-center justify-center"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
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

      <AuditModal 
        isOpen={auditOpen} 
        onClose={() => setAuditOpen(false)} 
        modulo="cliente" 
        tituloModulo="Clientes"
        onRestoreSuccess={load}
      />

      {/* Modal de Emissão do Relatório / Ranking de Clientes */}
      <Dialog open={reportOpen} onOpenChange={setReportOpen}>
        <DialogContent className="w-[95vw] max-w-[95vw] sm:max-w-lg p-5 sm:p-6 bg-white dark:bg-zinc-950 rounded-2xl border border-zinc-150 dark:border-zinc-850 shadow-2xl">
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
                  className={`p-3.5 rounded-xl border-2 text-center cursor-pointer transition-all flex flex-col items-center justify-center min-h-[110px] ${
                    rankingType === "consumo" 
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
                  className={`p-3.5 rounded-xl border-2 text-center cursor-pointer transition-all flex flex-col items-center justify-center min-h-[110px] ${
                    rankingType === "visitas" 
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
                  className={`p-3.5 rounded-xl border-2 text-center cursor-pointer transition-all flex flex-col items-center justify-center min-h-[110px] ${
                    rankingType === "todos" 
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
    </div>
  );
}
