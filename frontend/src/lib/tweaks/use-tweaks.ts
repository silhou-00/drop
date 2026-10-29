// Token hook used by every token file. It returns the token defaults unchanged; there is no
// live editing panel, so a value is changed by editing the defaults in its tokens.ts file.
import type { TweakSchema, TweakValues } from "./model";

export function useTweaks<T extends TweakValues>(_folder: string, defaults: T, _schema?: TweakSchema<T>): T {
    return defaults;
}
