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

const hand1Bodies = [];
const hand2Bodies = [];

let handsAdded = false;

const timestep = 1 / 60;
let bodies = [];
let meshes = [];

let controls;

init();
animate();

function init() {
  container = document.createElement("div");
  document.body.appendChild(container);

  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x444444);

  world = new CANNON.World();
  world.gravity.set(0, -9.8, 0);

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

  // const floorGeometry = new THREE.PlaneBufferGeometry(4, 4);
  // const floorMaterial = new THREE.MeshStandardMaterial({ color: 0x222222 });
  // const floor = new THREE.Mesh(floorGeometry, floorMaterial);
  // floor.rotation.x = -Math.PI / 2;
  // floor.receiveShadow = true;
  // scene.add(floor);

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
  addCylinder();

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

  //

  const geometry = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(0, 0, -1),
  ]);

  const line = new THREE.Line(geometry);
  line.name = "line";
  line.scale.z = 5;

  controller1.add(line.clone());
  controller2.add(line.clone());

  //

  window.addEventListener("resize", onWindowResize, false);
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
  var shape = new CANNON.Cylinder(0.25, 0.25, 1, 10);
  var body = new CANNON.Body({
    mass: 20,
  });

  var quat = new CANNON.Quaternion(0.5, 0, 0, 0.5);
  quat.normalize();
  body.addShape(shape, new CANNON.Vec3(), quat);
  body.position.set(0, 10, -0.5);
  world.addBody(body);
  bodies.push(body);

  // Graphics
  var geometry = new THREE.CylinderGeometry(0.25, 0.25, 1, 20);
  var material = new THREE.MeshPhongMaterial({
    color: 0xffffff,
    emissive: 0x072534,
    shading: THREE.FlatShading,
  });
  var mesh = new THREE.Mesh(geometry, material);
  mesh.castShadow = true;
  mesh.name = "Cylinder";
  scene.add(mesh);
  meshes.push(mesh);
}

function addPlane() {
  // Physics
  var shape = new CANNON.Plane();
  var body = new CANNON.Body({ mass: 0 });
  body.addShape(shape);

  body.quaternion.setFromAxisAngle(new CANNON.Vec3(1, 0, 0), -Math.PI / 2);
  body.position.set(0, 0, 0);
  world.addBody(body);
  bodies.push(body);

  // Graphics
  var material = new THREE.MeshPhongMaterial({
    color: 0x156289,
    emissive: 0x072534,
    shading: THREE.FlatShading,
  });
  var geometry = new THREE.PlaneGeometry(4, 4);
  var mesh = new THREE.Mesh(geometry, material);
  mesh.quaternion.setFromAxisAngle(new THREE.Vector3(1, 0, 0), -Math.PI / 2);
  mesh.receiveShadow = true;
  scene.add(mesh);
  meshes.push(mesh);
}

function updateMeshPositions() {
  for (var i = 0; i !== meshes.length; i++) {
    // bodies[i].velocity.x = bodies[i].velocity.x / 1.05;
    // bodies[i].velocity.y = bodies[i].velocity.y / 1.05;
    // bodies[i].velocity.z = bodies[i].velocity.z / 1.05;
    meshes[i].position.copy(bodies[i].position);
    meshes[i].quaternion.copy(bodies[i].quaternion);
  }

  for (var i = hand1Bodies.length - 1; i >= 0; i--) {
    hand1Bodies[i].position.copy(hand1.children[i].position);
  }

  for (var i = hand2Bodies.length - 1; i >= 0; i--) {
    hand2Bodies[i].position.copy(hand2.children[i].position);
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
