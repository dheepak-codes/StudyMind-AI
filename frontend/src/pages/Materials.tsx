import { FileText, Trash2, Upload } from "lucide-react";
import { useRef, useState } from "react";
import { Button, EmptyState, ErrorText, Markdown, PageHeader, Panel, Row, SectionTitle, Spinner } from "../components/ui";
import { api, type Source } from "../lib/api";
import { errMsg, fmtDate, useLoad } from "../lib/hooks";

export default function Materials() {
  const docs = useLoad(api.docs);
  const file = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [q, setQ] = useState("");
  const [asking, setAsking] = useState(false);
  const [answer, setAnswer] = useState<{ text: string; sources: Source[] } | null>(null);
  const [notes, setNotes] = useState<{ title: string; text: string } | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);

  async function upload(f: File | undefined) {
    if (!f) return;
    if (f.size > 10 * 1024 * 1024) return setError("File is larger than 10 MB.");
    setUploading(true); setError("");
    try {
      const d = await api.upload(f);
      if (d.status === "failed") setError(`"${d.title}" couldn't be processed: ${d.error}`);
      docs.reload();
    } catch (e) { setError(errMsg(e)); } finally { setUploading(false); if (file.current) file.current.value = ""; }
  }
  async function remove(id: number) {
    if (!confirm("Delete this document?")) return;
    try { await api.deleteDoc(id); docs.reload(); } catch (e) { setError(errMsg(e)); }
  }
  async function summarize(id: number) {
    setBusyId(id); setError("");
    try { const r = await api.summary(id); setNotes({ title: r.document, text: r.notes + (r.truncated ? "\n\n(Only the first part of a long document was used.)" : "") }); }
    catch (e) { setError(errMsg(e)); } finally { setBusyId(null); }
  }
  async function ask() {
    setAsking(true); setError(""); setAnswer(null);
    try { const r = await api.ask(q.trim()); setAnswer({ text: r.answer, sources: r.sources }); }
    catch (e) { setError(errMsg(e)); } finally { setAsking(false); }
  }

  return (
    <>
      <PageHeader title="Study Materials" subtitle="Upload PDF notes, then ask questions answered from your own documents." />
      <Panel className="flex items-center justify-between">
        <div className="text-sm text-muted">Text-based PDFs up to 10 MB. Scanned PDFs aren’t supported.</div>
        <input ref={file} type="file" accept="application/pdf" hidden onChange={(e) => void upload(e.target.files?.[0])} />
        <Button onClick={() => file.current?.click()} loading={uploading}><Upload size={14} /> Upload PDF</Button>
      </Panel>
      <ErrorText message={error || docs.error} />

      <SectionTitle>Your documents</SectionTitle>
      {docs.loading ? <Spinner /> : !docs.data?.length ? <EmptyState>No documents yet. Upload a PDF to begin.</EmptyState> :
        docs.data.map((d) => (
          <Row key={d.id}>
            <div className="flex min-w-0 items-center gap-3"><FileText size={18} className="shrink-0 text-muted" />
              <div className="min-w-0"><div className="truncate font-medium">{d.title}</div>
                <div className="text-[13px] text-muted">{d.status === "ready" ? `${d.pages} pages · ${d.passages} passages indexed` : d.status === "failed" ? `Failed: ${d.error}` : d.status} · {fmtDate(d.created_at)}</div></div></div>
            <div className="flex shrink-0 gap-2">
              {d.status === "ready" && <Button variant="ghost" loading={busyId === d.id} onClick={() => void summarize(d.id)}>Revision notes</Button>}
              <button onClick={() => void remove(d.id)} aria-label="Delete" className="rounded p-2 text-muted hover:bg-canvas hover:text-bad"><Trash2 size={16} /></button>
            </div>
          </Row>
        ))}

      {notes && <><SectionTitle>Revision notes: {notes.title}</SectionTitle><Panel><Markdown text={notes.text} /></Panel></>}

      <SectionTitle>Ask your notes</SectionTitle>
      <Panel>
        <textarea rows={2} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Ask a question about your documents..." className="border-0 px-1 focus:border-0" />
        <div className="flex justify-end"><Button onClick={ask} loading={asking} disabled={!q.trim()}>Ask</Button></div>
      </Panel>
      {answer && <Panel className="mt-3"><Markdown text={answer.text} />
        {answer.sources.length > 0 && <p className="mt-3 border-t border-line pt-2 text-[13px] text-muted">Sources: {[...new Set(answer.sources.map((s) => `${s.document} (p. ${s.page})`))].join(", ")}</p>}</Panel>}
    </>
  );
}
