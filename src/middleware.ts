import { NextRequest, NextResponse } from "next/server";

/**
 * Parse an IPv4 address into a 32-bit number.
 */
function ipv4ToInt(ip: string): number {
  const parts = ip.split(".").map(Number);
  if (parts.length !== 4 || parts.some((p) => isNaN(p) || p < 0 || p > 255)) {
    return -1;
  }
  return ((parts[0] << 24) | (parts[1] << 16) | (parts[2] << 8) | parts[3]) >>> 0;
}

/**
 * Check whether an IP matches a CIDR range or exact address.
 * Supports IPv4 exact match and /8, /16, /24 CIDR notation.
 * Supports IPv6 exact match (including ::1).
 */
function ipMatchesEntry(ip: string, entry: string): boolean {
  const trimmedEntry = entry.trim();
  const trimmedIp = ip.trim();

  // Handle CIDR notation for IPv4
  if (trimmedEntry.includes("/")) {
    const [network, prefixStr] = trimmedEntry.split("/");
    const prefix = parseInt(prefixStr, 10);
    if (![8, 16, 24].includes(prefix)) {
      // Only support /8, /16, /24 as specified
      return false;
    }
    const networkInt = ipv4ToInt(network);
    const ipInt = ipv4ToInt(trimmedIp);
    if (networkInt === -1 || ipInt === -1) return false;

    const mask = (0xffffffff << (32 - prefix)) >>> 0;
    return (networkInt & mask) === (ipInt & mask);
  }

  // Exact match (works for both IPv4 and IPv6)
  return trimmedIp === trimmedEntry;
}

function isIpAllowed(ip: string, allowedList: string[]): boolean {
  return allowedList.some((entry) => ipMatchesEntry(ip, entry));
}

export function middleware(request: NextRequest) {
  const allowedIpsEnv = process.env.ALLOWED_IPS;

  // If ALLOWED_IPS is not set, allow all traffic (dev mode)
  if (!allowedIpsEnv) {
    return NextResponse.next();
  }

  const allowedList = allowedIpsEnv.split(",").map((s) => s.trim()).filter(Boolean);
  if (allowedList.length === 0) {
    return NextResponse.next();
  }

  // Determine client IP from x-forwarded-for header or request.ip
  const forwarded = request.headers.get("x-forwarded-for");
  const clientIp = forwarded
    ? forwarded.split(",")[0].trim()
    : (request.headers.get("x-real-ip") ?? "");

  if (!clientIp || !isIpAllowed(clientIp, allowedList)) {
    return NextResponse.json(
      { error: "Forbidden: IP not whitelisted" },
      { status: 403 },
    );
  }

  return NextResponse.next();
}

export const config = {
  matcher: "/api/:path*",
};
