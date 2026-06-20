import React, { useEffect, useState } from "react";
import http from "../api";
import { useAuth } from "../auth";
import { PageHeader } from "../components/Page";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "../components/ui/dialog";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "../components/ui/select";
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from "../components/ui/tooltip";
import { 
  Wallet, 
  CheckCircle2, 
  RotateCcw, 
  Eye, 
  Calendar, 
  User, 
  DollarSign, 
  TrendingUp, 
  Package, 
  Users, 
  Clock,
  Filter,
  AlertTriangle,
  Printer,
  HelpCircle
} from "lucide-react";
import { Checkbox } from "../components/ui/checkbox";
import { toast } from "sonner";

const fmtBRL = (n) => (n || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const fmtDate = (s) => s ? new Date(s).toLocaleDateString("pt-BR") : "—";
const fmtDateTime = (s) => s ? new Date(s).toLocaleString("pt-BR") : "—";

export default function Comissoes() {
  const { user } = useAuth();
  const isFunc = user?.role === "funcionario";
  const today = new Date();
  
  const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
  const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);
  
  const formatDateString = (d) => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const [dataInicio, setDataInicio] = useState(formatDateString(firstDay));
  const [dataFim, setDataFim] = useState(formatDateString(lastDay));
  const [statusFilter, setStatusFilter] = useState("pendente"); // 'pendente' | 'pago' | 'todos'
  const [colaboradorFilter, setColaboradorFilter] = useState("todos");
  const [data, setData] = useState(null);
  
  // Estado para visualização de detalhes do profissional
  const [selectedColab, setSelectedColab] = useState(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  
  // Estado para confirmação de insumos pendentes
  const [confirmInsumosOpen, setConfirmInsumosOpen] = useState(false);
  const [comissaoToPay, setComissaoToPay] = useState(null);

  // Relatório states
  const [colaboradores, setColaboradores] = useState([]);
  const [relatorioDialogOpen, setRelatorioDialogOpen] = useState(false);
  const [relatorioDataInicio, setRelatorioDataInicio] = useState(formatDateString(firstDay));
  const [relatorioDataFim, setRelatorioDataFim] = useState(formatDateString(lastDay));
  const [relatorioColabId, setRelatorioColabId] = useState("todos");
  const [relatorioStatus, setRelatorioStatus] = useState("todos");
  const [relatorioExibirDetalhamento, setRelatorioExibirDetalhamento] = useState(false);
  const [empresa, setEmpresa] = useState(null);

  const load = () => {
    http.get("/comissoes", { 
      params: { 
        data_inicio: dataInicio, 
        data_fim: dataFim,
        status: statusFilter,
        colaborador_id: colaboradorFilter
      } 
    })
    .then((r) => setData(r.data))
    .catch((err) => toast.error("Erro ao carregar comissões"));
  };

  useEffect(() => {
    if (dataInicio && dataFim) {
      load();
    }
  }, [dataInicio, dataFim, statusFilter, colaboradorFilter]);

  useEffect(() => {
    http.get("/colaboradores")
      .then((r) => {
        setColaboradores(r.data || []);
        if (isFunc) {
          const matched = user?.colaborador_id 
            ? r.data.find(c => String(c.id) === String(user.colaborador_id))
            : r.data.find(c => c.nome.toLowerCase() === user?.name?.toLowerCase());
          if (matched) {
            setRelatorioColabId(String(matched.id));
          }
        }
      })
      .catch(() => {});
    http.get("/configuracoes/empresa").then((r) => setEmpresa(r.data)).catch(() => {});
  }, [isFunc, user]);

  const generatePDF = async () => {
    try {
      const response = await http.get("/comissoes", { 
        params: { 
          data_inicio: relatorioDataInicio, 
          data_fim: relatorioDataFim,
          status: relatorioStatus === "cancelado" ? "pendente" : relatorioStatus
        } 
      });
      
      const fetchedData = response.data;
      let filteredComissoes = fetchedData.comissoes || [];
      if (relatorioColabId !== "todos") {
        filteredComissoes = filteredComissoes.filter(c => String(c.colaborador_id) === String(relatorioColabId));
      }
      
      if (relatorioStatus === "cancelado") {
        filteredComissoes = filteredComissoes.map(c => ({
          ...c,
          atendimentos: 0,
          total_principal: 0,
          total_auxiliar: 0,
          total_produtos: 0,
          valor_comissao: 0,
          detalhes: []
        }));
      }

      const printWindow = window.open("", "_blank");
      if (!printWindow) {
        toast.error("Por favor, permita pop-ups para gerar o relatório.");
        return;
      }

      const currentDate = new Date().toLocaleDateString("pt-BR");
      const currentTime = new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });

      const colabName = relatorioColabId === "todos" 
        ? "Todos os colaboradores" 
        : colaboradores.find(c => String(c.id) === String(relatorioColabId))?.nome || "Colaborador";

      const statusName = {
        todos: "Todos os status",
        pendente: "Não Pagas (Pendentes)",
        pago: "Pagas",
        cancelado: "Cancelado"
      }[relatorioStatus];

       const totalComissoes = filteredComissoes.reduce((sum, c) => sum + c.valor_comissao, 0);
      const totalAtendimentos = relatorioColabId === "todos" && !isFunc && fetchedData.atendimentos_total_count !== undefined
        ? fetchedData.atendimentos_total_count
        : filteredComissoes.reduce((sum, c) => sum + c.atendimentos, 0);
      const totalInsumos = relatorioColabId === "todos" && !isFunc && fetchedData.custo_insumos_total !== undefined
        ? fetchedData.custo_insumos_total
        : filteredComissoes.reduce((sum, c) => {
            const colabInsumos = c.detalhes?.reduce((s, d) => s + (d.custo_produtos || 0), 0) || 0;
            return sum + colabInsumos;
          }, 0);
      const totalFaturamento = relatorioColabId === "todos" && !isFunc
        ? (fetchedData.faturamento_bruto_total || 0)
        : filteredComissoes.reduce((sum, c) => sum + c.total_principal + c.total_auxiliar + (c.total_produtos || 0), 0);

      let htmlContent = `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>Relatório de Comissões de Funcionários</title>
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
      grid-template-columns: repeat(4, 1fr);
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

    .report-title-section {
      margin-bottom: 15px;
      font-size: 13px;
      font-weight: 700;
      color: #3a4f4a;
      border-bottom: 1px solid #e5e7eb;
      padding-bottom: 5px;
    }

    /* Summary Table */
    .summary-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 25px;
    }
    .summary-table th {
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
    .summary-table td {
      padding: 8px 12px;
      border-bottom: 1px solid #f3f4f6;
      font-size: 11px;
    }
    .summary-table tr.total-row td {
      font-weight: 700;
      border-top: 1.5px solid #e5e7eb;
      background-color: #fafdfd;
      color: #3a4f4a;
    }

    /* Collaborator detailed section */
    .colab-section {
      margin-bottom: 30px;
      page-break-inside: avoid;
    }
    .colab-header {
      background-color: #f4f7f6;
      border-left: 4px solid #84A59D;
      padding: 8px 12px;
      margin-bottom: 12px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-radius: 0 6px 6px 0;
    }
    .colab-name {
      font-family: 'Outfit', sans-serif;
      font-size: 14px;
      font-weight: 700;
      color: #3A4F4A;
    }
    .colab-rates {
      font-size: 9px;
      color: #6b7280;
      font-weight: 500;
    }
    
    .detail-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 10px;
    }
    .detail-table th {
      font-size: 8px;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: #6b7280;
      border-bottom: 1.2px solid #e5e7eb;
      padding: 6px 8px;
      font-weight: 700;
      text-align: left;
    }
    .detail-table td {
      padding: 6px 8px;
      border-bottom: 1px solid #f3f4f6;
      font-size: 10px;
    }
    .detail-table tr.colab-summary-row td {
      font-weight: 700;
      border-top: 1.2px solid #e5e7eb;
      background-color: #fafdfd;
      color: #3a4f4a;
      font-size: 10px;
      padding: 8px;
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
      padding: 1px 5px;
      border-radius: 10px;
      font-size: 8px;
      font-weight: 700;
      text-transform: uppercase;
    }
    .status-pago {
      background-color: #ecfdf5;
      color: #047857;
      border: 1px solid #d1fae5;
    }
    .status-pendente {
      background-color: #fffbeb;
      color: #b45309;
      border: 1px solid #fef3c7;
    }
    .text-danger {
      color: #ef4444;
    }

    @media print {
      body {
        padding: 0;
        font-size: 10px;
      }
      .kpi-card {
        box-shadow: none;
      }
      .colab-section {
        page-break-inside: avoid;
      }
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="header-left">
      <h1>Relatório de Comissões de Funcionários</h1>
      <p>Gerado a partir das movimentações de atendimentos e vendas.</p>
    </div>
    <div class="header-right">
      <div class="brand">${empresa?.nome_fantasia || "Salon Studio"}</div>
      <div>Gerado em ${currentDate} às ${currentTime}</div>
    </div>
  </div>

  <div class="filters-summary">
    <div class="filter-item">
      <span class="filter-label">Período</span>
      <span class="filter-value">${new Date(relatorioDataInicio + 'T12:00:00').toLocaleDateString('pt-BR')} a ${new Date(relatorioDataFim + 'T12:00:00').toLocaleDateString('pt-BR')}</span>
    </div>
    <div class="filter-item">
      <span class="filter-label">Colaborador</span>
      <span class="filter-value">${colabName}</span>
    </div>
    <div class="filter-item">
      <span class="filter-label">Status Comissões</span>
      <span class="filter-value">${statusName}</span>
    </div>
    <div class="filter-item">
      <span class="filter-label">Detalhamento</span>
      <span class="filter-value">${relatorioExibirDetalhamento ? "Exibido" : "Não exibido"}</span>
    </div>
  </div>

  <div class="kpi-container">
    <div class="kpi-card">
      <div class="kpi-title">Faturamento Executado</div>
      <div class="kpi-value">${fmtBRL(totalFaturamento)}</div>
      <div class="kpi-subtitle">Total bruto em serviços e vendas</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-title">Dedução de Insumos</div>
      <div class="kpi-value text-danger">-${fmtBRL(totalInsumos)}</div>
      <div class="kpi-subtitle">Custo de produtos nos serviços</div>
    </div>
    <div class="kpi-card highlight">
      <div class="kpi-title">Comissão Líquida</div>
      <div class="kpi-value">${fmtBRL(totalComissoes)}</div>
      <div class="kpi-subtitle">${statusName}</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-title">Total Atendimentos</div>
      <div class="kpi-value">${totalAtendimentos}</div>
      <div class="kpi-subtitle">Serviços executados</div>
    </div>
  </div>
  `;

      if (filteredComissoes.length === 0) {
        htmlContent += `
        <div style="text-align: center; padding: 50px; color: #6b7280; border: 1px dashed #d1d5db; border-radius: 8px;">
          <h3 style="margin: 0; font-size: 14px;">Nenhuma comissão encontrada para os filtros selecionados</h3>
          <p style="margin: 5px 0 0 0; font-size: 11px;">Verifique os períodos e os status desejados.</p>
        </div>
        `;
      } else {
        if (!relatorioExibirDetalhamento) {
          htmlContent += `
          <div class="report-title-section">Resumo Consolidado de Comissões</div>
          <table class="summary-table">
            <thead>
              <tr>
                <th>Profissional</th>
                <th class="center" style="width: 100px;">Atendimentos</th>
                <th class="numeric" style="width: 130px;">Serviços Executados</th>
                <th class="numeric" style="width: 120px;">Dedução Insumos</th>
                <th class="numeric" style="width: 120px;">Vendas de Produtos</th>
                <th class="numeric" style="width: 130px;">Comissão Líquida</th>
                <th class="center" style="width: 110px;">Situação</th>
              </tr>
            </thead>
            <tbody>
          `;

          filteredComissoes.forEach(c => {
            const colabCustoInsumos = c.detalhes?.reduce((sum, d) => sum + (d.custo_produtos || 0), 0) || 0;
            const statusLabel = c.pago 
              ? `<span class="status-badge status-pago">Pago</span>` 
              : `<span class="status-badge status-pendente">Pendente</span>`;

            htmlContent += `
              <tr>
                <td style="font-weight: 600;">${c.colaborador_nome}</td>
                <td class="center font-mono font-semibold">${c.atendimentos}</td>
                <td class="numeric font-mono">${fmtBRL(c.total_principal + c.total_auxiliar)}</td>
                <td class="numeric font-mono text-danger">-${fmtBRL(colabCustoInsumos)}</td>
                <td class="numeric font-mono">${fmtBRL(c.total_produtos || 0)}</td>
                <td class="numeric font-mono font-bold" style="color: #3A4F4A;">${fmtBRL(c.valor_comissao)}</td>
                <td class="center">${statusLabel}</td>
              </tr>
            `;
          });

          const totalServicos = filteredComissoes.reduce((acc, c) => acc + c.total_principal + c.total_auxiliar, 0);
          const totalVendas = filteredComissoes.reduce((acc, c) => acc + (c.total_produtos || 0), 0);

          htmlContent += `
              <tr class="total-row">
                <td>TOTAL GERAL</td>
                <td class="center font-mono">${totalAtendimentos}</td>
                <td class="numeric font-mono">${fmtBRL(totalFaturamento)}</td>
                <td class="numeric font-mono text-danger">-${fmtBRL(totalInsumos)}</td>
                <td class="numeric font-mono">${fmtBRL(totalVendas)}</td>
                <td class="numeric font-mono font-bold">${fmtBRL(totalComissoes)}</td>
                <td class="center">—</td>
              </tr>
            </tbody>
          </table>
          `;
        } else {
          htmlContent += `
          <div class="report-title-section">Detalhamento Individual de Comissões</div>
          `;

          filteredComissoes.forEach(c => {
            const colabCustoInsumos = c.detalhes?.reduce((sum, d) => sum + (d.custo_produtos || 0), 0) || 0;
            const soloRate = c.comissao_sozinho != null ? c.comissao_sozinho : c.comissao_principal;
            
            htmlContent += `
            <div class="colab-section">
              <div class="colab-header">
                <span class="colab-name">${c.colaborador_nome}</span>
                <span class="colab-rates">
                  Políticas: Sozinho: <strong>${soloRate != null ? soloRate : 0}%</strong> · 
                  Com ajuda: <strong>${c.comissao_ajuda || 30}%</strong> · 
                  Auxiliar: <strong>${c.comissao_auxiliar || 0}%</strong>
                </span>
              </div>
              
              <table class="detail-table">
                <thead>
                  <tr>
                    <th style="width: 110px;">Data / Hora</th>
                    <th style="width: 70px;">Documento</th>
                    <th style="width: 60px;">Tipo</th>
                    <th style="width: 80px;">Papel</th>
                    <th>Descrição Serviço / Produto</th>
                    <th class="numeric" style="width: 80px;">Valor Item</th>
                    <th class="numeric" style="width: 80px;">Insumo</th>
                    <th class="numeric" style="width: 80px;">Base Comis.</th>
                    <th class="numeric" style="width: 50px;">%</th>
                    <th class="numeric" style="width: 80px;">Comissão</th>
                    <th class="center" style="width: 70px;">Status</th>
                  </tr>
                </thead>
                <tbody>
            `;

            const detalhes = c.detalhes || [];
            if (detalhes.length === 0) {
              htmlContent += `
                <tr>
                  <td colspan="11" style="text-align: center; color: #9ca3af; padding: 15px; font-style: italic;">
                    Nenhuma movimentação individual registrada no período.
                  </td>
                </tr>
              `;
            } else {
              detalhes.forEach(item => {
                const docNum = item.numero != null 
                  ? `${String(item.numero).padStart(6, "0")} | ${item.tipo === 'servico' ? 'S' : 'V'}`
                  : "—";
                const clientName = item.numero != null ? (item.cliente_nome || "Consumidor") : "";

                const typeLabel = item.tipo === 'servico' ? 'Serviço' : 'Produto';
                const statusBadge = item.pago 
                  ? `<span class="status-badge status-pago">Pago</span>` 
                  : `<span class="status-badge status-pendente">Pendente</span>`;

                const baseCom = item.tipo === 'servico' 
                  ? (item.base_comissao != null ? item.base_comissao : item.valor_movimentacao) 
                  : item.valor_movimentacao;

                htmlContent += `
                  <tr>
                    <td class="font-mono" style="font-size: 9px; white-space: nowrap;">${new Date(item.data).toLocaleString("pt-BR")}</td>
                    <td class="font-mono" style="font-size: 9px;">
                      <div style="font-weight: 600;">${docNum}</div>
                      ${clientName ? `<div style="font-size: 8px; color: #6b7280; font-weight: 500; margin-top: 1px;">${clientName}</div>` : ""}
                    </td>
                    <td style="font-weight: 500;">${typeLabel}</td>
                    <td style="color: #4b5563;">${item.papel}</td>
                    <td style="font-weight: 600; max-width: 180px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                      ${item.descricao}
                      ${item.insumos_pendentes ? `<span style="color: #ef4444; font-size: 7px; font-weight: 700; margin-left: 3px;">⚠️ INSUMOS PENDENTES</span>` : ''}
                    </td>
                    <td class="numeric font-mono">${fmtBRL(item.valor_movimentacao)}</td>
                    <td class="numeric font-mono text-danger">${item.tipo === 'servico' ? `-${fmtBRL(item.custo_produtos || 0)}` : '—'}</td>
                    <td class="numeric font-mono">${fmtBRL(baseCom)}</td>
                    <td class="numeric font-mono font-semibold">${item.percentual_aplicado}%</td>
                    <td class="numeric font-mono font-bold" style="color: #047857;">${fmtBRL(item.valor_comissao)}</td>
                    <td class="center">${statusBadge}</td>
                  </tr>
                `;
              });
            }

            htmlContent += `
                  <tr class="colab-summary-row">
                    <td colspan="5">RESUMO: ${c.colaborador_nome}</td>
                    <td class="numeric font-mono">${fmtBRL(c.total_principal + c.total_auxiliar)}</td>
                    <td class="numeric font-mono text-danger">-${fmtBRL(colabCustoInsumos)}</td>
                    <td class="numeric font-mono">${fmtBRL((c.total_principal + c.total_auxiliar) - colabCustoInsumos)}</td>
                    <td class="numeric font-mono">—</td>
                    <td class="numeric font-mono font-bold" style="color: #3a4f4a;">${fmtBRL(c.valor_comissao)}</td>
                    <td class="center font-semibold">${c.pago ? 'PAGO' : 'PENDENTE'}</td>
                  </tr>
                </tbody>
              </table>
            </div>
            `;
          });
        }
      }

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
      
      setRelatorioDialogOpen(false);
    } catch (error) {
      console.error(error);
      toast.error("Erro ao gerar o relatório em PDF.");
    }
  };

  const executePago = async (c) => {
    try {
      if (c.pago) {
        await http.delete(`/comissoes/pagar`, { params: { colaborador_id: c.colaborador_id, periodo: data.periodo } });
        toast.success("Pagamento desfeito com sucesso");
      } else {
        await http.post("/comissoes/pagar", { colaborador_id: c.colaborador_id, periodo: data.periodo, valor: c.valor_comissao });
        toast.success("Comissão marcada como paga com sucesso");
      }
      load();
    } catch { 
      toast.error("Erro ao alterar status de pagamento"); 
    }
  };

  const togglePago = async (c) => {
    if (!c.pago) {
      // Verifica se há alguma movimentação (detalhe) com insumos pendentes
      const hasPending = (c.detalhes || []).some(d => d.insumos_pendentes);
      if (hasPending) {
        setComissaoToPay(c);
        setConfirmInsumosOpen(true);
        return;
      }
    }
    executePago(c);
  };

  const setPeriodoHoje = () => {
    const todayStr = formatDateString(new Date());
    setDataInicio(todayStr);
    setDataFim(todayStr);
  };

  const setPeriodoEstaSemana = () => {
    const current = new Date();
    const first = current.getDate() - current.getDay(); 
    const last = first + 6; 
    
    setDataInicio(formatDateString(new Date(current.setDate(first))));
    setDataFim(formatDateString(new Date(current.setDate(last))));
  };

  const setPeriodoEsteMes = () => {
    setDataInicio(formatDateString(firstDay));
    setDataFim(formatDateString(lastDay));
  };

  const handleOpenDetails = (colab) => {
    setSelectedColab(colab);
    setDetailsOpen(true);
  };

  // Helper de avatar HSL dinâmico
  const getInitials = (nome) => {
    if (!nome || typeof nome !== "string") return "P";
    const parts = nome.trim().split(" ").filter(p => p.length > 0);
    if (parts.length === 0) return "P";
    if (parts.length > 1) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return parts[0][0].toUpperCase();
  };
  
  const getAvatarColor = (nome) => {
    const safeNome = nome || "Profissional";
    let hash = 0;
    for (let i = 0; i < safeNome.length; i++) {
      hash = safeNome.charCodeAt(i) + ((hash << 5) - hash);
    }
    const h = Math.abs(hash % 360);
    return {
      bg: `hsl(${h}, 45%, 93%)`,
      text: `hsl(${h}, 60%, 25%)`
    };
  };

  // Cálculos consolidados dos KPI Cards
  const totalComissoesGeral = data?.comissoes?.reduce((sum, c) => sum + c.valor_comissao, 0) || 0;
  const totalAtendimentosGeral = data?.atendimentos_total_count !== undefined 
    ? data.atendimentos_total_count 
    : (data?.comissoes?.reduce((sum, c) => sum + c.atendimentos, 0) || 0);
  const totalInsumosGeral = (isFunc || colaboradorFilter !== "todos")
    ? (data?.comissoes?.reduce((sum, c) => {
        const colabInsumos = c.detalhes?.reduce((s, d) => s + (d.custo_produtos || 0), 0) || 0;
        return sum + colabInsumos;
      }, 0) || 0)
    : (data?.custo_insumos_total !== undefined ? data.custo_insumos_total : (data?.comissoes?.reduce((sum, c) => {
        const colabInsumos = c.detalhes?.reduce((s, d) => s + (d.custo_produtos || 0), 0) || 0;
        return sum + colabInsumos;
      }, 0) || 0));
  // Faturamento Bruto: usa o valor calculado pelo backend (evita dupla-contagem de atendimentos
  // onde o mesmo colaborador é principal E auxiliar). Para filtro por colaborador específico,
  // soma os valores dos itens do colaborador diretamente.
  const totalFaturamentoServicos = (isFunc || colaboradorFilter !== "todos")
    ? (data?.comissoes?.reduce((sum, c) => sum + c.total_principal + c.total_auxiliar + (c.total_produtos || 0), 0) || 0)
    : (data?.faturamento_bruto_total || 0);
  const totalComissoesProdutos = data?.comissoes?.reduce((sum, c) => sum + (c.comissao_produtos || 0), 0) || 0;

  return (
    <div className="p-6 lg:p-8 space-y-8 max-w-7xl mx-auto">
      {/* Cabeçalho */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-100 dark:border-zinc-800 pb-5">
        <div>
          <span className="text-[10px] uppercase font-bold tracking-wider text-zinc-400">Financeiro de Profissionais</span>
          <h1 className="font-display text-3xl font-extrabold text-[#3A4F4A] dark:text-zinc-100 tracking-tight">Comissões de Funcionários</h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button 
            onClick={() => setRelatorioDialogOpen(true)}
            variant="outline" 
            size="sm"
            className="text-zinc-655 border-zinc-200 flex items-center gap-1.5 h-9 px-3 text-xs font-semibold rounded-lg dark:border-zinc-850 dark:text-zinc-200"
          >
            <Printer className="w-4 h-4 text-zinc-400" /> Relatório de Comissões
          </Button>
          <Button variant="outline" size="sm" onClick={setPeriodoHoje} className="hover:bg-zinc-50 border-zinc-200 dark:border-zinc-800 dark:hover:bg-zinc-800 dark:text-zinc-200">Hoje</Button>
          <Button variant="outline" size="sm" onClick={setPeriodoEstaSemana} className="hover:bg-zinc-50 border-zinc-200 dark:border-zinc-800 dark:hover:bg-zinc-800 dark:text-zinc-200">Esta Semana</Button>
          <Button variant="outline" size="sm" onClick={setPeriodoEsteMes} className="hover:bg-zinc-50 border-zinc-200 dark:border-zinc-800 dark:hover:bg-zinc-800 dark:text-zinc-200">Este Mês</Button>
        </div>
      </div>

      {/* Control Bar / Painel de Filtros */}
      <div className="bg-white/90 backdrop-blur-md border border-zinc-200/80 dark:bg-zinc-900/90 dark:border-zinc-800 rounded-2xl p-5 shadow-sm flex flex-wrap items-end gap-5">
        <div className="space-y-1.5 flex-1 min-w-[200px]">
          <Label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Data de Início</Label>
          <div className="relative">
            <Calendar className="absolute left-3 top-2.5 h-4 w-4 text-zinc-400" />
            <Input 
              type="date" 
              value={dataInicio} 
              onChange={(e) => setDataInicio(e.target.value)} 
              className="pl-9 bg-zinc-50 border-zinc-200 focus:bg-white dark:bg-zinc-800 dark:border-zinc-700 dark:focus:bg-zinc-950 dark:text-zinc-100 transition-colors"
            />
          </div>
        </div>
        <div className="space-y-1.5 flex-1 min-w-[200px]">
          <Label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Data de Término</Label>
          <div className="relative">
            <Calendar className="absolute left-3 top-2.5 h-4 w-4 text-zinc-400" />
            <Input 
              type="date" 
              value={dataFim} 
              onChange={(e) => setDataFim(e.target.value)} 
              className="pl-9 bg-zinc-50 border-zinc-200 focus:bg-white dark:bg-zinc-800 dark:border-zinc-700 dark:focus:bg-zinc-950 dark:text-zinc-100 transition-colors"
            />
          </div>
        </div>

        <div className="space-y-1.5 w-60">
          <Label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Status das Comissões</Label>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="bg-zinc-50 border-zinc-200 dark:bg-zinc-800 dark:border-zinc-700 dark:text-zinc-100">
              <SelectValue placeholder="Selecione o status" />
            </SelectTrigger>
            <SelectContent className="dark:bg-zinc-900 dark:border-zinc-800">
              <SelectItem value="pendente" className="dark:text-zinc-200">Não Pagas (Pendentes)</SelectItem>
              <SelectItem value="pago" className="dark:text-zinc-200">Pagas</SelectItem>
              <SelectItem value="todos" className="dark:text-zinc-200">Todas as comissões</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {!isFunc && (
          <div className="space-y-1.5 w-60">
            <Label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Profissional</Label>
            <Select value={colaboradorFilter} onValueChange={setColaboradorFilter}>
              <SelectTrigger className="bg-zinc-50 border-zinc-200 dark:bg-zinc-800 dark:border-zinc-700 dark:text-zinc-100">
                <SelectValue placeholder="Todos os colaboradores" />
              </SelectTrigger>
              <SelectContent className="dark:bg-zinc-900 dark:border-zinc-800">
                <SelectItem value="todos" className="dark:text-zinc-200">Todos os colaboradores</SelectItem>
                {colaboradores.map(c => (
                  <SelectItem key={c.id} value={String(c.id)} className="dark:text-zinc-200">{c.nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        <Button onClick={load} className="bg-[#84A59D] hover:bg-[#6F9189] dark:bg-[#84A59D] dark:hover:bg-[#6F9189] dark:text-zinc-950 shadow-sm text-white px-5">
          <Filter className="w-4 h-4 mr-1.5" /> Filtrar Período
        </Button>
      </div>

      {data && (
        <>
          {/* Dashboard KPI Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {/* Card 1: Faturamento Geral de Serviços */}
            <div className="bg-white border border-zinc-200 dark:bg-zinc-900 dark:border-zinc-800 rounded-2xl p-5 shadow-sm flex items-center justify-between hover:scale-[1.01] transition-transform">
              <div className="space-y-1">
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">{isFunc ? "Meu Faturamento" : "Faturamento Bruto"}</span>
                  <TooltipProvider delayDuration={200}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          type="button"
                          title="Valor real recebido pelo salão — cada atendimento é contado uma única vez. A soma da coluna 'Serviços Executados' pode ser maior pois atendimentos com auxiliar são distribuídos para dois profissionais."
                          className="cursor-help text-zinc-350 dark:text-zinc-500 hover:text-zinc-650 focus:outline-none focus:ring-0 shrink-0 inline-flex items-center"
                        >
                          <HelpCircle className="w-3 h-3" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent side="bottom" className="max-w-[260px] text-center leading-relaxed">
                        Valor real recebido pelo salão — cada atendimento é contado <strong>uma única vez</strong>. A soma da coluna &quot;Serviços Executados&quot; pode ser maior pois atendimentos com auxiliar são distribuídos para dois profissionais.
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                <div className="font-display text-2xl font-black text-zinc-700 dark:text-zinc-100">{fmtBRL(totalFaturamentoServicos)}</div>
                <span className="text-[10px] text-zinc-400 block font-medium">{isFunc ? "Executado em meus atendimentos e vendas" : "Executado em atendimentos e vendas"}</span>
              </div>
              <div className="bg-zinc-50 dark:bg-zinc-800 p-3 rounded-xl">
                <TrendingUp className="w-6 h-6 text-zinc-500 dark:text-zinc-400" />
              </div>
            </div>

            {/* Card 2: Custo total de insumos */}
            <div className="bg-white border border-zinc-200 dark:bg-zinc-900 dark:border-zinc-800 rounded-2xl p-5 shadow-sm flex items-center justify-between hover:scale-[1.01] transition-transform">
              <div className="space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-450 dark:text-zinc-500 block">{isFunc ? "Minha Dedução de Insumos" : "Dedução de Insumos"}</span>
                <div className="font-display text-2xl font-black text-zinc-700 dark:text-zinc-150">{fmtBRL(totalInsumosGeral)}</div>
                <span className="text-[10px] text-zinc-400 block font-medium">Custo total dos produtos</span>
              </div>
              <div className="bg-zinc-50 dark:bg-zinc-800 p-3 rounded-xl">
                <Package className="w-6 h-6 text-zinc-500 dark:text-zinc-400" />
              </div>
            </div>

            {/* Card 3: Comissão Líquida Geral */}
            <div className="bg-[#FAFDFD] border border-[#E1EEED] dark:bg-emerald-950/10 dark:border-emerald-900/30 rounded-2xl p-5 shadow-sm flex items-center justify-between hover:scale-[1.01] transition-transform">
              <div className="space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#3A4F4A] dark:text-emerald-400 block">{isFunc ? "Minha Comissão Líquida" : "Comissão Líquida"}</span>
                <div className="font-display text-2xl font-black text-[#3A4F4A] dark:text-emerald-300">{fmtBRL(totalComissoesGeral)}</div>
                <span className="text-[10px] text-[#84A59D] dark:text-emerald-400/80 block font-semibold uppercase tracking-wide">
                  {statusFilter === "pendente" && `A pagar (Servs: ${fmtBRL(totalComissoesGeral - totalComissoesProdutos)} · Prods: ${fmtBRL(totalComissoesProdutos)})`}
                  {statusFilter === "pago" && `Paga (Servs: ${fmtBRL(totalComissoesGeral - totalComissoesProdutos)} · Prods: ${fmtBRL(totalComissoesProdutos)})`}
                  {statusFilter === "todos" && `Pendente + Paga (Servs: ${fmtBRL(totalComissoesGeral - totalComissoesProdutos)} · Prods: ${fmtBRL(totalComissoesProdutos)})`}
                </span>
              </div>
              <div className="bg-[#EAF5F4] dark:bg-emerald-900/30 p-3 rounded-xl">
                <Wallet className="w-6 h-6 text-[#4F736B] dark:text-emerald-300" />
              </div>
            </div>

            {/* Card 4: Total de Atendimentos */}
            <div className="bg-white border border-zinc-200 dark:bg-zinc-900 dark:border-zinc-800 rounded-2xl p-5 shadow-sm flex items-center justify-between hover:scale-[1.01] transition-transform">
              <div className="space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block">{isFunc ? "Meus Atendimentos" : "Atendimentos"}</span>
                <div className="font-display text-2xl font-black text-zinc-700 dark:text-zinc-100">{totalAtendimentosGeral}</div>
                <span className="text-[10px] text-zinc-400 block font-medium">Serviços executados</span>
              </div>
              <div className="bg-zinc-50 dark:bg-zinc-800 p-3 rounded-xl">
                <Users className="w-6 h-6 text-zinc-500 dark:text-zinc-400" />
              </div>
            </div>
          </div>

          {/* Tabela de Comissões Otimizada e Responsiva */}
          <div className="bg-white border border-zinc-200/80 dark:bg-zinc-900 dark:border-zinc-800 rounded-2xl overflow-hidden shadow-sm">
            {/* Tabela - Visível em Desktop */}
            <div className="hidden lg:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-zinc-50/70 border-b border-zinc-200 dark:bg-zinc-900/70 dark:border-zinc-850 text-[10px] uppercase tracking-wider text-zinc-400 dark:text-zinc-450 font-bold">
                  <tr>
                    <th className="px-6 py-4 text-left font-bold">Profissional</th>
                    <th className="px-6 py-4 text-center font-bold">Atendimentos</th>
                    <th className="px-6 py-4 text-right font-bold">
                      <div className="flex items-center justify-end gap-1.5">
                        <span>Serviços Executados</span>
                        <TooltipProvider delayDuration={200}>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <button
                                type="button"
                                title="Soma dos serviços em que o profissional participou como Principal ou Auxiliar. Atendimentos com auxiliar somam o mesmo valor para dois profissionais — por isso o total desta coluna pode superar o Faturamento Bruto."
                                className="cursor-help text-zinc-350 dark:text-zinc-500 hover:text-zinc-650 focus:outline-none focus:ring-0 shrink-0 inline-flex items-center"
                              >
                                <HelpCircle className="w-3 h-3" />
                              </button>
                            </TooltipTrigger>
                            <TooltipContent side="top" className="max-w-[280px] text-center leading-relaxed">
                              Soma dos serviços em que o profissional participou como <strong>Principal</strong> ou <strong>Auxiliar</strong>. Atendimentos com auxiliar somam o mesmo valor para dois profissionais — por isso o total desta coluna pode superar o Faturamento Bruto.
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                    </th>
                    <th className="px-6 py-4 text-right font-bold">Consumo / Vendas</th>
                    <th className="px-6 py-4 text-right font-bold">Comissão Líquida</th>
                    <th className="px-6 py-4 text-center font-bold">{user?.role === "admin" ? "Situação / Ação" : "Situação"}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                  {data.comissoes.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="px-6 py-16 text-center text-zinc-400 dark:text-zinc-500">
                        Nenhuma comissão correspondente aos filtros selecionados.
                      </td>
                    </tr>
                  ) : data.comissoes.map((c, index) => {
                    const colabCustoInsumos = c.detalhes?.reduce((sum, d) => sum + (d.custo_produtos || 0), 0) || 0;
                    return (
                      <tr 
                        key={`${c.colaborador_id}-${c.pago ? 'pago' : 'pendente'}-${index}`} 
                        className="hover:bg-zinc-50/40 dark:hover:bg-zinc-800/30 transition-colors"
                      >
                        {/* 1. Profissional */}
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-3">
                            {(() => {
                              const colabObj = colaboradores.find(col => col.id === c.colaborador_id);
                              if (colabObj?.foto) {
                                return (
                                  <img 
                                    src={colabObj.foto} 
                                    alt={c.colaborador_nome} 
                                    className="w-16 h-16 rounded-full object-cover shrink-0 border border-zinc-200 dark:border-zinc-800 shadow-sm"
                                  />
                                );
                              }
                              return (
                                <div 
                                  className="w-16 h-16 rounded-full flex items-center justify-center font-bold text-base font-mono shadow-sm bg-[#EAF0EE] text-[#3A4F4A] dark:bg-zinc-800 dark:text-zinc-200 border border-[#D5E2DF] dark:border-zinc-700 select-none shrink-0"
                                >
                                  {getInitials(c.colaborador_nome)}
                                </div>
                              );
                            })()}
                            <div>
                              <button 
                                onClick={() => handleOpenDetails(c)} 
                                className="text-[#3A4F4A] hover:text-[#84A59D] dark:text-[#84A59D] dark:hover:text-[#6F9189] hover:underline font-semibold flex items-center gap-1 text-left text-sm animate-pulse-subtle"
                              >
                                {c.colaborador_nome}
                                <Eye className="w-3.5 h-3.5 text-zinc-450 dark:text-zinc-500" />
                              </button>
                              {c.detalhes?.some(d => d.insumos_pendentes) && !c.pago && (
                                <span className="inline-flex items-center gap-1 mt-1 px-1.5 py-0.5 rounded-full bg-rose-50 text-rose-600 border border-rose-150 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-900/60 text-[9px] font-bold uppercase tracking-wider" title="Existem serviços com insumos pendentes de lançamento">
                                  <AlertTriangle className="w-2.5 h-2.5" /> Insumos Pendentes
                                </span>
                              )}
                              <div className="text-[11px] text-zinc-400 dark:text-zinc-500 font-medium mt-0.5">
                                Solo: {c.comissao_sozinho != null ? c.comissao_sozinho : c.comissao_principal}% · c/ Aux: {c.comissao_ajuda || 30}% · Aux: {c.comissao_auxiliar}%
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* 2. Atendimentos */}
                        <td className="px-6 py-4 text-center font-mono font-semibold text-zinc-650 dark:text-zinc-300">
                          {c.atendimentos}
                        </td>

                        {/* 3. Serviços Executados */}
                        <td className="px-6 py-4 text-right whitespace-nowrap">
                          <div className="font-semibold text-zinc-800 dark:text-zinc-200">
                            {fmtBRL(c.total_principal + c.total_auxiliar)}
                          </div>
                          <div className="text-[10px] text-zinc-400 dark:text-zinc-500 font-medium mt-0.5">
                            P: {fmtBRL(c.total_principal)} · A: {fmtBRL(c.total_auxiliar)}
                          </div>
                        </td>

                        {/* 4. Consumo / Vendas */}
                        <td className="px-6 py-4 text-right whitespace-nowrap">
                          <div className="font-semibold text-rose-500 dark:text-rose-400">
                            -{fmtBRL(colabCustoInsumos)}
                          </div>
                          <div className="text-[10px] text-zinc-400 dark:text-zinc-500 font-medium mt-0.5">
                            Vendas: {fmtBRL(c.total_produtos || 0)} (Comissão: {fmtBRL(c.comissao_produtos || 0)})
                          </div>
                        </td>

                        {/* 5. Comissão Líquida */}
                        <td className="px-6 py-4 text-right whitespace-nowrap">
                          <div className="font-display font-black text-[#3A4F4A] dark:text-emerald-450 text-base">
                            {fmtBRL(c.valor_comissao)}
                          </div>
                        </td>

                        {/* 6. Situação / Ação */}
                        <td className="px-6 py-4 text-center whitespace-nowrap">
                          <div className="flex flex-col items-center gap-1.5 justify-center">
                            {c.pago ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-150 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-900/60 text-[9px] font-bold uppercase tracking-wider">
                                <CheckCircle2 className="w-3 h-3" /> Pago {fmtDate(c.data_pagamento)}
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-150 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-900/60 text-[9px] font-bold uppercase tracking-wider animate-pulse-slow">
                                <Clock className="w-3 h-3" /> Pendente
                              </span>
                            )}
                            {user?.role === "admin" && c.valor_comissao > 0 && (
                              <button 
                                onClick={() => togglePago(c)} 
                                className={`text-[10px] font-bold hover:underline transition-colors uppercase tracking-wider ${
                                  c.pago 
                                    ? "text-zinc-400 hover:text-rose-500 dark:text-zinc-550 dark:hover:text-rose-455" 
                                    : "text-[#84A59D] hover:text-[#6F9189] dark:text-[#84A59D] dark:hover:text-[#6F9189]"
                                }`}
                              >
                                {c.pago ? "Desfazer" : "Marcar Pago"}
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Cards - Visível em Mobile */}
            <div className="block lg:hidden divide-y divide-zinc-150 dark:divide-zinc-800">
              {data.comissoes.length === 0 ? (
                <div className="px-6 py-16 text-center text-zinc-400 dark:text-zinc-500">
                  Nenhuma comissão correspondente aos filtros selecionados.
                </div>
              ) : (
                data.comissoes.map((c, index) => {
                  const colabCustoInsumos = c.detalhes?.reduce((sum, d) => sum + (d.custo_produtos || 0), 0) || 0;
                  return (
                    <div 
                      key={`${c.colaborador_id}-${c.pago ? 'pago' : 'pendente'}-${index}`} 
                      className="p-4 space-y-4 hover:bg-zinc-50/20 dark:hover:bg-zinc-850/10 transition-colors"
                    >
                      {/* Cabeçalho do Card: Avatar + Nome + Detalhes */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-3 min-w-0">
                          {(() => {
                            const colabObj = colaboradores.find(col => col.id === c.colaborador_id);
                            if (colabObj?.foto) {
                              return (
                                <img 
                                  src={colabObj.foto} 
                                  alt={c.colaborador_nome} 
                                  className="w-16 h-16 rounded-full object-cover shrink-0 border border-zinc-200 dark:border-zinc-800 shadow-sm"
                                />
                              );
                            }
                            return (
                              <div 
                                className="w-16 h-16 rounded-full flex items-center justify-center font-bold text-base font-mono shadow-sm bg-[#EAF0EE] text-[#3A4F4A] dark:bg-zinc-800 dark:text-zinc-200 border border-[#D5E2DF] dark:border-zinc-700 select-none shrink-0"
                              >
                                {getInitials(c.colaborador_nome)}
                              </div>
                            );
                          })()}
                          <div className="min-w-0">
                            <button 
                              onClick={() => handleOpenDetails(c)} 
                              className="text-[#3A4F4A] hover:text-[#84A59D] dark:text-zinc-200 dark:hover:text-[#84A59D] hover:underline font-bold flex items-center gap-1 text-left text-sm"
                            >
                              <span className="truncate">{c.colaborador_nome}</span>
                              <Eye className="w-3.5 h-3.5 text-zinc-450 dark:text-zinc-500 shrink-0" />
                            </button>
                            <div className="text-[10px] text-zinc-450 dark:text-zinc-550 font-medium mt-0.5">
                              Solo: {c.comissao_sozinho != null ? c.comissao_sozinho : c.comissao_principal}% · c/ Aux: {c.comissao_ajuda || 30}% · Aux: {c.comissao_auxiliar}%
                            </div>
                          </div>
                        </div>

                        <div className="shrink-0">
                          {c.pago ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-150 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-900/60 text-[9px] font-bold uppercase tracking-wider">
                              <CheckCircle2 className="w-2.5 h-2.5" /> Pago
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-150 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-900/60 text-[9px] font-bold uppercase tracking-wider">
                              <Clock className="w-2.5 h-2.5" /> Pendente
                            </span>
                          )}
                        </div>
                      </div>

                      {c.detalhes?.some(d => d.insumos_pendentes) && !c.pago && (
                        <div className="mt-1">
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-rose-50 text-rose-600 border border-rose-100 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-900/60 text-[9px] font-bold uppercase tracking-wider w-full justify-center">
                            <AlertTriangle className="w-3.5 h-3.5" /> Insumos Pendentes
                          </span>
                        </div>
                      )}

                      {/* Info Financeira em Grid */}
                      <div className="grid grid-cols-2 gap-2 text-xs pt-1">
                        <div className="bg-zinc-50/50 dark:bg-zinc-950/20 p-2.5 rounded-xl border border-zinc-100 dark:border-zinc-850">
                          <span className="text-[9px] text-zinc-400 dark:text-zinc-550 uppercase font-bold block mb-0.5">Atendimentos</span>
                          <span className="font-mono font-bold text-zinc-700 dark:text-zinc-300">{c.atendimentos} exec.</span>
                        </div>
                        <div className="bg-zinc-50/50 dark:bg-zinc-950/20 p-2.5 rounded-xl border border-zinc-100 dark:border-zinc-850">
                          <span className="text-[9px] text-zinc-400 dark:text-zinc-550 uppercase font-bold block mb-0.5">Total Serviços</span>
                          <span className="font-semibold text-zinc-700 dark:text-zinc-300">{fmtBRL(c.total_principal + c.total_auxiliar)}</span>
                        </div>
                        <div className="bg-zinc-50/50 dark:bg-zinc-950/20 p-2.5 rounded-xl border border-zinc-100 dark:border-zinc-850">
                          <span className="text-[9px] text-zinc-400 dark:text-zinc-550 uppercase font-bold block mb-0.5">Insumos (Consumo)</span>
                          <span className="font-semibold text-rose-500 dark:text-rose-450">-{fmtBRL(colabCustoInsumos)}</span>
                        </div>
                        <div className="bg-zinc-50/50 dark:bg-zinc-950/20 p-2.5 rounded-xl border border-zinc-100 dark:border-zinc-850">
                          <span className="text-[9px] text-zinc-400 dark:text-zinc-550 uppercase font-bold block mb-0.5">Vendas Prods.</span>
                          <span className="font-semibold text-zinc-700 dark:text-zinc-300">
                            {fmtBRL(c.total_produtos || 0)} <span className="text-[9px] text-zinc-450 dark:text-zinc-500">(+{fmtBRL(c.comissao_produtos || 0)})</span>
                          </span>
                        </div>
                      </div>

                      {/* Footer do Card: Ação e Comissão Líquida */}
                      <div className="flex items-center justify-between bg-zinc-100/50 dark:bg-zinc-950/60 border border-zinc-150 dark:border-zinc-850 p-3 rounded-xl mt-2 gap-2">
                        <div className="min-w-0">
                          {c.pago && (
                            <span className="text-[10px] text-zinc-400 dark:text-zinc-500 block truncate">
                              Pago em: {fmtDate(c.data_pagamento)}
                            </span>
                          )}
                          {user?.role === "admin" && c.valor_comissao > 0 && (
                            <button 
                              onClick={() => togglePago(c)} 
                              className={`text-[10px] font-bold hover:underline transition-colors uppercase tracking-wider block ${
                                c.pago 
                                  ? "text-zinc-400 hover:text-rose-500 dark:text-zinc-550 dark:hover:text-rose-455" 
                                  : "text-[#84A59D] hover:text-[#6F9189] dark:text-[#84A59D]"
                              }`}
                            >
                              {c.pago ? "Desfazer Pagto" : "Marcar Pago"}
                            </button>
                          )}
                        </div>
                        <div className="text-right shrink-0">
                          <span className="text-[9px] text-emerald-800 dark:text-emerald-500 uppercase font-extrabold block">Comissão Líquida</span>
                          <span className="font-mono font-black text-emerald-650 dark:text-emerald-450 text-base">
                            {fmtBRL(c.valor_comissao)}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </>
      )}

      {/* Dialog Detalhado de Comissões */}
      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="w-[95vw] max-w-[95vw] sm:max-w-[90vw] lg:max-w-[85vw] xl:max-w-[80vw] max-h-[80vh] sm:max-h-[90vh] p-4 sm:p-6 overflow-y-auto overflow-x-hidden rounded-2xl dark:bg-zinc-900 dark:border-zinc-800">
          <DialogHeader className="border-b border-zinc-100 dark:border-zinc-800 pb-4">
            <DialogTitle className="font-display text-lg sm:text-xl md:text-2xl font-extrabold tracking-tight text-[#3A4F4A] dark:text-zinc-100 flex items-center gap-2 sm:gap-3">
              {(() => {
                const colabObj = colaboradores.find(col => col.id === selectedColab?.colaborador_id);
                if (colabObj?.foto) {
                  return (
                    <img 
                      src={colabObj.foto} 
                      alt={selectedColab?.colaborador_nome} 
                      className="w-16 h-16 rounded-full object-cover shrink-0 border border-zinc-200 dark:border-zinc-800 shadow-sm"
                    />
                  );
                }
                return (
                  <div className="w-16 h-16 rounded-full bg-[#EAF0EE] dark:bg-zinc-850 text-[#3A4F4A] dark:text-[#EAF0EE] font-bold text-base shrink-0 flex items-center justify-center border border-zinc-200 dark:border-zinc-700">
                    {getInitials(selectedColab?.colaborador_nome)}
                  </div>
                );
              })()}
              <span className="truncate">Detalhamento: {selectedColab?.colaborador_nome}</span>
            </DialogTitle>
            {selectedColab && (
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5 text-[10px] sm:text-[11px] text-zinc-400 dark:text-zinc-500 font-semibold uppercase tracking-wider mt-2">
                <span>Políticas:</span>
                <span className="bg-zinc-100 dark:bg-zinc-800/60 px-1.5 py-0.5 rounded text-zinc-650 dark:text-zinc-355 font-bold">
                  Sozinho: {selectedColab.comissao_sozinho != null ? selectedColab.comissao_sozinho : selectedColab.comissao_principal}%
                </span>
                <span className="text-zinc-300 dark:text-zinc-700 hidden sm:inline">•</span>
                <span className="bg-zinc-100 dark:bg-zinc-800/60 px-1.5 py-0.5 rounded text-zinc-650 dark:text-zinc-355 font-bold">
                  Com ajuda: {selectedColab.comissao_ajuda || 30}%
                </span>
                <span className="text-zinc-300 dark:text-zinc-700 hidden sm:inline">•</span>
                <span className="bg-zinc-100 dark:bg-zinc-800/60 px-1.5 py-0.5 rounded text-zinc-650 dark:text-zinc-355 font-bold">
                  Auxiliar: {selectedColab.comissao_auxiliar}%
                </span>
              </div>
            )}
          </DialogHeader>

          {selectedColab && (
            <div className="space-y-6 py-4 min-w-0 w-full">
              {/* Resumo Rápido da Janela */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200/80 dark:border-zinc-850 p-5 rounded-2xl shadow-inner">
                <div className="space-y-1">
                  <span className="text-[9px] uppercase font-bold text-zinc-400 dark:text-zinc-500 tracking-wider">Serv. Principal</span>
                  <div className="font-semibold text-base text-zinc-700 dark:text-zinc-200">{fmtBRL(selectedColab.total_principal)}</div>
                </div>
                <div className="space-y-1">
                  <span className="text-[9px] uppercase font-bold text-zinc-400 dark:text-zinc-500 tracking-wider">Serv. Auxiliar</span>
                  <div className="font-semibold text-base text-zinc-700 dark:text-zinc-200">{fmtBRL(selectedColab.total_auxiliar)}</div>
                </div>
                <div className="space-y-1 text-rose-500 dark:text-rose-400">
                  <span className="text-[9px] uppercase font-bold text-rose-455 tracking-wider">Custo Insumos</span>
                  <div className="font-semibold text-base">{fmtBRL(selectedColab.detalhes?.reduce((sum, d) => sum + (d.custo_produtos || 0), 0))}</div>
                </div>
                <div className="space-y-1">
                  <span className="text-[9px] uppercase font-bold text-zinc-400 dark:text-zinc-500 tracking-wider">Venda Produtos</span>
                  <div className="font-semibold text-base text-zinc-700 dark:text-zinc-200">
                    {fmtBRL(selectedColab.total_produtos)}
                    <span className="text-xs text-zinc-400 dark:text-zinc-500 ml-1">
                      (Comissão: {fmtBRL(selectedColab.comissao_produtos || 0)})
                    </span>
                  </div>
                </div>
                <div className="space-y-1 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-100 dark:border-emerald-900/40 rounded-xl p-3 flex flex-col justify-center col-span-2 md:col-span-1 shadow-sm">
                  <span className="text-[9px] uppercase font-extrabold text-emerald-800 dark:text-emerald-400 tracking-wider">Comissão Líquida</span>
                  <div className="font-black text-xl text-emerald-700 dark:text-emerald-400 leading-none mt-1">{fmtBRL(selectedColab.valor_comissao)}</div>
                </div>
              </div>

              {/* Tabela de Transações Individuais - Layout Desktop */}
              <div className="hidden lg:block border border-zinc-200 dark:border-zinc-800 rounded-2xl overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[1000px] text-sm">
                    <thead className="bg-zinc-50 dark:bg-zinc-950 text-[10px] uppercase tracking-wider text-zinc-400 dark:text-zinc-500 font-bold border-b border-zinc-200 dark:border-zinc-800">
                      <tr>
                        <th className="px-4 py-3 text-left font-bold">Data</th>
                        <th className="px-4 py-3 text-left font-bold">Documento</th>
                        <th className="px-4 py-3 text-left font-bold">Tipo</th>
                        <th className="px-4 py-3 text-left font-bold">Papel</th>
                        <th className="px-4 py-3 text-left font-bold">Descrição</th>
                        <th className="px-4 py-3 text-right font-bold">Valor Item</th>
                        <th className="px-4 py-3 text-right font-bold">Custo Insumo</th>
                        <th className="px-4 py-3 text-right font-bold">Base Comis.</th>
                        <th className="px-4 py-3 text-right font-bold">Percentual</th>
                        <th className="px-4 py-3 text-right font-bold">Comissão</th>
                        <th className="px-4 py-3 text-center font-bold">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-150 dark:divide-zinc-800">
                      {selectedColab.detalhes.length === 0 ? (
                        <tr>
                          <td colSpan="11" className="px-4 py-12 text-center text-zinc-400 dark:text-zinc-500">
                            Sem movimentações individuais neste bloco de comissões.
                          </td>
                        </tr>
                      ) : (
                        selectedColab.detalhes.map((item, idx) => (
                          <tr key={idx} className="hover:bg-zinc-55/30 dark:hover:bg-zinc-800/30 transition-colors">
                            <td className="px-4 py-3 text-zinc-500 dark:text-zinc-400 font-mono text-xs whitespace-nowrap">{fmtDateTime(item.data)}</td>
                            <td className="px-4 py-3 whitespace-nowrap">
                              <div className="flex flex-col">
                                <span className="text-zinc-600 dark:text-zinc-450 font-mono text-xs font-bold">
                                  {item.numero != null 
                                    ? `${String(item.numero).padStart(6, "0")} | ${item.tipo === 'servico' ? 'S' : 'V'}`
                                    : "—"
                                  }
                                </span>
                                {item.numero != null && (
                                  <span className="text-[10px] text-zinc-400 dark:text-zinc-500 font-medium">
                                    {item.cliente_nome || "Consumidor"}
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap">
                              <span className={`inline-flex px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ${
                                item.tipo === 'servico' 
                                  ? 'bg-blue-50 text-blue-700 border border-blue-150 dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-900/60' 
                                  : 'bg-purple-50 text-purple-700 border border-purple-150 dark:bg-purple-950/40 dark:text-purple-400 dark:border-purple-900/60'
                              }`}>
                                {item.tipo === 'servico' ? 'Serviço' : 'Produto'}
                              </span>
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap">
                              <span className="text-zinc-500 dark:text-zinc-400 text-xs font-semibold">{item.papel}</span>
                            </td>
                            <td className="px-4 py-3 text-zinc-700 dark:text-zinc-200 font-semibold max-w-[200px]">
                              <div className="truncate">{item.descricao}</div>
                              {item.insumos_pendentes && (
                                <div className="mt-1">
                                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider bg-rose-50 text-rose-600 border border-rose-100 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-900/60">
                                    <AlertTriangle className="w-2 h-2" /> Insumos Pendentes
                                  </span>
                                </div>
                              )}
                            </td>
                            <td className="px-4 py-3 text-right text-zinc-650 dark:text-zinc-300 font-medium">{fmtBRL(item.valor_movimentacao)}</td>
                            <td className="px-4 py-3 text-right text-rose-500 dark:text-rose-400 font-semibold">
                              {item.tipo === 'servico' ? fmtBRL(item.custo_produtos || 0) : "—"}
                            </td>
                            <td className="px-4 py-3 text-right text-zinc-800 dark:text-zinc-150 font-bold">
                              {item.tipo === 'servico' ? fmtBRL(item.base_comissao != null ? item.base_comissao : item.valor_movimentacao) : fmtBRL(item.valor_movimentacao)}
                            </td>
                            <td className="px-4 py-3 text-right font-bold text-zinc-450 dark:text-zinc-500 font-mono">
                              {item.percentual_aplicado}%
                            </td>
                            <td className="px-4 py-3 text-right font-black text-emerald-600 dark:text-emerald-400 font-mono">{fmtBRL(item.valor_comissao)}</td>
                            <td className="px-4 py-3 text-center whitespace-nowrap">
                              {item.pago ? (
                                <span className="inline-flex px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-900/60 text-[9px] font-bold uppercase tracking-wider">
                                  Pago
                                </span>
                              ) : (
                                <span className="inline-flex px-2 py-0.5 rounded-full bg-amber-50 text-amber-600 border border-amber-100 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-900/60 text-[9px] font-bold uppercase tracking-wider">
                                  Pendente
                                </span>
                              )}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Lançamentos Detalhados - Layout Mobile */}
              <div className="block lg:hidden space-y-4 max-h-[55vh] overflow-y-auto pr-1">
                {selectedColab.detalhes.length === 0 ? (
                  <div className="text-center py-12 text-zinc-400 dark:text-zinc-500 border border-zinc-200 dark:border-zinc-800 rounded-2xl">
                    Sem movimentações individuais neste bloco de comissões.
                  </div>
                ) : (
                  selectedColab.detalhes.map((item, idx) => (
                    <div key={idx} className="bg-zinc-50/50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-4 space-y-3 shadow-sm hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors">
                      <div className="flex items-center justify-between">
                        <span className={`inline-flex px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ${
                          item.tipo === 'servico' 
                            ? 'bg-blue-50 text-blue-700 border border-blue-150 dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-900/60' 
                            : 'bg-purple-50 text-purple-700 border border-purple-150 dark:bg-purple-950/40 dark:text-purple-400 dark:border-purple-900/60'
                        }`}>
                          {item.tipo === 'servico' ? 'Serviço' : 'Produto'}
                        </span>
                        {item.pago ? (
                          <span className="inline-flex px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-900/60 text-[9px] font-bold uppercase tracking-wider">
                            Pago
                          </span>
                        ) : (
                          <span className="inline-flex px-2 py-0.5 rounded-full bg-amber-50 text-amber-600 border border-amber-100 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-900/60 text-[9px] font-bold uppercase tracking-wider">
                            Pendente
                          </span>
                        )}
                      </div>

                      <div className="space-y-1">
                        <div className="font-semibold text-sm text-zinc-800 dark:text-zinc-100">
                          {item.descricao}
                        </div>
                        {item.insumos_pendentes && (
                          <div>
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider bg-rose-50 text-rose-600 border border-rose-100 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-900/60">
                              <AlertTriangle className="w-2.5 h-2.5" /> Insumos Pendentes
                            </span>
                          </div>
                        )}
                      </div>

                      <div className="grid grid-cols-2 gap-y-3 gap-x-4 pt-3 border-t border-zinc-150 dark:border-zinc-800 text-xs">
                        <div>
                          <span className="text-[10px] text-zinc-400 dark:text-zinc-500 uppercase font-bold block mb-0.5">Data/Hora</span>
                          <span className="font-mono text-zinc-650 dark:text-zinc-350">{fmtDateTime(item.data)}</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-zinc-400 dark:text-zinc-500 uppercase font-bold block mb-0.5">Documento</span>
                          <div className="flex flex-col">
                            <span className="font-mono text-zinc-650 dark:text-zinc-350">
                              {item.numero != null ? `${String(item.numero).padStart(6, "0")} | ${item.tipo === 'servico' ? 'S' : 'V'}` : "—"}
                            </span>
                            {item.numero != null && (
                              <span className="text-[10px] text-zinc-400 dark:text-zinc-500 font-medium">
                                {item.cliente_nome || "Consumidor"}
                              </span>
                            )}
                          </div>
                        </div>
                        <div>
                          <span className="text-[10px] text-zinc-400 dark:text-zinc-500 uppercase font-bold block mb-0.5">Papel / Valor</span>
                          <span className="text-zinc-750 dark:text-zinc-350 font-medium">
                            {item.papel} ({fmtBRL(item.valor_movimentacao)})
                          </span>
                        </div>
                        {item.tipo === 'servico' && (
                          <div>
                            <span className="text-[10px] text-zinc-400 dark:text-zinc-500 uppercase font-bold block mb-0.5">Custo Insumo</span>
                            <span className="text-rose-500 dark:text-rose-400 font-semibold">
                              -{fmtBRL(item.custo_produtos || 0)}
                            </span>
                          </div>
                        )}
                      </div>

                      <div className="flex items-center justify-between bg-zinc-100 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-850 p-3 rounded-xl text-xs mt-2">
                        <div>
                          <span className="text-[10px] text-zinc-450 dark:text-zinc-550 uppercase font-bold block">Base / Taxa</span>
                          <span className="text-zinc-700 dark:text-zinc-300 font-medium">
                            {fmtBRL(item.tipo === 'servico' ? (item.base_comissao != null ? item.base_comissao : item.valor_movimentacao) : item.valor_movimentacao)} @ <b className="font-mono">{item.percentual_aplicado}%</b>
                          </span>
                        </div>
                        <div className="text-right">
                          <span className="text-[10px] text-emerald-800 dark:text-emerald-500 uppercase font-extrabold block">Comissão</span>
                          <span className="font-mono font-black text-emerald-600 dark:text-emerald-450 text-sm">
                            {fmtBRL(item.valor_comissao)}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          <DialogFooter className="border-t border-zinc-100 dark:border-zinc-800 pt-4">
            <Button onClick={() => setDetailsOpen(false)} className="bg-zinc-800 hover:bg-zinc-900 dark:bg-zinc-850 dark:hover:bg-zinc-800 dark:text-zinc-100 text-white shadow-sm">
              Fechar Detalhamento
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de Confirmação: Insumos Pendentes */}
      <Dialog open={confirmInsumosOpen} onOpenChange={setConfirmInsumosOpen}>
        <DialogContent className="w-[95vw] max-w-[95vw] sm:max-w-[425px] p-5 sm:p-6 rounded-2xl dark:bg-zinc-900 dark:border-zinc-800">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-rose-600 dark:text-rose-400">
              <AlertTriangle className="w-5 h-5" />
              Insumos Pendentes
            </DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-zinc-650 dark:text-zinc-300">
              Este serviço possui lançamentos de insumos pendentes. Deseja realizar o pagamento da comissão mesmo assim?
            </p>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setConfirmInsumosOpen(false)}>
              Cancelar e Revisar
            </Button>
            <Button 
              className="bg-rose-500 hover:bg-rose-650 text-white" 
              onClick={() => {
                setConfirmInsumosOpen(false);
                if (comissaoToPay) executePago(comissaoToPay);
              }}
            >
              Sim, Pagar Comissão
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Filtros para Relatório de Comissões */}
      <Dialog open={relatorioDialogOpen} onOpenChange={setRelatorioDialogOpen}>
        <DialogContent className="w-[95vw] max-w-[95vw] sm:max-w-md p-5 sm:p-6 bg-white dark:bg-zinc-950 rounded-2xl border border-zinc-150 dark:border-zinc-850 shadow-2xl">
          <DialogHeader className="border-b border-zinc-100 dark:border-zinc-850 pb-3">
            <DialogTitle className="flex items-center gap-2">
              <Printer className="w-5 h-5 text-[#84A59D]" />
              <span className="font-display font-bold text-zinc-900 dark:text-zinc-50">Relatório de Comissões</span>
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-3">
            {/* Datas */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-semibold text-zinc-655 dark:text-zinc-350">Data de Início</Label>
                <div className="relative">
                  <Calendar className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-zinc-400" />
                  <Input 
                    type="date" 
                    value={relatorioDataInicio} 
                    onChange={(e) => setRelatorioDataInicio(e.target.value)} 
                    className="pl-8 text-xs bg-zinc-50/50 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 h-9"
                  />
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-semibold text-zinc-655 dark:text-zinc-350">Data de Término</Label>
                <div className="relative">
                  <Calendar className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-zinc-400" />
                  <Input 
                    type="date" 
                    value={relatorioDataFim} 
                    onChange={(e) => setRelatorioDataFim(e.target.value)} 
                    className="pl-8 text-xs bg-zinc-50/50 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 h-9"
                  />
                </div>
              </div>
            </div>

            {/* Colaborador */}
            <div className="space-y-1">
              <Label className="text-xs font-semibold text-zinc-655 dark:text-zinc-350">Colaborador</Label>
              <Select 
                value={relatorioColabId} 
                onValueChange={setRelatorioColabId} 
                disabled={isFunc}
              >
                <SelectTrigger className="bg-zinc-50/50 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 h-9 text-xs">
                  <SelectValue placeholder="Selecione o colaborador" />
                </SelectTrigger>
                <SelectContent className="dark:bg-zinc-950 dark:border-zinc-850">
                  <SelectItem value="todos" className="text-xs dark:text-zinc-200">Todos os colaboradores</SelectItem>
                  {colaboradores.map((c) => (
                    <SelectItem key={c.id} value={String(c.id)} className="text-xs dark:text-zinc-200">
                      {c.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Status */}
            <div className="space-y-1">
              <Label className="text-xs font-semibold text-zinc-655 dark:text-zinc-350">Status das Comissões</Label>
              <Select value={relatorioStatus} onValueChange={setRelatorioStatus}>
                <SelectTrigger className="bg-zinc-50/50 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 h-9 text-xs">
                  <SelectValue placeholder="Selecione o status" />
                </SelectTrigger>
                <SelectContent className="dark:bg-zinc-950 dark:border-zinc-850">
                  <SelectItem value="todos" className="text-xs dark:text-zinc-200">Todos os status</SelectItem>
                  <SelectItem value="pendente" className="text-xs dark:text-zinc-200">Não Pagas (Pendentes)</SelectItem>
                  <SelectItem value="pago" className="text-xs dark:text-zinc-200">Pagas</SelectItem>
                  <SelectItem value="cancelado" className="text-xs dark:text-zinc-200">Canceladas</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Checkbox Detalhamento */}
            <div className="flex items-center space-x-2.5 bg-zinc-50 dark:bg-zinc-900/40 p-3 rounded-xl border border-zinc-200/60 dark:border-zinc-800/80 mt-2">
              <Checkbox 
                id="exibir-detalhamento"
                checked={relatorioExibirDetalhamento}
                onCheckedChange={setRelatorioExibirDetalhamento}
              />
              <div className="grid gap-0.5 leading-none">
                <Label htmlFor="exibir-detalhamento" className="text-xs font-bold text-zinc-800 dark:text-zinc-200 cursor-pointer select-none">
                  Exibir detalhamento das comissões
                </Label>
                <p className="text-[10px] text-zinc-400">
                  Inclui a lista detalhada de cada serviço/venda, valor, data e identificador.
                </p>
              </div>
            </div>
          </div>
          
          <DialogFooter className="border-t border-zinc-100 dark:border-zinc-800 pt-3 gap-2 sm:gap-0">
            <Button 
              variant="outline" 
              onClick={() => setRelatorioDialogOpen(false)}
              className="text-xs h-9"
            >
              Cancelar
            </Button>
            <Button 
              onClick={generatePDF}
              className="bg-[#84A59D] hover:bg-[#6F9189] dark:bg-[#84A59D] dark:hover:bg-[#6F9189] dark:text-zinc-950 text-white font-semibold text-xs h-9 px-5"
            >
              Gerar PDF
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
