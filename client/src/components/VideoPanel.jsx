import { useEffect, useRef } from "react";
import clsx from "clsx";

export const VideoPanel = ({
  title,
  stream,
  subtitle,
  muted = false,
  status = "idle",
  voiceOnly = false,
  reactions = []
}) => {
  const videoRef = useRef(null);

  useEffect(() => {
    if (!videoRef.current) {
      return;
    }

    videoRef.current.srcObject = stream || null;
  }, [stream]);

  const hasVideoTrack = Boolean(stream?.getVideoTracks?.().length);
  const shouldShowVideo = hasVideoTrack && !voiceOnly;

  return (
    <section className="relative overflow-hidden rounded-2xl border border-white/10 bg-slate-950/95 shadow-glow">
      <div className="absolute left-3 top-3 z-10 flex items-center gap-2 rounded-full bg-black/40 px-3 py-1 text-xs text-white backdrop-blur-sm">
        <span
          className={clsx(
            "inline-block h-2 w-2 rounded-full",
            status === "connected"
              ? "bg-emerald-400"
              : status === "connecting"
                ? "bg-amber-300 animate-pulseSoft"
                : "bg-slate-500"
          )}
        />
        {title}
      </div>

      {shouldShowVideo ? (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted={muted}
          className="h-72 w-full object-cover md:h-80"
        />
      ) : (
        <div className="flex h-72 w-full items-center justify-center bg-gradient-to-br from-slate-900 to-slate-950 md:h-80">
          <div className="rounded-xl border border-white/20 bg-black/35 px-4 py-3 text-center text-sm text-slate-200">
            {voiceOnly ? "Voice-only mode enabled" : "Waiting for video stream..."}
          </div>
          <video ref={videoRef} autoPlay playsInline muted={muted} className="hidden" />
        </div>
      )}

      {reactions.map((reaction) => (
        <div
          key={reaction.id}
          className={clsx(
            "pointer-events-none absolute bottom-12 animate-slideUp text-3xl",
            reaction.isSelf ? "right-6" : "left-6"
          )}
        >
          {reaction.emoji}
        </div>
      ))}

      {subtitle && subtitle.originalText && (
        <div className="absolute bottom-3 left-3 right-3 rounded-xl bg-black/55 px-3 py-2 text-xs text-slate-100 backdrop-blur-sm md:text-sm">
          <p>{subtitle.originalText}</p>
          {subtitle.translatedText && subtitle.translatedText !== subtitle.originalText && (
            <p className="mt-1 text-aqua-300">{subtitle.translatedText}</p>
          )}
        </div>
      )}
    </section>
  );
};
