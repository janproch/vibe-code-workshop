import { useEffect, useRef } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

export default function MapView({ onBoundsSelected, selectMode, onSelectDone }) {
  const containerRef = useRef(null)
  const mapRef = useRef(null)

  // Stable refs so Leaflet event handlers never capture stale closures
  const callbackRef = useRef(onBoundsSelected)
  useEffect(() => { callbackRef.current = onBoundsSelected })

  const selectModeRef = useRef(selectMode)
  useEffect(() => {
    selectModeRef.current = selectMode
    const map = mapRef.current
    if (!map) return
    // Sync Leaflet dragging with mode
    if (selectMode) {
      map.dragging.disable()
    } else {
      map.dragging.enable()
    }
  }, [selectMode])

  const onSelectDoneRef = useRef(onSelectDone)
  useEffect(() => { onSelectDoneRef.current = onSelectDone })

  useEffect(() => {
    if (mapRef.current) return // initialize only once

    const map = L.map(containerRef.current).setView([50.08, 14.42], 8)

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution:
        '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19,
    }).addTo(map)

    // ── Rectangle draw ───────────────────────────────────────────────────────
    let startLatLng = null
    let rect = null

    map.on('mousedown', (e) => {
      if (!selectModeRef.current) return
      startLatLng = e.latlng
      if (rect) { map.removeLayer(rect); rect = null }
    })

    map.on('mousemove', (e) => {
      if (!selectModeRef.current || !startLatLng) return
      if (rect) map.removeLayer(rect)
      rect = L.rectangle([startLatLng, e.latlng], {
        color: '#3388ff',
        weight: 2,
        fillOpacity: 0.15,
      }).addTo(map)
    })

    map.on('mouseup', (e) => {
      if (!selectModeRef.current || !startLatLng) return

      const bounds = L.latLngBounds(startLatLng, e.latlng)
      startLatLng = null

      // Ignore tiny accidental clicks
      if (bounds.getNorth() === bounds.getSouth() || bounds.getEast() === bounds.getWest()) {
        if (rect) { map.removeLayer(rect); rect = null }
        return
      }

      callbackRef.current({
        north: bounds.getNorth(),
        south: bounds.getSouth(),
        east:  bounds.getEast(),
        west:  bounds.getWest(),
      })
      // Exit select mode after a rectangle is drawn
      onSelectDoneRef.current?.()
    })

    mapRef.current = map

    return () => {
      map.remove()
      mapRef.current = null
    }
  }, []) // runs once; all live values accessed via refs

  return (
    <div className={`map-container${selectMode ? ' map-selecting' : ''}`}>
      <div ref={containerRef} style={{ width: '100%', height: '100%' }} />
    </div>
  )
}
