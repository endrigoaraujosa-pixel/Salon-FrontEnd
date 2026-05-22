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
  const [ag, setAg] = useState(null);
  const [novos, setNovos] = useState([{ valor: "", forma_pagamento: "dinheiro", observacao: "" }]);
  
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

  const load = () => http.get(`/agendamentos/${id}`).then((r) => setAg(r.data));
  useEffect(() => { 
    load(); 
    http.get("/colaboradores").then((r) => setColaboradores(r.data)).catch(() => {});
  }, [id]);

  if (!ag) return <div className="p-8 text-zinc-400">Carregando...</div>;
  const saldo = (ag.valor_total || 0) - (ag.total_pago || 0);
  const totalInformado = novos.filter((p) => Number(p.valor) > 0).reduce((sum, p) => sum + Number(p.valor), 0);
  const trocoTotal = totalInformado > saldo && novos.some(p => p.forma_pagamento === "dinheiro") ? totalInformado - saldo : 0;

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
      await http.post(`/agendamentos/${id}/pagamentos`, payload);
      
      if (temTroco) {
        toast.success(`Pagamento registrado com sucesso! Devolva o troco de ${fmtBRL(valorTroco)}`);
      } else {
        toast.success(finalizar ? "Atendimento finalizado com sucesso!" : `Pagamento registrado! Restante pendente: ${fmtBRL(saldo - totalInformado)}`);
      }
      
      if (finalizar) nav("/agenda"); 
      else { 
        setNovos([{ valor: "", forma_pagamento: "dinheiro", observacao: "" }]); 
        load(); 
      }
    } catch (e) { 
      toast.error(e.response?.data?.detail || "Erro ao registrar pagamento"); 
    }
  };

  const submit = async (forceSaldo = false) => {
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
          observacao: editingPayment.observacao || ""
        },
        { params: { password } }
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
        { params: { email, password } }
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
    openEditDialog(payment);
  };

  // Iniciar processo de deleção
  const startDelete = (paymentId) => {
    setPendingAction({ type: 'delete', paymentId });
    setPasswordDialogOpen(true);
  };

  // Salvar edição (abre dialog de senha)
  const saveEdit = () => {
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

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 my-6">
        <div className="bg-white border border-zinc-200 rounded-xl p-4 sm:p-5">
          <div className="text-[10px] sm:text-xs uppercase tracking-wider text-zinc-400">Total</div>
          <div className="font-display text-2xl sm:text-3xl font-semibold mt-1">{fmtBRL(ag.valor_total)}</div>
        </div>
        <div className="bg-white border border-zinc-200 rounded-xl p-4 sm:p-5">
          <div className="text-[10px] sm:text-xs uppercase tracking-wider text-zinc-400">Pago</div>
          <div className="font-display text-2xl sm:text-3xl font-semibold mt-1 text-emerald-600">{fmtBRL(ag.total_pago)}</div>
        </div>
        <div className="bg-white border border-zinc-200 rounded-xl p-4 sm:p-5">
          <div className="text-[10px] sm:text-xs uppercase tracking-wider text-zinc-400">Saldo</div>
          <div className={`font-display text-2xl sm:text-3xl font-semibold mt-1 ${saldo > 0.01 ? "text-amber-600" : "text-emerald-600"}`}>{fmtBRL(saldo)}</div>
        </div>
      </div>

      <div className="bg-white border border-zinc-200 rounded-xl p-4 sm:p-6 mb-6">
        <h3 className="font-display text-base sm:text-lg font-medium mb-4">Registrar pagamento</h3>
        <div className="space-y-4">
          {novos.map((p, i) => (
            <div key={i} className="border border-zinc-150 sm:border-0 rounded-xl p-4 sm:p-0 bg-zinc-50/50 sm:bg-transparent space-y-3 sm:space-y-0 sm:grid sm:grid-cols-12 sm:gap-2 sm:items-end relative">
              {novos.length > 1 && (
                <div className="sm:hidden absolute top-2 right-2">
                  <Button size="icon" variant="ghost" className="h-8 w-8 text-rose-500 hover:bg-rose-50" onClick={() => removeLine(i)}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              )}
              <div className="col-span-3">
                <Label className="text-xs sm:text-sm">Valor</Label>
                <Input 
                  data-testid={`pay-valor-${i}`} 
                  type="number" 
                  step="0.01" 
                  value={p.valor} 
                  onChange={(e) => updateLine(i, "valor", e.target.value)}
                  placeholder={p.forma_pagamento === "dinheiro" && saldo > 0 ? `Troco se > ${fmtBRL(saldo)}` : "Digite o valor"}
                  className="bg-white sm:bg-transparent mt-1"
                />
              </div>
              <div className="col-span-4">
                <Label className="text-xs sm:text-sm">Forma</Label>
                <Select value={p.forma_pagamento} onValueChange={(v) => updateLine(i, "forma_pagamento", v)}>
                  <SelectTrigger data-testid={`pay-forma-${i}`} className="bg-white sm:bg-transparent mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>{FORMAS.map((f) => <SelectItem key={f.v} value={f.v}>{f.l}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="col-span-4">
                <Label className="text-xs sm:text-sm">Observação</Label>
                <Input 
                  value={p.observacao} 
                  onChange={(e) => updateLine(i, "observacao", e.target.value)}
                  placeholder={p.forma_pagamento === "dinheiro" && Number(p.valor) > saldo ? `Troco: ${fmtBRL(Number(p.valor) - saldo)}` : ""}
                  className="bg-white sm:bg-transparent mt-1"
                />
              </div>
              <div className="hidden sm:block col-span-1 text-center">
                {novos.length > 1 && (
                  <Button size="icon" variant="ghost" onClick={() => removeLine(i)}>
                    <Trash2 className="w-4 h-4 text-rose-500" />
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
        
        {/* Aviso de troco */}
        {trocoTotal > 0 && (
          <div className="mt-4 p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-start gap-3 fade-in animate-pulse-subtle">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-emerald-800">
              <span className="font-semibold">Troco calculado:</span>
              <span className="text-lg font-bold ml-2 text-emerald-700">{fmtBRL(trocoTotal)}</span>
              <p className="text-xs text-emerald-600 mt-1">O valor registrado no sistema será de {fmtBRL(saldo)} (quitando o saldo), e o troco de {fmtBRL(trocoTotal)} deve ser devolvido ao cliente.</p>
            </div>
          </div>
        )}
        
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 mt-6">
          <Button variant="outline" size="sm" onClick={addLine} className="justify-center"><Plus className="w-3 h-3 mr-1" /> Adicionar forma</Button>
          <Button data-testid="pay-finish-btn" onClick={submit} className="bg-[#84A59D] hover:bg-[#6F9189] justify-center"><CheckCircle2 className="w-4 h-4 mr-1" /> Registrar e Finalizar</Button>
        </div>
      </div>

      <div className="bg-white border border-zinc-200 rounded-xl">
        <div className="px-6 py-4 border-b border-zinc-100"><h3 className="font-display text-lg font-medium">Pagamentos anteriores</h3></div>
        {ag.pagamentos.length === 0 ? <div className="p-6 text-center text-sm text-zinc-400">Nenhum pagamento</div> : (
          <>
            {/* Mobile View */}
            <div className="divide-y divide-zinc-100 sm:hidden">
              {ag.pagamentos.map((p) => (
                <div key={p.id} className="p-4 flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-zinc-400">{fmtDT(p.data_hora)}</span>
                    <span className="font-semibold text-[#3A4F4A]">{fmtBRL(p.valor)}</span>
                  </div>
                  <div className="text-sm font-medium text-zinc-800">
                    {FORMAS.find((f) => f.v === p.forma_pagamento)?.l || p.forma_pagamento}
                  </div>
                  {p.observacao && (
                    <div className="text-xs text-zinc-500 italic bg-zinc-50 p-2 rounded-lg mt-1">
                      "{p.observacao}"
                    </div>
                  )}
                  <div className="flex items-center justify-end gap-2 border-t border-zinc-50 pt-2 mt-1">
                    <Button size="sm" variant="outline" className="h-8 border-zinc-200 text-blue-600 hover:bg-blue-50" onClick={() => startEdit(p)}>
                      <Edit2 className="w-3.5 h-3.5 mr-1" /> Editar
                    </Button>
                    <Button size="sm" variant="outline" className="h-8 border-zinc-200 text-rose-600 hover:bg-rose-50" onClick={() => startDelete(p.id)}>
                      <Trash2 className="w-3.5 h-3.5 mr-1" /> Excluir
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop View */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-zinc-50 text-xs uppercase tracking-wider text-zinc-500"><tr><th className="px-4 py-3 text-left">Data</th><th className="px-4 py-3 text-left">Forma</th><th className="px-4 py-3 text-right">Valor</th><th className="px-4 py-3 text-left">Observação</th><th className="px-4 py-3 text-right">Ações</th></tr></thead>
                <tbody className="divide-y divide-zinc-100">
                  {ag.pagamentos.map((p) => (
                    <tr key={p.id}><td className="px-4 py-3 text-zinc-700">{fmtDT(p.data_hora)}</td><td className="px-4 py-3">{FORMAS.find((f) => f.v === p.forma_pagamento)?.l || p.forma_pagamento}</td><td className="px-4 py-3 text-right font-medium">{fmtBRL(p.valor)}</td><td className="px-4 py-3 text-sm text-zinc-600">{p.observacao}</td><td className="px-4 py-3 text-right space-x-2"><Button size="icon" variant="ghost" onClick={() => startEdit(p)}><Edit2 className="w-4 h-4 text-blue-500" /></Button><Button size="icon" variant="ghost" onClick={() => startDelete(p.id)}><Trash2 className="w-4 h-4 text-rose-500" /></Button></td></tr>
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
    </div>
  );
}
