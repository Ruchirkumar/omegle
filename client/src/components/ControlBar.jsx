import { AlertTriangle, Languages, RefreshCw, SkipForward, ThumbsDown, ThumbsUp } from "lucide-react";
import { QUICK_REACTIONS } from "../constants/options";

export const ControlBar = ({
  onNext,
  onReport,
  onReconnect,
  onToggleSubtitles,
  subtitlesEnabled,
  subtitlesSupported,
  listening,
  disabled,
  onSendReaction,
  onRate,
  voiceOnly
}) => {
  return (
    <div className="space-y-2">
      <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
        <button
          type="button"
          onClick={onNext}
          disabled={disabled}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/80 px-3 py-2 text-sm text-slate-800 transition hover:bg-white dark:bg-ink-900/70 dark:text-slate-100 dark:hover:bg-ink-900 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <SkipForward className="h-4 w-4" /> Next
        </button>

        <button
          type="button"
          onClick={onReport}
          disabled={disabled}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-rose-300/50 bg-rose-500/15 px-3 py-2 text-sm text-rose-100 transition hover:bg-rose-500/25 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <AlertTriangle className="h-4 w-4" /> Report
        </button>

        <button
          type="button"
          onClick={() => onRate(1)}
          disabled={disabled}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-emerald-300/50 bg-emerald-500/15 px-3 py-2 text-sm text-emerald-100 transition hover:bg-emerald-500/25 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <ThumbsUp className="h-4 w-4" /> Rate +
        </button>

        <button
          type="button"
          onClick={() => onRate(-1)}
          disabled={disabled}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-amber-300/50 bg-amber-500/15 px-3 py-2 text-sm text-amber-100 transition hover:bg-amber-500/25 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <ThumbsDown className="h-4 w-4" /> Rate -
        </button>
      </div>

      <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
        <button
          type="button"
          onClick={onReconnect}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/80 px-3 py-2 text-sm text-slate-800 transition hover:bg-white dark:bg-ink-900/70 dark:text-slate-100 dark:hover:bg-ink-900"
        >
          <RefreshCw className="h-4 w-4" /> Reconnect
        </button>

        <button
          type="button"
          onClick={onToggleSubtitles}
          disabled={!subtitlesSupported || disabled}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/80 px-3 py-2 text-sm text-slate-800 transition hover:bg-white dark:bg-ink-900/70 dark:text-slate-100 dark:hover:bg-ink-900 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <Languages className="h-4 w-4" />
          {subtitlesEnabled ? (listening ? "Subtitles On" : "Starting...") : "Subtitles Off"}
        </button>

        <div className="col-span-2 flex items-center justify-between rounded-xl border border-white/15 bg-white/80 px-3 py-2 text-xs text-slate-700 dark:bg-ink-900/70 dark:text-slate-200">
          <span>{voiceOnly ? "Voice-only mode" : "Video + audio mode"}</span>
          <div className="flex gap-1">
            {QUICK_REACTIONS.map((emoji) => (
              <button
                key={emoji}
                type="button"
                onClick={() => onSendReaction(emoji)}
                disabled={disabled}
                className="rounded-md border border-white/20 px-1.5 py-0.5 text-sm transition hover:bg-white/70 dark:hover:bg-white/10 disabled:opacity-40"
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
