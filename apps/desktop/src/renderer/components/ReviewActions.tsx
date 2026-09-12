import { Button } from "@oira/ui"
import { useI18n } from "../i18n/I18nProvider"

type Props = {
  canAccept: boolean
  confirmed: boolean
  remaining: number
  onConfirmChange: (value: boolean) => void
  onAccept: () => void
}

export function ReviewActions({
  canAccept,
  confirmed,
  remaining,
  onConfirmChange,
  onAccept,
}: Props) {
  const { t } = useI18n()
  return (
    <div className="review-dock-inner">
      <label className="check">
        <input
          type="checkbox"
          checked={confirmed}
          onChange={(event) => onConfirmChange(event.target.checked)}
        />
        {t("reviewActions.confirmLabel")}
        {remaining > 0 ? (
          <span className="muted review-remaining">
            {t("reviewActions.unmarkedCount").replace("{n}", String(remaining))}
          </span>
        ) : null}
      </label>
      <Button variant="primary" disabled={!canAccept} onClick={onAccept}>
        {t("reviewActions.acceptDraft")}
      </Button>
    </div>
  )
}
