import https from 'https'
import type { JiraCredentials, JiraConnectionResult, JiraEpic, JiraStory, JiraTransition } from '@shared/jira-types'

interface JiraApiResult<T> {
  data: T | null
  error: string | null
}

function buildAuth(creds: JiraCredentials): string {
  return `Basic ${Buffer.from(`${creds.email}:${creds.apiToken}`).toString('base64')}`
}

function parseCloudUrl(cloudUrl: string): { hostname: string; basePath: string } {
  let url = cloudUrl.trim()
  if (!url.startsWith('https://') && !url.startsWith('http://')) {
    url = `https://${url}`
  }
  const parsed = new URL(url)
  return {
    hostname: parsed.hostname,
    basePath: parsed.pathname.replace(/\/$/, '')
  }
}

function jiraRequest<T>(
  creds: JiraCredentials,
  method: string,
  path: string,
  body?: unknown
): Promise<JiraApiResult<T>> {
  return new Promise((resolve) => {
    const { hostname, basePath } = parseCloudUrl(creds.cloudUrl)
    const fullPath = `${basePath}${path}`

    const options: https.RequestOptions = {
      hostname,
      path: fullPath,
      method,
      headers: {
        Authorization: buildAuth(creds),
        Accept: 'application/json',
        'Content-Type': 'application/json'
      },
      timeout: 10_000
    }

    const req = https.request(options, (res) => {
      let data = ''
      res.on('data', (chunk: Buffer) => {
        data += chunk.toString()
      })
      res.on('end', () => {
        const status = res.statusCode ?? 0
        if (status === 401) {
          resolve({ data: null, error: 'Authentication failed — check email and API token' })
          return
        }
        if (status === 403) {
          resolve({ data: null, error: 'Access forbidden (403)' })
          return
        }
        if (status >= 400) {
          let msg = `Jira API error (${status})`
          try {
            const parsed = JSON.parse(data)
            if (parsed?.errorMessages?.length) msg = parsed.errorMessages[0]
            else if (parsed?.message) msg = parsed.message
          } catch {
            /* use default */
          }
          resolve({ data: null, error: msg })
          return
        }
        try {
          resolve({ data: JSON.parse(data) as T, error: null })
        } catch {
          resolve({ data: null, error: 'Failed to parse Jira response' })
        }
      })
    })

    req.on('error', (err) => {
      resolve({ data: null, error: `Network error: ${err.message}` })
    })

    req.on('timeout', () => {
      req.destroy()
      resolve({ data: null, error: 'Request timed out' })
    })

    if (body) {
      req.write(JSON.stringify(body))
    }
    req.end()
  })
}

// ── ADF → plain text ──────────────────────────────────

function adfToPlainText(adf: unknown): string {
  if (!adf || typeof adf !== 'object') return ''
  const doc = adf as { content?: unknown[] }
  if (!Array.isArray(doc.content)) return ''
  return extractText(doc.content).trim()
}

function extractText(nodes: unknown[]): string {
  let result = ''
  for (const node of nodes) {
    if (!node || typeof node !== 'object') continue
    const n = node as { type?: string; text?: string; content?: unknown[] }
    if (n.type === 'text' && typeof n.text === 'string') {
      result += n.text
    }
    if (Array.isArray(n.content)) {
      result += extractText(n.content)
    }
    if (n.type === 'paragraph' || n.type === 'heading' || n.type === 'bulletList' || n.type === 'orderedList') {
      result += '\n'
    }
    if (n.type === 'listItem') {
      result += '- '
      if (Array.isArray(n.content)) {
        result += extractText(n.content)
      }
    }
    if (n.type === 'hardBreak') {
      result += '\n'
    }
  }
  return result
}

// ── Public API ──────────────────────────────────────────

export async function testJiraConnection(creds: JiraCredentials): Promise<JiraConnectionResult> {
  const result = await jiraRequest<{ displayName: string }>(creds, 'GET', '/rest/api/3/myself')
  if (result.error) {
    return { connected: false, error: result.error }
  }
  return { connected: true, displayName: result.data?.displayName }
}

export async function fetchEpics(creds: JiraCredentials, projectKey: string): Promise<JiraApiResult<JiraEpic[]>> {
  const result = await jiraRequest<{ issues: JiraIssueRaw[] }>(
    creds,
    'POST',
    '/rest/api/3/search/jql',
    {
      jql: `project = "${projectKey}" AND issuetype = Epic ORDER BY rank ASC`,
      fields: ['summary', 'status', 'description'],
      maxResults: 100
    }
  )
  if (result.error || !result.data) {
    return { data: null, error: result.error }
  }
  const epics = result.data.issues.map((issue) => ({
    key: issue.key,
    summary: issue.fields?.summary || '',
    status: issue.fields?.status?.name || 'Unknown',
    description: adfToPlainText(issue.fields?.description)
  }))
  return { data: epics, error: null }
}

export async function fetchStoriesByEpic(creds: JiraCredentials, epicKey: string): Promise<JiraApiResult<JiraStory[]>> {
  const result = await jiraRequest<{ issues: JiraIssueRaw[] }>(
    creds,
    'POST',
    '/rest/api/3/search/jql',
    {
      jql: `"Epic Link" = "${epicKey}" OR parent = "${epicKey}" ORDER BY rank ASC`,
      fields: ['summary', 'status', 'description', 'priority', 'assignee', 'labels', 'issuetype', 'parent'],
      maxResults: 100
    }
  )
  if (result.error || !result.data) {
    return { data: null, error: result.error }
  }
  const stories = result.data.issues.map((issue) => ({
    key: issue.key,
    summary: issue.fields?.summary || '',
    status: issue.fields?.status?.name || 'Unknown',
    description: adfToPlainText(issue.fields?.description),
    priority: issue.fields?.priority?.name || 'None',
    assignee: issue.fields?.assignee?.displayName || 'Unassigned',
    labels: issue.fields?.labels || [],
    epicKey,
    issueType: issue.fields?.issuetype?.name || 'Story'
  }))
  return { data: stories, error: null }
}

export async function fetchIssue(creds: JiraCredentials, issueKey: string): Promise<JiraApiResult<JiraStory>> {
  const result = await jiraRequest<JiraIssueRaw>(
    creds,
    'GET',
    `/rest/api/3/issue/${encodeURIComponent(issueKey)}?fields=summary,status,description,priority,assignee,labels,issuetype,parent`
  )
  if (result.error || !result.data) {
    return { data: null, error: result.error }
  }
  const issue = result.data
  return {
    data: {
      key: issue.key,
      summary: issue.fields?.summary || '',
      status: issue.fields?.status?.name || 'Unknown',
      description: adfToPlainText(issue.fields?.description),
      priority: issue.fields?.priority?.name || 'None',
      assignee: issue.fields?.assignee?.displayName || 'Unassigned',
      labels: issue.fields?.labels || [],
      epicKey: issue.fields?.parent?.key || '',
      issueType: issue.fields?.issuetype?.name || 'Story'
    },
    error: null
  }
}

export async function postComment(
  creds: JiraCredentials,
  issueKey: string,
  adfBody: unknown
): Promise<JiraApiResult<unknown>> {
  return jiraRequest(
    creds,
    'POST',
    `/rest/api/3/issue/${encodeURIComponent(issueKey)}/comment`,
    { body: adfBody }
  )
}

export async function getTransitions(
  creds: JiraCredentials,
  issueKey: string
): Promise<JiraApiResult<JiraTransition[]>> {
  const result = await jiraRequest<{ transitions: { id: string; name: string }[] }>(
    creds,
    'GET',
    `/rest/api/3/issue/${encodeURIComponent(issueKey)}/transitions`
  )
  if (result.error || !result.data) {
    return { data: null, error: result.error }
  }
  return {
    data: result.data.transitions.map((t) => ({ id: t.id, name: t.name })),
    error: null
  }
}

export async function transitionIssue(
  creds: JiraCredentials,
  issueKey: string,
  transitionId: string
): Promise<JiraApiResult<unknown>> {
  return jiraRequest(
    creds,
    'POST',
    `/rest/api/3/issue/${encodeURIComponent(issueKey)}/transitions`,
    { transition: { id: transitionId } }
  )
}

// ── Internal types ──────────────────────────────────────

interface JiraIssueRaw {
  key: string
  fields?: {
    summary?: string
    status?: { name: string }
    description?: unknown
    priority?: { name: string }
    assignee?: { displayName: string }
    labels?: string[]
    issuetype?: { name: string }
    parent?: { key: string }
  }
}
