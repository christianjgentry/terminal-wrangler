export function generateBranchName(agentName: string): string {
  let slug = agentName
    .toLowerCase()
    .replace(/[\s_]+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-{2,}/g, '-')
    .replace(/^-+|-+$/g, '')

  if (!slug) {
    slug = 'unnamed'
  }

  return `agent/${slug}`
}
