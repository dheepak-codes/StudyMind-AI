import { EmptyState, ErrorText, PageHeader, Row, SectionTitle, Spinner } from "../components/ui";
import { api } from "../lib/api";
import { fmtDate, useLoad } from "../lib/hooks";

export default function Progress() {
  const { data: p, loading, error } = useLoad(api.progress);
  if (loading) return <Spinner />;
  if (error || !p) return <ErrorText message={error || "Could not load progress."} />;

  const stats = [
    { n: p.sessions, l: "Sessions" }, { n: p.documents, l: "Documents" }, { n: p.quizzes_taken, l: "Quizzes" },
    { n: p.average_quiz_score != null ? `${p.average_quiz_score}%` : "—", l: "Avg. score" },
    { n: `${p.tasks_done}/${p.tasks_total}`, l: "Tasks done" },
  ];
  return (
    <>
      <PageHeader title="Progress" subtitle="Calculated from your real activity." />
      <div className="flex flex-wrap gap-x-10 gap-y-4">{stats.map((s) => <div key={s.l}><div className="text-2xl font-semibold">{s.n}</div><div className="text-[13px] text-muted">{s.l}</div></div>)}</div>

      <SectionTitle>Quiz scores</SectionTitle>
      {!p.recent_quizzes.length ? <EmptyState>No quizzes taken yet.</EmptyState> : p.recent_quizzes.map((q, i) => (
        <div key={i} className="border-b border-line py-3 last:border-0">
          <div className="flex justify-between"><span>{q.topic}</span><span className="text-[13px] text-muted">{q.score}/{q.total} · {fmtDate(q.at)}</span></div>
          <div className="mt-1.5 h-1.5 overflow-hidden rounded bg-line"><div className="h-full bg-accent" style={{ width: `${(q.score / q.total) * 100}%` }} /></div>
        </div>
      ))}

      <SectionTitle>Recent activity</SectionTitle>
      {!p.recent_activity.length ? <EmptyState>No activity yet.</EmptyState> : p.recent_activity.map((a, i) => (
        <Row key={i}><div><div>{a.title}</div><div className="text-[13px] capitalize text-muted">{a.kind}</div></div><span className="text-[13px] text-muted">{fmtDate(a.at)}</span></Row>
      ))}
    </>
  );
}
