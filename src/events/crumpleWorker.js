import { bakePose, buildMesh, simulateCrumple } from './crumpleSim.js';

const buffersOf = (pose) => [pose.P.buffer, pose.N.buffer, pose.F.buffer, pose.B.buffer];

self.onmessage = ({ data: { seeds } }) => {
  const mesh = buildMesh();
  const flat = bakePose(mesh, mesh.rest, null, null);
  const triangleCorners = mesh.tris.length;
  const uv = new Float32Array(2 * triangleCorners);
  for (let i = 0; i < triangleCorners; i++) {
    uv[2 * i] = mesh.uv[2 * mesh.tris[i]];
    uv[2 * i + 1] = mesh.uv[2 * mesh.tris[i] + 1];
  }
  self.postMessage({ type: 'mesh', flat, uv }, [...buffersOf(flat), uv.buffer]);

  seeds.forEach((seed, index) => {
    const poses = simulateCrumple(mesh, seed).map(({ open, pos, front, back }) => ({ open, ...bakePose(mesh, pos, front, back) }));
    self.postMessage({ type: 'poses', index, poses }, poses.flatMap(buffersOf));
  });
};
