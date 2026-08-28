export function GoogleAuthEntry({ register = false }: { register?: boolean }) {
  return (
    <a
      href="/api/auth/google"
      className="fixed right-5 top-5 z-50 flex h-11 items-center gap-2 rounded-2xl border border-white/15 bg-slate-950/80 px-4 text-sm font-semibold text-white shadow-2xl shadow-black/30 backdrop-blur-xl transition hover:border-cyan-300/40 hover:bg-slate-900 sm:right-8 sm:top-8"
    >
      <span className="flex size-6 items-center justify-center rounded-full bg-white font-bold text-slate-900">G</span>
      {register ? 'Sign up with Google' : 'Continue with Google'}
    </a>
  );
}
