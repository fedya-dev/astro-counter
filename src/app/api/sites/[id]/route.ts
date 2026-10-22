import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  SESSION_COOKIE,
  buildTrackingSnippet,
  detectPublicOrigin,
  isValidSession,
} from "@/lib/visitor-utils";

function isAdmin(req: NextRequest): boolean {
  return isValidSession(req.cookies.get(SESSION_COOKIE)?.value);
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!isAdmin(req)) {
    return NextResponse.json(
      { ok: false, error: "unauthorized" },
      { status: 401 }
    );
  }
  try {
    const { id } = await params;
    const site = await db.site.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        slug: true,
        domain: true,
        apiKey: true,
        color: true,
      },
    });
    if (!site) {
      return NextResponse.json(
        { ok: false, error: "not_found" },
        { status: 404 }
      );
    }
    const baseUrl = detectPublicOrigin(req);
    const snippet = buildTrackingSnippet({
      baseUrl,
      slug: site.slug,
      apiKey: site.apiKey,
    });
    return NextResponse.json({ ok: true, site, snippet });
  } catch (err) {
    console.error("[/api/sites/[id] GET] error:", err);
    return NextResponse.json(
      { ok: false, error: "site_fetch_failed" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!isAdmin(req)) {
    return NextResponse.json(
      { ok: false, error: "unauthorized" },
      { status: 401 }
    );
  }
  try {
    const { id } = await params;
    const body = await req.json().catch(() => null);
    const data: { name?: string; domain?: string | null; color?: string | null } = {};
    if (typeof body?.name === "string" && body.name.trim()) {
      const n = body.name.trim();
      if (n.length >= 2 && n.length <= 80) data.name = n;
    }
    if (typeof body?.domain === "string") {
      data.domain = body.domain.trim() || null;
    }
    if (typeof body?.color === "string") {
      if (/^#[0-9a-fA-F]{6}$/.test(body.color)) {
        data.color = body.color;
      } else if (body.color === "") {
        data.color = null;
      }
    }
    const updated = await db.site.update({
      where: { id },
      data,
      select: {
        id: true,
        name: true,
        slug: true,
        domain: true,
        apiKey: true,
        color: true,
      },
    });
    return NextResponse.json({ ok: true, site: updated });
  } catch (err) {
    console.error("[/api/sites/[id] PATCH] error:", err);
    return NextResponse.json(
      { ok: false, error: "site_update_failed" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!isAdmin(req)) {
    return NextResponse.json(
      { ok: false, error: "unauthorized" },
      { status: 401 }
    );
  }
  try {
    const { id } = await params;
    await db.site.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[/api/sites/[id] DELETE] error:", err);
    return NextResponse.json(
      { ok: false, error: "site_delete_failed" },
      { status: 500 }
    );
  }
}
