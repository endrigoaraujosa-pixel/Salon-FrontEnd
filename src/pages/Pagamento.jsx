import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import http from "../api";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "../components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "../components/ui/dialog";
import { ArrowLeft, Plus, Trash2, CheckCircle2, Edit2, AlertCircle, ShoppingCart } from "lucide-react";
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
  const temPermissaoPagamento = user?.role === "admin" || !!user?.perfil?.permissoes?.acoes?.realizar_pagamento;
  const [ag, setAg] = useState(null);
  const [novos, setNovos] = useState([{ valor: "", forma_pagamento: "dinheiro", observacao: "" }]);
  const [pendingSales, setPendingSales] = useState([]);
  
  // Estados para edição de pagamento
  const [editingPayment, setEditingPayment] = useState(null);
  const [editFormOpen, setEditFormOpen] = useState(false);
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState(null);
  const [autoPayConfirmOpen, setAutoPayConfirmOpen] = useState(false);

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
            // Marca selecionado por padrão para listar tudo claro
            setPendingSales(res.data.map(s => ({ ...s, selected: true })));
          })
          .catch(() => {});
      }
    });
  };

  useEffect(() => { 
    load(); 
    http.get("/colaboradores").then((r) => setColaboradores(r.data)).catch(() => {});
    http.get("/descontos")
      .then(r => setDescontos(r.data.filter(d => d.ativo)))
      .catch(() => {});
  }, [id]);

  const toggleSaleSelection = (saleId) => {
    setPendingSales(prev => prev.map(s => s.id === saleId ? { ...s, selected: !s.selected } : s));
  };

  if (!ag) return <div className="p-8 text-zinc-400">Carregando...</div>;
  const saldoAgendamento = (ag.valor_total || 0) - (ag.total_pago || 0);
  const totalSalesSelected = pendingSales.filter(s => s.selected).reduce((sum, s) => sum + (s.valor_total - s.valor_pago), 0);
  const saldo = saldoAgendamento + totalSalesSelected;
  const totalInformado = novos.filter((p) => Number(p.valor) > 0).reduce((sum, p) => sum + Number(p.valor), 0);
  const trocoTotal = totalInformado > saldo && novos.some(p => p.forma_pagamento === "dinheiro") ? totalInformado - saldo : 0;

  let descontoMeta = ag?.desconto_aplicado;
  if (typeof descontoMeta === 'string') {
    try {
      descontoMeta = JSON.parse(descontoMeta);
    } catch (e) {}
  }
  const temDescontoAplicado = !!descontoMeta;
  const valorOriginalAgendamento = temDescontoAplicado ? (ag.valor_total + (descontoMeta?.total_descontado || 0)) : ag.valor_total;

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

    const itensAgendamento = Array.isArray(ag.itens) ? ag.itens : [];
    return itensAgendamento.some(item => vinculados.services?.includes(item.servico_id));
  };

  const applyDiscountOnBackend = async (dId, authData = null) => {
    setLoadingDesconto(true);
    try {
      if (authData) {
        await http.post("/descontos/validar", {
          id: dId,
          email: authData.email,
          password: authData.password
        });
      }

      await http.post(`/agendamentos/${id}/aplicar-desconto`, { descontoId: dId });
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
      toast.error("Este desconto não é válido para os serviços deste agendamento.");
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

  const addLine = () => setNovos([...novos, { valor: "", forma_pagamento: "dinheiro", observacao: "" }]);
  const removeLine = (i) => setNovos(novos.filter((_, x) => x !== i));
  
  const updateLine = (i, k, v) => {
    if (k === "valor") {
      const valNum = parseFloat(v) || 0;
      if (valNum > saldo && novos[i].forma_pagamento !== "dinheiro") {
        toast.error("Troco permitido apenas para pagamentos em dinheiro.");
        return;
      }
    }

    if (k === "forma_pagamento" && v !== "dinheiro") {
      const valNum = parseFloat(novos[i].valor) || 0;
      if (valNum > saldo) {
        toast.error("Troco permitido apenas para pagamentos em dinheiro.");
        setNovos(novos.map((p, x) => x === i ? { 
          ...p, 
          forma_pagamento: v,
          valor: "",
          observacao: ""
        } : p));
        return;
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
      observacao: k === "valor" && p.forma_pagamento === "dinheiro" && observacaoTroco ? observacaoTroco : p.observacao
    } : p));
    
    // Mostrar toast de troco se aplicável
    if (k === "valor" && novos[i].forma_pagamento === "dinheiro" && trocoCalculado > 0) {
      toast.info(`Troco: ${fmtBRL(trocoCalculado)}`, { duration: 3000 });
    }
  };

  const executePayment = async (customAg) => {
    const validos = novos.filter((p) => Number(p.valor) > 0);
    if (validos.length === 0) { toast.error("Informe ao menos um pagamento"); return; }
    
    const totalInformado = validos.reduce((sum, p) => sum + Number(p.valor), 0);
    const finalizar = totalInformado >= (saldo - 0.01);

    if (finalizar) {
      for (const item of customAg.itens || []) {
        if (!item.colaborador_id || item.colaborador_id === "none") {
          toast.error(`Não é possível finalizar sem definir o profissional do serviço: ${item.nome || "Serviço"}.`);
          return;
        }
      }
    }

    // 1. Ajustar o dinheiro se exceder o saldo total (para troco)
    let saldoRestante = saldo;
    let adjustedPayments = [];
    let valorTroco = 0;
    let temTroco = false;

    for (let p of validos) {
      let valorOriginal = Number(p.valor);
      let valorAEnviar = valorOriginal;
      let observacao = p.observacao || "";

      if (p.forma_pagamento === "dinheiro" && valorOriginal > saldoRestante) {
        temTroco = true;
        valorTroco = valorOriginal - saldoRestante;
        valorAEnviar = Math.max(0, saldoRestante);
        observacao = `Troco: ${fmtBRL(valorTroco)}` + (p.observacao ? ` - ${p.observacao}` : "");
        saldoRestante = 0;
      } else {
        saldoRestante -= valorOriginal;
      }

      adjustedPayments.push({
        ...p,
        valor: valorAEnviar,
        observacao: observacao
      });
    }

    // 2. Distribuir os pagamentos sequencialmente
    let items = [
      { type: 'agendamento', id: id, saldo: saldoAgendamento },
      ...pendingSales.filter(s => s.selected).map(s => ({ type: 'sale', id: s.id, saldo: s.valor_total - s.valor_pago }))
    ];

    let paymentsPool = adjustedPayments.map(p => ({ ...p, valor: Number(p.valor) }));
    let itemPayments = {};

    for (let item of items) {
      let remainingSaldo = item.saldo;
      let itemPags = [];

      for (let p of paymentsPool) {
        if (p.valor <= 0) continue;
        if (remainingSaldo <= 0) break;

        let payAmount = Math.min(p.valor, remainingSaldo);
        p.valor -= payAmount;
        remainingSaldo -= payAmount;

        itemPags.push({
          valor: Number(payAmount.toFixed(2)),
          forma_pagamento: p.forma_pagamento,
          observacao: p.observacao || ""
        });
      }

      itemPayments[item.type === 'agendamento' ? 'agendamento' : item.id] = {
        pagamentos: itemPags,
        finalizar: remainingSaldo <= 0.01
      };
    }

    try {
      // 3. Registrar os pagamentos no backend de forma totalmente separada (cada um com seu próprio registro)
      const agPayInfo = itemPayments['agendamento'];
      if (agPayInfo && agPayInfo.pagamentos.length > 0) {
        await http.post(`/agendamentos/${id}/pagamentos`, {
          pagamentos: agPayInfo.pagamentos,
          finalizar: agPayInfo.finalizar
        });
      }

      for (const sale of pendingSales.filter(s => s.selected)) {
        const salePayInfo = itemPayments[sale.id];
        if (salePayInfo && salePayInfo.pagamentos.length > 0) {
          await http.post(`/vendas-diretas/${sale.id}/pagamentos`, {
            pagamentos: salePayInfo.pagamentos,
            finalizar: salePayInfo.finalizar
          });
        }
      }

      if (temTroco) {
        toast.success(`Pagamento registrado com sucesso! Devolva o troco de ${fmtBRL(valorTroco)}`);
      } else {
        toast.success(finalizar ? "Atendimento e vendas finalizados com sucesso!" : `Pagamento registrado! Restante pendente: ${fmtBRL(saldo - totalInformado)}`);
      }

      if (finalizar) {
        nav("/agenda");
      } else {
        setNovos([{ valor: "", forma_pagamento: "dinheiro", observacao: "" }]);
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
      if (valNum > saldo && p.forma_pagamento !== "dinheiro") {
        toast.error("Troco permitido apenas para pagamentos em dinheiro.");
        return;
      }
    }

    let validos = novos.filter((p) => Number(p.valor) > 0);
    
    if (validos.length === 0) {
      if (novos.length === 1) {
        if (forceSaldo) {
          const valorAutomatico = String(saldo);
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
          auxiliar_id: item.auxiliar_id && item.auxiliar_id !== "none" ? item.auxiliar_id : ""
        })));
        setProfsDialogOpen(true);
        return;
      }
    }

    await executePayment(ag);
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
        itens_selecionados: missingProfs.map(x => ({
          servico_id: x.servico_id,
          colaborador_id: x.colaborador_id,
          auxiliar_id: x.auxiliar_id === "none" ? null : x.auxiliar_id
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
    setEditingPayment({ ...payment });
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
    setPendingAction({ type: 'delete', paymentId });
    setPasswordDialogOpen(true);
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
    setPendingAction({ type: 'edit' });
    setPasswordDialogOpen(true);
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 fade-in max-w-4xl w-full overflow-x-hidden">
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
      {/* Serviços Realizados */}
      {ag.itens && Array.isArray(ag.itens) && ag.itens.length > 0 && (
        <div className="bg-white border border-zinc-200 dark:bg-zinc-900 dark:border-zinc-800 rounded-2xl p-5 sm:p-6 mt-5 shadow-sm fade-in">
          <h3 className="font-display text-base sm:text-lg font-extrabold text-zinc-800 dark:text-zinc-100 mb-5 flex items-center gap-2">
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
                  <div className="text-base sm:text-lg font-black text-zinc-800 dark:text-zinc-200 text-right font-mono shrink-0">
                    {fmtBRL(item.valor)}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Resumo Financeiro */}
      {temDescontoAplicado ? (
        <div className="my-6 space-y-3">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 shadow-sm">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6 items-center">
              <div className="text-center sm:text-left">
                <div className="text-[10px] sm:text-xs uppercase tracking-widest font-bold text-zinc-400 dark:text-zinc-500">Valor Original</div>
                <div className="font-display text-xl sm:text-2xl font-black mt-1 text-zinc-500 dark:text-zinc-400 line-through">{fmtBRL(valorOriginalAgendamento)}</div>
              </div>
              <div className="text-center">
                <div className="text-[10px] sm:text-xs uppercase tracking-widest font-bold text-rose-500 dark:text-rose-400">Desconto Aplicado</div>
                <div className="font-display text-xl sm:text-2xl font-black mt-1 text-rose-600 dark:text-rose-400">- {fmtBRL(descontoMeta?.total_descontado)}</div>
                <div className="text-[10px] text-rose-500/80 dark:text-rose-400/60 font-semibold mt-0.5">
                  {descontoMeta?.codigo} ({descontoMeta?.tipo === 'porcentagem' ? `${descontoMeta?.valor_desconto}%` : fmtBRL(descontoMeta?.valor_desconto)})
                </div>
              </div>
              <div className="text-center sm:text-right">
                <div className="text-[10px] sm:text-xs uppercase tracking-widest font-bold text-emerald-600 dark:text-emerald-400">Valor a Pagar</div>
                <div className="font-display text-2xl sm:text-3xl font-black mt-1 text-emerald-700 dark:text-emerald-400">{fmtBRL(ag.valor_total)}</div>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="bg-white border border-zinc-200 dark:bg-zinc-900 dark:border-zinc-800 rounded-xl p-4 shadow-sm">
              <div className="text-[10px] sm:text-xs uppercase tracking-wider text-zinc-400 dark:text-zinc-500 font-bold">Serviço (A Pagar)</div>
              <div className="font-display text-xl sm:text-2xl font-semibold mt-1 text-zinc-800 dark:text-zinc-100">{fmtBRL(saldoAgendamento)}</div>
            </div>
            <div className="bg-white border border-zinc-200 dark:bg-zinc-900 dark:border-zinc-800 rounded-xl p-4 shadow-sm">
              <div className="text-[10px] sm:text-xs uppercase tracking-wider text-zinc-400 dark:text-zinc-500 font-bold">Vendas Diretas</div>
              <div className="font-display text-xl sm:text-2xl font-semibold mt-1 text-[#84A59D] dark:text-emerald-400">{fmtBRL(totalSalesSelected)}</div>
            </div>
            <div className="bg-white border border-zinc-200 dark:bg-zinc-900 dark:border-zinc-800 rounded-xl p-4 shadow-sm">
              <div className="text-[10px] sm:text-xs uppercase tracking-wider text-zinc-400 dark:text-zinc-500 font-bold">Total Unificado</div>
              <div className="font-display text-xl sm:text-2xl font-semibold mt-1 text-[#84A59D] dark:text-emerald-400">{fmtBRL(saldo)}</div>
            </div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 my-6">
          <div className="bg-white border border-zinc-200 dark:bg-zinc-900 dark:border-zinc-800 rounded-xl p-4 sm:p-5">
            <div className="text-[10px] sm:text-xs uppercase tracking-wider text-zinc-400 dark:text-zinc-500 font-bold">Serviço (A Pagar)</div>
            <div className="font-display text-2xl sm:text-3xl font-semibold mt-1 text-zinc-800 dark:text-zinc-100">{fmtBRL(saldoAgendamento)}</div>
          </div>
          <div className="bg-white border border-zinc-200 dark:bg-zinc-900 dark:border-zinc-800 rounded-xl p-4 sm:p-5">
            <div className="text-[10px] sm:text-xs uppercase tracking-wider text-zinc-400 dark:text-zinc-500 font-bold">Vendas Diretas</div>
            <div className="font-display text-2xl sm:text-3xl font-semibold mt-1 text-[#84A59D] dark:text-emerald-400">{fmtBRL(totalSalesSelected)}</div>
          </div>
          <div className="bg-white border border-zinc-200 dark:bg-zinc-900 dark:border-zinc-800 rounded-xl p-4 sm:p-5">
            <div className="text-[10px] sm:text-xs uppercase tracking-wider text-zinc-400 dark:text-zinc-500 font-bold">Total Unificado</div>
            <div className="font-display text-2xl sm:text-3xl font-semibold mt-1 text-[#84A59D] dark:text-emerald-400">{fmtBRL(saldo)}</div>
          </div>
        </div>
      )}

      {pendingSales.length > 0 && (
        <div className="bg-white border border-zinc-200 dark:bg-zinc-900 dark:border-zinc-800 rounded-xl p-4 sm:p-6 mb-6 fade-in">
          <h3 className="font-display text-base font-semibold text-zinc-800 dark:text-zinc-200 mb-3 flex items-center gap-2">
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
                  <div className="pt-2.5 border-t border-zinc-105 dark:border-zinc-800/50 pl-7 space-y-2">
                    {s.itens.map((item, idx) => (
                      <div key={idx} className="flex items-center justify-between text-xs sm:text-sm text-zinc-650 dark:text-zinc-300 font-medium">
                        <div className="flex items-center gap-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-zinc-300 dark:bg-zinc-700 flex-shrink-0"></span>
                          <span>{item.produto_nome}</span>
                        </div>
                        <div className="flex items-center gap-4 text-right">
                          <span className="text-zinc-400 dark:text-zinc-500 font-normal">{item.quantidade}x {fmtBRL(item.preco_unitario)}</span>
                          <span className="text-zinc-700 dark:text-zinc-200 font-semibold min-w-[70px]">{fmtBRL(item.subtotal || (item.quantidade * item.preco_unitario))}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="pt-2 border-t border-zinc-105 dark:border-zinc-800/50 pl-7 text-xs sm:text-sm text-zinc-500 dark:text-zinc-450 font-medium">
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

      {/* Seção de Descontos - info sempre visível, seletor apenas sem pagamentos */}
      {temDescontoAplicado ? (
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 sm:p-6 mb-6 shadow-sm">
          <h3 className="font-display text-base font-bold mb-3 text-zinc-800 dark:text-zinc-100 flex items-center gap-2">
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

            {/* Trocar por outro desconto - só sem pagamentos */}
            {ag.pagamentos?.length === 0 && (
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
      ) : ag.pagamentos?.length === 0 && (
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 sm:p-6 mb-6 shadow-sm">
          <h3 className="font-display text-base font-bold mb-3 text-zinc-800 dark:text-zinc-100 flex items-center gap-2">
            🏷️ Desconto
          </h3>
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
        </div>
      )}

      <div className="bg-white border border-zinc-200 dark:bg-zinc-900 dark:border-zinc-800 rounded-xl p-4 sm:p-6 mb-6">
        <h3 className="font-display text-base sm:text-lg font-medium text-zinc-800 dark:text-zinc-100 mb-4">Registrar pagamento</h3>
        <div className="space-y-4">
          {novos.map((p, i) => (
            <div key={i} className="border border-zinc-150 sm:border-0 rounded-xl p-4 sm:p-0 bg-zinc-50/50 sm:bg-transparent dark:bg-zinc-950/20 space-y-3 sm:space-y-0 sm:grid sm:grid-cols-12 sm:gap-2 sm:items-end relative">
              {novos.length > 1 && (
                <div className="sm:hidden absolute top-2 right-2">
                  <Button size="icon" variant="ghost" className="h-8 w-8 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/20" onClick={() => removeLine(i)} disabled={!temPermissaoPagamento}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              )}
              <div className="col-span-3">
                <Label className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400">Valor</Label>
                <Input 
                  data-testid={`pay-valor-${i}`} 
                  type="number" 
                  step="0.01" 
                  value={p.valor} 
                  onChange={(e) => updateLine(i, "valor", e.target.value)}
                  placeholder={p.forma_pagamento === "dinheiro" && saldo > 0 ? `Troco se > ${fmtBRL(saldo)}` : "Digite o valor"}
                  className="bg-white dark:bg-zinc-900 sm:bg-transparent mt-1"
                  disabled={!temPermissaoPagamento}
                />
              </div>
              <div className="col-span-4">
                <Label className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400">Forma</Label>
                <Select value={p.forma_pagamento} onValueChange={(v) => updateLine(i, "forma_pagamento", v)} disabled={!temPermissaoPagamento}>
                  <SelectTrigger data-testid={`pay-forma-${i}`} className="bg-white dark:bg-zinc-900 sm:bg-transparent mt-1" disabled={!temPermissaoPagamento}><SelectValue /></SelectTrigger>
                  <SelectContent>{FORMAS.map((f) => <SelectItem key={f.v} value={f.v}>{f.l}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="col-span-4">
                <Label className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400">Observação</Label>
                <Input 
                  value={p.observacao} 
                  onChange={(e) => updateLine(i, "observacao", e.target.value)}
                  placeholder={p.forma_pagamento === "dinheiro" && Number(p.valor) > saldo ? `Troco: ${fmtBRL(Number(p.valor) - saldo)}` : ""}
                  className="bg-white dark:bg-zinc-900 sm:bg-transparent mt-1"
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
        
        {/* Aviso de troco */}
        {trocoTotal > 0 && (
          <div className="mt-4 p-4 bg-zinc-50 dark:bg-zinc-950/40 border border-zinc-200 dark:border-zinc-800 rounded-xl flex items-start gap-3 fade-in animate-pulse-subtle">
            <CheckCircle2 className="w-5 h-5 text-[#84A59D] flex-shrink-0 mt-0.5" />
            <div className="text-sm text-zinc-800 dark:text-zinc-200">
              <span className="font-semibold">Troco calculado:</span>
              <span className="text-lg font-bold ml-2 text-[#84A59D] dark:text-emerald-450">{fmtBRL(trocoTotal)}</span>
              <p className="text-xs text-zinc-500 mt-1">O valor registrado no sistema será de {fmtBRL(saldo)} (quitando o saldo), e o troco de {fmtBRL(trocoTotal)} deve ser devolvido ao cliente.</p>
            </div>
          </div>
        )}
        
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 mt-6">
          <Button variant="outline" size="sm" onClick={addLine} className="justify-center" disabled={!temPermissaoPagamento}><Plus className="w-3 h-3 mr-1" /> Adicionar forma</Button>
          <Button data-testid="pay-finish-btn" onClick={submit} className="bg-[#84A59D] hover:bg-[#6F9189] justify-center text-white" disabled={!temPermissaoPagamento}><CheckCircle2 className="w-4 h-4 mr-1" /> Registrar e Finalizar</Button>
        </div>
      </div>

      <div className="bg-white border border-zinc-200 dark:bg-zinc-900 dark:border-zinc-800 rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-zinc-100 dark:border-zinc-800"><h3 className="font-display text-lg font-semibold text-zinc-800 dark:text-zinc-100">Pagamentos anteriores</h3></div>
        {ag.pagamentos.length === 0 ? <div className="p-6 text-center text-sm text-zinc-400">Nenhum pagamento</div> : (
          <>
            {/* Mobile View */}
            <div className="divide-y divide-zinc-100 dark:divide-zinc-800 sm:hidden bg-white dark:bg-zinc-900">
              {ag.pagamentos.map((p) => (
                <div key={p.id} className="p-4 flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-zinc-400 dark:text-zinc-500">{fmtDT(p.data_hora)}</span>
                    <span className="font-semibold text-[#3A4F4A] dark:text-zinc-200">{fmtBRL(p.valor)}</span>
                  </div>
                  <div className="text-sm font-semibold text-zinc-800 dark:text-zinc-100">
                    {FORMAS.find((f) => f.v === p.forma_pagamento)?.l || p.forma_pagamento}
                  </div>
                  {p.observacao && (
                    <div className="text-xs text-zinc-500 dark:text-zinc-400 italic bg-zinc-50 dark:bg-zinc-950 p-2 rounded-lg mt-1">
                      "{p.observacao}"
                    </div>
                  )}
                  <div className="flex items-center justify-end gap-2 border-t border-zinc-50 dark:border-zinc-800/60 pt-2 mt-1">
                    <Button size="sm" variant="outline" className="h-8 border-zinc-200 dark:border-zinc-700 text-rose-600 dark:text-rose-450 hover:bg-rose-50 dark:hover:bg-rose-950/20" onClick={() => startDelete(p.id)}>
                      <Trash2 className="w-3.5 h-3.5 mr-1" /> Excluir
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop View */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-zinc-50 dark:bg-zinc-950 text-xs uppercase tracking-wider text-zinc-500 dark:text-zinc-400"><tr><th className="px-4 py-3 text-left">Data</th><th className="px-4 py-3 text-left">Forma</th><th className="px-4 py-3 text-right">Valor</th><th className="px-4 py-3 text-left">Observação</th><th className="px-4 py-3 text-right">Ações</th></tr></thead>
                <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                  {ag.pagamentos.map((p) => (
                    <tr key={p.id} className="hover:bg-zinc-50/20 dark:hover:bg-zinc-800/10"><td className="px-4 py-3 text-zinc-700 dark:text-zinc-300">{fmtDT(p.data_hora)}</td><td className="px-4 py-3 text-zinc-700 dark:text-zinc-300">{FORMAS.find((f) => f.v === p.forma_pagamento)?.l || p.forma_pagamento}</td><td className="px-4 py-3 text-right font-semibold text-zinc-800 dark:text-zinc-200">{fmtBRL(p.valor)}</td><td className="px-4 py-3 text-sm text-zinc-600 dark:text-zinc-400">{p.observacao}</td><td className="px-4 py-3 text-right space-x-2"><Button size="icon" variant="ghost" onClick={() => startDelete(p.id)}><Trash2 className="w-4 h-4 text-rose-500" /></Button></td></tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
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
                  <SelectContent>{FORMAS.map((f) => <SelectItem key={f.v} value={f.v}>{f.l}</SelectItem>)}</SelectContent>
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
            Deseja finalizar o pagamento total de <b>{fmtBRL(saldo)}</b> em <b>{(FORMAS.find(f => f.v === novos[0]?.forma_pagamento)?.l || novos[0]?.forma_pagamento || "").toUpperCase()}</b>?
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setAutoPayConfirmOpen(false)}>Cancelar</Button>
            <Button onClick={async () => {
              setAutoPayConfirmOpen(false);
              await submit(true);
            }} className="bg-[#84A59D] hover:bg-[#6F9189] text-white">Confirmar Pagamento</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de autorização de desconto */}
      <Dialog open={autorizarDialogOpen} onOpenChange={(open) => { setAutorizarDialogOpen(open); if (!open) setDescontoId(""); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Autorização de Desconto Restrito</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-xs text-zinc-500">Este desconto exige autorização de um usuário com permissões administrativas ou previamente autorizado.</p>
            <div>
              <Label htmlFor="auth-email">Usuário (E-mail)</Label>
              <Input
                id="auth-email"
                type="email"
                value={authEmail}
                onChange={(e) => setAuthEmail(e.target.value)}
                placeholder="email@exemplo.com"
              />
            </div>
            <div>
              <Label htmlFor="auth-password">Senha</Label>
              <Input
                id="auth-password"
                type="password"
                value={authPassword}
                onChange={(e) => setAuthPassword(e.target.value)}
                placeholder="******"
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => { setAutorizarDialogOpen(false); setDescontoId(""); }} disabled={loadingDesconto}>Cancelar</Button>
            <Button 
              onClick={() => applyDiscountOnBackend(descontoId, { email: authEmail, password: authPassword })} 
              className="bg-[#84A59D] hover:bg-[#6F9189]"
              disabled={loadingDesconto || !authEmail || !authPassword}
            >
              {loadingDesconto ? "Autorizando..." : "Autorizar & Aplicar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
