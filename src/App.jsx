import { useState } from "react";
import { AppProvider } from "./context/AppContext";
import { ToastProvider } from "./components/Toast";
import { Overview } from "./views/Overview";
import { BoardView } from "./views/BoardView";

function AppContent() {
  const [activeProject, setActiveProject] = useState(null);

  if (activeProject) {
    return (
      <BoardView
        projectId={activeProject}
        onBack={() => setActiveProject(null)}
      />
    );
  }
  return <Overview onOpenProject={setActiveProject} />;
}

export default function App() {
  return (
    <ToastProvider>
      <AppProvider>
        <AppContent />
      </AppProvider>
    </ToastProvider>
  );
}
