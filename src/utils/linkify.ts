export function linkify(text: string): string {
  const urlRegex = /https?:\/\/[^\s<>"']+/g;

  return text.replace(urlRegex, (url) => {
    const escapedUrl = escapeHtml(url);
    return `<a target="_blank" href="${escapedUrl}">${escapedUrl}</a>`;
  });
}

function escapeHtml(str: string): string {
  return str.replace(/[&<>"']/g, (char) => {
    switch (char) {
      case '&': return '&amp;';
      case '<': return '&lt;';
      case '>': return '&gt;';
      case '"': return '&quot;';
      case "'": return '&#39;';
      default: return char;
    }
  });
}
