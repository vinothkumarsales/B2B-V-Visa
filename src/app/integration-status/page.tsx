type IntegrationStatusPageProps = {
  searchParams?: Promise<{
    provider?: string;
    status?: string;
    reason?: string;
  }>;
};

export default async function IntegrationStatusPage({ searchParams }: IntegrationStatusPageProps) {
  const params = await searchParams;
  const provider = params?.provider === 'zoho' ? 'Zoho' : 'Integration';
  const isSuccess = params?.status === 'success';
  const reason = params?.reason ?? 'unknown';

  return (
    <main className="min-h-screen bg-[hsl(var(--background))] px-6 py-16 text-[hsl(var(--foreground))]">
      <section className="mx-auto max-w-xl rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-8 shadow-sm">
        <p className="text-sm font-medium uppercase tracking-[0.16em] text-[hsl(var(--muted-foreground))]">
          {provider} OAuth
        </p>
        <h1 className="mt-3 text-3xl font-semibold">
          {isSuccess ? 'Authorization captured' : 'Authorization needs attention'}
        </h1>
        <p className="mt-4 text-sm leading-6 text-[hsl(var(--muted-foreground))]">
          {isSuccess
            ? 'The authorization code was exchanged immediately. The refresh token was stored in the local runtime handoff file and was not displayed in the browser.'
            : 'The authorization flow could not be completed. The reason below is safe to share with the implementation team.'}
        </p>
        <div className="mt-6 rounded-lg bg-[hsl(var(--muted))] px-4 py-3 font-mono text-sm">
          {reason}
        </div>
      </section>
    </main>
  );
}
