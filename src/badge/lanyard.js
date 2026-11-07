import * as THREE from 'three';

const point = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);

// A flat ribbon whose geometry is rebuilt every frame along a curve.
export function createStrap(material, rows = 80, halfWidth = 0.085) {
  const RING = 12;
  const halfThickness = 0.012;
  const stride = RING + 1;
  const positions = new Float32Array((rows + 1) * stride * 3);
  const normals = positions.slice();
  const uvs = new Float32Array((rows + 1) * stride * 2);
  const indices = [];

  for (let row = 0; row <= rows; row++) {
    for (let col = 0; col <= RING; col++) {
      const i = row * stride + col;
      uvs[i * 2] = col / RING;
      uvs[i * 2 + 1] = row / rows;
      if (row < rows && col < RING) indices.push(i, i + 1, i + stride, i + 1, i + stride + 1, i + stride);
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('normal', new THREE.BufferAttribute(normals, 3));
  geometry.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
  geometry.setIndex(indices);

  const mesh = new THREE.Mesh(geometry, material);
  mesh.castShadow = true;
  mesh.frustumCulled = false;

  const make = () => Array.from({ length: rows + 1 }, () => point());
  const tangents = make();
  const frames = make();
  const samples = make();
  const step = new THREE.Quaternion();
  const cross = point();
  const binormal = point();
  const widthAxis = point();
  const vertex = point();
  let twist = 0;

  function update(curve, targetSide, delta = 1 / 60, constrain) {
    for (let i = 0; i <= rows; i++) {
      curve.getPoint(i / rows, samples[i]);
      curve.getTangent(i / rows, tangents[i]).normalize();
    }

    if (constrain) {
      let moved = false;
      for (const sample of samples) moved = constrain(sample) || moved;
      if (moved) {
        for (let i = 0; i <= rows; i++) {
          tangents[i].copy(samples[Math.min(rows, i + 1)]).sub(samples[Math.max(0, i - 1)]).normalize();
        }
      }
    }

    // Parallel-transport a frame up the ribbon so it never flips on its own.
    frames[0].set(1, 0, 0).addScaledVector(tangents[0], -tangents[0].x).normalize();
    for (let i = 1; i <= rows; i++) {
      step.setFromUnitVectors(tangents[i - 1], tangents[i]);
      frames[i].copy(frames[i - 1]).applyQuaternion(step);
      frames[i].addScaledVector(tangents[i], -frames[i].dot(tangents[i])).normalize();
    }

    // Ease the twist so the far end lines up with the yoke.
    const last = tangents[rows];
    const target = widthAxis.copy(targetSide).addScaledVector(last, -targetSide.dot(last)).normalize();
    const angle = Math.atan2(cross.crossVectors(frames[rows], target).dot(last), frames[rows].dot(target));
    const shortest = 0.5 * Math.atan2(Math.sin(2 * angle), Math.cos(2 * angle));
    twist += (shortest - twist) * (1 - Math.exp(-14 * delta));

    for (let row = 0; row <= rows; row++) {
      widthAxis.copy(frames[row]).applyAxisAngle(tangents[row], twist * THREE.MathUtils.smoothstep(row / rows, 0, 1));
      binormal.crossVectors(widthAxis, tangents[row]).normalize();
      for (let col = 0; col <= RING; col++) {
        const theta = (col / RING) * Math.PI * 2;
        const cos = Math.cos(theta);
        const sin = Math.sin(theta);
        const i = (row * stride + col) * 3;
        vertex.copy(samples[row]).addScaledVector(widthAxis, cos * halfWidth).addScaledVector(binormal, sin * halfThickness);
        vertex.toArray(positions, i);
        vertex
          .copy(widthAxis)
          .multiplyScalar(cos / halfWidth)
          .addScaledVector(binormal, sin / halfThickness)
          .normalize()
          .toArray(normals, i);
      }
    }
    geometry.attributes.position.needsUpdate = true;
    geometry.attributes.normal.needsUpdate = true;
  }

  return { mesh, update };
}

// The metal clip that connects the straps to the card.
export function createHardware(metal, webbing) {
  const clasp = new THREE.Group();
  const eye = new THREE.Group();
  const yoke = new THREE.Group();
  const clip = new THREE.Group();
  clip.rotation.y = Math.PI / 2;
  clasp.add(clip);

  function add(geometry, material, parent, position = point()) {
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.copy(position);
    mesh.castShadow = true;
    parent.add(mesh);
    return mesh;
  }

  function rod(from, to, radius, parent = clip) {
    const axis = to.clone().sub(from);
    const mesh = add(
      new THREE.CylinderGeometry(radius, radius, axis.length(), 20),
      metal,
      parent,
      from.clone().add(to).multiplyScalar(0.5),
    );
    mesh.quaternion.setFromUnitVectors(point(0, 1, 0), axis.normalize());
    return mesh;
  }

  const tube = (curve, segments, radius, radial) => new THREE.TubeGeometry(curve, segments, radius, radial, false);

  // Clip body
  const body = new THREE.Shape();
  body.moveTo(-0.052, 0.245);
  body.lineTo(0.052, 0.245);
  body.bezierCurveTo(0.062, 0.17, 0.075, 0.06, 0.105, -0.09);
  body.quadraticCurveTo(0.075, -0.08, 0.04, -0.035);
  body.quadraticCurveTo(-0.025, 0.045, -0.11, 0.018);
  body.quadraticCurveTo(-0.07, 0.11, -0.052, 0.245);
  const bodyGeometry = new THREE.ExtrudeGeometry(body, {
    depth: 0.047,
    bevelEnabled: true,
    bevelSegments: 4,
    bevelSize: 0.012,
    bevelThickness: 0.012,
    curveSegments: 20,
  });
  bodyGeometry.translate(0, 0, -0.0235);
  add(bodyGeometry, metal, clip);

  // Hook
  const hook = new THREE.CurvePath();
  hook.add(new THREE.CubicBezierCurve3(point(0.075, 0.015), point(0.14, -0.1), point(0.13, -0.3), point(0, -0.32)));
  hook.add(new THREE.CubicBezierCurve3(point(0, -0.32), point(-0.15, -0.34), point(-0.19, -0.2), point(-0.15, -0.1)));
  add(tube(hook, 80, 0.025, 16), metal, clip);

  // Spring gate and hinge
  const gate = new THREE.CubicBezierCurve3(point(-0.03, 0.069), point(-0.09, 0.075), point(-0.13, -0.05), point(-0.15, -0.1));
  add(tube(gate, 40, 0.024, 16), metal, clip).scale.z = 0.75;
  add(
    tube(
      new THREE.CatmullRomCurve3([point(0.073, 0.07, -0.01), point(0.178, 0.015, -0.01), point(0.182, -0.027, -0.01), point(0.13, -0.047, -0.01)]),
      64,
      0.011,
      12,
    ),
    metal,
    clip,
  );
  add(new THREE.CylinderGeometry(0.028, 0.028, 0.075, 24), metal, clip, point(-0.03, 0.069, 0)).rotation.x = Math.PI / 2;
  for (const side of [-1, 1]) {
    add(new THREE.TorusGeometry(0.022, 0.0038, 8, 24), metal, clip, point(-0.03, 0.069, side * 0.04));
    add(new THREE.SphereGeometry(0.012, 16, 10), metal, clip, point(-0.03, 0.069, side * 0.04)).scale.z = 0.25;
  }

  // Swivel
  rod(point(0, 0.225), point(0, 0.285), 0.042, clasp);
  add(new THREE.CylinderGeometry(0.069, 0.058, 0.085, 32), metal, eye, point(0, -0.146));
  add(new THREE.CylinderGeometry(0.084, 0.084, 0.019, 32), metal, eye, point(0, -0.115));
  const loop = new THREE.CatmullRomCurve3(
    [point(-0.115, 0.13), point(-0.125, 0.04), point(-0.115, -0.07), point(0, -0.1), point(0.115, -0.07), point(0.125, 0.04), point(0.115, 0.13)],
    false,
  );
  add(tube(loop, 80, 0.027, 12), metal, eye);
  rod(point(-0.115, 0.13), point(0.115, 0.13), 0.027, eye);

  // Webbing folded through the loop, with stitching
  const fold = new THREE.CatmullRomCurve3([
    point(0, 0.04, 0.061),
    point(0, -0.06, 0.061),
    point(0, -0.16, 0.061),
    point(0, -0.22, 0),
    point(0, -0.16, -0.061),
    point(0, -0.06, -0.061),
    point(0, 0.04, -0.061),
  ]);
  const foldStrap = createStrap(webbing, 64, 0.085);
  foldStrap.update(fold, point(1, 0, 0), 1);
  yoke.add(foldStrap.mesh);

  const thread = new THREE.MeshStandardMaterial({ color: '#777d68', roughness: 1 });
  for (const side of [-1, 1]) {
    for (const y of [-0.04, 0]) {
      for (let i = 0; i < 6; i++) {
        add(new THREE.BoxGeometry(0.01, 0.003, 0.002), thread, yoke, point(-0.06 + i * 0.024, y, side * 0.073));
      }
    }
  }

  return { clasp, eye, yoke };
}
