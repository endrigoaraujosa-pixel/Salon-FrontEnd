import React, { useState, useEffect } from "react";
import { useAuth } from "../auth";
import { useNavigate } from "react-router-dom";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Scissors } from "lucide-react";
import { toast } from "sonner";
import http from "../api";

export default function Login() {
  const { login } = useAuth();
  const nav = useNavigate();
  const [user, setUser] = useState({ email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [nomeFantasia, setNomeFantasia] = useState("");
  const [logomarca, setLogomarca] = useState(null);

  useEffect(() => {
    const fetchEmpresaInfo = async () => {
      try {
        const response = await http.get("/configuracoes/empresa/public");
        if (response.data) {
          if (response.data.nome_fantasia) {
            setNomeFantasia(response.data.nome_fantasia);
          }
          if (response.data.logomarca) {
            setLogomarca(response.data.logomarca);
          }
        }
      } catch (err) {
        console.error("Erro ao carregar informações da empresa:", err);
      }
    };
    fetchEmpresaInfo();
  }, []);

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
          <div className="flex items-center gap-3">
            {logomarca ? (
              <div className="h-10 w-auto max-w-[120px] overflow-hidden flex items-center justify-center shrink-0">
                <img 
                  src={logomarca} 
                  alt="Logo" 
                  className="h-full w-auto object-contain" 
                  style={{ filter: "brightness(0) invert(1)" }}
                />
              </div>
            ) : (
              <Scissors className="w-6 h-6 mt-0.5" />
            )}
            <div className="flex flex-col">
              <span className="text-xl font-display font-semibold leading-tight">Salon Studio</span>
              {nomeFantasia && (
                <span className="text-[10px] text-white/80 font-bold uppercase tracking-wider mt-0.5" data-testid="login-company-left">
                  {nomeFantasia}
                </span>
              )}
            </div>
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
          {logomarca && (
            <div className="flex justify-center mb-4 animate-in fade-in slide-in-from-top-4 duration-500">
              <img 
                src={logomarca} 
                alt="Logo" 
                className="max-h-28 w-auto object-contain"
              />
            </div>
          )}
          <div>
            {nomeFantasia && (
              <div className="flex items-center gap-1.5 mb-2.5 text-[#84A59D]" data-testid="login-company-right">
                {!logomarca && <Scissors className="w-4 h-4" />}
                <span className="text-xs uppercase font-bold tracking-wider font-display">{nomeFantasia}</span>
              </div>
            )}
            <h2 className="font-display text-3xl font-semibold tracking-tight">Bem-vinda de volta</h2>
            <p className="text-sm text-zinc-500 mt-1">Entre na sua conta para continuar</p>
          </div>
          <div className="space-y-3">
            <div>
              <Label htmlFor="email">Email</Label>
              <Input id="email" data-testid="login-email" type="email" value={user.email} onChange={(e) => setUser({ ...user, email: e.target.value })} required autoComplete="username" />
            </div>
            <div>
              <Label htmlFor="password">Senha</Label>
              <Input id="password" data-testid="login-password" type="password" value={user.password} onChange={(e) => setUser({ ...user, password: e.target.value })} required autoComplete="current-password" />
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
