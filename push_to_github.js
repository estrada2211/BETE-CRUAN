/**
 * push_to_github.js
 * Pushes local project files to GitHub using the GitHub REST API.
 * Usage: node push_to_github.js <GITHUB_TOKEN>
 * 
 * Get a token at: https://github.com/settings/tokens/new
 * Required scopes: repo (full control)
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

const OWNER = 'estrada2211';
const REPO = 'BETE-CRUAN';
const BRANCH = 'main';
const TOKEN = process.argv[2];

if (!TOKEN) {
  console.error('Usage: node push_to_github.js <GITHUB_PERSONAL_ACCESS_TOKEN>');
  console.error('\nGet a token at: https://github.com/settings/tokens/new');
  console.error('Required scope: repo');
  process.exit(1);
}

// Files/dirs to exclude from upload
const EXCLUDE = [
  'node_modules',
  '.git',
  'uploads',
  '.env',
  'push_to_github.js'
];

// Files to explicitly include even if binary
const PROJECT_ROOT = path.join(__dirname);

function shouldExclude(relPath) {
  const parts = relPath.split(path.sep);
  return parts.some(p => EXCLUDE.includes(p));
}

function getAllFiles(dir, base = '') {
  const results = [];
  const items = fs.readdirSync(dir);
  for (const item of items) {
    const fullPath = path.join(dir, item);
    const relPath = base ? path.join(base, item) : item;
    if (shouldExclude(relPath)) continue;
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      results.push(...getAllFiles(fullPath, relPath));
    } else {
      results.push({ fullPath, relPath: relPath.replace(/\\/g, '/') });
    }
  }
  return results;
}

function apiRequest(method, endpoint, body = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.github.com',
      path: endpoint,
      method,
      headers: {
        'Authorization': `token ${TOKEN}`,
        'User-Agent': 'BETE-CRUAN-Deploy',
        'Accept': 'application/vnd.github.v3+json',
        'Content-Type': 'application/json'
      }
    };
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(data) }); }
        catch { resolve({ status: res.statusCode, body: data }); }
      });
    });
    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function getFileSha(filePath) {
  const res = await apiRequest('GET', `/repos/${OWNER}/${REPO}/contents/${filePath}?ref=${BRANCH}`);
  if (res.status === 200) return res.body.sha;
  return null;
}

async function uploadFile(file) {
  const content = fs.readFileSync(file.fullPath);
  const base64Content = content.toString('base64');
  const sha = await getFileSha(file.relPath);

  const body = {
    message: `Deploy: ${file.relPath}`,
    content: base64Content,
    branch: BRANCH
  };
  if (sha) body.sha = sha;

  const res = await apiRequest('PUT', `/repos/${OWNER}/${REPO}/contents/${file.relPath}`, body);
  if (res.status === 200 || res.status === 201) {
    console.log(`  ✅ ${file.relPath}`);
  } else {
    console.log(`  ❌ ${file.relPath} — ${res.status}: ${JSON.stringify(res.body?.message || res.body)}`);
  }
}

async function main() {
  console.log(`\n📦 Collecting files from ${PROJECT_ROOT}...\n`);
  const files = getAllFiles(PROJECT_ROOT);
  console.log(`Found ${files.length} files to upload.\n`);

  // Check repo is accessible
  const repoCheck = await apiRequest('GET', `/repos/${OWNER}/${REPO}`);
  if (repoCheck.status !== 200) {
    console.error(`❌ Cannot access repo: ${OWNER}/${REPO}`);
    console.error(`Status: ${repoCheck.status}`, repoCheck.body?.message);
    process.exit(1);
  }
  console.log(`✅ Repo accessible: ${repoCheck.body.full_name}\n`);
  console.log('Uploading files...\n');

  // Upload one at a time (API rate limit safe)
  for (const file of files) {
    await uploadFile(file);
    // Small delay to avoid hitting rate limits
    await new Promise(r => setTimeout(r, 100));
  }

  console.log('\n🚀 Done! All files pushed to GitHub.');
  console.log(`\n👉 View your repo: https://github.com/${OWNER}/${REPO}`);
}

main().catch(err => {
  console.error('Fatal error:', err.message);
  process.exit(1);
});
