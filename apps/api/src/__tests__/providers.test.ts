import { describe, it, expect, afterEach } from "bun:test"
import { generateKeyPairSync } from "node:crypto"

const { privateKey } = generateKeyPairSync("rsa", {
  modulusLength: 2048,
  privateKeyEncoding: { type: "pkcs1", format: "pem" },
  publicKeyEncoding: { type: "spki", format: "pem" },
})

const originalFetch = globalThis.fetch

afterEach(() => {
  globalThis.fetch = originalFetch
})

describe("github app installation tokens", () => {
  it("exchanges an RS256 JWT for an installation token", async () => {
    const { githubToken } = await import("../services/providers")
    const calls: { url: string; headers: HeadersInit | undefined }[] = []
    globalThis.fetch = (async (
      url: string | URL | Request,
      init?: RequestInit
    ) => {
      calls.push({ url: String(url), headers: init?.headers })
      return new Response(
        JSON.stringify({
          token: "ghs_installation",
          expires_at: new Date(Date.now() + 3_600_000).toISOString(),
        }),
        { status: 200 }
      )
    }) as typeof fetch

    const token = await githubToken({
      kind: "app",
      appId: "100",
      installationId: "100",
      privateKey,
    })

    expect(token).toBe("ghs_installation")
    expect(calls).toHaveLength(1)
    expect(calls[0].url).toContain("/app/installations/100/access_tokens")
    const headers = calls[0].headers as Record<string, string> | undefined
    const jwt = headers?.authorization?.match(/Bearer (.*)/)?.[1]
    expect(jwt).toBeDefined()
    const [, payload] = (jwt ?? "").split(".")
    const claims = JSON.parse(
      Buffer.from(payload, "base64url").toString("utf8")
    )
    expect(claims.iss).toBe("100")
    expect(claims.exp - claims.iat).toBe(9 * 60)
  })

  it("caches the installation token until near expiry", async () => {
    const { githubToken } = await import("../services/providers")
    let calls = 0
    globalThis.fetch = (async () => {
      calls++
      return new Response(
        JSON.stringify({
          token: "ghs_cached",
          expires_at: new Date(Date.now() + 3_600_000).toISOString(),
        }),
        { status: 200 }
      )
    }) as typeof fetch

    const auth = {
      kind: "app" as const,
      appId: "200",
      installationId: "200",
      privateKey,
    }
    await githubToken(auth)
    await githubToken(auth)

    expect(calls).toBe(1)
  })

  it("returns the PAT directly for pat auth", async () => {
    const { githubToken } = await import("../services/providers")
    const token = await githubToken({ kind: "pat", token: "ghp_xyz" })
    expect(token).toBe("ghp_xyz")
  })

  it("throws on a failed token exchange", async () => {
    const { githubToken } = await import("../services/providers")
    globalThis.fetch = (async () =>
      new Response("bad", { status: 403 })) as typeof fetch
    await expect(
      githubToken({
        kind: "app",
        appId: "300",
        installationId: "300",
        privateKey,
      })
    ).rejects.toThrow("GitHub API 403")
  })
})

describe("githubAuthFromConfig", () => {
  it("maps a stored app config to app auth", async () => {
    const { githubAuthFromConfig } = await import("../services/providers")
    const auth = githubAuthFromConfig({
      auth: "app",
      appId: "1",
      installationId: "2",
      privateKey: "pem",
    })
    expect(auth).toEqual({
      kind: "app",
      appId: "1",
      installationId: "2",
      privateKey: "pem",
    })
  })

  it("maps a stored pat config to pat auth", async () => {
    const { githubAuthFromConfig } = await import("../services/providers")
    expect(githubAuthFromConfig({ auth: "pat", token: "ghp_t" })).toEqual({
      kind: "pat",
      token: "ghp_t",
    })
  })
})
