import React, { useEffect, useState, useMemo, useRef } from "react";
import http from "../api";
import { CalendarDays, Clock } from "lucide-react";
import { fmtHour } from "@/pages/Agenda";

// Status -> cor (vertical stripe + bg suave)
const STATUS_COLORS = {
  agendado: { stripe: "#0EA5E9", bg: "#E0F2FE", text: "#0369A1" },
  confirmado: { stripe: "#F59E0B", bg: "#FEF3C7", text: "#92400E" },
  em_andamento: { stripe: "#A855F7", bg: "#F3E8FF", text: "#6B21A8" },
  concluido: { stripe: "#10B981", bg: "#D1FAE5", text: "#065F46" },
  cancelado: { stripe: "#F43F5E", bg: "#FEE2E2", text: "#9F1239" },
};

const HOUR_START = 0;
const HOUR_END = 24;
const ROW_HEIGHT = 64; // Increased for a more spacious premium feel
const HOUR_WIDTH = 120; // Slightly wider hour blocks for better readability

export default function AgendaTimeline({ data, onCardClick }) {
  const [colaboradores, setColaboradores] = useState([]);
  const [agendamentos, setAgendamentos] = useState([]);
  const [now, setNow] = useState(new Date());
  const scrollContainerRef = useRef(null);

  useEffect(() => {
    http.get("/colaboradores").then((r) => setColaboradores(r.data.filter((c) => c.ativo)));
  }, []);

  useEffect(() => {
    http.get("/agendamentos", { params: { data } }).then((r) => setAgendamentos(r.data));
  }, [data]);

  // Track time in real-time
  useEffect(() => {
    const timer = setInterval(() => {
      setNow(new Date());
    }, 10000);
    return () => clearInterval(timer);
  }, []);

  const isSelectedDayToday = useMemo(() => {
    const todayStr = new Date().toISOString().split("T")[0];
    return data === todayStr;
  }, [data]);

  const hours = useMemo(() => {
    const hArr = [];
    for (let h = HOUR_START; h < HOUR_END; h++) hArr.push(h);
    return hArr;
  }, []);

  const totalWidth = hours.length * HOUR_WIDTH;

  const currentTimeLeft = useMemo(() => {
    if (!isSelectedDayToday) return 0;
    const hrs = now.getHours();
    const mins = now.getMinutes();
    return ((hrs * 60 + mins) * HOUR_WIDTH) / 60;
  }, [now, isSelectedDayToday]);

  // Auto scroll to current time on mount or day change
  useEffect(() => {
    if (scrollContainerRef.current) {
      if (isSelectedDayToday) {
        const hrs = new Date().getHours();
        const scrollPos = Math.max(0, (hrs - 2) * HOUR_WIDTH);
        scrollContainerRef.current.scrollLeft = scrollPos;
      } else {
        // Scroll to standard morning shift (08:00)
        scrollContainerRef.current.scrollLeft = 8 * HOUR_WIDTH;
      }
    }
  }, [data, isSelectedDayToday]);

  // Agrupar agendamentos por colaborador principal
  const byColab = useMemo(() => {
    const map = {};
    colaboradores.forEach((c) => { map[c.id] = []; });
    agendamentos.forEach((a) => {
      const principais = a.profissionais?.filter((p) => p.tipo === "principal") || [];
      principais.forEach((p) => {
        if (map[p.id]) map[p.id].push(a);
      });
    });
    return map;
  }, [colaboradores, agendamentos]);

  const agendamentosSemProf = useMemo(() => {
    return agendamentos.filter((a) => !a.profissionais?.length);
  }, [agendamentos]);

  const calcBlock = (a) => {
    const d = new Date(a.data_hora.replace("Z", ""));
    const startH = d.getHours() + d.getMinutes() / 60;
    const dur = (a.duracao_minutos || 60) / 60;
    const left = (startH - HOUR_START) * HOUR_WIDTH;
    const width = Math.max(dur * HOUR_WIDTH, 90);
    return { left, width };
  };

  const formatSelectedDate = (dateStr) => {
    if (!dateStr) return "";
    const parts = dateStr.split("-");
    const date = new Date(parts[0], parts[1] - 1, parts[2]);
    const formatted = date.toLocaleDateString("pt-BR", { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    return formatted.charAt(0).toUpperCase() + formatted.slice(1);
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Date Header for the Timeline */}
      <div className="flex items-center gap-2.5 bg-white border border-zinc-200 rounded-xl p-4 shadow-sm select-none">
        <div className="bg-[#EAF0EE] text-[#3A4F4A] p-2.5 rounded-lg">
          <CalendarDays className="w-5 h-5" />
        </div>
        <div className="flex flex-col">
          <span className="text-[10px] font-bold text-[#84A59D] uppercase tracking-wider">Período Selecionado</span>
          <span className="font-display font-bold text-zinc-800 text-sm md:text-base">{formatSelectedDate(data)}</span>
        </div>
        <div className="ml-auto text-xs font-semibold text-zinc-400 bg-zinc-100 px-3 py-1 rounded-full flex items-center gap-1">
          <Clock className="w-3.5 h-3.5" /> 24h Ativa
        </div>
      </div>

      <div className="bg-white border border-zinc-200 rounded-xl overflow-hidden shadow-sm flex flex-col">
        {/* Scrollable Container */}
        <div
          ref={scrollContainerRef}
          className="overflow-x-auto scrollbar-thin relative"
        >
          <div className="relative" style={{ minWidth: `${220 + totalWidth}px` }}>

            {/* Header: horários */}
            <div className="flex sticky top-0 bg-zinc-50 border-b border-zinc-200 z-10">
              <div className="w-[220px] flex-shrink-0 px-4 py-3 text-xs uppercase tracking-wider text-zinc-500 font-semibold border-r border-zinc-200 bg-zinc-50 select-none">
                Profissional
              </div>
              <div className="flex" style={{ width: `${totalWidth}px` }}>
                {hours.map((h) => (
                  <div key={h} className="border-r border-zinc-100 text-xs text-zinc-500 font-semibold px-2 py-3 bg-zinc-50 select-none text-center" style={{ width: `${HOUR_WIDTH}px` }}>
                    {String(h).padStart(2, "0")}:00
                  </div>
                ))}
              </div>
            </div>

            {/* Linha vertical indicando o horário atual */}
            {isSelectedDayToday && (
              <div
                className="absolute top-0 bottom-0 z-20 w-0.5 bg-rose-500 pointer-events-none transition-all duration-300"
                style={{ left: `${220 + currentTimeLeft}px` }}
              >
                {/* Glowing indicators */}
                <div className="absolute top-0 -ml-1.5 w-3.5 h-3.5 rounded-full bg-rose-500 shadow-md shadow-rose-500/50 animate-pulse" />
                <div className="absolute top-[40px] -ml-1 w-2.5 h-2.5 rounded-full bg-rose-500 shadow-md shadow-rose-500/50" />
                <div className="absolute bottom-0 -ml-1.5 w-3.5 h-3.5 rounded-full bg-rose-500 shadow-md shadow-rose-500/50" />
              </div>
            )}

            {/* Linhas: colaboradores */}
            {colaboradores.length === 0 ? (
              <div className="px-4 py-12 text-center text-sm text-zinc-400 select-none">Nenhum profissional ativo cadastrado.</div>
            ) : colaboradores.map((c) => (
              <div key={c.id} className="flex border-b border-zinc-100 relative" style={{ height: `${ROW_HEIGHT}px` }} data-testid={`timeline-row-${c.id}`}>
                <div className="w-[220px] flex-shrink-0 px-4 py-3 border-r border-zinc-200 flex items-center bg-white sticky left-0 z-10 shadow-[2px_0_5px_rgba(0,0,0,0.02)] select-none">
                  <div>
                    <div className="font-semibold text-zinc-700 text-sm truncate max-w-[180px]">{c.nome}</div>
                    <div className="text-[11px] text-zinc-400 truncate max-w-[180px]">{c.cargo || "Profissional"}</div>
                  </div>
                </div>
                <div className="relative" style={{ width: `${totalWidth}px` }}>
                  {/* Linhas verticais por hora */}
                  {hours.map((h) => (
                    <div key={h} className="absolute top-0 bottom-0 border-r border-zinc-100 pointer-events-none" style={{ left: `${(h - HOUR_START) * HOUR_WIDTH}px`, width: `${HOUR_WIDTH}px` }} />
                  ))}
                  {/* Blocos de agendamento */}
                  {byColab[c.id]?.map((a) => {
                    const { left, width } = calcBlock(a);
                    const colors = STATUS_COLORS[a.status] || STATUS_COLORS.agendado;
                    const time = fmtHour(a.data_hora);
                    return (
                      <div
                        key={a.id}
                        data-testid={`timeline-block-${a.id}`}
                        className="absolute top-1.5 bottom-1.5 rounded-lg overflow-hidden shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 cursor-pointer select-none"
                        style={{ left: `${left}px`, width: `${width}px`, background: colors.bg, borderLeft: `4px solid ${colors.stripe}` }}
                        title={`${time} · ${a.cliente_nome} · ${a.itens?.map((i) => i.nome).join(", ")}`}
                        onClick={() => onCardClick?.(a)}
                      >
                        <div className="px-2.5 py-1 h-full flex flex-col justify-center overflow-hidden" style={{ color: colors.text }}>
                          <div className="text-[11px] font-bold leading-tight truncate">{time} · {a.cliente_nome}</div>
                          <div className="text-[10px] opacity-80 leading-tight truncate mt-0.5 font-medium">{a.itens?.map((i) => i.nome).join(", ")}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}

            {/* Agendamentos sem profissional */}
            {agendamentosSemProf.length > 0 && (
              <div className="flex border-b border-zinc-100 relative bg-zinc-50/50" style={{ height: `${ROW_HEIGHT}px` }}>
                <div className="w-[220px] flex-shrink-0 px-4 py-3 border-r border-zinc-200 flex items-center bg-zinc-50/50 sticky left-0 z-10 shadow-[2px_0_5px_rgba(0,0,0,0.02)] select-none">
                  <div className="text-xs text-zinc-400 font-semibold italic">Sem profissional definido</div>
                </div>
                <div className="relative" style={{ width: `${totalWidth}px` }}>
                  {/* Linhas verticais por hora */}
                  {hours.map((h) => (
                    <div key={h} className="absolute top-0 bottom-0 border-r border-zinc-100 pointer-events-none" style={{ left: `${(h - HOUR_START) * HOUR_WIDTH}px`, width: `${HOUR_WIDTH}px` }} />
                  ))}
                  {agendamentosSemProf.map((a) => {
                    const { left, width } = calcBlock(a);
                    const colors = STATUS_COLORS[a.status] || STATUS_COLORS.agendado;
                    const time = fmtHour(a.data_hora);
                    return (
                      <div
                        key={a.id}
                        className="absolute top-1.5 bottom-1.5 rounded-lg overflow-hidden shadow-sm cursor-pointer hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 select-none"
                        style={{ left: `${left}px`, width: `${width}px`, background: colors.bg, borderLeft: `4px solid ${colors.stripe}` }}
                        title={`${time} · ${a.cliente_nome}`}
                        onClick={() => onCardClick?.(a)}
                      >
                        <div className="px-2.5 py-1 h-full flex flex-col justify-center overflow-hidden" style={{ color: colors.text }}>
                          <div className="text-[11px] font-bold leading-tight truncate">{time} · {a.cliente_nome}</div>
                          <div className="text-[10px] opacity-80 leading-tight truncate mt-0.5 font-medium">Sem Profissional</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Legenda */}
        <div className="flex flex-wrap gap-4 px-4 py-3 border-t border-zinc-200 bg-zinc-50/40 select-none">
          <div className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider flex items-center mr-2">Legenda:</div>
          {Object.entries(STATUS_COLORS).map(([k, c]) => (
            <div key={k} className="flex items-center gap-1.5 text-xs text-zinc-600 font-medium">
              <span className="w-3.5 h-3.5 rounded" style={{ background: c.bg, borderLeft: `3px solid ${c.stripe}` }} />
              <span className="capitalize">{k.replace("_", " ")}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
