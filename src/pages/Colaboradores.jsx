import React, { useEffect, useState, useRef } from "react";
import http from "../api";
import { PageHeader, EmptyState } from "../components/Page";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Switch } from "../components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "../components/ui/dialog";
import { UserCog, Plus, Edit2, Trash2, History, Settings2 } from "lucide-react";
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
        onRestoreSuccess={load}
      />

      <Dialog open={comissoesServicosOpen} onOpenChange={setComissoesServicosOpen}>
        <DialogContent className="sm:max-w-4xl max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Comissões por Serviço - {form.nome}</DialogTitle>
          </DialogHeader>
          <ComissoesServicosForm 
            colaboradorId={form.id} 
            defaultComissaoSozinho={Number(form.comissao_sozinho || 0)}
            defaultComissaoAjuda={Number(form.comissao_ajuda || 0)}
            defaultComissaoAuxiliar={Number(form.comissao_auxiliar || 0)}
            onClose={() => setComissoesServicosOpen(false)} 
          />
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

  useEffect(() => {
    if (colaboradorId) {
      loadComissoes();
    }
  }, [colaboradorId]);

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

  if (loading) {
    return <div className="py-8 text-center text-zinc-500">Carregando serviços e configurações...</div>;
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="mb-4">
        <Input 
          type="text" 
          placeholder="Pesquisar por nome ou descrição do serviço..." 
          value={searchTerm} 
          onChange={(e) => setSearchTerm(e.target.value)} 
          className="w-full"
        />
      </div>
      <div className="flex-1 overflow-y-auto pr-2 py-2">
        <div className="border border-zinc-200 dark:border-zinc-800 rounded-lg overflow-hidden">
          <table className="w-full text-sm text-left">
            <thead className="bg-zinc-50 dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 text-zinc-500 font-semibold">
              <tr>
                <th className="p-3">Serviço</th>
                <th className="p-3 w-32">Sozinho (%)</th>
                <th className="p-3 w-32">Com assistente (%)</th>
                <th className="p-3 w-32">Auxiliar (%)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
              {filteredServicos.length === 0 ? (
                <tr>
                  <td colSpan="4" className="p-4 text-center text-zinc-500">Nenhum serviço encontrado.</td>
                </tr>
              ) : (
                filteredServicos.map((item) => {
                  const isCustom = 
                    Number(item.comissao_sozinho || 0) !== defaultComissaoSozinho ||
                    Number(item.comissao_ajuda || 0) !== defaultComissaoAjuda ||
                    Number(item.comissao_auxiliar || 0) !== defaultComissaoAuxiliar;

                  return (
                    <tr 
                      key={item.servico_id} 
                      className={isCustom 
                        ? "bg-emerald-50 dark:bg-emerald-950/20 hover:bg-emerald-100/50 dark:hover:bg-emerald-950/30 transition-colors" 
                        : "hover:bg-zinc-50/50 dark:hover:bg-zinc-950/20 transition-colors"
                      }
                    >
                      <td className="p-3 font-medium text-zinc-700 dark:text-zinc-300">
                        <div>{item.servico_nome}</div>
                        {item.servico_descricao && (
                          <div className="text-xs text-zinc-400 dark:text-zinc-500 font-normal mt-0.5">{item.servico_descricao}</div>
                        )}
                      </td>
                      <td className="p-3">
                        <Input 
                          type="number" 
                          min={0}
                          max={100}
                          value={item.comissao_sozinho} 
                          onChange={(e) => handleValueChange(item.servico_id, 'comissao_sozinho', e.target.value)}
                          className="h-8 py-0 px-2"
                        />
                      </td>
                      <td className="p-3">
                        <Input 
                          type="number" 
                          min={0}
                          max={100}
                          value={item.comissao_ajuda} 
                          onChange={(e) => handleValueChange(item.servico_id, 'comissao_ajuda', e.target.value)}
                          className="h-8 py-0 px-2"
                        />
                      </td>
                      <td className="p-3">
                        <Input 
                          type="number" 
                          min={0}
                          max={100}
                          value={item.comissao_auxiliar} 
                          onChange={(e) => handleValueChange(item.servico_id, 'comissao_auxiliar', e.target.value)}
                          className="h-8 py-0 px-2"
                        />
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
      <DialogFooter className="pt-4 border-t border-zinc-100 dark:border-zinc-900">
        <Button variant="outline" onClick={onClose} disabled={saving}>Cancelar</Button>
        <Button onClick={handleSave} className="bg-[#84A59D] hover:bg-[#6F9189]" disabled={saving}>
          {saving ? "Salvando..." : "Salvar Alterações"}
        </Button>
      </DialogFooter>
    </div>
  );
}
