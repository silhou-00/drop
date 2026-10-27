// Dev version of useTweaks. Turns a token file's defaults into live controls in
// the Leva panel (sliders for numbers, colour pickers for hex strings, text fields,
// toggles, selects) and returns the current values in the same shape as the defaults.
// Nested groups become Leva sub-folders. Every hook also records its latest values
// in a registry, which the dev panel's "Copy values" button reads.
import { useEffect, useMemo } from "react";
import { folder, useControls } from "leva";
import type { TweakField, TweakGroup, TweakSchema, TweakValue, TweakValues } from "./model";

type LevaInput = Record<string, unknown>;

const registry = new Map<string, TweakValues>();
const GROUP_SEPARATOR = "_";

// every live folder's current values, keyed by folder name
export function getTweakValues(): Record<string, TweakValues> {
    return Object.fromEntries(registry);
}

function isGroup(value: TweakValue | TweakGroup): value is TweakGroup {
    return typeof value === "object";
}

// one Leva input from a value and its optional edit settings
function toInput(value: TweakValue, field: TweakField<TweakValue> | undefined, label?: string): LevaInput {
    const input: LevaInput = { value, ...field };

    if (label) {
        input.label = label;
    }

    return input;
}

// group keys are prefixed so they stay unique across the whole folder
function toLevaSchema<T extends TweakValues>(defaults: T, schema: TweakSchema<T> | undefined): LevaInput {
    const levaSchema: LevaInput = {};

    for (const [key, value] of Object.entries(defaults)) {
        const field = (schema as Record<string, unknown> | undefined)?.[key];

        if (isGroup(value)) {
            const groupSchema = field as Record<string, TweakField<TweakValue>> | undefined;
            const inputs: LevaInput = {};

            for (const [subKey, subValue] of Object.entries(value)) {
                inputs[`${key}${GROUP_SEPARATOR}${subKey}`] = toInput(subValue, groupSchema?.[subKey], subKey);
            }

            levaSchema[key] = folder(inputs as never);
        } else {
            levaSchema[key] = toInput(value, field as TweakField<TweakValue> | undefined);
        }
    }

    return levaSchema;
}

// rebuilds the defaults' shape from Leva's flat value object
function fromLevaValues<T extends TweakValues>(defaults: T, flat: Record<string, TweakValue>): T {
    const result: TweakValues = {};

    for (const [key, value] of Object.entries(defaults)) {
        if (isGroup(value)) {
            const group: TweakGroup = {};

            for (const subKey of Object.keys(value)) {
                group[subKey] = flat[`${key}${GROUP_SEPARATOR}${subKey}`] ?? value[subKey];
            }

            result[key] = group;
        } else {
            result[key] = flat[key] ?? value;
        }
    }

    return result as T;
}

export function useTweaks<T extends TweakValues>(folderName: string, defaults: T, schema?: TweakSchema<T>): T {
    const levaSchema = useMemo(() => toLevaSchema(defaults, schema), [defaults, schema]);
    const flat = useControls(folderName, levaSchema as never) as Record<string, TweakValue>;
    const values = fromLevaValues(defaults, flat);
    const serialized = JSON.stringify(values);

    useEffect(() => {
        registry.set(folderName, JSON.parse(serialized) as TweakValues);

        return () => {
            registry.delete(folderName);
        };
    }, [folderName, serialized]);

    return useMemo(() => JSON.parse(serialized) as T, [serialized]);
}
