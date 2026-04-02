import clsx from "clsx";
import {
  GENDER_OPTIONS,
  GENDER_PREFERENCE_OPTIONS,
  INTEREST_SUGGESTIONS,
  LANGUAGE_OPTIONS,
  MOOD_OPTIONS,
  REGION_OPTIONS
} from "../constants/options";

export const PreferencePanel = ({
  preferences,
  onUpdatePreferences,
  onStart,
  isSearching,
  darkMode,
  onToggleTheme,
  connectionStatus,
  sessionLink,
  onCreateSessionLink,
  joinToken,
  onJoinTokenChange,
  onJoinByLink
}) => {
  const toggleInterest = (interest) => {
    const exists = preferences.interests.includes(interest);

    const nextInterests = exists
      ? preferences.interests.filter((item) => item !== interest)
      : [...preferences.interests, interest].slice(0, 10);

    onUpdatePreferences({ interests: nextInterests });
  };

  return (
    <aside className="space-y-5 rounded-2xl border border-white/10 bg-white/70 p-4 shadow-glow backdrop-blur-xl dark:bg-ink-900/60">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Profile & Filters</h2>
        <button
          type="button"
          onClick={onToggleTheme}
          className="rounded-lg border border-slate-300 px-3 py-1 text-xs text-slate-700 transition hover:bg-slate-100 dark:border-white/20 dark:text-slate-200 dark:hover:bg-white/10"
        >
          {darkMode ? "Light" : "Dark"} mode
        </button>
      </div>

      <label className="block text-sm text-slate-600 dark:text-slate-300">
        Preferred language
        <select
          value={preferences.language}
          onChange={(event) => onUpdatePreferences({ language: event.target.value })}
          className="mt-1 w-full rounded-xl border border-slate-300 bg-white/80 px-3 py-2 text-sm text-slate-800 outline-none transition focus:border-aqua-400 dark:border-white/15 dark:bg-ink-800/80 dark:text-slate-100"
        >
          {LANGUAGE_OPTIONS.map((item) => (
            <option key={item.value} value={item.value}>
              {item.label}
            </option>
          ))}
        </select>
      </label>

      <div className="grid grid-cols-2 gap-3">
        <label className="block text-sm text-slate-600 dark:text-slate-300">
          Region preference
          <select
            value={preferences.region}
            onChange={(event) => onUpdatePreferences({ region: event.target.value })}
            className="mt-1 w-full rounded-xl border border-slate-300 bg-white/80 px-3 py-2 text-sm text-slate-800 outline-none transition focus:border-aqua-400 dark:border-white/15 dark:bg-ink-800/80 dark:text-slate-100"
          >
            {REGION_OPTIONS.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
        </label>

        <label className="block text-sm text-slate-600 dark:text-slate-300">
          Mood mode
          <select
            value={preferences.mood}
            onChange={(event) => onUpdatePreferences({ mood: event.target.value })}
            className="mt-1 w-full rounded-xl border border-slate-300 bg-white/80 px-3 py-2 text-sm text-slate-800 outline-none transition focus:border-aqua-400 dark:border-white/15 dark:bg-ink-800/80 dark:text-slate-100"
          >
            {MOOD_OPTIONS.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <label className="block text-sm text-slate-600 dark:text-slate-300">
          Your gender
          <select
            value={preferences.gender}
            onChange={(event) => onUpdatePreferences({ gender: event.target.value })}
            className="mt-1 w-full rounded-xl border border-slate-300 bg-white/80 px-3 py-2 text-sm text-slate-800 outline-none transition focus:border-aqua-400 dark:border-white/15 dark:bg-ink-800/80 dark:text-slate-100"
          >
            {GENDER_OPTIONS.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
        </label>

        <label className="block text-sm text-slate-600 dark:text-slate-300">
          Match preference
          <select
            value={preferences.genderPreference}
            onChange={(event) =>
              onUpdatePreferences({ genderPreference: event.target.value })
            }
            className="mt-1 w-full rounded-xl border border-slate-300 bg-white/80 px-3 py-2 text-sm text-slate-800 outline-none transition focus:border-aqua-400 dark:border-white/15 dark:bg-ink-800/80 dark:text-slate-100"
          >
            {GENDER_PREFERENCE_OPTIONS.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <label className="flex items-center justify-between rounded-xl border border-slate-300/70 bg-white/70 px-3 py-2 text-sm text-slate-700 dark:border-white/15 dark:bg-ink-800/70 dark:text-slate-200">
        Voice-only mode
        <input
          type="checkbox"
          checked={preferences.voiceOnly}
          onChange={(event) => onUpdatePreferences({ voiceOnly: event.target.checked })}
          className="h-4 w-4 accent-aqua-400"
        />
      </label>

      <div>
        <p className="mb-2 text-sm text-slate-600 dark:text-slate-300">Interests (for smarter matching)</p>
        <div className="flex flex-wrap gap-2">
          {INTEREST_SUGGESTIONS.map((interest) => {
            const active = preferences.interests.includes(interest);
            return (
              <button
                key={interest}
                type="button"
                onClick={() => toggleInterest(interest)}
                className={clsx(
                  "rounded-full border px-3 py-1 text-xs capitalize transition",
                  active
                    ? "border-aqua-300 bg-aqua-400/25 text-aqua-200"
                    : "border-slate-300/70 text-slate-700 hover:border-aqua-300 dark:border-white/20 dark:text-slate-200"
                )}
              >
                {interest}
              </button>
            );
          })}
        </div>
      </div>

      <button
        type="button"
        onClick={onStart}
        className="w-full rounded-xl bg-aqua-400 px-4 py-2.5 text-sm font-semibold text-ink-950 transition hover:bg-aqua-300 disabled:cursor-not-allowed disabled:opacity-60"
        disabled={connectionStatus === "connecting"}
      >
        {isSearching ? "Searching for match..." : "Start Chat"}
      </button>

      <div className="space-y-2 rounded-xl border border-slate-300/60 p-3 dark:border-white/10">
        <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">Session Link (Invite a Friend)</p>
        <button
          type="button"
          onClick={onCreateSessionLink}
          className="w-full rounded-lg border border-aqua-400/50 bg-aqua-400/20 px-3 py-2 text-xs font-semibold text-slate-900 transition hover:bg-aqua-400/30 dark:text-slate-100"
        >
          Create Temporary Link
        </button>
        {sessionLink && (
          <p className="rounded-lg bg-slate-100/80 px-2 py-1 text-[11px] text-slate-600 dark:bg-ink-800/70 dark:text-slate-300">
            {sessionLink}
          </p>
        )}
        <div className="flex gap-2">
          <input
            value={joinToken}
            onChange={(event) => onJoinTokenChange(event.target.value)}
            placeholder="Paste token or full link"
            className="w-full rounded-lg border border-slate-300 bg-white/80 px-2 py-1.5 text-xs text-slate-700 outline-none focus:border-aqua-400 dark:border-white/15 dark:bg-ink-800/80 dark:text-slate-100"
          />
          <button
            type="button"
            onClick={onJoinByLink}
            className="rounded-lg border border-white/20 px-3 py-1.5 text-xs text-slate-700 transition hover:bg-white dark:text-slate-200 dark:hover:bg-white/10"
          >
            Join
          </button>
        </div>
      </div>
    </aside>
  );
};
