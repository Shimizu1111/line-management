'use client'

import { useState, useEffect, useCallback } from 'react'
import type { AutoReply } from '@line-crm/shared'
import { api } from '@/lib/api'
import { useAccount } from '@/contexts/account-context'
import Header from '@/components/layout/header'

const matchTypeLabels: Record<string, string> = {
  exact: '完全一致',
  contains: '部分一致',
}

interface FormState {
  keyword: string
  matchType: 'exact' | 'contains'
  responseContent: string
}

const emptyForm: FormState = { keyword: '', matchType: 'contains', responseContent: '' }

export default function AutoRepliesPage() {
  const { selectedAccountId } = useAccount()
  const [items, setItems] = useState<AutoReply[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<FormState>(emptyForm)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const res = await api.autoReplies.list({ accountId: selectedAccountId || undefined })
      if (res.success) {
        setItems(res.data)
      } else {
        setError(res.error)
      }
    } catch {
      setError('自動応答の読み込みに失敗しました')
    } finally {
      setLoading(false)
    }
  }, [selectedAccountId])

  useEffect(() => { load() }, [load])

  const openCreate = () => {
    setForm(emptyForm)
    setEditingId(null)
    setShowForm(true)
    setFormError('')
  }

  const openEdit = (item: AutoReply) => {
    setForm({
      keyword: item.keyword,
      matchType: item.matchType as 'exact' | 'contains',
      responseContent: item.responseContent,
    })
    setEditingId(item.id)
    setShowForm(true)
    setFormError('')
  }

  const handleSave = async () => {
    if (!form.keyword.trim()) {
      setFormError('キーワードを入力してください')
      return
    }
    if (!form.responseContent.trim()) {
      setFormError('応答メッセージを入力してください')
      return
    }
    setSaving(true)
    setFormError('')
    try {
      if (editingId) {
        const res = await api.autoReplies.update(editingId, {
          keyword: form.keyword,
          matchType: form.matchType,
          responseContent: form.responseContent,
        })
        if (!res.success) { setFormError(res.error); return }
      } else {
        const res = await api.autoReplies.create({
          keyword: form.keyword,
          matchType: form.matchType,
          responseContent: form.responseContent,
          lineAccountId: selectedAccountId || undefined,
        })
        if (!res.success) { setFormError(res.error); return }
      }
      setShowForm(false)
      setEditingId(null)
      load()
    } catch {
      setFormError('保存に失敗しました')
    } finally {
      setSaving(false)
    }
  }

  const handleToggle = async (item: AutoReply) => {
    try {
      await api.autoReplies.update(item.id, { isActive: !item.isActive })
      load()
    } catch {
      setError('ステータスの変更に失敗しました')
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('この自動応答を削除してもよいですか？')) return
    try {
      await api.autoReplies.delete(id)
      load()
    } catch {
      setError('削除に失敗しました')
    }
  }

  return (
    <div>
      <Header
        title="自動応答"
        action={
          <button
            onClick={openCreate}
            className="px-4 py-2 min-h-[44px] text-sm font-medium text-white rounded-lg transition-opacity hover:opacity-90"
            style={{ backgroundColor: '#06C755' }}
          >
            + 新規ルール
          </button>
        }
      />

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {error}
        </div>
      )}

      {/* Create / Edit form */}
      {showForm && (
        <div className="mb-6 bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-sm font-semibold text-gray-800 mb-4">
            {editingId ? '自動応答を編集' : '新しい自動応答を追加'}
          </h2>
          <div className="space-y-4 max-w-lg">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                キーワード <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                placeholder='例: 相談したい'
                value={form.keyword}
                onChange={(e) => setForm({ ...form, keyword: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-2">マッチ方法</label>
              <div className="flex gap-2">
                {(['contains', 'exact'] as const).map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setForm({ ...form, matchType: type })}
                    className={`px-3 py-1.5 min-h-[44px] text-xs font-medium rounded-md border transition-colors ${
                      form.matchType === type
                        ? 'border-green-500 text-green-700 bg-green-50'
                        : 'border-gray-300 text-gray-600 bg-white hover:border-gray-400'
                    }`}
                  >
                    {matchTypeLabels[type]}
                  </button>
                ))}
              </div>
              <p className="text-xs text-gray-400 mt-1">
                {form.matchType === 'contains'
                  ? 'メッセージにキーワードが含まれていれば応答'
                  : 'メッセージがキーワードと完全に一致した場合のみ応答'}
              </p>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                応答メッセージ <span className="text-red-500">*</span>
              </label>
              <textarea
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 resize-y"
                rows={5}
                placeholder={'友だちにこのキーワードが送られたときに返すメッセージ...\n\n例:\nありがとうございます！\n以下のリンクから日程を選んでください。\nhttps://cal.com/xxx'}
                value={form.responseContent}
                onChange={(e) => setForm({ ...form, responseContent: e.target.value })}
              />
            </div>

            {formError && <p className="text-xs text-red-600">{formError}</p>}

            <div className="flex gap-2">
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-4 py-2 min-h-[44px] text-sm font-medium text-white rounded-lg disabled:opacity-50 transition-opacity"
                style={{ backgroundColor: '#06C755' }}
              >
                {saving ? '保存中...' : editingId ? '更新' : '追加'}
              </button>
              <button
                onClick={() => { setShowForm(false); setEditingId(null); setFormError('') }}
                className="px-4 py-2 min-h-[44px] text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              >
                キャンセル
              </button>
            </div>
          </div>
        </div>
      )}

      {/* List */}
      {loading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="bg-white rounded-lg border border-gray-200 p-5 animate-pulse space-y-3">
              <div className="h-4 bg-gray-200 rounded w-1/3" />
              <div className="h-3 bg-gray-100 rounded w-2/3" />
            </div>
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 p-8 text-center text-gray-400 text-sm">
          自動応答ルールがありません。「+ 新規ルール」から追加してください。
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <div
              key={item.id}
              className={`bg-white rounded-lg border border-gray-200 p-5 transition-colors ${
                !item.isActive ? 'opacity-60' : ''
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-700">
                      {item.keyword}
                    </span>
                    <span className="text-xs text-gray-400">
                      {matchTypeLabels[item.matchType] || item.matchType}
                    </span>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                      item.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                    }`}>
                      {item.isActive ? '有効' : '無効'}
                    </span>
                  </div>
                  <div className="text-sm text-gray-700 bg-gray-50 rounded-md px-3 py-2">
                    <p className="whitespace-pre-wrap break-words">{item.responseContent}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => handleToggle(item)}
                    className="text-xs text-gray-500 hover:text-gray-700 px-2 py-1 rounded hover:bg-gray-50 transition-colors min-h-[44px] flex items-center"
                  >
                    {item.isActive ? '無効化' : '有効化'}
                  </button>
                  <button
                    onClick={() => openEdit(item)}
                    className="text-xs text-green-600 hover:text-green-700 px-2 py-1 rounded hover:bg-green-50 transition-colors min-h-[44px] flex items-center"
                  >
                    編集
                  </button>
                  <button
                    onClick={() => handleDelete(item.id)}
                    className="text-xs text-red-500 hover:text-red-700 px-2 py-1 rounded hover:bg-red-50 transition-colors min-h-[44px] flex items-center"
                  >
                    削除
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
