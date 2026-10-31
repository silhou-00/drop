// Theme bootstrap. Runs in the head before first paint and sets the stored light or dark
// choice on the root element, so the page never flashes the wrong theme. The key and the
// two values must stay in step with src/lib/theme/model.ts. No choice means follow the device.
try {
    const t = localStorage.getItem("drop-theme");

    if (t === "light" || t === "dark") {
        document.documentElement.setAttribute("data-theme", t);
    }
} catch {}
