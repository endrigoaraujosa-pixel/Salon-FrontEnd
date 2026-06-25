import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import http from "../api";
import { PageHeader, EmptyState } from "../components/Page";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Switch } from "../components/ui/switch";
import { Textarea } from "../components/ui/textarea";
import { Card } from "../components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "../components/ui/dialog";
import { Landmark, Plus, Edit2, Trash2, CheckCircle2, ArrowLeft, Search, AlertCircle, FileText, History, HelpCircle } from "lucide-react";
import { toast } from "sonner";
import AuditModal from "../components/AuditModal";
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from "../components/ui/tooltip";

const blank = { descricao: "", ativo: true, observacao: "" };

export default function CadastroAdquirentes() {
  const navigate = useNavigate();
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [form, setForm] = useState(blank);
  const [search, setSearch] = useState("");
  const [auditOpen, setAuditOpen] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const r = await http.get("/adquirentes");
      setList(r.data);
    } catch (e) {
      toast.error("Erro ao carregar adquirentes");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const save = async () => {
    if (!form.descricao || !form.descricao.trim()) {
      return toast.error("A descrição é obrigatória");
    }
    try {
      if (form.id) {
        await http.put(`/adquirentes/${form.id}`, form);
      } else {
        await http.post("/adquirentes", form);
      }
      toast.success("Adquirente salva com sucesso!");
      setOpen(false);
      setForm(blank);
      load();
    } catch (e) {
      toast.error(e.response?.data?.detail || "Erro ao salvar adquirente");
    }
  };

  const del = (id) => {
    setDeletingId(id);
    setDeleteConfirmOpen(true);
  };

  const confirmDelete = async () => {
    if (!deletingId) return;
    try {
      await http.delete(`/adquirentes/${deletingId}`);
      toast.success("Adquirente excluída com sucesso");
      setDeleteConfirmOpen(false);
      setDeletingId(null);
      load();
    } catch (e) {
      toast.error(e.response?.data?.detail || "Erro ao remover adquirente");
    }
  };

  const edit = (adq) => {
    setForm(adq);
    setOpen(true);
  };

  const filteredList = list.filter((adq) =>
    adq.descricao.toLowerCase().includes(search.toLowerCase())
  );

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
        title={
          <div className="flex items-center gap-2">
            <span>Adquirentes (Maquinetas)</span>
            <TooltipProvider delayDuration={150}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button className="text-zinc-400 hover:text-zinc-650 dark:hover:text-zinc-200 transition-colors p-1 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-900 focus:outline-none">
                    <HelpCircle className="w-5 h-5" />
                  </button>
                </TooltipTrigger>
                <TooltipContent className="bg-zinc-900 text-white text-xs p-3 rounded-lg border border-zinc-800 shadow-md max-w-[280px] normal-case font-normal leading-relaxed">
                  Use esta tela para cadastrar as maquinetas de cartão (adquirentes) utilizadas no seu estabelecimento, como Stone, Rede, Cielo, etc. Ao cadastrá-las, você poderá configurar as taxas específicas cobradas por cada uma nas formas de pagamento.
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        }
        action={
          <Button
            onClick={() => {
              setForm(blank);
              setOpen(true);
            }}
            className="bg-[#84A59D] hover:bg-[#6F9189] text-white font-bold h-10 px-4 rounded-lg"
          >
            <Plus className="w-4 h-4 mr-1" /> Nova adquirente
          </Button>
        }
      />

      <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 mt-6">
        <div className="relative flex-1 max-w-md w-full">
          <Search className="absolute left-3 top-2.5 h-4.5 w-4.5 text-zinc-400" />
          <Input
            placeholder="Pesquisar adquirente por nome..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 rounded-lg text-sm h-10 w-full"
          />
        </div>
        <Button 
          variant="outline" 
          onClick={() => setAuditOpen(true)}
          className="flex items-center gap-1.5 text-xs font-semibold text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200 border border-zinc-250 dark:border-zinc-800 rounded-lg h-10 bg-white dark:bg-zinc-900 shadow-sm"
        >
          <History className="w-3.5 h-3.5" />
          <span>Restaurar Adquirentes</span>
        </Button>
      </div>

      {loading ? (
        <div className="text-zinc-450 p-8">Carregando adquirentes...</div>
      ) : filteredList.length === 0 ? (
        <EmptyState
          icon={Landmark}
          title="Nenhuma adquirente cadastrada"
          description="Cadastre as maquinetas utilizadas no salão para configurar taxas customizadas."
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredList.map((adq) => (
            <Card key={adq.id} className="p-6 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-850 rounded-2xl flex flex-col justify-between shadow-sm relative group">
              <div>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-3 rounded-xl bg-violet-50 dark:bg-violet-950/20 text-violet-500">
                      <Landmark className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="font-display font-bold text-lg text-zinc-900 dark:text-zinc-50">
                        {adq.descricao}
                      </h3>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold mt-1 ${
                        adq.ativo 
                          ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-400" 
                          : "bg-zinc-150 text-zinc-650 dark:bg-zinc-800 dark:text-zinc-400"
                      }`}>
                        {adq.ativo ? "Ativa" : "Inativa"}
                      </span>
                    </div>
                  </div>
                </div>
                {adq.observacao && (
                  <p className="text-sm text-zinc-550 dark:text-zinc-400 mt-4 leading-relaxed line-clamp-3">
                    {adq.observacao}
                  </p>
                )}
              </div>

              <div className="flex items-center justify-end gap-2 mt-6 pt-4 border-t border-zinc-100 dark:border-zinc-800">
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => edit(adq)}
                  className="h-8 w-8 text-zinc-500 hover:bg-zinc-50 dark:hover:bg-zinc-800 hover:text-zinc-700 dark:hover:text-zinc-200"
                >
                  <Edit2 className="w-4 h-4" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => del(adq.id)}
                  className="h-8 w-8 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/20"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Cadastro/Edição Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6">
          <DialogHeader>
            <DialogTitle className="font-display font-bold text-xl text-zinc-900 dark:text-zinc-50 flex items-center gap-2">
              <Landmark className="w-5 h-5 text-violet-500" />
              {form.id ? "Editar Adquirente" : "Nova Adquirente"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-1.5">
              <Label htmlFor="descricao" className="text-sm font-semibold">Descrição (Nome da Maquineta) *</Label>
              <Input
                id="descricao"
                placeholder="Ex: Stone, InfinityPay, PagSeguro"
                value={form.descricao}
                onChange={(e) => setForm({ ...form, descricao: e.target.value })}
                className="bg-zinc-50 dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 rounded-lg text-sm"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="observacao" className="text-sm font-semibold">Observações</Label>
              <Textarea
                id="observacao"
                placeholder="Insira detalhes adicionais sobre taxas gerais ou contato..."
                value={form.observacao || ""}
                onChange={(e) => setForm({ ...form, observacao: e.target.value })}
                className="bg-zinc-50 dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 rounded-lg text-sm min-h-[80px]"
              />
            </div>

            <div className="flex items-center justify-between bg-zinc-50 dark:bg-zinc-950 p-4 rounded-xl border border-zinc-150 dark:border-zinc-850 mt-2">
              <div className="space-y-0.5">
                <Label htmlFor="ativo" className="text-sm font-bold cursor-pointer">Adquirente Ativa</Label>
                <p className="text-xs text-zinc-500 leading-normal">
                  Se inativa, não aparecerá na seleção de novas vendas.
                </p>
              </div>
              <Switch
                id="ativo"
                checked={form.ativo}
                onCheckedChange={(checked) => setForm({ ...form, ativo: checked })}
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setOpen(false)} className="h-10 text-sm rounded-lg">
              Cancelar
            </Button>
            <Button
              onClick={save}
              className="bg-[#84A59D] hover:bg-[#6F9189] text-white font-bold h-10 px-6 rounded-lg"
            >
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <DialogContent className="max-w-md bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-850 p-6 rounded-2xl">
          <DialogHeader>
            <DialogTitle className="font-display font-bold text-lg text-zinc-900 dark:text-zinc-50 flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-rose-500" />
              Confirmar Exclusão
            </DialogTitle>
          </DialogHeader>

          <div className="py-4 text-sm text-zinc-550 dark:text-zinc-400 leading-relaxed space-y-2">
            <p>
              Tem certeza que deseja remover esta adquirente?
            </p>
            <p className="font-semibold text-rose-600 dark:text-rose-400">
              ⚠️ Esta ação irá arquivar a adquirente e inativar/arquivar todas as formas de pagamento vinculadas a ela!
            </p>
            <p className="text-xs text-zinc-400">
              O histórico financeiro de transações anteriores realizadas com esta adquirente será preservado integralmente.
            </p>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDeleteConfirmOpen(false)} className="h-10 text-sm rounded-lg">
              Cancelar
            </Button>
            <Button
              onClick={confirmDelete}
              className="bg-rose-500 hover:bg-rose-600 text-white font-bold h-10 px-6 rounded-lg"
            >
              Excluir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* RESTORE ADQUIRENTES AUDIT MODAL */}
      <AuditModal 
        isOpen={auditOpen} 
        onClose={() => setAuditOpen(false)} 
        modulo="adquirente" 
        tituloModulo="Adquirentes" 
        onRestoreSuccess={load}
      />
    </div>
  );
}
