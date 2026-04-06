import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';

let scene, camera, renderer, composer;
let particleSystem, particlePositions, particleColors, particleMetadata;
const particlesCount = 3000;
let clock = new THREE.Clock();

// Heart equation
function getHeartPosition(t, scale = 1) {
  // x = 16 sin^3(t)
  const x = 16 * Math.pow(Math.sin(t), 3);
  // y = 13 cos(t) - 5 cos(2t) - 2 cos(3t) - cos(4t)
  const y = 13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t);
  return new THREE.Vector3(x * scale, y * scale, 0);
}

// Global target state
export const state = {
  active: false,
  mouse: new THREE.Vector2(-9999, -9999), 
  raycaster: new THREE.Raycaster()
};

export function initThreeJS(canvasElement) {
  // Scene Setup
  scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x020202, 0.02);

  // Camera Setup
  camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 1, 1000);
  camera.position.z = 100;

  // Renderer Setup
  renderer = new THREE.WebGLRenderer({ canvas: canvasElement, antialias: false, alpha: false });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setClearColor(0x020202);

  // Post-Processing (Bloom)
  const renderScene = new RenderPass(scene, camera);
  const bloomPass = new UnrealBloomPass(
    new THREE.Vector2(window.innerWidth, window.innerHeight),
    2.5, // strength
    0.5, // radius
    0.1  // threshold
  );
  
  composer = new EffectComposer(renderer);
  composer.addPass(renderScene);
  composer.addPass(bloomPass);

  // Create Particle System
  createParticles();

  // Event Listeners
  window.addEventListener('resize', onWindowResize, false);
  window.addEventListener('mousemove', onMouseMove, false);
  window.addEventListener('touchmove', onTouchMove, { passive: true });

  // Start Loop
  animate();
}

function createParticles() {
  const geometry = new THREE.BufferGeometry();
  particlePositions = new Float32Array(particlesCount * 3);
  particleColors = new Float32Array(particlesCount * 3);
  particleMetadata = []; // Keep track of base t, speed, random offset

  const colorPrimary = new THREE.Color(0xff2a6d);
  const colorSecondary = new THREE.Color(0xd91c5c);
  const colorTertiary = new THREE.Color(0xff7ca3);

  for (let i = 0; i < particlesCount; i++) {
    // Distribute particles mainly along the edge, with some scattered inside
    const t = Math.random() * Math.PI * 2;
    
    // Slight random spread
    const spread = (Math.random() - 0.5) * 2.0;
    
    // Scale randomness for depth and volume
    const scale = 1.5 + (Math.random() * 0.1); 
    
    const pos = getHeartPosition(t, scale);
    
    // Initial hidden state - randomly dispersed far away
    const randomRadius = 200 + Math.random() * 200;
    const randomAngle1 = Math.random() * Math.PI * 2;
    const randomAngle2 = Math.random() * Math.PI * 2;
    
    particlePositions[i * 3] = randomRadius * Math.sin(randomAngle1) * Math.cos(randomAngle2);
    particlePositions[i * 3 + 1] = randomRadius * Math.sin(randomAngle1) * Math.sin(randomAngle2);
    particlePositions[i * 3 + 2] = randomRadius * Math.cos(randomAngle1);

    // Randomize colors
    let mixedColor = colorPrimary.clone();
    const randCol = Math.random();
    if(randCol > 0.7) mixedColor = colorSecondary.clone();
    else if(randCol < 0.2) mixedColor = colorTertiary.clone();
    
    particleColors[i * 3] = mixedColor.r;
    particleColors[i * 3 + 1] = mixedColor.g;
    particleColors[i * 3 + 2] = mixedColor.b;

    // Metadata for animation
    particleMetadata.push({
      t: t,
      baseScale: scale,
      targetPos: pos, // Base heart forming position
      currentPos: new THREE.Vector3(particlePositions[i*3], particlePositions[i*3+1], particlePositions[i*3+2]),
      speed: 1.5 + Math.random() * 2.5,
      angleOffset: Math.random() * Math.PI * 2,
      depthOffset: (Math.random() - 0.5) * 10
    });
  }

  geometry.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));
  geometry.setAttribute('color', new THREE.BufferAttribute(particleColors, 3));

  // Particle texture (soft circle)
  const txCanvas = document.createElement('canvas');
  txCanvas.width = 32; txCanvas.height = 32;
  const ctx = txCanvas.getContext('2d');
  const gradient = ctx.createRadialGradient(16, 16, 0, 16, 16, 16);
  gradient.addColorStop(0, 'rgba(255,255,255,1)');
  gradient.addColorStop(0.2, 'rgba(255,255,255,0.8)');
  gradient.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 32, 32);
  const texture = new THREE.CanvasTexture(txCanvas);

  const material = new THREE.PointsMaterial({
    size: 2.0,
    vertexColors: true,
    map: texture,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    transparent: true,
    opacity: 0.8
  });

  particleSystem = new THREE.Points(geometry, material);
  scene.add(particleSystem);
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  composer.setSize(window.innerWidth, window.innerHeight);
}

function onMouseMove(event) {
  state.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
  state.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
}

function onTouchMove(event) {
  if(event.touches.length > 0) {
    state.mouse.x = (event.touches[0].clientX / window.innerWidth) * 2 - 1;
    state.mouse.y = -(event.touches[0].clientY / window.innerHeight) * 2 + 1;
  }
}

export function startHeartAnimation() {
  state.active = true;
}

function animate() {
  requestAnimationFrame(animate);

  const time = clock.getElapsedTime();
  const dt = clock.getDelta(); // keep realistic movement frame independent

  if (particleSystem) {
    const positions = particleSystem.geometry.attributes.position.array;
    
    // Heartbeat pulse calculation
    // A heartbeat consists of a fast lub-dub.
    const beat = (Math.sin(time * 5) * 0.1 + Math.sin(time * 5 + 1.5) * 0.05);
    const pulseScale = state.active ? 1.0 + Math.max(0, beat) : 1.0;

    // Raycast for mouse repulsion
    state.raycaster.setFromCamera(state.mouse, camera);
    // Find intersection plane at z=0
    let mouseWorldPos = new THREE.Vector3();
    state.raycaster.ray.intersectPlane(new THREE.Plane(new THREE.Vector3(0,0,1), 0), mouseWorldPos);

    for (let i = 0; i < particlesCount; i++) {
      const meta = particleMetadata[i];
      let tTargetPos = new THREE.Vector3();

      if (state.active) {
        // Flowing effect along the heart curve
        meta.t -= 0.005; // constant circulation
        
        // Base coordinate from curve
        let currentScale = meta.baseScale * pulseScale;
        tTargetPos.copy(getHeartPosition(meta.t, currentScale));
        
        // Add subtle noise/swirl
        tTargetPos.x += Math.sin(time * 2 + meta.angleOffset) * 0.5;
        tTargetPos.y += Math.cos(time * 2.5 + meta.angleOffset) * 0.5;
        tTargetPos.z = meta.depthOffset + Math.sin(time * 3 + meta.angleOffset) * 2.0;

        // Mouse repulsion
        if (mouseWorldPos) {
          const distToMouse = tTargetPos.distanceTo(mouseWorldPos);
          if (distToMouse < 15) {
            const repelDir = new THREE.Vector3().subVectors(tTargetPos, mouseWorldPos).normalize();
            const strength = (15 - distToMouse) * 0.5;
            tTargetPos.add(repelDir.multiplyScalar(strength));
          }
        }
      } else {
        // Just wander randomly if not active
        tTargetPos.copy(meta.currentPos);
        tTargetPos.x += Math.sin(time * meta.speed + meta.angleOffset) * 0.2;
        tTargetPos.y += Math.cos(time * meta.speed * 0.8 + meta.angleOffset) * 0.2;
      }

      // Lerp current position to target position
      meta.currentPos.lerp(tTargetPos, 0.05);

      positions[i * 3] = meta.currentPos.x;
      positions[i * 3 + 1] = meta.currentPos.y;
      positions[i * 3 + 2] = meta.currentPos.z;
    }
    
    particleSystem.geometry.attributes.position.needsUpdate = true;
    
    // Slowly rotate the whole system for extra 3d feel
    if(state.active) {
       particleSystem.rotation.y = Math.sin(time * 0.5) * 0.2;
       particleSystem.rotation.x = Math.sin(time * 0.3) * 0.1;
    } else {
       particleSystem.rotation.y += 0.005;
    }
  }

  composer.render();
}
