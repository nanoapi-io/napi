import { useEffect } from "react";
import { useNavigate } from "react-router";

export default function Auth(props: {
  provider: "github" | "gitlab" | "bitbucket";
}) {
  const navigate = useNavigate();

  const fetchGithubToken = async () => {
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get("code"); // GitHub authorization code

    if (!code) {
      console.error("Authorization code not found");
      // navigate('/#/projects'); // Redirect to homepage if code is missing
      return;
    }

    try {
      const response = await fetch(
        `${process.env.REACT_APP_BACKEND_API_URL}/api/v1/auth/github/callback`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ code }),
        }
      );

      if (!response.ok) {
        throw new Error("Failed to exchange authorization code for token");
      }

      const { token } = await response.json();

      // Store the token (e.g., in localStorage)
      localStorage.setItem("jwt", token);

      // Redirect to the dashboard or a protected route
      navigate("/projects");
    } catch (error) {
      console.error("Error during OAuth callback:", error);
      // navigate('/#/projects'); // Redirect to homepage on error
    }
  };

  const fetchGitlabToken = async () => {
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get("code"); // GitLab authorization code

    if (!code) {
      console.error("Authorization code not found");
      // navigate('/#/projects'); // Redirect to homepage if code is missing
      return;
    }

    try {
      const response = await fetch(
        `${process.env.REACT_APP_BACKEND_API_URL}/api/v1/auth/gitlab/callback`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ code }),
        }
      );

      if (!response.ok) {
        throw new Error("Failed to exchange authorization code for token");
      }

      const { token } = await response.json();

      // Store the token (e.g., in localStorage)
      localStorage.setItem("jwt", token);

      // Redirect to the dashboard or a protected route
      navigate("/projects");
    } catch (error) {
      console.error("Error during OAuth callback:", error);
      // navigate('/#/projects'); // Redirect to homepage on error
    }
  };

  const fetchBitbucketToken = async () => {
    // Implement Bitbucket OAuth flow
  };

  useEffect(() => {
    console.log("Authenticating with", props.provider);

    if (props.provider === "github") fetchGithubToken();
    else if (props.provider === "gitlab") fetchGitlabToken();
    else if (props.provider === "bitbucket") fetchBitbucketToken();
    // else navigate('/');
  }, [props.provider]);

  return (
    <div className="flex flex-col gap-y-4 min-h-screen text-white bg-background-light dark:bg-background-dark p-2 justify-center items-center">
      <h1 className="text-4xl font-bold">Logging in</h1>
      <p className="text-text-gray">You will be redirected in a moment...</p>
    </div>
  );
}
