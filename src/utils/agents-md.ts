import {
  OMG_MODELS_END_MARKER,
  OMG_MODELS_START_MARKER,
} from './agents-model-table.js'

export const OMG_GENERATED_AGENTS_MARKER = '<!-- omg:generated:agents-md -->'
const AUTONOMY_DIRECTIVE_END_MARKER = '<!-- END AUTONOMY DIRECTIVE -->'

export function isOmgGeneratedAgentsMd(content: string): boolean {
  return content.includes(OMG_GENERATED_AGENTS_MARKER)
}

export function hasOmgManagedAgentsSections(content: string): boolean {
  return (
    isOmgGeneratedAgentsMd(content) ||
    (content.includes(OMG_MODELS_START_MARKER) &&
      content.includes(OMG_MODELS_END_MARKER))
  )
}

export function addGeneratedAgentsMarker(content: string): string {
  if (content.includes(OMG_GENERATED_AGENTS_MARKER)) return content

  const autonomyDirectiveEnd = content.indexOf(AUTONOMY_DIRECTIVE_END_MARKER)
  if (autonomyDirectiveEnd >= 0) {
    const insertAt = autonomyDirectiveEnd + AUTONOMY_DIRECTIVE_END_MARKER.length
    const hasImmediateNewline = content[insertAt] === '\n'
    const insertionPoint = hasImmediateNewline ? insertAt + 1 : insertAt
    return (
      content.slice(0, insertionPoint) +
      `${OMG_GENERATED_AGENTS_MARKER}\n` +
      content.slice(insertionPoint)
    )
  }

  const firstNewline = content.indexOf('\n')
  if (firstNewline === -1) {
    return `${content}\n${OMG_GENERATED_AGENTS_MARKER}\n`
  }

  return (
    content.slice(0, firstNewline + 1) +
    `${OMG_GENERATED_AGENTS_MARKER}\n` +
    content.slice(firstNewline + 1)
  )
}
