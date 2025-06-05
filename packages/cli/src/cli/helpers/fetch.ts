import {
  getOrCreateGlobalConfig,
  setUserAuthToken,
} from "../../config/globalConfig.ts";

export default async function fetchWithAuth(url: string, options: RequestInit) {
  const config = getOrCreateGlobalConfig();
  const token = config.token;

  if (!token) {
    console.error("No token found, please login using 'napi login'");
    return;
  }

  const response = await fetch(url, {
    ...options,
    headers: {
      ...options.headers,
      Authorization: `Bearer ${token}`,
    },
  });

  // If the token is expired, remove it and prompt the user to login again
  // TODO: Improve this error handling based on the response body
  if (response.status === 401) {
    config.token = "";
    setUserAuthToken("");
    console.error("Token expired, please login again");
    return;
  }

  return response;
}
