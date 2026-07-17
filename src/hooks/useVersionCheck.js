import { useEffect, useState, useCallback, useRef } from "react";

/**
 * Hook para verificação de novas versões da aplicação.
 *
 * Verifica o /version.json nos seguintes momentos:
 *   - Na montagem do componente (abertura da aplicação)
 *   - Quando a aba volta a ficar ativa (visibilitychange)
 *   - Quando checkNow() é chamado manualmente (ex: após login)
 *
 * Não faz polling periódico — verificações são event-driven.
 *
 * @returns {{ updateAvailable: boolean, newVersion: object|null, applyUpdate: () => void, checkNow: () => Promise<void> }}
 */
export function useVersionCheck() {
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [newVersion, setNewVersion] = useState(null);
  const isCheckingRef = useRef(false);

  const currentBuild = typeof __APP_VERSION__ !== "undefined" ? __APP_VERSION__.build : null;

  const checkVersion = useCallback(async () => {
    // Evita verificações simultâneas
    if (isCheckingRef.current) return;
    // Se não temos a versão do build atual (dev mode), não verificar
    if (!currentBuild || currentBuild === "dev") return;

    isCheckingRef.current = true;

    try {
      const response = await fetch("/version.json", {
        cache: "no-store",
        headers: { "pragma": "no-cache", "cache-control": "no-cache" },
      });

      if (!response.ok) return;

      const serverVersion = await response.json();

      if (serverVersion.build && serverVersion.build !== currentBuild) {
        setUpdateAvailable(true);
        setNewVersion(serverVersion);
      }
    } catch {
      // Silencia erros de rede — não deve impactar a experiência
    } finally {
      isCheckingRef.current = false;
    }
  }, [currentBuild]);

  const applyUpdate = useCallback(() => {
    window.location.reload();
  }, []);

  // Verificar na montagem (abertura da aplicação)
  useEffect(() => {
    checkVersion();
  }, [checkVersion]);

  // Verificar quando a aba volta a ficar ativa
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        checkVersion();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [checkVersion]);

  return {
    /** true quando uma nova versão foi detectada no servidor */
    updateAvailable,
    /** Objeto com { version, build, commit, date } da nova versão disponível */
    newVersion,
    /** Chama window.location.reload() para aplicar a atualização */
    applyUpdate,
    /** Força uma verificação manual (ex: chamar após login) */
    checkNow: checkVersion,
  };
}
