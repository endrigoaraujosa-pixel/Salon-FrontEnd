import React, { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import http from "../api";
import { PageHeader } from "../components/Page";
import { Button } from "../components/ui/button";
import { Card } from "../components/ui/card";
import { Label } from "../components/ui/label";
import { Switch } from "../components/ui/switch";
import { Input } from "../components/ui/input";
import { Checkbox } from "../components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from "../components/ui/dialog";
import { ArrowLeft, Save, CalendarClock, AlertCircle, Globe, Copy, Users, User, Clock, Scissors, X, ChevronRight, Settings2 } from "lucide-react";
import { toast } from "sonner";

const DIAS_SEMANA = {
  0: "Domingo",
  1: "Segunda-feira",
  2: "Terça-feira",
  3: "Quarta-feira",
  4: "Quinta-feira",
  5: "Sexta-feira",
  6: "Sábado"
};

const DIAS_SEMANA_SHORT = {
  0: "Dom",
  1: "Seg",
  2: "Ter",
  3: "Qua",
  4: "Qui",
  5: "Sex",
  6: "Sáb"
};

export default function ConfiguracoesAgendamentoOnline() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState("horarios"); // 'horarios' | 'colaboradores'
  const [disponibilidades, setDisponibilidades] = useState([]);

  // Estado dos colaboradores
  const [colaboradores, setColaboradores] = useState([]);
  const [loadingColabs, setLoadingColabs] = useState(false);
  const [selectedColab, setSelectedColab] = useState(null); // colaborador selecionado para edição
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [savingColab, setSavingColab] = useState(false);

  // Estado temporário de edição do colaborador selecionado
  const [editOnlineAtivo, setEditOnlineAtivo] = useState(true);
  const [editServicos, setEditServicos] = useState([]); // [{ servico_id, servico_nome, agendamento_online_ativo }]
  const [editDisponibilidades, setEditDisponibilidades] = useState([]); // [{ dia_semana, hora_inicio, hora_fim, ativo }]

  // =================== LINK SECTION ===================
  const getOnlineBookingUrl = () => {
    const hostname = window.location.hostname;
    let tenant = hostname.split('.')[0];
    if (tenant === 'localhost' || tenant === '127' || !tenant) {
      tenant = 'salon';
    }
    if (hostname.includes('localhost') || hostname.includes('127.0.0.1')) {
      return `http://localhost:5174/?loja=${tenant}`;
    } else {
      return `${window.location.protocol}//${hostname}/loja=${tenant}`;
    }
  };

  const handleCopyLink = () => {
    const url = getOnlineBookingUrl();
    navigator.clipboard.writeText(url)
      .then(() => {
        toast.success("Link do Agendamento copiado para a área de transferência!");
      })
      .catch(() => {
        toast.error("Não foi possível copiar o link.");
      });
  };

  // =================== HORÁRIOS DO SALÃO ===================
  const loadData = async () => {
    setLoading(true);
    try {
      const response = await http.get("/configuracoes-online/disponibilidade");
      if (response.data && response.data.length > 0) {
        setDisponibilidades(response.data);
      } else {
        // Init default
        const init = [];
        for (let i = 0; i <= 6; i++) {
          init.push({
            id: `temp-${i}`,
            dia_semana: i,
            hora_inicio: "08:00",
            hora_fim: "18:00",
            ativo: i > 0 && i < 6 // Ativo de Seg a Sex
          });
        }
        setDisponibilidades(init);
      }
    } catch (e) {
      toast.error("Erro ao carregar configurações de disponibilidade");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      // Remove temp IDs
      const payload = disponibilidades.map(d => ({
        dia_semana: d.dia_semana,
        hora_inicio: d.hora_inicio,
        hora_fim: d.hora_fim,
        ativo: d.ativo
      }));

      await http.post("/configuracoes-online/disponibilidade", { disponibilidades: payload });
      toast.success("Configurações de horários salvas com sucesso!");
      loadData();
    } catch (e) {
      toast.error(e.response?.data?.detail || "Erro ao salvar configurações");
    } finally {
      setSaving(false);
    }
  };

  const toggleDay = (index) => {
    const updated = [...disponibilidades];
    updated[index].ativo = !updated[index].ativo;
    setDisponibilidades(updated);
  };

  const updateTime = (index, field, value) => {
    const updated = [...disponibilidades];
    updated[index][field] = value;
    setDisponibilidades(updated);
  };

  // =================== COLABORADORES ===================
  const loadColaboradores = useCallback(async () => {
    setLoadingColabs(true);
    try {
      const response = await http.get("/configuracoes-online/colaboradores");
      setColaboradores(response.data || []);
    } catch (e) {
      toast.error("Erro ao carregar colaboradores");
    } finally {
      setLoadingColabs(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === "colaboradores" && colaboradores.length === 0) {
      loadColaboradores();
    }
  }, [activeTab, loadColaboradores]);

  const openEditModal = (colab) => {
    setSelectedColab(colab);
    setEditOnlineAtivo(colab.agendamento_online_ativo);
    setEditServicos(colab.servicos.map(s => ({ ...s })));

    // Preparar disponibilidades: se o colaborador tem registros, usá-los; senão, gerar defaults
    if (colab.disponibilidades && colab.disponibilidades.length > 0) {
      const dispMap = {};
      colab.disponibilidades.forEach(d => { dispMap[d.dia_semana] = d; });
      const disps = [];
      for (let i = 0; i <= 6; i++) {
        if (dispMap[i]) {
          disps.push({ dia_semana: i, hora_inicio: dispMap[i].hora_inicio, hora_fim: dispMap[i].hora_fim, ativo: dispMap[i].ativo });
        } else {
          disps.push({ dia_semana: i, hora_inicio: "08:00", hora_fim: "18:00", ativo: false });
        }
      }
      setEditDisponibilidades(disps);
    } else {
      // Se não tem registros individuais, gerar com base na disponibilidade geral do salão
      const disps = [];
      for (let i = 0; i <= 6; i++) {
        const salaoDisp = disponibilidades.find(d => d.dia_semana === i);
        disps.push({
          dia_semana: i,
          hora_inicio: salaoDisp?.hora_inicio || "08:00",
          hora_fim: salaoDisp?.hora_fim || "18:00",
          ativo: salaoDisp?.ativo || false
        });
      }
      setEditDisponibilidades(disps);
    }

    setEditModalOpen(true);
  };

  const handleSaveColab = async () => {
    setSavingColab(true);
    try {
      await http.put(`/configuracoes-online/colaboradores/${selectedColab.id}`, {
        agendamento_online_ativo: editOnlineAtivo,
        servicos: editServicos.map(s => ({
          servico_id: s.servico_id,
          agendamento_online_ativo: s.agendamento_online_ativo
        })),
        disponibilidades: editDisponibilidades.map(d => ({
          dia_semana: d.dia_semana,
          hora_inicio: d.hora_inicio,
          hora_fim: d.hora_fim,
          ativo: d.ativo
        }))
      });
      toast.success(`Configurações de ${selectedColab.nome} salvas com sucesso!`);
      setEditModalOpen(false);
      loadColaboradores();
    } catch (e) {
      toast.error(e.response?.data?.detail || "Erro ao salvar configurações do colaborador");
    } finally {
      setSavingColab(false);
    }
  };

  const toggleEditServicoOnline = (servicoId) => {
    setEditServicos(prev => prev.map(s =>
      s.servico_id === servicoId
        ? { ...s, agendamento_online_ativo: !s.agendamento_online_ativo }
        : s
    ));
  };

  const toggleEditDayColab = (dayIndex) => {
    setEditDisponibilidades(prev => prev.map((d, i) =>
      d.dia_semana === dayIndex ? { ...d, ativo: !d.ativo } : d
    ));
  };

  const updateEditTimeColab = (dayIndex, field, value) => {
    setEditDisponibilidades(prev => prev.map(d =>
      d.dia_semana === dayIndex ? { ...d, [field]: value } : d
    ));
  };

  // =================== LOADING ===================
  if (loading) {
    return (
      <div className="p-8 text-zinc-400 text-center font-semibold animate-pulse">
        Carregando horários...
      </div>
    );
  }

  const colabsAtivosOnline = colaboradores.filter(c => c.agendamento_online_ativo).length;

  // =================== RENDER ===================
  return (
    <div className="p-6 lg:p-8 fade-in min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-800 dark:text-zinc-200">
      
      {/* Back Button */}
      <Button 
        variant="ghost" 
        onClick={() => navigate("/configuracoes")} 
        className="mb-4 text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
      >
        <ArrowLeft className="w-4 h-4 mr-1" /> Voltar para Configurações
      </Button>

      <PageHeader 
        overline="Agendamento Online" 
        title="Configurações" 
      />

      <div className="space-y-6 max-w-4xl mt-6">
        
        {/* Link de Agendamento Online */}
        <Card className="p-6 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-sm">
          <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2 mb-3">
            <Globe className="w-5 h-5 text-[#84A59D]" />
            <span>Link do Portal de Agendamento</span>
          </h3>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-4 leading-relaxed">
            Compartilhe este link com seus clientes nas redes sociais ou WhatsApp para que eles possam agendar online de forma independente.
          </p>
          <div className="flex gap-2">
            <Input 
              readOnly 
              value={getOnlineBookingUrl()} 
              className="bg-zinc-50 dark:bg-zinc-950 font-mono text-xs select-all flex-1 h-10 border-zinc-200 dark:border-zinc-800"
            />
            <Button 
              onClick={handleCopyLink} 
              className="bg-[#84A59D] hover:bg-[#6F9189] dark:bg-[#84A59D] dark:hover:bg-[#6F9189] text-white h-10 font-bold px-4 flex items-center gap-1.5 rounded-lg text-xs"
            >
              <Copy className="w-4 h-4" />
              <span>Copiar Link</span>
            </Button>
          </div>
        </Card>

        {/* Tabs */}
        <div className="flex gap-1 bg-zinc-100 dark:bg-zinc-900 p-1 rounded-xl border border-zinc-200 dark:border-zinc-800">
          <button
            onClick={() => setActiveTab("horarios")}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-bold transition-all ${
              activeTab === "horarios"
                ? "bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 shadow-sm"
                : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300"
            }`}
          >
            <CalendarClock className="w-4 h-4" />
            Horários do Salão
          </button>
          <button
            onClick={() => setActiveTab("colaboradores")}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-bold transition-all ${
              activeTab === "colaboradores"
                ? "bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 shadow-sm"
                : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300"
            }`}
          >
            <Users className="w-4 h-4" />
            Colaboradores
          </button>
        </div>

        {/* =================== ABA: HORÁRIOS DO SALÃO =================== */}
        {activeTab === "horarios" && (
          <>
            <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/60 rounded-xl p-4 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-amber-700 dark:text-amber-450 leading-relaxed">
                <strong>Disponibilidade da Empresa:</strong> Defina abaixo os dias da semana e os horários de funcionamento do salão. Apenas os horários dentro destes intervalos serão exibidos para os clientes no Agendamento Online.
              </div>
            </div>

            <Card className="p-6 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-sm">
              <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2 mb-5">
                <CalendarClock className="w-5 h-5 text-[#84A59D]" />
                <span>Horários de Funcionamento</span>
              </h3>

              <div className="space-y-3">
                {disponibilidades.map((disp, i) => (
                  <div 
                    key={disp.id || i}
                    className={`flex items-center justify-between gap-4 p-4 rounded-xl border ${disp.ativo ? 'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 shadow-sm' : 'bg-zinc-50 dark:bg-zinc-950/50 border-zinc-100 dark:border-zinc-850 opacity-70'} transition-all`}
                  >
                    <div className="flex items-center gap-4 w-40">
                      <Switch 
                        checked={disp.ativo}
                        onCheckedChange={() => toggleDay(i)}
                      />
                      <Label className="font-bold text-sm cursor-pointer" onClick={() => toggleDay(i)}>
                        {DIAS_SEMANA[disp.dia_semana]}
                      </Label>
                    </div>

                    {disp.ativo ? (
                      <div className="flex items-center gap-2">
                        <Input 
                          type="time" 
                          value={disp.hora_inicio} 
                          onChange={(e) => updateTime(i, "hora_inicio", e.target.value)}
                          className="w-32 text-center bg-zinc-50 dark:bg-zinc-950"
                        />
                        <span className="text-zinc-400 font-semibold">até</span>
                        <Input 
                          type="time" 
                          value={disp.hora_fim} 
                          onChange={(e) => updateTime(i, "hora_fim", e.target.value)}
                          className="w-32 text-center bg-zinc-50 dark:bg-zinc-950"
                        />
                      </div>
                    ) : (
                      <div className="text-xs text-zinc-400 font-semibold uppercase tracking-wider flex-1 text-center pr-12">
                        Fechado
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </Card>

            {/* Action Buttons */}
            <div className="flex justify-end gap-3 pt-4 border-t border-zinc-200 dark:border-zinc-900">
              <Button variant="outline" onClick={loadData} className="h-10 text-xs rounded-lg px-4">
                Cancelar
              </Button>
              <Button 
                onClick={handleSave} 
                disabled={saving}
                className="bg-[#84A59D] hover:bg-[#6F9189] dark:bg-[#84A59D] dark:hover:bg-[#6F9189] text-white h-10 text-xs rounded-lg font-bold flex items-center gap-1.5 px-5 shadow-sm"
              >
                <Save className="w-4 h-4" />
                <span>{saving ? "Salvando..." : "Salvar Horários"}</span>
              </Button>
            </div>
          </>
        )}

        {/* =================== ABA: COLABORADORES =================== */}
        {activeTab === "colaboradores" && (
          <>
            <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900/60 rounded-xl p-4 flex items-start gap-3">
              <Users className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-blue-700 dark:text-blue-400 leading-relaxed">
                <strong>Configuração por Colaborador:</strong> Defina individualmente quais colaboradores participam do Agendamento Online, quais serviços realizam e seus horários de atendimento. Clique em um colaborador para editar suas configurações.
              </div>
            </div>

            {/* Summary */}
            {!loadingColabs && colaboradores.length > 0 && (
              <div className="flex items-center gap-3 text-sm text-zinc-500 dark:text-zinc-400">
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 rounded-lg font-bold text-xs border border-emerald-200 dark:border-emerald-900/60">
                  <User className="w-3.5 h-3.5" />
                  {colabsAtivosOnline} de {colaboradores.length} habilitados
                </span>
              </div>
            )}

            {loadingColabs ? (
              <div className="p-8 text-zinc-400 text-center font-semibold animate-pulse">
                Carregando colaboradores...
              </div>
            ) : (
              <div className="space-y-2">
                {colaboradores.map(colab => {
                  const servicosAtivos = colab.servicos.filter(s => s.agendamento_online_ativo).length;
                  const totalServicos = colab.servicos.length;
                  const temDisps = colab.disponibilidades && colab.disponibilidades.length > 0;
                  const diasAtivos = temDisps 
                    ? colab.disponibilidades.filter(d => d.ativo).map(d => DIAS_SEMANA_SHORT[d.dia_semana]).join(", ")
                    : "Horário do salão";

                  return (
                    <Card 
                      key={colab.id}
                      onClick={() => openEditModal(colab)}
                      className={`p-4 bg-white dark:bg-zinc-900 border rounded-xl shadow-sm cursor-pointer transition-all hover:shadow-md hover:border-[#84A59D]/50 ${
                        colab.agendamento_online_ativo 
                          ? 'border-zinc-200 dark:border-zinc-800' 
                          : 'border-zinc-100 dark:border-zinc-850 opacity-60'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          {/* Avatar */}
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 ${
                            colab.agendamento_online_ativo
                              ? 'bg-[#84A59D]/10 text-[#84A59D]'
                              : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-400'
                          }`}>
                            {colab.foto 
                              ? <img src={colab.foto} alt={colab.nome} className="w-10 h-10 rounded-full object-cover" />
                              : colab.nome?.charAt(0).toUpperCase()
                            }
                          </div>

                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-sm text-zinc-900 dark:text-zinc-100">{colab.nome}</span>
                              {colab.agendamento_online_ativo ? (
                                <span className="px-1.5 py-0.5 text-[10px] font-bold bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 rounded-md uppercase tracking-wide">
                                  Online
                                </span>
                              ) : (
                                <span className="px-1.5 py-0.5 text-[10px] font-bold bg-zinc-100 dark:bg-zinc-800 text-zinc-400 rounded-md uppercase tracking-wide">
                                  Desativado
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-3 mt-0.5 text-xs text-zinc-400 dark:text-zinc-500">
                              <span className="flex items-center gap-1">
                                <Scissors className="w-3 h-3" />
                                {servicosAtivos}/{totalServicos} serviços
                              </span>
                              <span className="flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {diasAtivos}
                              </span>
                            </div>
                          </div>
                        </div>

                        <ChevronRight className="w-5 h-5 text-zinc-300 dark:text-zinc-600" />
                      </div>
                    </Card>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>

      {/* =================== MODAL DE EDIÇÃO DO COLABORADOR =================== */}
      <Dialog open={editModalOpen} onOpenChange={setEditModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-white dark:bg-zinc-900">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg">
              <Settings2 className="w-5 h-5 text-[#84A59D]" />
              Configurar Colaborador
            </DialogTitle>
            <DialogDescription>
              Defina as configurações de agendamento online para <strong>{selectedColab?.nome}</strong>.
            </DialogDescription>
          </DialogHeader>

          {selectedColab && (
            <div className="space-y-6 pt-2">
              {/* Switch de habilitação */}
              <div className="flex items-center justify-between p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950/50">
                <div>
                  <div className="font-bold text-sm text-zinc-900 dark:text-zinc-100">Habilitar no Agendamento Online</div>
                  <div className="text-xs text-zinc-400 mt-0.5">
                    {editOnlineAtivo 
                      ? "Este colaborador será exibido como opção para os clientes." 
                      : "Este colaborador NÃO será exibido no agendamento online."
                    }
                  </div>
                </div>
                <Switch 
                  checked={editOnlineAtivo}
                  onCheckedChange={setEditOnlineAtivo}
                />
              </div>

              {editOnlineAtivo && (
                <>
                  {/* Serviços */}
                  <div>
                    <h4 className="font-bold text-sm text-zinc-900 dark:text-zinc-100 flex items-center gap-2 mb-3">
                      <Scissors className="w-4 h-4 text-[#84A59D]" />
                      Serviços Habilitados
                    </h4>
                    <p className="text-xs text-zinc-400 mb-3">
                      Marque os serviços que este colaborador pode realizar pelo Agendamento Online.
                    </p>
                    <div className="space-y-1.5 max-h-56 overflow-y-auto pr-2">
                      {editServicos.length === 0 && (
                        <div className="text-sm text-zinc-400 italic py-4 text-center">
                          Nenhum serviço vinculado a este colaborador.
                        </div>
                      )}
                      {editServicos.map(svc => (
                        <label
                          key={svc.servico_id}
                          className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                            svc.agendamento_online_ativo
                              ? 'border-[#84A59D]/40 bg-[#84A59D]/5 dark:bg-[#84A59D]/10'
                              : 'border-zinc-100 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:bg-zinc-50 dark:hover:bg-zinc-800/50'
                          }`}
                        >
                          <Checkbox
                            checked={svc.agendamento_online_ativo}
                            onCheckedChange={() => toggleEditServicoOnline(svc.servico_id)}
                          />
                          <span className={`text-sm font-medium ${
                            svc.agendamento_online_ativo
                              ? 'text-zinc-900 dark:text-zinc-100'
                              : 'text-zinc-400 dark:text-zinc-500'
                          }`}>
                            {svc.servico_nome}
                          </span>
                        </label>
                      ))}
                    </div>
                    {editServicos.length > 0 && (
                      <div className="flex items-center gap-2 mt-3">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-xs h-7 px-2"
                          onClick={() => setEditServicos(prev => prev.map(s => ({ ...s, agendamento_online_ativo: true })))}
                        >
                          Marcar todos
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-xs h-7 px-2"
                          onClick={() => setEditServicos(prev => prev.map(s => ({ ...s, agendamento_online_ativo: false })))}
                        >
                          Desmarcar todos
                        </Button>
                      </div>
                    )}
                  </div>

                  {/* Horários de Atendimento */}
                  <div>
                    <h4 className="font-bold text-sm text-zinc-900 dark:text-zinc-100 flex items-center gap-2 mb-3">
                      <Clock className="w-4 h-4 text-[#84A59D]" />
                      Horários de Atendimento
                    </h4>
                    <p className="text-xs text-zinc-400 mb-3">
                      Configure os dias e horários individuais de atendimento deste colaborador. Dias desativados indicam folga.
                    </p>
                    <div className="space-y-2">
                      {editDisponibilidades.map(disp => (
                        <div
                          key={disp.dia_semana}
                          className={`flex items-center gap-3 p-3 rounded-lg border transition-all ${
                            disp.ativo
                              ? 'border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900'
                              : 'border-zinc-100 dark:border-zinc-850 bg-zinc-50 dark:bg-zinc-950/50 opacity-60'
                          }`}
                        >
                          <Switch
                            checked={disp.ativo}
                            onCheckedChange={() => toggleEditDayColab(disp.dia_semana)}
                          />
                          <span className="font-bold text-xs w-20 text-zinc-700 dark:text-zinc-300">
                            {DIAS_SEMANA_SHORT[disp.dia_semana]}
                          </span>
                          {disp.ativo ? (
                            <div className="flex items-center gap-2 flex-1">
                              <Input
                                type="time"
                                value={disp.hora_inicio}
                                onChange={(e) => updateEditTimeColab(disp.dia_semana, "hora_inicio", e.target.value)}
                                className="w-28 text-center text-xs h-8 bg-zinc-50 dark:bg-zinc-950"
                              />
                              <span className="text-zinc-400 text-xs font-semibold">até</span>
                              <Input
                                type="time"
                                value={disp.hora_fim}
                                onChange={(e) => updateEditTimeColab(disp.dia_semana, "hora_fim", e.target.value)}
                                className="w-28 text-center text-xs h-8 bg-zinc-50 dark:bg-zinc-950"
                              />
                            </div>
                          ) : (
                            <span className="text-xs text-zinc-400 font-semibold uppercase tracking-wider">Folga</span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          <DialogFooter className="pt-4 border-t border-zinc-200 dark:border-zinc-800 mt-4">
            <DialogClose asChild>
              <Button variant="outline" className="h-9 text-xs rounded-lg px-4">
                Cancelar
              </Button>
            </DialogClose>
            <Button
              onClick={handleSaveColab}
              disabled={savingColab}
              className="bg-[#84A59D] hover:bg-[#6F9189] dark:bg-[#84A59D] dark:hover:bg-[#6F9189] text-white h-9 text-xs rounded-lg font-bold flex items-center gap-1.5 px-5"
            >
              <Save className="w-4 h-4" />
              <span>{savingColab ? "Salvando..." : "Salvar Configurações"}</span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
