import RAPIER, { rapierReady } from '../rapier.js';
import * as THREE from 'three';

const PHYSICS = {
  gravity: 9.81,
  mass: 0.72,
  damping: 0.45,
  antiTwist: 2.2,
  twistProgression: 3,
  swivelDamping: 0.15,
  strapStiffness: 90,
};

const LINKS_PER_STRAP = 12;
const CARD_REST_Y = 0.15;

// Collision group bitmasks (membership and filter).
const GROUP_CARD = 65542;
const GROUP_STRAP = 131077;
const GROUP_HARDWARE = 524292;
const GROUP_WALL = 262155;

const vec = (x = 0, y = 0, z = 0) => ({ x, y, z });

function antiTwistTorque(yaw, yawVelocity) {
  const { antiTwist, twistProgression } = PHYSICS;
  const spring = -antiTwist * yaw * (1 + twistProgression * (Math.abs(yaw) / Math.PI) ** 2);
  return THREE.MathUtils.clamp(spring - 0.65 * Math.sqrt(antiTwist) * yawVelocity, -18, 18);
}

function yawOf(body) {
  const q = body.rotation();
  return Math.atan2(2 * (q.x * q.z + q.w * q.y), 1 - 2 * (q.x * q.x + q.y * q.y));
}

export async function createPhysics() {
  await rapierReady;

  const world = new RAPIER.World(vec(0, -PHYSICS.gravity, 0));
  world.timestep = 1 / 120;
  world.numSolverIterations = 32;
  const dt = world.timestep;

  // Invisible wall behind the card.
  world.createCollider(
    RAPIER.ColliderDesc.cuboid(50, 50, 0.2)
      .setTranslation(0, 0, -1.2)
      .setCollisionGroups(GROUP_WALL)
      .setFriction(0.4),
  );

  function addBody(position, halfExtents, mass, damping = 0.5, groups = GROUP_HARDWARE) {
    const body = world.createRigidBody(
      RAPIER.RigidBodyDesc.dynamic()
        .setTranslation(position.x, position.y, position.z)
        .setLinearDamping(damping)
        .setAngularDamping(0.6)
        .setCcdEnabled(true)
        .setCanSleep(false),
    );
    const collider = world.createCollider(
      RAPIER.ColliderDesc.cuboid(...halfExtents)
        .setMass(mass)
        .setCollisionGroups(groups)
        .setFriction(0.45)
        .setRestitution(0),
      body,
    );
    return { body, collider };
  }

  const card = addBody(vec(0, CARD_REST_Y, 0), [1.4, 2.22, 0.105], PHYSICS.mass, 0.5, GROUP_CARD).body;
  const clasp = addBody(vec(0, 2.35, 0.03), [0.21, 0.33, 0.13], 0.09).body;
  const eye = addBody(vec(0, 2.79, 0.03), [0.22, 0.21, 0.09], 0.055).body;
  const yoke = addBody(vec(0, 3.08, 0.03), [0.1, 0.22, 0.08], 0.045, 0.5, GROUP_STRAP).body;

  world.createImpulseJoint(RAPIER.JointData.spherical(vec(0, 2.025, 0.03), vec(0, -0.175, 0)), card, clasp, true);
  world.createImpulseJoint(RAPIER.JointData.revolute(vec(0, 0.26, 0), vec(0, -0.18, 0), vec(0, 1, 0)), clasp, eye, true);
  const fold = world.createImpulseJoint(
    RAPIER.JointData.revolute(vec(0, 0.13, 0), vec(0, -0.16, 0), vec(1, 0, 0)),
    eye,
    yoke,
    true,
  );
  fold.setLimits(-1.15, 1.15);

  // Two straps, each a chain of small bodies running up off the top of the screen.
  const straps = [-1, 1].map((side) => {
    const anchorPosition = vec(side * 2.6, 9.5, -0.25);
    const attachment = vec(0, 0.04, side * 0.061); // where the visible strap meets the yoke
    const yokeAnchor = vec(side * 0.015, 0.04, 0);
    const end = vec(yokeAnchor.x, 3.08 + yokeAnchor.y, 0.03);
    const delta = vec(end.x - anchorPosition.x, end.y - anchorPosition.y, end.z - anchorPosition.z);
    const segment = Math.hypot(delta.x, delta.y, delta.z) / LINKS_PER_STRAP;
    const anchor = world.createRigidBody(
      RAPIER.RigidBodyDesc.fixed().setTranslation(anchorPosition.x, anchorPosition.y, anchorPosition.z),
    );

    const links = [];
    const segments = [];
    for (let i = 1; i <= LINKS_PER_STRAP; i++) {
      const t = i / LINKS_PER_STRAP;
      const link = addBody(
        vec(anchorPosition.x + delta.x * t, anchorPosition.y + delta.y * t, anchorPosition.z + delta.z * t),
        [0.025, 0.025, 0.018],
        0.0125,
        1.6,
        GROUP_STRAP,
      );
      link.body.setEnabledRotations(false, false, false, true);
      link.collider.setShape(new RAPIER.Capsule(segment / 2, 0.11));
      segments.push(link.collider);
      world.createImpulseJoint(RAPIER.JointData.rope(segment, vec(), vec()), links.at(-1) || anchor, link.body, true);
      links.push(link.body);
    }
    world.createImpulseJoint(RAPIER.JointData.spherical(vec(), yokeAnchor), links.at(-1), yoke, true);

    // Springs across 1, 2 and 3 links give the webbing some stiffness.
    const chain = [anchor, ...links];
    for (const span of [1, 2, 3]) {
      for (let i = span; i < chain.length; i++) {
        const stiffness = PHYSICS.strapStiffness * (span === 1 ? 0.6 : span === 2 ? 1 : 0.45);
        const damping = 1.4 * Math.sqrt(stiffness * 0.0125);
        world.createImpulseJoint(
          RAPIER.JointData.spring(segment * span, stiffness, damping, vec(), vec()),
          chain[i - span],
          chain[i],
          true,
        );
      }
    }
    return { anchor, anchorPosition, links, attachment, segments };
  });

  const toParent = new THREE.Vector3();
  const rotation = new THREE.Quaternion();
  const up = new THREE.Vector3(0, 1, 0);

  // Each link's capsule spans the gap back to the previous link.
  function alignStrapColliders() {
    for (const strap of straps) {
      strap.links.forEach((link, i) => {
        const position = link.translation();
        const previous = (i ? strap.links[i - 1] : strap.anchor).translation();
        toParent.set(previous.x - position.x, previous.y - position.y, previous.z - position.z);
        strap.segments[i].setTranslationWrtParent(vec(toParent.x / 2, toParent.y / 2, toParent.z / 2));
        if (toParent.lengthSq() > 1e-10) {
          rotation.setFromUnitVectors(up, toParent.normalize());
          strap.segments[i].setRotationWrtParent(rotation);
        }
      });
    }
  }

  function dampRelativeSpin(a, b, axis, rate, inertia) {
    const q = b.rotation();
    const cx = 2 * (q.y * axis.z - q.z * axis.y);
    const cy = 2 * (q.z * axis.x - q.x * axis.z);
    const cz = 2 * (q.x * axis.y - q.y * axis.x);
    const worldAxis = vec(
      axis.x + q.w * cx + q.y * cz - q.z * cy,
      axis.y + q.w * cy + q.z * cx - q.x * cz,
      axis.z + q.w * cz + q.x * cy - q.y * cx,
    );
    const va = a.angvel();
    const vb = b.angvel();
    const relative =
      (va.x - vb.x) * worldAxis.x + (va.y - vb.y) * worldAxis.y + (va.z - vb.z) * worldAxis.z;
    const impulse = -relative * inertia * (1 - Math.exp(-rate * 10 * dt));
    a.applyTorqueImpulse(vec(worldAxis.x * impulse, worldAxis.y * impulse, worldAxis.z * impulse), true);
    b.applyTorqueImpulse(vec(-worldAxis.x * impulse, -worldAxis.y * impulse, -worldAxis.z * impulse), true);
  }

  function prepareStep(reducedMotion) {
    alignStrapColliders();
    const extraDamping = reducedMotion ? 2 : 0;
    card.setLinearDamping(PHYSICS.damping + extraDamping);
    card.setAngularDamping(PHYSICS.damping + 0.2 + extraDamping);

    dampRelativeSpin(clasp, eye, vec(0, 1, 0), PHYSICS.swivelDamping, 369e-6);
    dampRelativeSpin(eye, yoke, vec(1, 0, 0), 0.08 + PHYSICS.swivelDamping * 0.4, 199e-6);

    // Keep the yoke facing forward, implicitly integrated so it stays stable.
    const inertia = 0.001;
    const damping = 0.12;
    const yokeImpulse =
      (-(2 * yawOf(yoke) + damping * yoke.angvel().y) * dt) /
      (1 + (damping * dt) / inertia + (2 * dt * dt) / inertia);
    yoke.applyTorqueImpulse(vec(0, yokeImpulse, 0), true);

    // Pull the card back towards facing the viewer.
    card.applyTorqueImpulse(vec(0, antiTwistTorque(yawOf(card), card.angvel().y) * dt, 0), true);
  }

  alignStrapColliders();

  return { world, card, clasp, eye, yoke, straps, restY: CARD_REST_Y, mass: PHYSICS.mass, prepareStep };
}
