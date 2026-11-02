import { useState } from "react";
import { Button, ErrorText, Markdown, PageHeader, Panel, SectionTitle } from "../components/ui";
import { api, type AgentResult } from "../lib/api";
import { errMsg } from "../lib/hooks";

export default function Agents() {
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [res, setRes] = useState<AgentResult | null>(null);

  async function run() {
    setBusy(true); setError(""); setRes(null);
    try { setRes(await api.runAgents(text.trim())); } catch (e) { setError(errMsg(e)); } finally { setBusy(false); }
  }

  return (
    <>
      <PageHeader title="Multi-Agent Studio" subtitle="A planner routes your request to specialist agents. Every step below is a real backend call." />
      <Panel>
        <textarea rows={3} value={text} onChange={(e) => setText(e.target.value)} placeholder="e.g. Explain virtual memory from my notes and test me" className="border-0 px-1 focus:border-0" />
        <div className="flex justify-end"><Button onClick={run} loading={busy} disabled={!text.trim()}>Run agents</Button></div>
      </Panel>
      <ErrorText message={error} />
      {res && (
        <>
          <SectionTitle>Execution</SectionTitle>
          {res.steps.map((s, i) => (
            <div key={i} className="flex items-start gap-3 border-b border-line py-2.5 last:border-0">
              <span className={`mt-2 h-2.5 w-2.5 rounded-full ${s.status === "done" ? "bg-ok" : "bg-bad"}`} />
              <div><span className="font-medium">{s.agent}</span> <span className="text-[13px] text-muted">{s.seconds}s{s.error ? ` · ${s.error}` : ""}</span></div>
            </div>
          ))}
          {res.explanation && <><SectionTitle>Explanation</SectionTitle><Panel><Markdown text={res.explanation} /></Panel></>}
          {res.quiz && <><SectionTitle>Practice questions</SectionTitle><Panel className="space-y-4">
            {res.quiz.map((q, i) => <div key={i}><p className="font-medium">{i + 1}. {q.question}</p>
              {q.options.map((o, j) => <p key={j} className="text-sm text-muted">{"ABCD"[j]}. {o}</p>)}
              <p className="mt-1 text-sm text-ok">Answer: {"ABCD"[q.answer_index]}. {q.explanation}</p></div>)}
          </Panel></>}
          {res.study_plan && <><SectionTitle>Study plan</SectionTitle><Panel><Markdown text={res.study_plan} /></Panel></>}
          {res.sources && res.sources.length > 0 && <><SectionTitle>Sources</SectionTitle>
            {res.sources.map((s, i) => <p key={i} className="text-sm text-muted">{s.document}, page {s.page}</p>)}</>}
        </>
      )}
    </>
  );
}
