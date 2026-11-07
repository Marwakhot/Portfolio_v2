import { ASPECT } from './crumpleSim.js';

// The card is plain white paper with no printing: just a photo, if the event has one,
// inside a white border.
const WIDTH = 1024;
const HEIGHT = Math.round(1024 * ASPECT);
const BORDER = 0.055; // as a share of the card's width

function layer(width = WIDTH, height = HEIGHT) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  return canvas.getContext('2d');
}

// A very faint grain, so the paper reads as paper rather than a flat shape.
function whitePaper(ctx, seed) {
  const { width, height } = ctx.canvas;
  const image = ctx.createImageData(width, height);
  let state = seed;
  for (let i = 0; i < image.data.length; i += 4) {
    state = (state * 1664525 + 1013904223) >>> 0;
    const shade = 238 + (state / 4294967296) * 5;
    image.data[i] = image.data[i + 1] = image.data[i + 2] = shade;
    image.data[i + 3] = 255;
  }
  ctx.putImageData(image, 0, 0);
}

function loadImage(url) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = url;
  });
}

async function drawPhoto(ctx, url, box) {
  let image;
  try {
    image = await loadImage(url);
  } catch {
    console.error(`Could not load event image: ${url}`);
    return;
  }
  const { x: boxX, y: boxY, width: boxWidth, height: boxHeight } = box;
  const scale = Math.max(boxWidth / image.width, boxHeight / image.height);
  const width = image.width * scale;
  const height = image.height * scale;
  ctx.save();
  ctx.beginPath();
  ctx.rect(boxX, boxY, boxWidth, boxHeight);
  ctx.clip();
  ctx.drawImage(image, boxX + (boxWidth - width) / 2, boxY + (boxHeight - height) / 2, width, height);
  ctx.restore();
}

export async function drawPoster(event, index) {
  const front = layer();
  whitePaper(front, 41 + index);
  // `image` can be one path or a list; several photos stack top to bottom.
  const photos = [].concat(event.image || []);
  if (photos.length) {
    const inset = WIDTH * BORDER;
    const gap = inset / 2;
    const width = WIDTH - inset * 2;
    const height = (HEIGHT - inset * 2 - gap * (photos.length - 1)) / photos.length;
    await Promise.all(photos.map((url, i) =>
      drawPhoto(front, url, { x: inset, y: inset + i * (height + gap), width, height })));
  }

  const back = layer(WIDTH >> 1, HEIGHT >> 1);
  whitePaper(back, 97 + index);
  return { front: front.canvas, back: back.canvas };
}
