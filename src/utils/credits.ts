export const REQUESTS_PER_CREDIT = 100;

export function requestsToCredits(requests: number): number {
  return Math.round(requests / REQUESTS_PER_CREDIT);
}
