// Draws the printed insert inside the badge. Coordinates are for a 900 x 1320 card.
const WIDTH = 900;
const HEIGHT = 1320;
const MARGIN = 68;
const DISPLAY_FONT = '"Geist Variable", system-ui, sans-serif';
const TEXT_FONT = DISPLAY_FONT;

function seededRandom(seed) {
  let state = seed;
  return () => (state = (state * 1664525 + 1013904223) >>> 0) / 4294967296;
}

function paintPaper(ctx) {
  const random = seededRandom(41);
  const image = ctx.createImageData(WIDTH, HEIGHT);
  for (let i = 0; i < image.data.length; i += 4) {
    const shade = 246 + random() * 7;
    image.data[i] = image.data[i + 1] = image.data[i + 2] = shade;
    image.data[i + 3] = 255;
  }
  ctx.putImageData(image, 0, 0);
}

// Soft-edged text, then a noisy threshold: gives a rough, over-inked print edge.
function inkText(ctx, text, x, baseline, fontSize, color, seed) {
  const layer = document.createElement('canvas');
  layer.width = WIDTH;
  layer.height = HEIGHT;
  const layerCtx = layer.getContext('2d', { willReadFrequently: true });
  layerCtx.filter = 'blur(2.4px)';
  layerCtx.font = `600 ${fontSize}px ${DISPLAY_FONT}`;
  layerCtx.letterSpacing = '-0.02em';
  layerCtx.fillStyle = color;
  layerCtx.fillText(text, x, baseline);

  const random = seededRandom(seed);
  const image = layerCtx.getImageData(0, 0, WIDTH, HEIGHT);
  for (let i = 3; i < image.data.length; i += 4) {
    const alpha = image.data[i] / 255;
    if (!alpha) continue;
    const threshold = 0.3 + random() * 0.32;
    image.data[i] = Math.min(1, Math.max(0, (alpha - threshold) / 0.1)) * 255;
  }
  layerCtx.putImageData(image, 0, 0);
  ctx.drawImage(layer, 0, 0);
}

function drawName(ctx, content, card) {
  const baseSize = 282;
  ctx.font = `600 ${baseSize}px ${DISPLAY_FONT}`;
  ctx.letterSpacing = '-0.02em';
  const widest = Math.max(
    ctx.measureText(content.firstName).width,
    ctx.measureText(content.lastName).width,
  );
  const size = Math.min(baseSize, (baseSize * (WIDTH - MARGIN * 2)) / widest);
  inkText(ctx, content.firstName, MARGIN, 282, size, card.firstNameColor, 7);
  inkText(ctx, content.lastName, MARGIN, 282 + size * 0.86, size, card.lastNameColor, 19);
}

function drawPill(ctx, x, y, width, height, pill) {
  ctx.fillStyle = pill.color;
  ctx.beginPath();
  ctx.roundRect(x, y, width, height, height / 2);
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.font = `45px ${TEXT_FONT}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(pill.label, x + width / 2, y + height / 2 + 2, width - 40);
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
}

function drawDetails(ctx, card) {
  const right = WIDTH - MARGIN - 42;
  ctx.fillStyle = '#111111';
  ctx.letterSpacing = '0px';
  ctx.font = `50px ${TEXT_FONT}`;
  ctx.fillText(card.currentlyLabel, MARGIN, 832);
  ctx.font = `46px ${TEXT_FONT}`;
  ctx.fillText(card.currently, MARGIN, 918, right - MARGIN);
  ctx.font = `50px ${TEXT_FONT}`;
  ctx.fillText(card.previouslyLabel, MARGIN, 1030);

  const [wide, left, last] = card.pills;
  const gap = 80;
  const half = (right - MARGIN - gap) / 2;
  drawPill(ctx, MARGIN, 1079, right - MARGIN, 75, wide);
  drawPill(ctx, MARGIN, 1176, half, 75, left);
  drawPill(ctx, right - half, 1176, half, 75, last);
  ctx.fillStyle = '#8a8a8a';
  ctx.font = `44px ${TEXT_FONT}`;
  ctx.textAlign = 'center';
  ctx.fillText('&', MARGIN + half + gap / 2, 1230);
  ctx.textAlign = 'left';
}

function loadImage(url) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error(`Could not load card artwork: ${url}`));
    image.src = url;
  });
}

export async function drawArtwork(content, card) {
  const canvas = document.createElement('canvas');
  canvas.width = WIDTH;
  canvas.height = HEIGHT;
  const ctx = canvas.getContext('2d');

  if (card.artworkUrl) {
    const image = await loadImage(card.artworkUrl);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
    const scale = Math.max(WIDTH / image.width, HEIGHT / image.height);
    const width = image.width * scale;
    const height = image.height * scale;
    ctx.drawImage(image, (WIDTH - width) / 2, (HEIGHT - height) / 2, width, height);
    return canvas;
  }

  if (card.photo) {
    paintPaper(ctx);
    await drawPhoto(ctx, card.photo);
  } else {
    ctx.drawImage(namePlate(content, card), 0, 0);
  }
  drawDetails(ctx, card);
  return canvas;
}

// The photo fills the top of the card, where the name would otherwise be.
async function drawPhoto(ctx, url) {
  let image;
  try {
    image = await loadImage(url);
  } catch (error) {
    console.error(error);
    return;
  }
  const box = { x: MARGIN, y: MARGIN, width: WIDTH - MARGIN * 2, height: 700 };
  const scale = Math.max(box.width / image.width, box.height / image.height);
  const width = image.width * scale;
  const height = image.height * scale;
  ctx.save();
  ctx.beginPath();
  ctx.roundRect(box.x, box.y, box.width, box.height, 28);
  ctx.clip();
  // Anchored a little above centre so the face stays in frame.
  ctx.drawImage(image, box.x + (box.width - width) / 2, box.y + (box.height - height) * 0.35, width, height);
  ctx.restore();
}

// The paper and inked name are slow to make and never change, so they're made once.
let plate = null;
function namePlate(content, card) {
  if (plate) return plate;
  plate = document.createElement('canvas');
  plate.width = WIDTH;
  plate.height = HEIGHT;
  const ctx = plate.getContext('2d');
  paintPaper(ctx);
  drawName(ctx, content, card);
  return plate;
}

function wrap(ctx, text, width) {
  const lines = [''];
  for (const word of text.split(' ')) {
    const next = lines.at(-1) ? `${lines.at(-1)} ${word}` : word;
    if (ctx.measureText(next).width > width && lines.at(-1)) lines.push(word);
    else lines[lines.length - 1] = next;
  }
  return lines;
}

// The same card, printed with the details of one job from the timeline.
function drawJob(ctx, job) {
  const right = WIDTH - MARGIN - 42;
  const width = right - MARGIN;
  const write = (lines, y, step) => {
    lines.forEach((line, index) => ctx.fillText(line, MARGIN, y + index * step));
    return y + lines.length * step;
  };

  ctx.letterSpacing = '0px';
  ctx.fillStyle = '#111111';
  ctx.font = `46px ${TEXT_FONT}`;
  ctx.fillText(job.current ? 'Currently' : 'Previously', MARGIN, 590);
  ctx.fillStyle = '#8a8a8a';
  ctx.font = `40px ${TEXT_FONT}`;
  ctx.textAlign = 'right';
  ctx.fillText(job.year, right, 590);
  ctx.textAlign = 'left';

  ctx.fillStyle = job.cardColor;
  ctx.font = `600 70px ${DISPLAY_FONT}`;
  ctx.letterSpacing = '-0.02em';
  let y = write(wrap(ctx, job.company, width), 690, 80);
  ctx.letterSpacing = '0px';

  ctx.fillStyle = '#111111';
  ctx.font = `48px ${TEXT_FONT}`;
  write(wrap(ctx, job.role, width), y - 6, 56);

  const pillTop = 1170;

  const pills = job.projects.slice(0, 2);
  const gap = 20;
  const pillWidth = (width - gap * (pills.length - 1)) / pills.length;
  pills.forEach((item, index) => {
    drawPill(ctx, MARGIN + index * (pillWidth + gap), pillTop, pillWidth, 75, { label: item.title, color: job.cardColor });
  });
}

export function drawJobArtworks(content, card, jobs) {
  return jobs.map((job) => {
    const canvas = document.createElement('canvas');
    canvas.width = WIDTH;
    canvas.height = HEIGHT;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(namePlate(content, card), 0, 0);
    drawJob(ctx, job);
    return canvas;
  });
}
