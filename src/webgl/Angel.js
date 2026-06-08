import * as THREE from 'three';
import { gsap } from 'gsap';

export class CorruptedAngel {
  constructor(engine) {
    this.engine = engine;
    this.group = new THREE.Group();
    
    // Core parameters (linked to sliders)
    this.corruptionLevel = 0.66; // 0 to 1
    this.instability = 0.45; // 0 to 1.5
    this.wingFlapSpeed = 1.8;
    this.wingFlapAmp = 0.25;

    // Faction styling states
    this.currentFaction = 'fallen'; // order, heretics, fallen
    
    // WebGL meshes
    this.coreMesh = null;
    this.wireMesh = null;
    this.haloMesh = null;
    this.haloSpikes = [];
    this.energyRings = [];
    
    // Particle Wings
    this.wingParticles = null;
    this.wingGeometry = null;
    this.wingMaterial = null;
    this.particleCount = 5000;
    this.particlesData = []; // To animate custom ash drift
    
    this.init();
  }

  init() {
    // Positioning the angel in the scene
    this.group.position.set(0, 0.7, 0);
    this.engine.scene.add(this.group);

    // Build the sub-components
    this.buildCore();
    this.buildHalo();
    this.buildEnergyRings();
    this.buildParticleWings();
  }

  buildCore() {
    // Inside glowing core
    const coreGeom = new THREE.SphereGeometry(0.3, 32, 32);
    const coreMat = new THREE.MeshBasicMaterial({
      color: 0xb20d21, // Crimson
      transparent: true,
      opacity: 0.8
    });
    this.coreMesh = new THREE.Mesh(coreGeom, coreMat);
    this.group.add(this.coreMesh);

    // Outer dark thorny wireframe shell
    const outerGeom = new THREE.IcosahedronGeometry(0.55, 2);
    const outerMat = new THREE.MeshStandardMaterial({
      color: 0x111115,
      roughness: 0.9,
      metalness: 0.8,
      wireframe: true
    });
    this.wireMesh = new THREE.Mesh(outerGeom, outerMat);
    this.wireMesh.castShadow = true;
    this.wireMesh.receiveShadow = true;
    this.group.add(this.wireMesh);
  }

  buildHalo() {
    // Main Torus Ring (Floating tilted crown)
    const haloGeom = new THREE.TorusGeometry(0.75, 0.04, 8, 48);
    
    // Custom glowing material using simple shader values or MeshStandardMaterial with high emissive
    const haloMat = new THREE.MeshStandardMaterial({
      color: 0x0c0a08,
      emissive: 0xc5a880, // Gold glow
      emissiveIntensity: 3.5,
      roughness: 0.2,
      metalness: 0.9
    });
    
    this.haloMesh = new THREE.Mesh(haloGeom, haloMat);
    this.haloMesh.position.set(0, 1.1, -0.1);
    this.haloMesh.rotation.x = Math.PI / 2.3; // Tilted
    this.haloMesh.rotation.y = 0.05;
    
    // Add tiny sharp cones on the ring to make it look "thorny"
    const spikeGeom = new THREE.ConeGeometry(0.02, 0.12, 4);
    const spikeMat = new THREE.MeshStandardMaterial({
      color: 0x111115,
      roughness: 0.9,
      metalness: 0.9
    });

    const spikeCount = 8;
    for (let i = 0; i < spikeCount; i++) {
      const angle = (i / spikeCount) * Math.PI * 2;
      const spike = new THREE.Mesh(spikeGeom, spikeMat);
      
      // Position on the torus path
      const r = 0.75;
      spike.position.x = Math.cos(angle) * r;
      spike.position.y = Math.sin(angle) * r;
      spike.position.z = 0;
      
      // Orient spikes outwards
      spike.rotation.z = angle - Math.PI / 2;
      spike.rotation.x = Math.PI / 2;
      
      spike.castShadow = true;
      this.haloMesh.add(spike);
      this.haloSpikes.push(spike);
    }
    
    this.group.add(this.haloMesh);
  }

  buildEnergyRings() {
    // Orbital energy bands wrapping the torso
    const ringCount = 2;
    const colors = [0xc5a880, 0x7a0010]; // Gold and Crimson
    
    for (let i = 0; i < ringCount; i++) {
      const rad = 0.8 + i * 0.25;
      const geom = new THREE.RingGeometry(rad, rad + 0.015, 64);
      const mat = new THREE.MeshBasicMaterial({
        color: colors[i],
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.45
      });
      
      const ring = new THREE.Mesh(geom, mat);
      ring.rotation.set(
        Math.random() * Math.PI,
        Math.random() * Math.PI,
        Math.random() * Math.PI
      );
      this.group.add(ring);
      this.energyRings.push({
        mesh: ring,
        rotSpeed: {
          x: (Math.random() - 0.5) * 0.4,
          y: (Math.random() - 0.5) * 0.4,
          z: (Math.random() - 0.5) * 0.4
        }
      });
    }
  }

  buildParticleWings() {
    this.wingGeometry = new THREE.BufferGeometry();
    const positions = new Float32Array(this.particleCount * 3);
    const colors = new Float32Array(this.particleCount * 3);
    
    // We will generate attributes to animate them in the update loop
    const side = new Float32Array(this.particleCount); // -1 = Left, 1 = Right
    const wingU = new Float32Array(this.particleCount); // Distance from base (0 to 1)
    const wingV = new Float32Array(this.particleCount); // Height width ratio (0 to 1)
    const speedOffset = new Float32Array(this.particleCount);

    const baseColor = new THREE.Color(0xb20d21); // Dark Crimson base
    const tipColor = new THREE.Color(0xc5a880); // Gold tips

    for (let i = 0; i < this.particleCount; i++) {
      const isRight = i % 2 === 0;
      side[i] = isRight ? 1 : -1;
      
      // Distribute particles along mathematical wing structure
      const u = Math.random(); // Span factor
      const v = Math.random(); // Feather breadth factor
      wingU[i] = u;
      wingV[i] = v;
      speedOffset[i] = Math.random() * Math.PI * 2;
      
      // Calculate basic starting coordinates
      const s = side[i];
      const span = 2.2;
      const height = 1.3;
      
      // Wing shape formulas
      const x = s * (0.15 + u * span);
      const y = 0.9 + (height * Math.sin(u * Math.PI * 0.5) * 0.8) - (v * 0.8 * (1.2 - u));
      const z = Math.sin(u * Math.PI) * 0.15 * s + (Math.random() - 0.5) * 0.08;

      positions[i * 3] = x;
      positions[i * 3 + 1] = y;
      positions[i * 3 + 2] = z;

      // Color interpolation: inner wings are crimson, outer edges/tips are golden glowing embers
      const col = new THREE.Color();
      col.copy(baseColor).lerp(tipColor, u * 0.75 + (1 - v) * 0.25);
      
      colors[i * 3] = col.r;
      colors[i * 3 + 1] = col.g;
      colors[i * 3 + 2] = col.b;

      // Keep track of particle status (for ash drifting effect)
      this.particlesData.push({
        origX: x,
        origY: y,
        origZ: z,
        u: u,
        v: v,
        side: s,
        driftSpeed: 0.1 + Math.random() * 0.3,
        driftOffset: Math.random() * 2,
        isDrifting: Math.random() < 0.15, // 15% particles drift as escaping embers
        activeDrift: 0
      });
    }

    this.wingGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    this.wingGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    this.wingGeometry.setAttribute('side', new THREE.BufferAttribute(side, 1));
    this.wingGeometry.setAttribute('wingU', new THREE.BufferAttribute(wingU, 1));
    this.wingGeometry.setAttribute('wingV', new THREE.BufferAttribute(wingV, 1));

    // Particle texture - procedural circular gradient for glowing ember look
    const canvas = document.createElement('canvas');
    canvas.width = 16;
    canvas.height = 16;
    const ctx = canvas.getContext('2d');
    const grad = ctx.createRadialGradient(8, 8, 0, 8, 8, 8);
    grad.addColorStop(0, 'rgba(255, 255, 255, 1)');
    grad.addColorStop(0.3, 'rgba(255, 220, 180, 0.8)');
    grad.addColorStop(0.6, 'rgba(255, 80, 0, 0.2)');
    grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 16, 16);
    
    const texture = new THREE.CanvasTexture(canvas);

    // Particle Material
    this.wingMaterial = new THREE.PointsMaterial({
      size: 0.05,
      map: texture,
      vertexColors: true,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });

    this.wingParticles = new THREE.Points(this.wingGeometry, this.wingMaterial);
    this.group.add(this.wingParticles);
  }

  // Set values from controls
  updateParameters(corruption, instability) {
    this.corruptionLevel = corruption / 100;
    this.instability = instability / 100 * 1.5; // Scale up speed
    
    // Scale wing particles size based on instability
    this.wingMaterial.size = 0.045 + (this.instability * 0.025);
    
    // Interpolate colors based on corruption value
    const posAttr = this.wingGeometry.getAttribute('position');
    const colorAttr = this.wingGeometry.getAttribute('color');
    const wingU = this.wingGeometry.getAttribute('wingU');
    const wingV = this.wingGeometry.getAttribute('wingV');

    let baseColor, tipColor;
    
    // Faction bases
    if (this.currentFaction === 'order') {
      baseColor = new THREE.Color(0xf3e9dc).lerp(new THREE.Color(0xc5a880), this.corruptionLevel); // White to Gold
      tipColor = new THREE.Color(0xc5a880).lerp(new THREE.Color(0x7a0010), this.corruptionLevel);  // Gold to crimson
    } else if (this.currentFaction === 'heretics') {
      baseColor = new THREE.Color(0x3e0a5b).lerp(new THREE.Color(0x7a0010), this.corruptionLevel); // Violet to Red
      tipColor = new THREE.Color(0xb20d21); // Pure bright crimson
    } else {
      // Fallen (Default)
      baseColor = new THREE.Color(0x7a0010).lerp(new THREE.Color(0x3e0a5b), this.corruptionLevel); // Crimson to purple
      tipColor = new THREE.Color(0xc5a880).lerp(new THREE.Color(0xb20d21), this.corruptionLevel);  // Gold to Red
    }

    for (let i = 0; i < this.particleCount; i++) {
      const u = wingU.getX(i);
      const v = wingV.getY(i);
      const col = new THREE.Color();
      col.copy(baseColor).lerp(tipColor, u * 0.8 + (1 - v) * 0.2);
      
      colorAttr.setXYZ(i, col.r, col.g, col.b);
    }
    colorAttr.needsUpdate = true;
  }

  // Faction transitions
  transitionFaction(faction, duration = 1.5) {
    this.currentFaction = faction;
    
    let coreColor, wireColor, haloColor;
    
    switch (faction) {
      case 'order': // Holy golden white
        coreColor = 0xf3e9dc;
        wireColor = 0xc5a880;
        haloColor = 0xfff3d6;
        this.wingFlapSpeed = 1.0;
        this.wingFlapAmp = 0.15;
        break;
      case 'heretics': // Blood red and chaotic
        coreColor = 0xb20d21;
        wireColor = 0x1a0305;
        haloColor = 0xff0000;
        this.wingFlapSpeed = 2.6;
        this.wingFlapAmp = 0.35;
        break;
      case 'fallen': // Corrupted purple and crimson
      default:
        coreColor = 0x7a0010;
        wireColor = 0x111115;
        haloColor = 0xc5a880;
        this.wingFlapSpeed = 1.8;
        this.wingFlapAmp = 0.25;
        break;
    }

    gsap.to(this.coreMesh.material.color, {
      r: ((coreColor >> 16) & 255) / 255,
      g: ((coreColor >> 8) & 255) / 255,
      b: (coreColor & 255) / 255,
      duration: duration
    });
    gsap.to(this.wireMesh.material.color, {
      r: ((wireColor >> 16) & 255) / 255,
      g: ((wireColor >> 8) & 255) / 255,
      b: (wireColor & 255) / 255,
      duration: duration
    });
    gsap.to(this.haloMesh.material.emissive, {
      r: ((haloColor >> 16) & 255) / 255,
      g: ((haloColor >> 8) & 255) / 255,
      b: (haloColor & 255) / 255,
      duration: duration
    });
  }

  // Trigger high intensity energy pulse
  pulseEnergy() {
    // Animate core glow and wire mesh scaling
    gsap.timeline()
      .to(this.coreMesh.scale, { x: 1.8, y: 1.8, z: 1.8, duration: 0.2, ease: "power2.out" })
      .to(this.coreMesh.scale, { x: 1.0, y: 1.0, z: 1.0, duration: 0.8, ease: "power2.inOut" });

    gsap.timeline()
      .to(this.wireMesh.scale, { x: 1.3, y: 1.3, z: 1.3, duration: 0.15, ease: "power2.out" })
      .to(this.wireMesh.scale, { x: 1.0, y: 1.0, z: 1.0, duration: 0.6, ease: "power2.inOut" });

    // Briefly increase particle wing scaling / offset
    const currentAmp = this.wingFlapAmp;
    gsap.timeline()
      .to(this, { wingFlapAmp: currentAmp * 2.2, duration: 0.2 })
      .to(this, { wingFlapAmp: currentAmp, duration: 1.0, ease: "power1.out" });
  }

  // Trigger sudden wing flapping animation
  flapWings() {
    const currentSpeed = this.wingFlapSpeed;
    gsap.timeline()
      .to(this, { wingFlapSpeed: currentSpeed * 3.5, duration: 0.3, ease: "power1.out" })
      .to(this, { wingFlapSpeed: currentSpeed, duration: 1.5, ease: "power2.inOut" });
  }

  // Direct manual clean simulation
  purgeEntity() {
    this.updateParameters(0, 10);
    this.pulseEnergy();
  }

  update(time, deltaTime, mouse) {
    // 1. Slow idle rotation of central wire core
    this.wireMesh.rotation.y = time * 0.12;
    this.wireMesh.rotation.x = Math.sin(time * 0.2) * 0.1;
    this.wireMesh.rotation.z = Math.cos(time * 0.3) * 0.1;
    
    // Core breathing effect
    const breatheFactor = 1.0 + Math.sin(time * 2.0) * 0.08;
    this.coreMesh.scale.set(breatheFactor, breatheFactor, breatheFactor);

    // 2. Halo float and spin
    this.haloMesh.position.y = 1.1 + Math.sin(time * 1.5) * 0.06;
    this.haloMesh.rotation.z = time * 0.18; // spin
    
    // Spin spikes in opposite direction slightly
    for (let i = 0; i < this.haloSpikes.length; i++) {
      this.haloSpikes[i].rotation.y = Math.sin(time * 2 + i) * 0.2;
    }

    // 3. Update energy rings
    for (const item of this.energyRings) {
      item.mesh.rotation.x += item.rotSpeed.x * deltaTime;
      item.mesh.rotation.y += item.rotSpeed.y * deltaTime;
      item.mesh.rotation.z += item.rotSpeed.z * deltaTime;
      
      const pulse = 1.0 + Math.sin(time * 3 + item.mesh.uuid.charCodeAt(0)) * 0.04;
      item.mesh.scale.set(pulse, pulse, pulse);
    }

    // 4. Wing Particle Physics and Flap calculations
    const positions = this.wingGeometry.getAttribute('position');
    const side = this.wingGeometry.getAttribute('side');
    const wingU = this.wingGeometry.getAttribute('wingU');
    const wingV = this.wingGeometry.getAttribute('wingV');

    const flapCycle = time * this.wingFlapSpeed;
    // Wing rotation flap angle
    const flapAngle = Math.sin(flapCycle) * this.wingFlapAmp;
    
    // Dynamic wave ripples from body to tips
    const waveFreq = 2.5;

    for (let i = 0; i < this.particleCount; i++) {
      const s = side.getX(i);
      const u = wingU.getX(i);
      const v = wingV.getY(i);
      const data = this.particlesData[i];

      // Wing base center coordinates
      const hingeX = s * 0.12;
      const hingeY = 0.9;
      
      // Starting local wing plane shape relative to hinge
      const wingSpan = 2.2;
      const wingHeight = 1.3;
      
      let localX = u * wingSpan;
      let localY = (wingHeight * Math.sin(u * Math.PI * 0.5) * 0.8) - (v * 0.8 * (1.2 - u));
      let localZ = Math.sin(u * Math.PI) * 0.15;

      // Dynamic folding, wind resistance & mouse reaction offset
      const mouseInfluence = Math.abs(mouse.x) * 0.25 * s * u;
      const localFlapAngle = flapAngle * (u * 1.3) + Math.sin(flapCycle - u * waveFreq) * 0.08 * u;
      
      // Rotate coordinates by flap angle (around Z hinge)
      const cosA = Math.cos(localFlapAngle + mouseInfluence);
      const sinA = Math.sin(localFlapAngle + mouseInfluence);
      
      let rotatedX = localX * cosA - localY * sinA;
      let rotatedY = localX * sinA + localY * cosA;
      let rotatedZ = localZ + Math.sin(time * 3 + u * 10) * 0.03 * u; // Flutter

      // Global coordinates after rotating wings
      let x = hingeX + s * rotatedX;
      let y = hingeY + rotatedY;
      let z = rotatedZ;

      // Simulating glowing escaping embers (particle drift)
      if (data.isDrifting) {
        // Increment active drift based on instability
        data.activeDrift += deltaTime * data.driftSpeed * (1.0 + this.instability * 0.5);
        
        // If drift is active, push particle away
        if (data.activeDrift > 1.0) {
          data.activeDrift = 0; // reset
        }
        
        const driftT = data.activeDrift;
        // Drift paths: blow back and rise
        x += Math.sin(driftT * Math.PI * 2 + data.driftOffset) * 0.25 * driftT;
        y += driftT * 0.7 * (1.0 + this.instability * 0.5);
        z += -driftT * 1.5; // blows backward into mist
        
        // Fade particle slightly when drifting (managed implicitly by rendering, or keep colors moving)
      }

      positions.setXYZ(i, x, y, z);
    }
    positions.needsUpdate = true;

    // Hover entire angel group slightly
    this.group.position.y = 0.7 + Math.sin(time * 0.8) * 0.12;
  }
}
