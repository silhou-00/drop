// The signed-in owner's link, shared down the app from the one profile load in the app layout.
// Any screen inside the app reads it from here instead of asking the server again. The link is
// display text built from a username that passed the username rule; it is never an href.
import { createContext, useContext } from "react";
import type { OwnProfileState } from "@/hooks/profiles/use-own-profile";
import { linkText } from "@/lib/profiles/helper";

export const OwnLinkContext = createContext<OwnProfileState>({ status: "loading" });

export function useOwnLink() {
    const own = useContext(OwnLinkContext);

    if (own.status !== "ready") {
        return { status: own.status, link: "", displayName: "", message: own.status === "error" ? own.message : "" };
    }

    return {
        status: own.status,
        link: linkText(own.profile.username),
        displayName: own.profile.displayName,
        message: "",
    };
}
