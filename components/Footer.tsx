"use client";

import { useLanguage } from "@/components/LanguageProvider";
import { t } from "@/lib/i18n";

export function Footer() {
  const { locale } = useLanguage();
  const strings = t[locale];

  return (
    <footer className="border-t border-border bg-card/50 px-4 py-8">
      <div className="container mx-auto flex flex-col items-center gap-4 text-center sm:flex-row sm:justify-between sm:text-left">
        <div>
          <p className="text-sm font-medium text-foreground">
            Transparenca24 &middot; LLogaria AL
          </p>
          <p className="mt-1 text-xs text-muted-foreground">{strings.footer}</p>
        </div>
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <a
            href="https://openprocurement.al"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-primary transition-colors"
          >
            openprocurement.al
          </a>
          <span>&middot;</span>
          <a
            href="https://open.data.al"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-primary transition-colors"
          >
            open.data.al
          </a>
        </div>
      </div>
    </footer>
  );
}
