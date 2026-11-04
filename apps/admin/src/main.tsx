import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Navigate, Route, Routes } from "react-router";
import { AuthProvider } from "./auth";
import { Layout } from "./components/Layout";
import { LoginPage } from "./pages/LoginPage";
import { NpcPage } from "./pages/NpcPage";
import { StudentsPage } from "./pages/StudentsPage";
import { WorldPage } from "./pages/WorldPage";
import { WorldsPage } from "./pages/WorldsPage";
import "./styles.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <AuthProvider>
      <BrowserRouter basename="/admin">
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route element={<Layout />}>
            <Route index element={<Navigate to="/alunos" replace />} />
            <Route path="/alunos" element={<StudentsPage />} />
            <Route path="/mundos" element={<WorldsPage />} />
            <Route path="/mundos/:worldId" element={<WorldPage />} />
            <Route path="/mundos/:worldId/npcs/:npcId" element={<NpcPage />} />
          </Route>
          <Route path="*" element={<Navigate to="/alunos" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  </StrictMode>,
);
