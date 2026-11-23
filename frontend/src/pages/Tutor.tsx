import { Check, Copy, RotateCcw, Send } from "lucide-react";
import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { useLocation } from "react-router-dom";
import { Button, ErrorText, Markdown, PageHeader } from "../components/ui";
import { api, type ChatMsg } from "../lib/api";
import { errMsg } from "../lib/hooks";

const SUGGESTIONS = ["Explain recursion with an example", "What is virtual memory?", "Summarize how TCP works"];

export default function Tutor() {
  const location = useLocation();
  const [msgs, setMsgs] = useState<ChatMsg[]>([]);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState<number | null>(null);
  const started = useRef(false);
  const end = useRef<HTMLDivElement>(null);

  async function send(history: ChatMsg[]) {
    setMsgs(history);
    setBusy(true);
    setError("");
    try {
      const { reply } = await api.chat(history.slice(-20));
      setMsgs([...history, { role: "assistant", content: reply }]);
    } catch (e) {
      setError(errMsg(e)); // history is kept so the user can retry
    } finally {
      setBusy(false);
    }
  }
  const ask = (q: string) => { if (q.trim() && !busy) { setText(""); void send([...msgs, { role: "user", content: q.trim() }]); } };

  useEffect(() => { // question coming from the Home page composer
    const q = (location.state as { ask?: string } | null)?.ask;
    if (q && !started.current) { started.current = true; void send([{ role: "user", content: q }]); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => { end.current?.scrollIntoView({ behavior: "smooth" }); }, [msgs, busy]);

  const onKey = (e: KeyboardEvent) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); ask(text); } };
  const copy = (i: number) => { void navigator.clipboard.writeText(msgs[i].content); setCopied(i); setTimeout(() => setCopied(null), 1500); };
  const retry = () => { if (msgs.length && msgs[msgs.length - 1].role === "user") void send(msgs); };

  return (
    <>
      <PageHeader title="AI Tutor" subtitle="Ask anything. Follow-up questions keep the conversation context." />
      {!msgs.length && <div className="flex flex-wrap gap-2">{SUGGESTIONS.map((s) => <button key={s} onClick={() => ask(s)} className="rounded-full border border-line bg-surface px-3 py-1 text-[13px] hover:border-accent hover:text-accent">{s}</button>)}</div>}
      <div className="space-y-4 py-4">
        {msgs.map((m, i) => (
          <div key={i} className={`flex flex-col gap-1 ${m.role === "user" ? "items-end" : "items-start"}`}>
            <div className={`max-w-full rounded-xl px-4 py-2.5 ${m.role === "user" ? "bg-soft" : "border border-line bg-surface"}`}>
              {m.role === "user" ? <p className="whitespace-pre-wrap">{m.content}</p> : <Markdown text={m.content} />}
            </div>
            {m.role === "assistant" && <button onClick={() => copy(i)} className="flex items-center gap-1 text-xs text-muted hover:text-ink">{copied === i ? <Check size={12} /> : <Copy size={12} />}{copied === i ? "Copied" : "Copy"}</button>}
          </div>
        ))}
        {busy && <p className="text-sm text-muted">Thinking…</p>}
        <ErrorText message={error} />
        {error && <Button variant="ghost" onClick={retry}><RotateCcw size={14} /> Retry</Button>}
        <div ref={end} />
      </div>
      <div className="sticky bottom-0 rounded-xl border border-line bg-surface p-3 focus-within:border-accent">
        <textarea rows={2} value={text} onChange={(e) => setText(e.target.value)} onKeyDown={onKey} placeholder="Ask your tutor..." className="resize-none border-0 px-1 focus:border-0" />
        <div className="flex justify-between">
          <Button variant="ghost" onClick={() => { setMsgs([]); setError(""); }} disabled={!msgs.length}>Clear</Button>
          <Button onClick={() => ask(text)} loading={busy} disabled={!text.trim()}><Send size={14} /> Send</Button>
        </div>
      </div>
    </>
  );
}
