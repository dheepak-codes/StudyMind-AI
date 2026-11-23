import { Loader2 } from "lucide-react";
import { Fragment, type ButtonHTMLAttributes, type ReactNode } from "react";

type BtnProps = ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "ghost"; loading?: boolean };

export function Button({ variant = "primary", loading, children, className = "", disabled, ...rest }: BtnProps) {
  const style = variant === "primary" ? "bg-accent text-white hover:opacity-90" : "border border-line bg-surface hover:bg-canvas";
  return (
    <button {...rest} disabled={disabled || loading}
      className={`inline-flex h-9 items-center justify-center gap-2 rounded-lg px-4 text-sm font-medium transition disabled:opacity-50 ${style} ${className}`}>
      {loading && <Loader2 size={14} className="animate-spin" />}
      {children}
    </button>
  );
}

export function PageHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="mb-6">
      <h1 className="text-[28px] font-semibold leading-tight tracking-tight">{title}</h1>
      {subtitle && <p className="mt-1 text-muted">{subtitle}</p>}
    </div>
  );
}

export const ErrorText = ({ message }: { message: string }) => (message ? <p role="alert" className="my-2 text-sm text-bad">{message}</p> : null);
export const EmptyState = ({ children }: { children: ReactNode }) => <div className="py-6 text-sm text-muted">{children}</div>;
export const Spinner = () => <div className="flex items-center gap-2 py-6 text-sm text-muted"><Loader2 size={16} className="animate-spin" /> Loading…</div>;
export const Panel = ({ children, className = "" }: { children: ReactNode; className?: string }) => (
  <div className={`rounded-xl border border-line bg-surface p-4 ${className}`}>{children}</div>
);
export const SectionTitle = ({ children }: { children: ReactNode }) => <h2 className="mb-2 mt-8 text-lg font-semibold">{children}</h2>;
export const Row = ({ children }: { children: ReactNode }) => (
  <div className="flex items-center justify-between gap-3 border-b border-line py-3 last:border-0">{children}</div>
);

/** Small safe Markdown renderer (headings, lists, **bold**, `code`, code blocks). No raw HTML is ever injected. */
function inline(text: string): ReactNode[] {
  return text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g).map((p, i) => {
    if (p.length > 4 && p.startsWith("**") && p.endsWith("**")) return <strong key={i}>{p.slice(2, -2)}</strong>;
    if (p.length > 2 && p.startsWith("`") && p.endsWith("`")) return <code key={i} className="rounded bg-canvas px-1 text-[13px]">{p.slice(1, -1)}</code>;
    return p;
  });
}

export function Markdown({ text }: { text: string }) {
  return (
    <div className="space-y-2 break-words leading-relaxed">
      {text.split("```").map((block, i) =>
        i % 2 === 1 ? (
          <pre key={i} className="overflow-x-auto rounded-lg border border-line bg-canvas p-3 text-[13px]"><code>{block.replace(/^\w*\n/, "")}</code></pre>
        ) : (
          <Fragment key={i}>{block.split("\n").map((line, j) => {
            const h = line.match(/^#{1,4}\s+(.*)/);
            const li = line.match(/^\s*(?:[-*]|\d+[.)])\s+(.*)/);
            if (h) return <p key={`${i}-${j}`} className="pt-1 font-semibold">{inline(h[1])}</p>;
            if (li) return <div key={`${i}-${j}`} className="flex gap-2 pl-1"><span className="text-muted">•</span><span>{inline(li[1])}</span></div>;
            return line.trim() ? <p key={`${i}-${j}`}>{inline(line)}</p> : null;
          })}</Fragment>
        )
      )}
    </div>
  );
}
