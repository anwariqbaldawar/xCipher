export function triggerGitHubDeployment() {
  const owner = process.env.GITHUB_OWNER;
  const repo = process.env.GITHUB_REPO;
  const pat = process.env.GITHUB_PAT;
  
  if (!owner || !repo || !pat) {
    console.warn("GitHub Actions deployment skipped: Missing environment variables (GITHUB_OWNER, GITHUB_REPO, or GITHUB_PAT).");
    return;
  }

  const url = `https://api.github.com/repos/${owner}/${repo}/actions/workflows/deploy.yml/dispatches`;

  fetch(url, {
    method: "POST",
    headers: {
      "Accept": "application/vnd.github.v3+json",
      "Authorization": `Bearer ${pat}`,
      "User-Agent": "xCipher-CMS",
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ ref: "main" })
  }).catch(err => {
    console.error("Failed to trigger GitHub deployment:", err);
  });
}
