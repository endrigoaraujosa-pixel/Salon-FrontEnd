import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import http from "../api";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "../components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "../components/ui/dialog";
import { ArrowLeft, Plus, Trash2, CheckCircle2, Edit2, AlertCircle } from "lucide-react";
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

  // Novos estados para Descontos
  const [descontos, setDescontos] = useState([]);
  const [descontoId, setDescontoId] = useState("");
  const [autorizarDialogOpen, setAutorizarDialogOpen] = useState(false);
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [loadingDesconto, setLoadingDesconto] = useState(false);

  const load = () => http.get(`/vendas-diretas/${id}`).then((r) => setV(r.data));
  useEffect(() => { 
    load(); 
    http.get("/descontos")
      .then(r => setDescontos(r.data.filter(d => d.ativo)))
      .catch(() => {});
  }, [id]);

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
        await http.post("/descontos/validar", {
          id: dId,
          email: authData.email,
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
  const trocoTotal = totalInformado > saldo && novos.some(p => p.forma_pagamento === "dinheiro") ? totalInformado - saldo : 0;

  const addLine = () => setNovos([...novos, { valor: "", forma_pagamento: "dinheiro", observacao: "" }]);
  const removeLine = (i) => setNovos(novos.filter((_, x) => x !== i));
  
  const updateLine = (i, k, val) => {
    if (k === "valor") {
      const valNum = parseFloat(val) || 0;
      if (valNum > saldo && novos[i].forma_pagamento !== "dinheiro") {
        toast.error("Troco permitido apenas para pagamentos em dinheiro.");
        return;
      }
    }

    if (k === "forma_pagamento" && val !== "dinheiro") {
      const valNum = parseFloat(novos[i].valor) || 0;
      if (valNum > saldo) {
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

  const executePayment = async (forceSaldo = false) => {
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

    // Ajustar valor em dinheiro caso passe do saldo para registrar apenas o saldo real
    let saldoRestante = saldo;
    let pagamentosAEnviar = [];
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

      pagamentosAEnviar.push({
        valor: valorAEnviar,
        forma_pagamento: p.forma_pagamento,
        observacao: observacao
      });
    }

    const payload = { 
      pagamentos: pagamentosAEnviar, 
      finalizar 
    };
    
    try {
      await http.post(`/vendas-diretas/${id}/pagamentos`, payload);
      
      if (temTroco) {
        toast.success(`Pagamento registrado com sucesso! Devolva o troco de ${fmtBRL(valorTroco)}`);
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
    setPendingAction({ type: 'edit' });
    setPasswordDialogOpen(true);
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 fade-in max-w-4xl w-full overflow-x-hidden">
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

      {/* Itens do carrinho */}
      {Array.isArray(v.itens) && v.itens.length > 1 ? (
        <div className="mt-4 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden shadow-sm">
          <div className="px-4 py-3 bg-zinc-50 dark:bg-zinc-800/50 border-b border-zinc-100 dark:border-zinc-800">
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
        <div className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
          Qtd: <strong className="text-zinc-800 dark:text-zinc-200">{v.quantidade}</strong>
        </div>
      )}

      {/* Resumo Financeiro com Desconto */}
      {temDescontoAplicado ? (
        <div className="my-6 space-y-3">
          {/* Cards: Valor Original → Desconto → Valor a Pagar */}
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 shadow-sm">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6 items-center">
              <div className="text-center sm:text-left">
                <div className="text-[10px] sm:text-xs uppercase tracking-widest font-bold text-zinc-400 dark:text-zinc-500">Valor Original</div>
                <div className="font-display text-xl sm:text-2xl font-black mt-1 text-zinc-500 dark:text-zinc-400 line-through">{fmtBRL(valorOriginalVenda)}</div>
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
                <div className="font-display text-2xl sm:text-3xl font-black mt-1 text-emerald-700 dark:text-emerald-400">{fmtBRL(v.valor_total)}</div>
              </div>
            </div>
          </div>
          {/* Cards menores: Pago / Saldo */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 shadow-sm">
              <div className="text-[10px] sm:text-xs uppercase tracking-widest font-bold text-zinc-400 dark:text-zinc-500">Pago</div>
              <div className="font-display text-xl sm:text-2xl font-black mt-1 text-emerald-600 dark:text-emerald-400">{fmtBRL(v.total_pago)}</div>
            </div>
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 shadow-sm">
              <div className="text-[10px] sm:text-xs uppercase tracking-widest font-bold text-zinc-400 dark:text-zinc-500">Saldo Restante</div>
              <div className={`font-display text-xl sm:text-2xl font-black mt-1 ${saldo > 0.01 ? "text-amber-600 dark:text-amber-500" : "text-emerald-600 dark:text-emerald-400"}`}>{fmtBRL(saldo)}</div>
            </div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 my-6">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 shadow-sm">
            <div className="text-[10px] sm:text-xs uppercase tracking-widest font-bold text-zinc-400 dark:text-zinc-500">Total</div>
            <div className="font-display text-2xl sm:text-3xl font-black mt-1 text-zinc-900 dark:text-zinc-50">{fmtBRL(v.valor_total)}</div>
          </div>
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 shadow-sm">
            <div className="text-[10px] sm:text-xs uppercase tracking-widest font-bold text-zinc-400 dark:text-zinc-500">Pago</div>
            <div className="font-display text-2xl sm:text-3xl font-black mt-1 text-emerald-600 dark:text-emerald-400">{fmtBRL(v.total_pago)}</div>
          </div>
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 shadow-sm">
            <div className="text-[10px] sm:text-xs uppercase tracking-widest font-bold text-zinc-400 dark:text-zinc-500">Saldo</div>
            <div className={`font-display text-2xl sm:text-3xl font-black mt-1 ${saldo > 0.01 ? "text-amber-600 dark:text-amber-500" : "text-emerald-600 dark:text-emerald-400"}`}>{fmtBRL(saldo)}</div>
          </div>
        </div>
      )}

      {/* Seção de Descontos - info do desconto sempre visível, seletor apenas sem pagamentos */}
      {temDescontoAplicado ? (
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 shadow-sm mb-6">
          <h3 className="font-display text-base font-bold mb-3 text-zinc-800 dark:text-zinc-100 flex items-center gap-2">
            🏷️ Desconto Aplicado
          </h3>
          <div className="space-y-3">
            {/* Cabeçalho do desconto aplicado */}
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

            {/* Trocar por outro desconto - só sem pagamentos */}
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
      ) : pagamentos.length === 0 && (
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 shadow-sm mb-6">
          <h3 className="font-display text-base font-bold mb-3 text-zinc-800 dark:text-zinc-100 flex items-center gap-2">
            🏷️ Desconto
          </h3>
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
        </div>
      )}

      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 sm:p-7 mb-6 shadow-sm">
        <h3 className="font-display text-base sm:text-lg font-bold mb-5 text-zinc-800 dark:text-zinc-100">Registrar pagamento</h3>
        <div className="space-y-4">
          {novos.map((p, i) => (
            <div key={i} className="border border-zinc-200 dark:border-zinc-800 sm:border-0 rounded-xl p-4 sm:p-0 bg-zinc-50 dark:bg-zinc-950 sm:bg-transparent sm:dark:bg-transparent space-y-3 sm:space-y-0 sm:grid sm:grid-cols-12 sm:gap-4 sm:items-end relative">
              {novos.length > 1 && (
                <div className="sm:hidden absolute top-2 right-2">
                  <Button size="icon" variant="ghost" className="h-8 w-8 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30" onClick={() => removeLine(i)} disabled={!temPermissaoPagamento}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              )}
              <div className="col-span-3">
                <Label className="text-xs sm:text-sm font-semibold text-zinc-700 dark:text-zinc-300">Valor *</Label>
                <Input 
                  data-testid={`vpay-valor-${i}`} 
                  type="number" 
                  step="0.01" 
                  value={p.valor} 
                  onChange={(e) => updateLine(i, "valor", e.target.value)}
                  placeholder={p.forma_pagamento === "dinheiro" && saldo > 0 ? `Troco se > ${fmtBRL(saldo)}` : "Digite o valor"}
                  className="bg-white dark:bg-zinc-900 sm:bg-zinc-50 sm:dark:bg-zinc-950 border-zinc-300 dark:border-zinc-700 mt-1.5 focus:ring-[#84A59D] font-bold"
                  disabled={!temPermissaoPagamento}
                />
              </div>
              <div className="col-span-4">
                <Label className="text-xs sm:text-sm font-semibold text-zinc-700 dark:text-zinc-300">Forma de Pagamento *</Label>
                <Select value={p.forma_pagamento} onValueChange={(val) => updateLine(i, "forma_pagamento", val)} disabled={!temPermissaoPagamento}>
                  <SelectTrigger data-testid={`vpay-forma-${i}`} className="bg-white dark:bg-zinc-900 sm:bg-zinc-50 sm:dark:bg-zinc-950 border-zinc-300 dark:border-zinc-700 mt-1.5 font-bold" disabled={!temPermissaoPagamento}><SelectValue /></SelectTrigger>
                  <SelectContent className="dark:bg-zinc-900 dark:border-zinc-800">{FORMAS.map((f) => <SelectItem key={f.v} value={f.v} className="dark:focus:bg-zinc-800 dark:text-zinc-200">{f.l}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="col-span-4">
                <Label className="text-xs sm:text-sm font-semibold text-zinc-700 dark:text-zinc-300">Observação</Label>
                <Input 
                  value={p.observacao} 
                  onChange={(e) => updateLine(i, "observacao", e.target.value)}
                  placeholder={p.forma_pagamento === "dinheiro" && Number(p.valor) > saldo ? `Troco: ${fmtBRL(Number(p.valor) - saldo)}` : "Opcional"}
                  className="bg-white dark:bg-zinc-900 sm:bg-zinc-50 sm:dark:bg-zinc-950 border-zinc-300 dark:border-zinc-700 mt-1.5"
                  disabled={!temPermissaoPagamento}
                />
              </div>
              <div className="hidden sm:block col-span-1 text-center">
                {novos.length > 1 && (
                  <Button size="icon" variant="ghost" onClick={() => removeLine(i)} disabled={!temPermissaoPagamento}>
                    <Trash2 className="w-5 h-5 text-rose-500 hover:text-rose-600" />
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Aviso de troco */}
        {trocoTotal > 0 && (
          <div className="mt-5 p-5 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/50 rounded-xl flex items-start gap-4 fade-in animate-pulse-subtle">
            <CheckCircle2 className="w-6 h-6 text-emerald-600 dark:text-emerald-500 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-emerald-900 dark:text-emerald-100">
              <span className="font-bold">Troco calculado:</span>
              <span className="text-xl font-black ml-2 text-emerald-700 dark:text-emerald-400">{fmtBRL(trocoTotal)}</span>
              <p className="text-xs font-medium text-emerald-700 dark:text-emerald-400/80 mt-1.5">
                O valor registrado no sistema será de {fmtBRL(saldo)} (quitando o saldo), e o troco de {fmtBRL(trocoTotal)} deve ser devolvido ao cliente.
              </p>
            </div>
          </div>
        )}

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 mt-6 pt-6 border-t border-zinc-100 dark:border-zinc-800">
          <Button variant="outline" onClick={addLine} className="h-11 justify-center border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 font-bold dark:text-zinc-200" disabled={!temPermissaoPagamento}><Plus className="w-4 h-4 mr-1.5" /> Adicionar forma</Button>
          <Button data-testid="vpay-finish" onClick={executePayment} className="h-11 bg-[#84A59D] hover:bg-[#6F9189] dark:bg-emerald-600 dark:hover:bg-emerald-700 text-white font-bold justify-center shadow-md" disabled={!temPermissaoPagamento}><CheckCircle2 className="w-5 h-5 mr-2" /> Registrar e Finalizar</Button>
        </div>
      </div>

      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl mt-6 shadow-sm overflow-hidden">
        <div className="px-6 py-5 border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50">
          <h3 className="font-display text-lg font-bold text-zinc-800 dark:text-zinc-100">Pagamentos anteriores</h3>
        </div>
        {pagamentos.length === 0 ? <div className="p-8 text-center text-sm font-medium text-zinc-400 dark:text-zinc-500">Nenhum pagamento registrado</div> : (
          <>
            {/* Mobile View */}
            <div className="divide-y divide-zinc-100 dark:divide-zinc-800 sm:hidden">
              {pagamentos.map((p) => (
                <div key={p.id} className="p-5 flex flex-col gap-2 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest">{fmtDT(p.data_hora)}</span>
                    <span className="font-black text-[#3A4F4A] dark:text-emerald-400 text-lg">{fmtBRL(p.valor)}</span>
                  </div>
                  <div className="text-sm font-bold text-zinc-800 dark:text-zinc-200">
                    {FORMAS.find((f) => f.v === p.forma_pagamento)?.l || p.forma_pagamento}
                  </div>
                  {p.observacao && (
                    <div className="text-xs text-zinc-600 dark:text-zinc-400 italic bg-zinc-50 dark:bg-zinc-950 p-3 rounded-xl mt-1 border border-zinc-100 dark:border-zinc-800">
                      "{p.observacao}"
                    </div>
                  )}
                  <div className="flex items-center justify-end gap-2 border-t border-zinc-100 dark:border-zinc-800 pt-3 mt-2">
                    <Button size="sm" variant="outline" className="h-9 border-zinc-200 dark:border-zinc-700 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-900/30" onClick={() => startDelete(p.id)}>
                      <Trash2 className="w-4 h-4 mr-1.5" /> Excluir
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop View */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-zinc-50 dark:bg-zinc-950 text-xs uppercase tracking-widest font-bold text-zinc-500 dark:text-zinc-400 border-b border-zinc-100 dark:border-zinc-800">
                  <tr>
                    <th className="px-6 py-4 text-left">Data</th>
                    <th className="px-6 py-4 text-left">Forma</th>
                    <th className="px-6 py-4 text-right">Valor</th>
                    <th className="px-6 py-4 text-left">Observação</th>
                    <th className="px-6 py-4 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                  {pagamentos.map((p) => (
                    <tr key={p.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors">
                      <td className="px-6 py-4 text-zinc-700 dark:text-zinc-300 font-medium">{fmtDT(p.data_hora)}</td>
                      <td className="px-6 py-4 text-zinc-900 dark:text-zinc-100 font-bold">{FORMAS.find((f) => f.v === p.forma_pagamento)?.l || p.forma_pagamento}</td>
                      <td className="px-6 py-4 text-right font-black text-[#3A4F4A] dark:text-emerald-400">{fmtBRL(p.valor)}</td>
                      <td className="px-6 py-4 text-sm text-zinc-600 dark:text-zinc-400 italic">{p.observacao}</td>
                      <td className="px-6 py-4 text-right space-x-2">
                        <Button size="icon" variant="ghost" onClick={() => startDelete(p.id)} className="hover:bg-rose-50 dark:hover:bg-rose-900/30">
                          <Trash2 className="w-4 h-4 text-rose-500 dark:text-rose-400" />
                        </Button>
                      </td>
                    </tr>
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
