const { Octokit } = require('@octokit/rest');
const core = require('@actions/core');
const github = require('@actions/github');

const IGNORED_FILES = ['ios/Podfile.lock', 'package.json', 'package-lock.json', 'yarn.lock'];
const ignoredRegex = new RegExp(
  `^(${IGNORED_FILES.join(
    '|'
  )})$|^node_modules/|^.*png$|.*res/drawable.*|^.*svg$|^.*gpx$|^.*txt$|^.*jp.?g$|^.*.test.json$`
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

// Token limit for OpenAI API (approximation)
const MAX_TOKEN_LIMIT = 200000; // Adjust based on your model's context window
// Estimating 1 token ~= 3 characters for code (more conservative than the 4:1 ratio for English text)
const TOKEN_ESTIMATION_RATIO = 3.5;

// Function to estimate token count from text
const estimateTokenCount = (text) => {
  return Math.ceil(text.length / TOKEN_ESTIMATION_RATIO);
};

// Get GitHub context and inputs
const context = github.context;
const owner = context.repo.owner;
const repo = context.repo.repo;

const PR_NUMBER = process.env.PR_NUMBER;
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const AZURE_OPEN_AI_SECRET = process.env.AZURE_OPEN_AI_SECRET;
const AZURE_OPEN_AI_URL = process.env.AZURE_OPEN_AI_URL;
const AZURE_OPEN_AI_DEPLOYMENT = process.env.AZURE_OPEN_AI_DEPLOYMENT;

const octokit = new Octokit({
  auth: GITHUB_TOKEN,
});

const getPullRequestDiff = async () => {
  // Get PR details
  const { data: pr } = await octokit.pulls.get({
    owner,
    repo,
    pull_number: PR_NUMBER,
  });

  // Get diff using Octokit's request method with diff media type
  const diffResponse = await octokit.request(`GET /repos/${owner}/${repo}/pulls/${PR_NUMBER}`, {
    mediaType: {
      format: 'diff',
    },
  });

  return {
    diff: diffResponse.data || '',
    title: pr.title,
    description: pr.body || '',
    commit: pr.head.sha,
  };
};

const SYSTEM_PROMPT = {
  role: 'system',
  content:
    'You are an experienced software developer, mainly focusing on react-native development for iOS, Android and web. Your other tasks are maintaining the Android Auto, Android Automotive and Carplay implementation for a route planner and navigation app for EVs.',
};

const getUserPrompt = (title, description, diff) => {
  return {
    role: 'user',
    content:
      'Please review only the code changes provided in the diff at the end of this message for any major issues, bugs, best-practice shortcomings, potential security concerns, and thread-safety issues.' +
      'Do not comment on files with the name *.test.ts, but you can use them as additional context.\n' +
      "Highlight typos in the changed code (not in the title or description) and propose a correction. If there are no typos, don't comment on it.\n" +
      'Do not provide comments on minor things, unless they provide better code readability.\n' +
      'Do not highlight issues, that a linter or typescript check would detect.\n' +
      'Do not provide positive feedback, only focus on negative issues.\n' +
      'Be brief - ignore minor improvements and keep the amount of text down.\n' +
      'Please check, that javascript requires and typescript imports use the same file name suffix, as the current file name. *.android.ts* imports should only happen if the file itself has the .android.ts* suffix. Same for *.web.ts* and *.ios.ts*.\n' +
      "Provide the review as json object. In the root there should be a property 'summary', that contains the review summary and an array 'issues', that contains inline comments with properties 'comment', 'filePath' (full path), 'lineContent' (include whitespaces)." +
      `${title ? `Title: ${title}\n` : ''}${
        description ? `Description: ${description}\n` : ''
      }\nDiff:\n${diff}`,
  };
};

// Handle both quoted and unquoted paths in git diff headers
const regex = /diff --git "?a\/(.+?)"? "?b\/(.+?)"?\n(?!deleted file mode)/g;

const getTouchedFilesContent = async (diff, commit) => {
  // Debug: Log the first 2000 chars of the diff to understand the format
  console.log('=== DEBUG: Raw diff format (first 2000 chars) ===');
  console.log(diff?.substring(0, 2000));
  console.log('=== END DEBUG ===');

  const files = [];
  let match;
  while ((match = regex.exec(diff)) !== null) {
    // Debug: Log what the regex matched
    console.log('=== DEBUG: Regex match ===');
    console.log('Full match:', match[0]);
    console.log('Group 1 (a/ path):', match[1]);
    console.log('Group 2 (b/ path):', match[2]);
    console.log('=== END DEBUG ===');

    // Strip any remaining quotes from the path
    const path = match[2].replace(/^"|"$/g, '');
    if (ignoredRegex.test(path)) {
      console.log('Ignoring file (matches ignore pattern):', path);
      continue;
    }
    files.push(path);
  }

  console.log('=== DEBUG: Files to fetch ===');
  console.log(files);
  console.log('=== END DEBUG ===');

  const fileContents = await Promise.all(
    files.map(async (path) => {
      console.log('fetching file content for', path);
      try {
        const { data } = await octokit.repos.getContent({
          owner,
          repo,
          path,
          ref: commit,
        });

        // GitHub API returns content as base64 encoded string
        let content = null;
        if (data.type === 'file' && data.encoding === 'base64') {
          content = Buffer.from(data.content, 'base64').toString('utf-8');
        } else if (data.type === 'file' && typeof data.content === 'string') {
          content = data.content;
        }

        return { path, content };
      } catch (err) {
        console.error(`Failed to get content for ${path}`, err);
        return { path, content: null };
      }
    })
  );

  return fileContents.filter((file) => file.content !== null);
};

const createPrompt = async (title, description, diff, fileContents) => {
  // Check basic token count for system prompt and diff
  const systemPromptTokens = estimateTokenCount(SYSTEM_PROMPT.content);
  const userPromptTokens = estimateTokenCount(getUserPrompt(title, description, diff).content);
  const baseTokenCount = systemPromptTokens + userPromptTokens;

  console.log(`Base token count (system prompt + user prompt with diff): ${baseTokenCount}`);

  // Check if we can include file contents without exceeding token limit
  let includeFileContents = true;
  let fileContentTokens = 0;

  // Calculate total tokens if we include all file contents
  fileContents.forEach((file) => {
    const filePrompt = `Additional context of the source code of the changed file ${file.path}:\n${file.content}`;
    fileContentTokens += estimateTokenCount(filePrompt);
  });

  console.log(`File contents would add approximately ${fileContentTokens} tokens`);

  // Check if including file contents would exceed token limit
  if (baseTokenCount + fileContentTokens > MAX_TOKEN_LIMIT) {
    console.log(
      `WARNING: Total token count (${
        baseTokenCount + fileContentTokens
      }) would exceed limit (${MAX_TOKEN_LIMIT}). Excluding file contents.`
    );
    includeFileContents = false;
  }

  const messages = [SYSTEM_PROMPT, getUserPrompt(title, description, diff)];

  // Add file contents only if not exceeding token limit
  if (includeFileContents) {
    messages.push(
      ...fileContents.map((file) => ({
        role: 'system',
        content: `Additional context of the source code of the changed file ${file.path}:\n${file.content}`,
      }))
    );
  } else {
    messages.push({
      role: 'system',
      content:
        'File contents were excluded due to token limit constraints. Review will be based only on the diff.',
    });
  }

  const prompt = { messages };
  console.log('Got diff, requesting review now...');

  return prompt;
};

const axios = require('axios');

const requestReview = async () => {
  const { diff, title, description, commit } = await getPullRequestDiff();
  const filteredDiff = filterDiffByIgnoredFiles(diff);
  const fileContents = await getTouchedFilesContent(filteredDiff, commit);

  const prompt = await createPrompt(title, description, filteredDiff, fileContents);

  // Construct Azure OpenAI URL from secrets
  const openAiUrl = `${AZURE_OPEN_AI_URL}/openai/deployments/${AZURE_OPEN_AI_DEPLOYMENT}/chat/completions?api-version=2024-12-01-preview`;

  const config = {
    method: 'post',
    maxBodyLength: Number.POSITIVE_INFINITY,
    url: openAiUrl,
    headers: {
      'api-key': AZURE_OPEN_AI_SECRET,
      'Content-Type': 'application/json',
    },
    data: JSON.stringify(prompt),
  };

  return new Promise((resolve, reject) => {
    axios
      .request(config)
      .then((response) => {
        const review = response.data.choices[0].message.content;
        console.log('OpenAI Usage statistics', response.data.usage);

        try {
          const json = JSON.parse(review);
          resolve({ review: json, fileContents });
        } catch (error) {
          console.error('Failed to JSON.parse review', review);
          reject(error);
        }
      })
      .catch((error) => {
        reject(error);
      });
  });
};

const deleteCommentsByUser = async (username) => {
  try {
    // Step 1: List all review comments (inline comments) on the pull request
    const reviewCommentsResponse = await octokit.pulls.listReviewComments({
      owner,
      repo,
      pull_number: PR_NUMBER,
    });

    // Step 2: List all issue comments (general comments) on the pull request
    const issueCommentsResponse = await octokit.issues.listComments({
      owner,
      repo,
      issue_number: PR_NUMBER,
    });

    const reviewComments = reviewCommentsResponse.data || [];
    const issueComments = issueCommentsResponse.data || [];

    // Step 3: Filter comments by the specific user
    const userReviewComments = reviewComments.filter((comment) => comment.user.login === username);
    const userIssueComments = issueComments.filter((comment) => comment.user.login === username);

    // Step 4: Delete each review comment made by that user
    await Promise.allSettled(
      userReviewComments.map((comment) =>
        octokit.pulls.deleteReviewComment({
          owner,
          repo,
          comment_id: comment.id,
        })
      )
    );

    // Step 5: Delete each issue comment made by that user
    await Promise.allSettled(
      userIssueComments.map((comment) =>
        octokit.issues.deleteComment({
          owner,
          repo,
          comment_id: comment.id,
        })
      )
    );

    const totalDeleted = userReviewComments.length + userIssueComments.length;
    if (totalDeleted > 0) {
      console.log(
        `Deleted ${totalDeleted} comments by user ${username} (${userReviewComments.length} review comments, ${userIssueComments.length} issue comments)`
      );
    }
  } catch (error) {
    console.error('Failed to delete comments by user', error);
  }
};

const convertToRegexPattern = (input) => {
  return input
    .replace(/([.*+?^=!:${}()|[\]/\\])/g, '\\$1') // Escape special characters
    .replace(/\s+/g, '[\\s\\n]+'); // Replace spaces and newlines with [\s\n]+
};

function getLineNumber(text, searchStringArray) {
  const lines = text.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const firstLine = searchStringArray[0];
    if (lines[i].includes(firstLine)) {
      let containsAllLines = true;
      for (let j = 1; j < searchStringArray.length; j++) {
        if (!lines[i + j].includes(searchStringArray[j])) {
          containsAllLines = false;
          break;
        }
      }

      if (containsAllLines) {
        return i + searchStringArray.length;
      }
    }
  }
  return -1; // Return -1 if the string is not found
}

function getLineNumberMultiLine(text, searchString) {
  const regexPattern = convertToRegexPattern(searchString);
  const regex = new RegExp(regexPattern);
  const match = regex.exec(text);
  if (match?.length) {
    const matchedText = match[0];
    const matchedTextLines = matchedText.split('\n');
    return getLineNumber(text, matchedTextLines);
  }

  return -1;
}

const getReviewAndSendToGitHub = async () => {
  return requestReview()
    .then(async ({ review, fileContents }) => {
      // log review for debugging purposes
      console.log('Review:\n', review);

      // Get PR details to get the base and head commits for inline comments
      const { data: pr } = await octokit.pulls.get({
        owner,
        repo,
        pull_number: PR_NUMBER,
      });

      review.issues?.forEach((element) => {
        const filePath = element.filePath;
        const fileContent = fileContents.find((file) => file.path === filePath);
        if (fileContent) {
          try {
            const lineNumber = getLineNumberMultiLine(fileContent.content, element.lineContent);
            if (lineNumber === -1) {
              // we probably got a part of the diff
              // write a normal comment and attach the mentioned code
              element.comment =
                element.comment + '\n' + filePath + ':\n```\n' + element.lineContent + '\n```';
            }

            element.lineNumber = lineNumber;
          } catch (error) {
            console.error(
              `Failed to get line number for:\n${element.lineContent}\nError:\n`,
              error
            );
          }
        }
      });

      // Delete previous comments by the bot
      await deleteCommentsByUser(context.actor);

      console.log('Creating comments...');

      try {
        if (review.issues?.length) {
          // Group comments by file for batch processing
          const commentsByFile = {};
          review.issues.forEach(({ filePath, lineNumber, comment }) => {
            if (!commentsByFile[filePath]) {
              commentsByFile[filePath] = [];
            }
            commentsByFile[filePath].push({ lineNumber, comment });
          });

          // Create inline comments for each file
          for (const [filePath, comments] of Object.entries(commentsByFile)) {
            for (const { lineNumber, comment } of comments) {
              if (lineNumber === -1) {
                // Create a general comment on the PR
                await octokit.issues.createComment({
                  owner,
                  repo,
                  issue_number: PR_NUMBER,
                  body: comment,
                });
              } else {
                // Create an inline review comment
                // GitHub requires side: 'RIGHT' for comments on the PR branch
                try {
                  await octokit.pulls.createReviewComment({
                    owner,
                    repo,
                    pull_number: PR_NUMBER,
                    body: comment,
                    commit_id: pr.head.sha,
                    path: filePath,
                    line: lineNumber,
                    side: 'RIGHT',
                  });
                } catch (error) {
                  console.error(
                    `Failed to create inline comment for ${filePath}:${lineNumber}`,
                    error
                  );
                  // Fallback to general comment if inline fails
                  await octokit.issues.createComment({
                    owner,
                    repo,
                    issue_number: PR_NUMBER,
                    body: `${filePath}:${lineNumber}\n\n${comment}`,
                  });
                }
              }
            }
          }
        }

        // Create summary comment
        await octokit.issues.createComment({
          owner,
          repo,
          issue_number: PR_NUMBER,
          body: review.summary,
        });
      } catch (error) {
        console.error('failed to create comment', error);
        core.setFailed(`Failed to create comments: ${error.message}`);
      }
    })
    .catch((error) => {
      console.error('failed to query review', error.message);
      core.setFailed(`Failed to get review: ${error.message}`);
      return;
    });
};

// Main execution
if (require.main === module) {
  getReviewAndSendToGitHub();
}

module.exports = { getReviewAndSendToGitHub };
