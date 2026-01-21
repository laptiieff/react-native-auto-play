const IGNORED_FILES = ['ios/Podfile.lock', 'package.json', 'package-lock.json', 'yarn.lock'];
const ignoredRegex = new RegExp(
  `^(${IGNORED_FILES.join(
    '|'
  )})$|^node_modules/|^.*png$|.*res/drawable.*|^.*svg$|^.*gpx$|^.*txt$|^.*jp.?g$|^.*.test.json$|.*/nitrogen/generated/.*`
);

/**
 * Removes entire diff sections for files matching the ignore patterns.
 * Keeps any text before the first diff header intact.
 * GitHub uses unified diff format: "diff --git a/path b/path"
 * Paths may be quoted when they contain special characters: "diff --git "a/path" "b/path""
 */
const filterDiffByIgnoredFiles = (diff) => {
  if (!diff) return diff;
  // Handle both quoted and unquoted paths in git diff headers
  const headerRegex = /^diff --git "?a\/(.+?)"? "?b\/(.+?)"?$/gm;
  const matches = [];
  let m;
  while ((m = headerRegex.exec(diff)) !== null) {
    // Strip any remaining quotes from the path
    const path = m[2].replace(/^"|"$/g, '');
    matches.push({ index: m.index, path });
  }
  if (matches.length === 0) return diff;

  let result = '';
  if (matches[0].index > 0) {
    result += diff.slice(0, matches[0].index);
  }
  for (let i = 0; i < matches.length; i++) {
    const start = matches[i].index;
    const end = i + 1 < matches.length ? matches[i + 1].index : diff.length;
    const path = matches[i].path;
    if (!ignoredRegex.test(path)) {
      result += diff.slice(start, end);
    }
  }
  return result;
};

/**
 * Escapes special regex characters and converts whitespace sequences
 * to flexible whitespace matchers for fuzzy line matching.
 */
const convertToRegexPattern = (input) => {
  return input
    .replace(/([.*+?^=!:${}()|[\]/-])/g, '\\$1') // Escape special characters including hyphen
    .replace(/\s+/g, '\\s+'); // Replace whitespace sequences with \s+
};

/**
 * Finds the line number of a search string in text.
 * Returns the 1-based line number of the LAST line of the match,
 * which is what GitHub expects for inline comments on multi-line code.
 *
 * @param {string} text - The full file content to search in
 * @param {string} searchString - The code snippet to find (can be multi-line)
 * @returns {number} 1-based line number of the last line of the match, or -1 if not found
 */
function getLineNumber(text, searchString) {
  if (!text || !searchString) {
    return -1;
  }

  const regexPattern = convertToRegexPattern(searchString);
  const regex = new RegExp(regexPattern);
  const match = regex.exec(text);

  if (!match) {
    return -1;
  }

  // Calculate line number from match position
  // Count newlines before the match start to get 1-based start line
  const textBeforeMatch = text.substring(0, match.index);
  const startLine = textBeforeMatch.split('\n').length;

  // Count lines in the matched text to find the last line
  const matchedLineCount = match[0].split('\n').length;

  // Return the last line of the match (1-based)
  return startLine + matchedLineCount - 1;
}

module.exports = {
  IGNORED_FILES,
  ignoredRegex,
  filterDiffByIgnoredFiles,
  convertToRegexPattern,
  getLineNumber,
};
