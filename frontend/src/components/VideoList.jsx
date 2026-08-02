import { useState } from 'react'

const STATUS_STYLES = {
  pending: 'bg-yellow-500/20 text-yellow-400',
  downloading: 'bg-blue-500/20 text-blue-400',
  ready: 'bg-green-500/20 text-green-400',
  failed: 'bg-red-500/20 text-red-400',
}

export default function VideoList({ videos, selectedId, onSelect, onAdd, onAddBatch, onDelete }) {
  const [singleUrl, setSingleUrl] = useState('')
  const [batchText, setBatchText] = useState('')
  const [showBatch, setShowBatch] = useState(false)

  const handleAddSingle = (e) => {
    e.preventDefault()
    if (!singleUrl.trim()) return
    onAdd(singleUrl.trim())
    setSingleUrl('')
  }

  const handleAddBatch = (e) => {
    e.preventDefault()
    const urls = batchText.split('\n').map(u => u.trim()).filter(Boolean)
    if (urls.length === 0) return
    onAddBatch(urls)
    setBatchText('')
    setShowBatch(false)
  }

  const readyCount = videos.filter(v => v.status === 'ready').length

  return (
    <div className="w-80 shrink-0 bg-panel border-r border-white/10 flex flex-col h-full">
      <div className="p-4 border-b border-white/10">
        <h2 className="text-sm font-semibold text-white/90 tracking-wide">VIDEOS</h2>
        <p className="text-xs text-white/40 mt-1">{readyCount} / {videos.length} ready</p>
      </div>

      <div className="p-3 border-b border-white/10 space-y-2">
        <form onSubmit={handleAddSingle} className="flex gap-2">
          <input
            type="text"
            value={singleUrl}
            onChange={e => setSingleUrl(e.target.value)}
            placeholder="Paste YouTube URL..."
            className="flex-1 bg-ink border border-white/10 rounded px-2 py-1.5 text-xs text-white/90 placeholder-white/30 focus:outline-none focus:border-accent"
          />
          <button
            type="submit"
            className="bg-accent hover:bg-accent/80 text-white text-xs px-3 py-1.5 rounded font-medium"
          >
            Add
          </button>
        </form>

        <button
          onClick={() => setShowBatch(s => !s)}
          className="text-xs text-white/50 hover:text-white/80 underline"
        >
          {showBatch ? 'Hide batch upload' : 'Batch upload (30+ URLs)'}
        </button>

        {showBatch && (
          <form onSubmit={handleAddBatch} className="space-y-2">
            <textarea
              value={batchText}
              onChange={e => setBatchText(e.target.value)}
              placeholder="One YouTube URL per line..."
              rows={5}
              className="w-full bg-ink border border-white/10 rounded px-2 py-1.5 text-xs text-white/90 placeholder-white/30 focus:outline-none focus:border-accent"
            />
            <button
              type="submit"
              className="w-full bg-accent2 hover:bg-accent2/80 text-white text-xs px-3 py-1.5 rounded font-medium"
            >
              Queue all
            </button>
          </form>
        )}
      </div>

      <div className="flex-1 overflow-y-auto thin-scroll">
        {videos.length === 0 && (
          <p className="text-xs text-white/30 p-4 text-center">No videos yet. Add one above.</p>
        )}
        {videos.map(v => (
          <div
            key={v.id}
            onClick={() => v.status === 'ready' && onSelect(v.id)}
            className={`p-3 border-b border-white/5 cursor-pointer group ${
              selectedId === v.id ? 'bg-accent/10 border-l-2 border-l-accent' : 'hover:bg-white/5'
            } ${v.status !== 'ready' ? 'opacity-70 cursor-not-allowed' : ''}`}
          >
            <div className="flex items-start justify-between gap-2">
              <p className="text-xs text-white/90 line-clamp-2 flex-1">
                {v.title || v.youtube_url}
              </p>
              <button
                onClick={(e) => { e.stopPropagation(); onDelete(v.id) }}
                className="text-white/20 hover:text-red-400 text-xs opacity-0 group-hover:opacity-100 shrink-0"
                title="Delete"
              >
                ✕
              </button>
            </div>
            <div className="flex items-center gap-2 mt-1.5">
              <span className={`text-[10px] px-1.5 py-0.5 rounded ${STATUS_STYLES[v.status] || ''}`}>
                {v.status}
              </span>
              {v.duration_sec > 0 && (
                <span className="text-[10px] text-white/30">
                  {Math.floor(v.duration_sec / 60)}m {v.duration_sec % 60}s
                </span>
              )}
            </div>
            {v.status === 'failed' && v.error_message && (
              <p className="text-[10px] text-red-400/70 mt-1 line-clamp-2">{v.error_message}</p>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
