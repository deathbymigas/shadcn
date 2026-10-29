import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

const tokens = [
  "background", "foreground", "primary", "secondary", "muted",
  "accent", "destructive", "border", "ring",
];

export default function Home() {
  return (
    <main className="min-h-screen bg-background text-foreground p-8 space-y-8 max-w-4xl mx-auto">
      <header className="space-y-2">
        <Badge variant="secondary">shadcn pipeline</Badge>
        <h1 className="text-3xl font-bold tracking-tight">Design tokens & components</h1>
        <p className="text-muted-foreground">
          Tokens flow from <code>tokens/tokens.json</code> (Figma variables) into CSS vars via{" "}
          <code>pnpm tokens:build</code>. Edit the JSON, rebuild, refresh.
        </p>
      </header>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">Components</h2>
        <div className="flex flex-wrap gap-3">
          <Button>Primary</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="outline">Outline</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="destructive">Destructive</Button>
        </div>
        <Card className="max-w-sm">
          <CardHeader>
            <CardTitle>Card</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1">
              <Label htmlFor="email">Email</Label>
              <Input id="email" placeholder="you@example.com" />
            </div>
            <Button className="w-full">Submit</Button>
          </CardContent>
        </Card>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">Color tokens</h2>
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
          {tokens.map((t) => (
            <div key={t} className="space-y-1">
              <div
                className="h-12 rounded-md border border-border"
                style={{ backgroundColor: `var(--${t})` }}
              />
              <p className="text-xs text-muted-foreground font-mono">--{t}</p>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}