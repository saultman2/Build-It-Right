import { Link } from "wouter";
import { Button } from "@/components/ui/button";

export default function Landing() {
  return (
    <div className="flex flex-col min-h-[100dvh] bg-background">
      <header className="px-6 h-16 flex items-center justify-between border-b">
        <div className="flex items-center gap-2">
          <img src={`${import.meta.env.BASE_URL.replace(/\/$/, "")}/logo.svg`} alt="BuildPro" className="w-8 h-8" />
          <span className="text-xl font-bold">BuildPro</span>
        </div>
        <nav className="flex items-center gap-4">
          <Link href="/sign-in" className="text-sm font-medium hover:text-primary transition-colors">
            Sign In
          </Link>
          <Link href="/sign-up">
            <Button>Get Started</Button>
          </Link>
        </nav>
      </header>
      
      <main className="flex-1">
        <section className="py-24 px-6 md:px-12 text-center max-w-4xl mx-auto">
          <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-8">
            Run your contracting business from the job site.
          </h1>
          <p className="text-xl text-muted-foreground mb-10 max-w-2xl mx-auto">
            Estimates, invoices, job tracking, and photos—all in one place. Built for the trades, accessible everywhere.
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <Link href="/sign-up">
              <Button size="lg" className="w-full sm:w-auto text-lg h-14 px-8">
                Start for free
              </Button>
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}
