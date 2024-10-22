import { exec } from "child_process";
import express from "express";

export async function findAvailablePort(port: number): Promise<number> {
  return new Promise((resolve, reject) => {
    const server = express().listen(port, () => {
      server.close(() => {
        resolve(port);
      });
    });

    server.on("error", (err: NodeJS.ErrnoException) => {
      if (err.code === "EADDRINUSE") {
        resolve(findAvailablePort(port + 1));
      } else {
        reject(err);
      }
    });
  });
}

export function openInBrowser(url: string) {
  let start = "";
  if (process.platform === "darwin") {
    start = "open";
  } else if (process.platform === "win32") {
    start = "start";
  } else {
    start = "xdg-open";
  }
  exec(`${start} ${url}`);
}
