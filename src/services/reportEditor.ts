export type ReportDetails = {
  owner: string;
  village: string;
  plot: string;
  client: string;
  notes: string;
};
export type ReportDraft = {
  title: string;
  summaryLines: string[];
  details?: Partial<ReportDetails>;
  points?: { lat: number; lng: number }[];
};
export type EditedReport = { title: string; details: ReportDetails };
let editor: ((draft: ReportDraft) => Promise<EditedReport | null>) | null =
  null;
export function registerReportEditor(value: typeof editor) {
  editor = value;
}
export function editReport(draft: ReportDraft) {
  if (!editor)
    return Promise.reject(
      new Error('Report editor is not ready. Please reopen the app.'),
    );
  return editor(draft);
}
