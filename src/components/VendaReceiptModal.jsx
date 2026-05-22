import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Printer, X, Download, Receipt, Calendar, User, ShoppingBag, CreditCard, CheckCircle2, Clock } from "lucide-react";
import http from "../api";

const fmtBRL = (n) => (n || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const fmtDT = (s) => new Date(s).toLocaleString("pt-BR");
import { toast } from "sonner";

export default function VendaReceiptModal({ open, onOpenChange, vendaId }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open && vendaId) {
      loadVenda(vendaId);
    } else {
      setData(null);
    }
  }, [open, vendaId]);

  const loadVenda = async (id) => {
    setLoading(true);
    try {
      const res = await http.get(`/vendas-diretas/${id}`);
      setData(res.data);
    } catch (e) {
      toast.error("Erro ao carregar detalhes da venda.");
      onOpenChange(false);
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (!open) return null;

  const itens = data?.itens || [];
  if (data && itens.length === 0 && data.produto_id) {
    // Retrocompatibilidade
    itens.push({
      produto_nome: data.produto_nome,
      quantidade: data.quantidade,
      preco_unitario: data.valor_total / data.quantidade,
      subtotal: data.valor_total
    });
  }

  const subtotalItens = itens.reduce((acc, i) => acc + Number(i.subtotal), 0);
  const desconto = Math.max(0, subtotalItens - (data?.valor_total || 0));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl w-full p-0 gap-0 overflow-hidden bg-white print:shadow-none print:max-w-none print:w-full print:border-none">
        {/* Helper print styles global injection for this modal */}
        <style dangerouslySetInnerHTML={{__html: `
          @media print {
            /* Hide the main application root and overlay backdrops */
            #root,
            .no-print,
            div[class*="bg-black"],
            div[role="dialog"] > button {
              display: none !important;
            }

            /* Reset fixed dialog centering for standard page rendering */
            div[role="dialog"] {
              position: absolute !important;
              left: 0 !important;
              top: 0 !important;
              transform: none !important;
              width: 100% !important;
              max-width: 100% !important;
              border: none !important;
              box-shadow: none !important;
              background: white !important;
              padding: 0 !important;
              margin: 0 !important;
            }

            body {
              background: white !important;
              color: black !important;
            }

            .receipt-print-area {
              width: 100% !important;
              padding: 0 !important;
              margin: 0 !important;
              box-shadow: none !important;
              border: none !important;
              background: white !important;
            }

            @page {
              margin: 1.5cm;
              size: auto;
            }
          }
        `}} />

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
             <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#84A59D]" />
             <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Carregando recibo...</p>
          </div>
        ) : data ? (
          <div className="receipt-print-area flex flex-col h-full bg-white print:bg-white print:p-8">
            {/* Header / Actions (no-print) */}
            <div className="flex items-center justify-between pl-6 pr-16 py-4 border-b border-zinc-100 bg-zinc-50/50 no-print">
              <DialogTitle className="text-sm font-bold flex items-center gap-2 text-zinc-800">
                <Receipt className="w-4 h-4 text-zinc-500" /> Detalhes da Venda
              </DialogTitle>
              <div className="flex items-center gap-2">
                <button 
                  onClick={handlePrint} 
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-zinc-200 rounded-lg hover:bg-zinc-50 text-zinc-600 transition-colors font-semibold text-xs shadow-xs" 
                  title="Imprimir Recibo"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Imprimir</span>
                </button>
              </div>
            </div>

            {/* Content Body */}
            <div className="p-6 overflow-y-auto max-h-[80vh] print:max-h-none print:overflow-visible text-zinc-800 space-y-6">
              
              {/* Receipt Header */}
              <div className="text-center space-y-2 border-b border-dashed border-zinc-300 pb-6 print:border-zinc-800">
                <div className="inline-flex items-center justify-center w-12 h-12 bg-zinc-100 print:bg-transparent print:border print:border-zinc-800 rounded-full mb-2">
                  <ShoppingBag className="w-6 h-6 text-[#3A4F4A] print:text-black" />
                </div>
                <h2 className="text-2xl font-black font-display text-zinc-900 leading-none">
                  Venda #{String(data.numero_venda).padStart(6, '0')} | V
                </h2>
                <div className="flex items-center justify-center gap-1.5 text-xs text-zinc-500 font-medium print:text-zinc-800">
                  <Calendar className="w-3.5 h-3.5" />
                  {fmtDT(data.data_venda)}
                </div>
                <div className="mt-4 flex justify-center print:hidden">
                  <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${data.status === 'pago' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                    {data.status === 'pago' ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Clock className="w-3.5 h-3.5" />}
                    {data.status === 'pago' ? 'Pago' : 'Pendente'}
                  </span>
                </div>
                {/* Print Status Label */}
                <div className="hidden print:flex justify-center mt-2 font-bold text-sm uppercase">
                  STATUS: {data.status === 'pago' ? 'PAGO' : 'PENDENTE'}
                </div>
              </div>

              {/* People Info */}
              <div className="grid grid-cols-2 gap-4 text-sm bg-zinc-50 rounded-xl p-4 border border-zinc-100 print:border-zinc-800 print:bg-transparent">
                <div>
                  <span className="text-[10px] uppercase font-bold text-zinc-400 block mb-1 print:text-zinc-600">Vendedor</span>
                  <div className="flex items-center gap-1.5 font-medium text-zinc-700 print:text-black">
                    <User className="w-3.5 h-3.5 text-zinc-400 print:hidden" />
                    {data.colaborador_nome || '—'}
                  </div>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-zinc-400 block mb-1 print:text-zinc-600">Cliente</span>
                  <div className="flex items-center gap-1.5 font-medium text-zinc-700 print:text-black">
                    <User className="w-3.5 h-3.5 text-zinc-400 print:hidden" />
                    {data.cliente_nome || 'Consumidor Final'}
                  </div>
                </div>
              </div>

              {/* Items List */}
              <div className="space-y-3">
                <h3 className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider print:text-zinc-600">Produtos</h3>
                <div className="space-y-3 border-b border-dashed border-zinc-300 pb-4 print:border-zinc-800">
                  {itens.map((item, idx) => (
                    <div key={idx} className="flex justify-between items-start gap-4 text-sm">
                      <div className="flex-1">
                        <p className="font-bold text-zinc-800 print:text-black leading-snug">{item.produto_nome}</p>
                        <p className="text-xs text-zinc-500 font-medium print:text-zinc-700">{item.quantidade}x {fmtBRL(item.preco_unitario || 0)}</p>
                      </div>
                      <div className="font-bold font-mono text-zinc-800 print:text-black">
                        {fmtBRL(item.subtotal)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Totals */}
              <div className="space-y-2 border-b border-dashed border-zinc-300 pb-4 print:border-zinc-800">
                <div className="flex justify-between text-sm text-zinc-500 print:text-zinc-700">
                  <span>Subtotal Itens</span>
                  <span>{fmtBRL(subtotalItens)}</span>
                </div>
                {desconto > 0.01 && (
                  <div className="flex justify-between text-sm text-emerald-600 font-medium print:text-black">
                    <span>Descontos</span>
                    <span>-{fmtBRL(desconto)}</span>
                  </div>
                )}
                <div className="flex justify-between text-lg font-black text-[#3A4F4A] pt-2 print:text-black">
                  <span>Total</span>
                  <span>{fmtBRL(data.valor_total)}</span>
                </div>
              </div>

              {/* Payments */}
              <div className="space-y-3">
                <h3 className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider print:text-zinc-600">Pagamentos Vinculados</h3>
                {data.pagamentos && data.pagamentos.length > 0 ? (
                  <div className="space-y-2">
                    {data.pagamentos.map((p, idx) => (
                      <div key={idx} className="flex justify-between text-sm items-center bg-zinc-50 rounded-lg p-2.5 border border-zinc-100 print:border-none print:bg-transparent print:p-0">
                        <div className="flex flex-col">
                          <span className="font-bold text-zinc-700 capitalize flex items-center gap-1.5 print:text-black">
                            <CreditCard className="w-3.5 h-3.5 text-zinc-400 print:hidden" />
                            {p.forma_pagamento}
                          </span>
                          {p.observacao && <span className="text-[10px] text-zinc-500 mt-0.5 print:text-zinc-700">{p.observacao}</span>}
                        </div>
                        <span className="font-mono font-bold text-zinc-800 print:text-black">{fmtBRL(p.valor)}</span>
                      </div>
                    ))}
                    <div className="flex justify-between text-sm font-bold text-zinc-600 pt-2 px-1 border-t border-zinc-100 mt-2 print:text-black print:border-zinc-800">
                      <span>Total Pago</span>
                      <span className={data.total_pago >= data.valor_total ? 'text-emerald-600 print:text-black' : 'text-amber-600 print:text-black'}>
                        {fmtBRL(data.total_pago)}
                      </span>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-zinc-500 italic print:text-zinc-700">Nenhum pagamento registrado.</p>
                )}
              </div>

              {/* Print Footer */}
              <div className="text-center text-[10px] text-zinc-400 font-medium pt-4 pb-2 print:text-zinc-600 print:pt-8">
                <p>Obrigado pela preferência!</p>
                <p>Documento sem valor fiscal.</p>
              </div>

            </div>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
