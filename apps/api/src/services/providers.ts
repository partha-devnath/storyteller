import { createSign } from "node:crypto"

export type GithubAuth =
  | { kind: "pat"; token: string }
  | {
      kind: "app"
      appId: string
      installationId: string
      privateKey: string
    }

export function githubAuthFromConfig(
  config: Record<string, string>
): GithubAuth {
  if (config.auth === "app") {
    return {
      kind: "app",
      appId: config.appId,
      installationId: config.installationId,
      privateKey: config.privateKey,
    }
  }
  return { kind: "pat", token: config.token }
}

const installationTokenCache = new Map<
  string,
  { token: string; expiresAt: number }
>()

async function githubInstallationToken(
  auth: Extract<GithubAuth, { kind: "app" }>
): Promise<string> {
  const cacheKey = `${auth.appId}:${auth.installationId}`
  const cached = installationTokenCache.get(cacheKey)
  if (cached && cached.expiresAt > Date.now() + 60_000) return cached.token

  const now = Math.floor(Date.now() / 1000)
  const header = Buffer.from(
    JSON.stringify({ alg: "RS256", typ: "JWT" })
  ).toString("base64url")
  const payload = Buffer.from(
    JSON.stringify({ iss: auth.appId, iat: now, exp: now + 9 * 60 })
  ).toString("base64url")
  const signer = createSign("RSA-SHA256")
  signer.update(`${header}.${payload}`)
  const jwt = `${header}.${payload}.${signer.sign(auth.privateKey, "base64url")}`

  const res = await fetch(
    `https://api.github.com/app/installations/${auth.installationId}/access_tokens`,
    {
      method: "POST",
      headers: {
        authorization: `Bearer ${jwt}`,
        accept: "application/vnd.github+json",
        "user-agent": "storyteller",
      },
    }
  )
  if (!res.ok) throw new Error(`GitHub API ${res.status}`)
  const data = (await res.json()) as { token: string; expires_at: string }
  installationTokenCache.set(cacheKey, {
    token: data.token,
    expiresAt: new Date(data.expires_at).getTime(),
  })
  return data.token
}

export async function githubToken(auth: GithubAuth): Promise<string> {
  if (auth.kind === "pat") return auth.token
  return githubInstallationToken(auth)
}

export type ProviderClients = {
  github: {
    createIssue: (p: {
      auth: GithubAuth
      repo: string
      title: string
      body: string
    }) => Promise<{ externalId: string; url: string }>
    fetchIssue: (p: {
      auth: GithubAuth
      repo: string
      issueNumber: string
    }) => Promise<{
      state: string
      url: string
      comments: { author: string; text: string; createdAt: string }[]
    }>
    fetchRepo: (p: { auth: GithubAuth; repo: string }) => Promise<void>
  }
  trello: {
    createCard: (p: {
      apiKey: string
      token: string
      idList: string
      name: string
      desc: string
    }) => Promise<{ externalId: string; url: string }>
    fetchCard: (p: {
      apiKey: string
      token: string
      cardId: string
    }) => Promise<{
      state: string
      url: string
      comments: { author: string; text: string; createdAt: string }[]
    }>
    fetchBoards: (p: {
      apiKey: string
      token: string
    }) => Promise<{ id: string; name: string }[]>
    fetchLists: (p: {
      apiKey: string
      token: string
      boardId: string
    }) => Promise<{ id: string; name: string }[]>
    fetchList: (p: {
      apiKey: string
      token: string
      listId: string
    }) => Promise<void>
  }
}

export const realProviders: ProviderClients = {
  github: {
    async createIssue({ auth, repo, title, body }) {
      const token = await githubToken(auth)
      const res = await fetch(`https://api.github.com/repos/${repo}/issues`, {
        method: "POST",
        headers: {
          authorization: `Bearer ${token}`,
          accept: "application/vnd.github+json",
          "content-type": "application/json",
          "user-agent": "storyteller",
        },
        body: JSON.stringify({ title, body }),
      })
      if (!res.ok) throw new Error(`GitHub API ${res.status}`)
      const data = (await res.json()) as { number: number; html_url: string }
      return { externalId: String(data.number), url: data.html_url }
    },
    async fetchIssue({ auth, repo, issueNumber }) {
      const token = await githubToken(auth)
      const res = await fetch(
        `https://api.github.com/repos/${repo}/issues/${issueNumber}`,
        {
          headers: {
            authorization: `Bearer ${token}`,
            accept: "application/vnd.github+json",
            "user-agent": "storyteller",
          },
        }
      )
      if (!res.ok) throw new Error(`GitHub API ${res.status}`)
      const data = (await res.json()) as { state: string; html_url: string }
      const commentsRes = await fetch(
        `https://api.github.com/repos/${repo}/issues/${issueNumber}/comments`,
        {
          headers: {
            authorization: `Bearer ${token}`,
            accept: "application/vnd.github+json",
            "user-agent": "storyteller",
          },
        }
      )
      const comments = commentsRes.ok
        ? (
            (await commentsRes.json()) as {
              user: { login: string }
              body: string
              created_at: string
            }[]
          ).map((c) => ({
            author: c.user?.login ?? "unknown",
            text: c.body,
            createdAt: c.created_at,
          }))
        : []
      return { state: data.state, url: data.html_url, comments }
    },
    async fetchRepo({ auth, repo }) {
      const token = await githubToken(auth)
      const res = await fetch(`https://api.github.com/repos/${repo}`, {
        headers: {
          authorization: `Bearer ${token}`,
          accept: "application/vnd.github+json",
          "user-agent": "storyteller",
        },
      })
      if (!res.ok) throw new Error(`GitHub API ${res.status}`)
    },
  },
  trello: {
    async createCard({ apiKey, token, idList, name, desc }) {
      const params = new URLSearchParams({
        key: apiKey,
        token,
        idList,
        name,
        desc,
      })
      const res = await fetch(`https://api.trello.com/1/cards?${params}`, {
        method: "POST",
      })
      if (!res.ok) throw new Error(`Trello API ${res.status}`)
      const data = (await res.json()) as { id: string; url: string }
      return { externalId: data.id, url: data.url }
    },
    async fetchCard({ apiKey, token, cardId }) {
      const params = new URLSearchParams({ key: apiKey, token, cards: "all" })
      const res = await fetch(
        `https://api.trello.com/1/cards/${cardId}?${params}`
      )
      if (!res.ok) throw new Error(`Trello API ${res.status}`)
      const data = (await res.json()) as {
        url: string
        idList: string
        name: string
      }
      const listRes = await fetch(
        `https://api.trello.com/1/lists/${data.idList}?${new URLSearchParams({ key: apiKey, token })}`
      )
      const list = listRes.ok
        ? ((await listRes.json()) as { name: string })
        : null
      const actionsRes = await fetch(
        `https://api.trello.com/1/cards/${cardId}/actions?${new URLSearchParams({ key: apiKey, token, filter: "commentCard" })}`
      )
      const comments = actionsRes.ok
        ? (
            (await actionsRes.json()) as {
              data: { text: string }
              memberCreator: { fullName: string }
              date: string
            }[]
          ).map((a) => ({
            author: a.memberCreator?.fullName ?? "unknown",
            text: a.data?.text ?? "",
            createdAt: a.date,
          }))
        : []
      return { state: list?.name ?? data.name, url: data.url, comments }
    },
    async fetchBoards({ apiKey, token }) {
      const params = new URLSearchParams({ key: apiKey, token })
      const res = await fetch(
        `https://api.trello.com/1/members/me/boards?${params}`
      )
      if (!res.ok) throw new Error(`Trello API ${res.status}`)
      const data = (await res.json()) as { id: string; name: string }[]
      return data.map((b) => ({ id: b.id, name: b.name }))
    },
    async fetchLists({ apiKey, token, boardId }) {
      const params = new URLSearchParams({ key: apiKey, token })
      const res = await fetch(
        `https://api.trello.com/1/boards/${boardId}/lists?${params}`
      )
      if (!res.ok) throw new Error(`Trello API ${res.status}`)
      const data = (await res.json()) as { id: string; name: string }[]
      return data.map((l) => ({ id: l.id, name: l.name }))
    },
    async fetchList({ apiKey, token, listId }) {
      const params = new URLSearchParams({ key: apiKey, token })
      const res = await fetch(
        `https://api.trello.com/1/lists/${listId}?${params}`
      )
      if (!res.ok) throw new Error(`Trello API ${res.status}`)
    },
  },
}
