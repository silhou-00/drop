// The glass button column on a map: zoom in, zoom out, and one button that brings the view
// back to what the page is about. Each map names that last button for its own job.
import { CrosshairSimple, Minus, Plus } from "@phosphor-icons/react";

type MapControlsProps = {
    onZoomIn: () => void;
    onZoomOut: () => void;
    onLocate: () => void;
    locateLabel: string;
    className?: string;
};

export function MapControls({ onZoomIn, onZoomOut, onLocate, locateLabel, className }: MapControlsProps) {
    const classes = className ? `placement inbox-map-ctl ${className}` : "placement inbox-map-ctl";

    return (
        <div className={classes}>
            <div className="container">
                <button className="inbox-map-btn" type="button" aria-label="Zoom in" onClick={onZoomIn}>
                    <Plus weight="bold" aria-hidden="true" />
                </button>
            </div>
            <div className="container">
                <button className="inbox-map-btn" type="button" aria-label="Zoom out" onClick={onZoomOut}>
                    <Minus weight="bold" aria-hidden="true" />
                </button>
            </div>
            <div className="container">
                <button className="inbox-map-btn" type="button" aria-label={locateLabel} onClick={onLocate}>
                    <CrosshairSimple weight="bold" aria-hidden="true" />
                </button>
            </div>
        </div>
    );
}
