import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="container mx-auto flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
      <h1 className="text-6xl font-bold text-primary">404</h1>
      <h2 className="mt-4 text-2xl font-semibold text-foreground">
        Faqja nuk u gjet / Page not found
      </h2>
      <p className="mt-2 text-muted-foreground">
        Faqja qe kerkoni nuk ekziston. / The page you are looking for does not exist.
      </p>
      <Button asChild className="mt-8" size="lg">
        <Link href="/">Kthehu ne fillim / Go home</Link>
      </Button>
    </div>
  );
}
