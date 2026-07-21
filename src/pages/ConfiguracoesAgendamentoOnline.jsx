import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import http from "../api";
import { PageHeader } from "../components/Page";
import { Button } from "../components/ui/button";
import { Card } from "../components/ui/card";
import { Label } from "../components/ui/label";
import { Switch } from "../components/ui/switch";
import { Input } from "../components/ui/input";
import { ArrowLeft, Save, CalendarClock, AlertCircle, Plus, Trash2 } from "lucide-react";
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

export default function ConfiguracoesAgendamentoOnline() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [disponibilidades, setDisponibilidades] = useState([]);

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

  // Funcao util para adicionar intervalos duplos se precisar no futuro, 
  // mas por enquanto manteremos 1 intervalo por dia.
  
  if (loading) {
    return (
      <div className="p-8 text-zinc-400 text-center font-semibold animate-pulse">
        Carregando horários...
      </div>
    );
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
        overline="Agendamento Online" 
        title="Configurações de Horários" 
      />

      <div className="space-y-6 max-w-4xl mt-6">
        
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

      </div>

    </div>
  );
}
