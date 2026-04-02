import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

const initialPreferences = {
  interests: ["coding"],
  language: "en",
  region: "any",
  gender: "any",
  genderPreference: "any",
  mood: "fun",
  voiceOnly: false
};

export const useChatStore = create(
  persist(
    (set, get) => ({
      sessionId: "",
      socketId: "",
      connectionStatus: "disconnected",
      statusText: "Welcome. Configure preferences and start chatting.",
      inQueue: false,
      roomId: null,
      chatStartedAt: null,
      partner: null,
      partnerConnected: false,
      messages: [],
      reactions: [],
      partnerTyping: false,
      latestSubtitle: null,
      icebreakerSuggestions: [],
      activeSessionSummary: null,
      sessionLink: null,
      preferences: initialPreferences,
      sessionHistory: [],
      darkMode: true,

      setSessionId: (sessionId) => set({ sessionId }),
      setSocketId: (socketId) => set({ socketId }),
      setConnectionStatus: (connectionStatus) => set({ connectionStatus }),
      setStatusText: (statusText) => set({ statusText }),
      setQueueState: (inQueue) => set({ inQueue }),
      setPartnerConnected: (partnerConnected) => set({ partnerConnected }),
      setSessionLink: (sessionLink) => set({ sessionLink }),
      setActiveSessionSummary: (activeSessionSummary) => set({ activeSessionSummary }),

      setPartnerMatch: ({ roomId, partner, history = [], startedAt }) => {
        set({
          roomId,
          chatStartedAt: startedAt || Date.now(),
          partner,
          inQueue: false,
          partnerConnected: true,
          partnerTyping: false,
          latestSubtitle: null,
          icebreakerSuggestions: [],
          activeSessionSummary: null,
          reactions: [],
          messages: history.map((message) => ({
            ...message,
            translatedText: message.translatedText || message.originalText,
            isSelf: message.senderSocketId === get().socketId
          }))
        });
      },

      setMessages: (messages) => set({ messages }),
      addMessage: (message) =>
        set((state) => ({
          messages: [...state.messages, message].slice(-200)
        })),

      addReaction: (reaction) =>
        set((state) => ({
          reactions: [...state.reactions, reaction].slice(-16)
        })),

      pruneReactions: () =>
        set((state) => {
          const cutoff = Date.now() - 3500;
          return {
            reactions: state.reactions.filter((reaction) => reaction.createdAt > cutoff)
          };
        }),

      setIcebreakerSuggestions: (icebreakerSuggestions = []) =>
        set({ icebreakerSuggestions }),

      setPartnerTyping: (partnerTyping) => set({ partnerTyping }),
      setLatestSubtitle: (latestSubtitle) => set({ latestSubtitle }),

      updatePreferences: (updates) =>
        set((state) => ({
          preferences: {
            ...state.preferences,
            ...updates
          }
        })),

      toggleDarkMode: () => set((state) => ({ darkMode: !state.darkMode })),

      archiveCurrentSession: (reason = "next") => {
        const state = get();

        if (!state.roomId || state.messages.length === 0) {
          return;
        }

        const nextHistory = [
          {
            id: state.roomId,
            partnerAlias: state.partner?.alias || "Stranger",
            reason,
            summary: state.activeSessionSummary,
            endedAt: Date.now(),
            messages: state.messages
          },
          ...state.sessionHistory
        ].slice(0, 10);

        set({ sessionHistory: nextHistory });
      },

      resetCurrentMatch: () =>
        set({
          roomId: null,
          chatStartedAt: null,
          partner: null,
          partnerConnected: false,
          messages: [],
          reactions: [],
          partnerTyping: false,
          latestSubtitle: null,
          icebreakerSuggestions: [],
          activeSessionSummary: null
        })
    }),
    {
      name: "omegle-next-session",
      storage: createJSONStorage(() => sessionStorage),
      partialize: (state) => ({
        sessionId: state.sessionId,
        preferences: state.preferences,
        sessionHistory: state.sessionHistory,
        darkMode: state.darkMode
      })
    }
  )
);
