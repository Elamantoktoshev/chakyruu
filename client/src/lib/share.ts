/** Copies text to the clipboard; falls back to a hidden textarea on old/insecure contexts. */
export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const area = document.createElement('textarea');
    area.value = text;
    area.setAttribute('readonly', '');
    area.style.position = 'fixed';
    area.style.opacity = '0';
    document.body.append(area);
    area.select();
    const isCopied = document.execCommand('copy');
    area.remove();
    return isCopied;
  }
}

export type ShareOutcome = 'shared' | 'copied' | 'failed';

/**
 * Native share sheet on phones (WhatsApp, Telegram…), clipboard elsewhere.
 * `text` is the complete message and already contains the link.
 */
export async function shareLink(data: { title: string; text: string }): Promise<ShareOutcome> {
  if (typeof navigator.share === 'function') {
    try {
      await navigator.share(data);
      return 'shared';
    } catch (error: unknown) {
      // The user closed the share sheet: nothing to do.
      if (error instanceof DOMException && error.name === 'AbortError') return 'failed';
    }
  }
  return (await copyText(data.text)) ? 'copied' : 'failed';
}
