// The Appearance choice on Settings: Light, Dark and Auto as one segmented radio group. Each
// option is a native radio inside its label, so arrow keys move the choice and a screen reader
// hears one group named by the Appearance row. A new choice grows out of the centre of the
// option that was picked.
import type { ChangeEvent } from "react";
import { useTheme } from "@/hooks/theme/use-theme";
import { THEME_PREFERENCES, type ThemePreference } from "@/lib/theme/model";

const LABELS: Record<ThemePreference, string> = { light: "Light", dark: "Dark", auto: "Auto" };

export function AppearanceControl() {
    const { preference, choose } = useTheme();

    // the picked option's centre is where the new theme grows from
    function handleChange(event: ChangeEvent<HTMLInputElement>, value: ThemePreference) {
        const label = event.currentTarget.closest("label");
        const rect = label?.getBoundingClientRect();
        const origin = rect ? { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 } : undefined;

        choose(value, origin);
    }

    return (
        <div className="settings-seg" role="radiogroup" aria-labelledby="appearance-label">
            {THEME_PREFERENCES.map((value) => (
                <label key={value} className="settings-seg-option">
                    <input
                        className="settings-seg-input"
                        type="radio"
                        name="appearance"
                        value={value}
                        checked={preference === value}
                        onChange={(event) => {
                            handleChange(event, value);
                        }}
                    />
                    <span>{LABELS[value]}</span>
                </label>
            ))}
        </div>
    );
}
