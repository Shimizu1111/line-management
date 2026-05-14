'use client'

import { useState, useEffect, useCallback } from 'react'
import { api, type ApiForm, type FormField } from '@/lib/api'
import type { Tag, Scenario } from '@line-crm/shared'
import Header from '@/components/layout/header'

const FIELD_TYPES: { value: FormField['type']; label: string }[] = [
  { value: 'text', label: 'テキスト' },
  { value: 'textarea', label: 'テキストエリア' },
  { value: 'email', label: 'メール' },
  { value: 'tel', label: '電話番号' },
  { value: 'number', label: '数値' },
  { value: 'select', label: 'セレクト' },
  { value: 'radio', label: 'ラジオ' },
  { value: 'checkbox', label: 'チェックボックス' },
]

const FIELD_TYPES_WITH_OPTIONS = new Set<FormField['type']>(['select', 'radio', 'checkbox'])

function emptyField(): FormField {
  return { name: '', label: '', type: 'text', required: false }
}

export default function FormsPage() {
  const [forms, setForms] = useState<ApiForm[]>([])
  const [tags, setTags] = useState<Tag[]>([])
  const [scenarios, setScenarios] = useState<Scenario[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [editingForm, setEditingForm] = useState<ApiForm | null>(null)
  const [showCreate, setShowCreate] = useState(false)
  const [previewForm, setPreviewForm] = useState<ApiForm | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const [formsRes, tagsRes, scenariosRes] = await Promise.all([
        api.forms.list(),
        api.tags.list(),
        api.scenarios.list(),
      ])
      if (formsRes.success) setForms(formsRes.data)
      else setError('フォームの読み込みに失敗しました')
      if (tagsRes.success) setTags(tagsRes.data)
      if (scenariosRes.success) setScenarios(scenariosRes.data)
    } catch {
      setError('データの読み込みに失敗しました。もう一度お試しください。')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const handleDelete = async (id: string) => {
    if (!confirm('このフォームを削除してもよいですか？')) return
    try {
      await api.forms.delete(id)
      load()
    } catch {
      setError('削除に失敗しました')
    }
  }

  return (
    <div>
      <Header
        title="フォーム管理"
        action={
          <button
            onClick={() => { setShowCreate(true); setEditingForm(null) }}
            className="px-4 py-2 text-sm font-medium text-white rounded-lg transition-opacity hover:opacity-90"
            style={{ backgroundColor: '#06C755' }}
          >
            + 新規フォーム
          </button>
        }
      />

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {error}
        </div>
      )}

      {previewForm && (
        <PreviewModal
          form={previewForm}
          onClose={() => setPreviewForm(null)}
        />
      )}

      {(showCreate || editingForm) && (
        <FormEditor
          form={editingForm}
          tags={tags}
          scenarios={scenarios}
          onSuccess={() => { setShowCreate(false); setEditingForm(null); load() }}
          onCancel={() => { setShowCreate(false); setEditingForm(null) }}
        />
      )}

      {loading ? (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="px-4 py-4 border-b border-gray-100 flex items-center gap-4 animate-pulse">
              <div className="flex-1 space-y-2">
                <div className="h-3 bg-gray-200 rounded w-48" />
                <div className="h-2 bg-gray-100 rounded w-32" />
              </div>
              <div className="h-5 bg-gray-100 rounded-full w-16" />
            </div>
          ))}
        </div>
      ) : forms.length === 0 && !showCreate ? (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
          <p className="text-gray-500">フォームがありません。「新規フォーム」から作成してください。</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px]">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">フォーム名</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">フィールド数</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">回答数</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">ステータス</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">作成日</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {forms.map((form) => (
                  <tr key={form.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <div>
                        <p className="text-sm font-medium text-gray-900">{form.name}</p>
                        {form.description && (
                          <p className="text-xs text-gray-400 mt-0.5">{form.description}</p>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {form.fields.length} 件
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {form.submitCount} 件
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                        form.isActive
                          ? 'bg-green-100 text-green-700'
                          : 'bg-gray-100 text-gray-600'
                      }`}>
                        {form.isActive ? '有効' : '無効'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {new Date(form.createdAt).toLocaleDateString('ja-JP')}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => setPreviewForm(form)}
                          className="px-3 py-1 min-h-[44px] text-xs font-medium text-purple-600 hover:text-purple-800 bg-purple-50 hover:bg-purple-100 rounded-md transition-colors"
                        >
                          プレビュー
                        </button>
                        <LiffUrlButton formId={form.id} />
                        <button
                          onClick={() => { setEditingForm(form); setShowCreate(false) }}
                          className="px-3 py-1 min-h-[44px] text-xs font-medium text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 rounded-md transition-colors"
                        >
                          編集
                        </button>
                        <button
                          onClick={() => handleDelete(form.id)}
                          className="px-3 py-1 min-h-[44px] text-xs font-medium text-red-500 hover:text-red-700 bg-red-50 hover:bg-red-100 rounded-md transition-colors"
                        >
                          削除
                        </button>
                      </div>
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

// ─── Form Editor ────────────────────────────────────────────────────────────

function FormEditor({
  form,
  tags,
  scenarios,
  onSuccess,
  onCancel,
}: {
  form: ApiForm | null
  tags: Tag[]
  scenarios: Scenario[]
  onSuccess: () => void
  onCancel: () => void
}) {
  const isEdit = !!form
  const [name, setName] = useState(form?.name ?? '')
  const [description, setDescription] = useState(form?.description ?? '')
  const [fields, setFields] = useState<FormField[]>(form?.fields ?? [])
  const [onSubmitTagId, setOnSubmitTagId] = useState(form?.onSubmitTagId ?? '')
  const [onSubmitScenarioId, setOnSubmitScenarioId] = useState(form?.onSubmitScenarioId ?? '')
  const [onSubmitMessageType, setOnSubmitMessageType] = useState(form?.onSubmitMessageType ?? '')
  const [onSubmitMessageContent, setOnSubmitMessageContent] = useState(form?.onSubmitMessageContent ?? '')
  const [onSubmitWebhookUrl, setOnSubmitWebhookUrl] = useState(form?.onSubmitWebhookUrl ?? '')
  const [saveToMetadata, setSaveToMetadata] = useState(form?.saveToMetadata ?? false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const addField = () => setFields([...fields, emptyField()])

  const updateField = (index: number, updates: Partial<FormField>) => {
    setFields(fields.map((f, i) => {
      if (i !== index) return f
      const updated = { ...f, ...updates }
      if (updates.type && !FIELD_TYPES_WITH_OPTIONS.has(updates.type)) {
        delete updated.options
      }
      return updated
    }))
  }

  const removeField = (index: number) => {
    setFields(fields.filter((_, i) => i !== index))
  }

  const moveField = (index: number, direction: -1 | 1) => {
    const newIndex = index + direction
    if (newIndex < 0 || newIndex >= fields.length) return
    const newFields = [...fields]
    const temp = newFields[index]
    newFields[index] = newFields[newIndex]
    newFields[newIndex] = temp
    setFields(newFields)
  }

  const handleSubmit = async () => {
    if (!name.trim()) {
      setError('フォーム名を入力してください')
      return
    }
    for (const field of fields) {
      if (!field.name.trim() || !field.label.trim()) {
        setError('すべてのフィールドに名前とラベルを入力してください')
        return
      }
      if (FIELD_TYPES_WITH_OPTIONS.has(field.type) && (!field.options || field.options.length === 0)) {
        setError(`フィールド「${field.label}」に選択肢を追加してください`)
        return
      }
    }

    setSaving(true)
    setError('')
    try {
      const data = {
        name: name.trim(),
        description: description.trim() || null,
        fields,
        onSubmitTagId: onSubmitTagId || null,
        onSubmitScenarioId: onSubmitScenarioId || null,
        onSubmitMessageType: onSubmitMessageType || null,
        onSubmitMessageContent: onSubmitMessageContent || null,
        onSubmitWebhookUrl: onSubmitWebhookUrl || null,
        saveToMetadata,
      }

      if (isEdit) {
        await api.forms.update(form.id, data)
      } else {
        await api.forms.create(data)
      }
      onSuccess()
    } catch {
      setError('保存に失敗しました')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="mb-6 bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <h2 className="text-lg font-bold text-gray-900 mb-4">
        {isEdit ? 'フォーム編集' : '新規フォーム作成'}
      </h2>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {error}
        </div>
      )}

      {/* 基本情報 */}
      <div className="space-y-4 mb-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">フォーム名 *</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
            placeholder="例: アンケートフォーム"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">説明</label>
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
            placeholder="例: 新規友だち向けアンケート"
          />
        </div>
      </div>

      {/* フィールド一覧 */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-gray-700">フィールド</h3>
          <button
            onClick={addField}
            className="px-3 py-1.5 text-xs font-medium text-white rounded-md transition-opacity hover:opacity-90"
            style={{ backgroundColor: '#06C755' }}
          >
            + フィールド追加
          </button>
        </div>

        {fields.length === 0 ? (
          <p className="text-sm text-gray-400 py-4 text-center border border-dashed border-gray-300 rounded-lg">
            フィールドがありません。「フィールド追加」ボタンで追加してください。
          </p>
        ) : (
          <div className="space-y-3">
            {fields.map((field, index) => (
              <FieldRow
                key={index}
                field={field}
                index={index}
                total={fields.length}
                onChange={(updates) => updateField(index, updates)}
                onRemove={() => removeField(index)}
                onMove={(dir) => moveField(index, dir)}
              />
            ))}
          </div>
        )}
      </div>

      {/* 送信後アクション */}
      <div className="mb-6 border-t border-gray-200 pt-6">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">送信後アクション</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">タグ付与</label>
            <select
              value={onSubmitTagId}
              onChange={(e) => setOnSubmitTagId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
            >
              <option value="">なし</option>
              {tags.map((tag) => (
                <option key={tag.id} value={tag.id}>{tag.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">シナリオ登録</label>
            <select
              value={onSubmitScenarioId}
              onChange={(e) => setOnSubmitScenarioId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
            >
              <option value="">なし</option>
              {scenarios.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">返信メッセージタイプ</label>
            <select
              value={onSubmitMessageType}
              onChange={(e) => setOnSubmitMessageType(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
            >
              <option value="">デフォルト（診断結果Flex）</option>
              <option value="text">テキスト</option>
              <option value="flex">Flex</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">返信メッセージ内容</label>
            <textarea
              value={onSubmitMessageContent}
              onChange={(e) => setOnSubmitMessageContent(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
              rows={2}
              placeholder="送信後に返信するメッセージ"
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-xs font-medium text-gray-600 mb-1">Webhook URL</label>
            <input
              type="text"
              value={onSubmitWebhookUrl}
              onChange={(e) => setOnSubmitWebhookUrl(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
              placeholder="https://..."
            />
          </div>
          <div className="md:col-span-2">
            <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
              <input
                type="checkbox"
                checked={saveToMetadata}
                onChange={(e) => setSaveToMetadata(e.target.checked)}
                className="rounded border-gray-300 text-green-600 focus:ring-green-500"
              />
              回答をメタデータに保存
            </label>
          </div>
        </div>
      </div>

      {/* アクションボタン */}
      <div className="flex items-center justify-end gap-3 border-t border-gray-200 pt-4">
        <button
          onClick={onCancel}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
        >
          キャンセル
        </button>
        <button
          onClick={handleSubmit}
          disabled={saving}
          className="px-4 py-2 text-sm font-medium text-white rounded-lg transition-opacity hover:opacity-90 disabled:opacity-50"
          style={{ backgroundColor: '#06C755' }}
        >
          {saving ? '保存中...' : isEdit ? '更新' : '作成'}
        </button>
      </div>
    </div>
  )
}

// ─── LIFF URL Button ────────────────────────────────────────────────────────

function LiffUrlButton({ formId }: { formId: string }) {
  const [copied, setCopied] = useState(false)
  const liffId = process.env.NEXT_PUBLIC_LIFF_ID

  const handleCopy = async () => {
    if (!liffId) {
      alert('LIFF IDが設定されていません（NEXT_PUBLIC_LIFF_ID）')
      return
    }
    const url = `https://liff.line.me/${liffId}?formId=${formId}`
    await navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <button
      onClick={handleCopy}
      className={`px-3 py-1 min-h-[44px] text-xs font-medium rounded-md transition-colors ${
        copied
          ? 'text-green-700 bg-green-100'
          : 'text-emerald-600 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100'
      }`}
    >
      {copied ? 'コピー済み' : 'LIFF URL'}
    </button>
  )
}

// ─── Preview Modal ──────────────────────────────────────────────────────────

function PreviewModal({ form, onClose }: { form: ApiForm; onClose: () => void }) {
  const liffId = process.env.NEXT_PUBLIC_LIFF_ID
  const liffUrl = liffId ? `https://liff.line.me/${liffId}?formId=${form.id}` : null
  const [copied, setCopied] = useState(false)

  const handleCopyUrl = async () => {
    if (!liffUrl) return
    await navigator.clipboard.writeText(liffUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-lg shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between rounded-t-lg">
          <h2 className="text-lg font-bold text-gray-900">プレビュー: {form.name}</h2>
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-gray-600"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="px-6 py-4 space-y-4">
          {form.description && (
            <p className="text-sm text-gray-500">{form.description}</p>
          )}

          {form.fields.map((field, i) => (
            <div key={i}>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {field.label}
                {field.required && <span className="text-red-500 ml-1">*</span>}
              </label>
              <PreviewField field={field} />
            </div>
          ))}

          {form.fields.length === 0 && (
            <p className="text-sm text-gray-400 text-center py-4">フィールドがありません</p>
          )}
        </div>

        {/* LIFF URL */}
        <div className="border-t border-gray-200 px-6 py-4">
          <label className="block text-xs font-medium text-gray-500 mb-1">LIFF URL</label>
          {liffUrl ? (
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={liffUrl}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm bg-gray-50 text-gray-600"
              />
              <button
                onClick={handleCopyUrl}
                className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors whitespace-nowrap ${
                  copied
                    ? 'text-green-700 bg-green-100'
                    : 'text-white hover:opacity-90'
                }`}
                style={copied ? undefined : { backgroundColor: '#06C755' }}
              >
                {copied ? 'コピー済み' : 'コピー'}
              </button>
            </div>
          ) : (
            <p className="text-sm text-gray-400">NEXT_PUBLIC_LIFF_ID が未設定です</p>
          )}
        </div>
      </div>
    </div>
  )
}

function PreviewField({ field }: { field: FormField }) {
  switch (field.type) {
    case 'textarea':
      return (
        <textarea
          disabled
          placeholder={field.label}
          rows={3}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-gray-50"
        />
      )
    case 'select':
      return (
        <select disabled className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-gray-50">
          <option value="">選択してください</option>
          {(field.options || []).map((opt, i) => (
            <option key={i}>{opt}</option>
          ))}
        </select>
      )
    case 'radio':
      return (
        <div className="space-y-1">
          {(field.options || []).map((opt, i) => (
            <label key={i} className="flex items-center gap-2 text-sm text-gray-700">
              <input type="radio" disabled name={field.name} className="text-green-600" />
              {opt}
            </label>
          ))}
        </div>
      )
    case 'checkbox':
      return (
        <div className="space-y-1">
          {(field.options || []).map((opt, i) => (
            <label key={i} className="flex items-center gap-2 text-sm text-gray-700">
              <input type="checkbox" disabled className="rounded text-green-600" />
              {opt}
            </label>
          ))}
        </div>
      )
    default:
      return (
        <input
          type={field.type}
          disabled
          placeholder={field.label}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-gray-50"
        />
      )
  }
}

// ─── Field Row ──────────────────────────────────────────────────────────────

function FieldRow({
  field,
  index,
  total,
  onChange,
  onRemove,
  onMove,
}: {
  field: FormField
  index: number
  total: number
  onChange: (updates: Partial<FormField>) => void
  onRemove: () => void
  onMove: (direction: -1 | 1) => void
}) {
  const [optionInput, setOptionInput] = useState('')
  const showOptions = FIELD_TYPES_WITH_OPTIONS.has(field.type)

  const addOption = () => {
    if (!optionInput.trim()) return
    const options = [...(field.options || []), optionInput.trim()]
    onChange({ options })
    setOptionInput('')
  }

  const removeOption = (optIndex: number) => {
    const options = (field.options || []).filter((_, i) => i !== optIndex)
    onChange({ options })
  }

  return (
    <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
      <div className="flex items-start gap-3">
        {/* 並び替えボタン */}
        <div className="flex flex-col gap-1 pt-1">
          <button
            onClick={() => onMove(-1)}
            disabled={index === 0}
            className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30"
            title="上に移動"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
            </svg>
          </button>
          <button
            onClick={() => onMove(1)}
            disabled={index === total - 1}
            className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30"
            title="下に移動"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        </div>

        {/* フィールド設定 */}
        <div className="flex-1 grid grid-cols-1 md:grid-cols-4 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">フィールド名 (name)</label>
            <input
              type="text"
              value={field.name}
              onChange={(e) => onChange({ name: e.target.value })}
              className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
              placeholder="例: age"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">ラベル</label>
            <input
              type="text"
              value={field.label}
              onChange={(e) => onChange({ label: e.target.value })}
              className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
              placeholder="例: 年齢"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">タイプ</label>
            <select
              value={field.type}
              onChange={(e) => onChange({ type: e.target.value as FormField['type'] })}
              className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
            >
              {FIELD_TYPES.map((ft) => (
                <option key={ft.value} value={ft.value}>{ft.label}</option>
              ))}
            </select>
          </div>
          <div className="flex items-end">
            <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer pb-1.5">
              <input
                type="checkbox"
                checked={field.required}
                onChange={(e) => onChange({ required: e.target.checked })}
                className="rounded border-gray-300 text-green-600 focus:ring-green-500"
              />
              必須
            </label>
          </div>
        </div>

        {/* 削除ボタン */}
        <button
          onClick={onRemove}
          className="p-1.5 text-red-400 hover:text-red-600 transition-colors mt-5"
          title="削除"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      </div>

      {/* 選択肢 */}
      {showOptions && (
        <div className="mt-3 ml-10">
          <label className="block text-xs font-medium text-gray-500 mb-1">選択肢</label>
          <div className="flex flex-wrap gap-2 mb-2">
            {(field.options || []).map((opt, i) => (
              <span
                key={i}
                className="inline-flex items-center gap-1 px-2 py-1 bg-white border border-gray-200 rounded text-xs text-gray-700"
              >
                {opt}
                <button onClick={() => removeOption(i)} className="text-gray-400 hover:text-red-500">
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </span>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              value={optionInput}
              onChange={(e) => setOptionInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addOption() } }}
              className="flex-1 px-2 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
              placeholder="選択肢を入力してEnter"
            />
            <button
              onClick={addOption}
              className="px-3 py-1.5 text-xs font-medium text-gray-600 bg-gray-200 hover:bg-gray-300 rounded transition-colors"
            >
              追加
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
