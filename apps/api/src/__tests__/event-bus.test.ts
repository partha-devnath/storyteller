import { describe, it, expect } from "bun:test"
import { publish, subscribe, type ProjectEvent } from "../services/event-bus"

const sampleEvent = (): ProjectEvent => ({
  type: "card.created",
  card: { id: "card-1", title: "Card One", slug: "card-one", status: "todo" },
})

describe("event-bus", () => {
  it("publish delivers to subscriber", () => {
    const received: ProjectEvent[] = []
    const unsubscribe = subscribe("proj-a", (event) => received.push(event))
    publish("proj-a", sampleEvent())
    expect(received).toHaveLength(1)
    expect(received[0].type).toBe("card.created")
    unsubscribe()
  })

  it("unsubscribe stops delivery", () => {
    const received: ProjectEvent[] = []
    const unsubscribe = subscribe("proj-a", (event) => received.push(event))
    unsubscribe()
    publish("proj-a", sampleEvent())
    expect(received).toHaveLength(0)
  })

  it("projects are isolated (A does not receive B)", () => {
    const receivedA: ProjectEvent[] = []
    const receivedB: ProjectEvent[] = []
    const unsubscribeA = subscribe("proj-a", (event) => receivedA.push(event))
    const unsubscribeB = subscribe("proj-b", (event) => receivedB.push(event))
    publish("proj-a", sampleEvent())
    expect(receivedA).toHaveLength(1)
    expect(receivedB).toHaveLength(0)
    unsubscribeA()
    unsubscribeB()
  })

  it("a throwing handler does not break delivery to other handlers", () => {
    const received: ProjectEvent[] = []
    const unsubscribeThrowing = subscribe("proj-a", () => {
      throw new Error("handler exploded")
    })
    const unsubscribeOk = subscribe("proj-a", (event) => received.push(event))
    publish("proj-a", sampleEvent())
    expect(received).toHaveLength(1)
    unsubscribeThrowing()
    unsubscribeOk()
  })

  it("publish with zero subscribers is a no-op that does not throw", () => {
    expect(() => publish("proj-empty", sampleEvent())).not.toThrow()
  })
})
