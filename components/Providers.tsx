"use client";

import { ThemeProvider } from "@/components/ThemeProvider";
import { LanguageProvider } from "@/components/LanguageProvider";
import { TenderDataProvider } from "@/components/TenderDataProvider";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <LanguageProvider>
        <TenderDataProvider>
          {children}
        </TenderDataProvider>
      </LanguageProvider>
    </ThemeProvider>
  );
}
