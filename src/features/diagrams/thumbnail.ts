export type ThumbnailNode = {
  id: string;
  position: { x: number; y: number };
  measured?: { width?: number; height?: number };
  width?: number;
  height?: number;
  data: { label: string; entityType?: string };
};

export type ThumbnailEdge = {
  source: string;
  target: string;
  label?: unknown;
};

const THUMB_WIDTH = 800;
const THUMB_HEIGHT = 450;
const PADDING = 36;
const SCALE = 2;

function nodeSize(node: ThumbnailNode): { width: number; height: number } {
  return {
    width: node.measured?.width ?? node.width ?? 160,
    height: node.measured?.height ?? node.height ?? 58,
  };
}

function fitText(
  context: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
): string {
  if (context.measureText(text).width <= maxWidth) {
    return text;
  }
  let result = text;
  while (
    result.length > 1 &&
    context.measureText(`${result}…`).width > maxWidth
  ) {
    result = result.slice(0, -1);
  }
  return `${result}…`;
}

function roundRect(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
) {
  context.beginPath();
  if (typeof context.roundRect === 'function') {
    context.roundRect(x, y, width, height, radius);
  } else {
    context.rect(x, y, width, height);
  }
}

function drawArrow(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  angle: number,
  size: number,
) {
  context.beginPath();
  context.moveTo(x, y);
  context.lineTo(
    x - size * Math.cos(angle - Math.PI / 7),
    y - size * Math.sin(angle - Math.PI / 7),
  );
  context.lineTo(
    x - size * Math.cos(angle + Math.PI / 7),
    y - size * Math.sin(angle + Math.PI / 7),
  );
  context.closePath();
  context.fill();
}

/**
 * Renders the diagram as a PNG thumbnail on a canvas. Using the canonical node
 * positions keeps the result deterministic and avoids capturing the live
 * viewport, selection outlines and collaboration cursors.
 */
export function renderDiagramThumbnail(
  nodes: ThumbnailNode[],
  edges: ThumbnailEdge[],
): Promise<Blob> {
  const canvas = document.createElement('canvas');
  canvas.width = THUMB_WIDTH * SCALE;
  canvas.height = THUMB_HEIGHT * SCALE;
  const context = canvas.getContext('2d');
  if (!context) {
    return Promise.reject(new Error('Canvas is not supported'));
  }
  context.scale(SCALE, SCALE);
  context.fillStyle = '#faf9f6';
  context.fillRect(0, 0, THUMB_WIDTH, THUMB_HEIGHT);

  const sizes = new Map(nodes.map((node) => [node.id, nodeSize(node)]));
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const node of nodes) {
    const size = sizes.get(node.id) as { width: number; height: number };
    minX = Math.min(minX, node.position.x);
    minY = Math.min(minY, node.position.y);
    maxX = Math.max(maxX, node.position.x + size.width);
    maxY = Math.max(maxY, node.position.y + size.height);
  }
  const contentWidth = Math.max(maxX - minX, 1);
  const contentHeight = Math.max(maxY - minY, 1);
  const zoom = Math.min(
    (THUMB_WIDTH - PADDING * 2) / contentWidth,
    (THUMB_HEIGHT - PADDING * 2) / contentHeight,
    1,
  );
  const offsetX = (THUMB_WIDTH - contentWidth * zoom) / 2 - minX * zoom;
  const offsetY = (THUMB_HEIGHT - contentHeight * zoom) / 2 - minY * zoom;
  const screenX = (x: number) => offsetX + x * zoom;
  const screenY = (y: number) => offsetY + y * zoom;

  context.lineWidth = 1.5;
  context.strokeStyle = '#b7a99a';
  context.fillStyle = '#b7a99a';
  for (const edge of edges) {
    const source = nodes.find((node) => node.id === edge.source);
    const target = nodes.find((node) => node.id === edge.target);
    if (!source || !target) {
      continue;
    }
    const sourceSize = sizes.get(source.id) as { width: number; height: number };
    const targetSize = sizes.get(target.id) as { width: number; height: number };
    const startX = screenX(source.position.x + sourceSize.width);
    const startY = screenY(source.position.y + sourceSize.height / 2);
    const endX = screenX(target.position.x);
    const endY = screenY(target.position.y + targetSize.height / 2);
    const angle = Math.atan2(endY - startY, endX - startX);
    const arrowSize = Math.max(4, 7 * zoom);
    const lineEndX = endX - Math.cos(angle) * arrowSize;
    const lineEndY = endY - Math.sin(angle) * arrowSize;

    context.beginPath();
    context.moveTo(startX, startY);
    context.lineTo(lineEndX, lineEndY);
    context.stroke();
    drawArrow(context, endX, endY, angle, arrowSize);

    const label = typeof edge.label === 'string' ? edge.label.trim() : '';
    if (label) {
      context.font = '9px "Inter", sans-serif';
      const text = fitText(context, label, 110);
      const labelWidth = context.measureText(text).width;
      const midX = (startX + endX) / 2;
      const midY = (startY + endY) / 2 - 5;
      context.fillStyle = '#faf9f6';
      context.fillRect(midX - labelWidth / 2 - 3, midY - 9, labelWidth + 6, 12);
      context.fillStyle = '#777065';
      context.fillText(text, midX - labelWidth / 2, midY);
      context.fillStyle = '#b7a99a';
    }
  }

  for (const node of nodes) {
    const size = sizes.get(node.id) as { width: number; height: number };
    const x = screenX(node.position.x);
    const y = screenY(node.position.y);
    const width = size.width * zoom;
    const height = size.height * zoom;
    context.save();
    roundRect(context, x, y, width, height, 7 * zoom);
    context.fillStyle = '#ffffff';
    context.fill();
    context.lineWidth = 1;
    context.strokeStyle = '#ded5c7';
    context.stroke();
    context.clip();
    context.fillStyle =
      node.data.entityType === 'character' ? '#8a5a2b' : '#a8a29e';
    context.fillRect(x, y, 4 * zoom, height);
    context.restore();

    const textLeft = x + 11 * zoom;
    const textWidth = Math.max(width - 18 * zoom, 10);
    context.font = `600 ${Math.max(10, 12 * zoom)}px "Inter", sans-serif`;
    context.fillStyle = '#2b2823';
    context.fillText(
      fitText(context, node.data.label || 'Без названия', textWidth),
      textLeft,
      y + height / 2 + 2,
    );
  }

  context.font = '9px "Inter", sans-serif';
  context.fillStyle = '#a8a29e';
  context.textAlign = 'right';
  context.fillText('Writer Tool', THUMB_WIDTH - 12, THUMB_HEIGHT - 10);

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) {
        resolve(blob);
      } else {
        reject(new Error('Не удалось создать миниатюру'));
      }
    }, 'image/png');
  });
}
