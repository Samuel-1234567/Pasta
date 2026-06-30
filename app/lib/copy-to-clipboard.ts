export async function copyTextToClipboard(text: string): Promise<boolean> {
  const value = text.trim()
  if (!value) return false

  if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(value)
      return true
    } catch {
      // Fall through to legacy copy.
    }
  }

  if (typeof document === 'undefined') return false

  try {
    const textarea = document.createElement('textarea')
    textarea.value = value
    textarea.setAttribute('readonly', 'true')
    textarea.style.position = 'fixed'
    textarea.style.top = '0'
    textarea.style.left = '0'
    textarea.style.opacity = '0'
    document.body.appendChild(textarea)
    textarea.focus()
    textarea.select()
    const copied = document.execCommand('copy')
    document.body.removeChild(textarea)
    return copied
  } catch {
    return false
  }
}

export async function copyTextFromInput(input: HTMLInputElement | null): Promise<boolean> {
  if (!input?.value) return false

  input.focus()
  input.select()
  input.setSelectionRange(0, input.value.length)

  if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(input.value)
      return true
    } catch {
      // Fall through to legacy copy.
    }
  }

  if (typeof document === 'undefined') return false

  try {
    return document.execCommand('copy')
  } catch {
    return false
  }
}
