import type { z } from "zod";
import type { globalConfigSchema } from "../cli/middlewares/globalConfig.ts";

export class ApiService {
  private readonly apiHost: string;
  private readonly jwt: string | undefined;
  private readonly token: string | undefined;

  constructor(
    globalConfig: z.infer<typeof globalConfigSchema>,
  ) {
    this.apiHost = globalConfig.apiHost;
    this.token = globalConfig.token;
    this.jwt = globalConfig.jwt;
  }

  private getHeaders() {
    const headers = new Headers();
    if (this.token) {
      headers.set("x-api-token", this.token);
    } else if (this.jwt) {
      headers.set("Authorization", `Bearer ${this.jwt}`);
    }
    return headers;
  }

  public async performRequest(
    method: "GET" | "POST" | "PUT" | "DELETE",
    path: string,
    body?: object,
  ) {
    const response = await fetch(`${this.apiHost}${path}`, {
      method,
      headers: this.getHeaders(),
      body: body ? JSON.stringify(body) : undefined,
    });
    return response;
  }
}
