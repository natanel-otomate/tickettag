import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";
import { IdLog } from "@/types";

const PAGE_SIZE = 20;

async function validateMondayToken(token: string): Promise<boolean> {
  try {
    const response = await fetch("https://api.monday.com/v2", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: token,
      },
      body: JSON.stringify({ query: "{ me { id } }" }),
    });

    if (!response.ok) return false;

    const data = await response.json();
    return !!(data?.data?.me?.id);
  } catch {
    return false;
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { boardId: string } }
): Promise<NextResponse> {
  const { boardId } = params;

  if (!boardId || isNaN(Number(boardId))) {
    return NextResponse.json(
      { error: "Invalid board ID" },
      { status: 400 }
    );
  }

  const authHeader = request.headers.get("authorization");
  const token = authHeader?.replace(/^Bearer\s+/i, "").trim();

  if (!token) {
    return NextResponse.json(
      { error: "Missing authorization token" },
      { status: 401 }
    );
  }

  const isValid = await validateMondayToken(token);
  if (!isValid) {
    return NextResponse.json(
      { error: "Invalid or expired Monday session token" },
      { status: 401 }
    );
  }

  const { searchParams } = new URL(request.url);
  const pageParam = searchParams.get("page");
  const page = pageParam && !isNaN(Number(pageParam)) ? Math.max(1, parseInt(pageParam, 10)) : 1;
  const offset = (page - 1) * PAGE_SIZE;

  const supabase = createServerClient();

  const { data, error, count } = await supabase
    .from("id_log")
    .select("*", { count: "exact" })
    .eq("board_id", boardId)
    .order("created_at", { ascending: false })
    .range(offset, offset + PAGE_SIZE - 1);

  if (error) {
    console.error("[log/route] Supabase error:", error);
    return NextResponse.json(
      { error: "Failed to fetch log entries" },
      { status: 500 }
    );
  }

  const totalCount = count ?? 0;
  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  const entries: IdLog[] = (data ?? []).map((row) => ({
    id: row.id,
    board_id: row.board_id,
    item_id: row.item_id,
    generated_id: row.generated_id,
    status: row.status,
    error_message: row.error_message ?? null,
    created_at: row.created_at,
  }));

  return NextResponse.json({
    data: entries,
    pagination: {
      page,
      pageSize: PAGE_SIZE,
      totalCount,
      totalPages,
      hasNextPage: page < totalPages,
      hasPreviousPage: page > 1,
    },
  });
}