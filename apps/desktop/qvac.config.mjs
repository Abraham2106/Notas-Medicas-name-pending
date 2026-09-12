import path from "node:path"
import { fileURLToPath } from "node:url"

const desktopRoot = path.dirname(fileURLToPath(import.meta.url))

/** Local development weights. Never commit the model artifacts themselves. */
export default {
  cacheDirectory: path.join(desktopRoot, "src", "models"),
}
