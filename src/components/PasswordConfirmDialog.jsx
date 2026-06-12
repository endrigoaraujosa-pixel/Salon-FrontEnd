import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "./ui/dialog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { AlertCircle } from "lucide-react";
import { toast } from "./ui/sonner";

export default function PasswordConfirmDialog({ open, onOpenChange, onConfirm, title = "Confirmar ação", description = "Digite sua senha para continuar", requireCredentials = false }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (open) {
      setEmail("");
      setPassword("");
      setError("");
    }
  }, [open]);

  const handleSubmit = async () => {
    if (requireCredentials && !email.trim()) {
      setError("Usuário/E-mail obrigatório");
      return;
    }
    if (!password.trim()) {
      setError("Senha obrigatória");
      return;
    }
    setLoading(true);
    setError("");
    try {
      if (requireCredentials) {
        await onConfirm(email, password);
      } else {
        await onConfirm(password);
      }
      setEmail("");
      setPassword("");
      onOpenChange(false);
    } catch (err) {
      setError(err.message || "Erro ao confirmar");
      toast.error(err.message || "Erro ao confirmar");
    } finally {
      setLoading(false);
    }
  };

  const handleOpenChange = (newOpen) => {
    if (!newOpen) {
      setEmail("");
      setPassword("");
      setError("");
    }
    onOpenChange(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <p className="text-sm text-zinc-600">{description}</p>
          
          {requireCredentials && (
            <div>
              <Label htmlFor="confirm-action-email">Usuário (E-mail)</Label>
              <Input
                id="confirm-action-email"
                name="confirm-action-email"
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setError("");
                }}
                placeholder="Ex: gerente@salon.com"
                disabled={loading}
                autoComplete="nope"
                autoFocus
              />
            </div>
          )}

          <div>
            <Label htmlFor="confirm-action-password">Senha</Label>
            <Input
              id="confirm-action-password"
              name="confirm-action-password"
              type="password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setError("");
              }}
              onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
              placeholder="Digite sua senha"
              disabled={loading}
              autoComplete="new-password"
              autoFocus={!requireCredentials}
            />
          </div>
          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
              <AlertCircle className="w-4 h-4 text-red-600" />
              <span className="text-sm text-red-600">{error}</span>
            </div>
          )}
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => handleOpenChange(false)} disabled={loading}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={loading} className="bg-[#84A59D] hover:bg-[#6F9189]">
            {loading ? "Confirmando..." : "Confirmar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
