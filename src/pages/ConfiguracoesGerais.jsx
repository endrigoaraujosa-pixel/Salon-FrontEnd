import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import http from "../api";
import { PageHeader } from "../components/Page";
import { Button } from "../components/ui/button";
import { Card } from "../components/ui/card";
import { Label } from "../components/ui/label";
import { Switch } from "../components/ui/switch";
import { ArrowLeft, Save, Sliders, AlertCircle, ShieldAlert, Package, Users } from "lucide-react";
import { toast } from "sonner";

export default function ConfiguracoesGerais() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [bloquearValorMenor, setBloquearValorMenor] = useState(false);
  const [permitirEstoqueNegativo, setPermitirEstoqueNegativo] = useState(false);
  const [permitirClienteDuplicado, setPermitirClienteDuplicado] = useState(false);
  const [trabalharCreditoCliente, setTrabalharCreditoCliente] = useState(false);
  const [descontarTaxaCartaoComissao, setDescontarTaxaCartaoComissao] = useState(false);
  const [permitirAlterarPrecoProdutoVenda, setPermitirAlterarPrecoProdutoVenda] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const response = await http.get("/configuracoes/sistema");
      if (response.data) {
        setBloquearValorMenor(!!response.data.bloquear_valor_agendamento_menor);
        setPermitirEstoqueNegativo(!!response.data.permitir_estoque_negativo);
        setPermitirClienteDuplicado(!!response.data.permitir_cliente_duplicado);
        setTrabalharCreditoCliente(!!response.data.trabalhar_credito_cliente);
        setDescontarTaxaCartaoComissao(!!response.data.descontar_taxa_cartao_comissao);
        setPermitirAlterarPrecoProdutoVenda(!!response.data.permitir_alterar_preco_produto_venda);
      }
    } catch (e) {
      toast.error("Erro ao carregar configurações do sistema");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await http.post("/configuracoes/sistema", {
        bloquear_valor_agendamento_menor: bloquearValorMenor,
        permitir_estoque_negativo: permitirEstoqueNegativo,
        permitir_cliente_duplicado: permitirClienteDuplicado,
        trabalhar_credito_cliente: trabalharCreditoCliente,
        descontar_taxa_cartao_comissao: descontarTaxaCartaoComissao,
        permitir_alterar_preco_produto_venda: permitirAlterarPrecoProdutoVenda
      });
      toast.success("Configurações salvas com sucesso!");
    } catch (e) {
      toast.error(e.response?.data?.detail || "Erro ao salvar configurações");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8 text-zinc-400 text-center font-semibold animate-pulse">
        Carregando configurações...
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 fade-in min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-800 dark:text-zinc-200">
      
      {/* Back Button */}
      <Button 
        variant="ghost" 
        onClick={() => navigate("/configuracoes")} 
        className="mb-4 text-zinc-500 hover:text-[#84A59D] dark:text-zinc-400 dark:hover:text-zinc-200"
      >
        <ArrowLeft className="w-4 h-4 mr-1" /> Voltar para Configurações
      </Button>

      <PageHeader 
        overline="Configurações" 
        title="Configurações Gerais do Sistema" 
      />

      <div className="space-y-6 max-w-4xl mt-6">
        
        {/* Banner Informação */}
        <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900/60 rounded-xl p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-blue-700 dark:text-blue-450 leading-relaxed">
            <strong>Regras do Sistema:</strong> Ative as diretrizes gerais para padronizar o funcionamento dos agendamentos e cobranças em sua empresa.
          </div>
        </div>

        {/* Main Restriction Setting Card */}
        <Card className="p-6 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-sm">
          <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2 mb-5">
            <Sliders className="w-5 h-5 text-[#84A59D]" />
            <span>Regras de Negócio e Agendamentos</span>
          </h3>

          <div className="flex items-start justify-between gap-4 p-4 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-850">
            <div className="space-y-1 flex-1">
              <Label 
                htmlFor="bloquear-valor" 
                className="text-sm font-bold text-zinc-900 dark:text-zinc-100 cursor-pointer"
              >
                Bloquear valor cobrado abaixo do valor do serviço
              </Label>
              <p className="text-xs text-zinc-550 dark:text-zinc-400 leading-relaxed max-w-xl">
                Quando ativado, impede que qualquer agendamento seja salvo (criado ou editado) com um valor cobrado inferior ao valor original do serviço cadastrado. Também bloqueia a aplicação de descontos que resultem em um valor abaixo do valor do serviço.
              </p>
            </div>
            <div className="pt-1">
              <Switch 
                id="bloquear-valor"
                checked={bloquearValorMenor}
                onCheckedChange={setBloquearValorMenor}
              />
            </div>
          </div>
        </Card>

        {/* Controle de Estoque e Venda de Produtos Card */}
        <Card className="p-6 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-sm space-y-4">
          <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2 mb-2">
            <Package className="w-5 h-5 text-[#84A59D]" />
            <span>Venda de Produtos e Estoque</span>
          </h3>

          <div className="flex items-start justify-between gap-4 p-4 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-850">
            <div className="space-y-1 flex-1">
              <Label 
                htmlFor="permitir-alterar-preco-produto" 
                className="text-sm font-bold text-zinc-900 dark:text-zinc-100 cursor-pointer"
              >
                Permitir alteração de valor do produto na venda
              </Label>
              <p className="text-xs text-zinc-550 dark:text-zinc-400 leading-relaxed max-w-xl">
                Quando ativado, os usuários do sistema poderão ajustar o valor unitário do produto para um preço maior ou menor que o valor cadastrado (gerando acréscimo ou desconto) durante a realização da venda no balcão. Quando desativado, o valor do produto fica fixado ao preço cadastrado.
              </p>
            </div>
            <div className="pt-1">
              <Switch 
                id="permitir-alterar-preco-produto"
                checked={permitirAlterarPrecoProdutoVenda}
                onCheckedChange={setPermitirAlterarPrecoProdutoVenda}
              />
            </div>
          </div>

          <div className="flex items-start justify-between gap-4 p-4 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-850">
            <div className="space-y-1 flex-1">
              <Label 
                htmlFor="permitir-estoque-negativo" 
                className="text-sm font-bold text-zinc-900 dark:text-zinc-100 cursor-pointer"
              >
                Permitir estoque negativo
              </Label>
              <p className="text-xs text-zinc-550 dark:text-zinc-400 leading-relaxed max-w-xl">
                Quando ativado, o sistema permite concluir a venda de produtos e o lançamento de insumos em atendimentos mesmo se a quantidade em estoque for insuficiente. O saldo do produto ficará negativo após a movimentação.
              </p>
            </div>
            <div className="pt-1">
              <Switch 
                id="permitir-estoque-negativo"
                checked={permitirEstoqueNegativo}
                onCheckedChange={setPermitirEstoqueNegativo}
              />
            </div>
          </div>
        </Card>

        {/* Cadastro de Clientes Card */}
        <Card className="p-6 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-sm">
          <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2 mb-5">
            <Users className="w-5 h-5 text-[#84A59D]" />
            <span>Cadastro de Clientes</span>
          </h3>

          <div className="flex items-start justify-between gap-4 p-4 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-850">
            <div className="space-y-1 flex-1">
              <Label 
                htmlFor="permitir-cliente-duplicado" 
                className="text-sm font-bold text-zinc-900 dark:text-zinc-100 cursor-pointer"
              >
                Permitir cadastro/edição de clientes com nome ou telefone duplicado
              </Label>
              <p className="text-xs text-zinc-550 dark:text-zinc-400 leading-relaxed max-w-xl">
                Quando ativado, o sistema permite salvar o cadastro ou a edição de clientes mesmo que já exista outro cliente com o mesmo nome ou telefone (exibindo avisos de confirmação antes de gravar). Quando desativado, o sistema bloqueia qualquer cadastro com nome ou telefone duplicado.
              </p>
            </div>
            <div className="pt-1">
              <Switch 
                id="permitir-cliente-duplicado"
                checked={permitirClienteDuplicado}
                onCheckedChange={setPermitirClienteDuplicado}
              />
            </div>
          </div>
        </Card>

        {/* Crédito de Clientes Card */}
        <Card className="p-6 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-sm">
          <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2 mb-5">
            <Sliders className="w-5 h-5 text-[#84A59D]" />
            <span>Crédito de Clientes</span>
          </h3>

          <div className="flex items-start justify-between gap-4 p-4 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-850">
            <div className="space-y-1 flex-1">
              <Label 
                htmlFor="trabalhar-credito" 
                className="text-sm font-bold text-zinc-900 dark:text-zinc-100 cursor-pointer"
              >
                Trabalhar com Crédito de Clientes
              </Label>
              <p className="text-xs text-zinc-550 dark:text-zinc-400 leading-relaxed max-w-xl">
                Quando configurado como "Sim" (Ativado), habilita a rotina de créditos de clientes no sistema, permitindo que os clientes mantenham um saldo que pode ser carregado manualmente ou gerado de excesso de pagamentos e ser usado posteriormente. Quando desativado, nenhuma opção ou informação de crédito será exibida no sistema.
              </p>
            </div>
            <div className="pt-1">
              <Switch 
                id="trabalhar-credito"
                checked={trabalharCreditoCliente}
                onCheckedChange={setTrabalharCreditoCliente}
              />
            </div>
          </div>
        </Card>

        {/* Dedução de Taxas nas Comissões Card */}
        <Card className="p-6 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-sm">
          <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2 mb-5">
            <Sliders className="w-5 h-5 text-[#84A59D]" />
            <span>Comissões e Taxas de Cartão</span>
          </h3>

          <div className="flex items-start justify-between gap-4 p-4 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-850">
            <div className="space-y-1 flex-1">
              <Label 
                htmlFor="descontar-taxa-cartao" 
                className="text-sm font-bold text-zinc-900 dark:text-zinc-100 cursor-pointer"
              >
                Descontar taxa administrativa do cartão da comissão dos profissionais
              </Label>
              <p className="text-xs text-zinc-550 dark:text-zinc-400 leading-relaxed max-w-xl">
                Quando ativado, a taxa administrativa cobrada pelas adquirentes de cartão de crédito/débito será rateada proporcionalmente e deduzida da base de cálculo de comissão do profissional que executou os serviços pagos via cartão.
              </p>
            </div>
            <div className="pt-1">
              <Switch 
                id="descontar-taxa-cartao"
                checked={descontarTaxaCartaoComissao}
                onCheckedChange={setDescontarTaxaCartaoComissao}
              />
            </div>
          </div>
        </Card>

        {/* Warning and informational Banner */}
        <div className="p-4 rounded-xl bg-zinc-100/50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 text-zinc-650 dark:text-zinc-400 text-xs flex items-start gap-3">
          <AlertCircle className="w-4 h-4 text-zinc-500 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <span className="font-semibold block">Nota sobre Permissões</span>
            <p className="leading-relaxed">
              Esta configuração se aplica globalmente a todos os usuários da empresa no momento do agendamento. Certifique-se de alinhar as diretrizes de precificação com a equipe antes de ativar esta regra.
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end gap-3 pt-4 border-t border-zinc-200 dark:border-zinc-900">
          <Button variant="outline" onClick={loadData} className="h-10 text-xs rounded-lg px-4">
            Cancelar
          </Button>
          <Button 
            onClick={handleSave} 
            disabled={saving}
            className="bg-[#84A59D] hover:bg-[#6F9189] dark:bg-[#84A59D] dark:hover:bg-[#6F9189] text-white h-10 text-xs rounded-lg font-bold flex items-center gap-1.5 px-5 shadow-sm"
          >
            <Save className="w-4 h-4" />
            <span>{saving ? "Salvando..." : "Salvar Configurações"}</span>
          </Button>
        </div>

      </div>

    </div>
  );
}
