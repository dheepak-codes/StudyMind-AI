import { GraduationCap } from "lucide-react";
import { useState, type FormEvent } from "react";
import { Button, ErrorText } from "../components/ui";
import { errMsg } from "../lib/hooks";
import { useAuth } from "../lib/auth";

export default function Login() {
  const { signIn, signUp } = useAuth();
  const [mode, setMode] = useState<"in" | "up">("in");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError("");
    if (mode === "up" && password.length < 8) return setError("Password must be at least 8 characters.");
    setBusy(true);
    try {
      if (mode === "in") await signIn(email, password);
      else await signUp(email, name, password);
    } catch (err) {
      setError(errMsg(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <form onSubmit={submit} className="w-full max-w-sm space-y-4 rounded-xl border border-line bg-surface p-6">
        <div className="flex items-center gap-2 font-semibold"><GraduationCap className="text-accent" /> StudyMind AI</div>
        <div>
          <h1 className="text-2xl font-semibold">{mode === "in" ? "Welcome back" : "Create your account"}</h1>
          <p className="text-sm text-muted">Your AI study workspace.</p>
        </div>
        {mode === "up" && <input required placeholder="Your name" value={name} onChange={(e) => setName(e.target.value)} />}
        <input required type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
        <input required type="password" placeholder="Password (8+ characters)" value={password} onChange={(e) => setPassword(e.target.value)} />
        <ErrorText message={error} />
        <Button type="submit" loading={busy} className="w-full">{mode === "in" ? "Sign in" : "Sign up"}</Button>
        <button type="button" className="w-full text-center text-sm text-muted hover:text-ink" onClick={() => { setMode(mode === "in" ? "up" : "in"); setError(""); }}>
          {mode === "in" ? "No account? Sign up" : "Have an account? Sign in"}
        </button>
      </form>
    </div>
  );
}
