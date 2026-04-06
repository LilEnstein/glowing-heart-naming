import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

let scene, camera, renderer, composer, controls;
// Heart particles
let particleSystem, particlePositions, particleColors, particleMetadata;
// Text particles
let textParticleSystem, textParticleMetadata;

const particlesCount = 4000;
let clock = new THREE.Clock();

// Spatial Heart equation
function getHeartPosition(t, scale = 1, zDepth = 1) {
  const x = 16 * Math.pow(Math.sin(t), 3);
  const y = 13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t);
  const z = zDepth * Math.sin(t * 3) * 5.0; 
  return new THREE.Vector3(x * scale, y * scale, z);
}

// Global target state
export const state = {
  active: false,
  userName: '',
  introTime: 0,
  mouse: new THREE.Vector2(-9999, -9999), 
  raycaster: new THREE.Raycaster()
};

export function initThreeJS(canvasElement) {
  // Scene Setup
  scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x0D0D12, 0.015);

  // Camera Setup
  camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 1, 1000);
  camera.position.z = 120;
  camera.position.y = 10; 

  // Renderer Setup
  renderer = new THREE.WebGLRenderer({ canvas: canvasElement, antialias: true, alpha: false });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setClearColor(0x0D0D12);

  // OrbitControls
  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.05;
  controls.enablePan = false;
  controls.minDistance = 50;
  controls.maxDistance = 200;

  // Lighting (For glowing effects)
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
  scene.add(ambientLight);

  const pointLight1 = new THREE.PointLight(0xff66b2, 2, 100);
  pointLight1.position.set(20, 20, 20);
  scene.add(pointLight1);
  
  const pointLight2 = new THREE.PointLight(0x00d2ff, 1.5, 100);
  pointLight2.position.set(-20, -10, -20);
  scene.add(pointLight2);

  // Post-Processing (Bloom) - Strength increased for vibrant colors
  const renderScene = new RenderPass(scene, camera);
  const bloomPass = new UnrealBloomPass(
    new THREE.Vector2(window.innerWidth, window.innerHeight),
    2.2, // strength (vibrant glowing)
    0.8, // radius
    0.15  // threshold
  );
  
  composer = new EffectComposer(renderer);
  composer.addPass(renderScene);
  composer.addPass(bloomPass);

  // Create Heart Particles
  createParticles();

  // Event Listeners
  window.addEventListener('resize', onWindowResize, false);
  window.addEventListener('mousemove', onMouseMove, false);
  window.addEventListener('touchmove', onTouchMove, { passive: true });

  // Start Loop
  animate();
}

function createTextParticles(name) {
  if (textParticleSystem) {
    scene.remove(textParticleSystem);
    textParticleSystem.geometry.dispose();
    textParticleSystem.material.dispose();
  }

  // 1. Create Canvas to render text 2D
  const canvas = document.createElement('canvas');
  const size = 512;
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  
  // 2. Format and draw text
  ctx.clearRect(0, 0, size, size);
  ctx.fillStyle = "white";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  // Responsive font size based on string length
  let fontSize = 80;
  if(name.length > 8) fontSize = 60;
  if(name.length > 12) fontSize = 45;
  
  ctx.font = `bold ${fontSize}px 'Inter', sans-serif`;
  ctx.fillText(name, size / 2, size / 2);
  
  // 3. Extract Pixel Alphas
  const imgData = ctx.getImageData(0, 0, size, size).data;
  const textCoords = [];
  
  const density = 2; // sample every N pixels (lower = more particles)
  for (let y = 0; y < size; y += density) {
    for (let x = 0; x < size; x += density) {
      const idx = (y * size + x) * 4;
      const alpha = imgData[idx + 3];
      if (alpha > 128) {
        // Map 512x512 canvas coordinates to 3D center space
        const posX = (x - size / 2) * 0.15;
        const posY = -(y - size / 2) * 0.15; 
        textCoords.push(new THREE.Vector3(posX, posY, 0));
      }
    }
  }
  
  const count = textCoords.length;
  if (count === 0) return;
  
  // 4. Construct Geometry
  const geometry = new THREE.BufferGeometry();
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  textParticleMetadata = [];
  
  const baseColor = new THREE.Color(0xffffff);

  for (let i = 0; i < count; i++) {
    const target = textCoords[i];
    
    // Spawn points randomly across scene
    const startX = (Math.random() - 0.5) * 600;
    const startY = (Math.random() - 0.5) * 600;
    const startZ = (Math.random() - 0.5) * 600;
    
    positions[i*3] = startX;
    positions[i*3 + 1] = startY;
    positions[i*3 + 2] = startZ;
    
    // Make text purely bright white with slight variations for glow depth
    colors[i*3] = baseColor.r;
    colors[i*3+1] = baseColor.g;
    colors[i*3+2] = baseColor.b;
    
    textParticleMetadata.push({
      targetX: target.x,
      targetY: target.y,
      targetZ: target.z,
      speed: 0.03 + Math.random() * 0.04,
      delay: Math.random() * 1.5,     // delay assembly for cinematic effect
      noiseOffset: Math.random() * Math.PI * 2
    });
  }
  
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  
  // 5. Build Material
  const txCanvas = document.createElement('canvas');
  txCanvas.width = 32; txCanvas.height = 32;
  const ctxTx = txCanvas.getContext('2d');
  const gradient = ctxTx.createRadialGradient(16, 16, 0, 16, 16, 16);
  gradient.addColorStop(0, 'rgba(255,255,255,1)');
  gradient.addColorStop(0.3, 'rgba(255,180,255,0.8)'); // hint of pink aura
  gradient.addColorStop(1, 'rgba(0,0,0,0)');
  ctxTx.fillStyle = gradient;
  ctxTx.fillRect(0, 0, 32, 32);
  const texture = new THREE.CanvasTexture(txCanvas);

  const material = new THREE.PointsMaterial({
    size: 1.5,
    vertexColors: true,
    map: texture,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    transparent: true,
    opacity: 1.0
  });

  textParticleSystem = new THREE.Points(geometry, material);
  scene.add(textParticleSystem);
  
  state.introTime = 0;
}

function createParticles() {
  const geometry = new THREE.BufferGeometry();
  particlePositions = new Float32Array(particlesCount * 3);
  particleColors = new Float32Array(particlesCount * 3);
  particleMetadata = []; // Keep track of base t, speed, random offset

  const colorPink = new THREE.Color(0xff66b2);
  const colorPurple = new THREE.Color(0xa200ff);
  const colorBlue = new THREE.Color(0x00d2ff);

  for (let i = 0; i < particlesCount; i++) {
    const t = Math.random() * Math.PI * 2;
    
    const isCore = Math.random() > 0.4;
    const baseScale = isCore ? 1.5 + (Math.random() * 0.1) : 1.2 + (Math.random() * 0.5);
    const zDepthMultiplier = isCore ? 1.0 : 3.0 + Math.random() * 3.0; // wider scatter
    
    // Hidden initialization radially
    const randomRadius = 300 + Math.random() * 200;
    const randomAngle1 = Math.random() * Math.PI * 2;
    const randomAngle2 = Math.random() * Math.PI * 2;
    
    particlePositions[i * 3] = randomRadius * Math.sin(randomAngle1) * Math.cos(randomAngle2);
    particlePositions[i * 3 + 1] = randomRadius * Math.sin(randomAngle1) * Math.sin(randomAngle2);
    particlePositions[i * 3 + 2] = randomRadius * Math.cos(randomAngle1);

    // Color logic
    let mixedColor = colorPink.clone();
    if (!isCore) {
      if(Math.random() > 0.5) mixedColor = colorPurple.clone();
      else mixedColor = colorBlue.clone();
    }
    
    particleColors[i * 3] = mixedColor.r;
    particleColors[i * 3 + 1] = mixedColor.g;
    particleColors[i * 3 + 2] = mixedColor.b;

    particleMetadata.push({
      t: t,
      baseScale: baseScale,
      zDepthMultiplier: zDepthMultiplier,
      currentPos: new THREE.Vector3(particlePositions[i*3], particlePositions[i*3+1], particlePositions[i*3+2]),
      speed: 1.0 + Math.random() * 2.0,
      angleOffset: Math.random() * Math.PI * 2,
      depthOffset: (Math.random() - 0.5) * 5,
      isCore: isCore
    });
  }

  geometry.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));
  geometry.setAttribute('color', new THREE.BufferAttribute(particleColors, 3));

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
    size: 2.2,
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

export function startHeartAnimation(name) {
  state.active = true;
  state.userName = name;
  createTextParticles(name);
}

function animate() {
  requestAnimationFrame(animate);

  const time = clock.getElapsedTime();
  const dt = clock.getDelta();

  controls.update();

  // Raycaster prep for mouse repulsion
  state.raycaster.setFromCamera(state.mouse, camera);
  let mouseWorldPos = new THREE.Vector3();
  state.raycaster.ray.intersectPlane(new THREE.Plane(new THREE.Vector3(0,0,1), 0), mouseWorldPos);

  // Animate Text Particles
  if (state.active && textParticleSystem) {
    state.introTime += 0.016; 
    const tPositions = textParticleSystem.geometry.attributes.position.array;
    
    for (let i = 0; i < textParticleMetadata.length; i++) {
        const meta = textParticleMetadata[i];
        
        if (state.introTime > meta.delay) {
            let currentX = tPositions[i*3];
            let currentY = tPositions[i*3+1];
            let currentZ = tPositions[i*3+2];
            
            // Re-assembly towards target with slight floating sin wave
            const floatY = Math.sin(time * 2 + meta.noiseOffset) * 0.5;
            const floatZ = Math.cos(time * 1.5 + meta.noiseOffset) * 0.5;
            
            let targetX = meta.targetX;
            let targetY = meta.targetY + floatY;
            let targetZ = meta.targetZ + floatZ;
            
            // Mouse repulsion for text particles
            if (mouseWorldPos) {
              const dx = targetX - mouseWorldPos.x;
              const dy = targetY - mouseWorldPos.y;
              const dist = Math.sqrt(dx*dx + dy*dy);
              if (dist < 15) {
                const strength = (15 - dist) * 0.5;
                targetX += (dx/dist) * strength;
                targetY += (dy/dist) * strength;
              }
            }

            tPositions[i*3] += (targetX - currentX) * meta.speed;
            tPositions[i*3+1] += (targetY - currentY) * meta.speed;
            tPositions[i*3+2] += (targetZ - currentZ) * meta.speed;
        }
    }
    textParticleSystem.geometry.attributes.position.needsUpdate = true;
    
    // Slow cinematic rotation of entire text
    textParticleSystem.rotation.y = Math.sin(time * 0.3) * 0.2;
  }

  // Animate Heart Particles
  if (particleSystem) {
    const positions = particleSystem.geometry.attributes.position.array;
    const beat = (Math.sin(time * 5) * 0.1 + Math.sin(time * 5 + 1.5) * 0.05);
    const pulseScale = state.active ? 1.0 + Math.max(0, beat) : 1.0;

    for (let i = 0; i < particlesCount; i++) {
      const meta = particleMetadata[i];
      let tTargetPos = new THREE.Vector3();

      if (state.active) {
        meta.t -= meta.isCore ? 0.005 : 0.002;
        let currentScale = meta.baseScale * pulseScale;
        tTargetPos.copy(getHeartPosition(meta.t, currentScale, meta.zDepthMultiplier));
        
        tTargetPos.x += Math.sin(time * 2 + meta.angleOffset) * 0.5;
        tTargetPos.y += Math.cos(time * 2.5 + meta.angleOffset) * 0.5;
        tTargetPos.z += meta.depthOffset + Math.sin(time * 3 + meta.angleOffset) * 2.0;

        // Mouse repulsion
        if (mouseWorldPos) {
          const distToMouse = tTargetPos.distanceTo(mouseWorldPos);
          if (distToMouse < 20) {
            const repelDir = new THREE.Vector3().subVectors(tTargetPos, mouseWorldPos).normalize();
            const strength = (20 - distToMouse) * 0.4;
            tTargetPos.add(repelDir.multiplyScalar(strength));
          }
        }
      } else {
        tTargetPos.copy(meta.currentPos);
        tTargetPos.x += Math.sin(time * meta.speed + meta.angleOffset) * 0.2;
        tTargetPos.y += Math.cos(time * meta.speed * 0.8 + meta.angleOffset) * 0.2;
        tTargetPos.z += Math.sin(time * meta.speed * 1.2 + meta.angleOffset) * 0.2;
      }

      meta.currentPos.lerp(tTargetPos, 0.05);

      positions[i * 3] = meta.currentPos.x;
      positions[i * 3 + 1] = meta.currentPos.y;
      positions[i * 3 + 2] = meta.currentPos.z;
    }
    
    particleSystem.geometry.attributes.position.needsUpdate = true;
    
    if (state.active) {
       particleSystem.rotation.y = time * 0.2; 
       particleSystem.rotation.x = Math.sin(time * 0.5) * 0.1;
       particleSystem.rotation.z = Math.sin(time * 0.3) * 0.05;
    } else {
       particleSystem.rotation.y += 0.005;
    }
  }

  composer.render();
}
