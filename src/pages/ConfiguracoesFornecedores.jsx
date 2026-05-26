import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import http from "../api";
import { PageHeader } from "../components/Page";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "../components/ui/dialog";
import { 
  Plus, Trash2, Edit2, History, ArrowLeft,
  Search, Phone, Mail, MapPin, Notebook, Users, X
} from "lucide-react";
import { toast } from "sonner";
import AuditModal from "../components/AuditModal";

const fmtCPF_CNPJ = (val) => {
  const clean = String(val || "").replace(/\D/g, "");
  if (clean.length === 11) {
    return clean.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
  } else if (clean.length === 14) {
    return clean.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, "$1.$2.$3/$4-$5");
  }
  return val;
};

export default function ConfiguracoesFornecedores() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  
  // Fornecedores state
  const [fornecedores, setFornecedores] = useState([]);
  const [fornSearch, setFornSearch] = useState("");
  const [fornDialogOpen, setFornDialogOpen] = useState(false);
  const [fornEditingId, setFornEditingId] = useState(null);
  const [fornDeleteConfirmOpen, setFornDeleteConfirmOpen] = useState(false);
  const [fornDeletingId, setFornDeletingId] = useState(null);
  const [auditOpen, setAuditOpen] = useState(false);

  const [fornForm, setFornForm] = useState({
    nome_razosocial: "",
    cpf_cnpj: "",
    telefone: "",
    email: "",
    endereco: "",
    observacoes: ""
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const rForn = await http.get("/fornecedores");
      setFornecedores(rForn.data);
    } catch (e) {
      toast.error("Erro ao carregar fornecedores");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  const resetFornForm = () => {
    setFornForm({
      nome_razosocial: "",
      cpf_cnpj: "",
      telefone: "",
      email: "",
      endereco: "",
      observacoes: ""
    });
    setFornEditingId(null);
  };

  const openFornDialog = (supplier = null) => {
    if (supplier) {
      setFornForm({
        nome_razosocial: supplier.nome_razosocial || "",
        cpf_cnpj: supplier.cpf_cnpj || "",
        telefone: supplier.telefone || "",
        email: supplier.email || "",
        endereco: supplier.endereco || "",
        observacoes: supplier.observacoes || ""
      });
      setFornEditingId(supplier.id);
    } else {
      resetFornForm();
    }
    setFornDialogOpen(true);
  };

  const saveFornecedor = async () => {
    if (!fornForm.nome_razosocial.trim()) {
      toast.error("Nome/Razão Social é obrigatório");
      return;
    }

    try {
      if (fornEditingId) {
        await http.put(`/fornecedores/${fornEditingId}`, fornForm);
        toast.success("Fornecedor atualizado com sucesso");
      } else {
        await http.post("/fornecedores", fornForm);
        toast.success("Fornecedor criado com sucesso");
      }
      setFornDialogOpen(false);
      resetFornForm();
      loadData();
    } catch (e) {
      toast.error(e.response?.data?.detail || "Erro ao salvar fornecedor");
    }
  };

  const handleDeleteForn = (id) => {
    setFornDeletingId(id);
    setFornDeleteConfirmOpen(true);
  };

  const confirmDeleteForn = async () => {
    if (!fornDeletingId) return;
    try {
      await http.delete(`/fornecedores/${fornDeletingId}`);
      toast.success("Fornecedor removido com sucesso");
      setFornDeleteConfirmOpen(false);
      setFornDeletingId(null);
      loadData();
    } catch (e) {
      toast.error(e.response?.data?.detail || "Erro ao excluir fornecedor");
    }
  };

  const getFilteredFornecedores = () => {
    return fornecedores.filter(f => {
      if (!fornSearch.trim()) return true;
      const query = fornSearch.toLowerCase();
      return (
        (f.nome_razosocial || "").toLowerCase().includes(query) ||
        (f.cpf_cnpj || "").toLowerCase().includes(query) ||
        (f.telefone || "").toLowerCase().includes(query) ||
        (f.email || "").toLowerCase().includes(query)
      );
    });
  };

  const filteredFornecedores = getFilteredFornecedores();

  if (loading) return <div className="p-8 text-zinc-400">Carregando fornecedores...</div>;

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
        title="Cadastro de Fornecedores" 
        action={
          <Button 
            onClick={() => openFornDialog()} 
            className="bg-[#84A59D] hover:bg-[#6F9189] text-white shadow-sm flex items-center gap-1.5 rounded-lg font-semibold"
          >
            <Plus className="w-4 h-4 mr-0.5" /> Novo fornecedor
          </Button>
        }
      />

      <div className="flex flex-col sm:flex-row sm:items-center justify-end gap-4 mb-6">
        <Button 
          variant="outline" 
          onClick={() => setAuditOpen(true)}
          className="flex items-center gap-1.5 text-xs font-semibold text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200 border border-zinc-250 dark:border-zinc-800 rounded-lg"
        >
          <History className="w-3.5 h-3.5" />
          <span>Restaurar Fornecedores</span>
        </Button>
      </div>

      <div className="space-y-6">
        {/* Search bar */}
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 shadow-sm">
          <Label className="text-[10px] uppercase font-bold text-zinc-400 dark:text-zinc-500 tracking-wider">Filtrar Fornecedores</Label>
          <div className="relative mt-1">
            <Search className="absolute left-3 top-3 w-4 h-4 text-zinc-400" />
            <input
              type="text"
              value={fornSearch}
              onChange={(e) => setFornSearch(e.target.value)}
              placeholder="Buscar fornecedores por nome, CNPJ/CPF, telefone ou e-mail..."
              className="w-full h-10 pl-9 pr-8 bg-zinc-50 dark:bg-zinc-950 border border-zinc-250 dark:border-zinc-800 rounded-lg text-sm outline-none focus:border-[#84A59D] transition-colors"
            />
            {fornSearch && (
              <button onClick={() => setFornSearch("")} className="absolute right-3 top-3 text-zinc-400 hover:text-zinc-650">
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Supplier Grid table */}
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-sm overflow-x-auto">
          {filteredFornecedores.length === 0 ? (
            <div className="p-16 text-center text-zinc-400 dark:text-zinc-500">
              <Users className="w-10 h-10 mx-auto mb-3 opacity-40 text-zinc-400" />
              <p className="text-sm font-semibold">Nenhum fornecedor cadastrado</p>
              <p className="text-xs mt-1">Clique em "Novo fornecedor" para registrar sua rede de suprimentos.</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-zinc-50 dark:bg-zinc-900/50 text-xs uppercase tracking-wider font-semibold text-zinc-500 dark:text-zinc-400 border-b border-zinc-250 dark:border-zinc-800">
                <tr>
                  <th className="px-6 py-3.5 text-left">Razão Social / Nome</th>
                  <th className="px-6 py-3.5 text-left">CPF/CNPJ</th>
                  <th className="px-6 py-3.5 text-left">Contato</th>
                  <th className="px-6 py-3.5 text-left">Endereço</th>
                  <th className="px-6 py-3.5 text-left">Observações</th>
                  <th className="px-6 py-3.5 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-150 dark:divide-zinc-850">
                {filteredFornecedores.map((f) => (
                  <tr key={f.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-950/40 transition-colors">
                    <td className="px-6 py-4 font-bold text-zinc-900 dark:text-zinc-100">
                      {f.nome_razosocial}
                    </td>
                    <td className="px-6 py-4 text-xs font-mono text-zinc-600 dark:text-zinc-400">
                      {f.cpf_cnpj ? fmtCPF_CNPJ(f.cpf_cnpj) : <span className="text-zinc-300 dark:text-zinc-650">-</span>}
                    </td>
                    <td className="px-6 py-4 space-y-0.5 text-xs text-zinc-600 dark:text-zinc-400">
                      {f.telefone && (
                        <div className="flex items-center gap-1.5">
                          <Phone className="w-3.5 h-3.5 text-zinc-400" />
                          <span>{f.telefone}</span>
                        </div>
                      )}
                      {f.email && (
                        <div className="flex items-center gap-1.5">
                          <Mail className="w-3.5 h-3.5 text-zinc-400" />
                          <span>{f.email}</span>
                        </div>
                      )}
                      {!f.telefone && !f.email && <span className="text-zinc-300 dark:text-zinc-650">-</span>}
                    </td>
                    <td className="px-6 py-4 text-xs text-zinc-600 dark:text-zinc-400 max-w-[200px] truncate" title={f.endereco}>
                      {f.endereco ? (
                        <div className="flex items-center gap-1.5">
                          <MapPin className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                          <span>{f.endereco}</span>
                        </div>
                      ) : <span className="text-zinc-300 dark:text-zinc-650">-</span>}
                    </td>
                    <td className="px-6 py-4 text-xs text-zinc-500 dark:text-zinc-500 max-w-[220px] truncate" title={f.observacoes}>
                      {f.observacoes ? (
                        <div className="flex items-center gap-1.5">
                          <Notebook className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                          <span>{f.observacoes}</span>
                        </div>
                      ) : <span className="text-zinc-300 dark:text-zinc-650">-</span>}
                    </td>
                    <td className="px-6 py-4 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1">
                        <Button 
                          size="icon" 
                          variant="ghost" 
                          onClick={() => openFornDialog(f)}
                          className="w-8 h-8 rounded-full text-blue-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/20"
                          title="Editar Fornecedor"
                        >
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        <Button 
                          size="icon" 
                          variant="ghost" 
                          onClick={() => handleDeleteForn(f.id)}
                          className="w-8 h-8 rounded-full text-rose-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/20"
                          title="Excluir Fornecedor"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* FORNECEDOR CREATE/EDIT DIALOG */}
      <Dialog open={fornDialogOpen} onOpenChange={setFornDialogOpen}>
        <DialogContent className="sm:max-w-md bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-100 rounded-2xl shadow-xl p-6 border border-zinc-250 dark:border-zinc-800">
          <DialogHeader className="pb-3 border-b border-zinc-150 dark:border-zinc-800">
            <DialogTitle className="text-lg font-bold text-zinc-900 dark:text-zinc-50">
              {fornEditingId ? "Editar Fornecedor" : "Novo Fornecedor"}
            </DialogTitle>
            <DialogDescription className="sr-only">
              Cadastre ou altere dados cadastrais, telefone, e-mail e CNPJ do fornecedor.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-3 text-xs">
            <div>
              <Label className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">Nome / Razão Social *</Label>
              <Input
                value={fornForm.nome_razosocial}
                onChange={(e) => setFornForm({ ...fornForm, nome_razosocial: e.target.value })}
                placeholder="Ex: Comercial Distribuidora de Cosméticos Ltda"
                className="mt-1 bg-zinc-50 dark:bg-zinc-950 border-zinc-250 dark:border-zinc-800 rounded-lg text-xs"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">CPF / CNPJ</Label>
                <Input
                  value={fornForm.cpf_cnpj}
                  onChange={(e) => setFornForm({ ...fornForm, cpf_cnpj: e.target.value })}
                  placeholder="Ex: 00.000.000/0001-00"
                  className="mt-1 bg-zinc-50 dark:bg-zinc-950 border-zinc-250 dark:border-zinc-800 rounded-lg text-xs"
                />
              </div>

              <div>
                <Label className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">Telefone</Label>
                <Input
                  value={fornForm.telefone}
                  onChange={(e) => setFornForm({ ...fornForm, telefone: e.target.value })}
                  placeholder="Ex: (11) 98765-4321"
                  className="mt-1 bg-zinc-50 dark:bg-zinc-950 border-zinc-250 dark:border-zinc-800 rounded-lg text-xs"
                />
              </div>
            </div>

            <div>
              <Label className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">E-mail</Label>
              <Input
                type="email"
                value={fornForm.email}
                onChange={(e) => setFornForm({ ...fornForm, email: e.target.value })}
                placeholder="Ex: contato@fornecedor.com"
                className="mt-1 bg-zinc-50 dark:bg-zinc-950 border-zinc-250 dark:border-zinc-800 rounded-lg text-xs"
              />
            </div>

            <div>
              <Label className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">Endereço Comercial</Label>
              <textarea
                value={fornForm.endereco}
                onChange={(e) => setFornForm({ ...fornForm, endereco: e.target.value })}
                placeholder="Ex: Av. das Nações Unidas, 1234 - São Paulo/SP"
                rows="2"
                className="w-full mt-1 p-2.5 bg-zinc-50 dark:bg-zinc-950 border border-zinc-250 dark:border-zinc-800 rounded-lg text-xs outline-none focus:border-[#84A59D] transition-colors resize-none"
              />
            </div>

            <div>
              <Label className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">Observações Internas</Label>
              <textarea
                value={fornForm.observacoes}
                onChange={(e) => setFornForm({ ...fornForm, observacoes: e.target.value })}
                placeholder="Notas de faturamento, prazos de entrega acordados..."
                rows="2"
                className="w-full mt-1 p-2.5 bg-zinc-50 dark:bg-zinc-950 border border-zinc-250 dark:border-zinc-800 rounded-lg text-xs outline-none focus:border-[#84A59D] transition-colors resize-none"
              />
            </div>
          </div>

          <DialogFooter className="gap-2 pt-3 border-t border-zinc-150 dark:border-zinc-800">
            <Button variant="outline" onClick={() => setFornDialogOpen(false)} className="rounded-lg h-10 text-xs">
              Cancelar
            </Button>
            <Button onClick={saveFornecedor} className="bg-[#84A59D] hover:bg-[#6F9189] text-white rounded-lg h-10 text-xs font-bold">
              Salvar Fornecedor
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* CONFIRM DELETE FORNECEDOR */}
      <Dialog open={fornDeleteConfirmOpen} onOpenChange={setFornDeleteConfirmOpen}>
        <DialogContent className="sm:max-w-md bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-100 rounded-2xl shadow-xl p-6 border border-zinc-250 dark:border-zinc-800">
          <DialogHeader>
            <DialogTitle className="text-zinc-900 dark:text-zinc-50">Confirmar Exclusão</DialogTitle>
            <DialogDescription className="sr-only">
              Confirmar a exclusão física ou lógica do fornecedor selecionado.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
            Deseja realmente remover este fornecedor? Ele será ocultado das telas ativas do sistema, mas as notas e despesas históricas atreladas a ele permanecerão salvas e íntegras. Você poderá restaurá-lo a qualquer momento na lixeira de auditoria.
          </div>
          <DialogFooter className="gap-2 pt-2">
            <Button variant="outline" onClick={() => setFornDeleteConfirmOpen(false)} className="rounded-lg text-xs h-10">
              Cancelar
            </Button>
            <Button onClick={confirmDeleteForn} className="bg-rose-500 hover:bg-rose-600 text-white rounded-lg text-xs h-10 font-bold">
              Excluir Fornecedor
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* RESTORE SUPPLIERS AUDIT MODAL */}
      <AuditModal 
        isOpen={auditOpen} 
        onClose={() => setAuditOpen(false)} 
        modulo="fornecedor" 
        tituloModulo="Fornecedores" 
        onRestoreSuccess={loadData}
      />
    </div>
  );
}
