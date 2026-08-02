import { useState, useEffect, useCallback } from 'react'
import VideoList from './components/VideoList'
import VideoPlayer from './components/VideoPlayer'
import { api } from './api/client'

const LABELS = ['text_block', 'object', 'keyframe']

export default function App() {
  const [videos, setVideos] = useState([])
  const [selectedId, setSelectedId] = useState(null)
  const [annotations, setAnnotations] = useState([])
  const [currentLabel, setCurrentLabel] = useState('text_block')
  const [saveStatus, setSaveStatus] = useState('') // '', 'saving', 'saved', 'error'

  const refreshVideos = useCallback(async () => {
    const data = await api.listVideos()
    setVideos(data)
  }, [])

  const refreshAnnotations = useCallback(async (videoId) => {
    if (!videoId) { setAnnotations([]); return }
    const data = await api.listAnnotations(videoId)
    setAnnotations(data)
  }, [])

  useEffect(() => {
    refreshVideos()
    // poll every 4s so 'pending/downloading' videos flip to 'ready' automatically
    const interval = setInterval(refreshVideos, 4000)
    return () => clearInterval(interval)
  }, [refreshVideos])

  useEffect(() => {
    refreshAnnotations(selectedId)
  }, [selectedId, refreshAnnotations])

  const handleAdd = async (url) => {
    await api.addVideo(url)
    refreshVideos()
  }

  const handleAddBatch = async (urls) => {
    await api.addVideosBatch(urls)
    refreshVideos()
  }

  const handleDeleteVideo = async (id) => {
    if (!confirm('Delete this video and all its annotations?')) return
    await api.deleteVideo(id)
    if (selectedId === id) setSelectedId(null)
    refreshVideos()
  }

  const handleNewBox = async (boxPayload) => {
    setSaveStatus('saving')
    try {
      const saved = await api.createAnnotation({ video_id: selectedId, ...boxPayload })
      setAnnotations(prev => [...prev, saved])
      setSaveStatus('saved')
      setTimeout(() => setSaveStatus(''), 1500)
    } catch (err) {
      console.error(err)
      setSaveStatus('error')
    }
  }

  const handleUpdateText = async (annotationId, text) => {
    const updated = await api.updateAnnotation(annotationId, { extracted_text: text })
    setAnnotations(prev => prev.map(a => a.id === annotationId ? updated : a))
  }

  const handleDeleteAnnotation = async (annotationId) => {
    await api.deleteAnnotation(annotationId)
    setAnnotations(prev => prev.filter(a => a.id !== annotationId))
  }

  const selectedVideo = videos.find(v => v.id === selectedId)

  return (
    <div className="h-screen flex bg-ink text-white/90">
      <VideoList
        videos={videos}
        selectedId={selectedId}
        onSelect={setSelectedId}
        onAdd={handleAdd}
        onAddBatch={handleAddBatch}
        onDelete={handleDeleteVideo}
      />

      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="px-6 py-4 border-b border-white/10 flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold">Video Curation & Ground-Truth Dashboard</h1>
            <p className="text-xs text-white/40">Draw boxes on the video to mark regions of interest</p>
          </div>
          {saveStatus && (
            <span className={`text-xs px-2 py-1 rounded ${
              saveStatus === 'saving' ? 'bg-yellow-500/20 text-yellow-400' :
              saveStatus === 'saved' ? 'bg-green-500/20 text-green-400' :
              'bg-red-500/20 text-red-400'
            }`}>
              {saveStatus === 'saving' ? 'Saving...' : saveStatus === 'saved' ? 'Saved ✓' : 'Save failed'}
            </span>
          )}
        </header>

        <div className="flex-1 flex overflow-hidden">
          <div className="flex-1 p-6 overflow-y-auto thin-scroll">
            {!selectedVideo && (
              <div className="h-full flex items-center justify-center text-white/30 text-sm">
                Select a ready video from the left to start annotating.
              </div>
            )}

            {selectedVideo && (
              <>
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-xs text-white/50">Label type:</span>
                  {LABELS.map(l => (
                    <button
                      key={l}
                      onClick={() => setCurrentLabel(l)}
                      className={`text-xs px-2.5 py-1 rounded ${
                        currentLabel === l ? 'bg-accent text-white' : 'bg-white/5 text-white/50 hover:bg-white/10'
                      }`}
                    >
                      {l}
                    </button>
                  ))}
                </div>

                <VideoPlayer
                  video={selectedVideo}
                  annotations={annotations}
                  onNewBox={handleNewBox}
                  currentLabel={currentLabel}
                />
              </>
            )}
          </div>

          {selectedVideo && (
            <div className="w-96 shrink-0 border-l border-white/10 flex flex-col overflow-hidden">
              <div className="p-4 border-b border-white/10">
                <h2 className="text-sm font-semibold">Annotations ({annotations.length})</h2>
              </div>
              <div className="flex-1 overflow-y-auto thin-scroll">
                {annotations.length === 0 && (
                  <p className="text-xs text-white/30 p-4 text-center">
                    No annotations yet. Pause the video and drag a box on it.
                  </p>
                )}
                {annotations.map(a => (
                  <div key={a.id} className="p-3 border-b border-white/5">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[10px] text-white/40">t = {a.timestamp_sec.toFixed(1)}s</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-accent/20 text-accent">{a.label}</span>
                      <button
                        onClick={() => handleDeleteAnnotation(a.id)}
                        className="text-white/20 hover:text-red-400 text-xs"
                      >
                        ✕
                      </button>
                    </div>
                    <textarea
                      defaultValue={a.extracted_text || ''}
                      placeholder="extracted_text (OCR auto-fill or type manually)"
                      onBlur={(e) => handleUpdateText(a.id, e.target.value)}
                      rows={2}
                      className="w-full bg-panel border border-white/10 rounded px-2 py-1 text-xs text-white/80 placeholder-white/25 focus:outline-none focus:border-accent resize-none"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
