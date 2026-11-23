import { useState } from "react";
import { Button, EmptyState, ErrorText, PageHeader, Panel, SectionTitle, Spinner } from "../components/ui";
import { api, type Task } from "../lib/api";
import { errMsg, useLoad } from "../lib/hooks";

export default function Planner() {
  const tasks = useLoad(api.tasks);
  const [subjects, setSubjects] = useState("");
  const [examDate, setExamDate] = useState("");
  const [hours, setHours] = useState(3);
  const [minutes, setMinutes] = useState(45);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function generate() {
    if (!subjects.trim() || !examDate) return setError("Add your topics and an exam date.");
    setBusy(true); setError("");
    try { tasks.setData(await api.generatePlan({ subjects: subjects.trim(), exam_date: examDate, hours_per_day: hours, session_minutes: minutes })); }
    catch (e) { setError(errMsg(e)); } finally { setBusy(false); }
  }
  async function toggle(t: Task) {
    const update = (done: boolean) => tasks.setData((cur) => (cur ?? []).map((x) => (x.id === t.id ? { ...x, done } : x)));
    update(!t.done); // instant UI, rolled back if the server rejects it
    try { await api.setTask(t.id, !t.done); } catch (e) { update(t.done); setError(errMsg(e)); }
  }

  const days = [...new Set((tasks.data ?? []).map((t) => t.day))];
  const done = (tasks.data ?? []).filter((t) => t.done).length;

  return (
    <>
      <PageHeader title="Study Planner" subtitle="Tell us what you’re studying and when your exam is." />
      <Panel>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="text-[13px] text-muted">Subjects / topics<input value={subjects} onChange={(e) => setSubjects(e.target.value)} placeholder="OS, DBMS, Networks" className="mt-1 text-ink" /></label>
          <label className="text-[13px] text-muted">Exam date<input type="date" value={examDate} onChange={(e) => setExamDate(e.target.value)} className="mt-1 text-ink" /></label>
          <label className="text-[13px] text-muted">Hours per day<input type="number" min={1} max={12} value={hours} onChange={(e) => setHours(Number(e.target.value))} className="mt-1 text-ink" /></label>
          <label className="text-[13px] text-muted">Session length (min)<input type="number" min={15} max={180} value={minutes} onChange={(e) => setMinutes(Number(e.target.value))} className="mt-1 text-ink" /></label>
        </div>
        <div className="mt-4"><Button onClick={generate} loading={busy}>Generate plan</Button></div>
      </Panel>
      <ErrorText message={error || tasks.error} />

      {tasks.loading ? <Spinner /> : !tasks.data?.length ? <EmptyState>No plan yet. Generate one above.</EmptyState> : (
        <>
          <SectionTitle>{tasks.data[0].plan} <span className="text-sm font-normal text-muted">· {done}/{tasks.data.length} done</span></SectionTitle>
          {days.map((day) => (
            <div key={day} className="mb-4">
              <div className="mb-1 text-[13px] font-medium text-muted">{day}</div>
              {tasks.data!.filter((t) => t.day === day).map((t) => (
                <label key={t.id} className="flex cursor-pointer items-start gap-3 border-b border-line py-2.5 last:border-0">
                  <input type="checkbox" checked={t.done} onChange={() => void toggle(t)} className="mt-1" />
                  <span><span className={t.done ? "text-muted line-through" : ""}>{t.task}</span>
                    <span className="block text-[13px] text-muted">{t.kind} · {t.minutes} min</span></span>
                </label>
              ))}
            </div>
          ))}
        </>
      )}
    </>
  );
}
