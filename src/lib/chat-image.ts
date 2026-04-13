/**
 * 将聊天消息渲染为可分享的长截图
 */
import html2canvas from 'html2canvas-pro';

interface ImageMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp?: number;
}

interface ChatImageOptions {
  messages: ImageMessage[];
  profileName: string;
  modeName: string;
}

/** Simple markdown → inline HTML for static image rendering */
function mdToHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/^### (.+)$/gm, '<div style="font-weight:600;font-size:14px;margin:10px 0 4px">$1</div>')
    .replace(/^## (.+)$/gm, '<div style="font-weight:600;font-size:15px;margin:12px 0 4px">$1</div>')
    .replace(/^# (.+)$/gm, '<div style="font-weight:700;font-size:16px;margin:14px 0 6px">$1</div>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/^\- (.+)$/gm, '<div style="padding-left:12px">• $1</div>')
    .replace(/^(\d+)\. (.+)$/gm, '<div style="padding-left:12px">$1. $2</div>')
    .replace(/\n\n/g, '<div style="height:8px"></div>')
    .replace(/\n/g, '<br/>');
}

function formatTime(ts?: number): string {
  if (!ts) return '';
  const d = new Date(ts);
  const h = d.getHours().toString().padStart(2, '0');
  const m = d.getMinutes().toString().padStart(2, '0');
  return `${h}:${m}`;
}

export async function generateChatImage(opts: ChatImageOptions): Promise<Blob> {
  const { messages, profileName, modeName } = opts;

  const container = document.createElement('div');
  container.style.cssText = `
    position:fixed; left:-9999px; top:0; width:390px;
    background:#f8f7fc; font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;
    color:#2d2b3d; font-size:13px; line-height:1.6;
  `;

  // Header
  container.innerHTML = `
    <div style="background:linear-gradient(135deg,#7c6caf,#9b8ec4);padding:24px 20px 18px;color:#fff">
      <div style="font-size:20px;font-weight:700;letter-spacing:0.5px">✦ AI 占星师</div>
      <div style="font-size:12px;margin-top:4px;opacity:0.85">${profileName} · ${modeName}模式</div>
    </div>
  `;

  // Messages
  const msgContainer = document.createElement('div');
  msgContainer.style.cssText = 'padding:16px 16px 8px';

  for (const msg of messages) {
    const isUser = msg.role === 'user';
    const time = formatTime(msg.timestamp);
    const bubble = document.createElement('div');
    bubble.style.cssText = `display:flex;margin-bottom:14px;${isUser ? 'flex-direction:row-reverse' : ''}`;

    const avatar = document.createElement('div');
    avatar.style.cssText = `
      width:32px;height:32px;border-radius:50%;flex-shrink:0;
      display:flex;align-items:center;justify-content:center;font-size:14px;
      ${isUser ? 'background:#e8e4f0;margin-left:8px' : 'background:linear-gradient(135deg,#7c6caf,#9b8ec4);color:#fff;margin-right:8px'}
    `;
    avatar.textContent = isUser ? '🙂' : '✦';

    const body = document.createElement('div');
    body.style.cssText = `max-width:280px;${isUser ? 'text-align:right' : ''}`;

    const meta = document.createElement('div');
    meta.style.cssText = 'font-size:11px;color:#9a96a8;margin-bottom:3px';
    meta.innerHTML = `${isUser ? '我' : 'AI 占星师'}${time ? ` · ${time}` : ''}`;

    const content = document.createElement('div');
    content.style.cssText = `
      display:inline-block;text-align:left;border-radius:16px;padding:10px 14px;font-size:13px;line-height:1.7;
      max-width:100%;word-break:break-word;
      ${isUser
        ? 'background:linear-gradient(135deg,#7c6caf,#9b8ec4);color:#fff;border-bottom-right-radius:4px'
        : 'background:#ffffff;color:#2d2b3d;border-bottom-left-radius:4px;box-shadow:0 1px 3px rgba(0,0,0,0.06)'}
    `;
    content.innerHTML = isUser ? msg.content.replace(/\n/g, '<br/>') : mdToHtml(msg.content);

    body.appendChild(meta);
    body.appendChild(content);
    bubble.appendChild(avatar);
    bubble.appendChild(body);
    msgContainer.appendChild(bubble);
  }

  container.appendChild(msgContainer);

  // Footer watermark
  const footer = document.createElement('div');
  footer.style.cssText = 'text-align:center;padding:12px 0 20px;font-size:11px;color:#bbb';
  footer.textContent = '✦ 由 Aura AI 占星师生成 · 仅供参考与娱乐';
  container.appendChild(footer);

  document.body.appendChild(container);

  // Wait for layout
  await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));

  const canvas = await html2canvas(container, {
    scale: 2,
    backgroundColor: '#f8f7fc',
    useCORS: true,
    logging: false,
  });

  document.body.removeChild(container);

  return new Promise((resolve, reject) => {
    canvas.toBlob(blob => {
      if (blob) resolve(blob);
      else reject(new Error('Failed to generate image'));
    }, 'image/png');
  });
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
