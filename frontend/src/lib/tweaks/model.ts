// Shared types for the tweak system. Token files describe their default values
// and, optionally, a schema saying how each value is edited (slider range, select
// options). Both the dev and the production versions of useTweaks read these types.

export type TweakValue = number | string | boolean;
export type TweakGroup = Record<string, TweakValue>;
export type TweakValues = Record<string, TweakValue | TweakGroup>;

export type TweakNumberField = { min?: number; max?: number; step?: number };
export type TweakStringField = { options?: readonly string[] };

// per-value edit settings, chosen by the value's type
export type TweakField<V> = V extends number ? TweakNumberField : V extends string ? TweakStringField : never;

export type TweakSchema<T> = {
    [K in keyof T]?: T[K] extends TweakGroup ? TweakSchema<T[K]> : TweakField<T[K]>;
};
