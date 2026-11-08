import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { createHardware, createStrap } from './lanyard.js';
import { createPhysics } from './physics.js';

const LOOK = {
  wear: 0.2,
  edgeDamage: 0.55,
  sleeveRoughness: 0.012,
  sleeveThickness: 0.006,
  metalRoughness: 0.2,
  strapColor: '#30382d',
  keyLight: 2.5,
  reflections: 0.9,
  shadow: 0.13,
};
const MOUSE_FORCE = 1;
const GRIP = 100;
const SMALL_SCREEN = 700;
const CAMERA_Y = 0.8;
const CAMERA_Z = 13.8;
const CARD_SHIFT = 0.21; // how far right of centre the card hangs, as a share of the page width

const vec3 = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);

function roundedRect(width, height, radius) {
  const shape = new THREE.Shape();
  const x = -width / 2;
  const y = -height / 2;
  shape.moveTo(x + radius, y);
  shape.lineTo(x + width - radius, y);
  shape.quadraticCurveTo(x + width, y, x + width, y + radius);
  shape.lineTo(x + width, y + height - radius);
  shape.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  shape.lineTo(x + radius, y + height);
  shape.quadraticCurveTo(x, y + height, x, y + height - radius);
  shape.lineTo(x, y + radius);
  shape.quadraticCurveTo(x, y, x + radius, y);
  return shape;
}

function seeded(seed) {
  let state = seed;
  return () => (state = (state * 1664525 + 1013904223) >>> 0) / 4294967296;
}

function createFabricTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 256;
  const ctx = canvas.getContext('2d');
  const image = ctx.createImageData(256, 256);
  const random = seeded(23);
  for (let i = 0; i < image.data.length; i += 4) {
    const x = (i / 4) % 256;
    const y = Math.floor(i / 1024);
    const shade = 110 + 50 * Math.sin((x * Math.PI) / 2) * Math.sin((y * Math.PI) / 2) + random() * 25;
    image.data[i] = image.data[i + 1] = image.data[i + 2] = shade;
    image.data[i + 3] = 255;
  }
  ctx.putImageData(image, 0, 0);
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(4, 30);
  return texture;
}

function createPlasticTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 256;
  const ctx = canvas.getContext('2d');
  const image = ctx.createImageData(256, 256);
  const random = seeded(23);
  for (let i = 0; i < image.data.length; i += 4) {
    const shade = 180 + random() * 50;
    image.data[i] = image.data[i + 1] = image.data[i + 2] = shade;
    image.data[i + 3] = 255;
  }
  ctx.putImageData(image, 0, 0);
  ctx.strokeStyle = 'rgba(80,80,80,.14)';
  ctx.lineWidth = 0.4;
  for (let i = 0; i < 45; i++) {
    const x = random() * 256;
    const y = random() * 256;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + random() * 40, y + random() * 5);
    ctx.stroke();
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  return texture;
}

// Specks and hairline scratches on the vinyl, denser around the edges.
function createWearTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 1536;
  const ctx = canvas.getContext('2d');
  const random = seeded(617);
  for (let i = 0; i < 950; i++) {
    const x = random() * 1024;
    const y = random() * 1536;
    if (Math.min(x, 1024 - x, y, 1536 - y) > 60 && !(y > 165 && y < 244) && random() > 0.09) continue;
    const size = 0.3 + random() * 2.1;
    ctx.fillStyle = `rgba(${random() > 0.55 ? '70,66,53' : '255,255,246'},${0.12 + random() * 0.38})`;
    ctx.beginPath();
    ctx.ellipse(x, y, size, size * (0.45 + random()), random() * Math.PI, 0, Math.PI * 2);
    ctx.fill();
  }
  for (let i = 0; i < 28; i++) {
    const x = random() > 0.5 ? 25 + random() * 45 : 954 + random() * 40;
    const y = 250 + random() * 1220;
    ctx.strokeStyle = `rgba(240,242,230,${0.1 + random() * 0.2})`;
    ctx.lineWidth = 0.35 + random() * 0.55;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.quadraticCurveTo(x + random() * 5, y + 12, x + random() * 7, y + 15 + random() * 38);
    ctx.stroke();
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

// Almost-clear film: only reflections show, stronger at glancing angles.
function createVinylMaterial(roughness, isWelded = false) {
  const material = new THREE.MeshPhysicalMaterial({
    color: '#ffffff',
    metalness: 1,
    roughness,
    transparent: true,
    depthWrite: false,
    side: THREE.FrontSide,
    envMapIntensity: LOOK.reflections,
  });
  const base = isWelded ? 0.18 : 0.035;
  const fresnel = isWelded ? 0.82 : 0.965;
  const highlight = isWelded ? 0.65 : 0.34;

  material.onBeforeCompile = (shader) => {
    shader.vertexShader = `varying vec3 vFilmPosition;\n${shader.vertexShader}`.replace(
      '#include <begin_vertex>',
      `#include <begin_vertex>
      vFilmPosition = position;
      ${
        isWelded
          ? `float edgeMask = smoothstep(1.20, 1.30, abs(position.x));
             float nick = exp(-pow((position.y + 1.72) * 19.0, 2.0)) + .6 * exp(-pow((position.y - .7) * 28.0, 2.0));
             transformed.x -= sign(position.x) * nick * edgeMask * .014 * ${LOOK.edgeDamage.toFixed(3)};`
          : ''
      }`,
    );
    let fragment = `varying vec3 vFilmPosition;\n${shader.fragmentShader}`;
    if (!isWelded) {
      fragment = fragment.replace(
        '#include <normal_fragment_maps>',
        `#include <normal_fragment_maps>
        normal = normalize(normal + vec3(.018 * sin(vFilmPosition.y * 3.1 + vFilmPosition.x * 1.4), .011 * cos(vFilmPosition.x * 4.2 - vFilmPosition.y * 1.3), 0.0));`,
      );
    }
    shader.fragmentShader = fragment.replace(
      '#include <opaque_fragment>',
      `#include <opaque_fragment>
      float facing = clamp(abs(dot(normalize(normal), normalize(vViewPosition))), 0.0, 1.0);
      float reflection = max(${base.toFixed(3)} + ${fresnel.toFixed(3)} * pow(1.0 - facing, 5.0), ${base.toFixed(3)});
      reflection = clamp(reflection * ${(1 + LOOK.sleeveThickness * 3).toFixed(4)}, 0.0, 1.0);
      float energy = max(max(outgoingLight.r, outgoingLight.g), outgoingLight.b);
      gl_FragColor.a = max(reflection, smoothstep(.9, 4.0, energy) * ${highlight.toFixed(2)});`,
    );
  };
  material.customProgramCacheKey = () => `thin-vinyl-${isWelded}`;
  return material;
}

function createEnvironment(renderer) {
  const generator = new THREE.PMREMGenerator(renderer);
  const room = new RoomEnvironment();
  // Three strip lights, for the long highlights that sweep across the sleeve.
  for (const [x, z, width, height, intensity, rotation] of [
    [-3, 3, 1, 7, 5, 0.55],
    [3, 3, 1.5, 7, 0.015, -0.55],
    [0.8, 4, 0.28, 6, 7, -0.2],
  ]) {
    const strip = new THREE.Mesh(
      new THREE.BoxGeometry(width, height, 0.03),
      new THREE.MeshBasicMaterial({ color: new THREE.Color().setRGB(intensity, intensity, intensity) }),
    );
    strip.position.set(x, 1, z);
    strip.rotation.y = rotation;
    room.add(strip);
  }
  const target = generator.fromScene(room, 0.015);
  room.dispose();
  generator.dispose();
  return target.texture;
}

function buildCard(group, artwork, renderer) {
  const add = (geometry, material, x = 0, y = 0, z = 0) => {
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(x, y, z);
    group.add(mesh);
    return mesh;
  };

  const film = createVinylMaterial(LOOK.sleeveRoughness);
  const weld = createVinylMaterial(0.018, true);
  weld.color.set('#858c88');

  // Sleeve outline, with two punched holes and the slot.
  const outline = roundedRect(2.72, 4.36, 0.19);
  for (const x of [-0.88, 0.88]) {
    const hole = new THREE.Path();
    hole.absarc(x, 1.89, 0.104, 0, Math.PI * 2, true);
    outline.holes.push(hole);
  }
  const slot = new THREE.Path();
  roundedRect(0.66, 0.13, 0.064)
    .getPoints(16)
    .reverse()
    .forEach((p, i) => (i ? slot.lineTo(p.x, p.y + 1.88) : slot.moveTo(p.x, p.y + 1.88)));
  outline.holes.push(slot);

  add(
    new THREE.ExtrudeGeometry(outline, {
      depth: 0.008,
      bevelEnabled: true,
      bevelSegments: 3,
      steps: 1,
      bevelSize: 0.005,
      bevelThickness: 0.004,
      curveSegments: 16,
    }),
    film,
    0,
    0,
    0.045,
  ).renderOrder = 3;
  const back = add(new THREE.ShapeGeometry(outline, 16), film, 0, 0, 0.005);
  back.rotation.y = Math.PI;
  back.renderOrder = 2;

  const wearTexture = createWearTexture();
  add(
    new THREE.PlaneGeometry(2.52, 3.87),
    new THREE.MeshBasicMaterial({
      map: wearTexture,
      transparent: true,
      opacity: LOOK.wear,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -1,
    }),
    0,
    -0.12,
    0.061,
  ).renderOrder = 4;

  // Heat-welded seams, slightly wobbly so they catch light unevenly.
  function seam(width, height, radius, z, thickness = 0.015, offsetY = 0) {
    const points = roundedRect(width, height, radius)
      .getPoints(24)
      .map((p) => vec3(p.x, p.y + offsetY, z));
    if (points[0].distanceTo(points.at(-1)) < 1e-4) points.pop();
    points.forEach((p, i) => {
      p.z += 0.002 * Math.sin(i * 1.7) + 0.0015 * Math.sin(i * 0.47);
    });
    add(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points, true), 220, thickness, 10, true), weld);
  }
  seam(2.72, 4.36, 0.19, 0.032, 0.012);
  seam(2.58, 4.2, 0.15, 0.05, 0.007);
  seam(0.66, 0.13, 0.064, 0.053, 0.006, 1.88);
  for (const x of [-0.88, 0.88]) {
    add(new THREE.TorusGeometry(0.109, 0.013, 8, 40), weld, x, 1.89, 0.053);
  }

  // Zip-lock ridges along the top of the pocket, and tiny droplets beside them.
  for (let ridge = 0; ridge < 4; ridge++) {
    const points = Array.from({ length: 38 }, (_, i) =>
      vec3(
        -1.275 + (i / 37) * 2.55,
        1.55 + ridge * 0.032 + 0.002 * Math.sin(i * 0.81 + ridge),
        0.056 + 0.002 * Math.sin(i * 0.69 + ridge * 2),
      ),
    );
    add(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points), 90, 0.01 + ridge * 8e-4, 8, false), weld);
  }
  const droplet = new THREE.MeshPhysicalMaterial({
    color: '#ffffff',
    roughness: 0.015,
    transmission: 1,
    thickness: 0.008,
    ior: 1.1,
  });
  for (let i = 0; i < 19; i++) {
    const x = Math.sin(i * 47.31) * 1.17;
    const y = 1.565 + (0.5 + 0.5 * Math.sin(i * 29.9)) * 0.083;
    add(new THREE.SphereGeometry(0.004 + (i % 5) * 0.0017, 10, 6), droplet, x, y, 0.065).scale.set(1.8, 0.65, 0.4);
  }

  // The printed insert.
  const paper = add(
    new RoundedBoxGeometry(2.4, 3.52, 0.025, 3, 0.019),
    new THREE.MeshStandardMaterial({ color: '#efebdf', roughness: 0.88 }),
    0,
    -0.3,
    0.025,
  );
  paper.castShadow = true;

  const texture = new THREE.CanvasTexture(artwork);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
  group.userData.artwork = texture;
  add(new THREE.PlaneGeometry(2.39, 3.505), new THREE.MeshBasicMaterial({ map: texture, toneMapped: false }), 0, -0.3, 0.04);
  const paperBack = add(
    new THREE.PlaneGeometry(2.39, 3.505),
    new THREE.MeshStandardMaterial({ color: '#eeeadf', roughness: 0.9 }),
    0,
    -0.3,
    0.009,
  );
  paperBack.rotation.y = Math.PI;

  return paper;
}

export async function createBadgeScene(canvas, artwork) {
  const physics = await createPhysics();
  const { world, card: cardBody } = physics;

  const motionQuery = matchMedia('(prefers-reduced-motion: reduce)');

  const scene = new THREE.Scene();
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setClearColor(0, 0);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;

  const camera = new THREE.PerspectiveCamera(36, 1, 0.1, 60);
  camera.position.set(0, CAMERA_Y, CAMERA_Z);
  camera.lookAt(0, CAMERA_Y, 0);

  scene.environment = createEnvironment(renderer);
  scene.environmentIntensity = 0.65;

  const key = new THREE.DirectionalLight('#fff7e6', LOOK.keyLight);
  key.position.set(-3, 6, 7);
  key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024);
  Object.assign(key.shadow.camera, { left: -8, right: 8, top: 9, bottom: -7, near: 0.1, far: 25 });
  key.shadow.bias = -5e-4;
  key.shadow.normalBias = 0.03;
  key.shadow.radius = 5;
  scene.add(key);

  const fill = new THREE.DirectionalLight('#e8f0ff', 0.7);
  fill.position.set(5, 2, 4);
  scene.add(fill, new THREE.AmbientLight('#ffffff', 0.35));

  // Catches the shadow on an otherwise see-through wall.
  const wall = new THREE.Mesh(new THREE.PlaneGeometry(100, 100), new THREE.ShadowMaterial({ opacity: LOOK.shadow }));
  wall.position.z = -1;
  wall.receiveShadow = true;
  scene.add(wall);

  const cardGroup = new THREE.Group();
  scene.add(cardGroup);
  const grabSurface = buildCard(cardGroup, artwork, renderer);

  const metal = new THREE.MeshStandardMaterial({
    color: '#d5d9d6',
    metalness: 1,
    roughness: LOOK.metalRoughness,
    bumpMap: createPlasticTexture(),
    bumpScale: 12e-5,
  });
  const webbing = new THREE.MeshStandardMaterial({
    color: LOOK.strapColor,
    roughness: 0.9,
    bumpMap: createFabricTexture(),
    bumpScale: 0.003,
  });
  const hardware = createHardware(metal, webbing);
  scene.add(hardware.clasp, hardware.eye, hardware.yoke);

  const strapMeshes = physics.straps.map((strap) => {
    const mesh = createStrap(webbing);
    scene.add(mesh.mesh);
    return { ...mesh, points: Array.from({ length: strap.links.length + 2 }, () => vec3()) };
  });

  // Pointer handling
  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2(10, 10);
  const dragPlane = new THREE.Plane(vec3(0, 0, 1), 0);
  const dragTarget = vec3();
  const grabLocal = vec3();
  const previousPointer = vec3();
  const pointerOnPlane = vec3();
  let hasPreviousPointer = false;
  let previousPointerTime = 0;
  let dragging = false;
  let activePointer = null;

  function aim(event) {
    const rect = canvas.getBoundingClientRect();
    pointer.set(((event.clientX - rect.left) / rect.width) * 2 - 1, -((event.clientY - rect.top) / rect.height) * 2 + 1);
    raycaster.setFromCamera(pointer, camera);
  }

  const hitCard = () => raycaster.intersectObject(grabSurface, false)[0];

  function onPointerDown(event) {
    if (event.button !== 0) return;
    aim(event);
    const hit = hitCard();
    if (!hit) return;
    dragging = true;
    activePointer = event.pointerId;
    canvas.setPointerCapture(event.pointerId);
    dragPlane.setFromNormalAndCoplanarPoint(camera.getWorldDirection(vec3()), hit.point);
    raycaster.ray.intersectPlane(dragPlane, dragTarget);
    grabLocal.copy(cardGroup.worldToLocal(hit.point.clone()));
    canvas.style.cursor = 'grabbing';
  }

  function onPointerMove(event) {
    if (activePointer !== null && event.pointerId !== activePointer) return;
    aim(event);
    raycaster.ray.intersectPlane(dragPlane, pointerOnPlane);
    if (dragging) {
      dragTarget.copy(pointerOnPlane);
      dragTarget.x = THREE.MathUtils.clamp(dragTarget.x, -4.5, 4.5);
      dragTarget.y = THREE.MathUtils.clamp(dragTarget.y, -3.5, 5);
      return;
    }

    const hit = hitCard();
    canvas.style.cursor = hit ? 'grab' : 'default';
    const now = performance.now();
    // Brushing the cursor across the card knocks it, proportional to pointer speed.
    if (hit && hasPreviousPointer && !motionQuery.matches && event.pointerType !== 'touch') {
      const elapsed = Math.max((now - previousPointerTime) / 1000, 0.016);
      const speedX = THREE.MathUtils.clamp((pointerOnPlane.x - previousPointer.x) / elapsed, -12, 12);
      const speedY = THREE.MathUtils.clamp((pointerOnPlane.y - previousPointer.y) / elapsed, -8, 8);
      cardBody.applyImpulseAtPoint(vec3(speedX * 0.008 * MOUSE_FORCE, speedY * 0.004 * MOUSE_FORCE, 0), hit.point, true);
    }
    previousPointer.copy(pointerOnPlane);
    previousPointerTime = now;
    hasPreviousPointer = true;
  }

  function onPointerUp(event) {
    if (activePointer !== null && event && event.pointerId !== activePointer) return;
    dragging = false;
    if (activePointer !== null && canvas.hasPointerCapture(activePointer)) canvas.releasePointerCapture(activePointer);
    activePointer = null;
    canvas.style.cursor = 'grab';
  }

  function onPointerLeave() {
    hasPreviousPointer = false;
    if (!dragging) canvas.style.cursor = 'default';
  }

  canvas.addEventListener('pointerdown', onPointerDown);
  canvas.addEventListener('pointermove', onPointerMove);
  canvas.addEventListener('pointerup', onPointerUp);
  canvas.addEventListener('pointercancel', onPointerUp);
  canvas.addEventListener('lostpointercapture', onPointerUp);
  canvas.addEventListener('pointerleave', onPointerLeave);

  function cameraDistance(width, aspect) {
    return width < SMALL_SCREEN ? Math.max(CAMERA_Z, 6.4 / aspect) : CAMERA_Z;
  }

  function resize() {
    const { width, height } = canvas.getBoundingClientRect();
    if (!width || !height) return;
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.fov = width < SMALL_SCREEN ? 43 : 36;
    camera.position.z = cameraDistance(width, camera.aspect);
    applySide();
  }

  // Slides the whole picture sideways, so the card can still be dragged anywhere on the page.
  // 0 is the middle of the page, 1 is the right-hand side.
  let side = 0;
  let sideTarget = 0;
  function applySide() {
    const { width, height } = canvas.getBoundingClientRect();
    if (!width || !height) return;
    const shift = width < SMALL_SCREEN ? 0 : width * CARD_SHIFT * side;
    camera.setViewOffset(width, height, -shift, 0, width, height);
  }
  new ResizeObserver(resize).observe(canvas);
  resize();

  // A critically damped spring pulls the grabbed point towards the cursor.
  const force = vec3();
  const lever = vec3();
  const pointVelocity = vec3();
  const spin = vec3();
  const grabPoint = vec3();
  const bodyRotation = new THREE.Quaternion();

  function step() {
    physics.prepareStep(motionQuery.matches);
    if (dragging) {
      const dt = world.timestep;
      bodyRotation.copy(cardBody.rotation());
      lever.copy(grabLocal).applyQuaternion(bodyRotation);
      grabPoint.copy(cardBody.translation()).add(lever);
      pointVelocity.copy(cardBody.linvel());
      spin.copy(cardBody.angvel());
      pointVelocity.add(spin.cross(lever));
      const effectiveMass = physics.mass / (1 + lever.lengthSq() / 0.65);
      const stiffness = GRIP * effectiveMass;
      const damping = 2 * Math.sqrt(GRIP) * effectiveMass;
      const implicit = 1 + (damping * dt + stiffness * dt ** 2) / effectiveMass;
      force
        .copy(dragTarget)
        .sub(grabPoint)
        .multiplyScalar(stiffness)
        .addScaledVector(pointVelocity, -damping)
        .divideScalar(implicit)
        .clampLength(0, 110 * physics.mass);
      cardBody.applyImpulseAtPoint(force.multiplyScalar(dt), grabPoint, true);
    }
    world.step();
  }

  // Keeps strap vertices out of the card and in front of the wall.
  const inCardSpace = vec3();
  const inverseCard = new THREE.Quaternion();
  const cardBounds = [1.47, 2.3, 0.18];
  const axes = ['x', 'y', 'z'];

  function pushOutOfCard(position) {
    let moved = false;
    inCardSpace.copy(position).sub(cardGroup.position).applyQuaternion(inverseCard);
    if (axes.every((axis, i) => Math.abs(inCardSpace[axis]) < cardBounds[i])) {
      let nearest = 0;
      for (let i = 1; i < 3; i++) {
        const depth = cardBounds[i] - Math.abs(inCardSpace[axes[i]]);
        if (depth < cardBounds[nearest] - Math.abs(inCardSpace[axes[nearest]])) nearest = i;
      }
      const axis = axes[nearest];
      inCardSpace[axis] = (Math.sign(inCardSpace[axis]) || 1) * cardBounds[nearest];
      position.copy(inCardSpace).applyQuaternion(cardGroup.quaternion).add(cardGroup.position);
      moved = true;
    }
    if (position.z < -0.88) {
      position.z = -0.88;
      moved = true;
    }
    return moved;
  }

  let frame = 0;
  let lastTime = 0;
  let accumulator = 0;
  let onScreen = true;

  function tick(time) {
    frame = 0;
    if (document.hidden || !onScreen) return;
    frame = requestAnimationFrame(tick);

    const delta = Math.min((time - (lastTime || time)) / 1000, 0.05);
    lastTime = time;

    if (side !== sideTarget) {
      side += (sideTarget - side) * (1 - Math.exp(-delta * 10));
      if (Math.abs(sideTarget - side) < 0.001) side = sideTarget;
      applySide();
    }
    accumulator += delta;
    while (accumulator >= world.timestep) {
      step();
      accumulator -= world.timestep;
    }

    cardGroup.position.copy(cardBody.translation());
    cardGroup.quaternion.copy(cardBody.rotation());
    cardGroup.updateMatrixWorld(true);
    for (const part of ['clasp', 'eye', 'yoke']) {
      hardware[part].position.copy(physics[part].translation());
      hardware[part].quaternion.copy(physics[part].rotation());
      hardware[part].updateMatrixWorld(true);
    }
    inverseCard.copy(cardGroup.quaternion).invert();

    physics.straps.forEach((strap, index) => {
      const mesh = strapMeshes[index];
      const { points } = mesh;
      const count = strap.links.length;
      points[0].copy(strap.anchorPosition);
      strap.links.slice(0, -1).forEach((link, i) => points[i + 1].copy(link.translation()));
      points[count].copy(
        hardware.yoke.localToWorld(
          vec3(strap.attachment.x + Math.sign(strap.anchorPosition.x) * 0.025, strap.attachment.y + 0.055, strap.attachment.z),
        ),
      );
      points[count + 1].copy(hardware.yoke.localToWorld(vec3().copy(strap.attachment)));
      mesh.update(new THREE.CatmullRomCurve3(points), vec3(1, 0, 0).applyQuaternion(hardware.yoke.quaternion), delta, pushOutOfCard);
    });

    renderer.render(scene, camera);
  }

  function resume() {
    lastTime = 0;
    accumulator = 0;
    if (document.hidden || !onScreen) {
      cancelAnimationFrame(frame);
      frame = 0;
      onPointerUp();
    } else if (!frame) {
      frame = requestAnimationFrame(tick);
    }
  }

  new IntersectionObserver(([entry]) => {
    onScreen = entry.isIntersecting;
    resume();
  }).observe(canvas);
  document.addEventListener('visibilitychange', resume);

  // The opening swing: one small push as the page loads.
  if (!motionQuery.matches) {
    cardBody.applyImpulseAtPoint(vec3(0.4, 0, 0.04), vec3(0, physics.restY - 0.7, 0), true);
  }
  // Builds the shaders now, behind the gate, instead of freezing a fast scroll into the card.
  renderer.render(scene, camera);
  frame = requestAnimationFrame(tick);

  function knock(strength) {
    if (motionQuery.matches) return;
    cardBody.applyImpulseAtPoint(vec3(0.4 * strength, 0, 0.04 * strength), vec3(0, physics.restY - 0.7, 0), true);
  }

  return {
    // A harder swing, for when the card first drops into view.
    pop: () => knock(2.5),
    setSide(next) {
      sideTarget = next;
    },
    // Swaps what's printed on the card, with a small swing so the change reads as physical.
    setArtwork(next) {
      const texture = cardGroup.userData.artwork;
      if (texture.image === next) return;
      texture.image = next;
      texture.needsUpdate = true;
      knock(0.8);
    },
  };
}
