export async function splitCodebase(payload: { entrypointPath: string; targetDir?: string; outputDir?: string }) {
  const response = await fetch('/api/split', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });
  if (!response.ok || response.status !== 200) {
    throw new Error('Failed to sync endpoints');
  }
}
