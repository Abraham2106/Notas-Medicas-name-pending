export function StartupScreen() {
  return (
    <main className="startup-screen" aria-labelledby="startup-title">
      <div className="startup-card">
        <strong className="wordmark startup-wordmark">
          oira<span aria-hidden="true">.</span>
        </strong>
        <p className="startup-kicker">CONSULTA CLÍNICA LOCAL</p>
        <h1 id="startup-title">Preparando tu espacio de trabajo</h1>
        <p className="muted">Iniciando componentes locales y preferencias.</p>
        <div
          className="startup-progress"
          role="progressbar"
          aria-label="Preparando la aplicación"
          aria-valuetext="Preparando la aplicación"
        >
          <span />
        </div>
        <p className="startup-note">El modelo de voz se prepara al iniciar una consulta.</p>
      </div>
    </main>
  )
}
