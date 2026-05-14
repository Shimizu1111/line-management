'use client'

import { useState, useEffect, useCallback } from 'react'
import type { Tag, Scenario } from '@line-crm/shared'
import { api } from '@/lib/api'

const WORKER_BASE = process.env.NEXT_PUBLIC_API_URL || ''

type EntryRoute = {
  id: string
  refCode: string
  name: string
  tagId: string | null
  scenarioId: string | null
  redirectUrl: string | null
  isActive: boolean
  createdAt: string
  updatedAt: string
}

type CreateForm = {
  name: string
  refCode: string
  tagId: string
  scenarioId: string
  redirectUrl: string
}

const initialForm: CreateForm = {
  name: '',
  refCode: '',
  tagId: '',
  scenarioId: '',
  redirectUrl: '',
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString('ja-JP', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function buildFriendAddUrl(refCode: string): string {
  return `${WORKER_BASE}/r/${refCode}`
}

export default function EntryRoutesManager() {
  const [routes, setRoutes] = useState<EntryRoute[]>([])
  const [tags, setTags] = useState<Tag[]>([])
  const [scenarios, setScenarios] = useState<(Scenario & { stepCount?: number })[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [form, setForm] = useState<CreateForm>(initialForm)
  const [submitting, setSubmitting] = useState(false)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<CreateForm>(initialForm)

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const [routesRes, tagsRes, scenariosRes] = await Promise.all([
        api.entryRoutes.list(),
        api.tags.list(),
        api.scenarios.list(),
      ])
      if (routesRes.success) setRoutes(routesRes.data)
      else setError(routesRes.error)
      if (tagsRes.success) setTags(tagsRes.data)
      if (scenariosRes.success) setScenarios(scenariosRes.data)
    } catch {
      setError('データの読み込みに失敗しました')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name) return
    setSubmitting(true)
    setError('')
    try {
      const res = await api.entryRoutes.create({
        name: form.name,
        refCode: form.refCode || undefined,
        tagId: form.tagId || null,
        scenarioId: form.scenarioId || null,
        redirectUrl: form.redirectUrl || null,
      })
      if (res.success) {
        setForm(initialForm)
        setShowCreate(false)
        load()
      } else {
        setError(res.error)
      }
    } catch {
      setError('作成に失敗しました')
    } finally {
      setSubmitting(false)
    }
  }

  const handleStartEdit = (route: EntryRoute) => {
    setEditingId(route.id)
    setEditForm({
      name: route.name,
      refCode: route.refCode,
      tagId: route.tagId || '',
      scenarioId: route.scenarioId || '',
      redirectUrl: route.redirectUrl || '',
    })
  }

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingId || !editForm.name) return
    setSubmitting(true)
    setError('')
    try {
      const res = await api.entryRoutes.update(editingId, {
        name: editForm.name,
        tagId: editForm.tagId || null,
        scenarioId: editForm.scenarioId || null,
        redirectUrl: editForm.redirectUrl || null,
      })
      if (res.success) {
        setEditingId(null)
        load()
      } else {
        setError(res.error)
      }
    } catch {
      setError('更新に失敗しました')
    } finally {
      setSubmitting(false)
    }
  }

  const handleToggleActive = async (route: EntryRoute) => {
    try {
      await api.entryRoutes.update(route.id, { isActive: !route.isActive })
      load()
    } catch {
      setError('更新に失敗しました')
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('この流入経路を削除してもよいですか？')) return
    try {
      await api.entryRoutes.delete(id)
      load()
    } catch {
      setError('削除に失敗しました')
    }
  }

  const handleCopy = async (url: string, id: string) => {
    try {
      await navigator.clipboard.writeText(url)
      setCopiedId(id)
      setTimeout(() => setCopiedId(null), 2000)
    } catch {
      setError('コピーに失敗しました')
    }
  }

  const getTagName = (tagId: string | null) =>
    tagId ? tags.find(t => t.id === tagId)?.name ?? null : null

  const getScenarioName = (scenarioId: string | null) =>
    scenarioId ? scenarios.find(s => s.id === scenarioId)?.name ?? null : null

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">流入経路</h2>
          <p className="text-sm text-gray-500 mt-1">友だち追加URLの管理・タグ自動付与・シナリオ自動登録</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="px-4 py-2 text-sm font-medium text-white rounded-lg transition-opacity hover:opacity-90"
          style={{ backgroundColor: '#06C755' }}
        >
          + 新規作成
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {error}
        </div>
      )}

      {/* Create form */}
      {showCreate && (
        <div className="mb-6 bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">新規流入経路</h3>
          <form onSubmit={handleCreate} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">経路名 <span className="text-red-500">*</span></label>
              <input
                type="text"
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="例: Instagram広告_春キャンペーン"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">参照コード</label>
              <input
                type="text"
                value={form.refCode}
                onChange={e => setForm(f => ({ ...f, refCode: e.target.value }))}
                placeholder="空欄で自動生成（例: spring2025）"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
              <p className="text-xs text-gray-400 mt-1">URLに使用されるコード。英数字・ハイフン推奨</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">自動付与タグ</label>
              <select
                value={form.tagId}
                onChange={e => setForm(f => ({ ...f, tagId: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
              >
                <option value="">なし</option>
                {tags.map(tag => (
                  <option key={tag.id} value={tag.id}>{tag.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">自動登録シナリオ</label>
              <select
                value={form.scenarioId}
                onChange={e => setForm(f => ({ ...f, scenarioId: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
              >
                <option value="">なし</option>
                {scenarios.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">リダイレクトURL</label>
              <input
                type="url"
                value={form.redirectUrl}
                onChange={e => setForm(f => ({ ...f, redirectUrl: e.target.value }))}
                placeholder="https://example.com/thankyou"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
              <p className="text-xs text-gray-400 mt-1">友だち追加後にリダイレクトするURL（任意）</p>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="submit"
                disabled={submitting || !form.name}
                className="px-4 py-2 text-sm font-medium text-white rounded-lg transition-opacity hover:opacity-90 disabled:opacity-50"
                style={{ backgroundColor: '#06C755' }}
              >
                {submitting ? '作成中...' : '作成'}
              </button>
              <button
                type="button"
                onClick={() => { setShowCreate(false); setForm(initialForm) }}
                className="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              >
                キャンセル
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Edit form */}
      {editingId && (
        <div className="mb-6 bg-white rounded-lg shadow-sm border border-blue-200 p-6">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">流入経路を編集</h3>
          <form onSubmit={handleUpdate} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">経路名 <span className="text-red-500">*</span></label>
              <input
                type="text"
                value={editForm.name}
                onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">参照コード</label>
              <input
                type="text"
                value={editForm.refCode}
                disabled
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-gray-50 text-gray-500"
              />
              <p className="text-xs text-gray-400 mt-1">参照コードは変更できません</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">自動付与タグ</label>
              <select
                value={editForm.tagId}
                onChange={e => setEditForm(f => ({ ...f, tagId: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
              >
                <option value="">なし</option>
                {tags.map(tag => (
                  <option key={tag.id} value={tag.id}>{tag.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">自動登録シナリオ</label>
              <select
                value={editForm.scenarioId}
                onChange={e => setEditForm(f => ({ ...f, scenarioId: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
              >
                <option value="">なし</option>
                {scenarios.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">リダイレクトURL</label>
              <input
                type="url"
                value={editForm.redirectUrl}
                onChange={e => setEditForm(f => ({ ...f, redirectUrl: e.target.value }))}
                placeholder="https://example.com/thankyou"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="submit"
                disabled={submitting || !editForm.name}
                className="px-4 py-2 text-sm font-medium text-white rounded-lg transition-opacity hover:opacity-90 disabled:opacity-50"
                style={{ backgroundColor: '#06C755' }}
              >
                {submitting ? '更新中...' : '更新'}
              </button>
              <button
                type="button"
                onClick={() => setEditingId(null)}
                className="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              >
                キャンセル
              </button>
            </div>
          </form>
        </div>
      )}

      {/* List */}
      {loading ? (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="px-4 py-4 border-b border-gray-100 flex items-center gap-4 animate-pulse">
              <div className="flex-1 space-y-2">
                <div className="h-3 bg-gray-200 rounded w-48" />
                <div className="h-2 bg-gray-100 rounded w-32" />
              </div>
              <div className="h-5 bg-gray-100 rounded-full w-16" />
              <div className="h-3 bg-gray-100 rounded w-24" />
            </div>
          ))}
        </div>
      ) : routes.length === 0 && !showCreate ? (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
          <p className="text-gray-500">流入経路がありません。「新規作成」から追加してください。</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[800px]">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">経路名</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">友だち追加URL</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">タグ / シナリオ</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">状態</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">作成日</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {routes.map(route => {
                  const friendAddUrl = buildFriendAddUrl(route.refCode)
                  return (
                    <tr key={route.id} className="hover:bg-gray-50 transition-colors">
                      {/* Name + refCode */}
                      <td className="px-4 py-3">
                        <div>
                          <p className="text-sm font-medium text-gray-900">{route.name}</p>
                          <p className="text-xs text-gray-400 mt-0.5">ref: {route.refCode}</p>
                        </div>
                      </td>

                      {/* Friend add URL + Copy */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <p className="text-xs text-blue-600 truncate max-w-[250px]" title={friendAddUrl}>
                            {friendAddUrl}
                          </p>
                          <button
                            onClick={() => handleCopy(friendAddUrl, route.id)}
                            className="shrink-0 px-2 py-1 text-xs text-gray-500 hover:text-gray-700 bg-gray-100 hover:bg-gray-200 rounded transition-colors"
                          >
                            {copiedId === route.id ? 'コピー済' : 'コピー'}
                          </button>
                        </div>
                        {route.redirectUrl && (
                          <p className="text-xs text-gray-400 mt-0.5 truncate max-w-[250px]" title={route.redirectUrl}>
                            → {route.redirectUrl}
                          </p>
                        )}
                      </td>

                      {/* Tag / Scenario */}
                      <td className="px-4 py-3">
                        <div className="space-y-1">
                          {getTagName(route.tagId) && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                              {getTagName(route.tagId)}
                            </span>
                          )}
                          {getScenarioName(route.scenarioId) && (
                            <p className="text-xs text-gray-500">{getScenarioName(route.scenarioId)}</p>
                          )}
                          {!getTagName(route.tagId) && !getScenarioName(route.scenarioId) && (
                            <span className="text-xs text-gray-400">-</span>
                          )}
                        </div>
                      </td>

                      {/* Active toggle */}
                      <td className="px-4 py-3">
                        <button
                          onClick={() => handleToggleActive(route)}
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium transition-colors ${
                            route.isActive
                              ? 'bg-green-100 text-green-700 hover:bg-green-200'
                              : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                          }`}
                        >
                          {route.isActive ? '有効' : '無効'}
                        </button>
                      </td>

                      {/* Created */}
                      <td className="px-4 py-3 text-sm text-gray-500">
                        {formatDate(route.createdAt)}
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleStartEdit(route)}
                            className="px-3 py-1 min-h-[44px] text-xs font-medium text-blue-500 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-md transition-colors"
                          >
                            編集
                          </button>
                          <button
                            onClick={() => handleDelete(route.id)}
                            className="px-3 py-1 min-h-[44px] text-xs font-medium text-red-500 hover:text-red-700 bg-red-50 hover:bg-red-100 rounded-md transition-colors"
                          >
                            削除
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
