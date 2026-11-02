import { Navigate, Route, Routes } from "react-router-dom";
import Layout from "./components/Layout";
import { Spinner } from "./components/ui";
import { useAuth } from "./lib/auth";
import Agents from "./pages/Agents";
import Home from "./pages/Home";
import Login from "./pages/Login";
import Materials from "./pages/Materials";
import Planner from "./pages/Planner";
import Progress from "./pages/Progress";
import Quiz from "./pages/Quiz";
import Tutor from "./pages/Tutor";

export default function App() {
  const { user, loading } = useAuth();
  if (loading) return <div className="p-8"><Spinner /></div>;
  if (!user) return <Routes><Route path="*" element={<Login />} /></Routes>;
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Home />} />
        <Route path="tutor" element={<Tutor />} />
        <Route path="agents" element={<Agents />} />
        <Route path="materials" element={<Materials />} />
        <Route path="quiz" element={<Quiz />} />
        <Route path="planner" element={<Planner />} />
        <Route path="progress" element={<Progress />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
