export const redirectToGitHubOAuth = () => {
  const clientId = process.env.REACT_APP_GITHUB_CLIENT_ID;
  const redirectUri = `${window.location.origin}/auth/github`; // Frontend redirect URI
  console.log(clientId)

  if (!clientId) {
      console.error('GitHub Client ID is not defined');
      return;
  }

  const githubOAuthURL = `https://github.com/login/oauth/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(
      redirectUri
  )}&scope=repo,user`;

  window.location.href = githubOAuthURL; // Redirect user to GitHub OAuth
};
