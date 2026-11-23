// One place that talks to the backend. Pages never call fetch() directly.
const BASE = ((import.meta.env.VITE_API_URL as string | undefined) ?? "").replace(/\/$/, "");
const KEY = "studymind_token";

export const getToken = () => localStorage.getItem(KEY);
export const setToken = (t: string | null) => (t ? localStorage.setItem(KEY, t) : localStorage.removeItem(KEY));

export class ApiError extends Error {
  constructor(message: string, public status: number) {
    super(message);
  }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  const token = getToken();
  if (token) headers.set("Authorization", `Bearer ${token}`);
  if (typeof init.body === "string") headers.set("Content-Type", "application/json");

  let res: Response;
  try {
    res = await fetch(`${BASE}${path}`, { ...init, headers });
  } catch {
    throw new ApiError("Can't reach the server. Is the backend running?", 0);
  }
  if (res.status === 401 && token) {
    setToken(null);
    window.dispatchEvent(new Event("auth:logout")); // session expired -> back to login
  }
  if (!res.ok) {
    let msg = `Request failed (${res.status})`;
    try {
      const body = await res.json();
      if (typeof body.detail === "string") msg = body.detail;
      else if (Array.isArray(body.detail)) msg = body.detail.map((d: { msg: string }) => d.msg).join("; ");
    } catch { /* keep default message */ }
    throw new ApiError(msg, res.status);
  }
  return res.status === 204 ? (undefined as T) : ((await res.json()) as T);
}

const post = <T>(path: string, body: unknown) => request<T>(path, { method: "POST", body: JSON.stringify(body) });

export interface User { id: number; email: string; name: string }
export interface Doc { id: number; title: string; file_type: string; status: string; error: string | null; pages: number; passages: number; created_at: string }
export interface Source { document: string; page: number; score: number }
export interface ChatMsg { role: "user" | "assistant"; content: string }
export interface QuizQ { question: string; options: string[] }
export interface Quiz { quiz_id: number; topic: string; questions: QuizQ[] }
export interface QuizResult { score: number; total: number; results: { correct: boolean; your_answer: number; correct_index: number; explanation: string }[] }
export interface Task { id: number; plan: string; day: string; task: string; kind: string; minutes: number; done: boolean }
export interface AgentStep { agent: string; status: "done" | "failed"; seconds: number; error?: string }
export interface AgentResult {
  steps: AgentStep[]; failed?: boolean; plan?: { agents: string[]; topic: string }; sources?: Source[];
  explanation?: string; study_plan?: string;
  quiz?: { question: string; options: string[]; answer_index: number; explanation: string }[];
}
export interface Progress {
  sessions: number; documents: number; quizzes_taken: number; average_quiz_score: number | null;
  tasks_total: number; tasks_done: number;
  recent_quizzes: { topic: string; score: number; total: number; at: string }[];
  recent_activity: { kind: string; title: string; at: string }[];
}

export const api = {
  register: (email: string, name: string, password: string) => post<{ access_token: string }>("/api/auth/register", { email, name, password }),
  login: (email: string, password: string) => post<{ access_token: string }>("/api/auth/login", { email, password }),
  me: () => request<User>("/api/auth/me"),
  chat: (messages: ChatMsg[]) => post<{ reply: string }>("/api/tutor/chat", { messages }),
  docs: () => request<Doc[]>("/api/documents"),
  upload: (file: File) => { const f = new FormData(); f.append("file", file); return request<Doc>("/api/documents", { method: "POST", body: f }); },
  deleteDoc: (id: number) => request<void>(`/api/documents/${id}`, { method: "DELETE" }),
  ask: (question: string, document_ids?: number[]) => post<{ answer: string; sources: Source[] }>("/api/documents/ask", { question, document_ids }),
  summary: (id: number) => post<{ document: string; notes: string; truncated: boolean }>(`/api/documents/${id}/summary`, {}),
  generateQuiz: (b: { topic: string; document_id?: number; difficulty: string; num_questions: number }) => post<Quiz>("/api/quizzes/generate", b),
  submitQuiz: (id: number, answers: number[]) => post<QuizResult>(`/api/quizzes/${id}/submit`, { answers }),
  generatePlan: (b: { subjects: string; exam_date: string; hours_per_day: number; session_minutes: number }) => post<Task[]>("/api/planner/generate", b),
  tasks: () => request<Task[]>("/api/planner/tasks"),
  setTask: (id: number, done: boolean) => request<Task>(`/api/planner/tasks/${id}`, { method: "PATCH", body: JSON.stringify({ done }) }),
  runAgents: (request_: string) => post<AgentResult>("/api/agents/run", { request: request_ }),
  progress: () => request<Progress>("/api/progress"),
};
