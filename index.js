import * as THREE from "./build/three.module.js";
import { OrbitControls } from "./controls/OrbitControls.js";
import { VRButton } from "./webxr/VRButton.js";
import { XRControllerModelFactory } from "./webxr/XRControllerModelFactory.js";
import { XRHandModelFactory } from "./webxr/XRHandModelFactory.js";

let container;
let camera, scene, renderer, world, clock;
let hand1, hand2;
let controller1, controller2;
let controllerGrip1, controllerGrip2;
let cylinders, atoms;
let plot1, plot2;
const circleGeometry = new THREE.CircleGeometry( 0.01, 32 );
const circleMaterial = new THREE.MeshBasicMaterial( { color: 0x000000 } );

let lastTime = 0;
const timeOffset = 0.2;

let line2;
const drawCount = 0;
const maxPoints = 150;

const hand1Bodies = [];
const hand2Bodies = [];
const atomBodies = [];

let handsAdded = false;

const timestep = 1 / 60;

let bodies = [];
let meshes = [];

let energies = [];

let controls;

const textureLoader = new THREE.TextureLoader()
const angleTexture = textureLoader.load("./textures/angles.jpg");
const timeTexture = textureLoader.load("./textures/time.jpg");
// angleTexture.magFilter = THREE.NearestFilter;


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

  clock = new THREE.Clock();

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
  addMolecule();

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

  // Plots
  const planeGeometry = new THREE.PlaneGeometry(1, 1);
  const planeMaterial1 = new THREE.MeshBasicMaterial({ map: angleTexture });
  const planeMaterial2 = new THREE.MeshBasicMaterial({ map: timeTexture });
  const lineMaterial = new THREE.LineBasicMaterial({ color: 0x0000ff });

  plot1 = new THREE.Group();
  plot2 = new THREE.Group();

  const plane1 = new THREE.Mesh(planeGeometry, planeMaterial1);

  plot1.add(plane1);
  plot1.position.set(-0.5, 1.5, -1.5);

  const plane2 = new THREE.Mesh(planeGeometry, planeMaterial2);
  const bufferGeometry = new THREE.BufferGeometry();

  const positions = new Float32Array(maxPoints * 3);
  bufferGeometry.setAttribute(
    "position",
    new THREE.BufferAttribute(positions, 3)
  );
  bufferGeometry.setDrawRange(0, drawCount);

  line2 = new THREE.Line(bufferGeometry, lineMaterial);

  plot2.position.set(0.7, 1.5, -1.5);
  plot2.add(plane2, line2);

  scene.add(plot1, plot2);

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
  const elapsedTime = clock.getElapsedTime();
  const delta = elapsedTime - lastTime;

  if (delta >= timeOffset) {
    updateEnergy();
    updatePlots();
    lastTime = elapsedTime;
  }

  if (!handsAdded && hand1.children.length > 1) {
    addHandPhysics();
    handsAdded = true;
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
  const physicsMaterial = new CANNON.Material();
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

function updateEnergy() {
  const coordinates = [
    [
      Math.round((bodies[1].position.x / scale) * 1000) / 1000,
      Math.round(((bodies[1].position.y - translation.y) / scale) * 1000) /
        1000,
      Math.round(((bodies[1].position.z - translation.z) / scale) * 1000) /
        1000,
    ],
    [
      Math.round((bodies[2].position.x / scale) * 1000) / 1000,
      Math.round(((bodies[2].position.y - translation.y) / scale) * 1000) /
        1000,
      Math.round(((bodies[2].position.z - translation.z) / scale) * 1000) /
        1000,
    ],
    [
      Math.round((bodies[3].position.x / scale) * 1000) / 1000,
      Math.round(((bodies[3].position.y - translation.y) / scale) * 1000) /
        1000,
      Math.round(((bodies[3].position.z - translation.z) / scale) * 1000) /
        1000,
    ],
    [
      Math.round((bodies[4].position.x / scale) * 1000) / 1000,
      Math.round(((bodies[4].position.y - translation.y) / scale) * 1000) /
        1000,
      Math.round(((bodies[4].position.z - translation.z) / scale) * 1000) /
        1000,
    ],

    [
      Math.round((bodies[5].position.x / scale) * 1000) / 1000,
      Math.round(((bodies[5].position.y - translation.y) / scale) * 1000) /
        1000,
      Math.round(((bodies[5].position.z - translation.z) / scale) * 1000) /
        1000,
    ],
    [
      Math.round((bodies[6].position.x / scale) * 1000) / 1000,
      Math.round(((bodies[6].position.y - translation.y) / scale) * 1000) /
        1000,
      Math.round(((bodies[6].position.z - translation.z) / scale) * 1000) /
        1000,
    ],
    [
      Math.round((bodies[7].position.x / scale) * 1000) / 1000,
      Math.round(((bodies[7].position.y - translation.y) / scale) * 1000) /
        1000,
      Math.round(((bodies[7].position.z - translation.z) / scale) * 1000) /
        1000,
    ],
    [
      Math.round((bodies[8].position.x / scale) * 1000) / 1000,
      Math.round(((bodies[8].position.y - translation.y) / scale) * 1000) /
        1000,
      Math.round(((bodies[8].position.z - translation.z) / scale) * 1000) /
        1000,
    ],
    [
      Math.round((bodies[9].position.x / scale) * 1000) / 1000,
      Math.round(((bodies[9].position.y - translation.y) / scale) * 1000) /
        1000,
      Math.round(((bodies[9].position.z - translation.z) / scale) * 1000) /
        1000,
    ],
    [
      Math.round((bodies[10].position.x / scale) * 1000) / 1000,
      Math.round(((bodies[10].position.y - translation.y) / scale) * 1000) /
        1000,
      Math.round(((bodies[10].position.z - translation.z) / scale) * 1000) /
        1000,
    ],
    [
      Math.round((bodies[11].position.x / scale) * 1000) / 1000,
      Math.round(((bodies[11].position.y - translation.y) / scale) * 1000) /
        1000,
      Math.round(((bodies[11].position.z - translation.z) / scale) * 1000) /
        1000,
    ],
    [
      Math.round((bodies[12].position.x / scale) * 1000) / 1000,
      Math.round(((bodies[12].position.y - translation.y) / scale) * 1000) /
        1000,
      Math.round(((bodies[12].position.z - translation.z) / scale) * 1000) /
        1000,
    ],
    [
      Math.round((bodies[13].position.x / scale) * 1000) / 1000,
      Math.round(((bodies[13].position.y - translation.y) / scale) * 1000) /
        1000,
      Math.round(((bodies[13].position.z - translation.z) / scale) * 1000) /
        1000,
    ],
    [
      Math.round((bodies[14].position.x / scale) * 1000) / 1000,
      Math.round(((bodies[14].position.y - translation.y) / scale) * 1000) /
        1000,
      Math.round(((bodies[14].position.z - translation.z) / scale) * 1000) /
        1000,
    ],
  ];

  const species = [6, 6, 6, 6, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1];

  var data1 = {
    coordinates: [coordinates],
    species: [species],
  };

  fetch(" https://molecularweb.epfl.ch/backend2", {
    method: "POST", // or 'PUT'
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data1),
  })
    .then((response) => response.json())
    .then((ani) => {
      const energy = ani.energy * 627.509 + 99403;
      if(energies.length >= maxPoints) {
        energies.shift();
      }
      energies.push(energy);

      const b1x = bodies[2].position.x / scale - bodies[1].position.x / scale;
      const b1y =
        (bodies[2].position.y - translation.y) / scale -
        (bodies[1].position.y - translation.y) / scale;
      const b1z =
        (bodies[2].position.z - translation.z) / scale -
        (bodies[1].position.z - translation.z) / scale;
      const b2x = bodies[3].position.x / scale - bodies[2].position.x / scale;
      const b2y =
        (bodies[3].position.y - translation.y) / scale -
        (bodies[2].position.y - translation.y) / scale;
      const b2z =
        (bodies[3].position.z - translation.z) / scale -
        (bodies[2].position.z - translation.z) / scale;
      const b3x = bodies[4].position.x / scale - bodies[3].position.x / scale;
      const b3y =
        (bodies[4].position.y - translation.y) / scale -
        (bodies[3].position.y - translation.y) / scale;
      const b3z =
        (bodies[4].position.z - translation.z) / scale -
        (bodies[3].position.z - translation.z) / scale;

      const b1xb2 = CrossProduct(b1x, b1y, b1z, b2x, b2y, b2z);
      const moduleb1xb2 = Math.sqrt(
        b1xb2[0] * b1xb2[0] + b1xb2[1] * b1xb2[1] + b1xb2[2] * b1xb2[2]
      );
      const n1 = [
        b1xb2[0] / moduleb1xb2,
        b1xb2[1] / moduleb1xb2,
        b1xb2[2] / moduleb1xb2,
      ];
      const b2xb3 = CrossProduct(b2x, b2y, b2z, b3x, b3y, b3z);
      const moduleb2xb3 = Math.sqrt(
        b2xb3[0] * b2xb3[0] + b2xb3[1] * b2xb3[1] + b2xb3[2] * b2xb3[2]
      );
      const n2 = [
        b2xb3[0] / moduleb2xb3,
        b2xb3[1] / moduleb2xb3,
        b2xb3[2] / moduleb2xb3,
      ];
      const moduleb2 = Math.sqrt(b2x * b2x + b2y * b2y + b2z * b2z);
      const m1 = CrossProduct(
        n1[0],
        n1[1],
        n1[2],
        b2x / moduleb2,
        b2y / moduleb2,
        b2z / moduleb2
      );
      const xxx = DotProduct(n1[0], n1[1], n1[2], n2[0], n2[1], n2[2]);
      const yyy = DotProduct(m1[0], m1[1], m1[2], n2[0], n2[1], n2[2]);
      const angle = (Math.atan2(yyy, xxx) * 180) / 3.141592654;
      const circle = new THREE.Mesh(circleGeometry, circleMaterial);
      plot1.add(circle);
      const x = (angle + 180)/360 * 0.8 - 0.4;
      const y = energy / 25 * 0.8 - 0.4;
      circle.position.set(x, y, 0.002);
    });
}

function DotProduct(Ax, Ay, Az, Bx, By, Bz) {
  return Ax * Bx + Ay * By + Az * Bz;
}

function CrossProduct(Ax, Ay, Az, Bx, By, Bz) {
  return [Ay * Bz - Az * By, Az * Bx - Ax * Bz, Ax * By - Ay * Bx];
}

function updatePlots() {
  const positions = line2.geometry.attributes.position.array;

  // let x, y, z, index;
  // x = y = z = index = 0;

  // for (let i = 0, l = maxPoints; i < l; i++) {
  //   positions[index++] = x;
  //   positions[index++] = y;
  //   positions[index++] = z;

  //   x = (Math.random() - 0.4) * 0.8;
  //   y = (Math.random() - 0.4) * 0.8;
  // }

  let index = 0;

  for (let i = 0; i < energies.length; i++) {
    positions[index++] = i / 150 * 0.8 - 0.4;
    positions[index++] = energies[i] / 25 * 0.8 - 0.4;
    positions[index++] = 0.002;
  }

  if(energies.length <= 150) {
    line2.geometry.setDrawRange( 0, energies.length );
  }

  line2.geometry.attributes.position.needsUpdate = true;
  line2.geometry.computeBoundingBox();
  line2.geometry.computeBoundingSphere();
  
}
