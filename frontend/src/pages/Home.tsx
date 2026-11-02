import { ArrowUp } from "lucide-react";
import { useState, type KeyboardEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { EmptyState, ErrorText, Row, SectionTitle, Spinner } from "../components/ui";
import { api } from "../lib/api";
import { useAuth } from "../lib/auth";
import { fmtDate, useLoad } from "../lib/hooks";

export default function Home() {
  const { user } = useAuth();
  const nav = useNavigate();
  const [text, setText] = useState("");
  const progress = useLoad(api.progress);
  const docs = useLoad(api.docs);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

  const ask = () => { if (text.trim()) nav("/tutor", { state: { ask: text.trim() } }); };
  const onKey = (e: KeyboardEvent) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); ask(); } };

  const chips: { label: string; run: () => void }[] = [
    { label: "Explain a concept", run: () => (text.trim() ? ask() : nav("/tutor")) },
    { label: "Ask my notes", run: () => nav("/materials") },
    { label: "Generate a quiz", run: () => nav("/quiz") },
    { label: "Create a study plan", run: () => nav("/planner") },
  ];
  const p = progress.data;
  const stats = [
    { n: p ? p.sessions : "—", l: "Study sessions" },
    { n: p ? p.documents : "—", l: "Documents" },
    { n: p?.average_quiz_score != null ? `${p.average_quiz_score}%` : "—", l: "Avg. quiz score" },
  ];

  return (
    <>
      <h1 className="text-[30px] font-semibold tracking-tight">{greeting}, {user?.name}</h1>
      <p className="mb-6 mt-1 text-muted">What would you like to learn today?</p>

      <div className="rounded-xl border border-line bg-surface p-3 focus-within:border-accent">
        <textarea value={text} onChange={(e) => setText(e.target.value)} onKeyDown={onKey} rows={3}
          placeholder="Ask a question, explore your notes, or learn something new..."
          className="resize-none border-0 px-1 focus:border-0" />
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted">Enter to send</span>
          <button onClick={ask} disabled={!text.trim()} aria-label="Ask" className="rounded-lg bg-accent p-2 text-white disabled:opacity-40"><ArrowUp size={16} /></button>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {chips.map((c) => <button key={c.label} onClick={c.run} className="rounded-full border border-line bg-surface px-3 py-1 text-[13px] hover:border-accent hover:text-accent">{c.label}</button>)}
      </div>

      <div className="mt-8 flex gap-10">
        {stats.map((s) => <div key={s.l}><div className="text-2xl font-semibold">{s.n}</div><div className="text-[13px] text-muted">{s.l}</div></div>)}
      </div>
      <ErrorText message={progress.error} />

      <SectionTitle>Continue learning</SectionTitle>
      {docs.loading || progress.loading ? <Spinner /> : (
        <>
          {docs.data?.slice(0, 3).map((d) => (
            <Row key={d.id}>
              <div><div className="font-medium">{d.title}</div>
                <div className="text-[13px] text-muted">{d.file_type.toUpperCase()} · {d.status === "ready" ? `${d.passages} passages indexed` : d.status} · {fmtDate(d.created_at)}</div></div>
              <Link to="/materials" className="text-sm text-accent">Open</Link>
            </Row>
          ))}
          {p?.recent_activity.slice(0, 4).map((a, i) => (
            <Row key={i}><div><div className="font-medium">{a.title}</div><div className="text-[13px] capitalize text-muted">{a.kind} · {fmtDate(a.at)}</div></div></Row>
          ))}
          {!docs.data?.length && !p?.recent_activity.length && <EmptyState>Nothing yet. Ask a question or upload a PDF to get started.</EmptyState>}
        </>
      )}
    </>
  );
}
