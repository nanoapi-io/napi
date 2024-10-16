import { Endpoint } from './types';

export async function scanCodebase(payload: {
  entrypoint: string;
  targetDir?: string; // default to the entrypoint directory
}) {
  const response = await fetch('/api/scan', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      entrypointPath: payload.entrypoint,
      targetDir: payload.targetDir,
    }),
  });

  if (!response.ok || response.status !== 200) {
    throw new Error('Failed to scan endpoints');
  }

  const responseBody = (await response.json()) as Promise<Endpoint[]>;

  return await responseBody;
}
