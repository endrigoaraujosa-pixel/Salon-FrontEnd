import React, { useState } from "react";
import { useAuth } from "../auth";
import { useNavigate } from "react-router-dom";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Scissors } from "lucide-react";
import { toast } from "sonner";

export default function Login() {
  const { login } = useAuth();
  const nav = useNavigate();
  const [user, setUser] = useState({ email: "", password: "" });
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(user.email, user.password);
      toast.success("Bem-vinda!");
      nav("/");
    } catch (err) {
      toast.error(err.response?.data?.detail || "Erro ao entrar");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      <div className="hidden lg:block relative overflow-hidden">
        <img
          src="https://images.unsplash.com/photo-1763873993447-1d0be71a96d9?crop=entropy&cs=srgb&fm=jpg&w=1600&q=80"
          alt="Salon"
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-black/35" />
        <div className="relative h-full flex flex-col justify-between p-12 text-white">
          <div className="flex items-center gap-2">
            <Scissors className="w-6 h-6" />
            <span className="text-xl font-display font-semibold">Salon Studio</span>
          </div>
          <div>
            <h1 className="font-display text-5xl font-semibold leading-tight tracking-tight">
              Gestão completa<br />do seu salão.
            </h1>
            <p className="mt-4 text-white/80 max-w-md">
              Agendamentos, pagamentos, comissões e relatórios — tudo em um só lugar.
            </p>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-center p-8">
        <form onSubmit={submit} className="w-full max-w-sm space-y-6" data-testid="login-form">
          <div>
            <h2 className="font-display text-3xl font-semibold tracking-tight">Bem-vinda de volta</h2>
            <p className="text-sm text-zinc-500 mt-1">Entre na sua conta para continuar</p>
          </div>
          <div className="space-y-3">
            <div>
              <Label htmlFor="email">Email</Label>
              <Input id="email" data-testid="login-email" type="email" value={user.email} onChange={(e) => setUser({ ...user, email: e.target.value })} required />
            </div>
            <div>
              <Label htmlFor="password">Senha</Label>
              <Input id="password" data-testid="login-password" type="password" value={user.password} onChange={(e) => setUser({ ...user, password: e.target.value })} required autoComplete="new-password" />
            </div>
          </div>
          <Button data-testid="login-submit" type="submit" disabled={loading} className="w-full bg-[#84A59D] hover:bg-[#6F9189] text-white">
            {loading ? "Entrando..." : "Entrar"}
          </Button>
        </form>
      </div>
    </div>
  );
}
