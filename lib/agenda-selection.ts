export type AgendaDateRange = {
  id: number;
  start_date: string;
  end_date: string;
};

export type AgendaSelectionSummary = {
  id: number;
  totalTasks: number;
  studentProgressPercent: number;
};

export function getDefaultAgendaId(args: {
  agendas: AgendaDateRange[];
  agendaSummaries: AgendaSelectionSummary[];
  requestedAgendaId: number;
  today?: string;
}) {
  const {
    agendas,
    agendaSummaries,
    requestedAgendaId,
    today = new Date().toISOString().slice(0, 10),
  } = args;

  const hasExplicitSelection =
    Number.isInteger(requestedAgendaId) &&
    agendaSummaries.some((agenda) => agenda.id === requestedAgendaId);

  if (hasExplicitSelection) {
    return requestedAgendaId;
  }

  const currentAgenda = agendas.find(
    (agenda) => agenda.start_date <= today && today <= agenda.end_date,
  );

  const earliestIncompleteAgenda = agendaSummaries.find(
    (agenda) => agenda.totalTasks > 0 && agenda.studentProgressPercent < 100,
  );

  return (
    currentAgenda?.id ??
    earliestIncompleteAgenda?.id ??
    agendaSummaries[agendaSummaries.length - 1]?.id ??
    agendaSummaries[0]?.id ??
    0
  );
}
