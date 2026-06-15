import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import http from "../api";
import { PageHeader } from "../components/Page";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "../components/ui/dialog";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "../components/ui/select";
import { Switch } from "../components/ui/switch";
import { PlusCircle, Pencil, ArrowLeft, Check, Layers, AlertCircle } from "lucide-react";
import { toast } from "sonner";

const TIPO_LABELS = {
  saida_manual: "Saída Manual",
  perda: "Perda",
  consumo_interno: "Consumo Interno",
  ajuste_positivo: "Ajuste Positivo",
  ajuste_negativo: "Ajuste Negativo",
  transferencia: "Transferência"
};

const TIPO_BADGE_COLORS = {
  saida_manual: "bg-red-50 dark:bg-red-950/20 text-red-600 border-red-200 dark:border-red-900/30",
  perda: "bg-orange-50 dark:bg-orange-950/20 text-orange-600 border-orange-200 dark:border-orange-900/30",
  consumo_interno: "bg-blue-50 dark:bg-blue-950/20 text-blue-600 border-blue-200 dark:border-blue-900/30",
  ajuste_positivo: "bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 border-emerald-200 dark:border-emerald-900/30",
  ajuste_negativo: "bg-rose-50 dark:bg-rose-950/20 text-rose-600 border-rose-200 dark:border-rose-900/30",
  transferencia: "bg-purple-50 dark:bg-purple-950/20 text-purple-600 border-purple-200 dark:border-purple-900/30"
};

const defaultForm = {
  nome: "",
  tipo: "saida_manual",
  ativo: true
};

export default function ConfiguracoesMotivosEstoque() {
  const navigate = useNavigate();
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Dialog State
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(defaultForm);

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await http.get("/configuracoes/motivos-estoque");
      setList(res.data);
    } catch (error) {
      toast.error("Erro ao carregar motivos de movimentação.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleOpenNew = () => {
    setEditing(null);
    setForm(defaultForm);
    setOpen(true);
  };

  const handleOpenEdit = (item) => {
    setEditing(item);
    setForm({
      nome: item.nome,
      tipo: item.tipo,
      ativo: item.ativo
    });
    setOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.nome.trim()) {
      return toast.error("O nome do motivo é obrigatório.");
    }

    try {
      if (editing) {
        await http.put(`/configuracoes/motivos-estoque/${editing.id}`, form);
        toast.success("Motivo atualizado com sucesso!");
      } else {
        await http.post("/configuracoes/motivos-estoque", form);
        toast.success("Motivo cadastrado com sucesso!");
      }
      setOpen(false);
      loadData();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Erro ao salvar motivo.");
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 fade-in min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-800 dark:text-zinc-200">
      
      {/* Back Button */}
      <Button 
        variant="ghost" 
        onClick={() => navigate("/cadastros")} 
        className="mb-4 text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
      >
        <ArrowLeft className="w-4 h-4 mr-1" /> Voltar para Cadastros
      </Button>

      <PageHeader 
        overline="Cadastros de Estoque" 
        title="Motivos de Movimentação" 
        action={
          <Button 
            onClick={handleOpenNew}
            className="bg-[#84A59D] hover:bg-[#6F9189] text-white flex items-center gap-1.5 font-bold shadow-xs rounded-lg h-10"
          >
            <PlusCircle className="w-4 h-4" /> Novo Motivo
          </Button>
        } 
      />

      <div className="mt-6 space-y-6">
        <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/60 rounded-xl p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-500 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-amber-800 dark:text-amber-450 leading-relaxed">
            <strong>Controle Operacional:</strong> Os motivos configurados aqui serão listados ao realizar saídas manuais, perdas, consumo interno e ajustes na tela de estoque, garantindo que todo evento seja categorizado corretamente para relatórios de auditoria.
          </div>
        </div>

        {loading ? (
          <div className="text-center py-20 text-zinc-400 dark:text-zinc-500 font-semibold">
            Carregando motivos...
          </div>
        ) : list.length === 0 ? (
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-850 rounded-2xl p-12 text-center shadow-xs">
            <Layers className="w-12 h-12 text-zinc-300 dark:text-zinc-700 mx-auto mb-4" />
            <h3 className="font-bold text-lg text-zinc-900 dark:text-zinc-100">Nenhum motivo cadastrado</h3>
            <p className="text-sm text-zinc-400 dark:text-zinc-500 mt-2">Clique em "Novo Motivo" para iniciar o cadastro.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {list.map((item) => (
              <Card 
                key={item.id}
                className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-850 rounded-2xl hover:shadow-md transition-all duration-200 flex flex-col justify-between"
              >
                <CardContent className="p-6 space-y-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-bold text-base text-zinc-900 dark:text-zinc-50 leading-tight">{item.nome}</h4>
                      <span className={`inline-block border text-[10px] font-bold px-2 py-0.5 rounded-full mt-2 uppercase tracking-wider ${TIPO_BADGE_COLORS[item.tipo]}`}>
                        {TIPO_LABELS[item.tipo]}
                      </span>
                    </div>
                    <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider ${
                      item.ativo 
                        ? "bg-emerald-50 text-emerald-600 border border-emerald-100 dark:bg-emerald-950/20" 
                        : "bg-zinc-100 text-zinc-400 dark:bg-zinc-850 dark:text-zinc-500"
                    }`}>
                      {item.ativo ? "Ativo" : "Inativo"}
                    </span>
                  </div>

                  <div className="flex justify-end pt-3 border-t border-zinc-100 dark:border-zinc-850">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => handleOpenEdit(item)}
                      className="flex items-center gap-1 border-zinc-250 dark:border-zinc-800 text-xs font-semibold h-8"
                    >
                      <Pencil className="w-3 h-3" /> Editar
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Form Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md w-full bg-white dark:bg-zinc-900 border-0 rounded-2xl shadow-2xl p-6">
          <DialogHeader className="border-b border-zinc-150 dark:border-zinc-850 pb-4 mb-4">
            <DialogTitle className="flex items-center gap-2.5 text-lg font-bold text-zinc-950 dark:text-zinc-50">
              <Layers className="w-5 h-5 text-[#84A59D]" />
              {editing ? "Editar Motivo" : "Novo Motivo de Movimentação"}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSave} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="nome" className="font-bold text-xs text-zinc-500 uppercase tracking-wider">Nome / Descrição *</Label>
              <Input 
                id="nome"
                required
                placeholder="Ex: Produto Danificado, Uso em Treinamento"
                value={form.nome}
                onChange={(e) => setForm({ ...form, nome: e.target.value })}
                className="rounded-lg border-zinc-250 dark:border-zinc-800"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="tipo" className="font-bold text-xs text-zinc-500 uppercase tracking-wider">Tipo da Movimentação *</Label>
              <Select 
                value={form.tipo} 
                onValueChange={(val) => setForm({ ...form, tipo: val })}
              >
                <SelectTrigger id="tipo" className="w-full bg-transparent border-zinc-250 dark:border-zinc-800">
                  <SelectValue placeholder="Selecione o tipo..." />
                </SelectTrigger>
                <SelectContent className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
                  {Object.entries(TIPO_LABELS).map(([k, v]) => (
                    <SelectItem key={k} value={k} className="hover:bg-zinc-50 dark:hover:bg-zinc-800 cursor-pointer">
                      {v}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-between p-3 bg-zinc-50 dark:bg-zinc-950/40 border border-zinc-200 dark:border-zinc-850 rounded-xl">
              <div>
                <Label htmlFor="ativo" className="font-bold text-xs text-zinc-700 dark:text-zinc-200 block">Status Ativo</Label>
                <span className="text-[10px] text-zinc-400 block mt-0.5">Se inativo, o motivo não será exibido nos lançamentos.</span>
              </div>
              <Switch 
                id="ativo" 
                checked={form.ativo} 
                onCheckedChange={(v) => setForm({ ...form, ativo: v })} 
              />
            </div>

            <DialogFooter className="pt-4 border-t border-zinc-150 dark:border-zinc-850 gap-2 flex flex-col sm:flex-row -mx-6 -mb-6 px-6 pb-6 bg-zinc-50/50 dark:bg-zinc-900/10 mt-6 rounded-b-2xl">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setOpen(false)}
                className="w-full sm:w-auto h-10 border-zinc-250 dark:border-zinc-850"
              >
                Cancelar
              </Button>
              <Button 
                type="submit" 
                className="w-full sm:w-auto bg-[#84A59D] hover:bg-[#6F9189] text-white font-bold h-10 px-6 shadow-sm rounded-lg"
              >
                Salvar Motivo
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
