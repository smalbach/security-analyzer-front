export function formatReportDate(dateIso?: string): string {
  if (!dateIso) {
    return '-';
  }

  const date = new Date(dateIso);
  if (Number.isNaN(date.getTime())) {
    return dateIso;
  }

  return date.toLocaleString();
}
