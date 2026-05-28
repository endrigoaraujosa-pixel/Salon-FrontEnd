import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import http from "../api";
import { PageHeader } from "../components/Page";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Card } from "../components/ui/card";
import { ArrowLeft, Building, Save, MapPin, Mail, Phone, AlertCircle } from "lucide-react";
import { toast } from "sonner";

export default function ConfiguracoesEmpresa() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    razao_social: "",
    nome_fantasia: "",
    cnpj: "",
    inscricao_estadual: "",
    email: "",
    telefone: "",
    endereco_cep: "",
    endereco_logradouro: "",
    endereco_numero: "",
    endereco_bairro: "",
    endereco_cidade: "",
    endereco_uf: ""
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const response = await http.get("/configuracoes/empresa");
      if (response.data) {
        setForm({
          razao_social: response.data.razao_social || "",
          nome_fantasia: response.data.nome_fantasia || "",
          cnpj: response.data.cnpj || "",
          inscricao_estadual: response.data.inscricao_estadual || "",
          email: response.data.email || "",
          telefone: response.data.telefone || "",
          endereco_cep: response.data.endereco_cep || "",
          endereco_logradouro: response.data.endereco_logradouro || "",
          endereco_numero: response.data.endereco_numero || "",
          endereco_bairro: response.data.endereco_bairro || "",
          endereco_cidade: response.data.endereco_cidade || "",
          endereco_uf: response.data.endereco_uf || ""
        });
      }
    } catch (e) {
      toast.error("Erro ao carregar dados da empresa");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const saveEmpresa = async () => {
    setSaving(true);
    try {
      await http.post("/configuracoes/empresa", form);
      toast.success("Dados da empresa atualizados com sucesso!");
      // Dispara um evento personalizado para que outros componentes (como o Layout) saibam do update
      window.dispatchEvent(new Event("empresa_updated"));
    } catch (e) {
      toast.error(e.response?.data?.detail || "Erro ao salvar dados da empresa");
    } finally {
      setSaving(false);
    }
  };

  const handleCEPChange = async (cep) => {
    const cleanCEP = cep.replace(/\D/g, "");
    setForm(prev => ({ ...prev, endereco_cep: cep }));

    if (cleanCEP.length === 8) {
      try {
        const res = await fetch(`https://viacep.com.br/ws/${cleanCEP}/json/`);
        const data = await res.json();
        if (!data.erro) {
          setForm(prev => ({
            ...prev,
            endereco_logradouro: data.logradouro || "",
            endereco_bairro: data.bairro || "",
            endereco_cidade: data.localidade || "",
            endereco_uf: data.uf || ""
          }));
          toast.success("Endereço preenchido automaticamente pelo CEP!");
        }
      } catch (err) {
        console.error("Erro ao buscar CEP:", err);
      }
    }
  };

  if (loading) return <div className="p-8 text-zinc-400 text-center font-semibold">Carregando configurações...</div>;

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
        title="Dados da Empresa" 
      />

      <div className="space-y-6 max-w-4xl">
        <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900/60 rounded-xl p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-blue-700 dark:text-blue-450 leading-relaxed">
            <strong>Customização Visual:</strong> O <strong>Nome Fantasia</strong> cadastrado nesta tela será exibido de forma proeminente na barra superior e em telas principais do sistema para identificar a sua marca.
          </div>
        </div>

        {/* Form Grid */}
        <div className="grid gap-6">
          
          {/* Card 1: Identificação */}
          <Card className="p-6 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl">
            <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2 mb-5">
              <Building className="w-5 h-5 text-[#84A59D]" />
              <span>Identificação da Empresa</span>
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="razao_social">Razão Social</Label>
                <Input 
                  id="razao_social"
                  value={form.razao_social} 
                  onChange={(e) => setForm({ ...form, razao_social: e.target.value })}
                  placeholder="Nome oficial de registro"
                  className="bg-zinc-50 border-zinc-200 focus:bg-white dark:bg-zinc-950 dark:border-zinc-850 text-sm"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="nome_fantasia">Nome Fantasia *</Label>
                <Input 
                  id="nome_fantasia"
                  value={form.nome_fantasia} 
                  onChange={(e) => setForm({ ...form, nome_fantasia: e.target.value })}
                  placeholder="Nome comercial da sua marca"
                  className="bg-zinc-50 border-zinc-200 focus:bg-white dark:bg-zinc-950 dark:border-zinc-850 text-sm font-semibold"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="cnpj">CNPJ</Label>
                <Input 
                  id="cnpj"
                  value={form.cnpj} 
                  onChange={(e) => setForm({ ...form, cnpj: e.target.value })}
                  placeholder="00.000.000/0001-00"
                  className="bg-zinc-50 border-zinc-200 focus:bg-white dark:bg-zinc-950 dark:border-zinc-850 text-sm"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="inscricao_estadual">Inscrição Estadual</Label>
                <Input 
                  id="inscricao_estadual"
                  value={form.inscricao_estadual} 
                  onChange={(e) => setForm({ ...form, inscricao_estadual: e.target.value })}
                  placeholder="Isento ou número do registro"
                  className="bg-zinc-50 border-zinc-200 focus:bg-white dark:bg-zinc-950 dark:border-zinc-850 text-sm"
                />
              </div>
            </div>
          </Card>

          {/* Card 2: Contatos */}
          <Card className="p-6 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl">
            <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2 mb-5">
              <Mail className="w-5 h-5 text-[#84A59D]" />
              <span>Contatos e Atendimento</span>
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="email">E-mail de Contato</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-2.5 h-4 w-4 text-zinc-400" />
                  <Input 
                    id="email"
                    type="email"
                    value={form.email} 
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    placeholder="contato@suaempresa.com"
                    className="pl-9 bg-zinc-50 border-zinc-200 focus:bg-white dark:bg-zinc-950 dark:border-zinc-850 text-sm"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="telefone">Telefone / WhatsApp</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-2.5 h-4 w-4 text-zinc-400" />
                  <Input 
                    id="telefone"
                    value={form.telefone} 
                    onChange={(e) => setForm({ ...form, telefone: e.target.value })}
                    placeholder="(00) 00000-0000"
                    className="pl-9 bg-zinc-50 border-zinc-200 focus:bg-white dark:bg-zinc-950 dark:border-zinc-850 text-sm"
                  />
                </div>
              </div>
            </div>
          </Card>

          {/* Card 3: Endereço */}
          <Card className="p-6 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl">
            <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2 mb-5">
              <MapPin className="w-5 h-5 text-[#84A59D]" />
              <span>Localização e Endereço</span>
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1.5 md:col-span-1">
                <Label htmlFor="endereco_cep">CEP</Label>
                <Input 
                  id="endereco_cep"
                  value={form.endereco_cep} 
                  onChange={(e) => handleCEPChange(e.target.value)}
                  placeholder="00000-000"
                  maxLength={9}
                  className="bg-zinc-50 border-zinc-200 focus:bg-white dark:bg-zinc-950 dark:border-zinc-850 text-sm font-medium"
                />
              </div>

              <div className="space-y-1.5 md:col-span-2">
                <Label htmlFor="endereco_logradouro">Rua / Logradouro</Label>
                <Input 
                  id="endereco_logradouro"
                  value={form.endereco_logradouro} 
                  onChange={(e) => setForm({ ...form, endereco_logradouro: e.target.value })}
                  placeholder="Av. Paulista, Rua..."
                  className="bg-zinc-50 border-zinc-200 focus:bg-white dark:bg-zinc-950 dark:border-zinc-850 text-sm"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="endereco_numero">Número</Label>
                <Input 
                  id="endereco_numero"
                  value={form.endereco_numero} 
                  onChange={(e) => setForm({ ...form, endereco_numero: e.target.value })}
                  placeholder="123, Bloco A..."
                  className="bg-zinc-50 border-zinc-200 focus:bg-white dark:bg-zinc-950 dark:border-zinc-850 text-sm"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="endereco_bairro">Bairro</Label>
                <Input 
                  id="endereco_bairro"
                  value={form.endereco_bairro} 
                  onChange={(e) => setForm({ ...form, endereco_bairro: e.target.value })}
                  placeholder="Bairro"
                  className="bg-zinc-50 border-zinc-200 focus:bg-white dark:bg-zinc-950 dark:border-zinc-850 text-sm"
                />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div className="space-y-1.5 col-span-2">
                  <Label htmlFor="endereco_cidade">Cidade</Label>
                  <Input 
                    id="endereco_cidade"
                    value={form.endereco_cidade} 
                    onChange={(e) => setForm({ ...form, endereco_cidade: e.target.value })}
                    placeholder="São Paulo"
                    className="bg-zinc-50 border-zinc-200 focus:bg-white dark:bg-zinc-950 dark:border-zinc-850 text-sm"
                  />
                </div>
                <div className="space-y-1.5 col-span-1">
                  <Label htmlFor="endereco_uf">UF</Label>
                  <Input 
                    id="endereco_uf"
                    value={form.endereco_uf} 
                    onChange={(e) => setForm({ ...form, endereco_uf: e.target.value.toUpperCase() })}
                    placeholder="SP"
                    maxLength={2}
                    className="bg-zinc-50 border-zinc-200 focus:bg-white dark:bg-zinc-950 dark:border-zinc-850 text-sm text-center"
                  />
                </div>
              </div>
            </div>
          </Card>

        </div>

        {/* Action Buttons */}
        <div className="flex justify-end gap-3 pt-4 border-t border-zinc-200 dark:border-zinc-900">
          <Button variant="outline" onClick={loadData} className="h-10 text-xs rounded-lg px-4">
            Cancelar
          </Button>
          <Button 
            onClick={saveEmpresa} 
            disabled={saving}
            className="bg-[#84A59D] hover:bg-[#6F9189] dark:bg-[#84A59D] dark:hover:bg-[#6F9189] text-white h-10 text-xs rounded-lg font-bold flex items-center gap-1.5 px-5 shadow-sm"
          >
            <Save className="w-4 h-4" />
            <span>{saving ? "Salvando..." : "Salvar Dados"}</span>
          </Button>
        </div>
      </div>
    </div>
  );
}
