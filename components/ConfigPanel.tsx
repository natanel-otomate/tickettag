'use client'

import { useEffect, useState } from 'react'
import { createBrowserClient } from '@/lib/supabase'
import type { BoardConfig, BoardColumn } from '@/types'

interface Props {
  boardId: string
}

interface FormState {
  prefix: string
  paddingWidth: number
  startNumber: number
  targetColumnId: string
}

interface ValidationErrors {
  prefix?: string
  paddingWidth?: string
  startNumber?: string
  targetColumnId?: string
}

interface ToastState {
  message: string
  type: 'success' | 'error'
  visible: boolean
}

export default function ConfigPanel({ boardId }: Props) {
  const supabase = createBrowserClient()

  const [columns, setColumns] = useState<BoardColumn[]>([])
  const [loadingColumns, setLoadingColumns] = useState(true)
  const [loadingConfig, setLoadingConfig] = useState(true)
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState<ValidationErrors>({})
  const [toast, setToast] = useState<ToastState>({ message: '', type: 'success', visible: false })

  const [form, setForm] = useState<FormState>({
    prefix: 'TICKET',
    paddingWidth: 4,
    startNumber: 1,
    targetColumnId: '',
  })

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type, visible: true })
    setTimeout(() => setToast((prev) => ({ ...prev, visible: false })), 3000)
  }

  useEffect(() => {
    if (!boardId) return

    const fetchColumns = async () => {
      setLoadingColumns(true)
      try {
        const monday = (window as any).monday
        if (!monday) {
          setColumns([])
          return
        }
        const res = await monday.api(`
          query {
            boards(ids: [${boardId}]) {
              columns {
                id
                title
                type
              }
            }
          }
        `)
        const rawColumns: Array<{ id: string; title: string; type: string }> =
          res?.data?.boards?.[0]?.columns ?? []
        const textColumns = rawColumns.filter((c) => c.type === 'text')
        setColumns(textColumns)
      } catch (err) {
        console.error('Failed to load columns', err)
        setColumns([])
      } finally {
        setLoadingColumns(false)
      }
    }

    const fetchConfig = async () => {
      setLoadingConfig(true)
      try {
        const { data, error } = await supabase
          .from('board_configs')
          .select('*')
          .eq('board_id', boardId)
          .single()

        if (error && error.code !== 'PGRST116') {
          console.error('Failed to load config', error)
        }

        if (data) {
          setForm({
            prefix: data.prefix ?? 'TICKET',
            paddingWidth: data.padding_width ?? 4,
            startNumber: data.start_number ?? 1,
            targetColumnId: data.target_column_id ?? '',
          })
        }
      } catch (err) {
        console.error('Failed to load config', err)
      } finally {
        setLoadingConfig(false)
      }
    }

    fetchColumns()
    fetchConfig()
  }, [boardId])

  const validate = (): ValidationErrors => {
    const errs: ValidationErrors = {}

    if (!form.prefix) {
      errs.prefix = 'Prefix is required.'
    } else if (!/^[A-Z0-9]{1,10}$/.test(form.prefix)) {
      errs.prefix = 'Prefix must be 1–10 uppercase alphanumeric characters.'
    }

    if (!Number.isInteger(form.paddingWidth) || form.paddingWidth < 1 || form.paddingWidth > 10) {
      errs.paddingWidth = 'Padding width must be an integer between 1 and 10.'
    }

    if (!Number.isInteger(form.startNumber) || form.startNumber < 1) {
      errs.startNumber = 'Start number must be a positive integer.'
    }

    if (!form.targetColumnId) {
      errs.targetColumnId = 'Please select a target column.'
    }

    return errs
  }

  const handleChange = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }))
    setErrors((prev) => ({ ...prev, [key]: undefined }))
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()

    const validationErrors = validate()
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors)
      return
    }

    setSaving(true)
    try {
      const payload: Omit<BoardConfig, 'id' | 'created_at' | 'updated_at'> & {
        board_id: string
        prefix: string
        padding_width: number
        start_number: number
        target_column_id: string
        current_sequence: number
      } = {
        board_id: boardId,
        prefix: form.prefix,
        padding_width: form.paddingWidth,
        start_number: form.startNumber,
        target_column_id: form.targetColumnId,
        current_sequence: form.startNumber - 1,
      }

      const { error } = await supabase
        .from('board_configs')
        .upsert(payload, { onConflict: 'board_id' })

      if (error) {
        throw error
      }

      showToast('Configuration saved successfully.', 'success')
    } catch (err: any) {
      console.error('Save failed', err)
      showToast(err?.message ?? 'Failed to save configuration.', 'error')
    } finally {
      setSaving(false)
    }
  }

  const isLoading = loadingColumns || loadingConfig

  return (
    <div className="relative w-full max-w-lg mx-auto">
      {toast.visible && (
        <div
          role="status"
          aria-live="polite"
          className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg text-sm font-medium transition-opacity duration-300 ${
            toast.type === 'success'
              ? 'bg-green-50 text-green-800 border border-green-200'
              : 'bg-red-50 text-red-800 border border-red-200'
          }`}
        >
          {toast.message}
        </div>
      )}

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-1">Board Configuration</h2>
        <p className="text-sm text-gray-500 mb-6">
          Configure how TicketTag generates sequential IDs for this board.
        </p>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <svg
              className="animate-spin h-6 w-6 text-indigo-500"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              aria-label="Loading"
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
                d="M4 12a8 8 0 018-8v8H4z"
              />
            </svg>
            <span className="ml-3 text-sm text-gray-500">Loading configuration…</span>
          </div>
        ) : (
          <form onSubmit={handleSubmit} noValidate className="space-y-5">
            {/* Prefix */}
            <div>
              <label
                htmlFor="prefix"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Prefix
              </label>
              <input
                id="prefix"
                type="text"
                value={form.prefix}
                onChange={(e) => handleChange('prefix', e.target.value.toUpperCase())}
                placeholder="TICKET"
                maxLength={10}
                className={`w-full rounded-lg border px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition ${
                  errors.prefix ? 'border-red-400 bg-red-50' : 'border-gray-300 bg-white'
                }`}
                aria-describedby={errors.prefix ? 'prefix-error' : undefined}
              />
              {errors.prefix && (
                <p id="prefix-error" className="mt-1 text-xs text-red-600">
                  {errors.prefix}
                </p>
              )}
              <p className="mt-1 text-xs text-gray-400">
                1–10 uppercase alphanumeric characters (e.g., TICKET, ORD, BUG).
              </p>
            </div>

            {/* Padding Width */}
            <div>
              <label
                htmlFor="paddingWidth"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Padding Width
              </label>
              <input
                id="paddingWidth"
                type="number"
                min={1}
                max={10}
                value={form.paddingWidth}
                onChange={(e) =>
                  handleChange('paddingWidth', parseInt(e.target.value, 10) || 1)
                }
                className={`w-full rounded-lg border px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition ${
                  errors.paddingWidth ? 'border-red-400 bg-red-50' : 'border-gray-300 bg-white'
                }`}
                aria-describedby={errors.paddingWidth ? 'paddingWidth-error' : undefined}
              />
              {errors.paddingWidth && (
                <p id="paddingWidth-error" className="mt-1 text-xs text-red-600">
                  {errors.paddingWidth}
                </p>
              )}
              <p className="mt-1 text-xs text-gray-400">
                Zero-pad the sequence number to this many digits (e.g., 4 → 0042).
              </p>
            </div>

            {/* Start Number */}
            <div>
              <label
                htmlFor="startNumber"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Start Number
              </label>
              <input
                id="startNumber"
                type="number"
                min={1}
                value={form.startNumber}
                onChange={(e) =>
                  handleChange('startNumber', parseInt(e.target.value, 10) || 1)
                }
                className={`w-full rounded-lg border px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition ${
                  errors.startNumber ? 'border-red-400 bg-red-50' : 'border-gray-300 bg-white'
                }`}
                aria-describedby={errors.startNumber ? 'startNumber-error' : undefined}
              />
              {errors.startNumber && (
                <p id="startNumber-error" className="mt-1 text-xs text-red-600">
                  {errors.startNumber}
                </p>
              )}
              <p className="mt-1 text-xs text-gray-400">
                The first ID will use this sequence number. Must be ≥ 1.
              </p>
            </div>

            {/* Target Column */}
            <div>
              <label
                htmlFor="targetColumnId"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Target Column
              </label>
              {columns.length === 0 ? (
                <p className="text-sm text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                  No text columns found on this board. Please add a text column first.
                </p>
              ) : (
                <select
                  id="targetColumnId"
                  value={form.targetColumnId}
                  onChange={(e) => handleChange('targetColumnId', e.target.value)}
                  className={`w-full rounded-lg border px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition bg-white ${
                    errors.targetColumnId ? 'border-red-400 bg-red-50' : 'border-gray-300'
                  }`}
                  aria-describedby={errors.targetColumnId ? 'targetColumnId-error' : undefined}
                >
                  <option value="">Select a column…</option>
                  {columns.map((col) => (
                    <option key={col.id} value={col.id}>
                      {col.title}
                    </option>
                  ))}
                </select>
              )}
              {errors.targetColumnId && (
                <p id="targetColumnId-error" className="mt-1 text-xs text-red-600">
                  {errors.targetColumnId}
                </p>
              )}
              <p className="mt-1 text-xs text-gray-400">
                The generated ID will be written to this text column on every new item.
              </p>
            </div>

            {/* Preview */}
            <div className="rounded-lg bg-indigo-50 border border-indigo-100 px-4 py-3">
              <p className="text-xs font-medium text-indigo-700 mb-1">Preview</p>
              <p className="text-sm font-mono text-indigo-900">
                {form.prefix
                  ? `${form.prefix}-${String(form.startNumber).padStart(
                      form.paddingWidth,
                      '0'
                    )}`
                  : '—'}
              </p>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={saving || columns.length === 0}
              className="w-full flex items-center justify-center gap-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 disabled:cursor-not-allowed text-white text-sm font-medium px-4 py-2.5 transition focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
            >
              {saving && (
                <svg
                  className="animate-spin h-4 w-4 text-white"
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
                    d="M4 12a8 8 0 018-8v8H4z"
                  />
                </svg>
              )}
              {saving ? 'Saving…' : 'Save Configuration'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}