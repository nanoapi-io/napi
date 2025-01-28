export const redirectToGitHubOAuth = () => {
  const clientId = process.env.REACT_APP_GITHUB_CLIENT_ID;
  const redirectUri = `${window.location.origin}/auth/github`; // Frontend redirect URI
  console.log(clientId);

  if (!clientId) {
    console.error("GitHub Client ID is not defined");
    return;
  }

  const githubOAuthURL = `https://github.com/login/oauth/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(
    redirectUri
  )}&scope=repo,user`;

  window.location.href = githubOAuthURL; // Redirect user to GitHub OAuth
};

export const redirectToGitLabOAuth = () => {
  const clientId = process.env.REACT_APP_GITLAB_CLIENT_ID;
  const redirectUri = `${window.location.origin}/auth/gitlab`; // Frontend redirect URI

  if (!clientId) {
    console.error("GitLab Client ID is not defined");
    return;
  }

  const gitlabOAuthURL = `https://gitlab.com/oauth/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(
    redirectUri
  )}&response_type=code&scope=api read_api read_user read_repository read_registry read_virtual_registry read_observability profile email`;

  window.location.href = gitlabOAuthURL; // Redirect user to GitLab OAuth
};
