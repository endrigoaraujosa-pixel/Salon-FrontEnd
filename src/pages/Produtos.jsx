import React, { useEffect, useState } from "react";
import http from "../api";
import { PageHeader, EmptyState } from "../components/Page";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Switch } from "../components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "../components/ui/dialog";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "../components/ui/select";
import { Package, Plus, Edit2, Trash2, AlertTriangle, Percent, History, Printer } from "lucide-react";
import { Checkbox } from "../components/ui/checkbox";
import { toast } from "sonner";
import AuditModal from "../components/AuditModal";

const blank = { nome: "", categoria: "", categoria_id: "", unidade_medida: "un", quantidade_estoque: 0, estoque_minimo: 5, custo_unitario: 0, preco_venda: 0, fornecedor: "", ativo: true, comissao: 0 };
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

  const [reportOpen, setReportOpen] = useState(false);
  const [selectedReportCategories, setSelectedReportCategories] = useState([]);
  const [includePrices, setIncludePrices] = useState(true);
  const [reportCategorySearch, setReportCategorySearch] = useState("");

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
      <div class="brand">Salon Studio</div>
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
          const stockLabel = `${p.quantidade_estoque} ${p.unidade_medida || "un"}`;
          
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
      toast.error("Erro ao remover");
    }
  };

  const edit = (p) => { setForm(p); setOpen(true); };

  const filteredList = list.filter((p) => {
    const matchesSearch = p.nome.toLowerCase().includes(searchQuery.toLowerCase()) || 
      (p.fornecedor && p.fornecedor.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesCategory =
      selectedCategoryFilter === "all" ||
      (selectedCategoryFilter === "none" && !p.categoria_id) ||
      p.categoria_id === selectedCategoryFilter;
    return matchesSearch && matchesCategory;
  });

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
          <div className="flex items-center gap-2">
            <Button 
              onClick={openReportModal} 
              variant="outline" 
              className="flex items-center gap-1.5 h-10 font-bold border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-900/60"
            >
              <Printer className="w-4 h-4" /> Emitir PDF
            </Button>
            <Button onClick={() => { setForm(blank); setOpen(true); }} className="bg-[#84A59D] hover:bg-[#6F9189] text-white flex items-center gap-1.5 h-10 font-bold shadow-sm">
              <Plus className="w-4 h-4" /> Novo produto
            </Button>
          </div>
        } 
      />

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-2xl w-full p-0 gap-0 flex flex-col overflow-hidden bg-white dark:bg-zinc-950 shadow-2xl rounded-2xl border-0" style={{ maxHeight: "90vh" }}>
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
                      <Select
                        value={form.categoria_id || ""}
                        onValueChange={(val) => {
                          const cat = categorias.find(c => c.id === val);
                          setForm({
                            ...form,
                            categoria_id: val,
                            categoria: cat ? cat.nome : ""
                          });
                        }}
                      >
                        <SelectTrigger className="bg-transparent">
                          <SelectValue placeholder="Selecione a categoria *" />
                        </SelectTrigger>
                        <SelectContent>
                          {categorias.filter(c => c.tipo === "produto" || c.tipo === "ambos").map(c => (
                            <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
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
                  </div>
                  <div>
                    <Label className="text-xs font-semibold text-zinc-600 dark:text-zinc-400">Preço de Venda (R$) *</Label>
                    <Input type="number" step="0.01" value={form.preco_venda} onChange={(e) => setForm({ ...form, preco_venda: e.target.value })} placeholder="0,00" className="mt-1 font-mono font-bold text-[#3A4F4A] dark:text-[#EAF0EE]" />
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
          <div className="px-6 py-4 border-t border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/20 shrink-0 flex gap-2 justify-end">
            <Button type="button" variant="outline" className="border-zinc-300 hover:bg-zinc-100 dark:border-zinc-800 dark:hover:bg-zinc-900" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={save} className="bg-[#84A59D] hover:bg-[#6F9189] text-white shadow-xs font-semibold px-6">
              Salvar Produto
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <div className="mb-6 flex flex-col md:flex-row md:items-end gap-4 max-w-4xl">
        <div className="flex-1">
          <Label className="text-xs text-zinc-500 mb-1 block">Pesquisar produto</Label>
          <Input
            placeholder="Pesquisar por nome ou fornecedor..."
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
              {categorias.filter(c => c.tipo === "produto" || c.tipo === "ambos").map(c => (
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

      {filteredList.length === 0 ? (
        <EmptyState
          icon={Package}
          title={searchQuery || selectedCategoryFilter !== "all" ? "Nenhum produto encontrado" : "Nenhum produto"}
          hint={searchQuery || selectedCategoryFilter !== "all" ? "Tente ajustar seus filtros de busca." : "Adicione produtos para controlar seu estoque."}
        />
      ) : (
        <div className="bg-white border border-zinc-200 rounded-xl overflow-x-auto shadow-sm">
          <table className="w-full text-sm">
            <thead className="bg-zinc-50 text-xs uppercase tracking-wider text-zinc-500">
              <tr>
                <th className="px-4 py-3 text-left font-semibold">Produto</th>
                <th className="px-4 py-3 text-left font-semibold">Categoria</th>
                <th className="px-4 py-3 text-right font-semibold">Estoque</th>
                <th className="px-4 py-3 text-right font-semibold">Preço</th>
                <th className="px-4 py-3 text-center font-semibold">Comissão</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {filteredList.map((p) => {
                const baixo = p.quantidade_estoque <= p.estoque_minimo;
                return (
                  <tr key={p.id} className="hover:bg-zinc-50/60 transition-colors">
                    <td className="px-4 py-3 font-medium">{p.nome}</td>
                    <td className="px-4 py-3 text-zinc-600">{p.categoria || "-"}</td>
                    <td className="px-4 py-3 text-right">
                      <span className={`inline-flex items-center gap-1 ${baixo ? "text-amber-700 font-bold" : "text-zinc-700"}`}>
                        {baixo && <AlertTriangle className="w-3 h-3" />}
                        {p.quantidade_estoque} {p.unidade_medida}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-medium">{fmtBRL(p.preco_venda)}</td>
                    <td className="px-4 py-3 text-center">
                      {p.comissao > 0 ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                          {p.comissao}%
                        </span>
                      ) : (
                        <span className="text-zinc-400">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-1">
                        <Button size="sm" variant="ghost" onClick={() => edit(p)}><Edit2 className="w-4 h-4" /></Button>
                        <Button size="sm" variant="ghost" onClick={() => del(p.id)}><Trash2 className="w-4 h-4 text-rose-500" /></Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Dialog de confirmação de exclusão */}
      <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Confirmar exclusão</DialogTitle>
          </DialogHeader>
          <div className="py-4 text-sm text-zinc-600 dark:text-zinc-400">
            Tem certeza que deseja excluir este produto? Esta ação pode ser desfeita a qualquer momento a partir da tela de "Excluídos".
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDeleteConfirmOpen(false)}>Cancelar</Button>
            <Button onClick={confirmDelete} className="bg-rose-500 hover:bg-rose-600 text-white">Excluir</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* Modal de Filtros para Emissão do Relatório em PDF */}
      <Dialog open={reportOpen} onOpenChange={setReportOpen}>
        <DialogContent className="max-w-md bg-white dark:bg-zinc-950 rounded-2xl border-0 shadow-2xl">
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
          
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setReportOpen(false)} className="w-full sm:w-auto h-10 font-semibold border-zinc-300 dark:border-zinc-800">
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
        modulo="produto" 
        tituloModulo="Produtos" 
        onRestoreSuccess={load}
      />
    </div>
  );
}
