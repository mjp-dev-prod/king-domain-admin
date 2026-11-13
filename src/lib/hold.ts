/**
 * Holds a request's result until at least `ms` have passed since it started, so a loading state never flashes (brand v1:
 * "a loading state is held at least 300 ms"). A failure is NOT held: an error shows at once.
 */
export async function atLeast<T>(request: Promise<T>, ms = 300): Promise<T> {
  const [value] = await Promise.all([request, new Promise<void>((resolve) => setTimeout(resolve, ms))])
  return value
}
