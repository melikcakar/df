import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import { gsap } from 'gsap';

export class ModelShowcaseLoader {
  constructor(engine) {
    this.engine = engine;
    this.engine.modelLoader = this;
    this.loader = new GLTFLoader();
    this.loader.setMeshoptDecoder(MeshoptDecoder);
    this.group = new THREE.Group();
    
    this.currentModel = null;
    this.mixer = null;
    this.activeAction = null;
    
    // Custom parameters matching HUD customizer sliders
    this.corruptionLevel = 0.66;
    this.instability = 0.45;
    
    // Track loading state
    this.isLoading = false;
    
    // Drag rotation states
    this.isUserDragging = false;
    this.lastDragTime = 0;

    // Sparks particles references (retained for rising gothic embers effect)
    this.sparksPoints = null;
    this.sparkGeometry = null;
    this.sparkMaterial = null;
    this.sparksData = [];
    this.sparkCount = 150;
    
    this.init();
  }
  
  init() {
    // Standard central positioning (raised slightly)
    this.group.position.set(0, 4.0, 0);
    this.engine.scene.add(this.group);

    // Build the aesthetic rising spark particles under the model
    this.buildPedestalSparks();
  }

  buildPedestalSparks() {
    this.sparkGeometry = new THREE.BufferGeometry();
    const positions = new Float32Array(this.sparkCount * 3);
    const colors = new Float32Array(this.sparkCount * 3);
    this.sparksData = [];

    const defaultColor = new THREE.Color(0xb20d21); // Default Crimson

    for (let i = 0; i < this.sparkCount; i++) {
      // Circular distribution around the central model origin
      const angle = Math.random() * Math.PI * 2;
      const radius = 0.1 + Math.random() * 1.1;
      
      const x = Math.cos(angle) * radius;
      // Scatter initial heights between bottom floor and model body
      const y = -3.0 + Math.random() * 2.5;
      const z = Math.sin(angle) * radius;

      positions[i * 3] = x;
      positions[i * 3 + 1] = y;
      positions[i * 3 + 2] = z;

      colors[i * 3] = defaultColor.r;
      colors[i * 3 + 1] = defaultColor.g;
      colors[i * 3 + 2] = defaultColor.b;

      this.sparksData.push({
        origX: x,
        origZ: z,
        angle: angle,
        radius: radius,
        speedY: 0.2 + Math.random() * 0.45,
        speedAngle: Math.random() * Math.PI * 2
      });
    }

    this.sparkGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    this.sparkGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    // Particle texture - soft circular gradient glow
    const canvas = document.createElement('canvas');
    canvas.width = 16;
    canvas.height = 16;
    const ctx = canvas.getContext('2d');
    const grad = ctx.createRadialGradient(8, 8, 0, 8, 8, 8);
    grad.addColorStop(0, 'rgba(255, 255, 255, 1)');
    grad.addColorStop(0.3, 'rgba(255, 120, 100, 0.8)');
    grad.addColorStop(0.8, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 16, 16);
    
    this.sparkMaterial = new THREE.PointsMaterial({
      size: 0.045,
      map: new THREE.CanvasTexture(canvas),
      vertexColors: true,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });

    this.sparksPoints = new THREE.Points(this.sparkGeometry, this.sparkMaterial);
    this.group.add(this.sparksPoints);
  }
  
  loadModel(modelName, onProgress, onLoadComplete) {
    if (this.isLoading) return;
    this.isLoading = true;
    
    // Clean up previous model meshes and mixers to prevent memory leaks
    this.clearCurrentModel();
    
    // Access models from /public directory directly
    const url = `/${modelName}.glb`;
    
    MeshoptDecoder.ready.then(() => {
      this.loader.load(
        url,
        (gltf) => {
          const model = gltf.scene;
          this.currentModel = model;
          this.group.add(model);
          
          // Auto scale and center mesh inside local group
          this.autoScaleAndCenter(model, modelName);

          // Apply custom Y-offset to align ground standing points for Vesper & Cain
          if (modelName === 'eron') {
            model.position.y += -0.2; // Lower Vesper
          } else if (modelName === 'executioner') {
            model.position.y += -0.2; // Lower Cain
          }
          
          // Traverse to set shadows and update custom shaders/materials
          model.traverse((child) => {
            if (child.isMesh) {
              child.castShadow = true;
              child.receiveShadow = true;
              
              // Keep original material colors intact - no overrides
            }
          });
          
          // Setup starting position for entry animation (start 1.5 units lower in local space)
          const targetY = model.position.y;
          model.position.y = targetY - 1.5;
          
          // Rise transition
          gsap.to(model.position, {
            y: targetY,
            duration: 1.2,
            ease: "power3.out"
          });
          
          // Animations Setup using Three.js AnimationMixer
          if (gltf.animations && gltf.animations.length > 0) {
            this.mixer = new THREE.AnimationMixer(model);
            // Play first clip (typically Idle/Default action)
            const clip = gltf.animations[0];
            this.activeAction = this.mixer.clipAction(clip);
            this.activeAction.play();
          }
          
          this.isLoading = false;
          if (onLoadComplete) onLoadComplete();
        },
        (xhr) => {
          if (xhr.total > 0) {
            const percent = Math.floor((xhr.loaded / xhr.total) * 100);
            if (onProgress) onProgress(percent);
          }
        },
        (error) => {
          console.error(`Error loading GLTF model ${modelName}:`, error);
          this.isLoading = false;
          if (onLoadComplete) onLoadComplete(error);
        }
      );
    }).catch((err) => {
      console.error("MeshoptDecoder failed to initialize:", err);
      this.isLoading = false;
      if (onLoadComplete) onLoadComplete(err);
    });
  }
  
  autoScaleAndCenter(model, modelName) {
    // Generate bounding box to automatically calculate centers and heights
    const box = new THREE.Box3().setFromObject(model);
    const size = new THREE.Vector3();
    box.getSize(size);
    
    const center = new THREE.Vector3();
    box.getCenter(center);
    
    // Center mesh geometry at local group origin
    model.position.x = -center.x;
    model.position.y = -center.y;
    model.position.z = -center.z;
    
    // Scale model to a standardized height (larger scale for Solarius, slightly larger for Throg)
    const maxDim = Math.max(size.x, size.y, size.z);
    const targetSize = modelName === 'solarius' ? 10.2 : (modelName === 'throg' ? 5.5 : 4.5);
    const scaleFactor = targetSize / maxDim;
    
    model.scale.setScalar(scaleFactor);
  }
  
  clearCurrentModel() {
    if (this.currentModel) {
      this.group.remove(this.currentModel);
      this.currentModel.traverse((child) => {
        if (child.isMesh) {
          child.geometry.dispose();
          const mats = Array.isArray(child.material) ? child.material : [child.material];
          mats.forEach(mat => {
            // WebGL memory cleanup: dispose of textures to prevent VRAM leaks
            for (const key in mat) {
              if (mat[key] && mat[key].isTexture) {
                mat[key].dispose();
              }
            }
            mat.dispose();
          });
        }
      });
      this.currentModel = null;
    }
    
    if (this.mixer) {
      this.mixer.stopAllAction();
      this.mixer = null;
      this.activeAction = null;
    }
  }
  
  updateParameters(corruption, instability) {
    this.corruptionLevel = corruption / 100;
    this.instability = instability / 100 * 1.5;
    
    // Dynamically adjust material emission levels
    if (this.currentModel) {
      this.currentModel.traverse((child) => {
        if (child.isMesh && child.material) {
          const mats = Array.isArray(child.material) ? child.material : [child.material];
          mats.forEach(mat => {
            if (mat.emissive) {
              mat.emissiveIntensity = this.corruptionLevel * 5.0;
            }
          });
        }
      });
    }
    
    // Scale animation play rates based on instability
    if (this.mixer) {
      this.mixer.timeScale = 0.6 + this.instability;
    }

    // Scale sparkles speed and sizes slightly
    if (this.sparkMaterial) {
      this.sparkMaterial.size = 0.045 + (this.instability * 0.02);
    }
  }

  transitionFaction(faction, duration = 1.5) {
    let sparkColor;
    
    switch (faction) {
      case 'order': // Holy Gold
        sparkColor = new THREE.Color(0xf3e9dc);
        break;
      case 'heretics': // Purple/Violet
        sparkColor = new THREE.Color(0xa020f0);
        break;
      case 'fallen': // Crimson
      default:
        sparkColor = new THREE.Color(0xb20d21);
        break;
    }

    // Color interpolation for sparks particles
    if (this.sparkGeometry) {
      const colorAttr = this.sparkGeometry.getAttribute('color');
      if (colorAttr) {
        const colorObj = { r: colorAttr.getX(0), g: colorAttr.getY(0), b: colorAttr.getZ(0) };
        gsap.to(colorObj, {
          r: sparkColor.r,
          g: sparkColor.g,
          b: sparkColor.b,
          duration: duration,
          ease: "power2.out",
          onUpdate: () => {
            for (let i = 0; i < this.sparkCount; i++) {
              colorAttr.setXYZ(i, colorObj.r, colorObj.g, colorObj.b);
            }
            colorAttr.needsUpdate = true;
          }
        });
      }
    }
  }
  
  pulseEnergy() {
    if (!this.currentModel) return;
    
    const origScale = this.currentModel.scale.x;
    
    // Kinetic expansion bump (briefly scaling up)
    gsap.timeline()
      .to(this.currentModel.scale, {
        x: origScale * 1.2,
        y: origScale * 1.2,
        z: origScale * 1.2,
        duration: 0.15,
        ease: "power2.out"
      })
      .to(this.currentModel.scale, {
        x: origScale,
        y: origScale,
        z: origScale,
        duration: 0.6,
        ease: "power2.inOut"
      });
      
    // Flare up emissive channels
    this.currentModel.traverse((child) => {
      if (child.isMesh && child.material) {
        const mats = Array.isArray(child.material) ? child.material : [child.material];
        mats.forEach(mat => {
          if (mat.emissive) {
            const currentIntensity = mat.emissiveIntensity;
            gsap.timeline()
              .to(mat, { emissiveIntensity: Math.max(5.0, currentIntensity * 3.0), duration: 0.15 })
              .to(mat, { emissiveIntensity: currentIntensity, duration: 0.6 });
          }
        });
      }
    });

    // Momentarily speed up spark particles
    this.sparksData.forEach(data => {
      const origSpeed = data.speedY;
      gsap.timeline()
        .to(data, { speedY: origSpeed * 3.0, duration: 0.15 })
        .to(data, { speedY: origSpeed, duration: 0.6 });
    });
  }
  
  flapWings() {
    // If animations are playing, speed them up rapidly as a reactive visual feedback
    if (this.mixer) {
      const currentRate = this.mixer.timeScale;
      gsap.timeline()
        .to(this.mixer, { timeScale: currentRate * 3.0, duration: 0.25 })
        .to(this.mixer, { timeScale: currentRate, duration: 1.2, ease: "power2.inOut" });
    }
  }
  
  purgeEntity() {
    this.updateParameters(0, 10);
    this.pulseEnergy();
  }
  
  update(time, deltaTime, mouse) {
    if (!this.group.visible) return;

    if (this.currentModel) {
      if (!this.isUserDragging) {
        const timeSinceDrag = time - this.lastDragTime;
        
        // After 1.5 seconds of no dragging, smoothly restore X-rotation to 0
        if (timeSinceDrag > 1.5) {
          this.group.rotation.x += (0 - this.group.rotation.x) * 2.0 * deltaTime;
        }
        
        // Auto rotate group slowly when user is not actively dragging
        this.group.rotation.y += 0.15 * deltaTime;
      }
    }

    // Animate sparks (rising upwards from base and fading out/looping)
    if (this.sparksPoints) {
      const positions = this.sparkGeometry.getAttribute('position');
      const array = positions.array;
      const limitHeight = 1.3; // max height offset relative to center
      const speedMult = 0.8 + this.instability * 0.4;
      const count = this.sparkCount;
      
      for (let i = 0; i < count; i++) {
        const data = this.sparksData[i];
        const idx = i * 3;
        let y = array[idx + 1] + data.speedY * deltaTime * speedMult;
        
        // Reset particle if it drifts above the model head
        if (y > limitHeight) {
          y = -3.0; // reset to bottom floor
        }
        
        // Spiral motion
        data.speedAngle += deltaTime * 1.5;
        const spiralX = data.origX + Math.cos(data.speedAngle) * 0.06;
        const spiralZ = data.origZ + Math.sin(data.speedAngle) * 0.06;
        
        array[idx] = spiralX;
        array[idx + 1] = y;
        array[idx + 2] = spiralZ;
      }
      positions.needsUpdate = true;
    }
    
    // Animation clock step
    if (this.mixer) {
      this.mixer.update(deltaTime);
    }
    
    // Static Y positioning (disabled floating breathing sway, raised slightly)
    this.group.position.y = 4.0;
  }
}
