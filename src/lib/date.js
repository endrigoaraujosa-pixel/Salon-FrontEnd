export const AGENDA_TIME_ZONE = 'America/Recife';

/** Retorna a data corrente no fuso da agenda, no formato aceito por inputs date. */
export function getAgendaTodayDate(now = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: AGENDA_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).formatToParts(now);
  const value = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
  return `${value.year}-${value.month}-${value.day}`;
}

/** Primeiro dia do mes corrente no calendario da agenda. */
export function getAgendaMonthStart(now = new Date()) {
  return `${getAgendaTodayDate(now).slice(0, 7)}-01`;
}

/** Subtrai dias civis da data atual da agenda, sem depender do fuso do navegador. */
export function getAgendaDaysAgo(days, now = new Date()) {
  const date = new Date(`${getAgendaTodayDate(now)}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() - days);
  return date.toISOString().slice(0, 10);
}

/** Inicio da semana no domingo, preservando a regra dos filtros dos relatorios. */
export function getAgendaWeekStart(now = new Date()) {
  const date = new Date(`${getAgendaTodayDate(now)}T00:00:00Z`);
  return getAgendaDaysAgo(date.getUTCDay(), now);
}

/**
 * Preserva datas civis YYYY-MM-DD e converte instantes para a data da agenda (DD/MM/YYYY).
 * @param {string|Date} dateInput 
 * @returns {string}
 */
export function formatAgendaDate(dateInput) {
  if (!dateInput) return "-";
  // Inputs date representam um dia do calendario, sem horario ou conversao de fuso.
  if (typeof dateInput === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateInput)) {
    const [year, month, day] = dateInput.split('-');
    return `${day}/${month}/${year}`;
  }
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return dateInput;
  return d.toLocaleDateString("pt-BR", { timeZone: AGENDA_TIME_ZONE });
}

/**
 * Formata uma data/hora UTC do banco para o horário local (America/Recife) no formato "HH:mm".
 * @param {string|Date} dateInput 
 * @returns {string}
 */
export function formatAgendaTime(dateInput) {
  if (!dateInput) return "-";
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return dateInput;
  return d.toLocaleTimeString("pt-BR", { timeZone: AGENDA_TIME_ZONE, hour: "2-digit", minute: "2-digit" });
}

/**
 * Formata uma data/hora UTC do banco para data e horário local (America/Recife) no formato "DD/MM/YYYY HH:mm".
 * @param {string|Date} dateInput 
 * @returns {string}
 */
export function formatAgendaDateTime(dateInput) {
  if (!dateInput) return "-";
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return dateInput;
  
  const datePart = d.toLocaleDateString("pt-BR", { timeZone: AGENDA_TIME_ZONE });
  const timePart = d.toLocaleTimeString("pt-BR", { timeZone: AGENDA_TIME_ZONE, hour: "2-digit", minute: "2-digit" });
  return `${datePart} ${timePart}`;
}
