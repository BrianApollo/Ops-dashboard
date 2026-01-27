/**
 * Tokenized Search Utility
 *
 * Provides fuzzy-like search by matching all search tokens against a target string.
 * Useful for searching lists where word order doesn't matter.
 *
 * Example:
 *   searchTokens("regrovix v5", "Regrovix™ - Facebook - T6 - Plus - v5 - M - 02012026")
 *   → true (both "regrovix" and "v5" appear in the target)
 */

/**
 * Normalize a string for search comparison.
 * - Converts to lowercase
 * - Removes special characters (™, ®, ©, etc.)
 * - Trims whitespace
 */
export function normalizeForSearch(str: string): string {
  return str
    .toLowerCase()
    .replace(/[™®©]/g, '') // Remove trademark/copyright symbols
    .replace(/[^\w\s-]/g, '') // Remove special chars except word chars, spaces, hyphens
    .trim();
}

/**
 * Split a search query into tokens.
 * Filters out empty tokens.
 */
export function tokenize(query: string): string[] {
  return normalizeForSearch(query)
    .split(/\s+/)
    .filter((token) => token.length > 0);
}

/**
 * Check if all search tokens appear in the target string.
 *
 * @param query - The search query (e.g., "regrovix v5")
 * @param target - The string to search in (e.g., "Regrovix™ - Facebook - v5")
 * @returns true if ALL tokens from query appear in target
 *
 * @example
 * matchesAllTokens("regrovix v5", "Regrovix™ - Facebook - T6 - Plus - v5")
 * // → true
 *
 * matchesAllTokens("regrovix v6", "Regrovix™ - Facebook - T6 - Plus - v5")
 * // → false (v6 doesn't appear)
 */
export function matchesAllTokens(query: string, target: string): boolean {
  if (!query.trim()) return true; // Empty query matches everything

  const tokens = tokenize(query);
  const normalizedTarget = normalizeForSearch(target);

  return tokens.every((token) => normalizedTarget.includes(token));
}

/**
 * Filter an array of items using tokenized search.
 *
 * @param items - Array of items to filter
 * @param query - Search query
 * @param getSearchableText - Function to extract searchable text from each item
 * @returns Filtered array of items that match all tokens
 *
 * @example
 * const campaigns = [
 *   { id: '1', name: 'Regrovix™ - Facebook - v5' },
 *   { id: '2', name: 'VitalTac - Google - v3' },
 * ];
 *
 * filterByTokens(campaigns, "regrovix v5", (c) => c.name);
 * // → [{ id: '1', name: 'Regrovix™ - Facebook - v5' }]
 */
export function filterByTokens<T>(
  items: T[],
  query: string,
  getSearchableText: (item: T) => string
): T[] {
  if (!query.trim()) return items;

  return items.filter((item) =>
    matchesAllTokens(query, getSearchableText(item))
  );
}

/**
 * Create a filter function for MUI Autocomplete.
 *
 * @param getOptionLabel - Function to get the label from an option
 * @returns Filter function compatible with MUI Autocomplete's filterOptions prop
 *
 * @example
 * <Autocomplete
 *   options={campaigns}
 *   getOptionLabel={(c) => c.name}
 *   filterOptions={createAutocompleteFilter((c) => c.name)}
 * />
 */
export function createAutocompleteFilter<T>(
  getOptionLabel: (option: T) => string
): (options: T[], state: { inputValue: string }) => T[] {
  return (options, { inputValue }) =>
    filterByTokens(options, inputValue, getOptionLabel);
}
