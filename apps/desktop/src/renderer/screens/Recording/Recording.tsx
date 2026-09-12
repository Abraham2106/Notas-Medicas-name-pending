import { useState } from "react"
import { Button, Dialog, StatusBadge } from "@oira/ui"
import { Icon } from "../../components/icons"
import { PrivacyStatusPanel } from "../../components/PrivacyStatusPanel"
import { RecordingTimer } from "../../components/RecordingTimer"
import { useI18n } from "../../i18n/I18nProvider"

type Props = {
  isRecording: boolean
  startedAtMs?: number
  onStart: () => void
  onStop: () => void
  onDiscard: () => void
}

export function RecordingScreen({ isRecording, startedAtMs, onStart, onStop, onDiscard }: Props) {
  const { t } = useI18n()
  const [confirmDiscard, setConfirmDiscard] = useState(false)

  return (
    <div className="recording-screen page">
      <div className="recording-banner" role="status">
        <StatusBadge
          tone={isRecording ? "recording" : "neutral"}
          icon={isRecording ? "●" : "○"}
          label={isRecording ? t("recording.badge") : t("recording.readyBadge")}
          live={isRecording}
        />
        {isRecording && startedAtMs ? <RecordingTimer startedAtMs={startedAtMs} /> : null}
      </div>
      <p>{isRecording ? t("recording.speakNaturally") : t("recording.readyBody")}</p>
      <PrivacyStatusPanel
        rows={[
          {
            label: t("privacy.recording"),
            value: isRecording ? t("recording.activeHere") : t("privacy.notStarted"),
          },
          { label: t("privacy.processing"), value: t("privacy.whenRecordingStops") },
          { label: t("privacy.aiRemote"), value: t("privacy.unknown") },
          { label: t("privacy.storage"), value: t("privacy.unknown") },
          { label: t("privacy.network"), value: t("privacy.unknown") },
        ]}
      />
      {isRecording ? <p className="muted">{t("recording.shortcutHint")}</p> : null}
      <div className="actions">
        {isRecording ? (
          <Button variant="danger" onClick={onStop}>
            {t("recording.stopButton")}
          </Button>
        ) : (
          <Button variant="primary" onClick={onStart}>
            <Icon name="mic" size={18} />
            {t("recording.startButton")}
          </Button>
        )}
        <Button onClick={() => setConfirmDiscard(true)}>{t("recording.discard")}</Button>
      </div>
      <Dialog
        open={confirmDiscard}
        title={t("recording.discardTitle")}
        onClose={() => setConfirmDiscard(false)}
      >
        <p>{t("recording.discardBody")}</p>
        <div className="actions">
          <Button
            variant="danger"
            onClick={() => {
              setConfirmDiscard(false)
              onDiscard()
            }}
          >
            {t("recording.discardConfirm")}
          </Button>
          <Button onClick={() => setConfirmDiscard(false)}>{t("recording.keepRecording")}</Button>
        </div>
      </Dialog>
    </div>
  )
}
