import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import http from "../api";
import { PageHeader } from "../components/Page";
import { Button } from "../components/ui/button";
import { Card } from "../components/ui/card";
import { Label } from "../components/ui/label";
import { Textarea } from "../components/ui/textarea";
import { ArrowLeft, Save, MessageSquare, AlertCircle, Sparkles, CheckCircle2, Sliders, Heart } from "lucide-react";
import { toast } from "sonner";

export default function ConfiguracoesWhatsApp() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [statusLoading, setStatusLoading] = useState(false);
  const [form, setForm] = useState({
    ativo: 0,
    lembrete_24h: 1,
    lembrete_2h: 1,
    lembrete_1h: 1,
    modelo_mensagem: "",
    agradecimento_ativo: 0,
    agradecimento_tempo_minutos: 30,
    agradecimento_modelo_mensagem: ""
  });

  const [localStatus, setLocalStatus] = useState({
    status: 'connecting',
    qr: null,
    user: null
  });

  const [connectionMode, setConnectionMode] = useState("simulation");

  const loadData = async () => {
    setLoading(true);
    try {
      const response = await http.get("/configuracoes/whatsapp");
      if (response.data) {
        setForm({
          ativo: response.data.ativo || 0,
          lembrete_24h: response.data.lembrete_24h || 0,
          lembrete_2h: response.data.lembrete_2h || 0,
          lembrete_1h: response.data.lembrete_1h || 0,
          modelo_mensagem: response.data.modelo_mensagem || "",
          api_url: response.data.api_url || "",
          instancia: response.data.instancia || "",
          token: response.data.token || "",
          agradecimento_ativo: response.data.agradecimento_ativo || 0,
          agradecimento_tempo_minutos: response.data.agradecimento_tempo_minutos || 30,
          agradecimento_modelo_mensagem: response.data.agradecimento_modelo_mensagem || ""
        });
        const mode = !response.data.api_url
          ? 'simulation'
          : response.data.api_url === 'local'
            ? 'local'
            : 'external';
        setConnectionMode(mode);
      }
    } catch (e) {
      toast.error("Erro ao carregar configurações do WhatsApp");
    } finally {
      setLoading(false);
    }
  };

  const teste = async () => {
    if (connectionMode === "external") {
      try {
        const subdominio = window.location.hostname.split('.')[0];
        const res = await http.get(`/configuracoes/whatsapp/status-integracao/${subdominio}`);
        const status = {
          "open": "connected",
          "close": "disconnected",
          "connecting": "connecting"
        }

        setLocalStatus({
          ...localStatus,
          status: status[res.data?.instance?.state] || 'disconnected'
        })
      } catch (error) {
        console.log("erro ", error);        
      }
    }
  }
  const loadLocalStatus = async () => {
    try {
      const response = await http.get("/configuracoes/whatsapp/local-status");
      setLocalStatus(response.data);
    } catch (e) {
      console.error("Erro ao obter status do WhatsApp local:", e);
    }
  };

  useEffect(() => {
    teste()
  }, [connectionMode])

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    let statusInterval = null;
    let qrInterval = null;
    if (form.api_url === 'local') {
      loadLocalStatus();
      statusInterval = setInterval(loadLocalStatus, 5000);
    } else if (connectionMode === 'external') {
      const loadExternalStatus = async () => {
        try {
          const subdominio = window.location.hostname.split('.')[0];
          const res = await http.get(`/configuracoes/whatsapp/status-integracao/${subdominio}`);
          if (res.data?.instance?.state === 'open') {
            setLocalStatus(prev => ({ ...prev, status: 'connected', qr: undefined }));
            if (statusInterval) clearInterval(statusInterval);
            if (qrInterval) clearInterval(qrInterval);
          } else if (res.data?.instance?.state === 'close') {
            setLocalStatus(prev => ({ ...prev, status: 'disconnected' }));
          } else if (res.data?.instance?.state === 'connecting') {
            if (statusInterval) clearInterval(statusInterval);
          }
        } catch (e) {
          console.error("Erro ao obter status do WhatsApp externo:", e);
        }
      };

      const loadExternalQrCode = async () => {
        try {
          const subdominio = window.location.hostname.split('.')[0];
          const res = await http.get(`/configuracoes/whatsapp/qr-code/${subdominio}`);
          if (res.data?.base64) {
            setLocalStatus(prev => ({ ...prev, qr: res.data.base64 }));
          }
        } catch (e) {
          console.error("Erro ao atualizar QR Code:", e);
        }
      };

      loadExternalStatus();
      statusInterval = setInterval(loadExternalStatus, 5000);
      let tentativa = 0;

      qrInterval = setInterval(async () => {
        if (tentativa > 5) {
          clearInterval(qrInterval);
          return;
        }
        await loadExternalQrCode();
        tentativa++;
      }, 20000);
    }
    return () => {
      if (statusInterval) clearInterval(statusInterval);
      if (qrInterval) clearInterval(qrInterval);
    };
  }, [form.api_url, connectionMode]);

  const handleConnectionModeChange = (mode) => {
    setConnectionMode(mode);
    if (mode === 'simulation') {
      setForm({ ...form, api_url: "", instancia: "", token: "" });
    } else if (mode === 'local') {
      setForm({ ...form, api_url: "local", instancia: "local", token: "" });
    } else {
      setForm({ ...form, api_url: "external", instancia: "", token: "" });
    }
  };

  const handleLocalDisconnect = async () => {
    try {
      await http.post("/configuracoes/whatsapp/local-disconnect");
      toast.success("Solicitação de desconexão enviada.");
      loadLocalStatus();
    } catch (e) {
      toast.error("Erro ao desconectar WhatsApp local");
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      console.log(form)
      await http.post("/configuracoes/whatsapp", form);
      toast.success("Configurações do WhatsApp salvas com sucesso!");
      window.dispatchEvent(new Event("whatsapp_config_updated"));
    } catch (e) {
      toast.error(e.response?.data?.detail || "Erro ao salvar configurações");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-8 text-zinc-400 text-center font-semibold">Carregando configurações...</div>;

  const mockMessage = () => {
    let tpl = form.modelo_mensagem || `Olá, {nome}!\n\nPassando para lembrar que você possui um horário agendado.\n\n📅 Data: {data}\n⏰ Hora: {hora}\n💇 Serviço: {servico}\n👤 Profissional: {profissional}\n\nEstamos esperando você.`;
    return tpl
      .replace(/{nome}/g, "Maria da Silva")
      .replace(/{data}/g, "15/06/2026")
      .replace(/{hora}/g, "14:30")
      .replace(/{servico}/g, "Corte Feminino + Escova")
      .replace(/{profissional}/g, "Gabriela Costa");
  };

  const mockMessageAgradecimento = () => {
    let tpl = form.agradecimento_modelo_mensagem || `Olá, {nome}!\n\nAgradecemos por escolher nossos serviços. Foi um prazer atendê-lo(a) no dia {data}, às {hora}.\n\nServiços realizados:\n{servicos_valores}\n\nEsperamos revê-lo(a) em breve. Conte sempre com nossa equipe!\n\nAtenciosamente.`;
    return tpl
      .replace(/{nome}/g, "Maria da Silva")
      .replace(/{data}/g, "15/06/2026")
      .replace(/{hora}/g, "14:30")
      .replace(/{servico}/g, "Corte Feminino + Escova")
      .replace(/{profissional}/g, "Gabriela Costa")
      .replace(/{servicos_valores}/g, "Corte Feminino - R$ 80,00\nEscova - R$ 60,00\nHidratação - R$ 70,00");
  };

  const handleStartIntegration = async () => {
    try {
      setStatusLoading(true)
      const subdominio = window.location.hostname.split('.')[0];
      const respone = await http.post("/configuracoes/whatsapp/iniciar-integracao", { subdominio });
      const { data, success } = respone.data
      if (success) {
        setLocalStatus({
          ...localStatus,
          status: 'connected',
          qr: data?.qrcode?.base64,
          user: null
        });
        setForm(prev => ({
          ...prev,
          api_url: "external",
          instancia: data?.instance?.instanceName || "",
          token: data?.hash || ""
        }));
      }
      toast.success("Integração iniciada com sucesso!");
    } catch (e) {
      toast.error(e.response?.data?.detail || "Erro ao iniciar integração externa.");
    } finally {
      setStatusLoading(false)
    }
  }

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
        overline="Configurações"
        title="WhatsApp & Lembretes Automáticos"
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-6 max-w-7xl">

        {/* Left column: configurations */}
        <div className="lg:col-span-2 space-y-6">

          {/* Main Activation Card */}
          <Card className="p-6 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-sm">
            <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2 mb-5">
              <MessageSquare className="w-5 h-5 text-emerald-500" />
              <span>Status dos Lembretes</span>
            </h3>

            <div className="flex items-start gap-3 p-4 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-850">
              <input
                type="checkbox"
                id="ativo"
                checked={form.ativo === 1}
                onChange={(e) => {
                  console.log(e.target.checked);
                  setForm({ ...form, ativo: e.target.checked ? 1 : 0 })
                }}
                className="w-5 h-5 text-emerald-600 border-zinc-300 dark:border-zinc-750 rounded focus:ring-emerald-500 focus:ring-2 mt-0.5 cursor-pointer"
              />
              <div className="space-y-1">
                <Label htmlFor="ativo" className="text-sm font-bold text-zinc-900 dark:text-zinc-100 cursor-pointer">
                  Ativar envio automático de lembretes via WhatsApp
                </Label>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
                  Quando ativo, o sistema gera e agenda lembretes de mensagens para clientes antes de seus horários agendados.
                </p>
              </div>
            </div>
          </Card>

          {/* API Configuration Card */}
          <Card className="p-6 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-sm">
            <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2 mb-5">
              <Sliders className="w-5 h-5 text-emerald-500" />
              <span>Conexão do WhatsApp</span>
            </h3>

            <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-5 leading-relaxed">
              Escolha como deseja enviar as mensagens de WhatsApp. Você pode rodar de forma simulada, grátis diretamente pelo navegador do sistema, ou conectar um gateway profissional externo.
            </p>

            <div className="space-y-6">
              {/* Mode Selector */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <button
                  type="button"
                  onClick={() => handleConnectionModeChange('simulation')}
                  className={`p-4 rounded-xl border text-left transition-all ${connectionMode === 'simulation'
                    ? 'border-emerald-500 bg-emerald-50/10 text-emerald-950 dark:text-emerald-100 ring-2 ring-emerald-500/20'
                    : 'border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-950/30'
                    }`}
                >
                  <span className="block text-sm font-bold">Modo Simulação</span>
                  <span className="block text-xs text-zinc-500 dark:text-zinc-400 mt-1">Apenas simula o envio no histórico (grátis)</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleConnectionModeChange('local')}
                  className={`p-4 rounded-xl border text-left transition-all ${connectionMode === 'local'
                    ? 'border-emerald-500 bg-emerald-50/10 text-emerald-950 dark:text-emerald-100 ring-2 ring-emerald-500/20'
                    : 'border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-950/30'
                    }`}
                >
                  <span className="block text-sm font-bold flex items-center gap-1.5">
                    Modo Local
                    <span className="px-1.5 py-0.5 bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-[10px] font-semibold rounded">Recomendado</span>
                  </span>
                  <span className="block text-xs text-zinc-500 dark:text-zinc-400 mt-1">Roda no seu PC e gera QR Code para escanear (grátis)</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleConnectionModeChange('external')}
                  className={`p-4 rounded-xl border text-left transition-all ${connectionMode === 'external'
                    ? 'border-emerald-500 bg-emerald-50/10 text-emerald-950 dark:text-emerald-100 ring-2 ring-emerald-500/20'
                    : 'border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-950/30'
                    }`}
                >
                  <span className="block text-sm font-bold">Provedor Externo</span>
                  <span className="block text-xs text-zinc-500 dark:text-zinc-400 mt-1">Conecta com Evolution API ou Z-API comercial</span>
                </button>
              </div>

              {/* Mode A: Local Connection Panel */}
              {connectionMode === 'local' && (
                <div className="p-5 rounded-2xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-850">
                  <h4 className="text-sm font-bold text-zinc-950 dark:text-zinc-150 mb-3 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    Painel do WhatsApp Local
                  </h4>

                  {localStatus.status === 'ready' ? (
                    <div className="space-y-4">
                      <div className="flex items-center gap-3 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-700 dark:text-emerald-300">
                        <CheckCircle2 className="w-5 h-5 shrink-0" />
                        <div>
                          <p className="text-sm font-semibold">WhatsApp Conectado com sucesso!</p>
                          <p className="text-xs opacity-90">Número do Salão: {localStatus.user}</p>
                        </div>
                      </div>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
                        Os lembretes automáticos estão prontos para envio a partir do seu próprio número.
                      </p>
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        onClick={handleLocalDisconnect}
                        className="w-full sm:w-auto"
                      >
                        Desconectar Celular
                      </Button>
                    </div>
                  ) : localStatus.status === 'connecting' && !localStatus.qr ? (
                    <div className="py-6 flex flex-col items-center justify-center text-center space-y-3">
                      <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
                      <div>
                        <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Iniciando serviço de WhatsApp...</p>
                        <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">Aguardando geração do QR Code pelo navegador local.</p>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-5">
                      <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
                        Para conectar o WhatsApp do salão, abra o WhatsApp no seu celular, vá em <strong>Aparelhos Conectados &gt; Conectar um aparelho</strong> e aponte a câmera para o QR Code abaixo:
                      </p>

                      <div className="flex flex-col items-center justify-center py-4 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl">
                        {localStatus.qr ? (
                          <div className="space-y-3 flex flex-col items-center">
                            <img
                              src={localStatus.qr}
                              alt="WhatsApp QR Code"
                              className="w-52 h-52 p-2 bg-white rounded-lg shadow-sm border border-zinc-100"
                            />
                            <span className="text-[11px] font-semibold text-zinc-450 dark:text-zinc-400 animate-pulse flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                              QR Code gerado. Aguardando leitura do celular...
                            </span>
                          </div>
                        ) : (
                          <div className="py-8 flex flex-col items-center justify-center space-y-2 text-zinc-400">
                            <AlertCircle className="w-8 h-8 animate-bounce text-zinc-350" />
                            <p className="text-xs">Gerando QR Code... Por favor, aguarde.</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Mode B: External API Form Fields */}
              {connectionMode === 'external' && (
                <div className="flex flex-col items-center justify-center space-y-4 p-8 rounded-2xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-850">
                  <h4 className="text-sm font-bold text-zinc-950 dark:text-zinc-150">
                    Integração com Provedor Externo
                  </h4>
                  {
                    localStatus.status === 'disconnected'
                      ? (<>
                        <p className="text-xs text-zinc-500 dark:text-zinc-400 text-center max-w-sm leading-relaxed">
                          Clique no botão abaixo para iniciar a integração com o WhatsApp.
                        </p>
                        <Button
                          type="button"
                          disabled={statusLoading}
                          onClick={() => handleStartIntegration()}
                          className="bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-600 dark:hover:bg-emerald-700 text-white font-bold h-10 px-6 rounded-lg shadow-sm">
                          Iniciar integração com whatsapp
                          <span>{statusLoading ? "Conectando..." : "Conectar whatsapp"}</span>
                        </Button></>)
                      : ""}
                  {localStatus.status !== 'disconnected' && (
                    <div className="flex flex-col items-center justify-center py-4 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl w-full mt-4">
                      {localStatus.qr ? (
                        <div className="space-y-3 flex flex-col items-center">
                          <img
                            src={localStatus.qr.startsWith('data:image') ? localStatus.qr : `data:image/png;base64,${localStatus.qr}`}
                            alt="WhatsApp QR Code"
                            className="w-52 h-52 p-2 bg-white rounded-lg shadow-sm border border-zinc-100 object-contain"
                          />
                          <span className="text-[11px] font-semibold text-zinc-450 dark:text-zinc-400 animate-pulse flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                            QR Code gerado. Aguardando leitura do celular...
                          </span>
                        </div>
                      ) : localStatus.status === 'connected'
                        ? (<div className="py-8 flex flex-col items-center justify-center space-y-2 text-zinc-400">
                          <CheckCircle2 color="#10b981ff" className="w-8 h-8 text-zinc-350" />
                          <p className="text-xs">Conectado com sucesso!</p>
                        </div>)
                        : (
                          <div className="py-8 flex flex-col items-center justify-center space-y-2 text-zinc-400">
                            <AlertCircle className="w-8 h-8 animate-bounce text-zinc-350" />
                            <p className="text-xs">Gerando QR Code... Por favor, aguarde.</p>
                          </div>
                        )}
                    </div>
                  )}
                </div>
              )}

              {/* Mode C: Simulation Mode Panel */}
              {connectionMode === 'simulation' && (
                <div className="p-4 rounded-xl bg-zinc-500/10 border border-zinc-300/20 text-zinc-650 dark:text-zinc-350 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-zinc-500" />
                  <span>Nenhum celular conectado. As mensagens serão salvas no histórico como enviadas, mas aparecerão apenas no console do servidor (Modo Simulação).</span>
                </div>
              )}
            </div>
          </Card>

          {/* Schedule Configuration Card */}
          <Card className="p-6 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-sm">
            <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2 mb-5">
              <Sparkles className="w-5 h-5 text-emerald-500" />
              <span>Horários dos Lembretes</span>
            </h3>

            <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-5 leading-relaxed">
              Selecione quais lembretes devem ser enviados automaticamente. Cada opção é independente e gerada no momento do agendamento.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

              <label className="flex items-center gap-3 p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-950/50 cursor-pointer transition-colors">
                <input
                  type="checkbox"
                  checked={form.lembrete_24h === 1}
                  onChange={(e) => setForm({ ...form, lembrete_24h: e.target.checked ? 1 : 0 })}
                  className="w-4.5 h-4.5 text-emerald-600 border-zinc-300 dark:border-zinc-750 rounded focus:ring-emerald-500 cursor-pointer"
                />
                <div className="text-left">
                  <span className="text-sm font-semibold block text-zinc-900 dark:text-zinc-100">24 horas antes</span>
                  <span className="text-xs text-zinc-500 dark:text-zinc-400">Um dia antes do agendamento</span>
                </div>
              </label>

              <label className="flex items-center gap-3 p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-950/50 cursor-pointer transition-colors">
                <input
                  type="checkbox"
                  checked={form.lembrete_2h === 1}
                  onChange={(e) => setForm({ ...form, lembrete_2h: e.target.checked ? 1 : 0 })}
                  className="w-4.5 h-4.5 text-emerald-600 border-zinc-300 dark:border-zinc-750 rounded focus:ring-emerald-500 cursor-pointer"
                />
                <div className="text-left">
                  <span className="text-sm font-semibold block text-zinc-900 dark:text-zinc-100">2 horas antes</span>
                  <span className="text-xs text-zinc-500 dark:text-zinc-400">Duas horas antes do horário</span>
                </div>
              </label>

              <label className="flex items-center gap-3 p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-950/50 cursor-pointer transition-colors">
                <input
                  type="checkbox"
                  checked={form.lembrete_1h === 1}
                  onChange={(e) => setForm({ ...form, lembrete_1h: e.target.checked ? 1 : 0 })}
                  className="w-4.5 h-4.5 text-emerald-600 border-zinc-300 dark:border-zinc-750 rounded focus:ring-emerald-500 cursor-pointer"
                />
                <div className="text-left">
                  <span className="text-sm font-semibold block text-zinc-900 dark:text-zinc-100">1 hora antes</span>
                  <span className="text-xs text-zinc-500 dark:text-zinc-400">Uma hora antes do horário</span>
                </div>
              </label>

            </div>
          </Card>

          {/* Template Configuration Card */}
          <Card className="p-6 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                Modelo da Mensagem
              </h3>
              <Button
                variant="outline"
                size="xs"
                onClick={() => setForm({ ...form, modelo_mensagem: `Olá, {nome}!\n\nPassando para lembrar que você possui um horário agendado.\n\n📅 Data: {data}\n⏰ Hora: {hora}\n💇 Serviço: {servico}\n👤 Profissional: {profissional}\n\nEstamos esperando você.` })}
                className="text-xs text-zinc-500 hover:text-zinc-700"
              >
                Restaurar Padrão
              </Button>
            </div>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="modelo_mensagem">Template da Mensagem</Label>
                <Textarea
                  id="modelo_mensagem"
                  value={form.modelo_mensagem}
                  onChange={(e) => setForm({ ...form, modelo_mensagem: e.target.value })}
                  placeholder="Escreva a mensagem..."
                  className="min-h-[220px] font-mono text-sm bg-zinc-50 border-zinc-200 dark:bg-zinc-950 dark:border-zinc-850 focus:bg-white"
                />
              </div>

              {/* Variables reference table */}
              <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden bg-zinc-50/50 dark:bg-zinc-950/20">
                <div className="p-3 bg-zinc-100 dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800">
                  <span className="text-xs font-bold text-zinc-700 dark:text-zinc-300">Variáveis Disponíveis</span>
                </div>
                <div className="divide-y divide-zinc-200 dark:divide-zinc-800 text-xs">
                  <div className="grid grid-cols-3 p-2.5">
                    <span className="font-mono text-emerald-600 dark:text-emerald-400 font-semibold">{"{nome}"}</span>
                    <span className="col-span-2 text-zinc-650 dark:text-zinc-400">Nome do cliente</span>
                  </div>
                  <div className="grid grid-cols-3 p-2.5">
                    <span className="font-mono text-emerald-600 dark:text-emerald-400 font-semibold">{"{data}"}</span>
                    <span className="col-span-2 text-zinc-650 dark:text-zinc-400">Data do agendamento</span>
                  </div>
                  <div className="grid grid-cols-3 p-2.5">
                    <span className="font-mono text-emerald-600 dark:text-emerald-400 font-semibold">{"{hora}"}</span>
                    <span className="col-span-2 text-zinc-650 dark:text-zinc-400">Hora do agendamento</span>
                  </div>
                  <div className="grid grid-cols-3 p-2.5">
                    <span className="font-mono text-emerald-600 dark:text-emerald-400 font-semibold">{"{servico}"}</span>
                    <span className="col-span-2 text-zinc-650 dark:text-zinc-400">Serviço agendado</span>
                  </div>
                  <div className="grid grid-cols-3 p-2.5">
                    <span className="font-mono text-emerald-600 dark:text-emerald-400 font-semibold">{"{profissional}"}</span>
                    <span className="col-span-2 text-zinc-650 dark:text-zinc-400">Profissional responsável</span>
                  </div>
                </div>
              </div>

            </div>
          </Card>

          {/* Thank You Message Configuration Card */}
          <Card className="p-6 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-sm">
            <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2 mb-5">
              <Heart className="w-5 h-5 text-rose-500" />
              <span>Mensagem de Agradecimento</span>
            </h3>

            <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-5 leading-relaxed">
              Envie automaticamente uma mensagem de agradecimento ao cliente após a conclusão de um atendimento na agenda.
            </p>

            <div className="space-y-6">

              {/* Activation toggle */}
              <div className="flex items-start gap-3 p-4 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-850">
                <input
                  type="checkbox"
                  id="agradecimento_ativo"
                  checked={form.agradecimento_ativo === 1}
                  onChange={(e) => setForm({ ...form, agradecimento_ativo: e.target.checked ? 1 : 0 })}
                  className="w-5 h-5 text-rose-600 border-zinc-300 dark:border-zinc-750 rounded focus:ring-rose-500 focus:ring-2 mt-0.5 cursor-pointer"
                />
                <div className="space-y-1">
                  <Label htmlFor="agradecimento_ativo" className="text-sm font-bold text-zinc-900 dark:text-zinc-100 cursor-pointer">
                    Ativar envio automático de mensagem de agradecimento
                  </Label>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
                    Quando ativo, o sistema enviará uma mensagem de agradecimento ao cliente após o atendimento ser marcado como concluído.
                  </p>
                </div>
              </div>

              {/* Time configuration */}
              {form.agradecimento_ativo === 1 && (
                <div className="space-y-5">

                  <div className="space-y-1.5">
                    <Label htmlFor="agradecimento_tempo_minutos" className="text-sm font-semibold">
                      Tempo de envio após conclusão do serviço (em minutos)
                    </Label>
                    <input
                      type="number"
                      id="agradecimento_tempo_minutos"
                      min="1"
                      max="1440"
                      value={form.agradecimento_tempo_minutos}
                      onChange={(e) => setForm({ ...form, agradecimento_tempo_minutos: Math.max(1, parseInt(e.target.value) || 1) })}
                      className="w-full h-10 px-3 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-rose-500 max-w-[200px]"
                    />
                    <p className="text-xs text-zinc-400 dark:text-zinc-500">
                      A mensagem será enviada após este tempo decorrido desde a conclusão. Mínimo: 1 minuto.
                    </p>
                  </div>

                  {/* Message template */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="agradecimento_modelo_mensagem">Texto da mensagem de agradecimento</Label>
                      <Button
                        variant="outline"
                        size="xs"
                        onClick={() => setForm({ ...form, agradecimento_modelo_mensagem: `Olá, {nome}!\n\nAgradecemos por escolher nossos serviços. Foi um prazer atendê-lo(a) no dia {data}, às {hora}.\n\nServiços realizados:\n{servicos_valores}\n\nEsperamos revê-lo(a) em breve. Conte sempre com nossa equipe!\n\nAtenciosamente.` })}
                        className="text-xs text-zinc-500 hover:text-zinc-700"
                      >
                        Restaurar Padrão
                      </Button>
                    </div>
                    <Textarea
                      id="agradecimento_modelo_mensagem"
                      value={form.agradecimento_modelo_mensagem}
                      onChange={(e) => setForm({ ...form, agradecimento_modelo_mensagem: e.target.value })}
                      placeholder="Escreva a mensagem de agradecimento..."
                      className="min-h-[220px] font-mono text-sm bg-zinc-50 border-zinc-200 dark:bg-zinc-950 dark:border-zinc-850 focus:bg-white"
                    />
                  </div>

                  {/* Variables reference table */}
                  <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden bg-zinc-50/50 dark:bg-zinc-950/20">
                    <div className="p-3 bg-zinc-100 dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800">
                      <span className="text-xs font-bold text-zinc-700 dark:text-zinc-300">Variáveis Disponíveis</span>
                    </div>
                    <div className="divide-y divide-zinc-200 dark:divide-zinc-800 text-xs">
                      <div className="grid grid-cols-3 p-2.5">
                        <span className="font-mono text-rose-600 dark:text-rose-400 font-semibold">{"{nome}"}</span>
                        <span className="col-span-2 text-zinc-650 dark:text-zinc-400">Nome do cliente</span>
                      </div>
                      <div className="grid grid-cols-3 p-2.5">
                        <span className="font-mono text-rose-600 dark:text-rose-400 font-semibold">{"{data}"}</span>
                        <span className="col-span-2 text-zinc-650 dark:text-zinc-400">Data do atendimento</span>
                      </div>
                      <div className="grid grid-cols-3 p-2.5">
                        <span className="font-mono text-rose-600 dark:text-rose-400 font-semibold">{"{hora}"}</span>
                        <span className="col-span-2 text-zinc-650 dark:text-zinc-400">Hora do atendimento</span>
                      </div>
                      <div className="grid grid-cols-3 p-2.5">
                        <span className="font-mono text-rose-600 dark:text-rose-400 font-semibold">{"{servico}"}</span>
                        <span className="col-span-2 text-zinc-650 dark:text-zinc-400">Serviço(s) realizado(s) — nomes separados por vírgula</span>
                      </div>
                      <div className="grid grid-cols-3 p-2.5">
                        <span className="font-mono text-rose-600 dark:text-rose-400 font-semibold">{"{profissional}"}</span>
                        <span className="col-span-2 text-zinc-650 dark:text-zinc-400">Profissional responsável</span>
                      </div>
                      <div className="grid grid-cols-3 p-2.5 bg-rose-50/40 dark:bg-rose-950/10">
                        <span className="font-mono text-rose-600 dark:text-rose-400 font-semibold">{"{servicos_valores}"}</span>
                        <span className="col-span-2 text-zinc-650 dark:text-zinc-400">Lista de serviços com valores (ex: <em>Corte - R$ 50,00</em>, um por linha)</span>
                      </div>
                    </div>
                  </div>

                </div>
              )}

            </div>
          </Card>

        </div>

        {/* Right column: Preview */}
        <div className="space-y-6">
          <Card className="p-6 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-sm flex flex-col">
            <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2 mb-4">
              <CheckCircle2 className="w-5 h-5 text-emerald-500" />
              <span>Prévia do Lembrete</span>
            </h3>

            <p className="text-xs text-zinc-550 dark:text-zinc-400 mb-5 leading-relaxed">
              Veja como o cliente receberá a mensagem no WhatsApp. Os campos dinâmicos serão preenchidos automaticamente com os dados do agendamento.
            </p>

            {/* Simulated WhatsApp screen */}
            <div className="flex-grow rounded-2xl bg-[#E5DDD5] dark:bg-zinc-950 p-4 border border-zinc-200 dark:border-zinc-850 relative overflow-hidden flex flex-col min-h-[350px]">

              {/* Wallpaper pattern mock */}
              <div className="absolute inset-0 opacity-5 pointer-events-none" style={{ backgroundImage: "radial-gradient(#000 10%, transparent 10%)", backgroundSize: "20px 20px" }} />

              {/* Chat Message Bubble */}
              <div className="relative self-start bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 p-3.5 rounded-2xl rounded-tl-none shadow-sm max-w-[85%] text-sm whitespace-pre-wrap leading-relaxed">
                {mockMessage()}
                <div className="text-[10px] text-zinc-450 text-right mt-1.5">
                  14:35 ✓✓
                </div>
              </div>

            </div>
          </Card>

          {/* Preview Agradecimento */}
          {form.agradecimento_ativo === 1 && (
            <Card className="p-6 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-sm flex flex-col">
              <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2 mb-4">
                <Heart className="w-5 h-5 text-rose-500" />
                <span>Prévia do Agradecimento</span>
              </h3>

              <p className="text-xs text-zinc-550 dark:text-zinc-400 mb-5 leading-relaxed">
                Prévia da mensagem de agradecimento que será enviada {form.agradecimento_tempo_minutos || 30} minutos após a conclusão do atendimento.
              </p>

              {/* Simulated WhatsApp screen */}
              <div className="flex-grow rounded-2xl bg-[#E5DDD5] dark:bg-zinc-950 p-4 border border-zinc-200 dark:border-zinc-850 relative overflow-hidden flex flex-col min-h-[300px]">

                {/* Wallpaper pattern mock */}
                <div className="absolute inset-0 opacity-5 pointer-events-none" style={{ backgroundImage: "radial-gradient(#000 10%, transparent 10%)", backgroundSize: "20px 20px" }} />

                {/* Chat Message Bubble */}
                <div className="relative self-start bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 p-3.5 rounded-2xl rounded-tl-none shadow-sm max-w-[85%] text-sm whitespace-pre-wrap leading-relaxed">
                  {mockMessageAgradecimento()}
                  <div className="text-[10px] text-zinc-450 text-right mt-1.5">
                    15:05 ✓✓
                  </div>
                </div>

              </div>
            </Card>
          )}
        </div>

      </div >

      {/* Action Buttons */}
      < div className="flex justify-end gap-3 mt-8 pt-4 border-t border-zinc-200 dark:border-zinc-900 max-w-7xl" >
        <Button variant="outline" onClick={loadData} className="h-10 text-xs rounded-lg px-4">
          Cancelar
        </Button>
        <Button
          onClick={handleSave}
          disabled={saving}
          className="bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-600 dark:hover:bg-emerald-700 text-white h-10 text-xs rounded-lg font-bold flex items-center gap-1.5 px-5 shadow-sm"
        >
          <Save className="w-4 h-4" />
          <span>{saving ? "Salvando..." : "Salvar Configurações"}</span>
        </Button>
      </div >

    </div >
  );
}
