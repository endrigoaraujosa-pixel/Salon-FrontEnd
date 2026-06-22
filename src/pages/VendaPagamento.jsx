import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import http from "../api";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "../components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "../components/ui/dialog";
import { ArrowLeft, Plus, Trash2, CheckCircle2, Edit2, AlertCircle, AlertTriangle, TrendingUp } from "lucide-react";
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

export default function VendaPagamento() {
  const { id } = useParams();
  const nav = useNavigate();
  const { user } = useAuth();
  const temPermissaoPagamento = user?.role === "admin" || !!user?.perfil?.permissoes?.acoes?.realizar_pagamento;
  const [v, setV] = useState(null);
  const [novos, setNovos] = useState([{ valor: "", forma_pagamento: "dinheiro", observacao: "" }]);
  
  // Estados para edição de pagamento
  const [editingPayment, setEditingPayment] = useState(null);
  const [editFormOpen, setEditFormOpen] = useState(false);
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState(null);
  const [autoPayConfirmOpen, setAutoPayConfirmOpen] = useState(false);
  const [finalizarConfirmOpen, setFinalizarConfirmOpen] = useState(false);
  const [trocoConfirmOpen, setTrocoConfirmOpen] = useState(false);
  const [trocoConfirmData, setTrocoConfirmData] = useState(null);

  // Novos estados para Descontos
  const [descontos, setDescontos] = useState([]);
  const [trabalharCredito, setTrabalharCredito] = useState(false);
  const [clienteSaldo, setClienteSaldo] = useState(0);
  const [gerarCreditoExcedente, setGerarCreditoExcedente] = useState(false);
  const [descontoId, setDescontoId] = useState("");
  const [autorizarDialogOpen, setAutorizarDialogOpen] = useState(false);
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [loadingDesconto, setLoadingDesconto] = useState(false);

  const load = () => {
    http.get(`/vendas-diretas/${id}`).then((r) => {
      setV(r.data);
      if (r.data.cliente_id) {
        http.get(`/clientes/${r.data.cliente_id}`)
          .then(cRes => setClienteSaldo(Number(cRes.data.saldo_credito || 0)))
          .catch(() => {});
      }
    });
  };
  useEffect(() => { 
    load(); 
    http.get("/descontos")
      .then(r => setDescontos(r.data.filter(d => d.ativo)))
      .catch(() => {});
    http.get("/configuracoes/sistema").then((r) => {
      if (r.data) {
        setTrabalharCredito(!!r.data.trabalhar_credito_cliente);
      }
    }).catch(() => { });
  }, [id]);

  useEffect(() => {
    if (autorizarDialogOpen) {
      setAuthEmail("");
      setAuthPassword("");
    }
  }, [autorizarDialogOpen]);

  if (!v) return <div className="p-8 text-zinc-400 font-medium">Carregando...</div>;
  
  const saldo = (v.valor_total || 0) - (v.total_pago || 0);
  const pagamentos = v.pagamentos || [];

  let descontoMeta = v?.desconto_aplicado;
  if (typeof descontoMeta === 'string') {
    try {
      descontoMeta = JSON.parse(descontoMeta);
    } catch (e) {}
  }
  const temDescontoAplicado = !!descontoMeta;
  const valorOriginalVenda = temDescontoAplicado ? (v.valor_total + (descontoMeta?.total_descontado || 0)) : v.valor_total;

  const getConsolidadoPorForma = () => {
    const totalPorForma = {};
    (v.pagamentos || []).forEach(p => {
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
      label: FORMAS.find(f => f.v === forma)?.l || forma,
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

    if (!vinculados || ((!vinculados.services || vinculados.services.length === 0) && (!vinculados.products || vinculados.products.length === 0))) {
      return true;
    }

    const itensVenda = Array.isArray(v.itens) && v.itens.length > 0 ? v.itens : [];
    if (itensVenda.length === 0 && v.produto_id) {
      itensVenda.push({ produto_id: v.produto_id });
    }

    return itensVenda.some(item => vinculados.products?.includes(item.produto_id));
  };

  const applyDiscountOnBackend = async (dId, authData = null) => {
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

      await http.post(`/vendas-diretas/${id}/aplicar-desconto`, { descontoId: dId });
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
      toast.error("Este desconto não é válido para os produtos desta venda.");
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
  
  const totalInformado = novos.filter((p) => Number(p.valor) > 0).reduce((sum, p) => sum + Number(p.valor), 0);
  const excessoTotal = totalInformado > saldo ? Number((totalInformado - saldo).toFixed(2)) : 0;
  const trocoTotal = !gerarCreditoExcedente && totalInformado > saldo && novos.some(p => p.forma_pagamento === "dinheiro") ? totalInformado - saldo : 0;

  const addLine = () => setNovos([...novos, { valor: "", forma_pagamento: "dinheiro", observacao: "" }]);
  const removeLine = (i) => setNovos(novos.filter((_, x) => x !== i));
  
  const updateLine = (i, k, val) => {
    if (k === "valor") {
      const valNum = parseFloat(val) || 0;
      if (valNum > saldo && novos[i].forma_pagamento !== "dinheiro") {
        if (!trabalharCredito || !v?.cliente_id) {
          toast.error("Troco permitido apenas para pagamentos em dinheiro.");
          return;
        }
      }
    }

    if (k === "forma_pagamento" && val !== "dinheiro") {
      const valNum = parseFloat(novos[i].valor) || 0;
      if (valNum > saldo) {
        if (!trabalharCredito || !v?.cliente_id) {
          toast.error("Troco permitido apenas para pagamentos em dinheiro.");
          setNovos(novos.map((p, x) => x === i ? { 
            ...p, 
            forma_pagamento: val,
            valor: "",
            observacao: ""
          } : p));
          return;
        }
      }
    }

    let trocoCalculado = 0;
    let observacaoTroco = "";
    
    if (k === "valor" && novos[i].forma_pagamento === "dinheiro") {
      const valorPago = parseFloat(val) || 0;
      if (valorPago > saldo) {
        trocoCalculado = valorPago - saldo;
        observacaoTroco = `Troco: ${fmtBRL(trocoCalculado)}`;
      }
    }
    
    setNovos(novos.map((p, x) => x === i ? { 
      ...p, 
      [k]: val,
      observacao: k === "valor" && p.forma_pagamento === "dinheiro" && observacaoTroco ? observacaoTroco : p.observacao
    } : p));
    
    if (k === "valor" && novos[i].forma_pagamento === "dinheiro" && trocoCalculado > 0) {
      toast.info(`Troco: ${fmtBRL(trocoCalculado)}`, { duration: 3000 });
    }
  };

  const executePayment = async (forceSaldo = false, forceFinalizarConfirm = false, customValidos = null, forceTrocoConfirm = false) => {
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
        if (!v?.cliente_id) {
          toast.error("Para utilizar crédito é necessário identificar o cliente na venda.");
          return;
        }
        if (valNum > clienteSaldo) {
          toast.error(`Saldo de crédito insuficiente para o cliente (Saldo atual: ${fmtBRL(clienteSaldo)}).`);
          return;
        }
      }
      if (valNum > saldo && p.forma_pagamento !== "dinheiro") {
        if (!trabalharCredito || !v?.cliente_id || !gerarCreditoExcedente) {
          toast.error("Troco permitido apenas para pagamentos em dinheiro.");
          return;
        }
      }
    }

    const isZeroSaldo = saldo <= 0.01;
    let validos = customValidos || novos.filter((p) => isZeroSaldo ? Number(p.valor) >= 0 : Number(p.valor) > 0);
    
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
    
    if (finalizar && !forceFinalizarConfirm) {
      const excessoTotal = totalInformado > saldo ? Number((totalInformado - saldo).toFixed(2)) : 0;
      if (excessoTotal <= 0) {
        setFinalizarConfirmOpen(true);
        return;
      }
    }

    const excessoTotal = totalInformado > saldo ? Number((totalInformado - saldo).toFixed(2)) : 0;
    const temTroco = excessoTotal > 0 && novos.some(p => p.forma_pagamento === "dinheiro");
    
    if (gerarCreditoExcedente && excessoTotal > 0 && !forceTrocoConfirm) {
      setTrocoConfirmData({ excessoTotal, totalInformado, customValidos: validos, isCredit: true });
      setTrocoConfirmOpen(true);
      return;
    }

    if (!gerarCreditoExcedente && temTroco && !forceTrocoConfirm) {
      setTrocoConfirmData({ excessoTotal, totalInformado, customValidos: validos, isCredit: false });
      setTrocoConfirmOpen(true);
      return;
    }

    const payload = { 
      pagamentos: validos.map(p => ({
        valor: Number(p.valor),
        forma_pagamento: p.forma_pagamento,
        observacao: p.observacao || ""
      })), 
      finalizar,
      gerar_credito_excedente: gerarCreditoExcedente
    };
    
    try {
      await http.post(`/vendas-diretas/${id}/pagamentos`, payload);
      
      if (gerarCreditoExcedente) {
        toast.success(finalizar ? `Venda finalizada! Crédito de ${fmtBRL(excessoTotal)} gerado para o cliente.` : `Pagamento registrado! Crédito de ${fmtBRL(excessoTotal)} gerado.`);
      } else if (temTroco) {
        toast.success(`Pagamento registrado com sucesso! Devolva o troco de ${fmtBRL(excessoTotal)}`);
      } else {
        toast.success(finalizar ? "Venda finalizada com sucesso!" : `Pagamento registrado! Restante pendente: ${fmtBRL(saldo - totalInformado)}`);
      }
      
      if (finalizar) nav("/vendas-diretas"); 
      else { 
        setNovos([{ valor: "", forma_pagamento: "dinheiro", observacao: "" }]); 
        load(); 
      }
    } catch (e) { 
      toast.error(e.response?.data?.detail || "Erro ao registrar pagamento"); 
    }
  };

  // Abrir modal de edição
  const openEditDialog = (payment) => {
    setEditingPayment({ ...payment });
    setEditFormOpen(true);
  };

  // Confirmar edição com senha
  const handleEditWithPassword = async (password) => {
    if (!editingPayment) return;
    try {
      await http.put(
        `/vendas-diretas/${id}/pagamentos/${editingPayment.id}`,
        {
          valor: Number(editingPayment.valor),
          forma_pagamento: editingPayment.forma_pagamento,
          observacao: editingPayment.observacao || "",
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
        `/vendas-diretas/${id}/pagamentos/${pendingAction.paymentId}`,
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
      await http.delete(`/vendas-diretas/${id}/pagamentos/${paymentId}`);
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
        `/vendas-diretas/${id}/pagamentos/${editingPayment.id}`,
        {
          valor: Number(editingPayment.valor),
          forma_pagamento: editingPayment.forma_pagamento,
          observacao: editingPayment.observacao || ""
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
    if (v.status !== 'pago') {
      executeDelete(paymentId);
    } else {
      setPendingAction({ type: 'delete', paymentId });
      setPasswordDialogOpen(true);
    }
  };

  // Salvar edição
  const saveEdit = () => {
    if (!temPermissaoPagamento) {
      toast.error("Você não tem permissão para realizar pagamentos.");
      return;
    }
    if (!editingPayment?.valor || Number(editingPayment.valor) <= 0) {
      toast.error("Valor deve ser maior que zero");
      return;
    }
    if (v.status !== 'pago') {
      executeEdit();
    } else {
      setPendingAction({ type: 'edit' });
      setPasswordDialogOpen(true);
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 fade-in max-w-7xl w-full overflow-x-hidden">
      <Button variant="ghost" onClick={() => nav(-1)} className="mb-4"><ArrowLeft className="w-4 h-4 mr-1" /> Voltar</Button>
      <div className="text-xs uppercase tracking-wider text-zinc-400">Venda de Produto</div>
      <h1 className="font-display text-2xl sm:text-4xl font-semibold tracking-tight mt-1 flex flex-wrap items-center gap-2 sm:gap-3">
        {v.produto_nome}
        {v.numero_venda && (
          <span className="text-xs sm:text-sm font-mono font-bold bg-[#EAF0EE] text-[#3A4F4A] px-2.5 py-1 rounded-full">
            {String(v.numero_venda).padStart(6, "0")} | V
          </span>
        )}
      </h1>
      <div className="text-sm text-zinc-500 mt-1 flex flex-wrap gap-x-3 gap-y-1">
        <span>{fmtDT(v.data_venda)}</span>
        {v.cliente_nome && <span>· Cliente: {v.cliente_nome}</span>}
        {v.colaborador_nome && <span>· Vendedor: {v.colaborador_nome}</span>}
        <span>· <StatusBadge status={v.status} /></span>
      </div>

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
          {/* Itens do carrinho */}
          {Array.isArray(v.itens) && v.itens.length > 1 ? (
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 shadow-sm fade-in">
              <div className="mb-4">
                <h3 className="text-sm font-semibold text-zinc-700 dark:text-zinc-200">Itens da venda ({v.itens.length} produtos)</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="text-xs uppercase tracking-wider text-zinc-500 dark:text-zinc-400 bg-zinc-50/50 dark:bg-zinc-900">
                    <tr>
                      <th className="px-4 py-2 text-left">Produto</th>
                      <th className="px-4 py-2 text-center">Qtd</th>
                      <th className="px-4 py-2 text-right">Unit.</th>
                      <th className="px-4 py-2 text-right">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                    {v.itens.map((item, i) => (
                      <tr key={i} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-800/50 transition-colors">
                        <td className="px-4 py-2.5 font-bold text-zinc-800 dark:text-zinc-100">{item.produto_nome}</td>
                        <td className="px-4 py-2.5 text-center font-medium text-zinc-600 dark:text-zinc-300">{item.quantidade}</td>
                        <td className="px-4 py-2.5 text-right font-medium text-zinc-600 dark:text-zinc-300">{fmtBRL(item.preco_unitario)}</td>
                        <td className="px-4 py-2.5 text-right font-black text-[#3A4F4A] dark:text-emerald-400">{fmtBRL(item.subtotal)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 shadow-sm fade-in">
              <div className="text-sm text-zinc-500 dark:text-zinc-400 font-medium">
                Produto: <strong className="text-zinc-800 dark:text-zinc-200">{v.produto_nome}</strong>
              </div>
              <div className="text-sm text-zinc-500 dark:text-zinc-400 mt-2 font-medium">
                Qtd: <strong className="text-zinc-800 dark:text-zinc-200">{v.quantidade}</strong>
              </div>
              <div className="text-sm text-zinc-500 dark:text-zinc-400 mt-2 font-medium">
                Valor Unitário: <strong className="text-zinc-800 dark:text-zinc-200">{fmtBRL(v.valor_total / v.quantidade)}</strong>
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
                      <div className="text-xs text-emerald-600 dark:text-emerald-400 mt-0.5">
                        Total descontado: <strong>{fmtBRL(descontoMeta?.total_descontado)}</strong>
                        {descontoMeta?.incide_comissao === false && (
                          <span className="ml-2 text-[10px] bg-emerald-200 dark:bg-emerald-800 text-emerald-700 dark:text-emerald-300 px-1.5 py-0.5 rounded-full">Não incide na comissão</span>
                        )}
                      </div>
                    </div>
                  </div>
                  {pagamentos.length === 0 && (
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
                
                {/* Detalhamento por item */}
                <div className="border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden">
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
                      {v.itens?.map((item, i) => (
                        <tr key={i} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-800/30">
                          <td className="px-4 py-2 font-medium text-zinc-800 dark:text-zinc-200">{item.produto_nome}</td>
                          <td className="px-4 py-2 text-right text-zinc-500 dark:text-zinc-400">
                            {item.preco_unitario_original !== undefined 
                              ? <span className="line-through">{fmtBRL(item.preco_unitario_original * item.quantidade)}</span>
                              : fmtBRL(item.subtotal)}
                          </td>
                          <td className="px-4 py-2 text-right text-rose-600 dark:text-rose-400 font-semibold">
                            {item.preco_unitario_original !== undefined 
                              ? `- ${fmtBRL((item.preco_unitario_original * item.quantidade) - item.subtotal)}` 
                              : "—"}
                          </td>
                          <td className="px-4 py-2 text-right font-bold text-zinc-900 dark:text-zinc-100">{fmtBRL(item.subtotal)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Substituir por outro desconto */}
                {pagamentos.length === 0 && (
                  <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800">
                    <Label className="text-xs text-zinc-500 dark:text-zinc-400">Substituir por outro desconto:</Label>
                    <div className="flex gap-2 mt-1">
                      <Select onValueChange={handleSelectDesconto} disabled={loadingDesconto}>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Selecione outro desconto..." />
                        </SelectTrigger>
                        <SelectContent>
                          {descontos.filter(d => isDescontoAplicavel(d) && d.id !== descontoMeta?.desconto_id).map(d => (
                            <SelectItem key={d.id} value={d.id}>
                              {d.codigo} - {d.descricao || ""} ({d.tipo === 'porcentagem' ? `${d.valor}%` : fmtBRL(d.valor)}) {d.requer_autorizacao ? "🔒" : ""}
                            </SelectItem>
                          ))}
                          {descontos.filter(d => isDescontoAplicavel(d) && d.id !== descontoMeta?.desconto_id).length === 0 && (
                            <SelectItem disabled value="none">Nenhum outro desconto disponível</SelectItem>
                          )}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-4 sm:p-5 shadow-sm">
              <h3 className="font-display text-base font-bold mb-3 text-zinc-800 dark:text-zinc-100 flex items-center gap-2">
                🏷️ Desconto
              </h3>
              {pagamentos.length === 0 ? (
                <div className="space-y-2">
                  <Label className="text-xs text-zinc-500">Selecione um desconto para aplicar a esta venda:</Label>
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
                  <p className="text-xs text-amber-700 dark:text-amber-450 font-medium">
                    ⚠️ Não é possível aplicar descontos em vendas que já possuem pagamentos registrados.
                  </p>
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-1">
                    Para aplicar um desconto, exclua os pagamentos anteriores na seção de <strong>"Pagamentos Anteriores"</strong> primeiro.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Registrar Pagamento */}
          <div className="bg-white border border-zinc-200 dark:bg-zinc-900 dark:border-zinc-800 rounded-2xl p-4 sm:p-6 shadow-sm">
            <h3 className="font-display text-base sm:text-lg font-medium text-zinc-800 dark:text-zinc-100 mb-4">Registrar Pagamento</h3>
            <div className="space-y-4">
              {novos.map((p, i) => (
                <div key={i} className="border border-zinc-150 sm:border-0 rounded-xl p-4 sm:p-0 bg-zinc-50/50 sm:bg-transparent dark:bg-zinc-955/20 space-y-3 sm:space-y-0 sm:grid sm:grid-cols-12 sm:gap-2 sm:items-end relative">
                  {novos.length > 1 && (
                    <div className="sm:hidden absolute top-2 right-2">
                      <Button size="icon" variant="ghost" className="h-8 w-8 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-955/20" onClick={() => removeLine(i)} disabled={!temPermissaoPagamento}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  )}
                  <div className="col-span-3">
                    <Label className="text-xs sm:text-sm text-zinc-650 dark:text-zinc-400 font-medium">Valor *</Label>
                    <Input 
                      data-testid={`vpay-valor-${i}`} 
                      type="number" 
                      step="0.01" 
                      value={p.valor} 
                      onChange={(e) => updateLine(i, "valor", e.target.value)}
                      placeholder="0.00"
                      className="bg-white dark:bg-zinc-900 sm:bg-transparent mt-1.5 h-9 text-sm focus:ring-[#84A59D] font-mono"
                      disabled={!temPermissaoPagamento}
                    />
                  </div>
                  <div className="col-span-4">
                    <Label className="text-xs sm:text-sm text-zinc-650 dark:text-zinc-400 font-medium">Forma *</Label>
                    <Select value={p.forma_pagamento} onValueChange={(val) => updateLine(i, "forma_pagamento", val)} disabled={!temPermissaoPagamento}>
                      <SelectTrigger data-testid={`vpay-forma-${i}`} className="bg-white dark:bg-zinc-900 sm:bg-transparent mt-1.5 h-9 text-xs" disabled={!temPermissaoPagamento}><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {(trabalharCredito && v?.cliente_id 
                          ? [...FORMAS, { v: "credito_cliente", l: `Crédito do Cliente (Saldo: ${fmtBRL(clienteSaldo)})` }]
                          : FORMAS).map((f) => <SelectItem key={f.v} value={f.v} className="text-xs">{f.l}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="col-span-4">
                    <Label className="text-xs sm:text-sm text-zinc-650 dark:text-zinc-400 font-medium">Observação</Label>
                    <Input 
                      value={p.observacao} 
                      onChange={(e) => updateLine(i, "observacao", e.target.value)}
                      placeholder="Observações adicionais"
                      className="bg-white dark:bg-zinc-900 sm:bg-transparent mt-1.5 h-9 text-xs focus:ring-[#84A59D]"
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
              ))}
            </div>
            
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 mt-6">
              <Button variant="outline" size="sm" onClick={addLine} className="justify-center h-9 text-xs" disabled={!temPermissaoPagamento}><Plus className="w-3 h-3 mr-1" /> Adicionar forma</Button>
              <Button data-testid="vpay-finish-btn" onClick={() => executePayment()} className="bg-[#84A59D] hover:bg-[#6F9189] justify-center text-white h-9 text-xs font-semibold" disabled={!temPermissaoPagamento}><CheckCircle2 className="w-4 h-4 mr-1" /> Registrar e Finalizar</Button>
            </div>
          </div>
        </div>

        {/* Coluna Direita (Sticky Sidebar): Resumo Financeiro Dinâmico, Consolidado e Pagamentos Anteriores */}
        <div className="lg:col-span-4 space-y-6 lg:sticky lg:top-8">
          {/* Saldo de Crédito do Cliente */}
          {trabalharCredito && v?.cliente_id && (
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
              {/* Detalhes de composição (se houver descontos ou pagamentos anteriores) */}
              {(temDescontoAplicado || v.total_pago > 0) && (
                <div className="bg-zinc-50/50 dark:bg-zinc-950/30 border border-zinc-150 dark:border-zinc-800/80 rounded-xl p-3.5 space-y-2 text-xs">
                  {temDescontoAplicado && (
                    <div className="flex justify-between items-center text-zinc-500">
                      <span>Total Original</span>
                      <span className="font-mono line-through">{fmtBRL(valorOriginalVenda)}</span>
                    </div>
                  )}
                  
                  {temDescontoAplicado && (
                    <div className="flex justify-between items-center text-rose-500 font-medium">
                      <span>Desconto Aplicado</span>
                      <span className="font-mono font-bold">- {fmtBRL(descontoMeta?.total_descontado)}</span>
                    </div>
                  )}

                  <div className="flex justify-between items-center text-zinc-555 dark:text-zinc-400">
                    <span>Valor Total da Venda</span>
                    <span className="font-mono font-semibold">{fmtBRL(v.valor_total)}</span>
                  </div>

                  {v.total_pago > 0 && (
                    <div className="flex justify-between items-center text-emerald-600 dark:text-emerald-400 font-medium">
                      <span>Total Pago (Anteriormente)</span>
                      <span className="font-mono font-bold">{fmtBRL(v.total_pago)}</span>
                    </div>
                  )}
                </div>
              )}

              {/* Destaque 1: Valor a Pagar (Saldo Restante Devido) */}
              <div className="bg-[#EAF0EE] dark:bg-[#1E2D2A] border border-[#C2D3CE] dark:border-[#334E47] p-4 rounded-xl flex items-center justify-between shadow-xs">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#3A4F4A] dark:text-[#84A59D] block">Valor a Pagar</span>
                  <span className="text-[11px] text-[#4A645F] dark:text-[#678B81] mt-0.5 block font-medium">Total devido desta venda</span>
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
                    <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-455 block">Troco a Devolver</span>
                    <span className="text-[11px] text-emerald-600 dark:text-emerald-500 mt-0.5 block font-medium">Entregar ao cliente em dinheiro</span>
                  </div>
                  <div className="text-right">
                    <span className="text-2xl font-black text-emerald-600 dark:text-emerald-455 font-mono tracking-tight">{fmtBRL(trocoTotal)}</span>
                  </div>
                </div>
              )}

              {/* Opção de gerar crédito se houver excedente */}
              {excessoTotal > 0 && trabalharCredito && v?.cliente_id && (
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
                  <div className="text-[11px] text-rose-800 dark:text-rose-350 leading-normal">
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
            {pagamentos.length === 0 ? (
              <div className="text-center text-xs text-zinc-400 py-4 italic">Nenhum pagamento registrado</div>
            ) : (
              <div className="space-y-3">
                {pagamentos.map((p) => (
                  <div key={p.id} className="p-3 bg-zinc-50 dark:bg-zinc-950/40 rounded-xl border border-zinc-155 dark:border-zinc-850 flex flex-col gap-1.5 text-xs">
                    <div className="flex justify-between items-center w-full">
                      <span className="font-semibold text-zinc-700 dark:text-zinc-350 capitalize">
                        {FORMAS.find((f) => f.v === p.forma_pagamento)?.l || p.forma_pagamento}
                      </span>
                      <span className="font-mono font-bold text-zinc-855 dark:text-zinc-250">{fmtBRL(p.valor)}</span>
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
                    {p.observacao && <span className="text-[10px] text-zinc-550 dark:text-zinc-400 italic">"{p.observacao}"</span>}
                    <div className="flex items-center justify-between mt-1 pt-1.5 border-t border-zinc-100/50 dark:border-zinc-850/60">
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
                <Select value={editingPayment.forma_pagamento} onValueChange={(v) => setEditingPayment({ ...editingPayment, forma_pagamento: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {(trabalharCredito && v?.cliente_id 
                      ? [...FORMAS, { v: "credito_cliente", l: `Crédito do Cliente (Saldo: ${fmtBRL(clienteSaldo)})` }]
                      : FORMAS).map((f) => <SelectItem key={f.v} value={f.v}>{f.l}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
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

      {/* Dialog de confirmação de pagamento automático */}
      <Dialog open={autoPayConfirmOpen} onOpenChange={setAutoPayConfirmOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Confirmar Pagamento Integral</DialogTitle>
          </DialogHeader>
          <div className="py-4 text-sm text-zinc-600 dark:text-zinc-400">
            Deseja finalizar o pagamento total de <b>{fmtBRL(saldo)}</b> em <b>{(FORMAS.find(f => f.v === novos[0]?.forma_pagamento)?.l || novos[0]?.forma_pagamento || "").toUpperCase()}</b>?
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setAutoPayConfirmOpen(false)}>Cancelar</Button>
            <Button onClick={async () => {
              setAutoPayConfirmOpen(false);
              await executePayment(true);
            }} className="bg-[#84A59D] hover:bg-[#6F9189] text-white">Confirmar Pagamento</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de autorização de desconto */}
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

      {/* Dialog de confirmação de finalização de pagamento/venda */}
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
              await executePayment(false, true);
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
              await executePayment(false, true, trocoConfirmData?.customValidos, true);
            }} className="bg-[#84A59D] hover:bg-[#6F9189] text-white font-bold">
              {trocoConfirmData?.isCredit ? "Confirmar e Gerar Crédito" : "Confirmar e Entregar Troco"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
