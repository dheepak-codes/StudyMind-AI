import { useState } from "react";
import { Button, EmptyState, ErrorText, PageHeader, Panel } from "../components/ui";
import { api, type Quiz as QuizData, type QuizResult } from "../lib/api";
import { errMsg, useLoad } from "../lib/hooks";

export default function Quiz() {
  const docs = useLoad(api.docs);
  const [topic, setTopic] = useState("");
  const [docId, setDocId] = useState("");
  const [difficulty, setDifficulty] = useState("Medium");
  const [count, setCount] = useState(5);
  const [quiz, setQuiz] = useState<QuizData | null>(null);
  const [picked, setPicked] = useState<(number | undefined)[]>([]);
  const [result, setResult] = useState<QuizResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function generate() {
    if (!topic.trim() && !docId) return setError("Enter a topic or choose a document.");
    setBusy(true); setError(""); setResult(null); setQuiz(null);
    try {
      const q = await api.generateQuiz({ topic: topic.trim(), document_id: docId ? Number(docId) : undefined, difficulty, num_questions: count });
      setQuiz(q); setPicked(new Array(q.questions.length).fill(undefined));
    } catch (e) { setError(errMsg(e)); } finally { setBusy(false); }
  }
  async function submit() {
    if (!quiz) return;
    if (picked.some((p) => p === undefined)) return setError("Answer every question first.");
    setBusy(true); setError("");
    try { setResult(await api.submitQuiz(quiz.quiz_id, picked as number[])); } // scored on the server
    catch (e) { setError(errMsg(e)); } finally { setBusy(false); }
  }
  const retry = () => { if (quiz) { setPicked(new Array(quiz.questions.length).fill(undefined)); setResult(null); setError(""); } };

  return (
    <>
      <PageHeader title="Quiz Studio" subtitle="Generate a quiz from a topic or one of your documents." />
      <Panel>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="text-[13px] text-muted">Topic<input value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="e.g. Process scheduling" className="mt-1 text-ink" /></label>
          <label className="text-[13px] text-muted">Document
            <select value={docId} onChange={(e) => setDocId(e.target.value)} className="mt-1 text-ink">
              <option value="">None</option>
              {docs.data?.filter((d) => d.status === "ready").map((d) => <option key={d.id} value={d.id}>{d.title}</option>)}
            </select></label>
          <label className="text-[13px] text-muted">Difficulty
            <select value={difficulty} onChange={(e) => setDifficulty(e.target.value)} className="mt-1 text-ink"><option>Easy</option><option>Medium</option><option>Hard</option></select></label>
          <label className="text-[13px] text-muted">Questions
            <select value={count} onChange={(e) => setCount(Number(e.target.value))} className="mt-1 text-ink">{[3, 5, 8, 10].map((n) => <option key={n}>{n}</option>)}</select></label>
        </div>
        <div className="mt-4"><Button onClick={generate} loading={busy && !quiz}>Generate quiz</Button></div>
      </Panel>
      <ErrorText message={error} />
      {!quiz && !busy && <EmptyState>Your quiz will appear here.</EmptyState>}

      {result && <Panel className="mt-4 flex items-center justify-between"><b>Score: {result.score}/{result.total}</b><Button variant="ghost" onClick={retry}>Retry</Button></Panel>}
      {quiz?.questions.map((q, i) => (
        <Panel key={i} className="mt-3">
          <p className="font-medium">{i + 1}. {q.question}</p>
          {q.options.map((o, j) => {
            const r = result?.results[i];
            const style = r ? (j === r.correct_index ? "border-ok" : j === r.your_answer ? "border-bad" : "border-line") : picked[i] === j ? "border-accent bg-soft" : "border-line";
            return (
              <label key={j} className={`mt-2 flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm ${style}`}>
                <input type="radio" name={`q${i}`} disabled={!!result} checked={picked[i] === j}
                  onChange={() => setPicked((p) => p.map((v, k) => (k === i ? j : v)))} /> {o}
              </label>
            );
          })}
          {result && <p className="mt-2 text-sm text-muted">{result.results[i].explanation}</p>}
        </Panel>
      ))}
      {quiz && !result && <div className="mt-4"><Button onClick={submit} loading={busy}>Submit answers</Button></div>}
    </>
  );
}
