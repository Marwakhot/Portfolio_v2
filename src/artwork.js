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
  const baseSize = 150;
  ctx.font = `600 ${baseSize}px ${DISPLAY_FONT}`;
  ctx.letterSpacing = '-0.02em';
  const widest = Math.max(
    ctx.measureText(content.firstName).width,
    ctx.measureText(content.lastName).width,
  );
  const size = Math.min(baseSize, (baseSize * (WIDTH - MARGIN * 2)) / widest);
  inkText(ctx, content.firstName, MARGIN, 190, size, card.firstNameColor, 7);
  inkText(ctx, content.lastName, MARGIN, 190 + size * 0.86, size, card.lastNameColor, 19);
}

function drawDetails(ctx, card) {
  const width = WIDTH - MARGIN * 2;
  ctx.letterSpacing = '0px';

  // Each role sits above its coloured box, as large as the longest box allows.
  let size;
  for (size of [46, 44, 42, 40, 38, 36]) {
    ctx.font = `500 ${size}px ${TEXT_FONT}`;
    if (Math.max(...card.lines.map((line) => ctx.measureText(line.pill).width)) + size * 1.1 <= width) break;
  }

  // Sits on the bottom of the card, level with the skill chips on the job cards.
  const height = Math.round(size * 1.6);
  const top = 1256 - card.lines.length * (50 + height) - (card.lines.length - 1) * 22;
  let y = top;
  ctx.textBaseline = 'middle';
  for (const line of card.lines) {
    ctx.fillStyle = '#111111';
    ctx.fillText(line.text, MARGIN, y + 22);
    y += 50;
    ctx.fillStyle = line.color;
    ctx.beginPath();
    ctx.roundRect(MARGIN, y, ctx.measureText(line.pill).width + size * 1.1, height, height / 2);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.fillText(line.pill, MARGIN + size * 0.55, y + height / 2 + 2);
    y += height + 22;
  }
  ctx.textBaseline = 'alphabetic';
  return top;
}

// The photo fills the empty space between the name and the boxes.
async function drawPhoto(ctx, url, top, bottom) {
  let image;
  try {
    image = await loadImage(url);
  } catch (error) {
    console.error(error);
    return;
  }
  const box = { x: MARGIN, y: top, width: WIDTH - MARGIN * 2, height: bottom - top };
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

  ctx.drawImage(namePlate(content, card), 0, 0);
  const detailsTop = drawDetails(ctx, card);
  if (card.photo) await drawPhoto(ctx, card.photo, 356, detailsTop - 34);
  return canvas;
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

// The same card, printed with the skills from one stop on the timeline.
function drawJob(ctx, job) {
  ctx.letterSpacing = '0px';
  ctx.fillStyle = '#111111';
  ctx.font = `600 58px ${DISPLAY_FONT}`;
  ctx.fillText('Skill set:', MARGIN, 425);
  drawSkills(ctx, job.skills, job.cardColor, WIDTH - MARGIN * 2 - 42, 470, 1256);
}

// Skill chips, flowed into rows directly under the heading, as large as they fit.
function drawSkills(ctx, skills, color, width, top, bottom) {
  const gap = 14;
  let rows;
  let size;
  let height;
  let padding;
  for (size of [66, 60, 54, 48, 42, 36]) {
    ctx.font = `${size}px ${TEXT_FONT}`;
    height = Math.round(size * 1.6);
    padding = size * 0.55;
    rows = [[]];
    let used = 0;
    let tooWide = false;
    for (const label of skills) {
      const chip = ctx.measureText(label).width + padding * 2;
      tooWide ||= chip > width;
      if (used && used + gap + chip > width) {
        rows.push([]);
        used = 0;
      }
      rows.at(-1).push({ label, width: chip });
      used += (used ? gap : 0) + chip;
    }
    if (!tooWide && rows.length * (height + gap) - gap <= bottom - top) break;
  }

  ctx.textBaseline = 'middle';
  rows.forEach((row, rowIndex) => {
    const y = top + rowIndex * (height + gap);
    let x = MARGIN;
    for (const chip of row) {
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.roundRect(x, y, chip.width, height, height / 2);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.fillText(chip.label, x + padding, y + height / 2 + 2);
      x += chip.width + gap;
    }
  });
  ctx.textBaseline = 'alphabetic';
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
