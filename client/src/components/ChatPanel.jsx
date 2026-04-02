import { SendHorizontal, Sparkles } from "lucide-react";

const formatTime = (timestamp) => {
  if (!timestamp) {
    return "";
  }

  return new Date(timestamp).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit"
  });
};

export const ChatPanel = ({
  messages,
  messageInput,
  onMessageInput,
  onSendMessage,
  partnerTyping,
  partnerLanguage,
  icebreakerSuggestions,
  onUseIcebreaker,
  sessionSummary
}) => {
  return (
    <section className="flex h-full flex-col overflow-hidden rounded-2xl border border-white/10 bg-white/70 shadow-glow backdrop-blur-xl dark:bg-ink-900/60">
      <header className="border-b border-slate-200/70 px-4 py-3 dark:border-white/10">
        <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">Anonymous Chat</p>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Partner language: {partnerLanguage || "unknown"}
        </p>
      </header>

      <div className="flex-1 space-y-3 overflow-y-auto px-4 py-3">
        {sessionSummary && (
          <div className="rounded-xl border border-aqua-300/40 bg-aqua-300/15 p-2 text-xs text-slate-700 dark:text-slate-200">
            <span className="font-semibold">Session summary:</span> {sessionSummary}
          </div>
        )}

        {icebreakerSuggestions?.length > 0 && (
          <div className="rounded-xl border border-fuchsia-300/40 bg-fuchsia-300/10 p-2">
            <div className="mb-1 inline-flex items-center gap-1 text-xs font-semibold text-fuchsia-600 dark:text-fuchsia-300">
              <Sparkles className="h-3 w-3" /> AI Icebreakers
            </div>
            <div className="space-y-1">
              {icebreakerSuggestions.map((suggestion) => (
                <button
                  key={suggestion}
                  type="button"
                  onClick={() => onUseIcebreaker(suggestion)}
                  className="block w-full rounded-lg border border-fuchsia-300/35 bg-white/70 px-2 py-1 text-left text-xs text-slate-700 transition hover:bg-fuchsia-50 dark:bg-ink-800/70 dark:text-slate-200 dark:hover:bg-fuchsia-500/10"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.length === 0 && (
          <p className="rounded-xl border border-dashed border-slate-300/70 p-3 text-xs text-slate-500 dark:border-white/15 dark:text-slate-400">
            Messages will appear here with original and translated text.
          </p>
        )}

        {messages.map((message) => (
          <div
            key={message.id}
            className={`animate-slideUp rounded-xl p-3 text-sm ${
              message.isSelf
                ? "ml-8 bg-aqua-400/20 text-slate-900 dark:text-slate-100"
                : "mr-8 bg-slate-100/90 text-slate-900 dark:bg-ink-800 dark:text-slate-100"
            }`}
          >
            <p>{message.originalText}</p>
            {message.translatedText && message.translatedText !== message.originalText && (
              <p className="mt-1 text-xs text-aqua-500 dark:text-aqua-300">
                {message.translatedText}
              </p>
            )}
            <div className="mt-2 text-[10px] uppercase tracking-wide text-slate-500 dark:text-slate-400">
              {message.sourceLanguage}
              {" -> "}
              {message.targetLanguage || "self"} | {formatTime(message.sentAt)}
            </div>
          </div>
        ))}

        {partnerTyping && <p className="text-xs text-slate-500 dark:text-slate-400">Stranger is typing...</p>}
      </div>

      <form
        onSubmit={(event) => {
          event.preventDefault();
          onSendMessage();
        }}
        className="border-t border-slate-200/70 p-3 dark:border-white/10"
      >
        <div className="flex items-center gap-2">
          <input
            value={messageInput}
            onChange={(event) => onMessageInput(event.target.value)}
            placeholder="Type a message..."
            className="flex-1 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 outline-none transition focus:border-aqua-400 dark:border-white/15 dark:bg-ink-800 dark:text-slate-100"
          />
          <button
            type="submit"
            className="rounded-xl bg-aqua-400 p-2 text-ink-950 transition hover:bg-aqua-300"
          >
            <SendHorizontal className="h-4 w-4" />
          </button>
        </div>
      </form>
    </section>
  );
};
