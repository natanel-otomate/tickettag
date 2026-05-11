export interface BoardConfig {
  id: string;
  board_id: string;
  prefix: string;
  padding_width: number;
  start_number: number;
  current_sequence: number;
  target_column_id: string;
  target_column_title: string;
  created_at: string;
  updated_at: string;
}

export interface IdLog {
  id: string;
  board_id: string;
  item_id: string;
  item_name: string;
  generated_id: string;
  sequence_number: number;
  status: "success" | "failed";
  error_message: string | null;
  created_at: string;
}

export interface BoardColumn {
  id: string;
  title: string;
  type: string;
}

export interface MondayBoard {
  id: string;
  name: string;
  columns: BoardColumn[];
}

export interface MondayItem {
  id: string;
  name: string;
  board: {
    id: string;
  };
}

export interface MondayApiResponse<T> {
  data: T;
  errors?: MondayApiError[];
  account_id?: number;
}

export interface MondayApiError {
  message: string;
  locations?: Array<{
    line: number;
    column: number;
  }>;
  path?: string[];
  extensions?: {
    code: string;
    [key: string]: unknown;
  };
}

export interface MondayBoardsData {
  boards: MondayBoard[];
}

export interface MondayItemsData {
  items: MondayItem[];
}

export interface MondayChangeColumnValueData {
  change_column_value: {
    id: string;
  };
}

export interface WebhookChallenge {
  challenge: string;
}

export interface WebhookPayload {
  event: {
    type: string;
    boardId: number;
    pulseId: number;
    pulseName: string;
  };
}

export interface PaginatedLogResponse {
  data: IdLog[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

export interface ConfigFormValues {
  prefix: string;
  padding_width: number;
  start_number: number;
  target_column_id: string;
  target_column_title: string;
}