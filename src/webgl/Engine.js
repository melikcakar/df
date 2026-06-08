import * as THREE from 'three';
import { gsap } from 'gsap';

export class WebGLEngine {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId);
    this.width = window.innerWidth;
    this.height = window.innerHeight;
    
    // Core components
    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.timer = new THREE.Timer();
    
    // Lights
    this.ambientLight = null;
    this.spotLight = null;
    this.pointLight = null;
    this.bottomLight = null;
    this.diagonalLight = null;
    this.factionLights = {};
    
    // Parallax Interaction Mouse
    this.mouse = { x: 0, y: 0, targetX: 0, targetY: 0 };
    this.cameraBasePos = { x: 0.0, y: 1.2, z: 8.4 };
    this.cameraLookAtY = 1.95;
    
    // Custom animate callback
    this.updatables = [];
    this.captureFrameCallback = null;

    this.init();
  }

  init() {
    // 1. Scene
    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.FogExp2(0x07070a, 0.095); // Deep dark fog

    // 2. Camera
    this.camera = new THREE.PerspectiveCamera(45, this.width / this.height, 0.1, 100);
    this.camera.position.set(this.cameraBasePos.x, this.cameraBasePos.y, this.cameraBasePos.z);
    this.camera.lookAt(0, this.cameraLookAtY, 0);

    // 3. Renderer
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
      alpha: false,
      powerPreference: "high-performance"
    });
    this.renderer.setSize(this.width, this.height);
    const maxPixelRatio = window.innerWidth < 768 ? 1.5 : 2.0;
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, maxPixelRatio));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
    this.renderer.localClippingEnabled = true;
    
    // Tone mapping disabled to preserve original model colors
    this.renderer.toneMapping = THREE.NoToneMapping;
    this.renderer.toneMappingExposure = 1.0;

    // 4. Lights Setup
    this.setupLighting();

    // 5. Event Listeners
    window.addEventListener('resize', this.onWindowResize.bind(this));
    window.addEventListener('mousemove', this.onMouseMove.bind(this));
    window.addEventListener('touchmove', this.onTouchMove.bind(this), { passive: true });

    // Drag to rotate interaction variables
    this.isDragging = false;
    this.previousMousePosition = { x: 0, y: 0 };
    
    this.canvas.addEventListener('mousedown', this.onMouseDown.bind(this));
    window.addEventListener('mouseup', this.onMouseUp.bind(this));
    window.addEventListener('mousemove', this.onMouseMoveDrag.bind(this));

    this.canvas.addEventListener('touchstart', this.onTouchStart.bind(this), { passive: true });
    window.addEventListener('touchend', this.onTouchEnd.bind(this));
    window.addEventListener('touchmove', this.onTouchMoveDrag.bind(this), { passive: true });
  }

  generateHDRReflectionMap() {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');
    
    // Dark background
    const bgGrad = ctx.createLinearGradient(0, 0, 0, 128);
    bgGrad.addColorStop(0, '#0a0a0f');
    bgGrad.addColorStop(1, '#020204');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, 128, 128);
    
    // Specular softbox highlights for metallic reflection
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(50, 0, 28, 128);
    
    // Warm HDR spot (Gold)
    const grad1 = ctx.createRadialGradient(20, 30, 0, 20, 30, 50);
    grad1.addColorStop(0, '#ffe4c4');
    grad1.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = grad1;
    ctx.fillRect(0, 0, 60, 128);
    
    // Cold HDR spot (Cyan/Blue)
    const grad2 = ctx.createRadialGradient(100, 90, 0, 100, 90, 50);
    grad2.addColorStop(0, '#87ceeb');
    grad2.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = grad2;
    ctx.fillRect(60, 0, 68, 128);
    
    const texture = new THREE.CanvasTexture(canvas);
    texture.mapping = THREE.EquirectangularReflectionMapping;
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
  }

  setupLighting() {
    // Ambient light - Brightened white tone to lift shadows globally
    this.ambientLight = new THREE.AmbientLight(0xffffff, 1.6);
    this.scene.add(this.ambientLight);

    // Powerful white directional light pointing directly at the model from front-top-right
    this.whiteLight = new THREE.DirectionalLight(0xffffff, 4.5);
    this.whiteLight.position.set(5, 8, 8);
    this.whiteLight.castShadow = true;
    this.whiteLight.shadow.mapSize.width = 2048;
    this.whiteLight.shadow.mapSize.height = 2048;
    this.whiteLight.shadow.bias = -0.0005;
    this.scene.add(this.whiteLight);

    // Secondary fill light from front-left to light up model contours
    this.whiteFillLight = new THREE.DirectionalLight(0xffffff, 2.5);
    this.whiteFillLight.position.set(-5, 4, 3);
    this.scene.add(this.whiteFillLight);

    // Rim directional light from behind the model to create HDR edge highlights
    this.rimLight = new THREE.DirectionalLight(0xffffff, 3.5);
    this.rimLight.position.set(0, 5, -8);
    this.scene.add(this.rimLight);

    // Spotlight - Volumetric effect source, casting shadows
    this.spotLight = new THREE.SpotLight(0xc5a880, 8.0); // Gold tone
    this.spotLight.position.set(0, 12, -3);
    this.spotLight.angle = Math.PI / 4;
    this.spotLight.penumbra = 0.8;
    this.spotLight.decay = 1.5;
    this.spotLight.distance = 30;
    this.spotLight.castShadow = true;
    this.spotLight.shadow.mapSize.width = 1024;
    this.spotLight.shadow.mapSize.height = 1024;
    this.spotLight.shadow.camera.near = 1;
    this.spotLight.shadow.camera.far = 25;
    this.spotLight.shadow.bias = -0.001;
    this.scene.add(this.spotLight);

    // Point Light - positioned near the central model
    this.pointLight = new THREE.PointLight(0xb20d21, 6.0, 15); // Crimson glow
    this.pointLight.position.set(0, 1.5, 0.5);
    this.scene.add(this.pointLight);

    // Dim top-down spotlight - soft overhead glow on the character
    this.topLight = new THREE.SpotLight(0xdde4f0, 4.0);
    this.topLight.position.set(0, 14, 0);
    this.topLight.target.position.set(0, 0, 0);
    this.topLight.angle = Math.PI / 5;
    this.topLight.penumbra = 1.0;
    this.topLight.decay = 1.8;
    this.topLight.distance = 25;
    this.scene.add(this.topLight);
    this.scene.add(this.topLight.target);

    // Gotik uplight pointing upwards for specific models (Vesper & Cain)
    this.bottomLight = new THREE.SpotLight(0xffffff, 0.0);
    this.bottomLight.position.set(0, 0.5, 0);
    this.bottomLight.target.position.set(0, 4.0, 0);
    this.bottomLight.angle = Math.PI / 3;
    this.bottomLight.penumbra = 0.8;
    this.bottomLight.decay = 1.0;
    this.bottomLight.distance = 12;
    this.scene.add(this.bottomLight);
    this.scene.add(this.bottomLight.target);

    // Gotik diagonal spotlight (illuminating model and background ruins)
    this.diagonalLight = new THREE.SpotLight(0xffffff, 0.0);
    this.diagonalLight.position.set(-9, 3.5, 9);
    this.diagonalLight.target.position.set(3.0, 3.5, -6.0); // Targeting background behind-right of model
    this.diagonalLight.angle = Math.PI / 3.5; // Moderately wide beam
    this.diagonalLight.penumbra = 0.6;
    this.diagonalLight.decay = 1.0;
    this.diagonalLight.distance = 28;
    this.diagonalLight.castShadow = true;
    this.diagonalLight.shadow.mapSize.width = 1024;
    this.diagonalLight.shadow.mapSize.height = 1024;
    this.diagonalLight.shadow.bias = -0.0005;
    this.scene.add(this.diagonalLight);
    this.scene.add(this.diagonalLight.target);
  }

  onMouseMove(event) {
    // Convert to normalized coordinates (-1 to 1)
    this.mouse.targetX = (event.clientX / window.innerWidth) * 2 - 1;
    this.mouse.targetY = -(event.clientY / window.innerHeight) * 2 + 1;
  }

  onTouchMove(event) {
    if (event.touches.length > 0) {
      this.mouse.targetX = (event.touches[0].clientX / window.innerWidth) * 2 - 1;
      this.mouse.targetY = -(event.touches[0].clientY / window.innerHeight) * 2 + 1;
    }
  }

  onWindowResize() {
    this.width = window.innerWidth;
    this.height = window.innerHeight;

    this.camera.aspect = this.width / this.height;
    this.camera.updateProjectionMatrix();

    this.renderer.setSize(this.width, this.height);
    const maxPixelRatio = window.innerWidth < 768 ? 1.5 : 2.0;
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, maxPixelRatio));
  }

  addUpdatable(object) {
    this.updatables.push(object);
  }

  // Smooth camera parallax
  updateCameraParallax(deltaTime) {
    // Lerp mouse coordinates for smooth lag effect
    this.mouse.x += (this.mouse.targetX - this.mouse.x) * 3 * deltaTime;
    this.mouse.y += (this.mouse.targetY - this.mouse.y) * 3 * deltaTime;

    // Apply parallax offset to camera position
    const parallaxFactorX = 1.2;
    const parallaxFactorY = 0.6;
    
    this.camera.position.x = this.cameraBasePos.x + this.mouse.x * parallaxFactorX;
    this.camera.position.y = this.cameraBasePos.y + this.mouse.y * parallaxFactorY;
    
    // Always look slightly above center where the torso is
    this.camera.lookAt(0, this.cameraLookAtY, 0);
  }

  // Smooth light/color transitions for factions
  transitionFactionLights(faction, duration = 1.5) {
    let spotlightColor, pointlightColor;
    
    switch (faction) {
      case 'order': // Holy Light - Golden and white
        spotlightColor = new THREE.Color(0xf3e9dc);
        pointlightColor = new THREE.Color(0xc5a880);
        this.scene.fog.color.setHex(0x0e0e0a);
        this.renderer.setClearColor(0x0e0e0a);
        break;
      case 'heretics': // Chaotic energy - blood crimson and bright red
        spotlightColor = new THREE.Color(0xb20d21);
        pointlightColor = new THREE.Color(0x7a0010);
        this.scene.fog.color.setHex(0x090305);
        this.renderer.setClearColor(0x090305);
        break;
      case 'fallen': // Corrupted divine - dark purple, gold and red embers
      default:
        spotlightColor = new THREE.Color(0xc5a880);
        pointlightColor = new THREE.Color(0x7a0010);
        this.scene.fog.color.setHex(0x07070a);
        this.renderer.setClearColor(0x07070a);
        break;
    }

    // Dynamic light color shifting using GSAP
    gsap.to(this.spotLight.color, {
      r: spotlightColor.r,
      g: spotlightColor.g,
      b: spotlightColor.b,
      duration: duration,
      ease: "power2.out"
    });
    gsap.to(this.pointLight.color, {
      r: pointlightColor.r,
      g: pointlightColor.g,
      b: pointlightColor.b,
      duration: duration,
      ease: "power2.out"
    });
    
    const fogHex = this.scene.fog.color.getHex();
    const targetFogHex = faction === 'order' ? 0x0e0e0a : (faction === 'heretics' ? 0x090305 : 0x07070a);
    const fogColorObj = { hex: fogHex };
    gsap.to(fogColorObj, {
      hex: targetFogHex,
      duration: duration,
      ease: "power2.out",
      onUpdate: () => {
        this.scene.fog.color.setHex(Math.floor(fogColorObj.hex));
      }
    });
  }

  updateChampionLighting(championName, duration = 1.5) {
    if (!this.bottomLight || !this.diagonalLight) return;

    let targetUplightIntensity = 0.0;
    let targetDiagIntensity = 0.0;

    if (championName === 'eron') { // Vesper
      targetUplightIntensity = 8.0;
      targetDiagIntensity = 12.0; // Strong diagonal white light
    } else if (championName === 'executioner') { // Cain
      targetUplightIntensity = 10.0;
      targetDiagIntensity = 14.0; // Strong diagonal white light
    }

    gsap.to(this.bottomLight, {
      intensity: targetUplightIntensity,
      duration: duration,
      ease: "power2.out"
    });

    gsap.to(this.diagonalLight, {
      intensity: targetDiagIntensity,
      duration: duration,
      ease: "power2.out"
    });
  }

  start() {
    const tick = () => {
      this.timer.update();
      const deltaTime = this.timer.getDelta();
      const elapsedTime = this.timer.getElapsed();

      // Update camera parallax
      this.updateCameraParallax(deltaTime);

      // Update all registered components (e.g. wings, halo)
      for (const object of this.updatables) {
        if (typeof object.update === 'function') {
          object.update(elapsedTime, deltaTime, this.mouse);
        }
      }

      // Render
      this.renderer.render(this.scene, this.camera);

      // Frame capture request check
      if (this.captureFrameCallback) {
        try {
          const dataUrl = this.canvas.toDataURL('image/png');
          this.captureFrameCallback(dataUrl);
        } catch (e) {
          console.error("Frame capture error:", e);
        }
        this.captureFrameCallback = null;
      }

      // Next frame
      window.requestAnimationFrame(tick);
    };

    tick();
  }

  captureFrame(callback) {
    this.captureFrameCallback = callback;
  }

  onMouseDown(event) {
    this.isDragging = true;
    this.previousMousePosition = {
      x: event.clientX,
      y: event.clientY
    };
  }

  onMouseUp(event) {
    this.isDragging = false;
    const modelLoader = this.updatables.find(obj => obj.constructor.name === 'ModelShowcaseLoader');
    if (modelLoader) {
      modelLoader.isUserDragging = false;
    }
  }

  onMouseMoveDrag(event) {
    if (!this.isDragging) return;

    const deltaMove = {
      x: event.clientX - this.previousMousePosition.x,
      y: event.clientY - this.previousMousePosition.y
    };

    const modelLoader = this.updatables.find(obj => obj.constructor.name === 'ModelShowcaseLoader');
    if (modelLoader && modelLoader.group) {
      // Scale horizontal drag to Y rotation, and vertical drag to X rotation
      modelLoader.group.rotation.y += deltaMove.x * 0.007;
      modelLoader.group.rotation.x += deltaMove.y * 0.007;
      
      // Clamp vertical rotation so the model bottom remains hidden
      modelLoader.group.rotation.x = Math.max(-0.4, Math.min(0.15, modelLoader.group.rotation.x));
      
      modelLoader.isUserDragging = true;
      modelLoader.lastDragTime = this.timer.getElapsed();
    }

    this.previousMousePosition = {
      x: event.clientX,
      y: event.clientY
    };
  }

  onTouchStart(event) {
    if (event.touches.length > 0) {
      this.isDragging = true;
      this.previousMousePosition = {
        x: event.touches[0].clientX,
        y: event.touches[0].clientY
      };
    }
  }

  onTouchEnd(event) {
    this.isDragging = false;
    const modelLoader = this.updatables.find(obj => obj.constructor.name === 'ModelShowcaseLoader');
    if (modelLoader) {
      modelLoader.isUserDragging = false;
    }
  }

  onTouchMoveDrag(event) {
    if (!this.isDragging || event.touches.length === 0) return;

    const deltaMove = {
      x: event.touches[0].clientX - this.previousMousePosition.x,
      y: event.touches[0].clientY - this.previousMousePosition.y
    };

    const modelLoader = this.updatables.find(obj => obj.constructor.name === 'ModelShowcaseLoader');
    if (modelLoader && modelLoader.group) {
      modelLoader.group.rotation.y += deltaMove.x * 0.008;
      modelLoader.group.rotation.x += deltaMove.y * 0.008;
      
      // Clamp vertical rotation so the model bottom remains hidden
      modelLoader.group.rotation.x = Math.max(-0.4, Math.min(0.15, modelLoader.group.rotation.x));
      
      modelLoader.isUserDragging = true;
      modelLoader.lastDragTime = this.timer.getElapsed();
    }

    this.previousMousePosition = {
      x: event.touches[0].clientX,
      y: event.touches[0].clientY
    };
  }
}
