/**
 * Hybrid Slug Utilities with Alphanumeric Suffix (Enterprise Standard)
 * Generates human-readable slugs with mixed text & number suffixes.
 * Examples:
 *  - User: toHybridSlug("Paazil Admin", 12, "usr") => "paazil-admin-usr-9k4a-12"
 *  - Role: toHybridSlug("Branch Manager", 5, "role") => "branch-manager-role-3b8a-5"
 *  - Branch: toHybridSlug("Head Office", 1, "br") => "head-office-br-7a2f-1"
 */

// Generates a short 4-character alphanumeric hash for suffix variation
const generateShortHash = (text = "", id = 0) => {
  let hash = 0;
  const str = `${String(text || "")}-${id}-tarini`;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash).toString(36).substring(0, 4);
};

export const toHybridSlug = (text, id, prefix = "usr") => {
  if (id == null || id === "") return "";
  const numericId = Number(id);
  if (isNaN(numericId)) return "";

  const hash = generateShortHash(text, numericId);

  if (!text) return `${prefix}-${hash}-${numericId}`;

  const cleanText = String(text)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return `${cleanText}-${prefix}-${hash}-${numericId}`;
};

export const extractIdFromHybridSlug = (slugOrId) => {
  if (slugOrId == null || slugOrId === "") return null;
  const str = String(slugOrId).trim();
  if (/^\d+$/.test(str)) return Number(str);

  // Robust extraction: matches hyphen-separated ID at the end (e.g. head-office-br-9k4a-1 -> 1)
  const match =
    str.match(/-(\d+)$/) ||
    str.match(/-(?:usr|role|br|branch|u|r|prg)-[a-z0-9]*?(\d+)$/i) ||
    str.match(/-[a-z0-9]+-[a-z0-9]*?(\d+)$/i) ||
    str.match(/(\d+)$/);

  return match ? Number(match[1]) : null;
};

/**
 * Parses a hybrid slug into its constituent parts: text, prefix, and id.
 */
export const parseHybridSlug = (slugOrId) => {
  const id = extractIdFromHybridSlug(slugOrId);
  if (!slugOrId) return { id: null, text: "", prefix: "" };

  const str = String(slugOrId).trim();
  const parts = str.split("-");

  if (parts.length >= 3) {
    const prefix = parts[parts.length - 2];
    const text = parts.slice(0, parts.length - 2).join(" ");
    return { id, text, prefix };
  }

  return { id, text: str, prefix: "" };
};
