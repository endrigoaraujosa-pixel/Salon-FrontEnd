export const AGENDA_TIME_ZONE = 'America/Recife';

/**
 * Formata uma data/hora UTC do banco para a data local brasileira (America/Recife) no formato "DD/MM/YYYY".
 * @param {string|Date} dateInput 
 * @returns {string}
 */
export function formatAgendaDate(dateInput) {
  if (!dateInput) return "-";
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
