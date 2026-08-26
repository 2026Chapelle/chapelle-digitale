export async function parseEditorialResponse<T>(res: Response, fallback = 'Actualisation éditoriale impossible.'): Promise<T> {
  const body = await res.text()
  try { return JSON.parse(body) as T } catch { throw new Error(fallback) }
}
