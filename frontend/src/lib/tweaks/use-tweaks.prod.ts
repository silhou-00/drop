// Production version of useTweaks. The build points every import of the tweak hook
// here, so the live editing panel never reaches the shipped app: the token
// defaults are returned unchanged.
import type { TweakSchema, TweakValues } from "./model";

export function useTweaks<T extends TweakValues>(_folder: string, defaults: T, _schema?: TweakSchema<T>): T {
    return defaults;
}
