'use client'

import { useState, useEffect, useCallback } from 'react'
import type { Tag, Scenario } from '@line-crm/shared'
import { api } from '@/lib/api'

type TrackedLink = {
  id: string
  name: string
  originalUrl: string
  trackingUrl: string
  tagId: string | null
  scenarioId: string | null
  introTemplateId: string | null
  rewardTemplateId: string | null
  isActive: boolean
  clickCount: number
  createdAt: string
  updatedAt: string
}

type CreateForm = {
  name: string
  originalUrl: string
  tagId: string
  scenarioId: string
  utmSource: string
  utmMedium: string
  utmCampaign: string
  utmTerm: string
  utmContent: string
}

const initialForm: CreateForm = {
  name: '',
  originalUrl: '',
  tagId: '',
  scenarioId: '',
  utmSource: '',
  utmMedium: '',
  utmCampaign: '',
  utmTerm: '',
  utmContent: '',
}

function buildUrlWithUtm(baseUrl: string, form: CreateForm): string {
  if (!baseUrl) return ''
  try {
    const url = new URL(baseUrl)
    if (form.utmSource) url.searchParams.set('utm_source', form.utmSource)
    if (form.utmMedium) url.searchParams.set('utm_medium', form.utmMedium)
    if (form.utmCampaign) url.searchParams.set('utm_campaign', form.utmCampaign)
    if (form.utmTerm) url.searchParams.set('utm_term', form.utmTerm)
    if (form.utmContent) url.searchParams.set('utm_content', form.utmContent)
    return url.toString()
  } catch {
    return baseUrl
  }
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

export default function TrackedLinksManager() {
  const [links, setLinks] = useState<TrackedLink[]>([])
  const [tags, setTags] = useState<Tag[]>([])
  const [scenarios, setScenarios] = useState<(Scenario & { stepCount?: number })[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [form, setForm] = useState<CreateForm>(initialForm)
  const [submitting, setSubmitting] = useState(false)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [showUtm, setShowUtm] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const [linksRes, tagsRes, scenariosRes] = await Promise.all([
        api.trackedLinks.list(),
        api.tags.list(),
        api.scenarios.list(),
      ])
      if (linksRes.success) setLinks(linksRes.data)
      else setError(linksRes.error)
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
    if (!form.name || !form.originalUrl) return
    setSubmitting(true)
    setError('')
    try {
      const finalUrl = buildUrlWithUtm(form.originalUrl, form)
      const res = await api.trackedLinks.create({
        name: form.name,
        originalUrl: finalUrl,
        tagId: form.tagId || null,
        scenarioId: form.scenarioId || null,
      })
      if (res.success) {
        setForm(initialForm)
        setShowCreate(false)
        setShowUtm(false)
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

  const handleToggleActive = async (link: TrackedLink) => {
    try {
      await api.trackedLinks.update(link.id, { isActive: !link.isActive })
      load()
    } catch {
      setError('更新に失敗しました')
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('このトラッキングリンクを削除してもよいですか？')) return
    try {
      await api.trackedLinks.delete(id)
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

  const previewUrl = buildUrlWithUtm(form.originalUrl, form)

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">トラッキングURL</h2>
          <p className="text-sm text-gray-500 mt-1">リンクのクリック計測・タグ自動付与・シナリオ自動登録</p>
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
          <h3 className="text-sm font-semibold text-gray-900 mb-4">新規トラッキングURL</h3>
          <form onSubmit={handleCreate} className="space-y-4">
            {/* Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">リンク名 <span className="text-red-500">*</span></label>
              <input
                type="text"
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="例: LP_キャンペーンA"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                required
              />
            </div>

            {/* Original URL */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">元URL <span className="text-red-500">*</span></label>
              <input
                type="url"
                value={form.originalUrl}
                onChange={e => setForm(f => ({ ...f, originalUrl: e.target.value }))}
                placeholder="https://example.com/lp"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                required
              />
            </div>

            {/* UTM Builder Toggle */}
            <div>
              <button
                type="button"
                onClick={() => setShowUtm(!showUtm)}
                className="text-sm text-blue-600 hover:text-blue-800 font-medium"
              >
                {showUtm ? 'UTMパラメータを閉じる' : 'UTMパラメータを追加'}
              </button>
            </div>

            {/* UTM Fields */}
            {showUtm && (
              <div className="p-4 bg-gray-50 rounded-lg space-y-3">
                <p className="text-xs text-gray-500 mb-2">UTMパラメータは元URLに自動付与されます</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">utm_source</label>
                    <input
                      type="text"
                      value={form.utmSource}
                      onChange={e => setForm(f => ({ ...f, utmSource: e.target.value }))}
                      placeholder="例: line"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">utm_medium</label>
                    <input
                      type="text"
                      value={form.utmMedium}
                      onChange={e => setForm(f => ({ ...f, utmMedium: e.target.value }))}
                      placeholder="例: social"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">utm_campaign</label>
                    <input
                      type="text"
                      value={form.utmCampaign}
                      onChange={e => setForm(f => ({ ...f, utmCampaign: e.target.value }))}
                      placeholder="例: spring_sale"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">utm_term</label>
                    <input
                      type="text"
                      value={form.utmTerm}
                      onChange={e => setForm(f => ({ ...f, utmTerm: e.target.value }))}
                      placeholder="例: keyword"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-medium text-gray-600 mb-1">utm_content</label>
                    <input
                      type="text"
                      value={form.utmContent}
                      onChange={e => setForm(f => ({ ...f, utmContent: e.target.value }))}
                      placeholder="例: banner_top"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    />
                  </div>
                </div>
                {/* Preview */}
                {form.originalUrl && (
                  <div className="mt-2">
                    <p className="text-xs font-medium text-gray-600 mb-1">プレビュー:</p>
                    <p className="text-xs text-gray-500 break-all bg-white p-2 rounded border border-gray-200">{previewUrl}</p>
                  </div>
                )}
              </div>
            )}

            {/* Tag */}
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

            {/* Scenario */}
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

            {/* Actions */}
            <div className="flex items-center gap-3 pt-2">
              <button
                type="submit"
                disabled={submitting || !form.name || !form.originalUrl}
                className="px-4 py-2 text-sm font-medium text-white rounded-lg transition-opacity hover:opacity-90 disabled:opacity-50"
                style={{ backgroundColor: '#06C755' }}
              >
                {submitting ? '作成中...' : '作成'}
              </button>
              <button
                type="button"
                onClick={() => { setShowCreate(false); setForm(initialForm); setShowUtm(false) }}
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
      ) : links.length === 0 && !showCreate ? (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
          <p className="text-gray-500">トラッキングURLがありません。「新規作成」から追加してください。</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[800px]">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">リンク名</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">トラッキングURL</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">クリック数</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">タグ / シナリオ</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">状態</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {links.map(link => (
                  <tr key={link.id} className="hover:bg-gray-50 transition-colors">
                    {/* Name + URL */}
                    <td className="px-4 py-3">
                      <div>
                        <p className="text-sm font-medium text-gray-900">{link.name}</p>
                        <p className="text-xs text-gray-400 mt-0.5 truncate max-w-[200px]" title={link.originalUrl}>
                          {link.originalUrl}
                        </p>
                      </div>
                    </td>

                    {/* Tracking URL + Copy */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <p className="text-xs text-blue-600 truncate max-w-[220px]" title={link.trackingUrl}>
                          {link.trackingUrl}
                        </p>
                        <button
                          onClick={() => handleCopy(link.trackingUrl, link.id)}
                          className="shrink-0 px-2 py-1 text-xs text-gray-500 hover:text-gray-700 bg-gray-100 hover:bg-gray-200 rounded transition-colors"
                        >
                          {copiedId === link.id ? 'コピー済' : 'コピー'}
                        </button>
                      </div>
                    </td>

                    {/* Click count */}
                    <td className="px-4 py-3">
                      <span className="text-sm font-medium text-gray-700">{link.clickCount.toLocaleString('ja-JP')}</span>
                    </td>

                    {/* Tag / Scenario */}
                    <td className="px-4 py-3">
                      <div className="space-y-1">
                        {getTagName(link.tagId) && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                            {getTagName(link.tagId)}
                          </span>
                        )}
                        {getScenarioName(link.scenarioId) && (
                          <p className="text-xs text-gray-500">{getScenarioName(link.scenarioId)}</p>
                        )}
                        {!getTagName(link.tagId) && !getScenarioName(link.scenarioId) && (
                          <span className="text-xs text-gray-400">-</span>
                        )}
                      </div>
                    </td>

                    {/* Active toggle */}
                    <td className="px-4 py-3">
                      <button
                        onClick={() => handleToggleActive(link)}
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium transition-colors ${
                          link.isActive
                            ? 'bg-green-100 text-green-700 hover:bg-green-200'
                            : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                        }`}
                      >
                        {link.isActive ? '有効' : '無効'}
                      </button>
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => handleDelete(link.id)}
                        className="px-3 py-1 min-h-[44px] text-xs font-medium text-red-500 hover:text-red-700 bg-red-50 hover:bg-red-100 rounded-md transition-colors"
                      >
                        削除
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
