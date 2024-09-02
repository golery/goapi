export function parseIntOpt(s?: string): number | undefined {
    if (s === undefined) {
        return undefined;
    }
    const n = parseInt(s);
    if (Number.isNaN(n)) {
        return undefined;
    }
    return n;
}