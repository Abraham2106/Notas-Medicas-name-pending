import { useMemo, useState } from "react"
import type { TranscriptSegment } from "@oira/types"
import { filterTranscript } from "../lib/consultFlow"
import { useI18n } from "../i18n/I18nProvider"
import { TranscriptSegmentView } from "./TranscriptSegment"

type Props = {
  segments: TranscriptSegment[]
  highlightedIds: string[]
}

export function TranscriptViewer({ segments, highlightedIds }: Props) {
  const { t } = useI18n()
  const [query, setQuery] = useState("")
  const visible = useMemo(() => filterTranscript(segments, query), [segments, query])

  if (segments.length === 0) {
    return <p className="muted">{t("transcript.empty")}</p>
  }

  return (
    <div className="transcript-panel">
      <input
        type="search"
        className="transcript-search"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder={t("transcript.searchPlaceholder")}
        aria-label={t("transcript.searchLabel")}
      />
      {visible.length === 0 ? (
        <p className="muted">{t("transcript.noMatches").replace("{query}", query)}</p>
      ) : (
        <ol className="transcript">
          {visible.map((segment) => (
            <TranscriptSegmentView
              key={segment.id}
              segment={segment}
              highlighted={highlightedIds.includes(segment.id)}
            />
          ))}
        </ol>
      )}
    </div>
  )
}
