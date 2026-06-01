import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import http from "../api";
import { PageHeader } from "../components/Page";
import { Button } from "../components/ui/button";
import { Card } from "../components/ui/card";
import { Label } from "../components/ui/label";
import { Textarea } from "../components/ui/textarea";
import { ArrowLeft, Save, MessageSquare, AlertCircle, Sparkles, CheckCircle2, Sliders } from "lucide-react";
import { toast } from "sonner";

export default function ConfiguracoesWhatsApp() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    ativo: 0,
    lembrete_24h: 1,
    lembrete_2h: 1,
    lembrete_1h: 1,
    modelo_mensagem: "",
    api_url: "",
    instancia: "",
    token: ""
  });

  const [localStatus, setLocalStatus] = useState({
    status: 'disconnected',
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
          token: response.data.token || ""
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

  const loadLocalStatus = async () => {
    try {
      const response = await http.get("/configuracoes/whatsapp/local-status");
      setLocalStatus(response.data);
    } catch (e) {
      console.error("Erro ao obter status do WhatsApp local:", e);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    let interval = null;
    if (form.api_url === 'local') {
      loadLocalStatus();
      interval = setInterval(loadLocalStatus, 5000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [form.api_url]);

  const handleConnectionModeChange = (mode) => {
    setConnectionMode(mode);
    if (mode === 'simulation') {
      setForm({ ...form, api_url: "", instancia: "", token: "" });
    } else if (mode === 'local') {
      setForm({ ...form, api_url: "local", instancia: "local", token: "" });
    } else {
      setForm({ ...form, api_url: "", instancia: "", token: "" });
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
      if (connectionMode === 'external') {
        if (!form.api_url || !form.instancia) {
          toast.error("Por favor, preencha a URL da API e o Nome da Instância para o Provedor Externo.");
          setSaving(false);
          return;
        }
      }
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
                onChange={(e) => setForm({ ...form, ativo: e.target.checked ? 1 : 0 })}
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
                  className={`p-4 rounded-xl border text-left transition-all ${
                    connectionMode === 'simulation'
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
                  className={`p-4 rounded-xl border text-left transition-all ${
                    connectionMode === 'local'
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
                  className={`p-4 rounded-xl border text-left transition-all ${
                    connectionMode === 'external'
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
                  ) : localStatus.status === 'connecting' ? (
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
                <div className="space-y-4 p-5 rounded-2xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-850">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="api_url">URL da API</Label>
                      <input 
                        type="text" 
                        id="api_url"
                        placeholder="Ex: http://localhost:8080"
                        value={form.api_url || ""}
                        onChange={(e) => setForm({ ...form, api_url: e.target.value })}
                        className="w-full h-10 px-3 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="instancia">Nome da Instância</Label>
                      <input 
                        type="text" 
                        id="instancia"
                        placeholder="Ex: SalaoPrincipal"
                        value={form.instancia || ""}
                        onChange={(e) => setForm({ ...form, instancia: e.target.value })}
                        className="w-full h-10 px-3 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="token">Token / API Key</Label>
                    <input 
                      type="password" 
                      id="token"
                      placeholder="Seu token de segurança"
                      value={form.token || ""}
                      onChange={(e) => setForm({ ...form, token: e.target.value })}
                      className="w-full h-10 px-3 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    />
                  </div>
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

        </div>

        {/* Right column: Preview */}
        <div className="space-y-6">
          <Card className="p-6 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-sm h-full flex flex-col">
            <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2 mb-4">
              <CheckCircle2 className="w-5 h-5 text-emerald-500" />
              <span>Prévia da Mensagem</span>
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
        </div>

      </div>

      {/* Action Buttons */}
      <div className="flex justify-end gap-3 mt-8 pt-4 border-t border-zinc-200 dark:border-zinc-900 max-w-7xl">
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
      </div>

    </div>
  );
}
