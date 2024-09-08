export function getRandomInt(opts?: {min?: number, max?: number}): number {
    const min = Math.ceil(opts?.min ?? 0);
    const max = Math.ceil(opts?.max ?? 10000000);
    return Math.floor(Math.random() * (max - min + 1)) + min;
}