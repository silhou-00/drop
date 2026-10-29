// Sender and device keys. A keyed hash (HMAC) of the caller's IP or device id, so the
// database and the limiter hold a stable label that cannot be turned back into an address.
// IPv6 is reduced to its /64 first, because one subscriber controls a whole /64.
import { createHmac } from "node:crypto";

const IPV4_MAPPED_PREFIX = "::ffff:";
const IPV6_GROUPS = 8;
const IPV6_PREFIX_GROUPS = 4;

// expand an IPv6 address to its 8 groups, handling :: and an embedded IPv4 tail
function expandIpv6(ip: string): string[] {
    const [head, tail] = ip.split("::");
    const headGroups = head ? head.split(":") : [];
    const tailGroups = tail ? tail.split(":") : [];
    const missing = IPV6_GROUPS - headGroups.length - tailGroups.length;

    if (ip.includes("::")) {
        return [...headGroups, ...Array<string>(Math.max(missing, 0)).fill("0"), ...tailGroups];
    }

    return headGroups;
}

export function normalizeIp(ip: string): string {
    let value = ip.trim().toLowerCase();

    if (value.startsWith(IPV4_MAPPED_PREFIX) && value.includes(".")) {
        value = value.slice(IPV4_MAPPED_PREFIX.length);
    }

    if (!value.includes(":")) {
        return value;
    }

    const groups = expandIpv6(value.split("%")[0]);

    return `${groups
        .slice(0, IPV6_PREFIX_GROUPS)
        .map((group) => group.padStart(4, "0"))
        .join(":")}::/64`;
}

export function createKeyMaker(secret: string) {
    function hash(input: string): string {
        return createHmac("sha256", secret).update(input).digest("hex");
    }

    return {
        senderKey: (ip: string) => hash(`ip:${normalizeIp(ip)}`),
        deviceKey: (deviceId: string) => hash(`device:${deviceId}`),
    };
}

export type KeyMaker = ReturnType<typeof createKeyMaker>;
