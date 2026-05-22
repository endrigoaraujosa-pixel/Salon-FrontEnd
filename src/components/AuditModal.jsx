import React, { useState, useEffect } from "react";
import { Search, X, Trash2, Calendar, User, AlertCircle, RotateCcw } from "lucide-react";
import api from "../api";
import { toast } from "sonner";

export default function AuditModal({ isOpen, onClose, modulo, tituloModulo, onRestoreSuccess }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [records, setRecords] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [confirmRestore, setConfirmRestore] = useState(null); // id do registro a confirmar
  const [restoring, setRestoring] = useState(false);

  useEffect(() => {
    if (isOpen && modulo) {
      fetchDeletedRecords();
      setConfirmRestore(null);
    }
  }, [isOpen, modulo]);

  const fetchDeletedRecords = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.get(`/auditoria/deletados?modulo=${modulo}`);
      setRecords(response.data);
    } catch (err) {
      console.error("Erro ao carregar auditoria:", err);
      setError("Não foi possível carregar o histórico de exclusões.");
    } finally {
      setLoading(false);
    }
  };

  const handleRestore = async (id) => {
    setRestoring(true);
    try {
      await api.post("/auditoria/restaurar", { modulo, id });
      toast.success("Registro restaurado com sucesso!");
      setConfirmRestore(null);
      fetchDeletedRecords();
      if (onRestoreSuccess) {
        onRestoreSuccess();
      }
    } catch (err) {
      console.error("Erro ao restaurar registro:", err);
      const msg = err.response?.data?.detail || "Erro ao restaurar registro.";
      toast.error(msg);
      setConfirmRestore(null);
    } finally {
      setRestoring(false);
    }
  };

  if (!isOpen) return null;

  // Filter records based on search query
  const filteredRecords = records.filter(r => 
    r.descricao.toLowerCase().includes(searchQuery.toLowerCase()) ||
    r.deletado_por.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-zinc-950 w-full max-w-3xl rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-2xl flex flex-col max-h-[85vh] overflow-hidden">
        
        {/* Header */}
        <header className="p-5 border-b border-zinc-200 dark:border-zinc-800 flex justify-between items-center bg-zinc-50 dark:bg-zinc-950">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-rose-50 dark:bg-rose-950/30 text-rose-500 rounded-lg">
              <Trash2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-display font-semibold text-lg text-zinc-900 dark:text-zinc-50">
                Registros Excluídos
              </h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Módulo: {tituloModulo || modulo}
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-900 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </header>

        {/* Search Panel */}
        <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950">
          <div className="relative">
            <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Pesquisar por registro ou usuário..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent transition-all"
            />
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-4 bg-zinc-50/50 dark:bg-zinc-950/30">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <div className="w-8 h-8 border-4 border-rose-500 border-t-transparent rounded-full animate-spin"></div>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">Carregando histórico...</p>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-16 text-center text-rose-500">
              <AlertCircle className="w-8 h-8 mb-2" />
              <p className="font-semibold">{error}</p>
              <button 
                onClick={fetchDeletedRecords}
                className="mt-3 px-3 py-1.5 bg-rose-500 hover:bg-rose-600 text-white text-xs font-semibold rounded-lg transition-colors"
              >
                Tentar Novamente
              </button>
            </div>
          ) : filteredRecords.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center bg-white dark:bg-zinc-900/40 border border-dashed border-zinc-200 dark:border-zinc-800 rounded-xl p-6">
              <Trash2 className="w-8 h-8 text-zinc-300 dark:text-zinc-700 mb-3" />
              <h3 className="font-display font-medium text-zinc-700 dark:text-zinc-300">
                Nenhum registro excluído encontrado
              </h3>
              <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-1 max-w-sm">
                {searchQuery ? "Nenhum resultado corresponde à sua pesquisa." : `Não há registros excluídos no módulo de ${tituloModulo || modulo} no momento.`}
              </p>
            </div>
          ) : (
            <>
              {/* Desktop View (Table) */}
              <div className="hidden md:block overflow-hidden bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-850 rounded-xl">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-zinc-50 dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 text-zinc-500 dark:text-zinc-400 text-xs font-semibold uppercase">
                      <th className="px-4 py-3">Registro Excluído</th>
                      <th className="px-4 py-3">Data de Exclusão</th>
                      <th className="px-4 py-3">Responsável</th>
                      <th className="px-4 py-3 text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-200 dark:divide-zinc-850 text-sm">
                    {filteredRecords.map((record) => (
                      <tr key={record.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-900/30 text-zinc-700 dark:text-zinc-300 transition-colors">
                        <td className="px-4 py-3.5 font-medium">{record.descricao}</td>
                        <td className="px-4 py-3.5 text-zinc-500 dark:text-zinc-400">
                          {record.deletado_em ? new Date(record.deletado_em).toLocaleString('pt-BR') : "N/A"}
                        </td>
                        <td className="px-4 py-3.5">
                          <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded bg-zinc-100 dark:bg-zinc-900 text-xs font-medium text-zinc-600 dark:text-zinc-400">
                            <User className="w-3 h-3" />
                            {record.deletado_por}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 text-right">
                          {confirmRestore === record.id ? (
                            <div className="inline-flex items-center gap-1.5">
                              <span className="text-xs text-zinc-500 mr-1">Confirmar?</span>
                              <button
                                onClick={() => handleRestore(record.id)}
                                disabled={restoring}
                                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-white bg-emerald-500 hover:bg-emerald-600 rounded transition-colors disabled:opacity-50"
                              >
                                {restoring ? (
                                  <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                ) : (
                                  <RotateCcw className="w-3 h-3" />
                                )}
                                Sim
                              </button>
                              <button
                                onClick={() => setConfirmRestore(null)}
                                disabled={restoring}
                                className="inline-flex items-center px-2 py-1 text-xs font-semibold text-zinc-500 hover:text-zinc-700 border border-zinc-200 dark:border-zinc-700 rounded transition-colors"
                              >
                                Não
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => setConfirmRestore(record.id)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-emerald-600 hover:text-white hover:bg-emerald-500 border border-emerald-200 dark:border-emerald-800/40 dark:text-emerald-400 dark:hover:bg-emerald-600 rounded transition-colors"
                            >
                              <RotateCcw className="w-3 h-3" />
                              Restaurar
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile View (Card List) */}
              <div className="block md:hidden">
                <div className="flex flex-col gap-3">
                  {filteredRecords.map((record) => (
                    <div 
                      key={record.id} 
                      className="p-4 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl flex flex-col gap-2"
                    >
                      <div className="font-medium text-zinc-800 dark:text-zinc-200">
                        {record.descricao}
                      </div>
                      <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-zinc-500 dark:text-zinc-400 mt-1 border-t border-zinc-100 dark:border-zinc-800/80 pt-2">
                        <div className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5 text-zinc-400" />
                          {record.deletado_em ? new Date(record.deletado_em).toLocaleString('pt-BR') : "N/A"}
                        </div>
                        <div className="flex items-center gap-1">
                          <User className="w-3.5 h-3.5 text-zinc-400" />
                          {record.deletado_por}
                        </div>
                      </div>
                      <div className="flex justify-end border-t border-zinc-100 dark:border-zinc-800/80 pt-2 mt-1">
                        {confirmRestore === record.id ? (
                          <div className="inline-flex items-center gap-1.5">
                            <span className="text-xs text-zinc-500 mr-1">Confirmar?</span>
                            <button
                              onClick={() => handleRestore(record.id)}
                              disabled={restoring}
                              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-white bg-emerald-500 hover:bg-emerald-600 rounded transition-colors disabled:opacity-50"
                            >
                              {restoring ? (
                                <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                              ) : (
                                <RotateCcw className="w-3 h-3" />
                              )}
                              Sim
                            </button>
                            <button
                              onClick={() => setConfirmRestore(null)}
                              disabled={restoring}
                              className="inline-flex items-center px-2 py-1 text-xs font-semibold text-zinc-500 hover:text-zinc-700 border border-zinc-200 dark:border-zinc-700 rounded transition-colors"
                            >
                              Não
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setConfirmRestore(record.id)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-emerald-600 hover:text-white hover:bg-emerald-500 border border-emerald-200 dark:border-emerald-800/40 dark:text-emerald-400 dark:hover:bg-emerald-600 rounded transition-colors"
                          >
                            <RotateCcw className="w-3 h-3" />
                            Restaurar
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <footer className="p-4 border-t border-zinc-200 dark:border-zinc-800 flex justify-between items-center bg-zinc-50 dark:bg-zinc-950">
          <p className="text-xs text-zinc-400">
            {filteredRecords.length > 0 ? `${filteredRecords.length} registro(s) excluído(s)` : ""}
          </p>
          <button
            onClick={onClose}
            className="px-4 py-2 border border-zinc-200 dark:border-zinc-800 rounded-lg text-sm text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-900 font-semibold transition-colors"
          >
            Fechar
          </button>
        </footer>

      </div>
    </div>
  );
}

