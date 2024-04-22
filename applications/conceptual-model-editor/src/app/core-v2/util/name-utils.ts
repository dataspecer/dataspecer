// inspired by https://gist.github.com/tkon99/4c98af713acc73bed74c

import {
    SemanticModelClass,
    SemanticModelGeneralization,
    SemanticModelRelationship,
    isSemanticModelClass,
    isSemanticModelGeneralization,
    isSemanticModelRelationship,
} from "@dataspecer/core-v2/semantic-model/concepts";
import { getDomainAndRange } from "@dataspecer/core-v2/semantic-model/relationship-utils";
import {
    SemanticModelClassUsage,
    SemanticModelRelationshipUsage,
    isSemanticModelClassUsage,
    isSemanticModelRelationshipUsage,
} from "@dataspecer/core-v2/semantic-model/usage/concepts";
import { getIri } from "./model-utils";

export const getNameLanguageString = (
    resource:
        | null
        | SemanticModelClass
        | SemanticModelRelationship
        | SemanticModelClassUsage
        | SemanticModelRelationshipUsage
        | SemanticModelGeneralization
) => {
    if (isSemanticModelClass(resource) || isSemanticModelClassUsage(resource)) {
        return resource.name ?? null;
    } else if (isSemanticModelRelationship(resource)) {
        const range = getDomainAndRange(resource)?.range;
        return range?.name ?? null;
    } else if (isSemanticModelRelationshipUsage(resource)) {
        const r = resource as SemanticModelRelationship & SemanticModelRelationshipUsage;
        const name = getDomainAndRange(r)?.range.name;
        return name ?? resource.name;
    } else if (isSemanticModelGeneralization(resource)) {
        return {
            en: "Generalization of " + resource.child + " is " + resource.parent,
        };
    } else {
        return null;
    }
};

export const getDescriptionLanguageString = (
    resource:
        | null
        | SemanticModelClass
        | SemanticModelRelationship
        | SemanticModelClassUsage
        | SemanticModelRelationshipUsage
        | SemanticModelGeneralization
) => {
    if (isSemanticModelClass(resource) || isSemanticModelClassUsage(resource)) {
        return resource.description;
    } else if (isSemanticModelRelationship(resource)) {
        const range = getDomainAndRange(resource)?.range;
        return range?.description ?? null;
    } else if (isSemanticModelRelationshipUsage(resource)) {
        // TODO: redo after knowing domain from relationship profiles is implemented
        return resource.description;
    } else {
        return null;
    }
};

export const getUsageNoteLanguageString = (
    resource:
        | null
        | SemanticModelClass
        | SemanticModelRelationship
        | SemanticModelClassUsage
        | SemanticModelRelationshipUsage
        | SemanticModelGeneralization
) => {
    if (isSemanticModelClassUsage(resource)) {
        return resource.usageNote ?? null;
    } else if (isSemanticModelRelationshipUsage(resource)) {
        // TODO: redo after knowing domain from relationship profiles is implemented
        return resource.usageNote;
        // const usageNote = resource.ends.at(1)?.usageNote;
        // return usageNote ?? null;
    } else {
        return null;
    }
};

export const getFallbackDisplayName = (
    resource:
        | null
        | SemanticModelClass
        | SemanticModelRelationship
        | SemanticModelClassUsage
        | SemanticModelRelationshipUsage
        | SemanticModelGeneralization
) => {
    return getIri(resource) ?? resource?.id ?? null;
};

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
