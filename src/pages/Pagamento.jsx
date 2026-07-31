import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import http from "../api";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "../components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "../components/ui/dialog";
import { ArrowLeft, Plus, Trash2, CheckCircle2, Edit2, AlertCircle, ShoppingCart, AlertTriangle, TrendingUp } from "lucide-react";
import { Switch } from "../components/ui/switch";
import StatusBadge from "../components/StatusBadge";
import PasswordConfirmDialog from "../components/PasswordConfirmDialog";
import { useAuth } from "../auth";
import { toast } from "sonner";

const FORMAS = [
  { v: "dinheiro", l: "Dinheiro" },
  { v: "pix", l: "PIX" },
  { v: "cartao_credito", l: "Cartão Crédito" },
  { v: "cartao_debito", l: "Cartão Débito" },
  { v: "vale", l: "Vale-alimentação" },
];

const fmtBRL = (n) => (n || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const fmtDT = (s) => new Date(s).toLocaleString("pt-BR");

export default function Pagamento() {
  const { id } = useParams();
  const nav = useNavigate();
  const { user } = useAuth();
  const temPermissaoPagamento = user?.role === "admin" || user?.perfil?.permissoes?.["agenda.pagamento"] === true;
  const [ag, setAg] = useState(null);
  const [novos, setNovos] = useState([{ valor: "", forma_pagamento: "dinheiro", observacao: "", parcelas: 1 }]);
  const [taxasCartao, setTaxasCartao] = useState([]);

  const isCredito = (forma) => {
    if (forma === "cartao_credito") return true;
    const taxa = taxasCartao.find(t => t.forma_pagamento === forma);
    return taxa && taxa.tipo_cartao === "credito";
  };

  const hasBrandRates = (forma) => {
    return false;
  };

  const hasAdquirenteRates = () => {
    return taxasCartao.some(t =>
      t.ativo &&
      t.deletado !== "S" &&
      t.adquirente_id !== null &&
      t.adquirente_id !== undefined &&
      String(t.adquirente_id).trim() !== "" &&
      String(t.adquirente_id).trim() !== "null"
    );
  };

  const getParcelasDisponiveis = () => hasAdquirenteRates() ? [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12] : [1];

  const getFormasDisponiveis = () => {
    const baseFormas = FORMAS.filter(f => f.v !== "cartao_credito" && f.v !== "cartao_debito");
    const activeRates = taxasCartao.filter(t => t.ativo && t.deletado !== "S");
    
    const hasCustomRates = activeRates.some(t => 
      t.adquirente_id !== null && 
      t.adquirente_id !== undefined && 
      String(t.adquirente_id).trim() !== "" && 
      String(t.adquirente_id).trim() !== "null"
    );

    if (hasCustomRates) {
      const customOptions = activeRates
        .filter(t => 
          t.adquirente_id !== null && 
          t.adquirente_id !== undefined && 
          String(t.adquirente_id).trim() !== "" && 
          String(t.adquirente_id).trim() !== "null"
        )
        .map(t => {
          let label = t.descricao;
          if (!label) {
            const typeName = t.tipo_cartao === 'credito' ? 'Crédito' : 'Débito';
            const brandName = t.bandeira ? t.bandeira.trim() : '';
            label = `${typeName} ${brandName}`.trim();
          }
          return {
            v: t.forma_pagamento,
            l: label,
            tipo_cartao: t.tipo_cartao
          };
        });
      return [...baseFormas, ...customOptions];
    }
    return FORMAS;
  };

  const getFormaPagamentoLabel = (forma) => {
    const foundDisponivel = getFormasDisponiveis().find(f => f.v === forma);
    if (foundDisponivel) return foundDisponivel.l;
    
    const foundBase = FORMAS.find(f => f.v === forma);
    if (foundBase) return foundBase.l;
    
    const foundTaxa = taxasCartao.find(t => t.forma_pagamento === forma);
    if (foundTaxa) {
      if (foundTaxa.descricao) return foundTaxa.descricao;
      const typeName = foundTaxa.tipo_cartao === 'credito' ? 'Crédito' : 'Débito';
      const brandName = foundTaxa.bandeira ? foundTaxa.bandeira.trim() : '';
      return `${typeName} ${brandName}`.trim();
    }
    
    if (typeof forma === 'string') {
      if (forma.startsWith('debito_')) return 'Débito (Customizado)';
      if (forma.startsWith('credito_')) return 'Crédito (Customizado)';
    }
    return forma || "";
  };
  const [pendingSales, setPendingSales] = useState([]);
  const [trabalharCredito, setTrabalharCredito] = useState(false);
  const [clienteSaldo, setClienteSaldo] = useState(0);
  const [gerarCreditoExcedente, setGerarCreditoExcedente] = useState(false);
  
  // Estados para edição de pagamento
  const [editingPayment, setEditingPayment] = useState(null);
  const [editFormOpen, setEditFormOpen] = useState(false);
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState(null);
  const [autoPayConfirmOpen, setAutoPayConfirmOpen] = useState(false);
  const [finalizarConfirmOpen, setFinalizarConfirmOpen] = useState(false);
  const [pendingAgToFinish, setPendingAgToFinish] = useState(null);
  const [trocoConfirmOpen, setTrocoConfirmOpen] = useState(false);
  const [trocoConfirmData, setTrocoConfirmData] = useState(null);

  // Estados para seleção de profissionais em falta
  const [colaboradores, setColaboradores] = useState([]);
  const [profsDialogOpen, setProfsDialogOpen] = useState(false);
  const [missingProfs, setMissingProfs] = useState([]);

  // Novos estados para Descontos
  const [descontos, setDescontos] = useState([]);
  const [descontoId, setDescontoId] = useState("");
  const [autorizarDialogOpen, setAutorizarDialogOpen] = useState(false);
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [loadingDesconto, setLoadingDesconto] = useState(false);

  const getColabName = (colabId) => {
    if (!colabId) return "";
    const colab = colaboradores.find(c => c.id === colabId);
    return colab ? colab.nome : "";
  };

  const load = () => {
    http.get(`/agendamentos/${id}`).then((r) => {
      setAg(r.data);
      if (r.data?.cliente_id) {
        http.get("/vendas-diretas", { params: { cliente_id: r.data.cliente_id, status: "pendente" } })
          .then((res) => {
            setPendingSales(res.data.map(s => ({ ...s, selected: true })));
          }).catch(() => { });
        
        http.get(`/clientes/${r.data.cliente_id}`)
          .then(cRes => setClienteSaldo(Number(cRes.data.saldo_credito || 0)))
          .catch(() => {});
      }
    });
  };

  useEffect(() => {
    load();
    http.get("/colaboradores").then(r => setColaboradores(r.data)).catch(() => {});
    http.get("/descontos")
      .then(r => setDescontos(r.data.filter(d => d.ativo)))
      .catch(() => {});
    http.get("/configuracoes/sistema").then((r) => {
      if (r.data) {
        setTrabalharCredito(!!r.data.trabalhar_credito_cliente);
      }
    }).catch(() => { });
    http.get("/configuracoes/taxas-cartao").then((r) => {
      setTaxasCartao(r.data || []);
    }).catch(() => {});
  }, [id]);

  useEffect(() => {
    if (autorizarDialogOpen) {
      setAuthEmail("");
      setAuthPassword("");
    }
  }, [autorizarDialogOpen]);

  const toggleSaleSelection = async (saleId) => {
    const updatedSales = pendingSales.map(s => s.id === saleId ? { ...s, selected: !s.selected } : s);
    setPendingSales(updatedSales);
    if (temDescontoAplicado) {
      const activeDescontoId = descontoMeta.desconto_id;
      const activeVendasIds = updatedSales.filter(s => s.selected).map(s => s.id);
      await applyDiscountOnBackend(activeDescontoId, null, activeVendasIds);
    }
  };

  if (!ag) return <div className="p-8 text-zinc-400">Carregando...</div>;
  const saldoAgendamento = (ag.valor_total || 0) - (ag.total_pago || 0);
  const totalSalesSelected = pendingSales.filter(s => s.selected).reduce((sum, s) => sum + (s.valor_total - s.valor_pago), 0);
  const saldo = saldoAgendamento + totalSalesSelected;
  const valorTotal = (ag.valor_total || 0) + pendingSales.filter(s => s.selected).reduce((sum, s) => sum + s.valor_total, 0);
  const totalInformado = novos.filter((p) => Number(p.valor) > 0).reduce((sum, p) => sum + Number(p.valor), 0);
  const excessoTotal = totalInformado > saldo ? Number((totalInformado - saldo).toFixed(2)) : 0;
  const trocoTotal = !gerarCreditoExcedente && totalInformado > saldo && novos.some(p => p.forma_pagamento === "dinheiro") ? totalInformado - saldo : 0;

  let descontoMeta = ag?.desconto_aplicado;
  if (typeof descontoMeta === 'string') {
    try {
      descontoMeta = JSON.parse(descontoMeta);
    } catch (e) {}
  }
  const temDescontoAplicado = !!descontoMeta;

  // Calculo de Desconto Geral (Servicos + Produtos)
  const totalDescontoServicos = descontoMeta?.total_descontado || 0;
  const totalDescontoProdutos = pendingSales.filter(s => s.selected && s.desconto_aplicado).reduce((sum, s) => {
    let dMeta = s.desconto_aplicado;
    if (typeof dMeta === 'string') {
      try { dMeta = JSON.parse(dMeta); } catch(e) {}
    }
    return sum + (dMeta?.total_descontado || 0);
  }, 0);
  const totalDescontoGeral = totalDescontoServicos + totalDescontoProdutos;

  const valorServicosOriginal = saldoAgendamento + totalDescontoServicos;
  const valorProdutosOriginal = totalSalesSelected + totalDescontoProdutos;

  const valorOriginalAgendamento = temDescontoAplicado ? (ag.valor_total + totalDescontoServicos) : ag.valor_total;

  const getConsolidadoPorForma = () => {
    const totalPorForma = {};
    (ag.pagamentos || []).forEach(p => {
      totalPorForma[p.forma_pagamento] = (totalPorForma[p.forma_pagamento] || 0) + Number(p.valor);
    });
    
    let tempSaldo = saldo;
    const isZeroSaldo = saldo <= 0.01;
    const validos = novos.filter(p => isZeroSaldo ? Number(p.valor) >= 0 : Number(p.valor) > 0);
    validos.forEach(p => {
      let pVal = Number(p.valor);
      let netVal = pVal;
      if (p.forma_pagamento === "dinheiro" && pVal > tempSaldo) {
        netVal = Math.max(0, tempSaldo);
        tempSaldo = 0;
      } else {
        tempSaldo = Number((tempSaldo - pVal).toFixed(2));
      }
      totalPorForma[p.forma_pagamento] = (totalPorForma[p.forma_pagamento] || 0) + netVal;
    });

    return Object.entries(totalPorForma).map(([forma, total]) => ({
      forma,
      label: getFormaPagamentoLabel(forma),
      total
    })).filter(x => x.total > 0.01);
  };

  const isDescontoAplicavel = (desconto) => {
    let vinculados = null;
    if (desconto.itens_vinculados) {
      try {
        vinculados = typeof desconto.itens_vinculados === "string"
          ? JSON.parse(desconto.itens_vinculados)
          : desconto.itens_vinculados;
      } catch (e) {}
    }

    const hasLinkedServices = Array.isArray(vinculados?.services) && vinculados.services.length > 0;
    const hasLinkedProducts = Array.isArray(vinculados?.products) && vinculados.products.length > 0;

    const itensAgendamento = Array.isArray(ag.itens) ? ag.itens : [];
    
    const selectedProducts = [];
    pendingSales.filter(s => s.selected).forEach(s => {
      if (Array.isArray(s.itens) && s.itens.length > 0) {
        selectedProducts.push(...s.itens);
      } else if (s.produto_id) {
        selectedProducts.push({ produto_id: s.produto_id });
      }
    });

    // Check general discount (no restrictions at all)
    if (!hasLinkedServices && !hasLinkedProducts) {
      return true;
    }

    // 1. Desconto vinculado apenas a Produtos
    if (hasLinkedProducts && !hasLinkedServices) {
      if (selectedProducts.length === 0) return false;
      return selectedProducts.some(p => vinculados.products.includes(p.produto_id));
    }

    // 2. Desconto vinculado a Serviços e Produtos
    if (hasLinkedServices && hasLinkedProducts) {
      const matchService = itensAgendamento.some(s => vinculados.services.includes(s.servico_id));
      const matchProduct = selectedProducts.some(p => vinculados.products.includes(p.produto_id));
      return matchService || matchProduct;
    }

    // 3. Desconto vinculado apenas a Serviços
    if (hasLinkedServices && !hasLinkedProducts) {
      return itensAgendamento.some(s => vinculados.services.includes(s.servico_id));
    }

    return false;
  };

  const applyDiscountOnBackend = async (dId, authData = null, customVendasIds = null) => {
    setLoadingDesconto(true);
    try {
      if (authData) {
        if (!authData.email || !authData.email.trim()) {
          toast.error("Usuário (E-mail) é obrigatório");
          setLoadingDesconto(false);
          return;
        }
        if (!authData.password || !authData.password.trim()) {
          toast.error("Senha é obrigatória");
          setLoadingDesconto(false);
          return;
        }
        await http.post("/descontos/validar", {
          id: dId,
          email: authData.email.trim(),
          password: authData.password
        });
      }

      const targetVendasIds = customVendasIds !== null 
        ? customVendasIds 
        : pendingSales.filter(s => s.selected).map(s => s.id);

      await http.post(`/agendamentos/${id}/aplicar-desconto`, { 
        descontoId: dId, 
        vendasDiretasIds: targetVendasIds 
      });
      toast.success(dId ? "Desconto aplicado com sucesso!" : "Desconto removido com sucesso!");
      setDescontoId("");
      setAutorizarDialogOpen(false);
      load();
    } catch (e) {
      toast.error(e.response?.data?.detail || "Erro ao aplicar desconto.");
    } finally {
      setLoadingDesconto(false);
    }
  };

  const handleSelectDesconto = async (dId) => {
    if (!dId) return;
    const desc = descontos.find(d => d.id === dId);
    if (!desc) return;

    if (!isDescontoAplicavel(desc)) {
      toast.error("Este desconto não é válido para os serviços do agendamento ou produtos selecionados.");
      return;
    }

    // Se já existe desconto aplicado, pedir confirmação antes de substituir
    if (temDescontoAplicado) {
      const confirmar = window.confirm(
        `Já existe o desconto "${descontoMeta?.codigo}" aplicado.\n\nDeseja substituir pelo desconto "${desc.codigo}"?`
      );
      if (!confirmar) return;
    }

    if (desc.requer_autorizacao) {
      setDescontoId(dId);
      setAuthEmail("");
      setAuthPassword("");
      setAutorizarDialogOpen(true);
    } else {
      await applyDiscountOnBackend(dId);
    }
  };

  const handleRemoveDesconto = async () => {
    await applyDiscountOnBackend(null);
  };

  const addLine = () => setNovos([...novos, { valor: "", forma_pagamento: "dinheiro", observacao: "", parcelas: 1 }]);
  const removeLine = (i) => setNovos(novos.filter((_, x) => x !== i));
  
  const updateLine = (i, k, v) => {
    if (k === "valor") {
      const valNum = parseFloat(v) || 0;
      if (valNum > saldo && novos[i].forma_pagamento !== "dinheiro") {
        if (!trabalharCredito || !ag?.cliente_id) {
          toast.error("Troco permitido apenas para pagamentos em dinheiro.");
          return;
        }
      }
    }

    if (k === "forma_pagamento" && v !== "dinheiro") {
      const valNum = parseFloat(novos[i].valor) || 0;
      if (valNum > saldo) {
        if (!trabalharCredito || !ag?.cliente_id) {
          toast.error("Troco permitido apenas para pagamentos em dinheiro.");
          setNovos(novos.map((p, x) => x === i ? { 
            ...p, 
            forma_pagamento: v,
            valor: "",
            observacao: "",
            parcelas: 1
          } : p));
          return;
        }
      }
    }

    let novoValor = v;
    let trocoCalculado = 0;
    let observacaoTroco = "";
    
    // Se for atualização do valor e a forma de pagamento for dinheiro
    if (k === "valor" && novos[i].forma_pagamento === "dinheiro") {
      const valorPago = parseFloat(v) || 0;
      if (valorPago > saldo) {
        trocoCalculado = valorPago - saldo;
        observacaoTroco = `Troco: ${fmtBRL(trocoCalculado)}`;
      }
    }
    
    setNovos(novos.map((p, x) => x === i ? { 
      ...p, 
      [k]: v,
      ...(k === "forma_pagamento" ? {
        parcelas: isCredito(v) && hasAdquirenteRates() ? (p.parcelas || 1) : 1
      } : {}),
      observacao: k === "valor" && p.forma_pagamento === "dinheiro" && observacaoTroco ? observacaoTroco : p.observacao
    } : p));
    
    // Mostrar toast de troco se aplicável
    if (k === "valor" && novos[i].forma_pagamento === "dinheiro" && trocoCalculado > 0) {
      toast.info(`Troco: ${fmtBRL(trocoCalculado)}`, { duration: 3000 });
    }
  };

  const executePayment = async (customAg, forceFinalizarConfirm = false, customValidos = null, forceTrocoConfirm = false) => {
    const isZeroSaldo = saldo <= 0.01;
    const validos = customValidos || novos.filter((p) => isZeroSaldo ? Number(p.valor) >= 0 : Number(p.valor) > 0);
    if (validos.length === 0) { toast.error("Informe ao menos um pagamento"); return; }
    
    const totalInformado = validos.reduce((sum, p) => sum + Number(p.valor), 0);
    const finalizar = totalInformado >= (saldo - 0.01);
    
    if (finalizar && !forceFinalizarConfirm) {
      const excessoTotal = totalInformado > saldo ? Number((totalInformado - saldo).toFixed(2)) : 0;
      if (excessoTotal <= 0) {
        setPendingAgToFinish(customAg);
        setFinalizarConfirmOpen(true);
        return;
      }
    }

    const excessoTotal = totalInformado > saldo ? Number((totalInformado - saldo).toFixed(2)) : 0;
    const temTroco = excessoTotal > 0 && novos.some(p => p.forma_pagamento === "dinheiro");
    
    if (gerarCreditoExcedente && excessoTotal > 0 && !forceTrocoConfirm) {
      setTrocoConfirmData({ excessoTotal, totalInformado, customAg, customValidos: validos, isCredit: true });
      setTrocoConfirmOpen(true);
      return;
    }

    if (!gerarCreditoExcedente && temTroco && !forceTrocoConfirm) {
      setTrocoConfirmData({ excessoTotal, totalInformado, customAg, customValidos: validos, isCredit: false });
      setTrocoConfirmOpen(true);
      return;
    }
    
    if (finalizar) {
      for (const item of customAg.itens || []) {
        if (!item.colaborador_id || item.colaborador_id === "none") {
          toast.error(`Não é possível finalizar sem definir o profissional do serviço: ${item.nome || "Serviço"}.`);
          return;
        }
      }
    }

    // 1. Calculate net value for each payment, capping at the unified saldo due
    let tempSaldo = saldo;
    let netPaymentsPool = [];
    for (let p of validos) {
      let pVal = Number(p.valor);
      let netVal = pVal;
      if (p.forma_pagamento === "dinheiro" && pVal > tempSaldo) {
        netVal = Math.max(0, tempSaldo);
        tempSaldo = 0;
      } else {
        tempSaldo = Number((tempSaldo - pVal).toFixed(2));
      }
      netPaymentsPool.push({
        ...p,
        valor: netVal, // Net value allocated for distribution
        valor_original: pVal // Raw amount paid by customer
      });
    }

    // 2. Distribute net payments across items
    let items = [
      { type: 'agendamento', id: id, saldo: saldoAgendamento },
      ...pendingSales.filter(s => s.selected).map(s => ({ type: 'sale', id: s.id, saldo: s.valor_total - s.valor_pago }))
    ];

    let paymentsPool = netPaymentsPool.map(p => ({ ...p, valor: p.valor }));
    let itemPayments = {};

    for (let item of items) {
      let remainingSaldo = item.saldo;
      let itemPags = [];

      for (let p of paymentsPool) {
        if (p.valor <= 0) continue;
        if (remainingSaldo <= 0) break;

        let payAmount = Math.min(p.valor, remainingSaldo);
        p.valor = Number((p.valor - payAmount).toFixed(2));
        remainingSaldo = Number((remainingSaldo - payAmount).toFixed(2));

        itemPags.push({
          valor: Number(payAmount.toFixed(2)),
          forma_pagamento: p.forma_pagamento,
          observacao: p.observacao || "",
          parcelas: p.parcelas || 1
        });
      }

      itemPayments[item.type === 'agendamento' ? 'agendamento' : item.id] = {
        pagamentos: itemPags,
        finalizar: remainingSaldo <= 0.01
      };
    }

    // 3. Attach the excess to the last distributed payment
    if (excessoTotal > 0) {
      const itemKeys = [...pendingSales.filter(s => s.selected).map(s => s.id), 'agendamento'];
      for (const key of itemKeys) {
        const itemPay = itemPayments[key];
        if (itemPay && itemPay.pagamentos && itemPay.pagamentos.length > 0) {
          const targetPag = gerarCreditoExcedente 
            ? itemPay.pagamentos[itemPay.pagamentos.length - 1] 
            : itemPay.pagamentos.find(p => p.forma_pagamento === 'dinheiro');
          if (targetPag) {
            targetPag.valor = Number((targetPag.valor + excessoTotal).toFixed(2));
            break;
          }
        }
      }
    }

    try {
      // 4. Save payments in the backend
      const agPayInfo = itemPayments['agendamento'];
      if (agPayInfo && (agPayInfo.pagamentos.length > 0 || Number(customAg.valor_total) === 0)) {
        await http.post(`/agendamentos/${id}/pagamentos`, {
          pagamentos: agPayInfo.pagamentos,
          finalizar: agPayInfo.finalizar,
          gerar_credito_excedente: gerarCreditoExcedente
        });
      }

      for (const sale of pendingSales.filter(s => s.selected)) {
        const salePayInfo = itemPayments[sale.id];
        if (salePayInfo && salePayInfo.pagamentos.length > 0) {
          await http.post(`/vendas-diretas/${sale.id}/pagamentos`, {
            pagamentos: salePayInfo.pagamentos,
            finalizar: salePayInfo.finalizar,
            gerar_credito_excedente: gerarCreditoExcedente
          });
        }
      }

      if (gerarCreditoExcedente) {
        toast.success(finalizar ? `Atendimento e vendas finalizados! Crédito de ${fmtBRL(excessoTotal)} gerado para o cliente.` : `Pagamento registrado! Crédito de ${fmtBRL(excessoTotal)} gerado.`);
      } else if (temTroco) {
        toast.success(`Pagamento registrado com sucesso! Devolva o troco de ${fmtBRL(excessoTotal)}`);
      } else {
        toast.success(finalizar ? "Atendimento e vendas finalizados com sucesso!" : `Pagamento registrado! Restante pendente: ${fmtBRL(saldo - totalInformado)}`);
      }

      if (finalizar) {
        nav("/agenda");
      } else {
        setNovos([{ valor: "", forma_pagamento: "dinheiro", observacao: "", parcelas: 1 }]);
        load();
      }
    } catch (e) {
      toast.error(e.response?.data?.detail || "Erro ao registrar pagamento");
    }
  };

  const submit = async (forceSaldo = false) => {
    if (!temPermissaoPagamento) {
      toast.error("Você não tem permissão para realizar pagamentos.");
      return;
    }
    for (const p of novos) {
      const valNum = Number(p.valor) || 0;
      if (p.forma_pagamento === "credito_cliente") {
        if (!trabalharCredito) {
          toast.error("A funcionalidade de Crédito de Clientes está desabilitada.");
          return;
        }
        if (!ag?.cliente_id) {
          toast.error("Para utilizar crédito é necessário identificar o cliente no agendamento.");
          return;
        }
        if (valNum > clienteSaldo) {
          toast.error(`Saldo de crédito insuficiente para o cliente (Saldo atual: ${fmtBRL(clienteSaldo)}).`);
          return;
        }
      }
      if (valNum > saldo && p.forma_pagamento !== "dinheiro") {
        if (!trabalharCredito || !ag?.cliente_id || !gerarCreditoExcedente) {
          toast.error("Troco permitido apenas para pagamentos em dinheiro.");
          return;
        }
      }
    }

    const isZeroSaldo = saldo <= 0.01;
    let validos = novos.filter((p) => isZeroSaldo ? Number(p.valor) >= 0 : Number(p.valor) > 0);
    
    // A bandeira do cartão não é mais exigida no frontend
    
    if (validos.length === 0) {
      if (novos.length === 1) {
        if (forceSaldo) {
          const valorAutomatico = String(Math.max(0, saldo));
          const novosComSaldo = [{
            ...novos[0],
            valor: valorAutomatico
          }];
          setNovos(novosComSaldo);
          validos = novosComSaldo;
        } else {
          setAutoPayConfirmOpen(true);
          return;
        }
      } else {
        toast.error("Informe ao menos um pagamento");
        return;
      }
    }
    
    const totalInformado = validos.reduce((sum, p) => sum + Number(p.valor), 0);
    const finalizar = totalInformado >= (saldo - 0.01);

    if (finalizar) {
      const semProfs = (ag.itens || []).filter(item => !item.colaborador_id || item.colaborador_id === "none");
      if (semProfs.length > 0) {
        setMissingProfs((ag.itens || []).map(item => ({
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
    }

    await executePayment(ag, forceSaldo, validos);
  };

  const confirmAndFinish = async () => {
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
        cliente_id: ag.cliente_id,
        data_hora: ag.data_hora,
        observacoes: ag.observacoes || "",
        ignorar_conflito: true,
        itens_selecionados: missingProfs.map(x => ({
          servico_id: x.servico_id,
          colaborador_id: x.colaborador_id,
          auxiliar_id: x.auxiliar_id === "none" ? null : x.auxiliar_id,
          valor: x.valor,
          valor_original: x.valor_original
        }))
      };

      await http.put(`/agendamentos/${id}`, updatePayload);
      setProfsDialogOpen(false);
      
      const r = await http.get(`/agendamentos/${id}`);
      setAg(r.data);
      
      toast.success("Profissionais associados com sucesso!");
      await executePayment(r.data);
    } catch (e) {
      toast.error(e.response?.data?.detail || "Erro ao associar profissionais");
    }
  };

  // Abrir modal de edição
  const openEditDialog = (payment) => {
    setEditingPayment({
      ...payment,
      parcelas: payment.cartao_parcelas || payment.parcelas || 1
    });
    setEditFormOpen(true);
  };

  // Confirmar edição com senha
  const handleEditWithPassword = async (password) => {
    if (!editingPayment) return;
    try {
      await http.put(
        `/agendamentos/${id}/pagamentos/${editingPayment.id}`,
        {
          valor: Number(editingPayment.valor),
          forma_pagamento: editingPayment.forma_pagamento,
          observacao: editingPayment.observacao || "",
          parcelas: editingPayment.parcelas || 1,
          password
        }
      );
      toast.success("Pagamento atualizado com sucesso");
      setEditFormOpen(false);
      setEditingPayment(null);
      setPasswordDialogOpen(false);
      load();
    } catch (e) {
      throw new Error(e.response?.data?.detail || "Erro ao atualizar pagamento");
    }
  };

  // Confirmar deleção com senha
  const handleDeleteWithPassword = async (email, password) => {
    if (!pendingAction?.paymentId) return;
    try {
      await http.delete(
        `/agendamentos/${id}/pagamentos/${pendingAction.paymentId}`,
        { data: { email, password } }
      );
      toast.success("Pagamento removido com sucesso");
      setPasswordDialogOpen(false);
      setPendingAction(null);
      load();
    } catch (e) {
      throw new Error(e.response?.data?.detail || "Erro ao remover pagamento");
    }
  };

  const executeDelete = async (paymentId) => {
    try {
      await http.delete(`/agendamentos/${id}/pagamentos/${paymentId}`);
      toast.success("Pagamento removido com sucesso");
      load();
    } catch (e) {
      toast.error(e.response?.data?.detail || "Erro ao remover pagamento");
    }
  };

  const executeEdit = async () => {
    if (!editingPayment) return;
    try {
      await http.put(
        `/agendamentos/${id}/pagamentos/${editingPayment.id}`,
        {
          valor: Number(editingPayment.valor),
          forma_pagamento: editingPayment.forma_pagamento,
          observacao: editingPayment.observacao || "",
          parcelas: editingPayment.parcelas || 1
        }
      );
      toast.success("Pagamento atualizado com sucesso");
      setEditFormOpen(false);
      setEditingPayment(null);
      load();
    } catch (e) {
      toast.error(e.response?.data?.detail || "Erro ao atualizar pagamento");
    }
  };

  // Iniciar processo de edição
  const startEdit = (payment) => {
    if (!temPermissaoPagamento) {
      toast.error("Você não tem permissão para realizar pagamentos.");
      return;
    }
    openEditDialog(payment);
  };

  // Iniciar processo de deleção
  const startDelete = (paymentId) => {
    if (!temPermissaoPagamento) {
      toast.error("Você não tem permissão para realizar pagamentos.");
      return;
    }
    if (ag.status !== 'concluido') {
      executeDelete(paymentId);
    } else {
      setPendingAction({ type: 'delete', paymentId });
      setPasswordDialogOpen(true);
    }
  };

  // Salvar edição (abre dialog de senha)
  const saveEdit = () => {
    if (!temPermissaoPagamento) {
      toast.error("Você não tem permissão para realizar pagamentos.");
      return;
    }
    if (!editingPayment?.valor || Number(editingPayment.valor) <= 0) {
      toast.error("Valor deve ser maior que zero");
      return;
    }
    // Validação de bandeira removida
    if (ag.status !== 'concluido') {
      executeEdit();
    } else {
      setPendingAction({ type: 'edit' });
      setPasswordDialogOpen(true);
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 fade-in max-w-7xl w-full overflow-x-hidden">
      <Button variant="ghost" onClick={() => nav(-1)} className="mb-4"><ArrowLeft className="w-4 h-4 mr-1" /> Voltar</Button>
      <div className="text-xs uppercase tracking-wider text-zinc-400">Pagamento</div>
      <h1 className="font-display text-2xl sm:text-4xl font-semibold tracking-tight mt-1 flex flex-wrap items-center gap-2 sm:gap-3">
        {ag.cliente_nome}
        {ag.numero && (
          <span className="text-xs sm:text-sm font-mono font-bold bg-[#EAF0EE] text-[#3A4F4A] px-2.5 py-1 rounded-full">
            Atendimento {String(ag.numero).padStart(6, "0")} | S
          </span>
        )}
      </h1>
      <div className="text-sm text-zinc-500 mt-1">{fmtDT(ag.data_hora)} · <StatusBadge status={ag.status} /></div>

      {!temPermissaoPagamento && (
        <div className="mt-6 p-4 bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900 rounded-xl flex items-start gap-3 fade-in">
          <AlertCircle className="w-5 h-5 text-rose-600 dark:text-rose-400 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-rose-800 dark:text-rose-300">
            <span className="font-semibold">Acesso Restrito:</span> Você não possui a permissão necessária para realizar pagamentos no sistema.
          </div>
        </div>
      )}

      {/* Grid Responsivo em Duas Colunas */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start mt-4">
        {/* Coluna Esquerda: Listas de Itens e Registrar Pagamento */}
        <div className="lg:col-span-8 space-y-6">
          {/* Serviços Realizados */}
          {ag.itens && Array.isArray(ag.itens) && ag.itens.length > 0 && (
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 sm:p-6 shadow-sm fade-in">
              <h3 className="font-display text-base sm:text-lg font-extrabold text-zinc-850 dark:text-zinc-100 mb-5 flex items-center gap-2">
                <CheckCircle2 className="w-5.5 h-5.5 text-[#84A59D]" />
                Serviços Realizados neste Atendimento
              </h3>
              <div className="space-y-4">
                {ag.itens.map((item, idx) => {
                  const colabNome = getColabName(item.colaborador_id);
                  const auxNome = getColabName(item.auxiliar_id);
                  return (
                    <div key={idx} className="flex items-center justify-between gap-4 pb-4 border-b border-zinc-100 dark:border-zinc-800/60 last:border-0 last:pb-0">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-2 h-2 rounded-full bg-[#84A59D] shrink-0"></div>
                        <div className="min-w-0">
                          <div className="text-base sm:text-lg font-bold text-zinc-800 dark:text-zinc-100 leading-tight">
                            {item.nome || "Serviço"}
                          </div>
                          {(colabNome || auxNome) && (
                            <div className="text-xs sm:text-sm text-zinc-450 dark:text-zinc-500 font-medium mt-1">
                              {colabNome && (
                                <span>
                                  Profissional: <strong className="text-zinc-650 dark:text-zinc-400 font-semibold">{colabNome}</strong>
                                </span>
                              )}
                              {auxNome && (
                                <span>
                                  {" "}· Auxiliar: <strong className="text-zinc-650 dark:text-zinc-400 font-semibold">{auxNome}</strong>
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="text-base sm:text-lg font-black text-zinc-850 dark:text-zinc-200 text-right font-mono shrink-0">
                        {fmtBRL(item.valor)}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Vendas Diretas Pendentes */}
          {pendingSales.length > 0 && (
            <div className="bg-white border border-zinc-200 dark:bg-zinc-900 dark:border-zinc-800 rounded-2xl p-5 sm:p-6 mb-6 fade-in shadow-sm">
              <h3 className="font-display text-base font-semibold text-zinc-850 dark:text-zinc-200 mb-3 flex items-center gap-2">
                <ShoppingCart className="w-5 h-5 text-[#84A59D]" />
                Vendas Diretas Pendentes deste Cliente
              </h3>
              <p className="text-xs text-zinc-500 mb-4">
                Este cliente possui vendas diretas de produtos com pagamento pendente. Você pode selecioná-las para incluir neste pagamento unificado.
              </p>
              <div className="space-y-3">
                {pendingSales.map((s) => (
                  <div 
                    key={s.id} 
                    className={`p-3.5 sm:p-4 rounded-xl border transition-all space-y-3 ${
                      s.selected 
                        ? "bg-zinc-50 dark:bg-zinc-900/40 border-[#84A59D] dark:border-[#84A59D]/60 shadow-sm" 
                        : "bg-white dark:bg-zinc-900/10 border-zinc-200 dark:border-zinc-800 opacity-60"
                    }`}
                  >
                    {/* Cabeçalho da Venda */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <input 
                          type="checkbox" 
                          checked={!!s.selected} 
                          onChange={() => toggleSaleSelection(s.id)}
                          className="w-4 h-4 rounded text-[#84A59D] focus:ring-[#84A59D] border-zinc-300 dark:border-zinc-700 dark:bg-zinc-850 cursor-pointer"
                        />
                        <div className="font-semibold text-sm sm:text-base text-zinc-800 dark:text-zinc-200">
                          Venda #{s.numero_venda ? String(s.numero_venda).padStart(6, "0") : "Direta"}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-sm sm:text-base text-zinc-700 dark:text-zinc-200">
                          {fmtBRL(s.valor_total - s.valor_pago)}
                        </div>
                        <div className="text-[10px] sm:text-xs text-zinc-450 dark:text-zinc-550 mt-0.5">
                          Total: {fmtBRL(s.valor_total)}
                        </div>
                      </div>
                    </div>

                    {/* Itens Detalhados Alinhados */}
                    {s.itens && Array.isArray(s.itens) && s.itens.length > 0 ? (
                      <div className="pt-2.5 border-t border-zinc-100 dark:border-zinc-800/50 pl-7 space-y-2">
                        {s.itens.map((item, idx) => (
                          <div key={idx} className="flex items-center justify-between text-xs sm:text-sm text-zinc-650 dark:text-zinc-300 font-medium">
                            <div className="flex items-center gap-2">
                              <span className="w-1.5 h-1.5 rounded-full bg-zinc-300 dark:bg-zinc-700 flex-shrink-0"></span>
                              <span>{item.produto_nome}</span>
                            </div>
                            <div className="flex items-center gap-4 text-right">
                              <span className="text-zinc-400 dark:text-zinc-500 font-normal">
                                {item.preco_unitario_original !== undefined && item.preco_unitario_original !== item.preco_unitario ? (
                                  <>
                                    {item.quantidade}x <span className="line-through">{fmtBRL(item.preco_unitario_original)}</span> <span className="text-zinc-600 dark:text-zinc-300 font-semibold">{fmtBRL(item.preco_unitario)}</span>
                                  </>
                                ) : (
                                  `${item.quantidade}x ${fmtBRL(item.preco_unitario)}`
                                )}
                              </span>
                              <div className="flex flex-col items-end">
                                <span className="text-zinc-700 dark:text-zinc-200 font-semibold min-w-[70px]">
                                  {fmtBRL(item.subtotal || (item.quantidade * item.preco_unitario))}
                                </span>
                                {item.preco_unitario_original !== undefined && item.preco_unitario_original !== item.preco_unitario && (
                                  <span className="text-[10px] text-rose-600 dark:text-rose-400 font-semibold">
                                    - {fmtBRL((item.preco_unitario_original - item.preco_unitario) * item.quantidade)}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800/50 pl-7 text-xs sm:text-sm text-zinc-500 dark:text-zinc-450 font-medium">
                        {s.produto_nome} ({s.quantidade} {s.quantidade === 1 ? 'item' : 'itens'})
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <div className="mt-4 pt-3 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
                <span className="text-xs font-semibold text-zinc-550">Subtotal das Vendas Diretas:</span>
                <span className="text-sm font-bold text-[#84A59D] dark:text-emerald-400">{fmtBRL(totalSalesSelected)}</span>
              </div>
            </div>
          )}

          {/* Seção de Descontos */}
          {temDescontoAplicado ? (
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-4 sm:p-5 shadow-sm">
              <h3 className="font-display text-sm font-bold mb-3 text-zinc-800 dark:text-zinc-100 flex items-center gap-2">
                🏷️ Desconto Aplicado
              </h3>
              <div className="space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900 rounded-xl p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center text-lg shrink-0">
                      🏷️
                    </div>
                    <div>
                      <div className="text-sm font-bold text-emerald-800 dark:text-emerald-300">
                        {descontoMeta?.codigo || "Desconto aplicado"}
                        <span className="text-xs font-normal ml-1.5 text-emerald-600 dark:text-emerald-400">
                          ({descontoMeta?.tipo === 'porcentagem' 
                            ? `${descontoMeta?.valor_desconto}%` 
                            : fmtBRL(descontoMeta?.valor_desconto)})
                        </span>
                      </div>
                      {descontoMeta?.descricao && (
                        <div className="text-xs text-emerald-700/70 dark:text-emerald-400/70 mt-0.5">{descontoMeta.descricao}</div>
                      )}
                      <div className="text-xs text-emerald-600 dark:text-emerald-400 mt-0.5 space-y-1">
                        <div>Total descontado: <strong>{fmtBRL(totalDescontoGeral)}</strong></div>
                        {totalDescontoServicos > 0 && (
                          <div>• Nos serviços: <strong>{fmtBRL(totalDescontoServicos)}</strong></div>
                        )}
                        {totalDescontoProdutos > 0 && (
                          <div>• Nos produtos: <strong>{fmtBRL(totalDescontoProdutos)}</strong></div>
                        )}
                        {descontoMeta?.incide_comissao === false && (
                          <div className="pt-0.5">
                            <span className="text-[10px] bg-emerald-200 dark:bg-emerald-800 text-emerald-700 dark:text-emerald-300 px-1.5 py-0.5 rounded-full">Não incide na comissão</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  {ag.pagamentos?.length === 0 && (
                    <Button 
                      variant="destructive" 
                      size="sm" 
                      onClick={handleRemoveDesconto}
                      disabled={loadingDesconto}
                      className="shrink-0"
                    >
                      {loadingDesconto ? "Processando..." : "Remover"}
                    </Button>
                  )}
                </div>
                
                {/* Detalhamento por serviço */}
                <div className="border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-zinc-50 dark:bg-zinc-900 text-xs uppercase text-zinc-500 dark:text-zinc-400">
                      <tr>
                        <th className="px-4 py-2 text-left">Serviço</th>
                        <th className="px-4 py-2 text-right">Original</th>
                        <th className="px-4 py-2 text-right">Desconto</th>
                        <th className="px-4 py-2 text-right">Final</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                      {ag.itens?.map((item, i) => (
                        <tr key={i} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-800/30">
                          <td className="px-4 py-2 font-medium text-zinc-800 dark:text-zinc-200">{item.nome || "Serviço"}</td>
                          <td className="px-4 py-2 text-right text-zinc-500 dark:text-zinc-400">
                            {item.valor_original !== undefined && item.valor_original !== item.valor
                              ? <span className="line-through">{fmtBRL(item.valor_original)}</span>
                              : fmtBRL(item.valor)}
                          </td>
                          <td className="px-4 py-2 text-right text-rose-600 dark:text-rose-400 font-semibold">
                            {item.valor_original !== undefined && item.valor_original !== item.valor
                              ? `- ${fmtBRL(item.valor_original - item.valor)}` 
                              : "—"}
                          </td>
                          <td className="px-4 py-2 text-right font-bold text-zinc-900 dark:text-zinc-100">{fmtBRL(item.valor)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Detalhamento por produto */}
                {pendingSales.filter(s => s.selected).some(s => s.desconto_aplicado) && (
                  <div className="border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden mt-3">
                    <table className="w-full text-sm">
                      <thead className="bg-zinc-50 dark:bg-zinc-900 text-xs uppercase text-zinc-500 dark:text-zinc-400">
                        <tr>
                          <th className="px-4 py-2 text-left">Produto</th>
                          <th className="px-4 py-2 text-right">Original</th>
                          <th className="px-4 py-2 text-right">Desconto</th>
                          <th className="px-4 py-2 text-right">Final</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                        {pendingSales
                          .filter(s => s.selected && s.desconto_aplicado)
                          .flatMap(s => s.itens || [])
                          .filter(item => item.preco_unitario_original !== undefined && item.preco_unitario_original !== item.preco_unitario)
                          .map((item, i) => (
                            <tr key={i} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-800/30">
                              <td className="px-4 py-2 font-medium text-zinc-800 dark:text-zinc-200">{item.produto_nome || "Produto"}</td>
                              <td className="px-4 py-2 text-right text-zinc-500 dark:text-zinc-400">
                                {fmtBRL(item.preco_unitario_original * item.quantidade)}
                              </td>
                              <td className="px-4 py-2 text-right text-rose-600 dark:text-rose-400 font-semibold">
                                {`- ${fmtBRL((item.preco_unitario_original - item.preco_unitario) * item.quantidade)}`}
                              </td>
                              <td className="px-4 py-2 text-right font-bold text-zinc-900 dark:text-zinc-100">{fmtBRL(item.subtotal)}</td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 sm:p-6 shadow-sm">
              <h3 className="font-display text-base font-bold mb-3 text-zinc-800 dark:text-zinc-100 flex items-center gap-2">
                🏷️ Desconto
              </h3>
              {ag.pagamentos?.length === 0 ? (
                <div className="space-y-2">
                  <Label className="text-xs text-zinc-500">Selecione um desconto para aplicar a este agendamento:</Label>
                  <div className="flex gap-2">
                    <Select onValueChange={handleSelectDesconto} disabled={loadingDesconto}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Selecione um desconto..." />
                      </SelectTrigger>
                      <SelectContent>
                        {descontos.filter(isDescontoAplicavel).map(d => (
                          <SelectItem key={d.id} value={d.id}>
                            {d.codigo} - {d.descricao || ""} ({d.tipo === 'porcentagem' ? `${d.valor}%` : fmtBRL(d.valor)}) {d.requer_autorizacao ? "🔒" : ""}
                          </SelectItem>
                        ))}
                        {descontos.filter(isDescontoAplicavel).length === 0 && (
                          <SelectItem disabled value="none">Nenhum desconto disponível</SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              ) : (
                <div className="p-3 bg-amber-50/50 dark:bg-amber-950/10 border border-amber-200/60 dark:border-amber-900/40 rounded-xl">
                  <p className="text-xs text-amber-700 dark:text-amber-400 font-medium">
                    ⚠️ Não é possível aplicar descontos em atendimentos que já possuem pagamentos registrados.
                  </p>
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-1">
                    Para aplicar um desconto, exclua os pagamentos anteriores na seção de <strong>"Pagamentos Anteriores"</strong> primeiro.
                  </p>
                </div>
              )}
            </div>
          )}
          <div className="bg-white border border-zinc-200 dark:bg-zinc-900 dark:border-zinc-800 rounded-xl p-4 sm:p-6">
            <h3 className="font-display text-base sm:text-lg font-medium text-zinc-800 dark:text-zinc-100 mb-4">Registrar Pagamento</h3>
            <div className="space-y-4">
              {novos.map((p, i) => {
                const formaEhCredito = isCredito(p.forma_pagamento);
                const hasBrands = hasBrandRates(p.forma_pagamento);
                
                let valorSpan = "col-span-3";
                let formaSpan = "col-span-4";
                let bandeiraSpan = "";
                let parcelasSpan = "";
                let obsSpan = "col-span-4";

                if (hasBrands && formaEhCredito) {
                  valorSpan = "col-span-2";
                  formaSpan = "col-span-3";
                  bandeiraSpan = "col-span-2";
                  parcelasSpan = "col-span-1";
                  obsSpan = "col-span-3";
                } else if (hasBrands && !formaEhCredito) {
                  valorSpan = "col-span-2";
                  formaSpan = "col-span-3";
                  bandeiraSpan = "col-span-2";
                  obsSpan = "col-span-4";
                } else if (!hasBrands && formaEhCredito) {
                  valorSpan = "col-span-2";
                  formaSpan = "col-span-3";
                  parcelasSpan = "col-span-2";
                  obsSpan = "col-span-4";
                }

                return (
                  <div key={i} className="border border-zinc-150 sm:border-0 rounded-xl p-4 sm:p-0 bg-zinc-50/50 sm:bg-transparent dark:bg-zinc-955/20 space-y-3 sm:space-y-0 sm:grid sm:grid-cols-12 sm:gap-2 sm:items-end relative">
                    {novos.length > 1 && (
                      <div className="sm:hidden absolute top-2 right-2">
                        <Button size="icon" variant="ghost" className="h-8 w-8 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/20" onClick={() => removeLine(i)} disabled={!temPermissaoPagamento}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    )}
                    <div className={valorSpan}>
                      <Label className="text-xs sm:text-sm text-zinc-650 dark:text-zinc-400">Valor *</Label>
                      <Input 
                        data-testid={`pay-valor-${i}`} 
                        type="number" 
                        step="0.01" 
                        value={p.valor} 
                        onChange={(e) => updateLine(i, "valor", e.target.value)}
                        placeholder="0.00"
                        className="bg-white dark:bg-zinc-900 sm:bg-transparent mt-1 h-9 text-sm focus:ring-[#84A59D]"
                        disabled={!temPermissaoPagamento}
                      />
                    </div>
                    <div className={formaSpan}>
                      <Label className="text-xs sm:text-sm text-zinc-650 dark:text-zinc-400">Forma *</Label>
                      <Select value={p.forma_pagamento} onValueChange={(v) => {
                        updateLine(i, "forma_pagamento", v);
                      }} disabled={!temPermissaoPagamento}>
                        <SelectTrigger data-testid={`pay-forma-${i}`} className="bg-white dark:bg-zinc-900 sm:bg-transparent mt-1 h-9 text-xs" disabled={!temPermissaoPagamento}><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {(trabalharCredito && ag?.cliente_id 
                            ? [...getFormasDisponiveis(), { v: "credito_cliente", l: `Crédito do Cliente (Saldo: ${fmtBRL(clienteSaldo)})` }]
                            : getFormasDisponiveis()).map((f) => <SelectItem key={f.v} value={f.v} className="text-xs">{f.l}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>



                    {formaEhCredito && (
                      <div className={parcelasSpan}>
                        <Label className="text-xs sm:text-sm text-zinc-650 dark:text-zinc-400">Parcelas</Label>
                        <Select value={String(hasAdquirenteRates() ? (p.parcelas || 1) : 1)} onValueChange={(v) => updateLine(i, "parcelas", parseInt(v) || 1)} disabled={!temPermissaoPagamento || !hasAdquirenteRates()}>
                          <SelectTrigger className="bg-white dark:bg-zinc-900 sm:bg-transparent mt-1 h-9 text-xs" disabled={!temPermissaoPagamento || !hasAdquirenteRates()}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {getParcelasDisponiveis().map((num) => (
                              <SelectItem key={num} value={String(num)} className="text-xs">{num}x</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}

                    <div className={obsSpan}>
                      <Label className="text-xs sm:text-sm text-zinc-650 dark:text-zinc-400">Observação</Label>
                      <Input 
                        value={p.observacao} 
                        onChange={(e) => updateLine(i, "observacao", e.target.value)}
                        placeholder="Observações adicionais"
                        className="bg-white dark:bg-zinc-900 sm:bg-transparent mt-1 h-9 text-xs focus:ring-[#84A59D]"
                        disabled={!temPermissaoPagamento}
                      />
                    </div>
                    <div className="hidden sm:block col-span-1 text-center">
                      {novos.length > 1 && (
                        <Button size="icon" variant="ghost" onClick={() => removeLine(i)} disabled={!temPermissaoPagamento}>
                          <Trash2 className="w-4 h-4 text-rose-500" />
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
            
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 mt-6">
              <Button variant="outline" size="sm" onClick={addLine} className="justify-center h-9 text-xs" disabled={!temPermissaoPagamento}><Plus className="w-3 h-3 mr-1" /> Adicionar forma</Button>
              <Button data-testid="pay-finish-btn" onClick={() => submit()} className="bg-[#84A59D] hover:bg-[#6F9189] justify-center text-white h-9 text-xs font-semibold" disabled={!temPermissaoPagamento || (valorTotal > 0.01 && saldo <= 0.01)}><CheckCircle2 className="w-4 h-4 mr-1" /> Registrar e Finalizar</Button>
            </div>
          </div>
        </div>

        {/* Coluna Direita (Sticky Sidebar): Resumo Financeiro Dinâmico, Consolidado e Pagamentos Anteriores */}
        <div className="lg:col-span-4 space-y-6 lg:sticky lg:top-8">
          {/* Saldo de Crédito do Cliente */}
          {trabalharCredito && ag?.cliente_id && (
            <div className="bg-gradient-to-br from-emerald-50 to-white dark:from-emerald-950/20 dark:to-zinc-900 border border-emerald-200 dark:border-emerald-800/60 rounded-2xl p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400 block">💳 Crédito Disponível</span>
                  <span className="text-[11px] text-emerald-600/70 dark:text-emerald-500/70 mt-0.5 block font-medium">Saldo de crédito do cliente</span>
                </div>
                <div className="text-right">
                  <span className={`text-xl font-black font-mono tracking-tight ${clienteSaldo > 0 ? "text-emerald-600 dark:text-emerald-400" : "text-zinc-400 dark:text-zinc-500"}`}>
                    {fmtBRL(clienteSaldo)}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Card Resumo Financeiro */}
          <div className="bg-white border border-zinc-200 dark:bg-zinc-900 dark:border-zinc-800 rounded-2xl p-5 shadow-sm border-t-4 border-t-[#84A59D]">
            <h3 className="font-display text-sm font-bold text-zinc-850 dark:text-zinc-100 mb-4 flex items-center gap-1.5">
              📊 Resumo Financeiro
            </h3>
            <div className="space-y-4">
              {/* Detalhes de composição (se houver vendas diretas ou descontos) */}
              {(totalSalesSelected > 0 || temDescontoAplicado) && (
                <div className="bg-zinc-50/50 dark:bg-zinc-950/30 border border-zinc-150 dark:border-zinc-800/80 rounded-xl p-3.5 space-y-2 text-xs">
                  <div className="flex justify-between items-center text-zinc-555 dark:text-zinc-400">
                    <span>Serviços Realizados</span>
                    <span className="font-mono font-medium">{fmtBRL(valorServicosOriginal)}</span>
                  </div>
                  
                  {valorProdutosOriginal > 0 && (
                    <div className="flex justify-between items-center text-zinc-555 dark:text-zinc-400">
                      <span>Vendas Diretas Selecionadas</span>
                      <span className="font-mono font-medium">{fmtBRL(valorProdutosOriginal)}</span>
                    </div>
                  )}
                  
                  {totalDescontoGeral > 0 && (
                    <div className="flex justify-between items-center text-rose-500 font-medium">
                      <span>Desconto Aplicado</span>
                      <span className="font-mono font-bold">- {fmtBRL(totalDescontoGeral)}</span>
                    </div>
                  )}
                </div>
              )}

              {/* Destaque 1: Valor a Pagar (Saldo Devido da Operação) */}
              <div className="bg-[#EAF0EE] dark:bg-[#1E2D2A] border border-[#C2D3CE] dark:border-[#334E47] p-4 rounded-xl flex items-center justify-between shadow-xs">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#3A4F4A] dark:text-[#84A59D] block">Valor a Pagar</span>
                  <span className="text-[11px] text-[#4A645F] dark:text-[#678B81] mt-0.5 block font-medium">Total devido da operação</span>
                </div>
                <div className="text-right">
                  <span className="text-2xl font-black text-[#2D3E3A] dark:text-[#EAF0EE] font-mono tracking-tight">{fmtBRL(saldo)}</span>
                </div>
              </div>

              {/* Destaque 2: Valor Pago / Digitado (Atual) */}
              <div className="bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 p-4 rounded-xl flex items-center justify-between shadow-xs">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 block">Valor Digitado</span>
                  <span className="text-[11px] text-zinc-400 dark:text-zinc-500 mt-0.5 block font-medium">Soma das formas de pagamento</span>
                </div>
                <div className="text-right flex flex-col items-end">
                  <span className="text-2xl font-black text-zinc-800 dark:text-zinc-200 font-mono tracking-tight">{fmtBRL(totalInformado)}</span>
                </div>
              </div>

              {/* Destaque 3: Troco a Devolver */}
              {trocoTotal > 0 && (
                <div className="bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900 p-4 rounded-xl flex items-center justify-between shadow-xs animate-pulse">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-450 block">Troco a Devolver</span>
                    <span className="text-[11px] text-emerald-600 dark:text-emerald-500 mt-0.5 block font-medium">Entregar ao cliente em dinheiro</span>
                  </div>
                  <div className="text-right">
                    <span className="text-2xl font-black text-emerald-600 dark:text-emerald-455 font-mono tracking-tight">{fmtBRL(trocoTotal)}</span>
                  </div>
                </div>
              )}

              {/* Opção de gerar crédito se houver excedente */}
              {excessoTotal > 0 && trabalharCredito && ag?.cliente_id && (
                <div className="bg-emerald-50/30 dark:bg-emerald-950/10 border border-emerald-200/50 dark:border-emerald-900/40 p-4 rounded-xl space-y-3 shadow-xs">
                  <div className="flex items-center justify-between gap-4">
                    <div className="space-y-1">
                      <Label htmlFor="gerar-credito-switch" className="text-sm font-bold text-zinc-900 dark:text-zinc-100 cursor-pointer">
                        Gerar crédito para o cliente
                      </Label>
                      <p className="text-[11px] text-zinc-555 dark:text-zinc-400 leading-normal">
                        Deseja converter o valor excedente de {fmtBRL(excessoTotal)} em saldo de crédito para o cliente?
                      </p>
                    </div>
                    <Switch
                      id="gerar-credito-switch"
                      checked={gerarCreditoExcedente}
                      onCheckedChange={(checked) => {
                        setGerarCreditoExcedente(checked);
                      }}
                      className="bg-zinc-200 dark:bg-zinc-800"
                    />
                  </div>
                </div>
              )}

              {excessoTotal > 0 && !gerarCreditoExcedente && novos.some(p => p.forma_pagamento !== "dinheiro") && (
                <div className="bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/60 p-4 rounded-xl flex items-start gap-2.5 shadow-xs">
                  <AlertCircle className="w-4.5 h-4.5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
                  <div className="text-[11px] text-rose-800 dark:text-rose-355 leading-normal">
                    <strong>Atenção:</strong> Pagamentos em PIX/Cartão não permitem troco físico. Ative a conversão de crédito ou informe o valor exato.
                  </div>
                </div>
              )}

              {/* Destaque 4: Saldo Restante */}
              <div className={`p-4 rounded-xl border flex items-center justify-between transition-all shadow-xs ${
                (saldo - (totalInformado - trocoTotal)) > 0.01 
                  ? "bg-amber-50/50 dark:bg-amber-950/10 border-amber-200 dark:border-amber-900/40 text-amber-700 dark:text-amber-455" 
                  : "bg-emerald-55/10 dark:bg-emerald-950/10 border-emerald-200 dark:border-emerald-900/40 text-emerald-800 dark:text-emerald-400"
              }`}>
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider block">Saldo Restante</span>
                  <span className="text-[11px] opacity-80 mt-0.5 block font-medium">
                    {(saldo - (totalInformado - trocoTotal)) > 0.01 ? "Aguardando pagamento" : "Totalmente quitado"}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-2xl font-black font-mono tracking-tight">
                    {fmtBRL(Math.max(0, Number((saldo - (totalInformado - trocoTotal)).toFixed(2))))}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Resumo por Forma de Pagamento */}
          {getConsolidadoPorForma().length > 0 && (
            <div className="bg-white border border-zinc-200 dark:bg-zinc-900 dark:border-zinc-800 rounded-2xl p-4 sm:p-5 shadow-sm">
              <h3 className="font-display text-xs font-bold text-zinc-850 dark:text-zinc-100 mb-3 flex items-center gap-1.5">
                💳 Resumo por Forma de Pagamento
              </h3>
              <div className="space-y-1.5">
                {getConsolidadoPorForma().map((x) => (
                  <div key={x.forma} className="flex justify-between items-center text-xs p-2 bg-zinc-50 dark:bg-zinc-950/40 rounded-lg border border-zinc-100 dark:border-zinc-850">
                    <span className="text-zinc-500 font-medium capitalize">{x.label}</span>
                    <span className="font-bold text-zinc-800 dark:text-zinc-200 font-mono">{fmtBRL(x.total)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Pagamentos Anteriores */}
          <div className="bg-white border border-zinc-200 dark:bg-zinc-900 dark:border-zinc-800 rounded-2xl p-4 sm:p-5 shadow-sm">
            <h3 className="font-display text-xs font-bold text-zinc-850 dark:text-zinc-100 mb-3 flex items-center gap-1.5">
              💰 Pagamentos Anteriores
            </h3>
            {ag.pagamentos.length === 0 ? (
              <div className="text-center text-xs text-zinc-400 py-4 italic">Nenhum pagamento registrado</div>
            ) : (
              <div className="space-y-3">
                {ag.pagamentos.map((p) => (
                  <div key={p.id} className="p-3 bg-zinc-50 dark:bg-zinc-950/40 rounded-xl border border-zinc-150 dark:border-zinc-850 flex flex-col gap-1.5 text-xs">
                    <div className="flex justify-between items-center w-full">
                      <span className="font-semibold text-zinc-700 dark:text-zinc-350 capitalize flex items-center gap-1.5">
                        {getFormaPagamentoLabel(p.forma_pagamento)}
                        {p.cartao_bandeira && (
                          <span className="text-[10px] bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 px-1.5 py-0.5 rounded-full font-bold uppercase">
                            {p.cartao_bandeira}
                          </span>
                        )}
                        {p.cartao_tipo === 'credito' && p.cartao_parcelas && (
                          <span className="text-[10px] bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 px-1.5 py-0.5 rounded-full font-medium">
                            {p.cartao_parcelas}x
                          </span>
                        )}
                      </span>
                      <span className="font-mono font-bold text-zinc-800 dark:text-zinc-250">{fmtBRL(p.valor)}</span>
                    </div>
                    {(Number(p.troco) > 0 || (p.valor_recebido !== undefined && Number(p.valor_recebido) !== Number(p.valor))) && (
                      <div className="flex justify-between items-center text-[10px] text-zinc-550 dark:text-zinc-400">
                        <span>
                          Bruto: {fmtBRL(p.valor_recebido || p.valor)}
                          {Number(p.troco) > 0 && ` · Troco: ${fmtBRL(p.troco)}`}
                        </span>
                        <span>Líquido: {fmtBRL(p.valor)}</span>
                      </div>
                    )}
                    {p.observacao && <span className="text-[10px] text-zinc-500 dark:text-zinc-400 italic">"{p.observacao}"</span>}
                    <div className="flex items-center justify-between mt-1 pt-1.5 border-t border-zinc-100/50 dark:border-zinc-800/60">
                      <span className="text-[9px] text-zinc-400">{fmtDT(p.data_hora)}</span>
                      <Button size="icon" variant="ghost" className="h-6 w-6 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/20" onClick={() => startDelete(p.id)}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Dialog de edição de pagamento */}
      <Dialog open={editFormOpen} onOpenChange={setEditFormOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Editar pagamento</DialogTitle>
          </DialogHeader>
          {editingPayment && (
            <div className="space-y-4">
              <div>
                <Label>Valor</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={editingPayment.valor}
                  onChange={(e) => setEditingPayment({ ...editingPayment, valor: e.target.value })}
                />
              </div>
              <div>
                <Label>Forma de pagamento</Label>
                <Select value={editingPayment.forma_pagamento} onValueChange={(v) => {
                  const newEditPay = { ...editingPayment, forma_pagamento: v };
                  if (!isCredito(v)) {
                    newEditPay.parcelas = 1;
                  } else if (!hasAdquirenteRates()) {
                    newEditPay.parcelas = 1;
                  }
                  setEditingPayment(newEditPay);
                }}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {(trabalharCredito && ag?.cliente_id 
                      ? [...getFormasDisponiveis(), { v: "credito_cliente", l: `Crédito do Cliente (Saldo: ${fmtBRL(clienteSaldo)})` }]
                      : getFormasDisponiveis()).map((f) => <SelectItem key={f.v} value={f.v}>{f.l}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              {isCredito(editingPayment.forma_pagamento) && (
                <div>
                  <Label>Parcelas</Label>
                  <Select value={String(hasAdquirenteRates() ? (editingPayment.parcelas || 1) : 1)} onValueChange={(v) => setEditingPayment({ ...editingPayment, parcelas: parseInt(v) || 1 })} disabled={!hasAdquirenteRates()}>
                    <SelectTrigger disabled={!hasAdquirenteRates()}><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {getParcelasDisponiveis().map((num) => (
                        <SelectItem key={num} value={String(num)}>{num}x</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div>
                <Label>Observação</Label>
                <Input
                  value={editingPayment.observacao}
                  onChange={(e) => setEditingPayment({ ...editingPayment, observacao: e.target.value })}
                  placeholder="Ex: Troco: R$ 50,00"
                />
              </div>
            </div>
          )}
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setEditFormOpen(false)}>Cancelar</Button>
            <Button onClick={saveEdit} className="bg-[#84A59D] hover:bg-[#6F9189]">Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de confirmação de senha */}
      <PasswordConfirmDialog
        open={passwordDialogOpen}
        onOpenChange={setPasswordDialogOpen}
        onConfirm={pendingAction?.type === 'delete' ? handleDeleteWithPassword : handleEditWithPassword}
        title={pendingAction?.type === 'delete' ? "Confirmar exclusão" : "Confirmar edição"}
        description={pendingAction?.type === 'delete' ? "Informe usuário e senha do administrador/gerente com permissão para remover este pagamento" : "Digite sua senha para atualizar este pagamento"}
        requireCredentials={pendingAction?.type === 'delete'}
      />

      {/* Dialog para informar profissionais ausentes */}
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
              Para finalizar este atendimento e calcular as comissões corretamente, selecione quem realizou cada um dos serviços abaixo:
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
            <Button onClick={confirmAndFinish} className="bg-[#84A59D] hover:bg-[#6F9189]">
              Confirmar e Finalizar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de confirmação de pagamento automático */}
      <Dialog open={autoPayConfirmOpen} onOpenChange={setAutoPayConfirmOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Confirmar Pagamento Integral</DialogTitle>
          </DialogHeader>
          <div className="py-4 text-sm text-zinc-600 dark:text-zinc-400">
            Confirma o recebimento do valor total de <b>{fmtBRL(saldo)}</b> em <b>{getFormaPagamentoLabel(novos[0]?.forma_pagamento).toUpperCase()}</b>?
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setAutoPayConfirmOpen(false)}>Não</Button>
            <Button onClick={async () => {
              setAutoPayConfirmOpen(false);
              await submit(true);
            }} className="bg-[#84A59D] hover:bg-[#6F9189] text-white">Sim</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={autorizarDialogOpen} onOpenChange={(open) => { setAutorizarDialogOpen(open); if (!open) { setDescontoId(""); setAuthEmail(""); setAuthPassword(""); } }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Autorização de Desconto Restrito</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-xs text-zinc-500">Este desconto exige autorização de um usuário com permissões administrativas ou previamente autorizado.</p>
            <div>
              <Label htmlFor="secure-auth-email">Usuário (E-mail)</Label>
              <Input
                id="secure-auth-email"
                name="secure-auth-email"
                type="email"
                value={authEmail}
                onChange={(e) => setAuthEmail(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && authEmail?.trim() && authPassword?.trim() && !loadingDesconto && applyDiscountOnBackend(descontoId, { email: authEmail, password: authPassword })}
                placeholder="email@exemplo.com"
                autoComplete="nope"
              />
            </div>
            <div>
              <Label htmlFor="secure-auth-password">Senha</Label>
              <Input
                id="secure-auth-password"
                name="secure-auth-password"
                type="password"
                value={authPassword}
                onChange={(e) => setAuthPassword(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && authEmail?.trim() && authPassword?.trim() && !loadingDesconto && applyDiscountOnBackend(descontoId, { email: authEmail, password: authPassword })}
                placeholder="******"
                autoComplete="new-password"
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => { setAutorizarDialogOpen(false); setDescontoId(""); }} disabled={loadingDesconto}>Cancelar</Button>
            <Button 
              onClick={() => applyDiscountOnBackend(descontoId, { email: authEmail, password: authPassword })} 
              className="bg-[#84A59D] hover:bg-[#6F9189]"
              disabled={loadingDesconto || !authEmail?.trim() || !authPassword?.trim()}
            >
              {loadingDesconto ? "Autorizando..." : "Autorizar & Aplicar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de confirmação de finalização de pagamento/atendimento */}
      <Dialog open={finalizarConfirmOpen} onOpenChange={setFinalizarConfirmOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display text-lg font-bold flex items-center gap-2 text-zinc-800 dark:text-zinc-100">
              <CheckCircle2 className="w-6 h-6 text-[#84A59D]" />
              Confirmar Conclusão
            </DialogTitle>
          </DialogHeader>
          <div className="py-4 text-sm text-zinc-650 dark:text-zinc-300 font-medium">
            O valor total foi recebido. Deseja finalizar o pagamento e concluir a venda/atendimento?
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setFinalizarConfirmOpen(false)}>Cancelar</Button>
            <Button onClick={async () => {
              setFinalizarConfirmOpen(false);
              await executePayment(pendingAgToFinish, true);
            }} className="bg-[#84A59D] hover:bg-[#6F9189] text-white">
              Confirmar e Concluir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* Dialog de confirmação de troco ou crédito */}
      <Dialog open={trocoConfirmOpen} onOpenChange={setTrocoConfirmOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            {trocoConfirmData?.isCredit ? (
              <DialogTitle className="font-display text-lg font-bold flex items-center gap-2 text-emerald-600 dark:text-emerald-500">
                <TrendingUp className="w-6 h-6 text-emerald-500" />
                Confirmar Geração de Crédito
              </DialogTitle>
            ) : (
              <DialogTitle className="font-display text-lg font-bold flex items-center gap-2 text-amber-600 dark:text-amber-500">
                <AlertTriangle className="w-6 h-6 text-amber-500" />
                Finalização de Pagamento
              </DialogTitle>
            )}
          </DialogHeader>
          <div className="py-4 text-sm text-zinc-650 dark:text-zinc-300 space-y-3">
            {trocoConfirmData?.isCredit ? (
              <p className="font-medium text-zinc-900 dark:text-zinc-50">
                Será gerado um crédito de <span className="text-emerald-600 dark:text-emerald-500 font-bold">{fmtBRL(trocoConfirmData?.excessoTotal)}</span> para o cliente, que ficará disponível para utilização em futuras compras ou serviços.
              </p>
            ) : (
              <p className="font-medium text-zinc-900 dark:text-zinc-50">
                {trocoConfirmData?.excessoTotal > 200 || trocoConfirmData?.excessoTotal > saldo ? (
                  <>O troco calculado de <span className="text-amber-600 dark:text-amber-500 font-bold">{fmtBRL(trocoConfirmData?.excessoTotal)}</span> é muito alto.</>
                ) : (
                  <>O troco calculado para devolução é de <span className="text-amber-600 dark:text-amber-500 font-bold">{fmtBRL(trocoConfirmData?.excessoTotal)}</span>.</>
                )}
              </p>
            )}
            <div className="bg-zinc-50 dark:bg-zinc-900 p-3 rounded-lg text-xs space-y-1 border border-zinc-150 dark:border-zinc-800">
              <div>Valor recebido (bruto): <b>{fmtBRL(trocoConfirmData?.totalInformado)}</b></div>
              <div>Saldo devido: <b>{fmtBRL(saldo)}</b></div>
            </div>
            {trocoConfirmData?.isCredit ? (
              <p>Deseja prosseguir com o registro do pagamento e geração do crédito?</p>
            ) : (
              <p>Deseja prosseguir com o registro do pagamento e entrega do troco?</p>
            )}
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setTrocoConfirmOpen(false)}>Cancelar</Button>
            <Button onClick={async () => {
              setTrocoConfirmOpen(false);
              await executePayment(trocoConfirmData?.customAg, true, trocoConfirmData?.customValidos, true);
            }} className="bg-[#84A59D] hover:bg-[#6F9189] text-white font-bold">
              {trocoConfirmData?.isCredit ? "Confirmar e Gerar Crédito" : "Confirmar e Entregar Troco"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
