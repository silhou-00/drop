// The statement picker on the map: a native select with "All statements", each statement the
// loaded drops came from (cut short, with its drop count), and "Earlier" for drops from before
// statements. Choosing one hands it to the page, which puts it in the address. A native select
// keeps it light and works with every screen reader and keyboard. Text is shown as text.
import type { Statement } from "@/lib/statements/model";

const ALL_VALUE = "";
const OPTION_MAX = 40;

type StatementPickerProps = {
    statements: Statement[];
    earlierCount: number;
    value: string | undefined;
    onChange: (statement: string | undefined) => void;
};

// a long statement ends in an ellipsis, counted in code points
function shorten(text: string) {
    const points = Array.from(text);

    return points.length > OPTION_MAX ? `${points.slice(0, OPTION_MAX - 1).join("")}…` : text;
}

export function StatementPicker({ statements, earlierCount, value, onChange }: StatementPickerProps) {
    return (
        <div className="placement statement-picker">
            <div className="container">
                <label className="inbox-sr" htmlFor="statement-picker">
                    Statement
                </label>
            </div>
            <div className="container statement-picker-wrap">
                <select
                    id="statement-picker"
                    className="statement-select"
                    value={value ?? ALL_VALUE}
                    onChange={(event) => {
                        onChange(event.target.value === ALL_VALUE ? undefined : event.target.value);
                    }}
                >
                    <option value={ALL_VALUE}>All statements</option>
                    {statements.map((statement) => (
                        <option key={statement.id} value={statement.id}>
                            {shorten(statement.text)} ({statement.drop_count})
                        </option>
                    ))}
                    {earlierCount > 0 || value === "earlier" ? (
                        <option value="earlier">Earlier ({earlierCount})</option>
                    ) : null}
                </select>
            </div>
        </div>
    );
}
