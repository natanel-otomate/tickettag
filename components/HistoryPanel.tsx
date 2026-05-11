'use client'

import { useEffect, useState, useCallback } from 'react'
import { createBrowserClient } from '@/lib/supabase'
import { IdLog } from '@/types'
import Badge from '@/components/ui/Badge'
import Toast from '@/components/ui/Toast'

interface HistoryPanelProps {
  boardId: string
}

interface PaginatedResponse {
  data: IdLog[]
  total: number
  page: number
  pageSize: number
}

interface ToastState {
  message: string
  type: 'success' | 'error'
}

const PAGE_SIZE = 20

export default function HistoryPanel({ boardId }: HistoryPanelProps) {
  const [logs, setLogs] = useState<IdLog[]>([])
  const [loading, setLoading] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)
  const [page, setPage] = useState<number>(1)
  const [total, setTotal] = useState<number>(0)
  const [retryingId, setRetryingId] = useState<string | null>(null)
  const [toast, setToast] = useState<ToastState | null>(null)

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  const fetchLogs = useCallback(async (targetPage: number) => {
    if (!boardId) return
    setLoading(true)
    setError(null)

    try {
      const params = new URLSearchParams({
        page: String(targetPage),
        pageSize: String(PAGE_SIZE),
      })

      const res = await fetch(`/api/boards/${boardId}/log?${params.toString()}`)

      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error ?? `Request failed with status ${res.status}`)
      }

      const json: PaginatedResponse = await res.json()
      setLogs(json.data)
      setTotal(json.total)
      setPage(json.page)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to load history'
      setError(message)
    } finally {
      setLoading(false)
    }
  }, [boardId])

  useEffect(() => {
    fetchLogs(1)
  }, [fetchLogs])

  const handleRetry = async (log: IdLog) => {
    setRetryingId(log.id)
    setToast(null)

    try {
      const res = await fetch(`/api/boards/${boardId}/retry`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ logId: log.id, itemId: log.monday_item_id }),
      })

      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error ?? `Retry failed with status ${res.status}`)
      }

      setToast({ message: 'Retry succeeded — ID written successfully.', type: 'success' })
      await fetchLogs(page)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Retry failed'
      setToast({ message, type: 'error' })
    } finally {
      setRetryingId(null)
    }
  }

  const handlePrevPage = () => {
    if (page > 1) fetchLogs(page - 1)
  }

  const handleNextPage = () => {
    if (page < totalPages) fetchLogs(page + 1)
  }

  const formatDate = (iso: string): string => {
    try {
      return new Intl.DateTimeFormat('en-US', {
        year: 'numeric',
        month: 'short',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
      }).format(new Date(iso))
    } catch {
      return iso
    }
  }

  return (
    <div className="flex flex-col gap-4 w-full">
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onDismiss={() => setToast(null)}
        />
      )}

      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-800">ID Generation History</h2>
        <button
          onClick={() => fetchLogs(page)}
          disabled={loading}
          className="text-sm text-blue-600 hover:text-blue-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? 'Refreshing…' : 'Refresh'}
        </button>
      </div>

      {error && (
        <div className="rounded-md bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="overflow-x-auto rounded-lg border border-gray-200 shadow-sm">
        <table className="min-w-full divide-y divide-gray-200 text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th
                scope="col"
                className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider"
              >
                Generated ID
              </th>
              <th
                scope="col"
                className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider"
              >
                Item ID
              </th>
              <th
                scope="col"
                className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider"
              >
                Sequence #
              </th>
              <th
                scope="col"
                className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider"
              >
                Status
              </th>
              <th
                scope="col"
                className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider"
              >
                Timestamp
              </th>
              <th
                scope="col"
                className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider"
              >
                Error
              </th>
              <th
                scope="col"
                className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider"
              >
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-100">
            {loading && logs.length === 0 && (
              <tr>
                <td
                  colSpan={7}
                  className="px-4 py-8 text-center text-gray-400 text-sm"
                >
                  Loading history…
                </td>
              </tr>
            )}
            {!loading && logs.length === 0 && !error && (
              <tr>
                <td
                  colSpan={7}
                  className="px-4 py-8 text-center text-gray-400 text-sm"
                >
                  No log entries found for this board.
                </td>
              </tr>
            )}
            {logs.map((log) => (
              <tr
                key={log.id}
                className="hover:bg-gray-50 transition-colors"
              >
                <td className="px-4 py-3 font-mono font-medium text-gray-900 whitespace-nowrap">
                  {log.generated_id ?? '—'}
                </td>
                <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                  {log.monday_item_id}
                </td>
                <td className="px-4 py-3 text-gray-600 whitespace-nowrap tabular-nums">
                  {log.sequence_number}
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <Badge status={log.status} />
                </td>
                <td className="px-4 py-3 text-gray-500 whitespace-nowrap tabular-nums">
                  {formatDate(log.created_at)}
                </td>
                <td className="px-4 py-3 text-red-500 text-xs max-w-xs truncate">
                  {log.error_message ?? '—'}
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  {log.status === 'failed' ? (
                    <button
                      onClick={() => handleRetry(log)}
                      disabled={retryingId === log.id}
                      className="inline-flex items-center gap-1.5 rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      {retryingId === log.id ? (
                        <>
                          <svg
                            className="animate-spin h-3 w-3 text-white"
                            xmlns="http://www.w3.org/2000/svg"
                            fill="none"
                            viewBox="0 0 24 24"
                            aria-hidden="true"
                          >
                            <circle
                              className="opacity-25"
                              cx="12"
                              cy="12"
                              r="10"
                              stroke="currentColor"
                              strokeWidth="4"
                            />
                            <path
                              className="opacity-75"
                              fill="currentColor"
                              d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 00-8 8h4z"
                            />
                          </svg>
                          Retrying…
                        </>
                      ) : (
                        'Retry'
                      )}
                    </button>
                  ) : (
                    <span className="text-gray-300 text-xs">—</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {total > 0 && (
        <div className="flex items-center justify-between text-sm text-gray-600">
          <p>
            Showing{' '}
            <span className="font-medium text-gray-800">
              {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, total)}
            </span>{' '}
            of <span className="font-medium text-gray-800">{total}</span> entries
          </p>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrevPage}
              disabled={page <= 1 || loading}
              className="inline-flex items-center gap-1 rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <svg
                className="h-4 w-4"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
                aria-hidden="true"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
              Previous
            </button>

            <span className="tabular-nums">
              Page{' '}
              <span className="font-semibold text-gray-800">{page}</span>
              {' '}of{' '}
              <span className="font-semibold text-gray-800">{totalPages}</span>
            </span>

            <button
              onClick={handleNextPage}
              disabled={page >= totalPages || loading}
              className="inline-flex items-center gap-1 rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Next
              <svg
                className="h-4 w-4"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
                aria-hidden="true"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>
      )}
    </div>
  )
}