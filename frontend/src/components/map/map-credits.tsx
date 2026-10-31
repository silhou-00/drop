// Credits for the map data and the place-name search, shown in the corner of every map as
// plain links that open in a new tab without handing this page to the site they open.
const CREDIT_REL = "noopener noreferrer";

export function MapCredits() {
    return (
        <p className="inbox-map-credit">
            <a href="https://www.openstreetmap.org/copyright" target="_blank" rel={CREDIT_REL}>
                © OpenStreetMap
            </a>
            <a href="https://protomaps.com" target="_blank" rel={CREDIT_REL}>
                Protomaps
            </a>
            <a href="https://locationiq.com" target="_blank" rel={CREDIT_REL}>
                Search by LocationIQ.com
            </a>
        </p>
    );
}
