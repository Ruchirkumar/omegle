const MOOD_ICEBREAKERS = {
  fun: [
    "What is your comfort comedy movie?",
    "If you could teleport anywhere right now, where would you go?",
    "What random skill would you learn just for fun?"
  ],
  deep: [
    "What value has shaped most of your life choices?",
    "What is something you changed your mind about recently?",
    "What does a meaningful life look like to you?"
  ],
  dating: [
    "What is your idea of a perfect first date?",
    "What personality trait do you admire most?",
    "Do you prefer planned dates or spontaneous ones?"
  ]
};

const CULTURAL_BY_REGION = {
  asia: [
    "Which festival in your region should everyone experience once?",
    "What local food do you recommend to first-time visitors?"
  ],
  europe: [
    "What cultural tradition from your country do you love most?",
    "Which city in Europe feels most underrated to you?"
  ],
  "north-america": [
    "What local community event is popular where you live?",
    "What food spot would you show a traveler first?"
  ],
  "south-america": [
    "Which celebration in your region feels the most vibrant?",
    "What music genre best represents your city?"
  ],
  africa: [
    "Which regional tradition are you most proud of?",
    "What local saying from your community do you love?"
  ],
  oceania: [
    "What outdoor activity is most loved in your area?",
    "What local place would you recommend for first-time visitors?"
  ],
  any: [
    "What part of your culture do people usually misunderstand?",
    "What is a tradition from your background you would like to share?"
  ]
};

const normalizeMood = (value) => `${value || "fun"}`.toLowerCase();
const normalizeRegion = (value) => `${value || "any"}`.toLowerCase();

const sample = (items = [], count = 2) => {
  const copy = [...items];
  const selected = [];

  while (copy.length && selected.length < count) {
    const index = Math.floor(Math.random() * copy.length);
    selected.push(copy.splice(index, 1)[0]);
  }

  return selected;
};

export class IcebreakerService {
  getSuggestions({ moodA, moodB, regionA, regionB }) {
    const resolvedMood = normalizeMood(moodA) === normalizeMood(moodB) ? moodA : moodA || moodB;
    const moodPool = MOOD_ICEBREAKERS[normalizeMood(resolvedMood)] || MOOD_ICEBREAKERS.fun;

    const regionPoolA = CULTURAL_BY_REGION[normalizeRegion(regionA)] || CULTURAL_BY_REGION.any;
    const regionPoolB = CULTURAL_BY_REGION[normalizeRegion(regionB)] || CULTURAL_BY_REGION.any;

    const core = sample(moodPool, 2);
    const culture = sample([...regionPoolA, ...regionPoolB], 2);

    return [...new Set([...core, ...culture])].slice(0, 4);
  }
}
