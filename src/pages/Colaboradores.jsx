import React, { useEffect, useState, useRef } from "react";
import http from "../api";
import { PageHeader, EmptyState } from "../components/Page";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Switch } from "../components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "../components/ui/dialog";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "../components/ui/select";
import { UserCog, Plus, Edit2, Trash2, History, Settings2, Layers, ChevronDown, ChevronRight, Check, Search, Info, Percent, RotateCcw } from "lucide-react";
import PercentageInput from "../components/PercentageInput.jsx";
import { toast } from "sonner";
import AuditModal from "../components/AuditModal";
import { useAuth } from "../auth";

const blank = { nome: "", cargo: "", telefone: "", comissao_sozinho: 40, comissao_ajuda: 30, comissao_auxiliar: 20, usar_comissao_avancada: false, ativo: true, foto: null };

export default function Colaboradores() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const canCreate = isAdmin || user?.perfil?.permissoes?.["colaboradores.criar"] === true;
  const canEdit = isAdmin || user?.perfil?.permissoes?.["colaboradores.editar"] === true;
  const canDelete = isAdmin || user?.perfil?.permissoes?.["colaboradores.excluir"] === true;
  const canViewSensitiveData = isAdmin || user?.perfil?.permissoes?.["colaboradores.dados_sensiveis"] === true;

  const [list, setList] = useState([]);
  const [open, setOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [form, setForm] = useState(blank);
  const [auditOpen, setAuditOpen] = useState(false);
  const [nameError, setNameError] = useState(false);
  const [comissoesServicosOpen, setComissoesServicosOpen] = useState(false);
  const nomeInputRef = useRef(null);

  const handlePhotoChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error("A imagem deve ter no máximo 5MB");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const MAX_WIDTH = 256;
        const MAX_HEIGHT = 256;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, width, height);

        const base64 = canvas.toDataURL("image/jpeg", 0.7);
        setForm(prev => ({ ...prev, foto: base64 }));
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
  };

  const load = () => http.get("/colaboradores").then((r) => setList(r.data));
  useEffect(() => { load(); }, []);

  const handleFormComissaoChange = (field, value) => {
    if (value === "") {
      setForm(prev => ({ ...prev, [field]: "" }));
      return;
    }
    let val = parseFloat(value);
    if (!isNaN(val)) {
      if (val < 0) val = 0;
      if (val > 100) val = 100;
    } else {
      val = 0;
    }
    setForm(prev => ({ ...prev, [field]: val }));
  };

  const save = async () => {
    if (!form.nome || !form.nome.trim()) {
      toast.error("O preenchimento do campo Nome é obrigatório para a conclusão do cadastro.");
      setNameError(true);
      nomeInputRef.current?.focus();
      return;
    }

    const comissao_sozinho = Number(form.comissao_sozinho || 0);
    const comissao_ajuda = Number(form.comissao_ajuda || 0);
    const comissao_auxiliar = Number(form.comissao_auxiliar || 0);

    if (comissao_sozinho < 0 || comissao_sozinho > 100 ||
        comissao_ajuda < 0 || comissao_ajuda > 100 ||
        comissao_auxiliar < 0 || comissao_auxiliar > 100) {
      toast.error("Os percentuais de comissão padrão do colaborador devem estar entre 0% e 100%.");
      return;
    }

    try {
      const payload = { 
        ...form, 
        comissao_principal: comissao_sozinho, 
        comissao_sozinho: comissao_sozinho, 
        comissao_ajuda: comissao_ajuda, 
        comissao_auxiliar: comissao_auxiliar 
      };
      if (form.id) await http.put(`/colaboradores/${form.id}`, payload); else await http.post("/colaboradores", payload);
      toast.success("Salvo"); setOpen(false); setForm(blank); load();
    } catch (e) { toast.error(e.response?.data?.detail || "Erro ao salvar"); }
  };
  
  const del = (id) => {
    setDeletingId(id);
    setDeleteConfirmOpen(true);
  };

  const confirmDelete = async () => {
    if (!deletingId) return;
    try {
      await http.delete(`/colaboradores/${deletingId}`);
      toast.success("Colaborador removido");
      setDeleteConfirmOpen(false);
      setDeletingId(null);
      load();
    } catch (e) {
      toast.error(e.response?.data?.detail || "Erro ao remover");
    }
  };

  const edit = (c) => { 
    setNameError(false);
    setForm({
      ...c,
      comissao_sozinho: c.comissao_sozinho !== undefined && c.comissao_sozinho !== null ? c.comissao_sozinho : (c.comissao_principal || 40),
      comissao_ajuda: c.comissao_ajuda !== undefined && c.comissao_ajuda !== null ? c.comissao_ajuda : 30,
      comissao_auxiliar: c.comissao_auxiliar !== undefined && c.comissao_auxiliar !== null ? c.comissao_auxiliar : 20,
      usar_comissao_avancada: !!c.usar_comissao_avancada
    }); 
    setOpen(true); 
  };

  return (
    <div className="p-6 lg:p-8 fade-in">
      <PageHeader overline="Equipe" title="Colaboradores" action={
        <Dialog open={open} onOpenChange={(v) => { setOpen(v); setNameError(false); if (!v) setForm(blank); }}>
          {canCreate && (
            <Button onClick={() => setOpen(true)} data-testid="add-colaborador-btn" className="bg-[#84A59D] hover:bg-[#6F9189]"><Plus className="w-4 h-4 mr-1" /> Novo colaborador</Button>
          )}
          <DialogContent>
            <DialogHeader><DialogTitle>{form.id ? "Editar" : "Novo"} colaborador</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div className="flex flex-col items-center justify-center gap-2 pb-2">
                <div className="relative group cursor-pointer" onClick={() => document.getElementById("colab-avatar-upload").click()}>
                  <div className="w-24 h-24 rounded-full overflow-hidden border-2 border-zinc-200 dark:border-zinc-800 flex items-center justify-center bg-zinc-50 dark:bg-zinc-950">
                    {form.foto ? (
                      <img src={form.foto} alt="Preview" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-zinc-400 dark:text-zinc-500 font-bold text-2xl">
                        {form.nome ? form.nome.charAt(0).toUpperCase() : <Plus className="w-8 h-8" />}
                      </span>
                    )}
                  </div>
                  <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <span className="text-white text-xs font-semibold">Alterar</span>
                  </div>
                </div>
                <input
                  id="colab-avatar-upload"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handlePhotoChange}
                />
                {form.foto && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="text-rose-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/20 text-xs h-7 px-2"
                    onClick={() => setForm(prev => ({ ...prev, foto: null }))}
                  >
                    Remover foto
                  </Button>
                )}
              </div>
              <div>
                <Label className={nameError ? "text-rose-500 font-semibold" : ""}>Nome *</Label>
                <Input 
                  ref={nomeInputRef}
                  data-testid="colab-nome" 
                  value={form.nome} 
                  onChange={(e) => {
                    setForm({ ...form, nome: e.target.value });
                    if (e.target.value.trim()) {
                      setNameError(false);
                    }
                  }} 
                  className={nameError ? "border-rose-500 focus-visible:ring-rose-500 focus-visible:border-rose-500" : ""} 
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div><Label>Cargo</Label><Input value={form.cargo} onChange={(e) => setForm({ ...form, cargo: e.target.value })} /></div>
                <div><Label>Telefone</Label><Input value={form.telefone} onChange={(e) => setForm({ ...form, telefone: e.target.value })} /></div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div><Label>Sozinho (%)</Label><Input type="number" min={0} max={100} disabled={form.usar_comissao_avancada} value={form.comissao_sozinho} onChange={(e) => handleFormComissaoChange('comissao_sozinho', e.target.value)} /></div>
                <div><Label>Com assistente (%)</Label><Input type="number" min={0} max={100} disabled={form.usar_comissao_avancada} value={form.comissao_ajuda} onChange={(e) => handleFormComissaoChange('comissao_ajuda', e.target.value)} /></div>
                <div><Label>Auxiliar (%)</Label><Input type="number" min={0} max={100} disabled={form.usar_comissao_avancada} value={form.comissao_auxiliar} onChange={(e) => handleFormComissaoChange('comissao_auxiliar', e.target.value)} /></div>
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={form.usar_comissao_avancada} onCheckedChange={(v) => setForm({ ...form, usar_comissao_avancada: v })} />
                <Label>Utilizar Comissão Avançada por Serviço</Label>
              </div>
              {form.id && form.usar_comissao_avancada && (
                <div className="pt-1">
                  <Button 
                    type="button" 
                    variant="outline" 
                    className="w-full text-[#84A59D] border-[#84A59D] hover:bg-[#84A59D]/10 gap-1.5"
                    onClick={() => setComissoesServicosOpen(true)}
                  >
                    <Settings2 className="w-4 h-4" />
                    Configurar Comissões por Serviço
                  </Button>
                </div>
              )}
              <div className="flex items-center gap-2"><Switch checked={form.ativo} onCheckedChange={(v) => setForm({ ...form, ativo: v })} /><Label>Ativo</Label></div>
            </div>
            <DialogFooter><Button data-testid="save-colab-btn" onClick={save} className="bg-[#84A59D] hover:bg-[#6F9189]">Salvar</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      } />

      <div className="flex justify-end mb-4">
        <Button 
          variant="outline" 
          onClick={() => setAuditOpen(true)}
          className="flex items-center gap-1.5 text-xs font-semibold text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200 border border-zinc-200 dark:border-zinc-800"
        >
          <History className="w-3.5 h-3.5" />
          <span>Excluídos</span>
        </Button>
      </div>

      {list.length === 0 ? <EmptyState icon={UserCog} title="Nenhum colaborador" hint="Cadastre profissionais para começar a agendar." /> : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {list.map((c) => (
            <div key={c.id} className="bg-white border border-zinc-200 rounded-xl p-5" data-testid={`colab-card-${c.id}`}>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-20 h-20 rounded-full overflow-hidden bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-2xl text-[#3A4F4A] dark:text-zinc-355 font-bold shrink-0 border border-zinc-100 dark:border-zinc-800">
                    {c.foto ? (
                      <img src={c.foto} alt={c.nome} className="w-full h-full object-cover" />
                    ) : (
                      c.nome?.charAt(0).toUpperCase()
                    )}
                  </div>
                  <div>
                    <div className="font-display text-lg font-semibold">{c.nome}</div>
                    <div className="text-sm text-zinc-500 flex flex-wrap items-center gap-1.5 mt-0.5">
                      <span>{c.cargo || "—"}</span>
                      {c.usar_comissao_avancada && (
                        <span className="inline-flex items-center rounded bg-emerald-50 dark:bg-emerald-950/30 px-1.5 py-0.5 text-[10px] font-medium text-emerald-700 dark:text-emerald-400 border border-emerald-200/30 dark:border-emerald-900/30">
                          Comissão Avançada
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full ${c.ativo ? "bg-emerald-100 text-emerald-700" : "bg-zinc-100 text-zinc-500"}`}>{c.ativo ? "Ativo" : "Inativo"}</span>
              </div>
              <div className="mt-4 text-sm text-zinc-600 space-y-1">
                {/* Dados sensíveis: exibe se tem permissão global OU se é o próprio colaborador vinculado */}
                {(canViewSensitiveData || c.telefone !== undefined) && (
                  <div>📞 {c.telefone || "—"}</div>
                )}
                {(canViewSensitiveData || c.comissao_sozinho !== undefined) && (
                  <div>Comissão sozinho: <b>{c.comissao_sozinho !== null && c.comissao_sozinho !== undefined ? c.comissao_sozinho : c.comissao_principal}%</b></div>
                )}
                {(canViewSensitiveData || c.comissao_ajuda !== undefined) && (
                  <div>Comissão c/ assistente: <b>{c.comissao_ajuda !== undefined ? c.comissao_ajuda : 30}%</b></div>
                )}
                {(canViewSensitiveData || c.comissao_auxiliar !== undefined) && (
                  <div>Comissão auxiliar: <b>{c.comissao_auxiliar}%</b></div>
                )}
              </div>
              <div className="mt-4 pt-3 border-t border-zinc-100 flex gap-2">
                {canEdit && <Button size="sm" variant="outline" onClick={() => edit(c)}><Edit2 className="w-3 h-3 mr-1" /> Editar</Button>}
                {canDelete && <Button size="sm" variant="ghost" onClick={() => del(c.id)}><Trash2 className="w-3 h-3 text-rose-500" /></Button>}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Dialog de confirmação de exclusão */}
      <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Confirmar exclusão</DialogTitle>
          </DialogHeader>
          <div className="py-4 text-sm text-zinc-600 dark:text-zinc-400">
            Tem certeza que deseja excluir este colaborador? Esta ação pode ser desfeita a qualquer momento a partir da tela de "Excluídos".
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDeleteConfirmOpen(false)}>Cancelar</Button>
            <Button onClick={confirmDelete} className="bg-rose-500 hover:bg-rose-600 text-white">Excluir</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AuditModal 
        isOpen={auditOpen} 
        onClose={() => setAuditOpen(false)} 
        modulo="colaborador" 
        tituloModulo="Colaboradores"
      />

      <Dialog open={comissoesServicosOpen} onOpenChange={setComissoesServicosOpen}>
        <DialogContent className="w-[calc(100vw-2rem)] sm:max-w-5xl max-h-[92dvh] flex flex-col p-0 overflow-hidden rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-2xl">
          <DialogHeader className="shrink-0 px-5 sm:px-6 pt-5 pb-3 border-b border-zinc-100 dark:border-zinc-800/80 bg-zinc-50/50 dark:bg-zinc-950/20">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-[#84A59D]/15 dark:bg-[#84A59D]/10 text-[#4F736B] dark:text-[#84A59D]">
                <Settings2 className="w-5 h-5 animate-pulse-subtle" />
              </div>
              <div className="min-w-0">
                <DialogTitle className="font-display text-base sm:text-lg font-bold text-zinc-800 dark:text-zinc-100 flex flex-wrap items-center gap-x-2 gap-y-1 pr-6">
                  Comissões por Serviço — <span className="text-[#4F736B] dark:text-[#84A59D] font-extrabold">{form.nome}</span>
                </DialogTitle>
                <p className="text-xs text-zinc-450 dark:text-zinc-500 mt-0.5">
                  Defina taxas personalizadas de comissão por serviço executado. Valores não preenchidos seguirão as taxas padrão.
                </p>
              </div>
            </div>
          </DialogHeader>

          <div className="flex-1 flex flex-col overflow-hidden p-4 sm:p-5 min-h-0">
            <ComissoesServicosForm 
              colaboradorId={form.id} 
              defaultComissaoSozinho={Number(form.comissao_sozinho || 0)}
              defaultComissaoAjuda={Number(form.comissao_ajuda || 0)}
              defaultComissaoAuxiliar={Number(form.comissao_auxiliar || 0)}
              onClose={() => setComissoesServicosOpen(false)} 
            />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ComissoesServicosForm({ colaboradorId, defaultComissaoSozinho, defaultComissaoAjuda, defaultComissaoAuxiliar, onClose }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [servicosComissoes, setServicosComissoes] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");

  // Estado para atualização por categoria
  const [categorias, setCategorias] = useState([]);
  const [catSelecionada, setCatSelecionada] = useState("");
  const [catSozinho, setCatSozinho] = useState("");
  const [catAjuda, setCatAjuda] = useState("");
  const [catAuxiliar, setCatAuxiliar] = useState("");
  const [catPanelOpen, setCatPanelOpen] = useState(false);

  useEffect(() => {
    if (colaboradorId) {
      loadComissoes();
    }
  }, [colaboradorId]);

  useEffect(() => {
    http.get("/categorias").then((r) => {
      const cats = (r.data || []).filter(c => c.tipo === 'servico' || c.tipo === 'ambos');
      setCategorias(cats);
    }).catch(() => {});
  }, []);

  const loadComissoes = async () => {
    try {
      setLoading(true);
      const res = await http.get(`/colaboradores/${colaboradorId}/comissoes-servicos`);
      setServicosComissoes(res.data);
    } catch (e) {
      toast.error("Erro ao carregar comissões por serviço.");
    } finally {
      setLoading(false);
    }
  };

  const handleValueChange = (servicoId, field, value) => {
    if (value === "") {
      setServicosComissoes(prev => prev.map(item => {
        if (item.servico_id === servicoId) {
          return { ...item, [field]: "" };
        }
        return item;
      }));
      return;
    }

    let val = parseFloat(value);
    if (!isNaN(val)) {
      if (val < 0) val = 0;
      if (val > 100) val = 100;
    } else {
      val = 0;
    }

    setServicosComissoes(prev => prev.map(item => {
      if (item.servico_id === servicoId) {
        return { ...item, [field]: val };
      }
      return item;
    }));
  };

  const handleResetToDefault = (servicoId) => {
    setServicosComissoes(prev => prev.map(item => {
      if (item.servico_id === servicoId) {
        return {
          ...item,
          comissao_sozinho: defaultComissaoSozinho,
          comissao_ajuda: defaultComissaoAjuda,
          comissao_auxiliar: defaultComissaoAuxiliar
        };
      }
      return item;
    }));
    toast.success("Comissões redefinidas para os percentuais padrão.");
  };

  const handleAplicarCategoria = () => {
    if (!catSelecionada) {
      toast.error("Selecione uma categoria.");
      return;
    }
    if (catSozinho === "" && catAjuda === "" && catAuxiliar === "") {
      toast.error("Informe pelo menos um percentual para aplicar.");
      return;
    }

    const parseSafe = (v) => {
      if (v === "" || v === null || v === undefined) return null;
      const n = parseFloat(v);
      return isNaN(n) ? null : Math.min(100, Math.max(0, n));
    };

    const solo = parseSafe(catSozinho);
    const ajuda = parseSafe(catAjuda);
    const aux = parseSafe(catAuxiliar);

    let count = 0;
    setServicosComissoes(prev => prev.map(item => {
      if (item.categoria_id === catSelecionada) {
        count++;
        return {
          ...item,
          ...(solo !== null ? { comissao_sozinho: solo } : {}),
          ...(ajuda !== null ? { comissao_ajuda: ajuda } : {}),
          ...(aux !== null ? { comissao_auxiliar: aux } : {})
        };
      }
      return item;
    }));

    const catNome = categorias.find(c => c.id === catSelecionada)?.nome || "categoria";
    toast.success(`Percentuais aplicados a ${count} serviço(s) da categoria "${catNome}".`);
  };

  const handleSave = async () => {
    for (const item of servicosComissoes) {
      const solo = Number(item.comissao_sozinho);
      const ajuda = Number(item.comissao_ajuda);
      const aux = Number(item.comissao_auxiliar);
      
      if (isNaN(solo) || solo < 0 || solo > 100 ||
          isNaN(ajuda) || ajuda < 0 || ajuda > 100 ||
          isNaN(aux) || aux < 0 || aux > 100) {
        toast.error(`Os percentuais do serviço "${item.servico_nome}" devem estar entre 0% e 100%.`);
        return;
      }
    }

    try {
      setSaving(true);
      const payload = {
        comissoes: servicosComissoes.map(c => ({
          servico_id: c.servico_id,
          comissao_sozinho: Number(c.comissao_sozinho || 0),
          comissao_ajuda: Number(c.comissao_ajuda || 0),
          comissao_auxiliar: Number(c.comissao_auxiliar || 0)
        }))
      };
      await http.put(`/colaboradores/${colaboradorId}/comissoes-servicos`, payload);
      toast.success("Comissões atualizadas com sucesso!");
      onClose();
    } catch (e) {
      toast.error(e.response?.data?.detail || "Erro ao salvar comissões.");
    } finally {
      setSaving(false);
    }
  };

  const filteredServicos = servicosComissoes.filter(item => 
    (item.servico_nome || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
    (item.servico_descricao || "").toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Categorias que possuem serviços na lista (para o select)
  const categoriasComServicos = categorias.filter(cat =>
    servicosComissoes.some(s => s.categoria_id === cat.id)
  );

  const customCount = servicosComissoes.filter(item => 
    Number(item.comissao_sozinho || 0) !== defaultComissaoSozinho ||
    Number(item.comissao_ajuda || 0) !== defaultComissaoAjuda ||
    Number(item.comissao_auxiliar || 0) !== defaultComissaoAuxiliar
  ).length;

  if (loading) {
    return <div className="py-12 text-center text-zinc-400 dark:text-zinc-550 flex flex-col items-center justify-center gap-2">
      <div className="w-6 h-6 border-2 border-[#84A59D] border-t-transparent rounded-full animate-spin"></div>
      <span className="text-sm font-medium">Carregando serviços e configurações...</span>
    </div>;
  }

  return (
    <div className="h-full flex flex-col min-h-0">
      <div className="flex-1 min-h-0 overflow-y-auto pr-1 sm:pr-2 space-y-3">
      {/* Resumo de Configuração e Valores Padrão */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 bg-zinc-50/50 dark:bg-zinc-950/20 border border-zinc-100 dark:border-zinc-800/80 p-3 rounded-2xl text-xs">
        <div className="space-y-1">
          <span className="text-[10px] text-zinc-400 dark:text-zinc-500 uppercase font-bold block">Serviços Totais</span>
          <span className="font-semibold text-zinc-800 dark:text-zinc-200 text-sm">{servicosComissoes.length} cadastrados</span>
        </div>
        <div className="space-y-1">
          <span className="text-[10px] text-zinc-400 dark:text-zinc-500 uppercase font-bold block">Comissões Personalizadas</span>
          <span className="inline-flex items-center gap-1 font-semibold text-sm">
            <span className={customCount > 0 ? "text-emerald-600 dark:text-emerald-400 font-bold" : "text-zinc-650 dark:text-zinc-350"}>
              {customCount} serviços
            </span>
          </span>
        </div>
        <div className="space-y-1 md:col-span-2 bg-[#FAFDFD] dark:bg-zinc-900/60 border border-[#E1EEED] dark:border-zinc-800 px-3 py-1.5 rounded-xl">
          <span className="text-[10px] text-[#4F736B] dark:text-[#84A59D] uppercase font-extrabold block">Taxas Padrão do Profissional</span>
          <div className="flex flex-wrap gap-x-4 gap-y-1 mt-0.5 text-[11px] text-zinc-600 dark:text-zinc-400 font-medium">
            <span>Sozinho: <strong className="text-zinc-800 dark:text-zinc-200">{defaultComissaoSozinho}%</strong></span>
            <span>Com assistente: <strong className="text-zinc-800 dark:text-zinc-200">{defaultComissaoAjuda}%</strong></span>
            <span>Auxiliar: <strong className="text-zinc-800 dark:text-zinc-200">{defaultComissaoAuxiliar}%</strong></span>
          </div>
        </div>
      </div>

      {/* Painel: Atualizar por Categoria */}
      {categoriasComServicos.length > 0 && (
        <div className="border border-zinc-200/80 dark:border-zinc-805/90 rounded-2xl overflow-hidden shadow-sm bg-white dark:bg-zinc-950 transition-all duration-300">
          <button
            type="button"
            onClick={() => setCatPanelOpen(!catPanelOpen)}
            className="w-full flex items-center justify-between gap-3 px-4 py-2.5 bg-gradient-to-r from-zinc-50/80 to-transparent dark:from-zinc-900/50 dark:to-transparent hover:from-zinc-100/60 dark:hover:from-zinc-900/80 transition-all text-left"
          >
              <div className="flex items-center gap-2.5 min-w-0">
              <div className="p-1 rounded bg-[#84A59D]/15 text-[#4F736B] dark:text-[#84A59D]">
                <Layers className="w-3.5 h-3.5" />
              </div>
              <div>
                <span className="text-sm font-bold text-zinc-700 dark:text-zinc-200">Atualização em Lote por Categoria</span>
                <p className="text-[10px] text-zinc-400 dark:text-zinc-500 mt-0.5">Defina taxas em massa para todos os serviços de uma categoria específica</p>
              </div>
            </div>
            {catPanelOpen ? <ChevronDown className="w-4 h-4 text-zinc-400" /> : <ChevronRight className="w-4 h-4 text-zinc-400" />}
          </button>
          
          {catPanelOpen && (
            <div className="px-5 py-4 bg-zinc-50/30 dark:bg-zinc-900/10 border-t border-zinc-100 dark:border-zinc-850 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 items-end">
                <div className="sm:col-span-1">
                  <Label className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">Selecionar Categoria</Label>
                  <Select value={catSelecionada} onValueChange={setCatSelecionada}>
                    <SelectTrigger className="h-9 text-xs bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-850">
                      <SelectValue placeholder="Escolha a categoria" />
                    </SelectTrigger>
                    <SelectContent className="dark:bg-zinc-900 dark:border-zinc-800">
                      {categoriasComServicos.map(cat => (
                        <SelectItem key={cat.id} value={cat.id} className="text-xs dark:text-zinc-200">
                          {cat.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="relative">
                  <Label className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">Sozinho (%)</Label>
                  <div className="relative flex items-center mt-1">
                       <PercentageInput
                         id="cat-solo"
                         value={catSozinho}
                         onChange={(e) => setCatSozinho(e.target.value)}
                         placeholder="Sem alteração"
                       />
                  </div>
                </div>
                <div className="relative">
                  <Label className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">Com assistente (%)</Label>
                  <div className="relative flex items-center mt-1">
                       <PercentageInput
                         id="cat-ajuda"
                         value={catAjuda}
                         onChange={(e) => setCatAjuda(e.target.value)}
                         placeholder="Sem alteração"
                       />
                  </div>
                </div>
                <div className="relative">
                  <Label className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">Auxiliar (%)</Label>
                  <div className="relative flex items-center mt-1">
                       <PercentageInput
                         id="cat-aux"
                         value={catAuxiliar}
                         onChange={(e) => setCatAuxiliar(e.target.value)}
                         placeholder="Sem alteração"
                       />
                  </div>
                </div>
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-t border-zinc-100 dark:border-zinc-850/80 pt-3">
                <p className="text-[10px] text-zinc-400 dark:text-zinc-550 font-medium">
                  {catSelecionada
                    ? `⚠️ Isso atualizará os percentuais de ${servicosComissoes.filter(s => s.categoria_id === catSelecionada).length} serviço(s) na lista local.`
                    : "Escolha uma categoria e preencha as taxas desejadas acima. Campos vazios não serão modificados."
                  }
                </p>
                <Button
                  type="button"
                  size="sm"
                  onClick={handleAplicarCategoria}
                  disabled={!catSelecionada}
                  className="bg-[#84A59D] hover:bg-[#6F9189] dark:bg-[#84A59D] dark:hover:bg-[#6F9189] dark:text-zinc-950 text-white text-xs h-8 px-4 gap-1.5 shadow-sm rounded-lg"
                >
                  <Check className="w-3.5 h-3.5" />
                  Aplicar Taxas
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Caixa de Busca com Ícone */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400 dark:text-zinc-500" />
        <Input 
          type="text" 
          placeholder="Pesquisar por nome ou descrição do serviço..." 
          value={searchTerm} 
          onChange={(e) => setSearchTerm(e.target.value)} 
          className="w-full pl-9 h-10 bg-zinc-50/50 dark:bg-zinc-950/20 border-zinc-200 dark:border-zinc-800 rounded-xl focus:bg-white dark:focus:bg-zinc-950 transition-colors"
        />
      </div>

      {/* Tabela de Serviços Scrollable */}
      <div className="min-h-[220px] max-h-[42vh] overflow-auto border border-zinc-200 dark:border-zinc-850 rounded-2xl shadow-sm bg-white dark:bg-zinc-900 pr-1 py-1">
        <table className="w-full min-w-[820px] text-sm text-left border-collapse">
          <thead className="bg-zinc-50/80 dark:bg-zinc-950/40 text-[11px] uppercase tracking-wider text-zinc-400 dark:text-zinc-500 font-bold sticky top-0 backdrop-blur-md z-10 border-b border-zinc-150 dark:border-zinc-850">
            <tr>
              <th className="p-4">Serviço</th>
              <th className="p-4 w-36">Sozinho</th>
              <th className="p-4 w-36">Com assistente</th>
              <th className="p-4 w-36">Auxiliar</th>
              <th className="p-4 w-20 text-center">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100 dark:divide-zinc-850/80">
            {filteredServicos.length === 0 ? (
              <tr>
                <td colSpan="5" className="p-12 text-center text-zinc-450 dark:text-zinc-550 italic">
                  Nenhum serviço correspondente encontrado.
                </td>
              </tr>
            ) : (
              filteredServicos.map((item) => {
                const isCustom = 
                  Number(item.comissao_sozinho || 0) !== defaultComissaoSozinho ||
                  Number(item.comissao_ajuda || 0) !== defaultComissaoAjuda ||
                  Number(item.comissao_auxiliar || 0) !== defaultComissaoAuxiliar;

                const catNome = categorias.find(c => c.id === item.categoria_id)?.nome;

                return (
                  <tr 
                    key={item.servico_id} 
                    className={`transition-colors duration-200 ${
                      isCustom 
                        ? "bg-emerald-50/20 dark:bg-emerald-950/10 hover:bg-emerald-50/40 dark:hover:bg-emerald-950/15 border-l-2 border-emerald-500" 
                        : "hover:bg-zinc-50/50 dark:hover:bg-zinc-950/30"
                    }`}
                  >
                    <td className="p-4 font-medium text-zinc-700 dark:text-zinc-200">
                      <div className="font-semibold text-sm">{item.servico_nome}</div>
                      <div className="flex flex-wrap items-center gap-1.5 mt-1">
                        {item.servico_descricao && (
                          <span className="text-xs text-zinc-400 dark:text-zinc-500 font-normal truncate max-w-[240px]" title={item.servico_descricao}>
                            {item.servico_descricao}
                          </span>
                        )}
                        {catNome && (
                          <span className="inline-flex items-center gap-0.5 text-[9px] font-extrabold uppercase tracking-wide text-zinc-500 bg-zinc-100 dark:text-zinc-400 dark:bg-zinc-800 px-1.5 py-0.5 rounded-md border border-zinc-200/40 dark:border-zinc-750">
                            <Layers className="w-2.5 h-2.5 text-[#84A59D]" />
                            {catNome}
                          </span>
                        )}
                        {isCustom && (
                          <span className="inline-flex items-center text-[9px] font-extrabold uppercase tracking-wide text-emerald-700 bg-emerald-50 border border-emerald-100 dark:text-emerald-400 dark:bg-emerald-950/45 dark:border-emerald-900/60 px-1.5 py-0.5 rounded-md">
                            Personalizado
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="relative flex items-center">
                        <PercentageInput
                          id={`solo-${item.servico_id}`}
                          value={item.comissao_sozinho}
                          onChange={(e) => handleValueChange(item.servico_id, 'comissao_sozinho', e.target.value)}
                        />
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="relative flex items-center">
                         <PercentageInput
                           id={`ajuda-${item.servico_id}`}
                           value={item.comissao_ajuda}
                           onChange={(e) => handleValueChange(item.servico_id, 'comissao_ajuda', e.target.value)}
                         />
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="relative flex items-center">
                        <Input 
                          type="number" 
                          min={0}
                          max={100}
                          value={item.comissao_auxiliar} 
                          onChange={(e) => handleValueChange(item.servico_id, 'comissao_auxiliar', e.target.value)}
                          className={`h-8 pr-7 text-right font-mono text-sm border-zinc-200 dark:border-zinc-750 bg-white dark:bg-zinc-900 focus-visible:ring-1 focus-visible:ring-[#84A59D] ${
                            Number(item.comissao_auxiliar || 0) !== defaultComissaoAuxiliar ? "font-bold text-emerald-600 dark:text-emerald-400" : ""
                          }`}
                        />
                        <span className="absolute right-2 text-zinc-400 dark:text-zinc-600 text-xs select-none">%</span>
                      </div>
                    </td>
                    <td className="p-4 text-center">
                      {isCustom ? (
                        <button
                          type="button"
                          onClick={() => handleResetToDefault(item.servico_id)}
                          title="Redefinir para a taxa padrão do profissional"
                          className="p-1 rounded-lg text-zinc-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/30 transition-colors inline-flex"
                        >
                          <RotateCcw className="w-4 h-4" />
                        </button>
                      ) : (
                        <span className="text-xs text-zinc-350 dark:text-zinc-650 italic select-none">Padrão</span>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Caixa de informações da legenda */}
      <div className="flex items-start gap-2 bg-blue-50/50 dark:bg-blue-950/20 border border-blue-100/60 dark:border-blue-900/30 p-3 rounded-xl text-[11px] text-blue-700 dark:text-blue-400/90 leading-relaxed shadow-sm">
        <Info className="w-4 h-4 shrink-0 text-blue-500 mt-0.5 animate-pulse" />
        <div>
          <strong>Dica de Visualização:</strong> Os serviços que possuem comissão personalizada são assinalados com fundo destacado, borda esquerda verde e badge <span className="bg-emerald-50 dark:bg-emerald-950/45 dark:border-emerald-900 border border-emerald-100 text-emerald-700 dark:text-emerald-450 px-1 py-0.2 rounded font-semibold text-[9px] uppercase tracking-wide mx-0.5">Personalizado</span>. Use o botão de redefinição (<RotateCcw className="w-3 h-3 inline mx-0.5 text-zinc-550" />) para restaurar a taxa padrão a qualquer momento.
        </div>
      </div>

      </div>

      <DialogFooter className="shrink-0 mt-4 pt-3 border-t border-zinc-100 dark:border-zinc-900 bg-white dark:bg-zinc-900 flex-row justify-end gap-2 space-x-0">
        <Button variant="outline" onClick={onClose} disabled={saving} className="rounded-xl px-5 border-zinc-200 dark:border-zinc-800">
          Cancelar
        </Button>
        <Button onClick={handleSave} className="bg-[#84A59D] hover:bg-[#6F9189] text-white font-semibold rounded-xl px-6 gap-1.5 shadow-sm" disabled={saving}>
          {saving ? (
            <>
              <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              <span>Salvando...</span>
            </>
          ) : (
            <span>Salvar Alterações</span>
          )}
        </Button>
      </DialogFooter>
    </div>
  );
}
