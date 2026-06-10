import React, { useEffect, useState } from "react";
import http from "../api";
import { PageHeader, EmptyState } from "../components/Page";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Switch } from "../components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "../components/ui/dialog";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "../components/ui/select";
import { Package, Plus, Edit2, Trash2, AlertTriangle, Percent, History, Printer, Folder, ChevronDown, ChevronRight } from "lucide-react";
import { Checkbox } from "../components/ui/checkbox";
import { toast } from "sonner";
import AuditModal from "../components/AuditModal";
import SearchableSelect from "../components/SearchableSelect";

const blank = { nome: "", categoria: "", categoria_id: "", unidade_medida: "un", quantidade_estoque: 0, estoque_minimo: 5, custo_unitario: 0, preco_venda: 0, fornecedor: "", ativo: true, comissao: 0, quantidade_por_unidade: 0, unidade_medida_insumo: "un" };
const fmtBRL = (n) => (n || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export default function Produtos() {
  const [list, setList] = useState([]);
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
  const [includePrices, setIncludePrices] = useState(true);
  const [reportCategorySearch, setReportCategorySearch] = useState("");
  const [empresa, setEmpresa] = useState(null);

  const openReportModal = () => {
    const allIds = [
      "none",
      ...categorias.filter(c => c.tipo === "produto" || c.tipo === "ambos").map(c => c.id)
    ];
    setSelectedReportCategories(allIds);
    setIncludePrices(true);
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
      .filter(c => c.tipo === "produto" || c.tipo === "ambos")
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
      .filter(c => c.tipo === "produto" || c.tipo === "ambos")
      .filter(c => c.nome.toLowerCase().includes(reportCategorySearch.toLowerCase()))
      .forEach(c => visibleIds.push(c.id));

    setSelectedReportCategories(selectedReportCategories.filter(id => !visibleIds.includes(id)));
  };

  const generatePDF = () => {
    const reportProducts = list.filter(p => {
      const matchesSearch = !searchQuery || p.nome.toLowerCase().includes(searchQuery.toLowerCase()) || 
        (p.fornecedor && p.fornecedor.toLowerCase().includes(searchQuery.toLowerCase()));
      
      if (!matchesSearch) return false;
      
      const isUncategorized = !p.categoria_id || !categorias.some(c => c.id === p.categoria_id);
      if (isUncategorized) {
        return selectedReportCategories.includes("none");
      }
      return selectedReportCategories.includes(p.categoria_id);
    });

    const groups = [];
    categorias.forEach(c => {
      if (selectedReportCategories.includes(c.id)) {
        const products = reportProducts.filter(p => p.categoria_id === c.id);
        if (products.length > 0) {
          groups.push({
            id: c.id,
            nome: c.nome,
            products: products
          });
        }
      }
    });

    if (selectedReportCategories.includes("none")) {
      const products = reportProducts.filter(p => !p.categoria_id || !categorias.some(c => c.id === p.categoria_id));
      if (products.length > 0) {
        groups.push({
          id: "none",
          nome: "Sem Categoria",
          products: products
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
  <title>Relatório de Produtos por Categoria</title>
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
      font-size: 12px;
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
      font-size: 15px;
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
    .products-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 5px;
    }
    .products-table th {
      text-align: left;
      font-size: 10px;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: #71717a;
      border-bottom: 1.5px solid #e4e4e7;
      padding: 6px 10px;
      font-weight: 600;
    }
    .products-table td {
      padding: 10px;
      border-bottom: 1px solid #f4f4f5;
      vertical-align: middle;
    }
    .product-name {
      font-weight: 600;
      font-size: 13px;
      color: #18181b;
    }
    .product-supplier {
      font-size: 11px;
      color: #71717a;
      margin-top: 1px;
    }
    .product-stock {
      font-weight: 600;
    }
    .stock-alert {
      color: #b45309;
      background-color: #fef3c7;
      padding: 2px 6px;
      border-radius: 4px;
      font-size: 10px;
      font-weight: 700;
    }
    .stock-normal {
      color: #18181b;
    }
    .numeric-cell {
      text-align: right;
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
      <h1>Relatório de Estoque e Produtos</h1>
      <p>Filtros aplicados: ${groups.length} categorias selecionadas ${searchQuery ? `• Busca: "${searchQuery}"` : ""}</p>
    </div>
    <div class="header-right">
      <div class="brand">${empresa?.nome_fantasia || "Salon Studio"}</div>
      <div>Gerado em ${currentDate} às ${currentTime}</div>
    </div>
  </div>
  `;

    if (groups.length === 0) {
      htmlContent += `
      <div style="text-align: center; padding: 50px; color: #71717a;">
        <h3>Nenhum produto encontrado com os filtros selecionados</h3>
      </div>
      `;
    } else {
      groups.forEach(g => {
        htmlContent += `
        <div class="category-section">
          <div class="category-header">
            <span class="category-name">${g.nome}</span>
            <span class="category-count">${g.products.length} ${g.products.length === 1 ? "produto" : "produtos"}</span>
          </div>
          <table class="products-table">
            <thead>
              <tr>
                <th>Produto / Fabricante</th>
                <th style="width: 120px; text-align: right;">Qtd. Estoque</th>
                <th style="width: 100px; text-align: center;">Mín. Alerta</th>
                ${includePrices ? `
                  <th style="width: 120px; text-align: right;">Custo Unitário</th>
                  <th style="width: 120px; text-align: right;">Preço Venda</th>
                ` : ""}
              </tr>
            </thead>
            <tbody>
        `;

        g.products.forEach(p => {
          const baixoEstoque = p.quantidade_estoque <= p.estoque_minimo;
          const stockClass = baixoEstoque ? "stock-alert" : "stock-normal";
          const stockLabel = `${Number(Number(p.quantidade_estoque || 0).toFixed(3))} ${p.unidade_medida || "un"}`;
          
          htmlContent += `
              <tr>
                <td>
                  <div class="product-name">${p.nome}</div>
                  ${p.fornecedor ? `<div class="product-supplier">${p.fornecedor}</div>` : ""}
                </td>
                <td class="numeric-cell">
                  <span class="${stockClass}">${stockLabel} ${baixoEstoque ? "⚠️ (Baixo)" : ""}</span>
                </td>
                <td style="text-align: center; color: #71717a;">${p.estoque_minimo} ${p.unidade_medida || "un"}</td>
                ${includePrices ? `
                  <td class="numeric-cell" style="color: #71717a; font-family: monospace;">${fmtBRL(p.custo_unitario)}</td>
                  <td class="numeric-cell" style="font-weight: 600; color: #3A4F4A; font-family: monospace;">${fmtBRL(p.preco_venda)}</td>
                ` : ""}
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

  const load = () => {
    http.get("/produtos").then((r) => setList(r.data));
    http.get("/categorias").then((r) => setCategorias(r.data));
    http.get("/configuracoes/empresa").then((r) => setEmpresa(r.data)).catch(() => {});
  };
  useEffect(() => { load(); }, []);

  const save = async () => {
    try {
      if (!form.nome || !form.nome.trim()) {
        toast.error("O nome do produto é obrigatório");
        return;
      }
      if (!form.categoria_id) {
        toast.error("A categoria é obrigatória. Selecione uma categoria cadastrada.");
        return;
      }
      const p = { ...form,
        quantidade_estoque: Number(form.quantidade_estoque),
        estoque_minimo: Number(form.estoque_minimo),
        custo_unitario: Number(form.custo_unitario),
        preco_venda: Number(form.preco_venda),
        comissao: Number(form.comissao || 0),
        quantidade_por_unidade: Number(form.quantidade_por_unidade || 0),
        unidade_medida_insumo: form.unidade_medida_insumo || "un",
      };
      if (form.id) await http.put(`/produtos/${form.id}`, p); else await http.post("/produtos", p);
      toast.success("Salvo"); setOpen(false); setForm(blank); load();
    } catch (err) {
      const msg = err.response?.data?.detail || "Erro ao salvar";
      toast.error(msg);
    }
  };
  
  const del = (id) => {
    setDeletingId(id);
    setDeleteConfirmOpen(true);
  };

  const confirmDelete = async () => {
    if (!deletingId) return;
    try {
      await http.delete(`/produtos/${deletingId}`);
      toast.success("Produto removido");
      setDeleteConfirmOpen(false);
      setDeletingId(null);
      load();
    } catch (e) {
      toast.error(e.response?.data?.detail || "Erro ao remover");
    }
  };

  const edit = (p) => { 
    setForm({
      ...p,
      quantidade_por_unidade: p.quantidade_por_unidade !== undefined && p.quantidade_por_unidade !== null
        ? Number(p.quantidade_por_unidade).toFixed(3)
        : ""
    }); 
    setOpen(true); 
  };

  const toggleCategory = (catId) => {
    setCollapsedCategories(prev => ({
      ...prev,
      [catId]: prev[catId] === false ? true : false
    }));
  };

  const expandAll = () => {
    const expanded = {};
    categorias.forEach(c => {
      expanded[c.id] = false;
    });
    expanded["none"] = false;
    setCollapsedCategories(expanded);
  };

  const collapseAll = () => {
    setCollapsedCategories({});
  };

  const filteredList = list.filter((p) => {
    const matchesSearch = p.nome.toLowerCase().includes(searchQuery.toLowerCase()) || 
      (p.fornecedor && p.fornecedor.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesCategory =
      selectedCategoryFilter === "all" ||
      (selectedCategoryFilter === "none" && !p.categoria_id) ||
      p.categoria_id === selectedCategoryFilter;
    return matchesSearch && matchesCategory;
  });

  const groupedProducts = [];
  categorias.forEach(c => {
    const products = filteredList.filter(p => p.categoria_id === c.id);
    if (products.length > 0) {
      groupedProducts.push({
        id: c.id,
        nome: c.nome,
        products: products
      });
    }
  });

  const uncategorized = filteredList.filter(p => !p.categoria_id || !categorias.some(c => c.id === p.categoria_id));
  if (uncategorized.length > 0) {
    groupedProducts.push({
      id: "none",
      nome: "Sem Categoria",
      products: uncategorized
    });
  }

  return (
    <div className="p-6 lg:p-8 fade-in">
      <PageHeader 
        overline="Estoque" 
        title={
          <div className="flex items-center gap-3">
            <span>Produtos</span>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700 mt-1.5 shrink-0">
              {list.length} {list.length === 1 ? 'cadastrado' : 'cadastrados'}
            </span>
          </div>
        } 
        action={
          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            <Button 
              onClick={openReportModal} 
              variant="outline" 
              className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 h-10 font-bold border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-900/60"
            >
              <Printer className="w-4 h-4" /> Emitir PDF
            </Button>
            <Button onClick={() => { setForm(blank); setOpen(true); }} className="flex-1 sm:flex-initial bg-[#84A59D] hover:bg-[#6F9189] text-white flex items-center justify-center gap-1.5 h-10 font-bold shadow-sm">
              <Plus className="w-4 h-4" /> Novo produto
            </Button>
          </div>
        } 
      />

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="w-[95vw] max-w-[95vw] sm:max-w-2xl w-full p-0 gap-0 flex flex-col overflow-hidden bg-white dark:bg-zinc-950 shadow-2xl rounded-2xl border-0" style={{ maxHeight: "90vh" }}>
          {/* fixed header */}
          <div className="px-6 pt-5 pb-4 border-b border-zinc-100 dark:border-zinc-800 shrink-0 bg-zinc-50/50 dark:bg-zinc-900/20">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2.5 text-base font-bold text-zinc-800 dark:text-zinc-100">
                <div className="p-1.5 bg-[#EAF0EE] dark:bg-[#1a2e2a] text-[#3A4F4A] dark:text-[#84A59D] rounded-lg">
                  <Package className="w-5 h-5" />
                </div>
                <div>
                  <span className="block font-display text-base font-bold text-zinc-950 dark:text-zinc-50">{form.id ? "Editar" : "Novo"} Produto</span>
                  <span className="text-[10px] text-zinc-400 dark:text-zinc-500 font-medium">Preencha as informações detalhadas de estoque, comissão e valores do produto.</span>
                </div>
              </DialogTitle>
            </DialogHeader>
          </div>

          {/* Scrollable body */}
          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6 bg-zinc-50/10 dark:bg-zinc-900/5">
            
            {/* Section 1: Identificação */}
            <div className="space-y-4">
              <h3 className="text-xs font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">1. Identificação do Produto</h3>
              <div className="bg-white dark:bg-zinc-900/40 p-4 border border-zinc-150 dark:border-zinc-800 rounded-xl shadow-xs space-y-4">
                <div>
                  <Label className="text-xs font-semibold text-zinc-600 dark:text-zinc-400">Nome do Produto *</Label>
                  <Input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} placeholder="Ex: Shampoo Nutritivo 500ml" className="mt-1" />
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs font-semibold text-zinc-600 dark:text-zinc-400">Categoria *</Label>
                    <div className="mt-1">
                      <SearchableSelect
                        options={categorias
                          .filter(c => c.tipo === "produto" || c.tipo === "ambos")
                          .map(c => ({ value: c.id, label: c.nome }))}
                        value={form.categoria_id || ""}
                        onValueChange={(val) => {
                          const cat = categorias.find(c => c.id === val);
                          setForm({
                            ...form,
                            categoria_id: val,
                            categoria: cat ? cat.nome : ""
                          });
                        }}
                        placeholder="Selecione a categoria *"
                        searchPlaceholder="Pesquisar categoria..."
                        emptyText="Nenhuma categoria encontrada."
                      />
                    </div>
                  </div>
                  
                  <div>
                    <Label className="text-xs font-semibold text-zinc-600 dark:text-zinc-400">Unidade de Medida</Label>
                    <Input value={form.unidade_medida} onChange={(e) => setForm({ ...form, unidade_medida: e.target.value })} placeholder="Ex: un, ml, kg" className="mt-1" />
                  </div>
                </div>

                <div>
                  <Label className="text-xs font-semibold text-zinc-600 dark:text-zinc-400">Fornecedor / Fabricante</Label>
                  <Input value={form.fornecedor} onChange={(e) => setForm({ ...form, fornecedor: e.target.value })} placeholder="Ex: L'Oréal Professional" className="mt-1" />
                </div>
              </div>
            </div>

            {/* Section 2: Valores e Comissão */}
            <div className="space-y-4">
              <h3 className="text-xs font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">2. Precificação & Comissionamento</h3>
              <div className="bg-white dark:bg-zinc-900/40 p-4 border border-zinc-150 dark:border-zinc-800 rounded-xl shadow-xs space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs font-semibold text-zinc-600 dark:text-zinc-400">Custo Unitário (R$)</Label>
                    <Input type="number" step="0.01" value={form.custo_unitario} onChange={(e) => setForm({ ...form, custo_unitario: e.target.value })} placeholder="0,00" className="mt-1 font-mono" />
                    <p className="text-[10px] text-zinc-400 mt-1">Custo total da embalagem de compra.</p>
                  </div>
                  <div>
                    <Label className="text-xs font-semibold text-zinc-600 dark:text-zinc-400">Preço de Venda (R$) *</Label>
                    <Input type="number" step="0.01" value={form.preco_venda} onChange={(e) => setForm({ ...form, preco_venda: e.target.value })} placeholder="0,00" className="mt-1 font-mono font-bold text-[#3A4F4A] dark:text-[#EAF0EE]" />
                  </div>
                </div>

                 {/* Quantidade por Unidade de Compra */}
                <div className="p-3.5 bg-[#F8FBFB] dark:bg-[#1a2322] border border-[#E8EFEF] dark:border-[#2e3e3b] rounded-xl space-y-2">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-[#3A4F4A] dark:text-[#84A59D]">
                    <Package className="w-3.5 h-3.5" />
                    <span>Configuração do Conteúdo da Embalagem (Insumos)</span>
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <Label className="text-[10px] font-semibold text-zinc-500 dark:text-zinc-400">Quantidade na Embalagem</Label>
                      <Input
                        type="text"
                        inputMode="decimal"
                        value={form.quantidade_por_unidade}
                        onChange={(e) => {
                          let val = e.target.value;
                          val = val.replace(/[^0-9.,]/g, "");
                          const parts = val.split(/[.,]/);
                          if (parts.length > 2) {
                            val = parts[0] + "." + parts.slice(1).join("");
                          } else if (val.includes(",")) {
                            val = val.replace(",", ".");
                          }
                          setForm(prev => ({ ...prev, quantidade_por_unidade: val }));
                        }}
                        onBlur={(e) => {
                          const val = e.target.value;
                          if (val !== "" && !isNaN(val)) {
                            setForm(prev => ({ ...prev, quantidade_por_unidade: Number(val).toFixed(3) }));
                          }
                        }}
                        className="font-mono mt-1"
                        placeholder="Ex: 400.000, 900.000, 1000.000"
                      />
                    </div>
                    <div>
                      <Label className="text-[10px] font-semibold text-zinc-500 dark:text-zinc-400">Unidade de Consumo (g, ml, un...)</Label>
                      <Input
                        value={form.unidade_medida_insumo || ""}
                        onChange={(e) => setForm({ ...form, unidade_medida_insumo: e.target.value })}
                        className="mt-1"
                        placeholder="Ex: g, ml, un"
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-1.5 pt-1.5 border-t border-dashed border-[#E8EFEF] dark:border-[#2e3e3b] mt-2">
                    <p className="text-[10px] text-zinc-500 dark:text-zinc-400 leading-relaxed">
                      Informe o conteúdo interno da embalagem (ex: 400g ou 900ml) para calcular o custo proporcional por grama/mililitro no lançamento de insumos.
                    </p>
                    {Number(form.quantidade_por_unidade) > 0 && Number(form.custo_unitario) > 0 && (
                      <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-[#EAF0EE] dark:bg-[#1a2e2a] border border-[#84A59D]/30">
                        <span className="text-[10px] text-zinc-500 dark:text-zinc-400">Custo por {form.unidade_medida_insumo || "un"}:</span>
                        <span className="text-[11px] font-bold font-mono text-[#3A4F4A] dark:text-[#84A59D]">
                          {(() => {
                            const val = Number(form.custo_unitario) / Number(form.quantidade_por_unidade);
                            const hasMoreDecimals = (val * 100) % 1 !== 0;
                            return val.toLocaleString("pt-BR", {
                              style: "currency",
                              currency: "BRL",
                              minimumFractionDigits: 2,
                              maximumFractionDigits: hasMoreDecimals ? 4 : 2
                            });
                          })()}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="p-3.5 bg-[#F8FBFB] dark:bg-[#1a2322] border border-[#E8EFEF] dark:border-[#2e3e3b] rounded-xl space-y-2">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-[#3A4F4A] dark:text-[#84A59D]">
                     <Percent className="w-3.5 h-3.5" />
                    <span>Comissão por Venda</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
                    <div className="relative mt-1">
                      <Input
                        type="number"
                        step="0.1"
                        value={form.comissao}
                        onChange={(e) => setForm({ ...form, comissao: e.target.value })}
                        className="font-mono pr-8"
                        placeholder="0.0"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-zinc-400 dark:text-zinc-500">%</span>
                    </div>
                    <p className="text-[10px] text-zinc-500 dark:text-zinc-400 leading-relaxed">
                      Percentual de comissão pago diretamente ao colaborador pela venda deste produto.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Section 3: Estoque */}
            <div className="space-y-4">
              <h3 className="text-xs font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">3. Controle de Estoque & Status</h3>
              <div className="bg-white dark:bg-zinc-900/40 p-4 border border-zinc-150 dark:border-zinc-800 rounded-xl shadow-xs space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs font-semibold text-zinc-600 dark:text-zinc-400">Quantidade em Estoque</Label>
                    <Input type="number" value={form.quantidade_estoque} onChange={(e) => setForm({ ...form, quantidade_estoque: e.target.value })} placeholder="0" className="mt-1 font-mono" />
                  </div>
                  <div>
                    <Label className="text-xs font-semibold text-zinc-600 dark:text-zinc-400">Mínimo para Alerta</Label>
                    <Input type="number" value={form.estoque_minimo} onChange={(e) => setForm({ ...form, estoque_minimo: e.target.value })} placeholder="5" className="mt-1 font-mono" />
                  </div>
                </div>

                <div className="flex items-center justify-between p-3.5 bg-zinc-50/50 dark:bg-zinc-900/20 border border-zinc-100 dark:border-zinc-800 rounded-xl">
                  <div className="space-y-0.5">
                    <Label className="text-xs font-bold text-zinc-800 dark:text-zinc-200">Disponibilidade do Produto</Label>
                    <p className="text-[10px] text-zinc-400 dark:text-zinc-500">Se desativado, o produto não poderá ser selecionado em novas vendas ou atendimentos.</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch checked={form.ativo} onCheckedChange={(v) => setForm({ ...form, ativo: v })} />
                    <span className="text-xs font-semibold text-zinc-650 dark:text-zinc-400">{form.ativo ? "Ativo" : "Inativo"}</span>
                  </div>
                </div>
              </div>
            </div>

          </div>

          {/* fixed footer */}
          <div className="px-6 py-4 border-t border-zinc-150 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/20 shrink-0 flex flex-col sm:flex-row gap-2.5 sm:justify-end">
            <Button type="button" variant="outline" className="w-full sm:w-auto h-10 border-zinc-300 hover:bg-zinc-100 dark:border-zinc-800 dark:hover:bg-zinc-900 font-semibold" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={save} className="w-full sm:w-auto bg-[#84A59D] hover:bg-[#6F9189] text-white shadow-xs font-bold h-10 px-6">
              Salvar Produto
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <div className="mb-6 flex flex-col md:flex-row md:items-end gap-4 max-w-4xl">
        <div className="flex-1">
          <Label className="text-xs font-semibold text-zinc-500 mb-1 block">Pesquisar produto</Label>
          <Input
            placeholder="Pesquisar por nome ou fornecedor..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-10 bg-white dark:bg-zinc-950"
          />
        </div>
        <div className="w-full md:w-64">
          <Label className="text-xs font-semibold text-zinc-500 mb-1 block">Filtrar por Categoria</Label>
          <SearchableSelect
            options={[
              { value: "all", label: "Todas as categorias" },
              { value: "none", label: "Sem categoria" },
              ...categorias
                .filter(c => c.tipo === "produto" || c.tipo === "ambos")
                .map(c => ({ value: c.id, label: c.nome }))
            ]}
            value={selectedCategoryFilter}
            onValueChange={setSelectedCategoryFilter}
            placeholder="Todas as categorias"
            searchPlaceholder="Pesquisar categoria..."
            emptyText="Nenhuma categoria encontrada."
            className="bg-white dark:bg-zinc-950 h-10"
          />
        </div>
        <Button 
          variant="outline" 
          onClick={() => setAuditOpen(true)}
          className="flex items-center justify-center gap-1.5 text-sm font-semibold text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200 border border-zinc-200 dark:border-zinc-800 h-10 w-full md:w-auto shrink-0"
        >
          <History className="w-4 h-4" />
          <span>Excluídos</span>
        </Button>
      </div>
      {/* Painel de Ações para Expandir/Recolher categorias */}
      <div className="mb-6 flex flex-wrap items-center gap-2 bg-zinc-50 dark:bg-zinc-900/20 border border-zinc-200 dark:border-zinc-800 rounded-xl p-3 max-w-4xl">
        <Button 
          variant="outline" 
          size="sm" 
          onClick={expandAll} 
          className="h-8 text-xs font-semibold text-zinc-650 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800"
        >
          Expandir todas
        </Button>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={collapseAll} 
          className="h-8 text-xs font-semibold text-zinc-650 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800"
        >
          Recolher todas
        </Button>
      </div>

      {groupedProducts.length === 0 ? (
        <EmptyState
          icon={Package}
          title={searchQuery || selectedCategoryFilter !== "all" ? "Nenhum produto encontrado" : "Nenhum produto"}
          hint={searchQuery || selectedCategoryFilter !== "all" ? "Tente ajustar seus filtros de busca." : "Adicione produtos para controlar seu estoque."}
        />
      ) : (
        <div className="space-y-6 max-w-7xl">
          {groupedProducts.map((group) => {
            const isCollapsed = collapsedCategories[group.id] !== false;
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
                    <h3 className="font-display font-semibold text-base sm:text-lg text-zinc-850 dark:text-zinc-100 group-hover/header:text-[#84A59D] transition-colors">
                      {group.nome}
                    </h3>
                    <span className="px-2 py-0.5 text-[10px] sm:text-xs font-semibold bg-[#84A59D]/10 dark:bg-[#84A59D]/20 text-[#84A59D] rounded-full">
                      {group.products.length} {group.products.length === 1 ? "produto" : "produtos"}
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-1.5 text-zinc-400 group-hover/header:text-zinc-650 dark:group-hover/header:text-zinc-200 transition-colors">
                    <span className="text-[10px] font-semibold uppercase tracking-wider hidden sm:inline">{isCollapsed ? "Expandir" : "Recolher"}</span>
                    {isCollapsed ? (
                      <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5 transition-transform" />
                    ) : (
                      <ChevronDown className="w-4 h-4 sm:w-5 sm:h-5 transition-transform" />
                    )}
                  </div>
                </div>

                {/* Grid / Tabela de Produtos da Categoria */}
                {!isCollapsed && (
                  <div className="mt-4 pt-3 border-t border-zinc-150 dark:border-zinc-850 fade-in">
                    {/* Desktop Table View */}
                    <div className="hidden md:block bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden shadow-xs">
                      <table className="w-full text-sm">
                        <thead className="bg-zinc-50 dark:bg-zinc-900 text-xs uppercase tracking-wider text-zinc-500 dark:text-zinc-400 border-b border-zinc-200 dark:border-zinc-800">
                          <tr>
                            <th className="px-4 py-3 text-left font-semibold">Produto</th>
                            <th className="px-4 py-3 text-right font-semibold">Estoque</th>
                            <th className="px-4 py-3 text-right font-semibold">Preço</th>
                            <th className="px-4 py-3 text-center font-semibold">Comissão</th>
                            <th className="px-4 py-3"></th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800 text-zinc-700 dark:text-zinc-300">
                          {group.products.map((p) => {
                            const baixo = p.quantidade_estoque <= p.estoque_minimo;
                            return (
                              <tr key={p.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-900/50 transition-colors">
                                <td className="px-4 py-3">
                                  <div className="font-semibold text-zinc-900 dark:text-zinc-100">{p.nome}</div>
                                  {p.fornecedor && <div className="text-[11px] text-zinc-400 mt-0.5">{p.fornecedor}</div>}
                                </td>
                                <td className="px-4 py-3 text-right">
                                  <span className={`inline-flex items-center gap-1 ${baixo ? "text-amber-700 dark:text-amber-500 font-bold" : "text-zinc-700 dark:text-zinc-300"}`}>
                                    {baixo && <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />}
                                    {Number(Number(p.quantidade_estoque || 0).toFixed(3))} {p.unidade_medida}
                                  </span>
                                </td>
                                <td className="px-4 py-3 text-right font-semibold text-zinc-900 dark:text-zinc-100 font-mono">{fmtBRL(p.preco_venda)}</td>
                                <td className="px-4 py-3 text-center">
                                  {p.comissao > 0 ? (
                                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400 border border-blue-100 dark:border-blue-900/30">
                                      {p.comissao}%
                                    </span>
                                  ) : (
                                    <span className="text-zinc-400 dark:text-zinc-650">-</span>
                                  )}
                                </td>
                                <td className="px-4 py-3 text-right">
                                  <div className="flex justify-end gap-1">
                                    <Button size="sm" variant="ghost" onClick={() => edit(p)} className="text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"><Edit2 className="w-4 h-4" /></Button>
                                    <Button size="sm" variant="ghost" onClick={() => del(p.id)} className="text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30"><Trash2 className="w-4 h-4" /></Button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>

                    {/* Mobile Card List View */}
                    <div className="block md:hidden space-y-4">
                      {group.products.map((p) => {
                        const baixo = p.quantidade_estoque <= p.estoque_minimo;
                        return (
                          <div 
                            key={p.id}
                            className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-4.5 rounded-xl shadow-xs flex flex-col gap-3.5"
                          >
                            <div>
                              <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                  <h4 className="font-extrabold text-zinc-900 dark:text-zinc-50 text-[16px] sm:text-lg tracking-tight leading-snug">{p.nome}</h4>
                                  {p.fornecedor && <p className="text-xs text-zinc-400 dark:text-zinc-500 font-medium mt-0.5">{p.fornecedor}</p>}
                                </div>
                                {p.comissao > 0 && (
                                  <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400 border border-blue-100 dark:border-blue-900/30 shrink-0">
                                    Comissão {p.comissao}%
                                  </span>
                                )}
                              </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3 py-2 border-y border-zinc-100 dark:border-zinc-800 text-xs">
                              <div className="space-y-0.5">
                                <span className="text-[9px] uppercase font-bold tracking-wider text-zinc-400 dark:text-zinc-500 block">Estoque</span>
                                <span className={`inline-flex items-center gap-1 font-bold text-sm ${baixo ? "text-amber-700 dark:text-amber-500" : "text-zinc-800 dark:text-zinc-250"}`}>
                                  {baixo && <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />}
                                  {Number(Number(p.quantidade_estoque || 0).toFixed(3))} {p.unidade_medida}
                                </span>
                              </div>
                              <div className="space-y-0.5">
                                <span className="text-[9px] uppercase font-bold tracking-wider text-zinc-400 dark:text-zinc-500 block">Preço de Venda</span>
                                <span className="font-extrabold text-sm text-[#3A4F4A] dark:text-[#84A59D] font-mono">{fmtBRL(p.preco_venda)}</span>
                              </div>
                            </div>

                            <div className="flex items-center gap-2">
                              <Button 
                                size="sm" 
                                variant="outline" 
                                onClick={() => edit(p)}
                                className="flex-1 h-9 text-xs font-semibold flex items-center justify-center gap-1.5 border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300"
                              >
                                <Edit2 className="w-3.5 h-3.5" /> Editar
                              </Button>
                              <Button 
                                size="sm" 
                                variant="outline" 
                                onClick={() => del(p.id)}
                                className="h-9 px-3 border-zinc-200 dark:border-zinc-700 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 flex items-center justify-center"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Dialog de confirmação de exclusão */}
      <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <DialogContent className="w-[95vw] max-w-[95vw] sm:max-w-md p-5 sm:p-6 rounded-2xl dark:bg-zinc-900 dark:border-zinc-800">
          <DialogHeader>
            <DialogTitle className="text-zinc-900 dark:text-zinc-50">Confirmar exclusão</DialogTitle>
          </DialogHeader>
          <div className="py-4 text-sm text-zinc-650 dark:text-zinc-400">
            Tem certeza que deseja excluir este produto? Esta ação pode ser desfeita a qualquer momento a partir da tela de "Excluídos".
          </div>
          <DialogFooter className="flex flex-col sm:flex-row gap-2.5 mt-2 pt-2 border-t border-zinc-150 dark:border-zinc-850">
            <Button variant="outline" onClick={() => setDeleteConfirmOpen(false)} className="w-full sm:w-auto border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-350">Cancelar</Button>
            <Button onClick={confirmDelete} className="w-full sm:w-auto bg-rose-500 hover:bg-rose-600 text-white font-bold">Excluir</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* Modal de Filtros para Emissão do Relatório em PDF */}
      <Dialog open={reportOpen} onOpenChange={setReportOpen}>
        <DialogContent className="w-[95vw] max-w-[95vw] sm:max-w-md p-5 sm:p-6 bg-white dark:bg-zinc-950 rounded-2xl border border-zinc-150 dark:border-zinc-850 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Printer className="w-5 h-5 text-[#84A59D]" />
              <span className="font-display font-bold text-zinc-900 dark:text-zinc-50">Emitir Relatório de Produtos</span>
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
                      id="prod-cat-none"
                      checked={selectedReportCategories.includes("none")}
                      onCheckedChange={() => handleCategoryToggle("none")}
                    />
                    <Label htmlFor="prod-cat-none" className="text-sm font-medium text-zinc-700 dark:text-zinc-200 cursor-pointer select-none">
                      Sem Categoria
                    </Label>
                  </div>
                )}

                {categorias
                  .filter(c => c.tipo === "produto" || c.tipo === "ambos")
                  .filter(c => c.nome.toLowerCase().includes(reportCategorySearch.toLowerCase()))
                  .map((c) => (
                    <div key={c.id} className="flex items-center space-x-2.5">
                      <Checkbox 
                        id={`prod-cat-${c.id}`}
                        checked={selectedReportCategories.includes(c.id)}
                        onCheckedChange={() => handleCategoryToggle(c.id)}
                      />
                      <Label htmlFor={`prod-cat-${c.id}`} className="text-sm font-medium text-zinc-700 dark:text-zinc-200 cursor-pointer select-none">
                        {c.nome}
                      </Label>
                    </div>
                  ))}

                {categorias
                  .filter(c => c.tipo === "produto" || c.tipo === "ambos")
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
                <Label htmlFor="include-prices" className="text-sm font-bold text-zinc-800 dark:text-zinc-200">Exibir valores financeiros</Label>
                <p className="text-xs text-zinc-400">Exibe custos e preços de venda de cada produto.</p>
              </div>
              <Switch 
                id="include-prices"
                checked={includePrices}
                onCheckedChange={setIncludePrices}
              />
            </div>
          </div>
          
          <DialogFooter className="flex flex-col sm:flex-row gap-2.5 mt-2 pt-2 border-t border-zinc-150 dark:border-zinc-850">
            <Button variant="outline" onClick={() => setReportOpen(false)} className="w-full sm:w-auto h-10 font-semibold border-zinc-300 dark:border-zinc-800">
              Cancelar
            </Button>
            <Button 
              onClick={generatePDF} 
              disabled={selectedReportCategories.length === 0}
              className="bg-[#84A59D] hover:bg-[#6F9189] text-white w-full sm:w-auto h-10 font-bold flex items-center justify-center gap-1.5"
            >
              <Printer className="w-4 h-4" />
              Gerar PDF
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AuditModal 
        isOpen={auditOpen} 
        onClose={() => setAuditOpen(false)} 
        modulo="produto" 
        tituloModulo="Produtos" 
        onRestoreSuccess={load}
      />
    </div>
  );
}
