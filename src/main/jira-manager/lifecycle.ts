// ADF (Atlassian Document Format) comment builders for Jira lifecycle events

function adfParagraph(text: string): object {
  return {
    type: 'paragraph',
    content: [{ type: 'text', text }]
  }
}

function adfParagraphWithLink(prefix: string, url: string, linkText: string): object {
  return {
    type: 'paragraph',
    content: [
      { type: 'text', text: prefix },
      {
        type: 'text',
        text: linkText,
        marks: [{ type: 'link', attrs: { href: url } }]
      }
    ]
  }
}

function buildAdfDoc(...content: object[]): object {
  return {
    version: 1,
    type: 'doc',
    content
  }
}

export function buildLifecycleComment(status: string, extra?: string): object | null {
  switch (status) {
    case 'idle':
      return buildAdfDoc(
        adfParagraph('\ud83e\udd16 Terminal Wrangler agent has picked up this story.')
      )

    case 'planning':
      return buildAdfDoc(
        adfParagraph('\ud83d\udcdd Agent is planning the implementation.')
      )

    case 'building':
      return buildAdfDoc(
        adfParagraph('\ud83d\udee0\ufe0f Agent is implementing changes.')
      )

    case 'pr':
      if (extra) {
        return buildAdfDoc(
          adfParagraphWithLink('\ud83d\udd17 Agent created a pull request: ', extra, extra)
        )
      }
      return null

    case 'done':
      return buildAdfDoc(
        adfParagraph('\u2705 Agent completed work on this story.')
      )

    case 'error':
      return buildAdfDoc(
        adfParagraph('\u274c Agent encountered an error.')
      )

    default:
      return null
  }
}
