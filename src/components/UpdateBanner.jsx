import React, { useState } from "react";
import { useVersionCheck } from "@/hooks/useVersionCheck";
import { RefreshCw, X } from "lucide-react";

/**
 * Banner não-intrusivo que aparece quando uma nova versão da aplicação está disponível.
 *
 * - Exibe mensagem e botão "Atualizar agora"
 * - Pode ser dispensado (reaparece no próximo visibilitychange)
 * - Não bloqueia nenhuma interação do usuário
 */
export default function UpdateBanner() {
  const { updateAvailable, newVersion, applyUpdate } = useVersionCheck();
  const [dismissed, setDismissed] = useState(false);

  if (!updateAvailable || dismissed) return null;

  return (
    <div
      className="fixed top-0 left-0 right-0 z-[9999] flex items-center justify-center gap-3 px-4 py-2.5 text-sm font-medium shadow-lg"
      style={{
        background: "linear-gradient(135deg, #3A4F4A 0%, #84A59D 100%)",
        color: "#FFFFFF",
      }}
      role="alert"
      data-testid="update-banner"
    >
      <RefreshCw className="w-4 h-4 animate-spin shrink-0" style={{ animationDuration: "3s" }} />

      <span className="truncate">
        Nova versão disponível
        {newVersion?.version ? ` (v${newVersion.version})` : ""}
      </span>

      <button
        onClick={applyUpdate}
        className="shrink-0 px-3 py-1 rounded-md text-xs font-semibold transition-colors"
        style={{
          background: "rgba(255,255,255,0.2)",
          backdropFilter: "blur(4px)",
        }}
        onMouseEnter={(e) => { e.target.style.background = "rgba(255,255,255,0.35)"; }}
        onMouseLeave={(e) => { e.target.style.background = "rgba(255,255,255,0.2)"; }}
        data-testid="update-btn"
      >
        Atualizar agora
      </button>

      <button
        onClick={() => setDismissed(true)}
        className="shrink-0 p-1 rounded-md transition-colors"
        style={{ background: "transparent" }}
        onMouseEnter={(e) => { e.target.style.background = "rgba(255,255,255,0.15)"; }}
        onMouseLeave={(e) => { e.target.style.background = "transparent"; }}
        title="Dispensar"
        data-testid="update-dismiss-btn"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
