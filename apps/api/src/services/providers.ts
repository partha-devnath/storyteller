export type ProviderClients = {
  github: {
    createIssue: (p: {
      token: string
      repo: string
      title: string
      body: string
    }) => Promise<{ externalId: string; url: string }>
    fetchIssue: (p: {
      token: string
      repo: string
      issueNumber: string
    }) => Promise<{
      state: string
      url: string
      comments: { author: string; text: string; createdAt: string }[]
    }>
    fetchRepo: (p: { token: string; repo: string }) => Promise<void>
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
    async createIssue({ token, repo, title, body }) {
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
    async fetchIssue({ token, repo, issueNumber }) {
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
    async fetchRepo({ token, repo }) {
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
