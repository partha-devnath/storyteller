export type MentionSegment = {
  type: "text" | "mention" | "plain"
  value: string
  userId?: string
}

/**
 * Splits a comment body into renderable segments.
 *
 * "mention" segments are produced only for "@Name" tokens whose id is present
 * in `mentions` AND has a mapping in `memberNameById`; they become styled
 * chips. Tokens that cannot be resolved to a member (removed members, or an
 * id with no name mapping) render as inert plain "@handle" segments — no link,
 * no action, per the UI-SPEC anti-spoofing rule. Everything else is "text".
 *
 * Known names are matched longest-first so partial-name collisions resolve to
 * the longer mention (e.g. "@Anna" never splits into "@Ann" + "a").
 */
export function parseMentionSegments(
  body: string,
  mentions: string[],
  memberNameById: Record<string, string>
): MentionSegment[] {
  if (!body) return []

  const known = mentions
    .map((id) => ({ id, name: memberNameById[id] }))
    .filter((m): m is { id: string; name: string } => Boolean(m.name))
    .sort((a, b) => b.name.length - a.name.length)

  const segments: MentionSegment[] = []
  let text = ""

  const flushText = () => {
    if (text) {
      segments.push({ type: "text", value: text })
      text = ""
    }
  }

  let i = 0
  while (i < body.length) {
    if (body[i] !== "@") {
      text += body[i]
      i += 1
      continue
    }

    const match = known.find((m) => body.startsWith(m.name, i + 1))
    if (match) {
      flushText()
      segments.push({
        type: "mention",
        value: "@" + match.name,
        userId: match.id,
      })
      i += 1 + match.name.length
      continue
    }

    // Unknown/unmapped "@" token: consume up to the next whitespace.
    flushText()
    const end = body.indexOf(" ", i + 1)
    const tokenEnd = end === -1 ? body.length : end
    segments.push({ type: "plain", value: body.slice(i, tokenEnd) })
    i = tokenEnd
  }

  flushText()
  return segments
}
