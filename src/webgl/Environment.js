import * as THREE from 'three';
import { gsap } from 'gsap';

export class SceneEnvironment {
  constructor(engine) {
    this.engine = engine;
    this.group = new THREE.Group();
    
    // Configurable parameters (linked to sliders)
    this.raysIntensity = 0.75;
    this.mistDensity = 0.8;
    
    // Scene assets
    this.columns = [];
    this.godRays = [];
    this.fogParticles = null;
    this.fogCount = 400;
    this.fogData = [];

    this.init();
  }

  init() {
    this.engine.scene.add(this.group);

    // Build the sub-components
    this.buildBackgroundBackdrop();
    this.buildCathedralRuins();
    this.buildVolumetricGodRays();
    this.buildGroundFog();
  }

  buildBackgroundBackdrop() {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');
    
    // 1. Dark background (very dark gothic charcoal/black)
    ctx.fillStyle = '#060609';
    ctx.fillRect(0, 0, 512, 512);
    
    // 2. Main red gradient from the bottom center (representing a hellish/fallen glow)
    const radial1 = ctx.createRadialGradient(256, 512, 10, 256, 512, 450);
    radial1.addColorStop(0, 'rgba(178, 13, 33, 0.45)'); // Crimson red glow
    radial1.addColorStop(0.4, 'rgba(120, 8, 18, 0.2)'); // Deep burgundy
    radial1.addColorStop(0.8, 'rgba(60, 2, 8, 0.05)');  // Very dark red edge
    radial1.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = radial1;
    ctx.fillRect(0, 0, 512, 512);

    // 3. Secondary subtle red ambient glows on the top left and top right to frame the model
    const radial2 = ctx.createRadialGradient(80, 120, 0, 120, 150, 250);
    radial2.addColorStop(0, 'rgba(200, 10, 20, 0.15)'); // Soft bright red glow
    radial2.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = radial2;
    ctx.fillRect(0, 0, 512, 512);

    const radial3 = ctx.createRadialGradient(432, 100, 0, 400, 120, 220);
    radial3.addColorStop(0, 'rgba(139, 0, 0, 0.12)'); // Deep dark red glow
    radial3.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = radial3;
    ctx.fillRect(0, 0, 512, 512);
    
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    
    const bgGeom = new THREE.PlaneGeometry(45, 25);
    const bgMat = new THREE.MeshBasicMaterial({
      map: texture,
      depthWrite: false,
      toneMapped: false,
      fog: false
    });
    
    this.bgMesh = new THREE.Mesh(bgGeom, bgMat);
    this.bgMesh.position.set(0, 4.0, -15);
    
    this.group.add(this.bgMesh);
  }

  buildCathedralRuins() {
    // Columns arrangement: Semi-circle in the background
    const columnCount = 6;
    const radius = 6.5;
    const colHeight = 14;
    
    // Column shape: Octagonal pillar
    const colGeom = new THREE.CylinderGeometry(0.35, 0.45, colHeight, 8);
    const colMat = new THREE.MeshStandardMaterial({
      color: 0x0a0a0f,
      roughness: 0.95,
      metalness: 0.1,
      flatShading: true // Makes columns look blocky, chiseled, and gothic
    });

    for (let i = 0; i < columnCount; i++) {
      const angle = Math.PI * 0.7 + (i / (columnCount - 1)) * Math.PI * 0.6; // Arc behind
      
      const column = new THREE.Mesh(colGeom, colMat);
      
      // Calculate positions on arc
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius - 2.0; // Push back
      
      // Position column base on ground (height/2)
      column.position.set(x, colHeight / 2 - 3.0, z);
      
      // Add gothic flavor: tilt columns slightly to look like cracked ruins
      column.rotation.z = (Math.random() - 0.5) * 0.08;
      column.rotation.x = (Math.random() - 0.5) * 0.08;
      
      // Add random scaling to vary column heights
      const scaleY = 0.8 + Math.random() * 0.4;
      column.scale.set(1, scaleY, 1);
      
      column.castShadow = true;
      column.receiveShadow = true;
      
      this.group.add(column);
      this.columns.push(column);

      // Add a couple of column debris blocks on the ground
      if (Math.random() < 0.5) {
        const chunkGeom = new THREE.CylinderGeometry(0.35, 0.35, 1.2, 8);
        const chunk = new THREE.Mesh(chunkGeom, colMat);
        chunk.position.set(x + (Math.random() - 0.5) * 1.5, -2.5, z + (Math.random() - 0.5) * 1.5);
        chunk.rotation.set(Math.PI / 2 + (Math.random() - 0.5), Math.random(), 0);
        chunk.castShadow = true;
        this.group.add(chunk);
      }
    }

    // Rough cathedral floor plate
    const floorGeom = new THREE.PlaneGeometry(30, 30);
    const floorMat = new THREE.MeshStandardMaterial({
      color: 0x07070a,
      roughness: 0.99,
      metalness: 0.05
    });
    const floor = new THREE.Mesh(floorGeom, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -3.0;
    floor.receiveShadow = true;
    this.group.add(floor);
  }

  buildVolumetricGodRays() {
    // Tall cones of light extending down from back-left
    const rayCount = 4;
    const colors = [0xc5a880, 0xb20d21]; // Gold and Red

    for (let i = 0; i < rayCount; i++) {
      const height = 25;
      const radius = 1.5 + Math.random() * 1.5;
      const geom = new THREE.ConeGeometry(radius, height, 16, 1, true); // Open bottom
      
      // Transparent gradient material simulated by custom basic material blending
      const mat = new THREE.MeshBasicMaterial({
        color: colors[i % 2],
        transparent: true,
        opacity: 0.0, // Initial opacity, set by transition/update
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide,
        depthWrite: false
      });
      
      const ray = new THREE.Mesh(geom, mat);
      
      // Position ray source high up in back-left ruins
      ray.position.set(-4 + i * 2, 8, -6);
      
      // Tilt ray pointing downwards toward the center
      ray.rotation.z = -Math.PI / 8 - (Math.random() * 0.1);
      ray.rotation.x = Math.PI / 12;
      
      this.group.add(ray);
      this.godRays.push({
        mesh: ray,
        baseOpacity: 0.08 + Math.random() * 0.08,
        pulseSpeed: 0.5 + Math.random() * 0.5,
        offset: Math.random() * Math.PI
      });
    }
    
    this.updateRaysIntensity(this.raysIntensity * 100);
  }

  buildGroundFog() {
    const geom = new THREE.BufferGeometry();
    const positions = new Float32Array(this.fogCount * 3);
    const sizes = new Float32Array(this.fogCount);
    
    const areaWidth = 16;
    const areaDepth = 16;

    for (let i = 0; i < this.fogCount; i++) {
      // Scatter particles on a plane near the floor
      const x = (Math.random() - 0.5) * areaWidth;
      const y = -3.0 + Math.random() * 2.5; // low height
      const z = (Math.random() - 0.5) * areaDepth - 1.0; // push slightly back

      positions[i * 3] = x;
      positions[i * 3 + 1] = y;
      positions[i * 3 + 2] = z;

      sizes[i] = 1.0 + Math.random() * 2.0;

      // Keep track of fog drift speeds and ranges
      this.fogData.push({
        origX: x,
        origZ: z,
        speedX: (Math.random() - 0.5) * 0.15,
        speedZ: (Math.random() - 0.5) * 0.15,
        sinOffset: Math.random() * Math.PI * 2,
        breatheSpeed: 0.4 + Math.random() * 0.6
      });
    }

    geom.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    
    // Soft fog particle texture
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');
    const grad = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    grad.addColorStop(0, 'rgba(120, 120, 130, 0.18)');
    grad.addColorStop(0.5, 'rgba(80, 80, 90, 0.06)');
    grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 64, 64);
    
    const texture = new THREE.CanvasTexture(canvas);

    // Fog points material
    const mat = new THREE.PointsMaterial({
      size: 3.5,
      map: texture,
      transparent: true,
      opacity: 0.4,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });

    this.fogParticles = new THREE.Points(geom, mat);
    this.group.add(this.fogParticles);
    
    this.updateMistDensity(this.mistDensity * 100);
  }

  // Adjust sliders
  updateRaysIntensity(intensityVal) {
    this.raysIntensity = intensityVal / 100;
    
    for (const ray of this.godRays) {
      // Scale target opacity based on intensity slider
      const targetOpacity = ray.baseOpacity * this.raysIntensity;
      
      gsap.to(ray.mesh.material, {
        opacity: targetOpacity,
        duration: 0.8
      });
    }
  }

  updateMistDensity(densityVal) {
    this.mistDensity = densityVal / 100;
    
    const targetSize = 2.0 + this.mistDensity * 3.5;
    const targetOpacity = 0.1 + this.mistDensity * 0.45;
    
    gsap.to(this.fogParticles.material, {
      size: targetSize,
      opacity: targetOpacity,
      duration: 0.8
    });
  }

  // Faction transitions
  transitionFaction(faction, duration = 1.5) {
    let colColor;
    
    switch (faction) {
      case 'order':
        colColor = 0x181714; // Brighter golden gray
        break;
      case 'heretics':
        colColor = 0x0e0507; // Dark reddish gray
        break;
      case 'fallen':
      default:
        colColor = 0x0a0a0f; // Eerie navy gray
        break;
    }

    // Light ray colors update
    const rayColors = faction === 'order' 
      ? [0xf3e9dc, 0xc5a880] 
      : (faction === 'heretics' ? [0xb20d21, 0x7a0010] : [0xc5a880, 0x7a0010]);

    for (let i = 0; i < this.godRays.length; i++) {
      const ray = this.godRays[i];
      const targetCol = new THREE.Color(rayColors[i % 2]);
      
      gsap.to(ray.mesh.material.color, {
        r: targetCol.r,
        g: targetCol.g,
        b: targetCol.b,
        duration: duration
      });
    }

    // Fog particles color shift
    let fogColor;
    if (faction === 'order') fogColor = new THREE.Color(0xd6ceb6);
    else if (faction === 'heretics') fogColor = new THREE.Color(0x751c22);
    else fogColor = new THREE.Color(0x404552);

    gsap.to(this.fogParticles.material.color, {
      r: fogColor.r,
      g: fogColor.g,
      b: fogColor.b,
      duration: duration
    });
    
    for (const col of this.columns) {
      gsap.to(col.material.color, {
        r: ((colColor >> 16) & 255) / 255,
        g: ((colColor >> 8) & 255) / 255,
        b: (colColor & 255) / 255,
        duration: duration
      });
    }
  }

  update(time, deltaTime, mouse) {
    // 1. Animate volumetric god rays - subtle opacity pulse (shimmering dust/mist)
    for (const ray of this.godRays) {
      const pulse = Math.sin(time * ray.pulseSpeed + ray.offset) * 0.15 + 0.85;
      ray.mesh.material.opacity = ray.baseOpacity * this.raysIntensity * pulse;
      
      // Slowly rotate rays slightly to simulate moving light sources
      ray.mesh.rotation.y = Math.sin(time * 0.1 + ray.offset) * 0.05;
    }

    // 2. Animate ground fog particles - drift sideways and breathe height
    const positions = this.fogParticles.geometry.getAttribute('position');
    const array = positions.array;
    const count = this.fogCount;
    const mouseWindX = mouse.x * 0.8;
    
    for (let i = 0; i < count; i++) {
      const data = this.fogData[i];
      const idx = i * 3;
      
      // Update coordinates
      let x = array[idx] + data.speedX * deltaTime;
      let z = array[idx + 2] + data.speedZ * deltaTime;
      
      // Soft floating vertical oscillation
      let y = -3.0 + Math.sin(time * data.breatheSpeed + data.sinOffset) * 0.35;
      
      // Mouse wind reaction: blow mist away from cursor slightly
      x += (mouseWindX - data.speedX) * 0.03;
      
      // Wrap particles around borders to loop the mist infinitely
      const boundary = 9;
      if (x > boundary) x = -boundary;
      else if (x < -boundary) x = boundary;
      
      if (z > boundary) z = -boundary;
      else if (z < -boundary) z = boundary;

      array[idx] = x;
      array[idx + 1] = y;
      array[idx + 2] = z;
    }
    positions.needsUpdate = true;
    
    // Slow camera relative rotation of background columns
    this.group.rotation.y = mouse.x * 0.05;
  }
}
