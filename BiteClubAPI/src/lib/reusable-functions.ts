export function omit<T extends object, K extends keyof T>(
    obj: T,
    ...keys: K[]
): Omit<T, K> {
    const clone = { ...obj };
    for (const key of keys) {
        delete clone[key];
    }
    return clone;
}
