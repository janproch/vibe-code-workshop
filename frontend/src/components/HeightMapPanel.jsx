export default function HeightMapPanel({ url, loading, error }) {
  return (
    <aside className="panel">
      <h2>Height Map</h2>

      {loading && <p>Fetching elevation data&hellip;</p>}

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
    </aside>
  )
}
