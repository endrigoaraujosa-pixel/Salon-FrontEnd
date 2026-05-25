import React, { useEffect, useState } from "react";
import http from "../api";
import { PageHeader, EmptyState } from "../components/Page";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Textarea } from "../components/ui/textarea";
import { Switch } from "../components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "../components/ui/dialog";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "../components/ui/select";
import { Scissors, Plus, Edit2, Trash2, Clock, Package, X, History, Folder, ChevronDown, ChevronRight, Printer, FileDown } from "lucide-react";
import { Checkbox } from "../components/ui/checkbox";
import { toast } from "sonner";
import AuditModal from "../components/AuditModal";

const blank = { nome: "", categoria_id: "", duracao_minutos: 60, valor: 0, descricao: "", ativo: true, produtos_vinculados: [] };
const fmtBRL = (n) => (n || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export default function Servicos() {
  const [list, setList] = useState([]);
  const [produtos, setProdutos] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [open, setOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [form, setForm] = useState(blank);
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [auditOpen, setAuditOpen] = useState(false);

  const [collapsedCategories, setCollapsedCategories] = useState({});
  const [reportOpen, setReportOpen] = useState(false);
  const [selectedReportCategories, setSelectedReportCategories] = useState([]);
  const [includeInsumos, setIncludeInsumos] = useState(false);
  const [reportCategorySearch, setReportCategorySearch] = useState("");

  const load = () => {
    http.get("/servicos").then((r) => setList(r.data));
    http.get("/produtos").then((r) => setProdutos(r.data));
    http.get("/categorias").then((r) => setCategorias(r.data));
  };

  useEffect(() => { load(); }, []);

  const save = async () => {
    if (!form.nome || !form.nome.trim()) return toast.error("Nome é obrigatório");
    if (!form.categoria_id) return toast.error("A categoria é obrigatória. Selecione uma categoria cadastrada.");
    try {
      let pvs = form.produtos_vinculados;
      if (typeof pvs === "string") {
        try { pvs = JSON.parse(pvs); } catch { pvs = []; }
      }
      if (!Array.isArray(pvs)) pvs = [];

      const p = { 
        ...form, 
        valor: Number(form.valor), 
        duracao_minutos: Number(form.duracao_minutos),
        produtos_vinculados: pvs.map(pv => ({
          produto_id: pv.produto_id,
          quantidade: Number(pv.quantidade)
        }))
      };
      if (form.id) await http.put(`/servicos/${form.id}`, p); 
      else await http.post("/servicos", p);
      toast.success("Salvo"); setOpen(false); setForm(blank); load();
    } catch (e) { 
      toast.error(e.response?.data?.detail || "Erro ao salvar"); 
    }
  };

  const del = (id) => {
    setDeletingId(id);
    setDeleteConfirmOpen(true);
  };

  const confirmDelete = async () => {
    if (!deletingId) return;
    try {
      await http.delete(`/servicos/${deletingId}`);
      toast.success("Serviço removido");
      setDeleteConfirmOpen(false);
      setDeletingId(null);
      load();
    } catch (e) {
      toast.error(e.response?.data?.detail || "Erro ao remover");
    }
  };

  const edit = (s) => { 
    let pvs = s.produtos_vinculados;
    if (typeof pvs === "string") {
      try {
        pvs = JSON.parse(pvs);
      } catch (e) {
        pvs = [];
      }
    }
    setForm({
      ...s,
      produtos_vinculados: pvs || []
    }); 
    setOpen(true); 
  };

  const addProduto = (pid) => {
    let pvs = form.produtos_vinculados;
    if (typeof pvs === "string") {
      try { pvs = JSON.parse(pvs); } catch { pvs = []; }
    }
    if (!Array.isArray(pvs)) pvs = [];

    if (pvs.some(p => p.produto_id === pid)) return toast.error("Produto já adicionado");
    setForm({
      ...form,
      produtos_vinculados: [...pvs, { produto_id: pid, quantidade: 1 }]
    });
  };

  const removeProduto = (pid) => {
    let pvs = form.produtos_vinculados;
    if (typeof pvs === "string") {
      try { pvs = JSON.parse(pvs); } catch { pvs = []; }
    }
    if (!Array.isArray(pvs)) pvs = [];

    setForm({
      ...form,
      produtos_vinculados: pvs.filter(p => p.produto_id !== pid)
    });
  };

  const updateProdQtde = (pid, qtde) => {
    let pvs = form.produtos_vinculados;
    if (typeof pvs === "string") {
      try { pvs = JSON.parse(pvs); } catch { pvs = []; }
    }
    if (!Array.isArray(pvs)) pvs = [];

    setForm({
      ...form,
      produtos_vinculados: pvs.map(p => p.produto_id === pid ? { ...p, quantidade: qtde } : p)
    });
  };

  const filteredList = list.filter((s) => {
    const matchesSearch = s.nome.toLowerCase().includes(searchQuery.toLowerCase()) || 
      (s.descricao && s.descricao.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesCategory =
      selectedCategoryFilter === "all" ||
      (selectedCategoryFilter === "none" && !s.categoria_id) ||
      s.categoria_id === selectedCategoryFilter;
    return matchesSearch && matchesCategory;
  });

  const toggleCategory = (catId) => {
    setCollapsedCategories(prev => ({
      ...prev,
      [catId]: !prev[catId]
    }));
  };

  const expandAll = () => {
    setCollapsedCategories({});
  };

  const collapseAll = () => {
    const collapsed = {};
    categorias.forEach(c => {
      collapsed[c.id] = true;
    });
    collapsed["none"] = true;
    setCollapsedCategories(collapsed);
  };

  const openReportModal = () => {
    const allIds = [
      "none",
      ...categorias.filter(c => c.tipo === "servico" || c.tipo === "ambos").map(c => c.id)
    ];
    setSelectedReportCategories(allIds);
    setIncludeInsumos(false);
    setReportCategorySearch("");
    setReportOpen(true);
  };

  const handleCategoryToggle = (id) => {
    if (selectedReportCategories.includes(id)) {
      setSelectedReportCategories(selectedReportCategories.filter(x => x !== id));
    } else {
      setSelectedReportCategories([...selectedReportCategories, id]);
    }
  };

  const handleSelectAllCategories = () => {
    const visibleIds = [];
    if ("Sem Categoria".toLowerCase().includes(reportCategorySearch.toLowerCase())) {
      visibleIds.push("none");
    }
    categorias
      .filter(c => c.tipo === "servico" || c.tipo === "ambos")
      .filter(c => c.nome.toLowerCase().includes(reportCategorySearch.toLowerCase()))
      .forEach(c => visibleIds.push(c.id));

    const newSelected = [...selectedReportCategories];
    visibleIds.forEach(id => {
      if (!newSelected.includes(id)) newSelected.push(id);
    });
    setSelectedReportCategories(newSelected);
  };

  const handleDeselectAllCategories = () => {
    const visibleIds = [];
    if ("Sem Categoria".toLowerCase().includes(reportCategorySearch.toLowerCase())) {
      visibleIds.push("none");
    }
    categorias
      .filter(c => c.tipo === "servico" || c.tipo === "ambos")
      .filter(c => c.nome.toLowerCase().includes(reportCategorySearch.toLowerCase()))
      .forEach(c => visibleIds.push(c.id));

    setSelectedReportCategories(selectedReportCategories.filter(id => !visibleIds.includes(id)));
  };

  const generatePDF = () => {
    const reportServices = list.filter(s => {
      const matchesSearch = !searchQuery || s.nome.toLowerCase().includes(searchQuery.toLowerCase()) || 
        (s.descricao && s.descricao.toLowerCase().includes(searchQuery.toLowerCase()));
      
      if (!matchesSearch) return false;
      
      const isUncategorized = !s.categoria_id || !categorias.some(c => c.id === s.categoria_id);
      if (isUncategorized) {
        return selectedReportCategories.includes("none");
      }
      return selectedReportCategories.includes(s.categoria_id);
    });

    const groups = [];
    categorias.forEach(c => {
      if (selectedReportCategories.includes(c.id)) {
        const services = reportServices.filter(s => s.categoria_id === c.id);
        if (services.length > 0) {
          groups.push({
            id: c.id,
            nome: c.nome,
            services: services
          });
        }
      }
    });

    if (selectedReportCategories.includes("none")) {
      const services = reportServices.filter(s => !s.categoria_id || !categorias.some(c => c.id === s.categoria_id));
      if (services.length > 0) {
        groups.push({
          id: "none",
          nome: "Sem Categoria",
          services: services
        });
      }
    }

    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      toast.error("Por favor, permita pop-ups para gerar o relatório.");
      return;
    }

    const currentDate = new Date().toLocaleDateString("pt-BR");
    const currentTime = new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });

    let htmlContent = `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>Relatório de Serviços por Categoria</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;600;700&family=Manrope:wght@400;500;600&display=swap" rel="stylesheet">
  <style>
    body {
      font-family: 'Manrope', sans-serif;
      color: #1a1a1a;
      margin: 0;
      padding: 30px;
      background-color: #ffffff;
      font-size: 13px;
      line-height: 1.5;
    }
    h1, h2, h3, .font-display {
      font-family: 'Outfit', sans-serif;
      margin: 0;
    }
    .header {
      border-bottom: 2px solid #84A59D;
      padding-bottom: 15px;
      margin-bottom: 25px;
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
    }
    .header-left h1 {
      font-size: 24px;
      font-weight: 700;
      color: #3A4F4A;
      letter-spacing: -0.02em;
    }
    .header-left p {
      margin: 4px 0 0 0;
      color: #71717a;
      font-size: 11px;
    }
    .header-right {
      text-align: right;
      color: #71717a;
      font-size: 11px;
    }
    .header-right .brand {
      font-size: 15px;
      font-weight: 700;
      color: #84A59D;
      font-family: 'Outfit', sans-serif;
      margin-bottom: 3px;
    }
    .category-section {
      margin-bottom: 25px;
      page-break-inside: avoid;
    }
    .category-header {
      background-color: #f4f7f6;
      border-left: 4px solid #84A59D;
      padding: 8px 12px;
      margin-bottom: 12px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-radius: 0 6px 6px 0;
    }
    .category-name {
      font-size: 16px;
      font-weight: 600;
      color: #3A4F4A;
    }
    .category-count {
      font-size: 11px;
      background-color: #e5edea;
      color: #3A4F4A;
      padding: 1px 6px;
      border-radius: 10px;
      font-weight: 600;
    }
    .services-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 5px;
    }
    .services-table th {
      text-align: left;
      font-size: 10px;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: #71717a;
      border-bottom: 1.5px solid #e4e4e7;
      padding: 6px 10px;
      font-weight: 600;
    }
    .services-table td {
      padding: 10px;
      border-bottom: 1px solid #f4f4f5;
      vertical-align: top;
    }
    .service-name {
      font-weight: 600;
      font-size: 14px;
      color: #18181b;
      margin-bottom: 2px;
    }
    .service-desc {
      font-size: 11px;
      color: #52525b;
      margin: 0;
    }
    .service-duration {
      font-size: 12px;
      color: #71717a;
      white-space: nowrap;
    }
    .service-price {
      font-weight: 600;
      font-size: 14px;
      color: #3A4F4A;
      text-align: right;
      white-space: nowrap;
    }
    .insumos-container {
      margin-top: 6px;
      background-color: #f8fafc;
      border: 1px dashed #cbd5e1;
      border-radius: 4px;
      padding: 6px 10px;
    }
    .insumos-title {
      font-size: 10px;
      text-transform: uppercase;
      font-weight: 700;
      color: #475569;
      letter-spacing: 0.05em;
      margin-bottom: 3px;
    }
    .insumos-list {
      margin: 0;
      padding-left: 15px;
      font-size: 11px;
      color: #334155;
    }
    .insumos-list li {
      margin-bottom: 1px;
    }
    @media print {
      body {
        padding: 0;
      }
      .category-section {
        page-break-inside: avoid;
      }
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="header-left">
      <h1>Catálogo de Serviços por Categoria</h1>
      <p>Filtros aplicados: ${groups.length} categorias selecionadas ${searchQuery ? `• Busca: "${searchQuery}"` : ""}</p>
    </div>
    <div class="header-right">
      <div class="brand">Salon Studio</div>
      <div>Gerado em ${currentDate} às ${currentTime}</div>
    </div>
  </div>
  `;

    if (groups.length === 0) {
      htmlContent += `
      <div style="text-align: center; padding: 50px; color: #71717a;">
        <h3>Nenhum serviço encontrado com os filtros selecionados</h3>
      </div>
      `;
    } else {
      groups.forEach(g => {
        htmlContent += `
        <div class="category-section">
          <div class="category-header">
            <span class="category-name">${g.nome}</span>
            <span class="category-count">${g.services.length} ${g.services.length === 1 ? "serviço" : "serviços"}</span>
          </div>
          <table class="services-table">
            <thead>
              <tr>
                <th>Serviço</th>
                <th style="width: 100px;">Duração</th>
                <th style="width: 120px; text-align: right;">Valor</th>
              </tr>
            </thead>
            <tbody>
        `;

        g.services.forEach(s => {
          let insumosHtml = "";
          if (includeInsumos) {
            let pvs = s.produtos_vinculados;
            if (typeof pvs === "string") {
              try { pvs = JSON.parse(pvs); } catch { pvs = []; }
            }
            if (Array.isArray(pvs) && pvs.length > 0) {
              insumosHtml = `
              <div class="insumos-container">
                <div class="insumos-title">Insumos vinculados:</div>
                <ul class="insumos-list">
              `;
              pvs.forEach(pv => {
                const prod = produtos.find(p => p.id === pv.produto_id);
                insumosHtml += `<li>${prod?.nome || "Insumo não identificado"}</li>`;
              });
              insumosHtml += `
                </ul>
              </div>
              `;
            }
          }

          htmlContent += `
              <tr>
                <td>
                  <div class="service-name">${s.nome}</div>
                  ${s.descricao ? `<p class="service-desc">${s.descricao}</p>` : ""}
                  ${insumosHtml}
                </td>
                <td><span class="service-duration">${s.duracao_minutos} min</span></td>
                <td><div class="service-price">${fmtBRL(s.valor)}</div></td>
              </tr>
          `;
        });

        htmlContent += `
            </tbody>
          </table>
        </div>
        `;
      });
    }

    htmlContent += `
</body>
</html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
    printWindow.onload = () => {
      printWindow.focus();
      printWindow.print();
    };
    
    setReportOpen(false);
  };

  const groupedServices = [];
  categorias.forEach(c => {
    const services = filteredList.filter(s => s.categoria_id === c.id);
    if (services.length > 0) {
      groupedServices.push({
        id: c.id,
        nome: c.nome,
        services: services
      });
    }
  });

  const uncategorized = filteredList.filter(s => !s.categoria_id || !categorias.some(c => c.id === s.categoria_id));
  if (uncategorized.length > 0) {
    groupedServices.push({
      id: "none",
      nome: "Sem Categoria",
      services: uncategorized
    });
  }

  return (
    <div className="p-6 lg:p-8 fade-in">
      <PageHeader 
        overline="Catálogo" 
        title={
          <div className="flex items-center gap-3">
            <span>Serviços</span>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700 mt-1.5 shrink-0">
              {list.length} {list.length === 1 ? 'cadastrado' : 'cadastrados'}
            </span>
          </div>
        } 
        action={
          <Button onClick={() => { setForm(blank); setOpen(true); }} className="bg-[#84A59D] hover:bg-[#6F9189]"><Plus className="w-4 h-4 mr-1" /> Novo serviço</Button>
        } 
      />

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>{form.id ? "Editar" : "Novo"} serviço</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2 max-h-[70vh] overflow-y-auto pr-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2"><Label>Nome *</Label><Input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} /></div>
              <div className="col-span-2">
                <Label>Categoria *</Label>
                <Select
                  value={form.categoria_id || ""}
                  onValueChange={(val) => setForm({ ...form, categoria_id: val })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a categoria *" />
                  </SelectTrigger>
                  <SelectContent>
                    {categorias.filter(c => c.tipo === "servico" || c.tipo === "ambos").map(c => (
                      <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Duração (min)</Label><Input type="number" value={form.duracao_minutos} onChange={(e) => setForm({ ...form, duracao_minutos: e.target.value })} /></div>
              <div><Label>Valor (R$)</Label><Input type="number" step="0.01" value={form.valor} onChange={(e) => setForm({ ...form, valor: e.target.value })} /></div>
            </div>
            <div><Label>Descrição</Label><Textarea rows={2} value={form.descricao} onChange={(e) => setForm({ ...form, descricao: e.target.value })} /></div>
            
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label>Produtos Vinculados</Label>
                <div className="w-64">
                  <Select onValueChange={(val) => addProduto(val)}>
                    <SelectTrigger className="h-8"><SelectValue placeholder="Adicionar produto..." /></SelectTrigger>
                    <SelectContent>
                      {produtos.map(p => <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="border border-zinc-200 dark:border-zinc-800 rounded-lg p-3 space-y-2 bg-zinc-50 dark:bg-zinc-900/50 max-h-48 overflow-y-auto">
                {(() => {
                  let pvs = form.produtos_vinculados;
                  if (typeof pvs === "string") {
                    try { pvs = JSON.parse(pvs); } catch { pvs = []; }
                  }
                  if (!Array.isArray(pvs)) pvs = [];

                  return pvs.map((pv) => {
                    const prod = produtos.find(x => x.id === pv.produto_id);
                    return (
                      <div key={pv.produto_id} className="flex items-center justify-between bg-white dark:bg-zinc-900 p-2 rounded border border-zinc-200 dark:border-zinc-800 shadow-sm gap-2">
                        <span className="text-sm font-medium flex-1 truncate">{prod?.nome || "Carregando..."}</span>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-rose-500 shrink-0 hover:bg-rose-500/10 hover:text-rose-600" onClick={() => removeProduto(pv.produto_id)}><X className="w-4 h-4" /></Button>
                      </div>
                    );
                  });
                })()}
                {(() => {
                  let pvs = form.produtos_vinculados;
                  if (typeof pvs === "string") {
                    try { pvs = JSON.parse(pvs); } catch { pvs = []; }
                  }
                  return !pvs || pvs.length === 0;
                })() && (
                  <div className="text-center py-4 text-zinc-400 text-sm">Nenhum produto vinculado</div>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2"><Switch checked={form.ativo} onCheckedChange={(v) => setForm({ ...form, ativo: v })} /><Label>Ativo</Label></div>
          </div>
          <DialogFooter><Button onClick={save} className="bg-[#84A59D] hover:bg-[#6F9189] w-full">Salvar Serviço</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="mb-6 flex flex-col md:flex-row md:items-end gap-4 max-w-4xl">
        <div className="flex-1">
          <Label className="text-xs text-zinc-500 mb-1 block">Pesquisar serviço</Label>
          <Input
            placeholder="Pesquisar por nome ou descrição..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white"
          />
        </div>
        <div className="w-full md:w-64">
          <Label className="text-xs text-zinc-500 mb-1 block">Filtrar por Categoria</Label>
          <Select
            value={selectedCategoryFilter}
            onValueChange={setSelectedCategoryFilter}
          >
            <SelectTrigger className="bg-white">
              <SelectValue placeholder="Todas as categorias" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as categorias</SelectItem>
              <SelectItem value="none">Sem categoria</SelectItem>
              {categorias.filter(c => c.tipo === "servico" || c.tipo === "ambos").map(c => (
                <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button 
          variant="outline" 
          onClick={() => setAuditOpen(true)}
          className="flex items-center gap-1.5 text-xs font-semibold text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200 border border-zinc-200 dark:border-zinc-800 h-10 w-full md:w-auto"
        >
          <History className="w-3.5 h-3.5" />
          <span>Excluídos</span>
        </Button>
      </div>

      {/* Painel de Ações e Emitir Relatório */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4 bg-zinc-50 dark:bg-zinc-900/20 border border-zinc-200 dark:border-zinc-800 rounded-xl p-3.5 max-w-4xl">
        <div className="flex flex-wrap items-center gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={expandAll} 
            className="h-8 text-xs font-semibold text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800"
          >
            Expandir todas
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={collapseAll} 
            className="h-8 text-xs font-semibold text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800"
          >
            Recolher todas
          </Button>
        </div>
        
        <Button 
          onClick={openReportModal}
          className="bg-[#84A59D] hover:bg-[#6F9189] text-white flex items-center gap-1.5 h-8 text-xs font-bold shadow-sm px-3.5"
        >
          <Printer className="w-4 h-4" /> 
          <span>Emitir PDF</span>
        </Button>
      </div>

      {groupedServices.length === 0 ? (
        <EmptyState
          icon={Scissors}
          title={searchQuery || selectedCategoryFilter !== "all" ? "Nenhum serviço encontrado" : "Nenhum serviço"}
          hint={searchQuery || selectedCategoryFilter !== "all" ? "Tente ajustar seus filtros de busca." : "Cadastre os serviços do seu salão."}
        />
      ) : (
        <div className="space-y-6 max-w-7xl">
          {groupedServices.map((group) => {
            const isCollapsed = !!collapsedCategories[group.id];
            return (
              <div 
                key={group.id} 
                className="border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden bg-zinc-50/20 dark:bg-zinc-900/10 p-4 transition-all"
              >
                {/* Header de Categoria Collapsible */}
                <div 
                  onClick={() => toggleCategory(group.id)} 
                  className="flex items-center justify-between cursor-pointer select-none group/header"
                >
                  <div className="flex items-center gap-2">
                    <Folder className="w-5 h-5 text-[#84A59D] dark:text-[#84A59D]/80" />
                    <h3 className="font-display font-semibold text-base sm:text-lg text-zinc-800 dark:text-zinc-100 group-hover/header:text-[#84A59D] transition-colors">
                      {group.nome}
                    </h3>
                    <span className="px-2 py-0.5 text-[10px] sm:text-xs font-semibold bg-[#84A59D]/10 dark:bg-[#84A59D]/20 text-[#84A59D] rounded-full">
                      {group.services.length} {group.services.length === 1 ? "serviço" : "serviços"}
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-1.5 text-zinc-400 group-hover/header:text-zinc-600 dark:group-hover/header:text-zinc-200 transition-colors">
                    <span className="text-[10px] font-semibold uppercase tracking-wider hidden sm:inline">{isCollapsed ? "Expandir" : "Recolher"}</span>
                    {isCollapsed ? (
                      <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5 transition-transform" />
                    ) : (
                      <ChevronDown className="w-4 h-4 sm:w-5 sm:h-5 transition-transform" />
                    )}
                  </div>
                </div>

                {/* Grid de Serviços */}
                {!isCollapsed && (
                  <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 mt-4 pt-3 border-t border-zinc-100 dark:border-zinc-800/60 fade-in">
                    {group.services.map((s) => (
                      <div 
                        key={s.id} 
                        className="bg-white dark:bg-zinc-900/40 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 hover:shadow-md transition-all flex flex-col justify-between h-full gap-3"
                      >
                        <div>
                          <div className="flex items-start justify-between gap-3">
                            <div className="font-display text-base font-semibold text-zinc-800 dark:text-zinc-100">{s.nome}</div>
                            <div className="text-base font-display font-bold text-[#3A4F4A] dark:text-[#EAF0EE] whitespace-nowrap">
                              {fmtBRL(s.valor)}
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-1.5 mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                            <Clock className="w-3.5 h-3.5" /> 
                            <span>{s.duracao_minutos} min</span>
                          </div>

                          {s.descricao && (
                            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-2 line-clamp-2 italic leading-relaxed">
                              "{s.descricao}"
                            </p>
                          )}
                        </div>

                        <div className="pt-2.5 border-t border-zinc-100 dark:border-zinc-800/60 flex items-center justify-between mt-auto">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                            s.ativo 
                              ? "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-200/50 dark:border-emerald-500/20" 
                              : "bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 border border-zinc-200/50 dark:border-zinc-800"
                          }`}>
                            {s.ativo ? "Ativo" : "Inativo"}
                          </span>
                          
                          <div className="flex gap-1.5">
                            <Button 
                              size="sm" 
                              variant="outline" 
                              onClick={() => edit(s)} 
                              className="hover:bg-zinc-100 dark:hover:bg-zinc-800 h-7 text-xs font-semibold px-2"
                            >
                              <Edit2 className="w-3.5 h-3.5 mr-1" /> Editar
                            </Button>
                            <Button 
                              size="sm" 
                              variant="ghost" 
                              onClick={() => del(s.id)} 
                              className="h-7 w-7 text-rose-500 hover:bg-rose-500/10 hover:text-rose-600 p-0 flex items-center justify-center"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Dialog de confirmação de exclusão */}
      <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Confirmar exclusão</DialogTitle>
          </DialogHeader>
          <div className="py-4 text-sm text-zinc-600 dark:text-zinc-400">
            Tem certeza que deseja excluir este serviço? Esta ação pode ser desfeita a qualquer momento a partir da tela de "Excluídos".
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDeleteConfirmOpen(false)}>Cancelar</Button>
            <Button onClick={confirmDelete} className="bg-rose-500 hover:bg-rose-600 text-white">Excluir</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de Filtros para Emissão do Relatório em PDF */}
      <Dialog open={reportOpen} onOpenChange={setReportOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Printer className="w-5 h-5 text-[#84A59D]" />
              <span>Emitir Relatório de Serviços</span>
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-5 py-3">
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">Categorias a incluir</Label>
                <div className="flex gap-2">
                  <button 
                    type="button"
                    onClick={handleSelectAllCategories}
                    className="text-xs text-[#84A59D] hover:underline font-semibold"
                  >
                    Marcar {reportCategorySearch ? "filtradas" : "todas"}
                  </button>
                  <span className="text-zinc-300 text-xs">|</span>
                  <button 
                    type="button"
                    onClick={handleDeselectAllCategories}
                    className="text-xs text-rose-500 hover:underline font-semibold"
                  >
                    Desmarcar {reportCategorySearch ? "filtradas" : "todas"}
                  </button>
                </div>
              </div>

              <Input 
                placeholder="Pesquisar categoria..." 
                value={reportCategorySearch}
                onChange={(e) => setReportCategorySearch(e.target.value)}
                className="h-9 text-xs mb-3 bg-zinc-50 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800"
              />
              
              <div className="border border-zinc-200 dark:border-zinc-800 rounded-xl p-3 bg-zinc-50/50 dark:bg-zinc-900/50 max-h-48 overflow-y-auto space-y-2.5">
                {/* Opção Sem Categoria */}
                {"Sem Categoria".toLowerCase().includes(reportCategorySearch.toLowerCase()) && (
                  <div className="flex items-center space-x-2.5">
                    <Checkbox 
                      id="cat-none"
                      checked={selectedReportCategories.includes("none")}
                      onCheckedChange={() => handleCategoryToggle("none")}
                    />
                    <Label htmlFor="cat-none" className="text-sm font-medium text-zinc-700 dark:text-zinc-200 cursor-pointer select-none">
                      Sem Categoria
                    </Label>
                  </div>
                )}

                {categorias
                  .filter(c => c.tipo === "servico" || c.tipo === "ambos")
                  .filter(c => c.nome.toLowerCase().includes(reportCategorySearch.toLowerCase()))
                  .map((c) => (
                    <div key={c.id} className="flex items-center space-x-2.5">
                      <Checkbox 
                        id={`cat-${c.id}`}
                        checked={selectedReportCategories.includes(c.id)}
                        onCheckedChange={() => handleCategoryToggle(c.id)}
                      />
                      <Label htmlFor={`cat-${c.id}`} className="text-sm font-medium text-zinc-700 dark:text-zinc-200 cursor-pointer select-none">
                        {c.nome}
                      </Label>
                    </div>
                  ))}

                {categorias
                  .filter(c => c.tipo === "servico" || c.tipo === "ambos")
                  .filter(c => c.nome.toLowerCase().includes(reportCategorySearch.toLowerCase())).length === 0 &&
                  !"Sem Categoria".toLowerCase().includes(reportCategorySearch.toLowerCase()) && (
                    <div className="text-center py-4 text-xs text-zinc-450 dark:text-zinc-500">
                      Nenhuma categoria encontrada
                    </div>
                  )}
              </div>
            </div>

            <div className="flex items-center justify-between bg-zinc-50 dark:bg-zinc-900/40 p-3 rounded-xl border border-zinc-200/60 dark:border-zinc-800/80">
              <div className="space-y-0.5">
                <Label htmlFor="include-insumos" className="text-sm font-bold text-zinc-800 dark:text-zinc-200">Exibir insumos dos serviços</Label>
                <p className="text-xs text-zinc-400">Lista insumos/materiais e quantidades abaixo do serviço.</p>
              </div>
              <Switch 
                id="include-insumos"
                checked={includeInsumos}
                onCheckedChange={setIncludeInsumos}
              />
            </div>
          </div>
          
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setReportOpen(false)} className="w-full sm:w-auto h-10 font-semibold">
              Cancelar
            </Button>
            <Button 
              onClick={generatePDF} 
              disabled={selectedReportCategories.length === 0}
              className="bg-[#84A59D] hover:bg-[#6F9189] text-white w-full sm:w-auto h-10 font-bold"
            >
              <Printer className="w-4 h-4 mr-1.5" />
              Gerar PDF
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AuditModal 
        isOpen={auditOpen} 
        onClose={() => setAuditOpen(false)} 
        modulo="servico" 
        tituloModulo="Serviços" 
        onRestoreSuccess={load}
      />
    </div>
  );
}
