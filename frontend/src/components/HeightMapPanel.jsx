const LEGEND = [
  { color: '#4196dc', label: 'Water (ocean / lakes)' },
  { color: '#78c450', label: 'Lowlands' },
  { color: '#acd26e', label: 'Plains' },
  { color: '#d2c382', label: 'Hills' },
  { color: '#be9150', label: 'Uplands' },
  { color: '#9b6437', label: 'Mountains' },
  { color: '#f5f5f5', label: 'High peaks / snow', border: true },
]

function Legend() {
  return (
    <div className="legend">
      <h3>Legend</h3>
      <ul>
        {LEGEND.map(({ color, label, border }) => (
          <li key={label}>
            <span
              className="legend-swatch"
              style={{ background: color, border: border ? '1px solid #ccc' : 'none' }}
            />
            {label}
          </li>
        ))}
      </ul>
    </div>
  )
}

export default function HeightMapPanel({ url, loading, error }) {
  return (
    <aside className="panel">
      <h2>Height Map</h2>

      {loading && <p>Fetching elevation &amp; water data&hellip;</p>}

      {error && <p className="error">Error: {error}</p>}

      {url && (
        <>
          <img src={url} alt="Generated height map" />
          <a className="download-btn" href={url} download="heightmap.png">
            Download PNG
          </a>
        </>
      )}

      {!loading && !error && !url && (
        <p className="hint">
          Draw a rectangle on the map to generate a height map.
        </p>
      )}

      <Legend />
    </aside>
  )
}
