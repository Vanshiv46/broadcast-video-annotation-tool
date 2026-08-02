import axios from 'axios'

// backend runs on port 8000 by default (see backend README)
export const API_BASE = 'http://localhost:8000'

const client = axios.create({ baseURL: API_BASE })

export const api = {
  // videos
  listVideos: () => client.get('/videos').then(r => r.data),
  addVideo: (youtube_url) => client.post('/videos', { youtube_url }).then(r => r.data),
  addVideosBatch: (urls) => client.post('/videos/batch', { urls }).then(r => r.data),
  getVideo: (id) => client.get(`/videos/${id}`).then(r => r.data),
  deleteVideo: (id) => client.delete(`/videos/${id}`).then(r => r.data),

  // annotations
  listAnnotations: (video_id) =>
    client.get('/annotations', { params: { video_id } }).then(r => r.data),
  createAnnotation: (payload) => client.post('/annotations', payload).then(r => r.data),
  updateAnnotation: (id, payload) => client.patch(`/annotations/${id}`, payload).then(r => r.data),
  deleteAnnotation: (id) => client.delete(`/annotations/${id}`).then(r => r.data),
}

export default client
