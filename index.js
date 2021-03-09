import * as THREE from "./build/three.module.js";
import { OrbitControls } from "./controls/OrbitControls.js";
import { VRButton } from "./webxr/VRButton.js";
import { XRControllerModelFactory } from "./webxr/XRControllerModelFactory.js";
import { XRHandModelFactory } from "./webxr/XRHandModelFactory.js";

let container;
let camera, scene, renderer, world;
let hand1, hand2;
let controller1, controller2;
let controllerGrip1, controllerGrip2;
let cylinders, atoms;

const hand1Bodies = [];
const hand2Bodies = [];
const atomBodies = [];

let handsAdded = false;

const timestep = 1 / 60;

let bodies = [];
let meshes = [];

let controls;

// This constants will control render sizes!!!
const scale = 0.1;
const translation = new THREE.Vector3(0, 1.15, -0.5);
const atomRadius = 0.04;
const stickRadius = 0.015;

const rawAtomCoords = [
  new THREE.Vector3(1.92, -0.137, 0.0),
  new THREE.Vector3(0.546, 0.536, 0.0),
  new THREE.Vector3(-0.546, -0.536, 0.0),
  new THREE.Vector3(-1.92, 0.137, 0.0),
  new THREE.Vector3(2.021, -0.759, 0.89),
  new THREE.Vector3(2.021, -0.759, -0.89),
  new THREE.Vector3(2.699, 0.626, 0.0),
  new THREE.Vector3(0.446, 1.157, 0.89),
  new THREE.Vector3(0.446, 1.157, -0.89),
  new THREE.Vector3(-0.446, -1.157, -0.89),
  new THREE.Vector3(-0.446, -1.157, 0.89),
  new THREE.Vector3(-2.021, 0.759, 0.89),
  new THREE.Vector3(-2.021, 0.759, -0.89),
  new THREE.Vector3(-2.699, -0.626, 0.0),
];

const constraints = [
  { a: 1, b: 2, stick: true },
  { a: 1, b: 5, stick: true },
  { a: 1, b: 6, stick: true },
  { a: 1, b: 7, stick: true },
  { a: 2, b: 1, stick: true },
  { a: 2, b: 3, stick: true },
  { a: 2, b: 8, stick: true },
  { a: 2, b: 9, stick: true },
  { a: 3, b: 2, stick: true },
  { a: 3, b: 4, stick: true },
  { a: 3, b: 10, stick: true },
  { a: 3, b: 11, stick: true },
  { a: 4, b: 3, stick: true },
  { a: 4, b: 12, stick: true },
  { a: 4, b: 13, stick: true },
  { a: 4, b: 14, stick: true },
  { a: 5, b: 1, stick: true },
  { a: 6, b: 1, stick: true },
  { a: 7, b: 1, stick: true },
  { a: 8, b: 2, stick: true },
  { a: 9, b: 2, stick: true },
  { a: 10, b: 3, stick: true },
  { a: 11, b: 3, stick: true },
  { a: 12, b: 4, stick: true },
  { a: 13, b: 4, stick: true },
  { a: 14, b: 4, stick: true },
  { a: 5, b: 6, stick: false },
  { a: 6, b: 7, stick: false },
  { a: 5, b: 7, stick: false },
  { a: 2, b: 5, stick: false },
  { a: 2, b: 6, stick: false },
  { a: 2, b: 7, stick: false },
  { a: 2, b: 4, stick: false },
  { a: 2, b: 10, stick: false },
  { a: 2, b: 11, stick: false },
  { a: 12, b: 13, stick: false },
  { a: 13, b: 14, stick: false },
  { a: 12, b: 14, stick: false },
  { a: 3, b: 12, stick: false },
  { a: 3, b: 13, stick: false },
  { a: 3, b: 14, stick: false },
  { a: 3, b: 9, stick: false },
  { a: 3, b: 8, stick: false },
  { a: 3, b: 1, stick: false },
  { a: 1, b: 8, stick: false },
  { a: 1, b: 9, stick: false },
  { a: 4, b: 10, stick: false },
  { a: 4, b: 11, stick: false },
];

const atomCoords = rawAtomCoords.map(function (atomCoord, index) {
  const atom = atomCoord;
  atom.multiplyScalar(scale);
  atom.add(translation);
  return atom;
});

init();
animate();

function init() {
  container = document.createElement("div");
  document.body.appendChild(container);

  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x444444);

  world = new CANNON.World();
  world.gravity.set(0, 0, 0);

  camera = new THREE.PerspectiveCamera(
    50,
    window.innerWidth / window.innerHeight,
    0.1,
    10
  );
  camera.position.set(0, 1.6, 3);

  controls = new OrbitControls(camera, container);
  controls.target.set(0, 1.6, 0);
  controls.update();

  scene.add(new THREE.HemisphereLight(0x808080, 0x606060));

  const light = new THREE.DirectionalLight(0xffffff);
  light.position.set(0, 6, 0);
  light.castShadow = true;
  light.shadow.camera.top = 2;
  light.shadow.camera.bottom = -2;
  light.shadow.camera.right = 2;
  light.shadow.camera.left = -2;
  light.shadow.mapSize.set(4096, 4096);
  scene.add(light);

  addPlane();
  // addCylinder();
  addMolecule();

  //

  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.outputEncoding = THREE.sRGBEncoding;
  renderer.shadowMap.enabled = true;
  renderer.xr.enabled = true;

  container.appendChild(renderer.domElement);

  document.body.appendChild(VRButton.createButton(renderer));

  // controllers

  controller1 = renderer.xr.getController(0);
  scene.add(controller1);

  controller2 = renderer.xr.getController(1);
  scene.add(controller2);

  const controllerModelFactory = new XRControllerModelFactory();
  const handModelFactory = new XRHandModelFactory().setPath("./models/");

  // Hand 1
  controllerGrip1 = renderer.xr.getControllerGrip(0);
  controllerGrip1.add(
    controllerModelFactory.createControllerModel(controllerGrip1)
  );
  scene.add(controllerGrip1);

  hand1 = renderer.xr.getHand(0);
  hand1.add(handModelFactory.createHandModel(hand1));

  scene.add(hand1);

  // Hand 2
  controllerGrip2 = renderer.xr.getControllerGrip(1);
  controllerGrip2.add(
    controllerModelFactory.createControllerModel(controllerGrip2)
  );
  scene.add(controllerGrip2);

  hand2 = renderer.xr.getHand(1);
  hand2.add(handModelFactory.createHandModel(hand2));
  scene.add(hand2);

  window.addEventListener("resize", onWindowResize);
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();

  renderer.setSize(window.innerWidth, window.innerHeight);
}
//

function animate() {
  renderer.setAnimationLoop(render);
}

function render() {
  if (!handsAdded && hand1.children.length > 1) {
    addHandPhysics();
    handsAdded = true;
    // const geometry = new THREE.BoxGeometry();
    // const material = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
    // const cube = new THREE.Mesh(geometry, material);
    // cube.position.z = 5;
    // scene.add(cube);
  }

  renderer.render(scene, camera);
  world.step(timestep);
  updateMeshPositions();
}

function addCylinder() {
  // Physics
  const shape = new CANNON.Cylinder(0.25, 0.25, 1, 10);
  const body = new CANNON.Body({
    mass: 20,
  });

  const quat = new CANNON.Quaternion(0.5, 0, 0, 0.5);
  quat.normalize();
  body.addShape(shape, new CANNON.Vec3(), quat);
  body.position.set(0, 10, -0.5);
  world.addBody(body);
  bodies.push(body);

  // Graphics
  const geometry = new THREE.CylinderGeometry(0.25, 0.25, 1, 20);
  const material = new THREE.MeshPhongMaterial({
    color: 0xffffff,
    emissive: 0x072534,
    shading: THREE.FlatShading,
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.castShadow = true;
  mesh.name = "Cylinder";
  scene.add(mesh);
  meshes.push(mesh);
}

function addPlane() {
  // Physics
  const shape = new CANNON.Plane();
  const body = new CANNON.Body({ mass: 0 });
  body.addShape(shape);

  body.quaternion.setFromAxisAngle(new CANNON.Vec3(1, 0, 0), -Math.PI / 2);
  body.position.set(0, 0, 0);
  world.addBody(body);
  bodies.push(body);

  // Graphics
  const material = new THREE.MeshPhongMaterial({
    color: 0x156289,
    emissive: 0x072534,
    shading: THREE.FlatShading,
  });
  const geometry = new THREE.PlaneGeometry(4, 4);
  const mesh = new THREE.Mesh(geometry, material);
  mesh.quaternion.setFromAxisAngle(new THREE.Vector3(1, 0, 0), -Math.PI / 2);
  mesh.receiveShadow = true;
  scene.add(mesh);
  meshes.push(mesh);
}

function updateMeshPositions() {
  for (let i = 0; i !== meshes.length; i++) {
    bodies[i].velocity.x = bodies[i].velocity.x / 1.05;
    bodies[i].velocity.y = bodies[i].velocity.y / 1.05;
    bodies[i].velocity.z = bodies[i].velocity.z / 1.05;
    meshes[i].position.copy(bodies[i].position);
    meshes[i].quaternion.copy(bodies[i].quaternion);
  }

  for (let i = hand1Bodies.length - 1; i >= 0; i--) {
    hand1Bodies[i].position.copy(hand1.children[i].position);
  }

  for (let i = hand2Bodies.length - 1; i >= 0; i--) {
    hand2Bodies[i].position.copy(hand2.children[i].position);
  }

  for (let i = 0; i < cylinders.children.length; i++) {
    const firstAtom = constraints[i].a - 1;
    const secondAtom = constraints[i].b - 1;
    updateStick(
      cylinders.children[i],
      atoms.children[firstAtom],
      atoms.children[secondAtom]
    );
  }
}

function addHandPhysics() {
  // Hand physics
  const hand1Objects = hand1.children;
  const hand2Objects = hand2.children;

  const sphereShape = new CANNON.Sphere(0.01);

  for (let i = 0; i < hand1Objects.length; i++) {
    const body = new CANNON.Body({ mass: 0, shape: sphereShape });
    hand1Bodies.push(body);
    world.addBody(body);
  }

  for (let i = 0; i < hand2Objects.length; i++) {
    const body = new CANNON.Body({ mass: 0, shape: sphereShape });
    hand2Bodies.push(body);
    world.addBody(body);
  }
}

function cylindricalSegment(A, B) {
  const vec = B.clone();
  vec.sub(A);
  const h = vec.length();
  vec.normalize();
  const quaternion = new THREE.Quaternion();
  quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), vec);
  const cylinderGeometry = new THREE.CylinderGeometry(
    stickRadius,
    stickRadius,
    h,
    32
  );
  const cylinderMaterial = new THREE.MeshPhongMaterial({
    color: 0xffffff,
    emissive: 0x072534,
    side: THREE.DoubleSide,
    shading: THREE.FlatShading,
  });
  cylinderGeometry.translate(0, h / 2, 0);
  const cylinder = new THREE.Mesh(cylinderGeometry, cylinderMaterial);
  cylinder.applyQuaternion(quaternion);
  cylinder.position.set(A.x, A.y, A.z);

  return cylinder;
}

function updateStick(cylinder, a1, a2) {
  const A = new THREE.Vector3(a1.position.x, a1.position.y, a1.position.z);

  const B = new THREE.Vector3(a2.position.x, a2.position.y, a2.position.z);

  const vec = B.clone();
  vec.sub(A);
  const h = vec.length();
  vec.normalize();
  const quaternion = new THREE.Quaternion();
  quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), vec);
  cylinder.position.set(0, 0, 0);
  cylinder.rotation.set(0, 0, 0);
  cylinder.translateOnAxis(0, h / 2, 0);
  cylinder.applyQuaternion(quaternion);
  cylinder.position.set(A.x, A.y, A.z);
}

function addMolecule() {
  atoms = new THREE.Object3D();
  cylinders = new THREE.Object3D();
  const carbonMaterial = new THREE.MeshPhongMaterial({
    color: 0x909090,
    shading: THREE.FlatShading,
  });

  const hydrogenMaterial = new THREE.MeshPhongMaterial({
    color: 0xffffff,
    shading: THREE.FlatShading,
  });

  const atomGeometry = new THREE.SphereGeometry(atomRadius, 32, 32);
  const sphereShape = new CANNON.Sphere(atomRadius);
  const physicsMaterial = new CANNON.Material()
  physicsMaterial.friction = 0.3;
  sphereShape.material = physicsMaterial;

  let mass = 1;

  for (let i = 0; i < atomCoords.length; i++) {
    if (i === 2 || i === 1) {
      mass = 0;
    } else {
      mass = 1;
    }
    const atomMaterial = i < 4 ? carbonMaterial : hydrogenMaterial;
    const atom = new THREE.Mesh(atomGeometry, atomMaterial);
    atom.castShadow = true;
    atom.position.set(atomCoords[i].x, atomCoords[i].y, atomCoords[i].z);
    atoms.add(atom);
    meshes.push(atom);

    const sphereBody = new CANNON.Body({
      mass: mass,
      shape: sphereShape,
    });
    sphereBody.position.copy(atom.position);
    bodies.push(sphereBody);
    atomBodies.push(sphereBody);
    world.addBody(sphereBody);
  }

  for (let j = 0; j < constraints.length; j++) {
    const firstAtom = constraints[j].a - 1;
    const secondAtom = constraints[j].b - 1;

    const c = new CANNON.DistanceConstraint(
      atomBodies[firstAtom],
      atomBodies[secondAtom]
    );

    if (constraints[j].stick) {
      const bond = cylindricalSegment(
        atomCoords[firstAtom],
        atomCoords[secondAtom]
      );
      bond.castShadow = true;
      cylinders.add(bond);
    }
    world.addConstraint(c);
  }

  scene.add(atoms);
  scene.add(cylinders);
}
