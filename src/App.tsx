import { Toaster } from "sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppShell } from "@/components/layout/AppShell";
import { preloadPoseModel } from "@/hooks/usePoseDetection";

// Start loading the MediaPipe model immediately on app start
preloadPoseModel();

function App() {
  return (
    <TooltipProvider>
      <AppShell />
      <Toaster position="bottom-right" />
    </TooltipProvider>
  );
}

export default App;
