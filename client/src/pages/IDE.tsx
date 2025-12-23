import { IDELayout } from "@/components/ide/Layout";
import { UIModeProvider } from "@/hooks/useUIMode";
import { ThemeProvider } from "@/components/ide/ThemeProvider";

export default function IDEPage() {
  return (
    <UIModeProvider>
      <ThemeProvider>
        <IDELayout />
      </ThemeProvider>
    </UIModeProvider>
  );
}
