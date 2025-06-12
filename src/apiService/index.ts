export class ApiService {
  private readonly apiHost: string;
  private readonly jwt: string | undefined;
  private readonly token: string | undefined;

  constructor(
    apiHost: string,
    jwt: string | undefined,
    token: string | undefined,
  ) {
    this.apiHost = apiHost;
    this.jwt = jwt;
    this.token = token;
  }

  private getHeaders() {
    const headers = new Headers();
    if (this.jwt) {
      headers.set("Authorization", `Bearer ${this.jwt}`);
    }
    if (this.token) {
      headers.set("x-api-token", this.token);
    }
    return headers;
  }

  public async performRequest(
    method: "GET" | "POST" | "PUT" | "DELETE",
    path: string,
    body?: object,
  ) {
    console.info(`${this.apiHost}${path}`);
    const response = await fetch(`${this.apiHost}${path}`, {
      method,
      headers: this.getHeaders(),
      body: body ? JSON.stringify(body) : undefined,
    });
    return response;
  }
}
