import path from "node:path"
import { fileURLToPath } from "node:url"

const root = path.dirname(fileURLToPath(import.meta.url))

/** Local development weights. Never commit the model artifacts themselves. */
export default {
  cacheDirectory: path.join(root, "apps", "desktop", "src", "models"),
}
