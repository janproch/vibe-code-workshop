import { useEffect, useRef } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

export default function MapView({ onBoundsSelected }) {
  const containerRef = useRef(null)
  const mapRef = useRef(null)

  // Keep a stable ref to the callback so the map event handler never goes stale
  const callbackRef = useRef(onBoundsSelected)
  useEffect(() => { callbackRef.current = onBoundsSelected })

  useEffect(() => {
    if (mapRef.current) return // initialize only once

    const map = L.map(containerRef.current).setView([50.08, 14.42], 8)

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution:
        '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19,
    }).addTo(map)

    // ── Rectangle draw (no plugin needed) ───────────────────────────────────
    let startLatLng = null
    let rect = null

    map.on('mousedown', (e) => {
      startLatLng = e.latlng
      map.dragging.disable()
      if (rect) { map.removeLayer(rect); rect = null }
    })

    map.on('mousemove', (e) => {
      if (!startLatLng) return
      if (rect) map.removeLayer(rect)
      rect = L.rectangle([startLatLng, e.latlng], {
        color: '#3388ff',
        weight: 2,
        fillOpacity: 0.15,
      }).addTo(map)
    })

    map.on('mouseup', (e) => {
      map.dragging.enable()
      if (!startLatLng) return

      const bounds = L.latLngBounds(startLatLng, e.latlng)
      startLatLng = null

      // Ignore tiny accidental clicks
      if (bounds.getNorth() === bounds.getSouth() || bounds.getEast() === bounds.getWest()) return

      callbackRef.current({
        north: bounds.getNorth(),
        south: bounds.getSouth(),
        east:  bounds.getEast(),
        west:  bounds.getWest(),
      })
    })

    mapRef.current = map

    return () => {
      map.remove()
      mapRef.current = null
    }
  }, []) // runs once; callback accessed via ref

  return <div ref={containerRef} className="map-container" />
}
