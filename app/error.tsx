"use client";

import { Button } from "@/components/ui/button";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="container mx-auto flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
      <h1 className="text-4xl font-bold text-foreground">
        Ndodhi nje gabim / An error occurred
      </h1>
      <p className="mt-4 max-w-md text-muted-foreground">
        {error.message || "Dicka shkoi keq. Ju lutem provoni perseri."}
      </p>
      <Button onClick={reset} className="mt-8" size="lg">
        Provo perseri / Try again
      </Button>
    </div>
  );
}
