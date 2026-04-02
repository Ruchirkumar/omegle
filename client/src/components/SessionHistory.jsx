const formatDateTime = (timestamp) =>
  new Date(timestamp).toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });

export const SessionHistory = ({ sessionHistory }) => {
  if (!sessionHistory.length) {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/70 p-4 text-xs text-slate-500 shadow-glow backdrop-blur-xl dark:bg-ink-900/60 dark:text-slate-400">
        Session history will appear here after you press Next or a match ends.
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-white/70 p-4 shadow-glow backdrop-blur-xl dark:bg-ink-900/60">
      <h3 className="mb-3 text-sm font-semibold text-slate-800 dark:text-slate-100">Session History</h3>
      <div className="space-y-3">
        {sessionHistory.map((session) => (
          <article key={session.id} className="rounded-xl border border-slate-300/60 p-3 text-xs dark:border-white/10">
            <p className="font-medium text-slate-700 dark:text-slate-200">{session.partnerAlias}</p>
            <p className="mt-1 text-slate-500 dark:text-slate-400">
              Ended: {formatDateTime(session.endedAt)} ({session.reason})
            </p>
            <p className="mt-1 text-slate-500 dark:text-slate-400">Messages: {session.messages.length}</p>
            {session.summary && (
              <p className="mt-1 text-slate-500 dark:text-slate-300">Summary: {session.summary}</p>
            )}
          </article>
        ))}
      </div>
    </div>
  );
};
