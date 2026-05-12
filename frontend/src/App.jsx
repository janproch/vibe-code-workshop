import { useState, useCallback } from 'react'
import MapView from './components/MapView.jsx'
import HeightMapPanel from './components/HeightMapPanel.jsx'

export default function App() {
  const [heightMapUrl, setHeightMapUrl] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [resolution, setResolution] = useState(32)
  const [selectMode, setSelectMode] = useState(false)

  const handleBoundsSelected = useCallback(async (bounds) => {
    setSelectMode(false)
    setLoading(true)
    setError(null)
    setHeightMapUrl(null)

    try {
      const response = await fetch('/api/elevation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...bounds, resolution }),
      })

      if (!response.ok) {
        const err = await response.json()
        throw new Error(err.error || 'Request failed')
      }

      const blob = await response.blob()
      setHeightMapUrl(URL.createObjectURL(blob))
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [resolution])

  return (
    <div className="app">
      <header className="app-header">
        <h1>Height Map Extractor</h1>
        <label className="resolution-control">
          Grid resolution:
          <input
            type="number"
            min="8"
            max="128"
            value={resolution}
            onChange={(e) => setResolution(Number(e.target.value))}
          />
          <span>× {resolution}</span>
        </label>
        <button
          className={`select-btn${selectMode ? ' select-btn--active' : ''}`}
          onClick={() => setSelectMode(m => !m)}
        >
          {selectMode ? '✕ Cancel' : '⬚ Select area'}
        </button>
      </header>
      <div className="app-body">
        <MapView
          onBoundsSelected={handleBoundsSelected}
          selectMode={selectMode}
          onSelectDone={() => setSelectMode(false)}
        />
        <HeightMapPanel url={heightMapUrl} loading={loading} error={error} />
      </div>
    </div>
  )
}
