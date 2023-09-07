// write a sleep function
export function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
