import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export function AdminModulePlaceholder({ title }: { title: string }) {
  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-semibold">{title}</h2>
        <p className="text-sm text-vvisa-text-muted">This module is reserved for the next implementation phase.</p>
      </div>
      <Card className="rounded-lg border-vvisa-border-subtle">
        <CardHeader><CardTitle>Production Guardrail</CardTitle></CardHeader>
        <CardContent className="text-sm text-vvisa-text-secondary">
          Writes for this area remain disabled until preview, confirmation, permission checks, and audit events are fully wired.
        </CardContent>
      </Card>
    </div>
  );
}
