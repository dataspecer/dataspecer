/* eslint @stylistic/js/max-len: off */

export const translations: { [language: string]: { [key: string]: string } } = {
  "cs": {
    ...prefix("diagram.", {
      "mandatory-level.mandatory": "<<povinné>>",
      "mandatory-level.optional": "<<volitelné>>",
      "mandatory-level.recommended": "<<doporučené>>",
      "profile-of": "profiluje",
      "profile-edge": "<<profiluje>>",
    }),
  },
  "en": {
    ...prefix("diagram.", {
      "mandatory-level.mandatory": "<<mandatory>>",
      "mandatory-level.optional": "<<optional>>",
      "mandatory-level.recommended": "<<recommended>>",
      "profile-of": "profile of",
      "profile-edge": "<<profile>>",
    }),
  },
}

function prefix<T>(prefix: string, items: Record<string, T>): Record<string, T> {
  const result: Record<string, T> = {};
  for (const [key, value] of Object.entries(items)) {
    result[prefix + key] = value;
  }
  return result;
}
