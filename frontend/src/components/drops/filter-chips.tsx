// The inbox filter row: All, Unread and Photos as pill buttons in one labelled group. The
// pressed chip is the filter in use; choosing another hands it to the list, which puts it in
// the address so a reload or a back step keeps it. A page may add its own class to place the row.
import { INBOX_FILTERS, type InboxFilter } from "@/lib/drops/model";

const LABELS: Record<InboxFilter, string> = { all: "All", unread: "Unread", photos: "Photos" };

type FilterChipsProps = { value: InboxFilter; onChange: (filter: InboxFilter) => void; className?: string };

export function FilterChips({ value, onChange, className }: FilterChipsProps) {
    const classes = className ? `placement inbox-chips ${className}` : "placement inbox-chips";

    return (
        <div className={classes} role="group" aria-label="Filter drops">
            {INBOX_FILTERS.map((filter) => (
                <div key={filter} className="container">
                    <button
                        className="inbox-chip"
                        type="button"
                        aria-pressed={filter === value}
                        onClick={() => {
                            onChange(filter);
                        }}
                    >
                        {LABELS[filter]}
                    </button>
                </div>
            ))}
        </div>
    );
}
