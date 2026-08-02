import { describe, it, expect } from "vitest"
import { parseMentionSegments, type MentionSegment } from "../mention-segments"

describe("parseMentionSegments", () => {
  it("splits text and mapped mention chips", () => {
    const memberNameById = { a: "Ann", b: "Bob" }
    const segments = parseMentionSegments(
      "Hi @Ann and @Bob!",
      ["a", "b"],
      memberNameById
    )
    expect(segments).toEqual([
      { type: "text", value: "Hi " },
      { type: "mention", value: "@Ann", userId: "a" },
      { type: "text", value: " and " },
      { type: "mention", value: "@Bob", userId: "b" },
      { type: "text", value: "!" },
    ] satisfies MentionSegment[])
  })

  it("renders an unknown mention id as a plain @handle", () => {
    const segments = parseMentionSegments("@Someone", ["unknownId"], {})
    expect(segments).toEqual([
      { type: "plain", value: "@Someone" },
    ] satisfies MentionSegment[])
  })

  it("matches the longest mention name first to avoid partial-name collisions", () => {
    const memberNameById = { ann: "Ann", anna: "Anna" }
    const segments = parseMentionSegments(
      "@Anna",
      ["ann", "anna"],
      memberNameById
    )
    expect(segments).toEqual([
      { type: "mention", value: "@Anna", userId: "anna" },
    ] satisfies MentionSegment[])
  })

  it("returns a single text segment when there are no mentions", () => {
    const segments = parseMentionSegments("Just a note", [], {})
    expect(segments).toEqual([
      { type: "text", value: "Just a note" },
    ] satisfies MentionSegment[])
  })

  it("renders a trailing bare @ as a plain segment", () => {
    const segments = parseMentionSegments("@", [], {})
    expect(segments).toEqual([
      { type: "plain", value: "@" },
    ] satisfies MentionSegment[])
  })
})
