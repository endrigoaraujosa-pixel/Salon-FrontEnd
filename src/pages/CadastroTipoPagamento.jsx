import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import http from "../api";
import { PageHeader } from "../components/Page";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Card } from "../components/ui/card";
import { Switch } from "../components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "../components/ui/dialog";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "../components/ui/select";
import { 
  AlertCircle, CheckCircle2, CreditCard, Info, Coins, QrCode, NotebookPen, Landmark, ArrowLeft, Plus, Edit2, Trash2, Calendar
} from "lucide-react";
import { toast } from "sonner";

const FORMAS_ESTATICAS = [
  { v: "dinheiro", l: "Dinheiro", desc: "Recebimentos em espécie. Sem taxas adicionais.", icon: Coins, color: "text-emerald-500", bgColor: "bg-emerald-50 dark:bg-emerald-950/20" },
  { v: "pix", l: "Pix", desc: "Transferências instantâneas via chave Pix. Sem taxas adicionais.", icon: QrCode, color: "text-blue-500", bgColor: "bg-blue-50 dark:bg-blue-950/20" },
  { v: "fiado", l: "Fiado (Conta Cliente)", desc: "Venda a prazo para acerto posterior no saldo do cliente.", icon: NotebookPen, color: "text-amber-500", bgColor: "bg-amber-50 dark:bg-amber-950/20" }
];

const blankRate = {
  forma_pagamento: "",
  tipo_cartao: "credito",
  adquirente_id: "",
  descricao: "",
  dias_recebimento: 30,
  ativo: true,
  percentual: 0,
  bandeira: "",
  taxa_1x: 0,
  taxa_2x: 0,
  taxa_3x: 0,
  taxa_4x: 0,
  taxa_5x: 0,
  taxa_6x: 0,
  taxa_7x: 0,
  taxa_8x: 0,
  taxa_9x: 0,
  taxa_10x: 0,
  taxa_11x: 0,
  taxa_12x: 0
};

export default function CadastroTipoPagamento() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  
  const [adquirentes, setAdquirentes] = useState([]);
  const [taxas, setTaxas] = useState([]);
  
  // Modal states
  const [modalOpen, setModalOpen] = useState(false);
  const [modalForm, setModalForm] = useState(blankRate);
  const [savingRate, setSavingRate] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deletingKey, setDeletingKey] = useState(null);

  // Generic mode edit state (for retrocompatibility)
  const [genericTaxas, setGenericTaxas] = useState([]);
  const [savingGeneric, setSavingGeneric] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const [rAdq, rTaxas] = await Promise.all([
        http.get("/adquirentes?ativo=true"),
        http.get("/configuracoes/taxas-cartao")
      ]);
      setAdquirentes(rAdq.data);
      setTaxas(rTaxas.data);

      // Mapeia taxas genéricas atuais se houver
      const gen = rTaxas.data.filter(t => t.forma_pagamento === "cartao_credito" || t.forma_pagamento === "cartao_debito");
      setGenericTaxas(gen);
    } catch (e) {
      toast.error("Erro ao carregar configurações de pagamento");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Abre modal de criação
  const handleNewRate = () => {
    setModalForm({
      ...blankRate,
      adquirente_id: adquirentes[0]?.id || ""
    });
    setModalOpen(true);
  };

  // Preenche descrição padrão com base em adquirente, tipo e bandeira
  useEffect(() => {
    if (modalOpen && !modalForm.forma_pagamento) {
      const adq = adquirentes.find(a => a.id === modalForm.adquirente_id);
      if (adq) {
        const tipoLabel = modalForm.tipo_cartao === "credito" ? "Cartão de Crédito" : "Cartão de Débito";
        const brandSuffix = modalForm.bandeira ? ` (${modalForm.bandeira.toUpperCase()})` : '';
        setModalForm(prev => ({
          ...prev,
          descricao: `${tipoLabel} - ${adq.descricao}${brandSuffix}`
        }));
      }
    }
  }, [modalForm.adquirente_id, modalForm.tipo_cartao, modalForm.bandeira, modalOpen]);

  // Edita forma de pagamento de cartão
  const handleEditRate = (rate) => {
    setModalForm({
      ...rate,
      bandeira: rate.bandeira || "",
      percentual: rate.percentual || 0,
      taxa_1x: rate.taxa_1x || 0,
      taxa_2x: rate.taxa_2x || 0,
      taxa_3x: rate.taxa_3x || 0,
      taxa_4x: rate.taxa_4x || 0,
      taxa_5x: rate.taxa_5x || 0,
      taxa_6x: rate.taxa_6x || 0,
      taxa_7x: rate.taxa_7x || 0,
      taxa_8x: rate.taxa_8x || 0,
      taxa_9x: rate.taxa_9x || 0,
      taxa_10x: rate.taxa_10x || 0,
      taxa_11x: rate.taxa_11x || 0,
      taxa_12x: rate.taxa_12x || 0
    });
    setOpenModal();
  };

  const setOpenModal = () => {
    setModalOpen(true);
  };

  // Salva taxa/forma de pagamento customizada
  const saveRate = async () => {
    if (!modalForm.descricao || !modalForm.descricao.trim()) {
      return toast.error("Descrição da forma de pagamento é obrigatória.");
    }
    if (!modalForm.adquirente_id) {
      return toast.error("Selecione uma adquirente para vincular.");
    }
    if (modalForm.dias_recebimento === undefined || modalForm.dias_recebimento === "" || parseInt(modalForm.dias_recebimento) < 0) {
      return toast.error("Prazo de recebimento inválido.");
    }

    setSavingRate(true);
    try {
      await http.post("/configuracoes/taxas-cartao", modalForm);
      toast.success("Forma de pagamento de cartão salva com sucesso!");
      setModalOpen(false);
      loadData();
    } catch (e) {
      toast.error(e.response?.data?.detail || "Erro ao salvar forma de pagamento");
    } finally {
      setSavingRate(false);
    }
  };

  // Inicia exclusão
  const handleDeleteRate = (key) => {
    setDeletingKey(key);
    setDeleteConfirmOpen(true);
  };

  // Confirma exclusão lógica
  const confirmDeleteRate = async () => {
    if (!deletingKey) return;
    try {
      await http.delete(`/configuracoes/taxas-cartao/${deletingKey}`);
      toast.success("Forma de pagamento de cartão arquivada");
      setDeleteConfirmOpen(false);
      setDeletingKey(null);
      loadData();
    } catch (e) {
      toast.error(e.response?.data?.detail || "Erro ao excluir");
    }
  };

  // Salva taxas genéricas (modo retrocompatibilidade)
  const saveGenericTaxas = async () => {
    setSavingGeneric(true);
    try {
      for (const taxa of genericTaxas) {
        await http.post("/configuracoes/taxas-cartao", {
          forma_pagamento: taxa.forma_pagamento,
          percentual: taxa.percentual,
          ativo: taxa.ativo,
          dias_recebimento: taxa.dias_recebimento,
          tipo_cartao: taxa.forma_pagamento === "cartao_credito" ? "credito" : "debito",
          taxa_1x: taxa.forma_pagamento === "cartao_credito" ? taxa.percentual : 0
        });
      }
      toast.success("Taxas genéricas salvas com sucesso!");
      loadData();
    } catch (e) {
      toast.error(e.response?.data?.detail || "Erro ao salvar taxas");
    } finally {
      setSavingGeneric(false);
    }
  };

  const updateGenericField = (forma, field, val) => {
    setGenericTaxas(genericTaxas.map(t => 
      t.forma_pagamento === forma 
        ? { ...t, [field]: field === "percentual" ? parseFloat(val) || 0 : parseInt(val) || 0 }
        : t
    ));
  };

  if (loading) return <div className="p-8 text-zinc-400">Carregando tipos de pagamento...</div>;

  const temAdquirentes = adquirentes.length > 0;
  const customRates = taxas.filter(t => t.adquirente_id !== null && t.forma_pagamento !== "cartao_credito" && t.forma_pagamento !== "cartao_debito");

  return (
    <div className="p-6 lg:p-8 fade-in min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-800 dark:text-zinc-200">
      {/* Back Button */}
      <Button 
        variant="ghost" 
        onClick={() => navigate("/cadastros")} 
        className="mb-4 text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
      >
        <ArrowLeft className="w-4 h-4 mr-1" /> Voltar para Cadastros
      </Button>

      <PageHeader 
        overline="Cadastros" 
        title="Formas e Tipos de Pagamento" 
      />

      <div className="space-y-6 mt-6">
        <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900/60 rounded-xl p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-blue-700 dark:text-blue-450 leading-relaxed">
            <strong>Instruções de Configuração:</strong> Gerencie os meios de pagamento recebidos no salão. Caso possua adquirentes (maquinetas) configuradas, você poderá criar formas específicas para cada maquineta (ex: "Crédito - Stone") com suas taxas individuais.
          </div>
        </div>

        {/* 1. Formas de Pagamento Estáticas (Dinheiro, Pix, Fiado) */}
        <div>
          <h2 className="font-display font-bold text-xl mb-4 text-zinc-900 dark:text-zinc-100">
            Formas de Pagamento Padrão
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {FORMAS_ESTATICAS.map((forma) => (
              <Card key={forma.v} className="p-6 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl flex flex-col justify-between shadow-sm">
                <div className="flex items-start gap-3">
                  <div className={`p-3 rounded-xl ${forma.bgColor} ${forma.color}`}>
                    <forma.icon className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-display font-bold text-base text-zinc-900 dark:text-zinc-50">
                      {forma.l}
                    </h3>
                    <p className="text-xs text-zinc-450 mt-1 leading-relaxed">
                      {forma.desc}
                    </p>
                  </div>
                </div>
                <div className="mt-4 pt-4 border-t border-zinc-100 dark:border-zinc-800 flex justify-between text-xs text-zinc-500">
                  <span>Taxa Cobrada: <strong>0.00%</strong></span>
                  <span>Recebimento: <strong>Imediato</strong></span>
                </div>
              </Card>
            ))}
          </div>
        </div>

        {/* 2. Configurações de Cartões por Adquirente (Maquineta) */}
        <div className="border-t border-zinc-200 dark:border-zinc-800 pt-6">
          {temAdquirentes ? (
            // A. Modo Ativo de Adquirentes
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="font-display font-bold text-xl text-zinc-900 dark:text-zinc-100">
                    Formas de Cartão por Adquirente
                  </h2>
                  <p className="text-xs text-zinc-500 mt-1">
                    Crie formas individuais para cada maquineta vinculada aos adquirentes cadastrados.
                  </p>
                </div>
                <Button 
                  onClick={handleNewRate}
                  className="bg-[#84A59D] hover:bg-[#6F9189] text-white font-bold h-9 px-4 rounded-lg text-xs"
                >
                  <Plus className="w-4.5 h-4.5 mr-1" /> Nova Forma de Cartão
                </Button>
              </div>

              {customRates.length === 0 ? (
                <Card className="p-8 text-center text-zinc-400 bg-white dark:bg-zinc-900 border border-zinc-150 border-dashed rounded-2xl">
                  Nenhuma forma de cartão configurada por adquirente. Clique no botão acima para adicionar!
                </Card>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {customRates.map((rate) => {
                    const adqName = adquirentes.find(a => a.id === rate.adquirente_id)?.descricao || "Não vinculada";
                    const isCredito = rate.tipo_cartao === "credito";
                    
                    return (
                      <Card key={rate.forma_pagamento} className="p-6 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-850 rounded-2xl flex flex-col justify-between shadow-sm relative group">
                        <div>
                          <div className="flex items-start justify-between">
                            <div>
                              <h3 className="font-display font-bold text-lg text-zinc-900 dark:text-zinc-50">
                                {rate.descricao}
                              </h3>
                              <div className="flex items-center gap-2 mt-1">
                                <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                                  isCredito 
                                    ? "bg-indigo-50 text-indigo-700 dark:bg-indigo-950/30 dark:text-indigo-400" 
                                    : "bg-violet-50 text-violet-700 dark:bg-violet-950/30 dark:text-violet-400"
                                }`}>
                                  {isCredito ? "Crédito" : "Débito"}
                                </span>
                                {rate.bandeira && (
                                  <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-orange-50 text-orange-700 dark:bg-orange-950/30 dark:text-orange-400">
                                    {rate.bandeira}
                                  </span>
                                )}
                                <span className="text-xs text-zinc-500">
                                  Maquineta: <strong>{adqName}</strong>
                                </span>
                              </div>
                            </div>
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                              rate.ativo 
                                ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-400" 
                                : "bg-zinc-150 text-zinc-650 dark:bg-zinc-800 dark:text-zinc-400"
                            }`}>
                              {rate.ativo ? "Ativa" : "Inativa"}
                            </span>
                          </div>

                          <div className="mt-4 pt-4 border-t border-zinc-100 dark:border-zinc-800 space-y-2 text-xs">
                            <div className="flex justify-between text-zinc-500">
                              <span>Prazo de recebimento:</span>
                              <span className="font-bold text-zinc-800 dark:text-zinc-200">{rate.dias_recebimento} dias</span>
                            </div>
                            {isCredito ? (
                              <div className="flex justify-between text-zinc-500">
                                <span>Taxas de Parcelamento:</span>
                                <span className="font-bold text-zinc-800 dark:text-zinc-200">1x: {rate.taxa_1x?.toFixed(2)}% | 2x: {rate.taxa_2x?.toFixed(2)}% | 3x: {rate.taxa_3x?.toFixed(2)}% {rate.taxa_4x > 0 ? "..." : ""}</span>
                              </div>
                            ) : (
                              <div className="flex justify-between text-zinc-500">
                                <span>Taxa Débito Única:</span>
                                <span className="font-bold text-emerald-600 dark:text-emerald-500">{rate.percentual?.toFixed(2)}%</span>
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center justify-end gap-2 mt-6 pt-4 border-t border-zinc-100 dark:border-zinc-800">
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => handleEditRate(rate)}
                            className="h-8 w-8 text-zinc-500 hover:bg-zinc-50 dark:hover:bg-zinc-800 hover:text-zinc-700 dark:hover:text-zinc-200"
                          >
                            <Edit2 className="w-4 h-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => handleDeleteRate(rate.forma_pagamento)}
                            className="h-8 w-8 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/20"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </Card>
                    );
                  })}
                </div>
              )}
            </div>
          ) : (
            // B. Modo Retrocompatibilidade (Se não houver nenhuma adquirente)
            <div className="space-y-4">
              <h2 className="font-display font-bold text-xl text-zinc-900 dark:text-zinc-100">
                Taxas Gerais de Cartão (Sem Adquirente)
              </h2>
              <p className="text-sm text-zinc-500 max-w-xl">
                Nenhuma adquirente ativa foi cadastrada. O sistema está operando no modo de compatibilidade com taxas fixas gerais para cartões de crédito e débito.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
                {genericTaxas.map((taxa) => {
                  const isCredit = taxa.forma_pagamento === "cartao_credito";
                  return (
                    <Card key={taxa.forma_pagamento} className="p-6 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl flex flex-col justify-between shadow-sm">
                      <div>
                        <div className="flex items-center justify-between">
                          <h3 className="font-display font-bold text-lg text-zinc-900 dark:text-zinc-50">
                            {isCredit ? "Cartão de Crédito Geral" : "Cartão de Débito Geral"}
                          </h3>
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-300">
                            Geral
                          </span>
                        </div>
                        <p className="text-xs text-zinc-450 mt-2 leading-relaxed">
                          {isCredit ? "Pagamentos em crédito com taxa fixa geral." : "Pagamentos em débito com taxa fixa geral."}
                        </p>

                        <div className="mt-6 space-y-4 pt-4 border-t border-zinc-100 dark:border-zinc-800">
                          <div className="flex items-center justify-between gap-4">
                            <div>
                              <Label htmlFor={`taxa-${taxa.forma_pagamento}`} className="text-xs font-bold text-zinc-550 dark:text-zinc-450 uppercase tracking-wider">
                                Taxa (%)
                              </Label>
                            </div>
                            <div className="flex items-center gap-2">
                              <Input
                                id={`taxa-${taxa.forma_pagamento}`}
                                type="number"
                                step="0.01"
                                min="0"
                                max="100"
                                value={taxa.percentual}
                                onChange={(e) => updateGenericField(taxa.forma_pagamento, "percentual", e.target.value)}
                                className="w-24 text-right bg-zinc-50 dark:bg-zinc-950 border-zinc-200 rounded-lg text-sm font-bold"
                              />
                              <span className="text-base font-bold text-zinc-500">%</span>
                            </div>
                          </div>

                          <div className="flex items-center justify-between gap-4">
                            <div>
                              <Label htmlFor={`prazo-${taxa.forma_pagamento}`} className="text-xs font-bold text-zinc-550 dark:text-zinc-450 uppercase tracking-wider">
                                Prazo de Recebimento (dias)
                              </Label>
                            </div>
                            <div className="flex items-center gap-2">
                              <Input
                                id={`prazo-${taxa.forma_pagamento}`}
                                type="number"
                                min="0"
                                value={taxa.dias_recebimento || 0}
                                onChange={(e) => updateGenericField(taxa.forma_pagamento, "dias_recebimento", e.target.value)}
                                className="w-24 text-right bg-zinc-50 dark:bg-zinc-950 border-zinc-200 rounded-lg text-sm font-bold"
                              />
                              <span className="text-xs font-semibold text-zinc-500">dias</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>

              {genericTaxas.length > 0 && (
                <div className="flex justify-end gap-3 pt-4">
                  <Button 
                    onClick={saveGenericTaxas} 
                    disabled={savingGeneric}
                    className="bg-[#84A59D] hover:bg-[#6F9189] text-white h-10 px-6 text-sm rounded-lg font-bold transition-all shadow-sm"
                  >
                    {savingGeneric ? "Salvando..." : "Salvar Configurações Gerais"}
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Modal Cadastro/Edição custom taxas */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 overflow-y-auto max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="font-display font-bold text-xl text-zinc-900 dark:text-zinc-50 flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-indigo-500" />
              {modalForm.forma_pagamento ? "Editar Forma de Pagamento de Cartão" : "Nova Forma de Pagamento de Cartão"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Adquirente */}
              <div className="space-y-1.5">
                <Label htmlFor="modal-adquirente" className="text-xs font-bold uppercase tracking-wider text-zinc-550">Adquirente *</Label>
                <Select
                  value={modalForm.adquirente_id}
                  onValueChange={(val) => setModalForm({ ...modalForm, adquirente_id: val })}
                  disabled={!!modalForm.forma_pagamento}
                >
                  <SelectTrigger id="modal-adquirente" className="bg-zinc-50 dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 rounded-lg text-sm">
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    {adquirentes.map((a) => (
                      <SelectItem key={a.id} value={a.id}>{a.descricao}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Tipo Cartao */}
              <div className="space-y-1.5">
                <Label htmlFor="modal-tipo" className="text-xs font-bold uppercase tracking-wider text-zinc-550">Tipo *</Label>
                <Select
                  value={modalForm.tipo_cartao}
                  onValueChange={(val) => setModalForm({ ...modalForm, tipo_cartao: val })}
                  disabled={!!modalForm.forma_pagamento}
                >
                  <SelectTrigger id="modal-tipo" className="bg-zinc-50 dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 rounded-lg text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="credito">Crédito</SelectItem>
                    <SelectItem value="debito">Débito</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Bandeira */}
              <div className="space-y-1.5">
                <Label htmlFor="modal-bandeira" className="text-xs font-bold uppercase tracking-wider text-zinc-550">Bandeira (Opcional)</Label>
                <Select
                  value={modalForm.bandeira || "padrao"}
                  onValueChange={(val) => setModalForm({ ...modalForm, bandeira: val === "padrao" ? "" : val })}
                  disabled={!!modalForm.forma_pagamento}
                >
                  <SelectTrigger id="modal-bandeira" className="bg-zinc-50 dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 rounded-lg text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="padrao">Padrão (Sem Bandeira)</SelectItem>
                    <SelectItem value="visa">Visa</SelectItem>
                    <SelectItem value="mastercard">Mastercard</SelectItem>
                    <SelectItem value="elo">Elo</SelectItem>
                    <SelectItem value="amex">Amex</SelectItem>
                    <SelectItem value="hipercard">Hipercard</SelectItem>
                    <SelectItem value="outra">Outra</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Descricao */}
            <div className="space-y-1.5">
              <Label htmlFor="modal-descricao" className="text-xs font-bold uppercase tracking-wider text-zinc-550">Descrição Amigável *</Label>
              <Input
                id="modal-descricao"
                placeholder="Ex: Cartão de Crédito - Stone"
                value={modalForm.descricao}
                onChange={(e) => setFormDesc(e.target.value)}
                className="bg-zinc-50 dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 rounded-lg text-sm"
              />
            </div>

            {/* Prazo de Recebimento */}
            <div className="space-y-1.5">
              <Label htmlFor="modal-prazo" className="text-xs font-bold uppercase tracking-wider text-zinc-550">Prazo de Recebimento (dias) *</Label>
              <Input
                id="modal-prazo"
                type="number"
                min="0"
                value={modalForm.dias_recebimento}
                onChange={(e) => setModalForm({ ...modalForm, dias_recebimento: e.target.value === "" ? "" : parseInt(e.target.value) || 0 })}
                className="bg-zinc-50 dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 rounded-lg text-sm"
              />
            </div>

            {/* Ativo status */}
            <div className="flex items-center justify-between bg-zinc-50 dark:bg-zinc-955 p-3 rounded-xl border border-zinc-150 dark:border-zinc-800/80">
              <div>
                <Label htmlFor="modal-ativo" className="text-xs font-bold uppercase tracking-wider text-zinc-555">Forma Ativa</Label>
                <p className="text-[11px] text-zinc-500">Se desativada, não poderá ser usada para novos recebimentos.</p>
              </div>
              <Switch
                id="modal-ativo"
                checked={modalForm.ativo}
                onCheckedChange={(checked) => setModalForm({ ...modalForm, ativo: checked })}
              />
            </div>

            {/* Taxas Config Section */}
            <div className="border-t border-zinc-100 dark:border-zinc-800 pt-4 mt-2">
              <h4 className="text-sm font-bold mb-2 text-zinc-700 dark:text-zinc-300">Configuração de Taxas (%)</h4>
              
              {modalForm.tipo_cartao === "debito" ? (
                <div className="flex items-center justify-between gap-4 bg-zinc-50 dark:bg-zinc-950 p-4 rounded-xl border border-zinc-200 dark:border-zinc-850">
                  <div>
                    <Label htmlFor="modal-taxa-debito" className="text-sm font-semibold">Taxa Débito Única *</Label>
                    <p className="text-xs text-zinc-500">Percentual cobrado para transação em débito.</p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Input
                      id="modal-taxa-debito"
                      type="number"
                      step="0.01"
                      min="0"
                      max="100"
                      value={modalForm.percentual}
                      onChange={(e) => setModalForm({ ...modalForm, percentual: parseFloat(e.target.value) || 0 })}
                      className="w-24 text-right bg-white dark:bg-zinc-900 border-zinc-200 rounded-lg text-sm"
                    />
                    <span className="text-base font-bold text-zinc-500">%</span>
                  </div>
                </div>
              ) : (
                // Crédito - Tabular rates
                <div className="space-y-3">
                  <p className="text-xs text-zinc-500 mb-2">Configure o percentual cobrado para cada número de parcelas (1x a 12x).</p>
                  <div className="border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden shadow-xs">
                    <div className="grid grid-cols-2 bg-zinc-100 dark:bg-zinc-800/80 text-xs font-bold text-zinc-650 p-2.5 border-b border-zinc-200 dark:border-zinc-800">
                      <div>Parcela</div>
                      <div className="text-right">Taxa (%)</div>
                    </div>
                    <div className="divide-y divide-zinc-150 dark:divide-zinc-800 max-h-[220px] overflow-y-auto">
                      {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((i) => {
                        const key = `taxa_${i}x`;
                        return (
                          <div key={i} className="grid grid-cols-2 items-center p-2 text-sm bg-white dark:bg-zinc-900">
                            <span className="font-semibold text-zinc-700 dark:text-zinc-300">{i}x {i === 1 && " (À Vista) *"}</span>
                            <div className="flex items-center justify-end gap-1.5">
                              <Input
                                type="number"
                                step="0.01"
                                min="0"
                                max="100"
                                value={modalForm[key]}
                                onChange={(e) => updateModalTaxaField(key, e.target.value)}
                                className="w-20 text-right bg-zinc-50 dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 rounded-lg text-xs"
                              />
                              <span className="text-xs font-bold text-zinc-500">%</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setModalOpen(false)} className="h-10 text-sm rounded-lg">
              Cancelar
            </Button>
            <Button
              onClick={saveRate}
              disabled={savingRate}
              className="bg-[#84A59D] hover:bg-[#6F9189] text-white font-bold h-10 px-6 rounded-lg"
            >
              {savingRate ? "Salvando..." : "Salvar Configuração"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete rate dialog */}
      <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <DialogContent className="max-w-md bg-white dark:bg-zinc-900 border border-zinc-200 p-6 rounded-2xl">
          <DialogHeader>
            <DialogTitle className="font-display font-bold text-lg text-zinc-900 flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-rose-500" />
              Arquivar Forma de Pagamento
            </DialogTitle>
          </DialogHeader>

          <div className="py-4 text-sm text-zinc-550 leading-relaxed">
            <p>Tem certeza de que deseja remover esta configuração de cartão?</p>
            <p className="mt-2 text-xs text-zinc-400">
              Ela não aparecerá mais nos checkouts. Vendas e relatórios anteriores que usaram este método não sofrerão alterações.
            </p>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDeleteConfirmOpen(false)} className="h-10 text-sm rounded-lg">
              Cancelar
            </Button>
            <Button
              onClick={confirmDeleteRate}
              className="bg-rose-500 hover:bg-rose-600 text-white font-bold h-10 px-6 rounded-lg"
            >
              Excluir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );

  function setFormDesc(desc) {
    setModalForm({ ...modalForm, descricao: desc });
  }

  function updateModalTaxaField(field, value) {
    setModalForm({ ...modalForm, [field]: parseFloat(value) || 0 });
  }
}
