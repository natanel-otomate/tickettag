import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";
import { formatId } from "@/lib/id-generator";
import { changeColumnValue } from "@/lib/monday";
import type { BoardConfig } from "@/types";

export async function POST(req: NextRequest): Promise<NextResponse> {
  let body: Record<string, unknown>;

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  // Monday.com webhook challenge handshake
  if (
    body.challenge !== undefined &&
    body.challenge !== null &&
    typeof body.challenge === "string"
  ) {
    return NextResponse.json({ challenge: body.challenge }, { status: 200 });
  }

  const event = body.event as Record<string, unknown> | undefined;

  if (!event) {
    return NextResponse.json({ error: "Missing event payload" }, { status: 400 });
  }

  const boardId = event.boardId as string | number | undefined;
  const itemId = event.pulseId as string | number | undefined;

  if (!boardId || !itemId) {
    return NextResponse.json(
      { error: "Missing boardId or pulseId in event" },
      { status: 400 }
    );
  }

  const boardIdStr = String(boardId);
  const itemIdStr = String(itemId);

  const supabase = createServerClient();

  // Fetch board config
  const { data: configData, error: configError } = await supabase
    .from("board_configs")
    .select("*")
    .eq("board_id", boardIdStr)
    .single();

  if (configError || !configData) {
    // No config found — board not set up, silently acknowledge
    return NextResponse.json({ status: "no_config" }, { status: 200 });
  }

  const config = configData as BoardConfig;

  // Atomically increment sequence using Supabase RPC to prevent duplicate IDs
  // under concurrent webhook calls. The RPC function increments next_sequence
  // and returns the value that was claimed by this invocation.
  const { data: rpcData, error: rpcError } = await supabase.rpc(
    "claim_next_sequence",
    { p_board_id: boardIdStr }
  );

  if (rpcError || rpcData === null || rpcData === undefined) {
    console.error("[webhook] claim_next_sequence RPC error:", rpcError);

    await supabase.from("id_log").insert({
      board_id: boardIdStr,
      item_id: itemIdStr,
      generated_id: null,
      status: "failed",
      error_message: rpcError?.message ?? "RPC returned null sequence",
    });

    return NextResponse.json(
      { error: "Failed to claim sequence number" },
      { status: 500 }
    );
  }

  const sequence: number = rpcData as number;

  const generatedId = formatId(config.prefix, sequence, config.padding_width);

  // Write the generated ID into the Monday.com column
  let mondayError: string | null = null;

  try {
    await changeColumnValue({
      boardId: boardIdStr,
      itemId: itemIdStr,
      columnId: config.target_column_id,
      value: generatedId,
    });
  } catch (err: unknown) {
    mondayError =
      err instanceof Error ? err.message : "Unknown Monday API error";
    console.error("[webhook] changeColumnValue error:", mondayError);
  }

  // Log the result to Supabase
  const { error: logError } = await supabase.from("id_log").insert({
    board_id: boardIdStr,
    item_id: itemIdStr,
    generated_id: generatedId,
    sequence_number: sequence,
    status: mondayError ? "failed" : "success",
    error_message: mondayError ?? null,
  });

  if (logError) {
    console.error("[webhook] Failed to write id_log entry:", logError);
  }

  if (mondayError) {
    return NextResponse.json(
      { error: "ID generated but Monday column write failed", generatedId },
      { status: 500 }
    );
  }

  return NextResponse.json({ status: "ok", generatedId }, { status: 200 });
}