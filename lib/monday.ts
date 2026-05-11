lib/monday.ts
import mondaySdk from "monday-sdk-js";
import type { MondayApiResponse, BoardColumn } from "@/types";

const monday = mondaySdk();

export function initMonday(token?: string): void {
  if (token) {
    monday.setToken(token);
  }
}

export function getMondayInstance() {
  return monday;
}

/**
 * Fetch all columns for a given board.
 */
export async function getBoardColumns(
  boardId: string
): Promise<BoardColumn[]> {
  const query = `
    query GetBoardColumns($boardId: [ID!]) {
      boards(ids: $boardId) {
        columns {
          id
          title
          type
        }
      }
    }
  `;

  const response: MondayApiResponse<{
    boards: Array<{ columns: BoardColumn[] }>;
  }> = await monday.api(query, { variables: { boardId } });

  if (response.errors && response.errors.length > 0) {
    throw new Error(
      `Monday API error fetching columns: ${response.errors
        .map((e) => e.message)
        .join(", ")}`
    );
  }

  const boards = response.data?.boards;
  if (!boards || boards.length === 0) {
    return [];
  }

  return boards[0].columns;
}

/**
 * Fetch text columns only (type === "text") for a given board.
 */
export async function getTextColumns(boardId: string): Promise<BoardColumn[]> {
  const columns = await getBoardColumns(boardId);
  return columns.filter((col) => col.type === "text");
}

/**
 * Fetch all boards accessible to the authenticated user.
 */
export async function getBoards(): Promise<
  Array<{ id: string; name: string }>
> {
  const query = `
    query GetBoards {
      boards(limit: 100, order_by: created_at) {
        id
        name
      }
    }
  `;

  const response: MondayApiResponse<{
    boards: Array<{ id: string; name: string }>;
  }> = await monday.api(query);

  if (response.errors && response.errors.length > 0) {
    throw new Error(
      `Monday API error fetching boards: ${response.errors
        .map((e) => e.message)
        .join(", ")}`
    );
  }

  return response.data?.boards ?? [];
}

/**
 * Write a value into a specific column for a given item on a board.
 * Uses change_column_value mutation.
 */
export async function changeColumnValue(
  boardId: string,
  itemId: string,
  columnId: string,
  value: string
): Promise<void> {
  const mutation = `
    mutation ChangeColumnValue(
      $boardId: ID!,
      $itemId: ID!,
      $columnId: String!,
      $value: JSON!
    ) {
      change_column_value(
        board_id: $boardId,
        item_id: $itemId,
        column_id: $columnId,
        value: $value
      ) {
        id
      }
    }
  `;

  const columnValue = JSON.stringify({ text: value });

  const response: MondayApiResponse<{
    change_column_value: { id: string };
  }> = await monday.api(mutation, {
    variables: {
      boardId,
      itemId,
      columnId,
      value: columnValue,
    },
  });

  if (response.errors && response.errors.length > 0) {
    throw new Error(
      `Monday API error changing column value: ${response.errors
        .map((e) => e.message)
        .join(", ")}`
    );
  }
}

/**
 * Fetch a single item's column values.
 */
export async function getItemColumnValues(
  itemId: string
): Promise<Array<{ id: string; text: string; title: string }>> {
  const query = `
    query GetItemColumnValues($itemId: [ID!]) {
      items(ids: $itemId) {
        column_values {
          id
          text
          title: column {
            title
          }
        }
      }
    }
  `;

  const response: MondayApiResponse<{
    items: Array<{
      column_values: Array<{ id: string; text: string; title: string }>;
    }>;
  }> = await monday.api(query, { variables: { itemId } });

  if (response.errors && response.errors.length > 0) {
    throw new Error(
      `Monday API error fetching item column values: ${response.errors
        .map((e) => e.message)
        .join(", ")}`
    );
  }

  const items = response.data?.items;
  if (!items || items.length === 0) {
    return [];
  }

  return items[0].column_values;
}

/**
 * Server-side variant: call the Monday API using a raw fetch with a provided
 * OAuth / personal access token. Used in API route handlers where the SDK
 * browser instance is not available.
 */
export async function mondayApiRequest<T = unknown>(
  query: string,
  variables: Record<string, unknown> = {},
  token: string
): Promise<MondayApiResponse<T>> {
  const response = await fetch("https://api.monday.com/v2", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: token,
    },
    body: JSON.stringify({ query, variables }),
  });

  if (!response.ok) {
    throw new Error(
      `Monday HTTP error: ${response.status} ${response.statusText}`
    );
  }

  const json: MondayApiResponse<T> = await response.json();
  return json;
}

/**
 * Server-side change_column_value using mondayApiRequest.
 */
export async function changeColumnValueServer(
  boardId: string,
  itemId: string,
  columnId: string,
  value: string,
  token: string
): Promise<void> {
  const mutation = `
    mutation ChangeColumnValue(
      $boardId: ID!,
      $itemId: ID!,
      $columnId: String!,
      $value: JSON!
    ) {
      change_column_value(
        board_id: $boardId,
        item_id: $itemId,
        column_id: $columnId,
        value: $value
      ) {
        id
      }
    }
  `;

  const columnValue = JSON.stringify({ text: value });

  const response = await mondayApiRequest<{
    change_column_value: { id: string };
  }>(
    mutation,
    {
      boardId,
      itemId,
      columnId,
      value: columnValue,
    },
    token
  );

  if (response.errors && response.errors.length > 0) {
    throw new Error(
      `Monday API error (server) changing column value: ${response.errors
        .map((e) => e.message)
        .join(", ")}`
    );
  }
}