import { useAppStore } from "./stores/appStore";

export default function App() {
  const activePhase = useAppStore((s) => s.activePhase);

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className="w-64 border-r bg-white p-4">
        <h1 className="text-xl font-bold">AgentDash</h1>
        <p className="text-sm text-gray-500 mt-1">Phase: {activePhase}</p>
        {/* PhaseStepper will go here */}
      </aside>

      {/* Main content */}
      <main className="flex-1 flex flex-col">
        <div className="flex-1 overflow-auto p-6">
          <p className="text-gray-400">Phase content will render here</p>
        </div>

        {/* Prompt bar */}
        <div className="border-t p-4 bg-white">
          <input
            type="text"
            placeholder="Type your prompt here..."
            className="w-full border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </main>
    </div>
  );
}
