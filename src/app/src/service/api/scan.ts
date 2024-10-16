import { Endpoint } from "./types";

export async function scanCodebase(payload: {
  entrypoint: string;
  targetDir?: string; // default to the entrypoint directory
}) {
  //   const response = await fetch("/api/scan", {
  //     method: "POST",
  //     headers: {
  //       "Content-Type": "application/json",
  //     },
  //     body: JSON.stringify(payload),
  //   });

  //   if (!response.ok || response.status !== 200) {
  //     throw new Error("Failed to scan endpoints");
  //   }

  //   const responseBody = (await response.json()) as Promise<Endpoint[]>;

  const responseBody = Promise.resolve([
    {
      method: "POST",
      path: "/api/v1/auth/signup",
      group: "Auth",
      dependencies: [
        "/home/code/express-api/src/index.ts",
        "/home/code/express-api/src/server.ts",
        "/home/code/express-api/src/users/router.ts",
        "/home/code/express-api/src/users/service/service.ts",
        "/home/code/express-api/src/users/service/user.ts",
        "/home/code/express-api/src/users/service/users.ts",
      ],
    },
    {
      method: "POST",
      path: "/api/v1/auth/signout",
      group: "Auth",
      dependencies: [
        "/home/code/express-api/src/index.ts",
        "/home/code/express-api/src/server.ts",
        "/home/code/express-api/src/users/router.ts",
        "/home/code/express-api/src/users/service/service.ts",
        "/home/code/express-api/src/users/service/user.ts",
        "/home/code/express-api/src/users/service/users.ts",
      ],
    },
    {
      method: "POST",
      path: "/api/v1/auth/signin",
      group: "Signin",
      dependencies: [
        "/home/code/express-api/src/index.ts",
        "/home/code/express-api/src/server.ts",
        "/home/code/express-api/src/users/router.ts",
        "/home/code/express-api/src/users/service/service.ts",
        "/home/code/express-api/src/users/service/user.ts",
        "/home/code/express-api/src/users/service/users.ts",
      ],
    },
    {
      method: "GET",
      path: "/api/v1/users/",
      group: "Users",
      dependencies: [
        "/home/code/express-api/src/index.ts",
        "/home/code/express-api/src/server.ts",
        "/home/code/express-api/src/users/router.ts",
        "/home/code/express-api/src/users/service/service.ts",
        "/home/code/express-api/src/users/service/user.ts",
        "/home/code/express-api/src/users/service/users.ts",
      ],
    },
    {
      method: "GET",
      path: "/api/v1/users/:id",
      group: "Users",
      dependencies: [
        "/home/code/express-api/src/index.ts",
        "/home/code/express-api/src/server.ts",
        "/home/code/express-api/src/users/router.ts",
        "/home/code/express-api/src/users/service/service.ts",
        "/home/code/express-api/src/users/service/user.ts",
        "/home/code/express-api/src/users/service/users.ts",
      ],
    },
    {
      method: "PATCH",
      path: "/api/v1/users/:id",
      group: "Users",
      dependencies: [
        "/home/code/express-api/src/index.ts",
        "/home/code/express-api/src/server.ts",
        "/home/code/express-api/src/users/router.ts",
        "/home/code/express-api/src/users/service/service.ts",
        "/home/code/express-api/src/users/service/user.ts",
        "/home/code/express-api/src/users/service/users.ts",
      ],
    },
    {
      method: "GET",
      path: "/api/v1/posts/",
      group: "Posts",
      dependencies: [
        "/home/code/express-api/src/index.ts",
        "/home/code/express-api/src/server.ts",
        "/home/code/express-api/src/users/router.ts",
        "/home/code/express-api/src/users/service/service.ts",
        "/home/code/express-api/src/users/service/user.ts",
        "/home/code/express-api/src/users/service/users.ts",
      ],
    },
    {
      method: "POST",
      path: "/api/v1/posts/",
      group: "Posts",
      dependencies: [
        "/home/code/express-api/src/index.ts",
        "/home/code/express-api/src/server.ts",
        "/home/code/express-api/src/users/router.ts",
        "/home/code/express-api/src/users/service/service.ts",
        "/home/code/express-api/src/users/service/user.ts",
        "/home/code/express-api/src/users/service/users.ts",
      ],
    },
    {
      method: "GET",
      path: "/api/v1/posts/:id/",
      group: "Posts",
      dependencies: [
        "/home/code/express-api/src/index.ts",
        "/home/code/express-api/src/server.ts",
        "/home/code/express-api/src/users/router.ts",
        "/home/code/express-api/src/users/service/service.ts",
        "/home/code/express-api/src/users/service/user.ts",
        "/home/code/express-api/src/users/service/users.ts",
      ],
    },
    {
      method: "PATCH",
      path: "/api/v1/posts/:id/",
      group: "Posts",
      dependencies: [
        "/home/code/express-api/src/index.ts",
        "/home/code/express-api/src/server.ts",
        "/home/code/express-api/src/users/router.ts",
        "/home/code/express-api/src/users/service/service.ts",
        "/home/code/express-api/src/users/service/user.ts",
        "/home/code/express-api/src/users/service/users.ts",
      ],
    },
    {
      method: "DELETE",
      path: "/api/v1/posts/:id/",
      group: "Posts",
      dependencies: [
        "/home/code/express-api/src/index.ts",
        "/home/code/express-api/src/server.ts",
        "/home/code/express-api/src/users/router.ts",
        "/home/code/express-api/src/users/service/service.ts",
        "/home/code/express-api/src/users/service/user.ts",
        "/home/code/express-api/src/users/service/users.ts",
      ],
    },
  ]) as Promise<Endpoint[]>;

  return await responseBody;
}
