import {
  isSemanticModelClass,
  isSemanticModelRelationship,
} from "@dataspecer/core-v2/semantic-model/concepts";
import {
  isSemanticModelClassProfile,
  isSemanticModelRelationshipProfile,
} from "@dataspecer/core-v2/semantic-model/profile/concepts";
import { Entity } from "@dataspecer/core-v2";

import { getIri } from "./iri-utils";
import { getDomainAndRange } from "./relationship-utils";

export const getNameLanguageString = (
  resource: null | Entity,
) => {
  if (isSemanticModelClass(resource) || isSemanticModelClassProfile(resource)) {
    return resource.name ?? null;
  } else if (isSemanticModelRelationship(resource)) {
    const range = getDomainAndRange(resource)?.range;
    return range?.name ?? null;
  } else if (isSemanticModelRelationshipProfile(resource)) {
    const range = getDomainAndRange(resource)?.range;
    return range?.name ?? null;
  } else {
    return null;
  }
};

export const getDescriptionLanguageString = (
  resource: null | Entity,
) => {
  if (isSemanticModelClass(resource) || isSemanticModelClassProfile(resource)) {
    return resource.description;
  } else if (isSemanticModelRelationship(resource)) {
    const range = getDomainAndRange(resource)?.range;
    return range?.description ?? null;
  } else if (isSemanticModelRelationshipProfile(resource)) {
    const range = getDomainAndRange(resource)?.range;
    return range?.description ?? null;
  } else {
    return null;
  }
};

export const getUsageNoteLanguageString = (
  resource: null | Entity,
) => {
  if (isSemanticModelClassProfile(resource)) {
    return resource.usageNote;
  } else if (isSemanticModelRelationshipProfile(resource)) {
    const range = getDomainAndRange(resource)?.range;
    return range?.usageNote ?? null;
  } else {
    return null;
  }
};

/**
 * Computes the fallback name for `resource`
 * @param resource
 * @param modelBaseIri
 * @returns 1. absolute `iri` (computed with `modelBaseIri`), 2. relative `iri`, 3. or `resource.id`, 4. null otherwise
 */
export const getFallbackDisplayName = (
  resource: null | Entity,
  modelBaseIri?: string
) => {
  return getIri(resource, modelBaseIri) ?? resource?.id ?? null;
};

// --- GENERATE NAMES --- --- ---
// inspired by https://gist.github.com/tkon99/4c98af713acc73bed74c
const capFirst = (what: string) => {
  return what.charAt(0).toUpperCase() + what.slice(1);
};

const getRandomInt = (min: number, max: number) => {
  return Math.floor(Math.random() * (max - min)) + min;
};

const adjectives = [
  "abrupt",
  "acidic",
  "adorable",
  "amiable",
  "amused",
  "appalling",
  "appetizing",
  "average",
  "batty",
  "blushing",
  "bored",
  "bright",
  "broad",
  "bulky",
  "burly",
  "charming",
  "cheeky",
  "cheerful",
  "chubby",
  "clean",
  "cloudy",
  "clueless",
  "clumsy",
  "creepy",
  "crooked",
  "cruel",
  "cumbersome",
  "curved",
  "cynical",
  "dangerous",
  "dashing",
  "decayed",
  "deceitful",
  "deep",
  "defeated",
  "defiant",
  "delicious",
  "disturbed",
  "dizzy",
  "drab",
  "drained",
  "dull",
  "eager",
  "ecstatic",
  "elated",
  "elegant",
  "emaciated",
  "embarrassed",
  "enchanting",
  "energetic",
  "enormous",
  "extensive",
  "exuberant",
  "fancy",
  "fantastic",
  "fierce",
  "filthy",
  "flat",
  "floppy",
  "fluttering",
  "foolish",
  "frantic",
  "fresh",
  "friendly",
  "frightened",
  "frothy",
  "funny",
  "fuzzy",
  "gaudy",
  "gentle",
  "ghastly",
  "giddy",
  "gigantic",
  "glamorous",
  "gleaming",
  "glorious",
  "gorgeous",
  "graceful",
  "greasy",
  "grieving",
  "gritty",
  "grotesque",
  "grubby",
  "grumpy",
  "handsome",
  "happy",
  "healthy",
  "helpful",
  "helpless",
  "high",
  "hollow",
  "homely",
  "horrific",
  "huge",
  "hungry",
  "hurt",
  "ideal",
  "irritable",
  "itchy",
  "jolly",
  "icy",
  "ideal",
  "intrigued",
  "irate",
  "irritable",
  "itchy",
  "jealous",
  "jittery",
  "jolly",
  "joyous",
  "juicy",
  "jumpy",
  "kind",
  "lethal",
  "little",
  "lively",
  "livid",
  "lonely",
  "lovely",
  "lucky",
  "ludicrous",
  "macho",
  "narrow",
  "nasty",
  "naughty",
  "nervous",
  "nutty",
  "perfect",
  "perplexed",
  "petite",
  "petty",
  "plain",
  "pleasant",
  "poised",
  "pompous",
  "precious",
  "prickly",
  "proud",
  "pungent",
  "puny",
  "quaint",
  "reassured",
  "relieved",
  "repulsive",
  "responsive",
  "ripe",
  "robust",
  "rotten",
  "rotund",
  "rough",
  "round",
  "salty",
  "sarcastic",
  "scant",
  "scary",
  "scattered",
  "scrawny",
  "selfish",
  "shaggy",
  "shaky",
  "shallow",
  "sharp",
  "shiny",
  "short",
  "silky",
  "silly",
  "skinny",
  "slimy",
  "slippery",
  "small",
  "sweet",
  "tart",
  "tasty",
  "teeny",
  "tender",
  "tense",
  "terrible",
  "testy",
  "thankful",
  "thick",
  "tight",
  "timely",
  "tricky",
  "trite",
  "uneven",
  "upset",
  "uptight",
  "vast",
  "vexed",
  "vivid",
  "wacky",
  "weary",
  "zany",
  "zealous",
  "zippy",
];

const nouns = [
  "time",
  "year",
  "people",
  "way",
  "day",
  "man",
  "thing",
  "woman",
  "life",
  "child",
  "world",
  "school",
  "state",
  "family",
  "student",
  "group",
  "country",
  "problem",
  "hand",
  "part",
  "place",
  "case",
  "week",
  "company",
  "system",
  "program",
  "question",
  "work",
  "government",
  "number",
  "night",
  "point",
  "home",
  "water",
  "room",
  "mother",
  "area",
  "money",
  "story",
  "fact",
  "month",
  "lot",
  "right",
  "study",
  "book",
  "eye",
  "job",
  "word",
  "business",
  "issue",
  "side",
  "kind",
  "head",
  "house",
  "service",
  "friend",
  "father",
  "power",
  "hour",
  "game",
  "line",
  "end",
  "member",
  "law",
  "car",
  "city",
  "community",
  "name",
  "president",
  "team",
  "minute",
  "idea",
  "kid",
  "body",
  "information",
  "back",
  "parent",
  "face",
  "others",
  "level",
  "office",
  "door",
  "health",
  "person",
  "art",
  "war",
  "history",
  "party",
  "result",
  "change",
  "morning",
  "reason",
  "research",
  "girl",
  "guy",
  "moment",
  "air",
  "teacher",
  "force",
  "education",
];

export const generateName = () => {
  const noun = nouns[getRandomInt(0, nouns.length) % nouns.length]!;
  const adj = adjectives[getRandomInt(0, adjectives.length) % adjectives.length]!;
  const name = capFirst(adj) + " " + capFirst(noun);
  return name;
};

