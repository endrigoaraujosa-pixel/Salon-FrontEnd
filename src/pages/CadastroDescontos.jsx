import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { PageHeader } from "../components/Page";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Card } from "../components/ui/card";
import { 
  Plus, Edit, Trash2, Tag, Percent, DollarSign, Check, X, AlertCircle, Search, Shield, Package, Scissors, UserCheck, History, ArrowLeft
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "../components/ui/dialog";
import AuditModal from "../components/AuditModal";
import { toast } from "sonner";
import http from "../api";

export default function CadastroDescontos() {
  const navigate = useNavigate();
  const [descontos, setDescontos] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentId, setCurrentId] = useState("");
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [auditOpen, setAuditOpen] = useState(false);
  
  // Backend master lists
  const [produtosList, setProdutosList] = useState([]);
  const [servicosList, setServicosList] = useState([]);
  const [usersList, setUsersList] = useState([]);

  // Form states
  const [codigo, setCodigo] = useState("");
  const [descricao, setDescricao] = useState("");
  const [tipo, setTipo] = useState("porcentagem");
  const [valor, setValor] = useState("");
  const [ativo, setAtivo] = useState(true);

  // Vinculation & Authorization states
  const [selectedProdutos, setSelectedProdutos] = useState([]);
  const [selectedServicos, setSelectedServicos] = useState([]);
  const [requerAutorizacao, setRequerAutorizacao] = useState(false);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [incideComissao, setIncideComissao] = useState(true);

  // Search filter states for lists inside the modal
  const [searchServico, setSearchServico] = useState("");
  const [searchProduto, setSearchProduto] = useState("");
  const [searchUser, setSearchUser] = useState("");

  // Tab state inside modal: 'itens' | 'permissao'
  const [modalTab, setModalTab] = useState("itens");

  // Load from backend APIs
  const loadData = () => {
    http.get("/descontos")
      .then((r) => setDescontos(r.data))
      .catch((err) => toast.error("Erro ao carregar descontos: " + (err.response?.data?.detail || err.message)));

    http.get("/produtos")
      .then((r) => setProdutosList(r.data))
      .catch(() => {});

    http.get("/servicos")
      .then((r) => setServicosList(r.data))
      .catch(() => {});

    http.get("/users")
      .then((r) => setUsersList(r.data.filter(u => u.ativo)))
      .catch(() => {});
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleOpenNewModal = () => {
    setIsEditing(false);
    setCurrentId("");
    setCodigo("");
    setDescricao("");
    setTipo("porcentagem");
    setValor("");
    setAtivo(true);
    setSelectedServicos([]);
    setSelectedProdutos([]);
    setRequerAutorizacao(false);
    setSelectedUsers([]);
    setIncideComissao(true);
    setSearchServico("");
    setSearchProduto("");
    setSearchUser("");
    setModalTab("itens");
    setModalOpen(true);
  };

  const handleOpenEditModal = (item) => {
    setIsEditing(true);
    setCurrentId(item.id);
    setCodigo(item.codigo);
    setDescricao(item.descricao || "");
    setTipo(item.tipo);
    setValor(item.valor);
    setAtivo(item.ativo);

    // Parse vinculated items
    let vinculados = { services: [], products: [] };
    if (item.itens_vinculados) {
      try {
        vinculados = typeof item.itens_vinculados === "string" 
          ? JSON.parse(item.itens_vinculados) 
          : item.itens_vinculados;
      } catch (e) {
        vinculados = { services: [], products: [] };
      }
    }
    setSelectedServicos(vinculados.services || []);
    setSelectedProdutos(vinculados.products || []);

    // Parse user authorizations
    setRequerAutorizacao(!!item.requer_autorizacao);
    setIncideComissao(item.incide_comissao !== false && item.incide_comissao !== 0);
    let authUsers = [];
    if (item.usuarios_autorizados) {
      try {
        authUsers = typeof item.usuarios_autorizados === "string"
          ? JSON.parse(item.usuarios_autorizados)
          : item.usuarios_autorizados;
      } catch (e) {
        authUsers = [];
      }
    }
    setSelectedUsers(authUsers || []);
    setSearchServico("");
    setSearchProduto("");
    setSearchUser("");
    setModalTab("itens");
    setModalOpen(true);
  };

  const handleDelete = (id) => {
    setDeletingId(id);
    setDeleteConfirmOpen(true);
  };

  const confirmDelete = async () => {
    if (!deletingId) return;
    try {
      await http.delete(`/descontos/${deletingId}`);
      toast.success("Desconto removido com sucesso!");
      setDeleteConfirmOpen(false);
      setDeletingId(null);
      loadData();
    } catch (err) {
      toast.error("Erro ao remover desconto: " + (err.response?.data?.detail || err.message));
    }
  };

  const handleToggleAtivo = (item) => {
    const updatedStatus = !item.ativo;
    
    // Parse nested structures to pass as JSON object rather than raw string
    let vinculados = { services: [], products: [] };
    if (item.itens_vinculados) {
      try {
        vinculados = typeof item.itens_vinculados === "string" 
          ? JSON.parse(item.itens_vinculados) 
          : item.itens_vinculados;
      } catch (e) {
        vinculados = { services: [], products: [] };
      }
    }
    let authUsers = [];
    if (item.usuarios_autorizados) {
      try {
        authUsers = typeof item.usuarios_autorizados === "string"
          ? JSON.parse(item.usuarios_autorizados)
          : item.usuarios_autorizados;
      } catch (e) {
        authUsers = [];
      }
    }

    http.put(`/descontos/${item.id}`, {
      codigo: item.codigo,
      descricao: item.descricao,
      tipo: item.tipo,
      valor: item.valor,
      ativo: updatedStatus,
      itens_vinculados: vinculados,
      requer_autorizacao: item.requer_autorizacao,
      incide_comissao: item.incide_comissao,
      usuarios_autorizados: authUsers
    })
    .then(() => {
      toast.success("Status do desconto atualizado!");
      loadData();
    })
    .catch((err) => {
      toast.error("Erro ao atualizar status: " + (err.response?.data?.detail || err.message));
    });
  };

  const handleSave = (e) => {
    e.preventDefault();

    if (!codigo.trim()) {
      toast.error("O código do desconto é obrigatório.");
      return;
    }
    if (!valor || parseFloat(valor) <= 0) {
      toast.error("Insira um valor válido maior que zero.");
      return;
    }

    const uppercaseCode = codigo.toUpperCase().replace(/\s+/g, "");

    const payload = {
      codigo: uppercaseCode,
      descricao: descricao.trim(),
      tipo,
      valor: parseFloat(valor),
      ativo,
      itens_vinculados: {
        services: selectedServicos,
        products: selectedProdutos
      },
      requer_autorizacao: requerAutorizacao,
      incide_comissao: incideComissao,
      usuarios_autorizados: selectedUsers
    };

    const req = isEditing 
      ? http.put(`/descontos/${currentId}`, payload) 
      : http.post("/descontos", payload);

    req
      .then(() => {
        toast.success(isEditing ? "Desconto atualizado com sucesso!" : "Desconto criado com sucesso!");
        loadData();
        setModalOpen(false);
      })
      .catch((err) => {
        toast.error(err.response?.data?.detail || "Erro ao salvar desconto");
      });
  };

  const toggleSelectedServico = (id) => {
    setSelectedServicos(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const toggleSelectedProduto = (id) => {
    setSelectedProdutos(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const toggleSelectedUser = (id) => {
    setSelectedUsers(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  // Helper filters
  const filteredServicos = servicosList.filter(s => 
    s.nome.toLowerCase().includes(searchServico.toLowerCase())
  );
  
  const filteredProdutos = produtosList.filter(p => 
    p.nome.toLowerCase().includes(searchProduto.toLowerCase())
  );

  const filteredUsers = usersList.filter(u => 
    u.name.toLowerCase().includes(searchUser.toLowerCase()) ||
    u.email.toLowerCase().includes(searchUser.toLowerCase())
  );

  const formatBRL = (n) => (n || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  const getVinculadosText = (item) => {
    let vinculados = null;
    if (item.itens_vinculados) {
      try {
        vinculados = typeof item.itens_vinculados === "string" 
          ? JSON.parse(item.itens_vinculados) 
          : item.itens_vinculados;
      } catch (e) {}
    }

    if (!vinculados || ((!vinculados.services || vinculados.services.length === 0) && (!vinculados.products || vinculados.products.length === 0))) {
      return <span className="text-zinc-400">Todos os itens</span>;
    }

    const sCount = vinculados.services?.length || 0;
    const pCount = vinculados.products?.length || 0;

    const parts = [];
    if (sCount > 0) parts.push(`${sCount} serv.`);
    if (pCount > 0) parts.push(`${pCount} prod.`);

    return <span className="text-zinc-650 dark:text-zinc-400 font-semibold">{parts.join(" / ")}</span>;
  };

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

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <PageHeader 
          overline="Cadastros" 
          title="Cadastro de Descontos" 
        />
        <div className="flex items-center gap-2 self-start sm:self-center w-full sm:w-auto">
          <Button 
            variant="outline" 
            onClick={() => setAuditOpen(true)}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 text-sm font-semibold text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200 border border-zinc-200 dark:border-zinc-800 bg-white hover:bg-zinc-50 dark:bg-zinc-900/60 dark:hover:bg-zinc-900 h-10 shadow-sm"
          >
            <History className="w-4 h-4" />
            <span>Excluídos</span>
          </Button>
          <Button 
            onClick={handleOpenNewModal}
            className="flex-[#84A59D] bg-[#84A59D] hover:bg-[#6F9189] text-white font-bold h-10 rounded-lg flex items-center justify-center gap-2 shadow-sm px-4"
          >
            <Plus className="w-4 h-4" /> Novo Desconto
          </Button>
        </div>
      </div>

      <div className="mt-6 space-y-6">
        <Card className="border border-zinc-200 dark:border-zinc-850 bg-white dark:bg-zinc-900 rounded-2xl overflow-hidden shadow-sm">
          {descontos.length === 0 ? (
            <div className="p-8 text-center text-zinc-400 dark:text-zinc-500 font-medium">
              Nenhum desconto cadastrado no momento.
            </div>
          ) : (
            <>
              {/* Desktop Table View */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-zinc-50 dark:bg-zinc-950 text-zinc-500 dark:text-zinc-400 border-b border-zinc-200 dark:border-zinc-800 text-xs font-bold uppercase tracking-wider">
                      <th className="p-4 pl-6">Código</th>
                      <th className="p-4">Descrição</th>
                      <th className="p-4">Tipo</th>
                      <th className="p-4 text-right">Valor</th>
                      <th className="p-4">Vinculação</th>
                      <th className="p-4 text-center">Autorização</th>
                      <th className="p-4 text-center">Comissão</th>
                      <th className="p-4 text-center">Status</th>
                      <th className="p-4 text-right pr-6">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800 text-sm">
                    {descontos.map((item) => (
                      <tr key={item.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-950/20 text-zinc-700 dark:text-zinc-300 transition-colors">
                        <td className="p-4 pl-6 font-mono font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                          <Tag className="w-3.5 h-3.5 text-[#84A59D]" />
                          {item.codigo}
                        </td>
                        <td className="p-4 text-zinc-600 dark:text-zinc-400 font-medium max-w-[200px] truncate">
                          {item.descricao || "—"}
                        </td>
                        <td className="p-4 font-semibold text-zinc-505">
                          {item.tipo === "porcentagem" ? (
                            <span className="inline-flex items-center gap-1 text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/30 px-2 py-0.5 rounded-full text-xs">
                              <Percent className="w-3 h-3" /> Porcentagem
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 px-2 py-0.5 rounded-full text-xs">
                              <DollarSign className="w-3 h-3" /> Fixo
                            </span>
                          )}
                        </td>
                        <td className="p-4 text-right font-bold text-zinc-900 dark:text-zinc-100">
                          {item.tipo === "porcentagem" ? `${item.valor}%` : formatBRL(item.valor)}
                        </td>
                        <td className="p-4">
                          {getVinculadosText(item)}
                        </td>
                        <td className="p-4 text-center">
                          {item.requer_autorizacao ? (
                            <span className="inline-flex items-center gap-1 text-amber-600 dark:text-amber-450 bg-amber-50 dark:bg-amber-950/30 px-2 py-0.5 rounded-full text-xs font-semibold">
                              <Shield className="w-3 h-3" /> Sim
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-zinc-500 dark:text-zinc-400 bg-zinc-50 dark:bg-zinc-950/50 px-2 py-0.5 rounded-full text-xs">
                              Livre
                            </span>
                          )}
                        </td>
                        <td className="p-4 text-center">
                          {item.incide_comissao !== false && item.incide_comissao !== 0 ? (
                            <span className="inline-flex items-center gap-1 text-amber-600 dark:text-amber-450 bg-amber-50 dark:bg-amber-950/30 px-2 py-0.5 rounded-full text-xs font-semibold">
                              Reduz
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 px-2 py-0.5 rounded-full text-xs font-semibold">
                              Mantém
                            </span>
                          )}
                        </td>
                        <td className="p-4 text-center">
                          <button
                            type="button"
                            onClick={() => handleToggleAtivo(item)}
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold transition-all ${
                              item.ativo 
                                ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-450 hover:bg-emerald-200" 
                                : "bg-zinc-100 text-zinc-555 dark:bg-zinc-800 dark:text-zinc-450 hover:bg-zinc-200"
                            }`}
                          >
                            {item.ativo ? "Ativo" : "Inativo"}
                          </button>
                        </td>
                        <td className="p-4 text-right pr-6 space-x-1.5">
                          <Button 
                            size="icon" 
                            variant="ghost" 
                            onClick={() => handleOpenEditModal(item)}
                            className="h-8 w-8 text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </Button>
                          <Button 
                            size="icon" 
                            variant="ghost" 
                            onClick={() => handleDelete(item.id)}
                            className="h-8 w-8 text-zinc-555 hover:text-rose-500 dark:text-zinc-450 dark:hover:text-rose-400 hover:bg-rose-500/10"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile Card List View */}
              <div className="block md:hidden p-4 space-y-4">
                {descontos.map((item) => (
                  <div 
                    key={item.id}
                    className="bg-zinc-50/50 dark:bg-zinc-900/40 border border-zinc-200 dark:border-zinc-800 p-4 rounded-xl shadow-xs flex flex-col gap-3"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 font-mono font-bold text-zinc-900 dark:text-zinc-50 text-base">
                          <Tag className="w-4 h-4 text-[#84A59D] shrink-0" />
                          {item.codigo}
                        </div>
                        {item.descricao && (
                          <p className="text-xs text-zinc-505 dark:text-zinc-400 font-medium mt-1 leading-relaxed">
                            {item.descricao}
                          </p>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-1 shrink-0">
                        <Button 
                          size="icon" 
                          variant="ghost" 
                          onClick={() => handleOpenEditModal(item)}
                          className="h-8 w-8 text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </Button>
                        <Button 
                          size="icon" 
                          variant="ghost" 
                          onClick={() => handleDelete(item.id)}
                          className="h-8 w-8 text-zinc-555 hover:text-rose-500 dark:text-zinc-450 dark:hover:text-rose-400 hover:bg-rose-500/10"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-x-4 gap-y-3 text-xs border-t border-zinc-150 dark:border-zinc-800/80 pt-3">
                      <div>
                        <span className="text-zinc-400 dark:text-zinc-500 block mb-0.5 font-semibold uppercase tracking-wider text-[10px]">Tipo / Valor</span>
                        <div>
                          {item.tipo === "porcentagem" ? (
                            <span className="inline-flex items-center gap-1 text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/30 px-2 py-0.5 rounded-full font-bold">
                              <Percent className="w-3.5 h-3.5" /> {item.valor}%
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 px-2 py-0.5 rounded-full font-bold">
                              <DollarSign className="w-3.5 h-3.5" /> {formatBRL(Number(item.valor))}
                            </span>
                          )}
                        </div>
                      </div>

                      <div>
                        <span className="text-zinc-400 dark:text-zinc-500 block mb-0.5 font-semibold uppercase tracking-wider text-[10px]">Vinculação</span>
                        <div className="truncate text-zinc-700 dark:text-zinc-300 font-medium">
                          {getVinculadosText(item)}
                        </div>
                      </div>

                      <div>
                        <span className="text-zinc-400 dark:text-zinc-500 block mb-0.5 font-semibold uppercase tracking-wider text-[10px]">Autorização</span>
                        <div>
                          {item.requer_autorizacao ? (
                            <span className="inline-flex items-center gap-1 text-amber-600 dark:text-amber-450 bg-amber-50 dark:bg-amber-950/30 px-2 py-0.5 rounded-full font-semibold">
                              Sim
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-zinc-500 dark:text-zinc-400 bg-zinc-50 dark:bg-zinc-950/50 px-2 py-0.5 rounded-full font-medium">
                              Livre
                            </span>
                          )}
                        </div>
                      </div>

                      <div>
                        <span className="text-zinc-400 dark:text-zinc-500 block mb-0.5 font-semibold uppercase tracking-wider text-[10px]">Comissão</span>
                        <div>
                          {item.incide_comissao === false || item.incide_comissao === 0 ? (
                            <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 px-2 py-0.5 rounded-full font-semibold">
                              Mantém
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-amber-600 dark:text-amber-450 bg-amber-50 dark:bg-amber-950/30 px-2 py-0.5 rounded-full font-semibold">
                              Reduz
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="col-span-2 flex items-center justify-between border-t border-zinc-150 dark:border-zinc-800/80 pt-2.5 mt-1">
                        <span className="text-zinc-450 dark:text-zinc-450 font-bold uppercase tracking-wider text-[10px]">Status</span>
                        <button
                          type="button"
                          onClick={() => handleToggleAtivo(item)}
                          className={`inline-flex items-center px-3 py-0.5 rounded-full text-xs font-semibold transition-all ${
                            item.ativo 
                              ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-450 hover:bg-emerald-200" 
                              : "bg-zinc-100 text-zinc-550 dark:bg-zinc-800 dark:text-zinc-450 hover:bg-zinc-200"
                          }`}
                        >
                          {item.ativo ? "Ativo" : "Inativo"}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </Card>
      </div>

      {/* Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200 overflow-y-auto">
          <Card className="w-full max-w-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-850 rounded-2xl shadow-xl flex flex-col max-h-[90vh] my-8">
            <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 p-5 shrink-0">
              <h3 className="font-display font-bold text-lg text-zinc-900 dark:text-zinc-50">
                {isEditing ? "Editar Regra de Desconto" : "Nova Regra de Desconto"}
              </h3>
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => setModalOpen(false)}
                className="h-8 w-8 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>

            <form onSubmit={handleSave} className="flex flex-col flex-1 overflow-hidden">
              <div className="p-6 overflow-y-auto flex-1 space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                  {/* Left Column: Core Fields */}
                  <div className="space-y-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="code" className="text-xs font-bold text-zinc-550 dark:text-zinc-400 uppercase tracking-wider">
                        Código do Desconto
                      </Label>
                      <Input
                        id="code"
                        placeholder="EX: CUPOM10"
                        value={codigo}
                        onChange={(e) => setCodigo(e.target.value)}
                        className="h-10 bg-zinc-50 dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 rounded-lg text-sm uppercase"
                        disabled={isEditing}
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="desc" className="text-xs font-bold text-zinc-550 dark:text-zinc-400 uppercase tracking-wider">
                        Descrição / Detalhe
                      </Label>
                      <Input
                        id="desc"
                        placeholder="Desconto promocional..."
                        value={descricao}
                        onChange={(e) => setDescricao(e.target.value)}
                        className="h-10 bg-zinc-50 dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 rounded-lg text-sm"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label className="text-xs font-bold text-zinc-550 dark:text-zinc-400 uppercase tracking-wider">
                          Tipo
                        </Label>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => setTipo("porcentagem")}
                            className={`flex-1 h-10 px-2 rounded-lg text-xs font-bold transition-all border flex items-center justify-center gap-1 ${
                              tipo === "porcentagem"
                                ? "bg-indigo-50 border-indigo-200 text-indigo-600 dark:bg-indigo-950/20 dark:border-indigo-900/60 dark:text-indigo-400"
                                : "bg-zinc-50 border-zinc-200 text-zinc-500 dark:bg-zinc-950 dark:border-zinc-800 dark:text-zinc-400"
                            }`}
                          >
                            <Percent className="w-3 h-3" /> Percentual
                          </button>
                          <button
                            type="button"
                            onClick={() => setTipo("valor_fixo")}
                            className={`flex-1 h-10 px-2 rounded-lg text-xs font-bold transition-all border flex items-center justify-center gap-1 ${
                              tipo === "valor_fixo"
                                ? "bg-emerald-50 border-emerald-200 text-emerald-600 dark:bg-emerald-950/20 dark:border-emerald-900/60 dark:text-emerald-400"
                                : "bg-zinc-50 border-zinc-200 text-zinc-500 dark:bg-zinc-950 dark:border-zinc-800 dark:text-zinc-400"
                            }`}
                          >
                            <DollarSign className="w-3 h-3" /> Fixo (R$)
                          </button>
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <Label htmlFor="val" className="text-xs font-bold text-zinc-550 dark:text-zinc-400 uppercase tracking-wider">
                          Valor Desconto
                        </Label>
                        <Input
                          id="val"
                          type="number"
                          step="0.01"
                          placeholder="0.00"
                          value={valor}
                          onChange={(e) => setValor(e.target.value)}
                          className="h-10 bg-zinc-50 dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 rounded-lg text-sm text-right font-bold"
                        />
                      </div>
                    </div>

                    <div className="flex items-center gap-2 pt-2">
                      <input
                        type="checkbox"
                        id="ativo"
                        checked={ativo}
                        onChange={(e) => setAtivo(e.target.checked)}
                        className="rounded border-zinc-300 dark:border-zinc-800 text-[#84A59D] focus:ring-[#84A59D] h-4 w-4 cursor-pointer"
                      />
                      <Label htmlFor="ativo" className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 cursor-pointer">
                        Desconto Ativo para uso
                      </Label>
                    </div>

                    <div className="flex items-center gap-2 pt-1">
                      <input
                        type="checkbox"
                        id="incide_comissao"
                        checked={incideComissao}
                        onChange={(e) => setIncideComissao(e.target.checked)}
                        className="rounded border-zinc-300 dark:border-zinc-800 text-[#84A59D] focus:ring-[#84A59D] h-4 w-4 cursor-pointer"
                      />
                      <Label htmlFor="incide_comissao" className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 cursor-pointer">
                        Desconto incide sobre comissão
                      </Label>
                    </div>
                    <div className="text-[10px] text-zinc-450 dark:text-zinc-500 italic pl-6 -mt-1">
                      Se ativado, o desconto reduz a base de cálculo da comissão do colaborador. Se desativado, a comissão será calculada sobre o valor original.
                    </div>
                  </div>

                  {/* Right Column: Linking & Permissions (Tabs) */}
                  <div className="border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden flex flex-col md:max-h-[450px]">
                    <div className="flex border-b border-zinc-200 dark:border-zinc-800 bg-zinc-55/30 dark:bg-zinc-950/40 select-none shrink-0">
                      <button
                        type="button"
                        onClick={() => setModalTab("itens")}
                        className={`flex-1 py-2 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 transition-colors border-r border-zinc-200 dark:border-zinc-800 ${
                          modalTab === "itens"
                            ? "bg-white dark:bg-zinc-900 text-[#84A59D] font-extrabold"
                            : "text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
                        }`}
                      >
                        <Package className="w-3.5 h-3.5" /> Vincular Itens
                      </button>
                      <button
                        type="button"
                        onClick={() => setModalTab("permissao")}
                        className={`flex-1 py-2 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 transition-colors ${
                          modalTab === "permissao"
                            ? "bg-white dark:bg-zinc-900 text-[#84A59D] font-extrabold"
                            : "text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
                        }`}
                      >
                        <Shield className="w-3.5 h-3.5" /> Autorização
                      </button>
                    </div>

                    <div className="flex-1 overflow-y-auto p-4 bg-zinc-50/30 dark:bg-zinc-900/10">
                      {modalTab === "itens" ? (
                        <div className="space-y-4">
                          {/* Services sub-list */}
                          <div className="space-y-1.5">
                            <div className="flex items-center justify-between">
                              <Label className="text-xs font-bold text-zinc-550 dark:text-zinc-400 uppercase tracking-wider flex items-center gap-1">
                                <Scissors className="w-3 h-3" /> Serviços ({selectedServicos.length} sel.)
                              </Label>
                              <div className="flex gap-2">
                                <button
                                  type="button"
                                  onClick={() => setSelectedServicos(servicosList.map(s => s.id))}
                                  className="text-[10px] text-zinc-450 hover:underline font-medium"
                                >
                                  Selecionar Todos
                                </button>
                                <span className="text-zinc-300">|</span>
                                <button
                                  type="button"
                                  onClick={() => setSelectedServicos([])}
                                  className="text-[10px] text-zinc-450 hover:underline font-medium"
                                >
                                  Limpar
                                </button>
                              </div>
                            </div>
                            <div className="relative">
                              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-zinc-400" />
                              <Input
                                placeholder="Buscar serviço..."
                                value={searchServico}
                                onChange={(e) => setSearchServico(e.target.value)}
                                className="pl-8 h-8 text-xs bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 rounded-lg"
                              />
                            </div>
                            <div className="h-28 overflow-y-auto border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-2 rounded-lg space-y-1">
                              {filteredServicos.length === 0 ? (
                                <div className="text-[11px] text-zinc-400 text-center py-4">Nenhum serviço encontrado.</div>
                              ) : (
                                filteredServicos.map(s => (
                                  <label key={s.id} className="flex items-center gap-2 px-1.5 py-1 hover:bg-zinc-50 dark:hover:bg-zinc-900 rounded cursor-pointer text-xs">
                                    <input
                                      type="checkbox"
                                      checked={selectedServicos.includes(s.id)}
                                      onChange={() => toggleSelectedServico(s.id)}
                                      className="rounded border-zinc-300 dark:border-zinc-800 text-[#84A59D] focus:ring-[#84A59D] h-3.5 w-3.5"
                                    />
                                    <span className="truncate font-medium text-zinc-700 dark:text-zinc-300">{s.nome}</span>
                                  </label>
                                ))
                              )}
                            </div>
                          </div>

                          {/* Products sub-list */}
                          <div className="space-y-1.5 pt-2 border-t border-zinc-150 dark:border-zinc-800">
                            <div className="flex items-center justify-between">
                              <Label className="text-xs font-bold text-zinc-550 dark:text-zinc-400 uppercase tracking-wider flex items-center gap-1">
                                <Package className="w-3 h-3" /> Produtos ({selectedProdutos.length} sel.)
                              </Label>
                              <div className="flex gap-2">
                                <button
                                  type="button"
                                  onClick={() => setSelectedProdutos(produtosList.map(p => p.id))}
                                  className="text-[10px] text-zinc-450 hover:underline font-medium"
                                >
                                  Selecionar Todos
                                </button>
                                <span className="text-zinc-300">|</span>
                                <button
                                  type="button"
                                  onClick={() => setSelectedProdutos([])}
                                  className="text-[10px] text-zinc-450 hover:underline font-medium"
                                >
                                  Limpar
                                </button>
                              </div>
                            </div>
                            <div className="relative">
                              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-zinc-400" />
                              <Input
                                placeholder="Buscar produto..."
                                value={searchProduto}
                                onChange={(e) => setSearchProduto(e.target.value)}
                                className="pl-8 h-8 text-xs bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 rounded-lg"
                              />
                            </div>
                            <div className="h-28 overflow-y-auto border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-2 rounded-lg space-y-1">
                              {filteredProdutos.length === 0 ? (
                                <div className="text-[11px] text-zinc-400 text-center py-4">Nenhum produto encontrado.</div>
                              ) : (
                                filteredProdutos.map(p => (
                                  <label key={p.id} className="flex items-center gap-2 px-1.5 py-1 hover:bg-zinc-50 dark:hover:bg-zinc-900 rounded cursor-pointer text-xs">
                                    <input
                                      type="checkbox"
                                      checked={selectedProdutos.includes(p.id)}
                                      onChange={() => toggleSelectedProduto(p.id)}
                                      className="rounded border-zinc-300 dark:border-zinc-800 text-[#84A59D] focus:ring-[#84A59D] h-3.5 w-3.5"
                                    />
                                    <span className="truncate font-medium text-zinc-700 dark:text-zinc-300">{p.nome}</span>
                                  </label>
                                ))
                              )}
                            </div>
                          </div>

                          <div className="text-[10px] text-zinc-450 dark:text-zinc-500 italic bg-amber-50/50 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/50 p-2 rounded-lg">
                            Dica: Se nenhum serviço e nenhum produto for selecionado, este desconto poderá ser livremente aplicado em qualquer item da venda/atendimento.
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          <div className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              id="req_auth"
                              checked={requerAutorizacao}
                              onChange={(e) => {
                                setRequerAutorizacao(e.target.checked);
                                if (!e.target.checked) setSelectedUsers([]);
                              }}
                              className="rounded border-zinc-300 dark:border-zinc-800 text-[#84A59D] focus:ring-[#84A59D] h-4 w-4 cursor-pointer"
                            />
                            <Label htmlFor="req_auth" className="text-xs font-bold text-zinc-700 dark:text-zinc-350 cursor-pointer uppercase tracking-wide">
                              Exigir liberação por usuário autorizado
                            </Label>
                          </div>

                          {requerAutorizacao && (
                            <div className="space-y-2 pt-2 border-t border-zinc-150 dark:border-zinc-800 fade-in">
                              <div className="flex items-center justify-between">
                                <Label className="text-xs font-bold text-zinc-550 dark:text-zinc-400 uppercase tracking-wider flex items-center gap-1">
                                  <UserCheck className="w-3.5 h-3.5 text-[#84A59D]" /> Usuários Autorizados ({selectedUsers.length} sel.)
                                </Label>
                              </div>
                              <div className="relative">
                                <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-zinc-400" />
                                <Input
                                  placeholder="Buscar usuário..."
                                  value={searchUser}
                                  onChange={(e) => setSearchUser(e.target.value)}
                                  className="pl-8 h-8 text-xs bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 rounded-lg"
                                />
                              </div>
                              <div className="h-44 overflow-y-auto border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-2 rounded-lg space-y-1">
                                {filteredUsers.length === 0 ? (
                                  <div className="text-[11px] text-zinc-400 text-center py-4">Nenhum usuário ativo encontrado.</div>
                                ) : (
                                  filteredUsers.map(u => (
                                    <label key={u.id} className="flex items-start gap-2 px-1.5 py-1 hover:bg-zinc-50 dark:hover:bg-zinc-900 rounded cursor-pointer text-xs">
                                      <input
                                        type="checkbox"
                                        checked={selectedUsers.includes(u.id)}
                                        onChange={() => toggleSelectedUser(u.id)}
                                        className="rounded border-zinc-300 dark:border-zinc-800 text-[#84A59D] focus:ring-[#84A59D] h-3.5 w-3.5 mt-0.5"
                                      />
                                      <div className="flex flex-col min-w-0">
                                        <span className="truncate font-bold text-zinc-700 dark:text-zinc-300">{u.name || u.email}</span>
                                        <span className="text-[10px] text-zinc-450 truncate uppercase font-semibold">{u.role}</span>
                                      </div>
                                    </label>
                                  ))
                                )}
                              </div>
                              <div className="text-[10px] text-zinc-450 dark:text-zinc-500 italic">
                                Nota: Usuários com o perfil <b>Administrador</b> estão sempre autorizados a aprovar qualquer desconto, mesmo que não estejam selecionados na lista acima.
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2 p-5 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-950/20 shrink-0">
                <Button 
                  type="button"
                  variant="outline" 
                  onClick={() => setModalOpen(false)}
                  className="h-10 text-xs rounded-lg"
                >
                  Cancelar
                </Button>
                <Button 
                  type="submit"
                  className="bg-[#84A59D] hover:bg-[#6F9189] text-white font-bold h-10 text-xs rounded-lg px-5 shadow-sm"
                >
                  Salvar Desconto
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {/* Dialog de confirmação de exclusão */}
      <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <DialogContent className="w-[95vw] max-w-[95vw] sm:max-w-md p-5 sm:p-6 rounded-2xl dark:bg-zinc-900 dark:border-zinc-800">
          <DialogHeader>
            <DialogTitle className="text-zinc-900 dark:text-zinc-50">Confirmar exclusão</DialogTitle>
          </DialogHeader>
          <div className="py-4 text-sm text-zinc-650 dark:text-zinc-400">
            Tem certeza que deseja excluir este desconto? Esta ação pode ser desfeita a qualquer momento a partir da tela de "Excluídos".
          </div>
          <DialogFooter className="flex flex-col sm:flex-row gap-2.5 mt-2 pt-2 border-t border-zinc-150 dark:border-zinc-850">
            <Button variant="outline" onClick={() => setDeleteConfirmOpen(false)} className="w-full sm:w-auto border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-350">Cancelar</Button>
            <Button onClick={confirmDelete} className="w-full sm:w-auto bg-rose-500 hover:bg-rose-600 text-white font-bold">Excluir</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AuditModal 
        isOpen={auditOpen} 
        onClose={() => setAuditOpen(false)} 
        modulo="desconto" 
        tituloModulo="Descontos" 
        onRestoreSuccess={loadData}
      />
    </div>
  );
}
