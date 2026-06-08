import * as THREE from 'three';

export class SplitSceneTimeline {
  constructor(engine) {
    this.engine = engine;
    this.group = new THREE.Group();
    
    // Split height in world coordinates (clamped between -3.0 and 3.0)
    this.splitY = 0;
    
    // Create the dual clipping planes
    // topClipPlane normal is (0, 1, 0) -> keeps y > splitY
    this.topClipPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -this.splitY);
    // bottomClipPlane normal is (0, -1, 0) -> keeps y < splitY
    this.bottomClipPlane = new THREE.Plane(new THREE.Vector3(0, -1, 0), this.splitY);
    
    this.holyGroup = new THREE.Group();
    this.corruptedGroup = new THREE.Group();
    
    this.holyWeapon = null;
    this.corruptedWeapon = null;
    this.holySparks = null;
    this.corruptedEmbers = null;
    this.columnsHoly = [];
    this.columnsCorrupted = [];

    this.init();
  }

  init() {
    this.group.position.set(0, 0.7, 0);
    this.engine.scene.add(this.group);
    
    this.group.add(this.holyGroup);
    this.group.add(this.corruptedGroup);
    
    // Build sub-elements
    this.buildHolySubScene();
    this.buildCorruptedSubScene();
  }

  updateSplitY(yCoord) {
    this.splitY = yCoord;
    
    // Update plane constants
    // Plane constant is the offset along the normal.
    // For top plane (0, 1, 0): offset is -splitY
    this.topClipPlane.constant = -this.splitY;
    // For bottom plane (0, -1, 0): offset is splitY
    this.bottomClipPlane.constant = this.splitY;
  }

  buildHolySubScene() {
    const whiteMarbleMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      emissive: 0xc5a880,
      emissiveIntensity: 0.12,
      roughness: 0.15,
      metalness: 0.1,
      flatShading: true,
      clippingPlanes: [this.topClipPlane],
      clipShadows: true
    });

    const goldMat = new THREE.MeshStandardMaterial({
      color: 0xc5a880,
      roughness: 0.2,
      metalness: 0.95,
      clippingPlanes: [this.topClipPlane]
    });

    const radiantMat = new THREE.MeshBasicMaterial({
      color: 0xfffcf7,
      transparent: true,
      opacity: 0.95,
      clippingPlanes: [this.topClipPlane]
    });

    // 1. Holy Cathedral Columns (perfect, upright)
    const colCount = 4;
    const radius = 6.2;
    const colHeight = 14;
    const colGeom = new THREE.CylinderGeometry(0.38, 0.44, colHeight, 8);

    for (let i = 0; i < colCount; i++) {
      const angle = Math.PI * 0.75 + (i / (colCount - 1)) * Math.PI * 0.5;
      const col = new THREE.Mesh(colGeom, whiteMarbleMat);
      
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius - 1.5;
      col.position.set(x, colHeight / 2 - 2, z);
      col.castShadow = true;
      col.receiveShadow = true;
      
      this.holyGroup.add(col);
      this.columnsHoly.push(col);
    }

    // 2. Central Holy Weapon (The Radiant Sceptre/Glaive)
    this.holyWeapon = new THREE.Group();
    
    // Golden long haft
    const haftGeom = new THREE.CylinderGeometry(0.024, 0.024, 2.6, 8);
    const haft = new THREE.Mesh(haftGeom, goldMat);
    this.holyWeapon.add(haft);
    
    // Holy cross-halo
    const haloGeom = new THREE.TorusGeometry(0.25, 0.02, 6, 24);
    const halo = new THREE.Mesh(haloGeom, goldMat);
    halo.position.y = 1.0;
    halo.rotation.x = Math.PI / 2;
    this.holyWeapon.add(halo);

    // Glowing main crystal tip
    const tipGeom = new THREE.ConeGeometry(0.09, 0.4, 4);
    const tip = new THREE.Mesh(tipGeom, radiantMat);
    tip.position.y = 1.25;
    tip.scale.set(1, 1, 0.2); // flat blade
    this.holyWeapon.add(tip);

    // Base pommel ring
    const pommel = new THREE.Mesh(new THREE.TorusGeometry(0.045, 0.015, 6, 12), goldMat);
    pommel.position.y = -1.3;
    pommel.rotation.x = Math.PI/2;
    this.holyWeapon.add(pommel);

    this.holyGroup.add(this.holyWeapon);

    // 3. Floating Gold Sparks
    const sparkCount = 300;
    const sparkGeom = new THREE.BufferGeometry();
    const positions = new Float32Array(sparkCount * 3);
    const colors = new Float32Array(sparkCount * 3);
    const sparkData = [];

    const sparkColor = new THREE.Color(0xc5a880);
    for (let i = 0; i < sparkCount; i++) {
      const x = (Math.random() - 0.5) * 1.6;
      const y = -1.8 + Math.random() * 3.6;
      const z = (Math.random() - 0.5) * 1.6;

      positions[i * 3] = x;
      positions[i * 3 + 1] = y;
      positions[i * 3 + 2] = z;

      colors[i * 3] = sparkColor.r;
      colors[i * 3 + 1] = sparkColor.g;
      colors[i * 3 + 2] = sparkColor.b;

      sparkData.push({
        origX: x,
        speedY: 0.3 + Math.random() * 0.5,
        speedAngle: Math.random() * Math.PI * 2,
        radius: 0.1 + Math.random() * 0.15
      });
    }

    sparkGeom.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    sparkGeom.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const canvas = document.createElement('canvas');
    canvas.width = 16;
    canvas.height = 16;
    const ctx = canvas.getContext('2d');
    const grad = ctx.createRadialGradient(8, 8, 0, 8, 8, 8);
    grad.addColorStop(0, 'rgba(255, 255, 255, 1)');
    grad.addColorStop(0.3, 'rgba(255, 235, 190, 0.7)');
    grad.addColorStop(0.8, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 16, 16);

    const sparkMat = new THREE.PointsMaterial({
      size: 0.045,
      map: new THREE.CanvasTexture(canvas),
      vertexColors: true,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      clippingPlanes: [this.topClipPlane]
    });

    this.holySparks = new THREE.Points(sparkGeom, sparkMat);
    this.holySparksData = sparkData;
    this.holyGroup.add(this.holySparks);
  }

  buildCorruptedSubScene() {
    const darkStoneMat = new THREE.MeshStandardMaterial({
      color: 0x090305, // deep dark reddish stone
      roughness: 0.95,
      metalness: 0.9,
      flatShading: true,
      clippingPlanes: [this.bottomClipPlane],
      clipShadows: true
    });

    const darkMetalMat = new THREE.MeshStandardMaterial({
      color: 0x070709,
      roughness: 0.8,
      metalness: 0.99,
      clippingPlanes: [this.bottomClipPlane]
    });

    const purpleGlowMat = new THREE.MeshBasicMaterial({
      color: 0x691b9a, // corrupted purple
      transparent: true,
      opacity: 0.9,
      clippingPlanes: [this.bottomClipPlane]
    });

    // 1. Corrupted Cathedral Columns (skewed, shattered ruins matching holy ones)
    const colCount = 4;
    const radius = 6.2;
    const colHeight = 14;
    const colGeom = new THREE.CylinderGeometry(0.38, 0.44, colHeight, 8);

    for (let i = 0; i < colCount; i++) {
      const angle = Math.PI * 0.75 + (i / (colCount - 1)) * Math.PI * 0.5;
      const col = new THREE.Mesh(colGeom, darkStoneMat);
      
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius - 1.5;
      
      // Position column base matching holy but tilted to show decay
      col.position.set(x + (Math.random() - 0.5) * 0.1, colHeight / 2 - 2.1, z);
      
      // Shattered column rotation
      col.rotation.z = (Math.random() - 0.5) * 0.15;
      col.rotation.y = Math.random() * Math.PI;
      
      col.castShadow = true;
      col.receiveShadow = true;
      
      this.corruptedGroup.add(col);
      this.columnsCorrupted.push(col);
    }

    // 2. Central Corrupted Weapon (The Abyssal Scythe in exact same position)
    this.corruptedWeapon = new THREE.Group();

    // Dark metal curved shaft
    const shaftGeom = new THREE.CylinderGeometry(0.024, 0.024, 2.6, 8);
    const shaft = new THREE.Mesh(shaftGeom, darkMetalMat);
    this.corruptedWeapon.add(shaft);

    // Curved scythe blade at the top (corrupting the holy tip)
    const bladeGeom = new THREE.BoxGeometry(0.025, 0.9, 0.18);
    const blade = new THREE.Mesh(bladeGeom, purpleGlowMat);
    blade.position.set(0.35, 1.15, 0.02);
    blade.rotation.z = -Math.PI / 3.5;
    this.corruptedWeapon.add(blade);

    // Twisted spiked pommel
    const pommelSpike = new THREE.Mesh(new THREE.ConeGeometry(0.04, 0.18, 4), darkMetalMat);
    pommelSpike.position.y = -1.35;
    pommelSpike.rotation.x = Math.PI;
    this.corruptedWeapon.add(pommelSpike);

    this.corruptedGroup.add(this.corruptedWeapon);

    // 3. Floating Red Embers
    const emberCount = 300;
    const emberGeom = new THREE.BufferGeometry();
    const positions = new Float32Array(emberCount * 3);
    const colors = new Float32Array(emberCount * 3);
    const emberData = [];

    const emberColor = new THREE.Color(0xb20d21);
    for (let i = 0; i < emberCount; i++) {
      const x = (Math.random() - 0.5) * 1.6;
      const y = -1.8 + Math.random() * 3.6;
      const z = (Math.random() - 0.5) * 1.6;

      positions[i * 3] = x;
      positions[i * 3 + 1] = y;
      positions[i * 3 + 2] = z;

      colors[i * 3] = emberColor.r;
      colors[i * 3 + 1] = emberColor.g;
      colors[i * 3 + 2] = emberColor.b;

      emberData.push({
        origX: x,
        speedY: 0.5 + Math.random() * 0.8,
        speedAngle: Math.random() * Math.PI * 2,
        radius: 0.1 + Math.random() * 0.2
      });
    }

    emberGeom.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    emberGeom.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const canvas = document.createElement('canvas');
    canvas.width = 16;
    canvas.height = 16;
    const ctx = canvas.getContext('2d');
    const grad = ctx.createRadialGradient(8, 8, 0, 8, 8, 8);
    grad.addColorStop(0, 'rgba(255, 255, 255, 1)');
    grad.addColorStop(0.3, 'rgba(255, 80, 0, 0.8)');
    grad.addColorStop(0.7, 'rgba(122, 0, 16, 0.2)');
    grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 16, 16);

    const emberMat = new THREE.PointsMaterial({
      size: 0.05,
      map: new THREE.CanvasTexture(canvas),
      vertexColors: true,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      clippingPlanes: [this.bottomClipPlane]
    });

    this.corruptedEmbers = new THREE.Points(emberGeom, emberMat);
    this.corruptedEmbersData = emberData;
    this.corruptedGroup.add(this.corruptedEmbers);
  }

  update(time, deltaTime, mouse) {
    if (!this.group.visible) return;

    // 1. Slow idle rotation of weapons matching each other perfectly
    const rotationY = time * 0.45;
    
    this.holyWeapon.rotation.y = rotationY;
    this.holyWeapon.position.y = Math.sin(time * 1.2) * 0.05;
    
    this.corruptedWeapon.rotation.y = rotationY;
    this.corruptedWeapon.position.y = Math.sin(time * 1.2) * 0.05;

    // 2. Animate holy sparks (rising spiraling gold)
    if (this.holySparks) {
      const positions = this.holySparks.geometry.getAttribute('position');
      const array = positions.array;
      const count = this.holySparksData.length;
      for (let i = 0; i < count; i++) {
        const data = this.holySparksData[i];
        const idx = i * 3;
        let y = array[idx + 1] + data.speedY * deltaTime;
        if (y > 1.8) y = -1.8; // reset to bottom
        
        data.speedAngle += 2.0 * deltaTime;
        const spiralX = data.origX + Math.cos(data.speedAngle) * data.radius;
        const spiralZ = Math.sin(data.speedAngle) * data.radius;
        
        array[idx] = spiralX;
        array[idx + 1] = y;
        array[idx + 2] = spiralZ;
      }
      positions.needsUpdate = true;
    }

    // 3. Animate corrupted embers (rising rapid red sparks)
    if (this.corruptedEmbers) {
      const positions = this.corruptedEmbers.geometry.getAttribute('position');
      const array = positions.array;
      const count = this.corruptedEmbersData.length;
      for (let i = 0; i < count; i++) {
        const data = this.corruptedEmbersData[i];
        const idx = i * 3;
        let y = array[idx + 1] + data.speedY * deltaTime;
        if (y > 1.8) y = -1.8;
        
        data.speedAngle += 3.0 * deltaTime;
        const spiralX = data.origX + Math.cos(data.speedAngle) * data.radius;
        const spiralZ = Math.sin(data.speedAngle) * data.radius;
        
        array[idx] = spiralX;
        array[idx + 1] = y;
        array[idx + 2] = spiralZ;
      }
      positions.needsUpdate = true;
    }
    
    // Slow camera parallax sway on the column ruins groups
    const swayY = mouse.x * 0.05;
    this.holyGroup.rotation.y = swayY;
    this.corruptedGroup.rotation.y = swayY;
  }
}
