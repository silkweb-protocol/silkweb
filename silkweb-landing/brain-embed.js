/**
 * SilkWeb AI Brain – Embeddable JARVIS-style 3D visualization
 * Delicate sphere of thin icy great-circle arcs — like frozen spider silk
 *
 * Usage:
 *   <script type="module" src="brain-embed.js"></script>
 *   <script type="module">
 *     import { SilkWebBrain } from './brain-embed.js';
 *     const brain = SilkWebBrain.init(document.getElementById('container'), { color: 0xB8D4E8 });
 *     brain.triggerPulse();
 *     brain.setState('thinking');
 *     brain.setColor(0xB8D4E8);
 *     brain.destroy();
 *   </script>
 */

const CDN = 'https://unpkg.com/three@0.163.0';

// ── Perlin Noise 3D ──────────────────────────────────────────────
const _p = new Uint8Array(512);
const _g = [
  [1,1,0],[-1,1,0],[1,-1,0],[-1,-1,0],
  [1,0,1],[-1,0,1],[1,0,-1],[-1,0,-1],
  [0,1,1],[0,-1,1],[0,1,-1],[0,-1,-1]
];
(function seedNoise(){
  const p = new Uint8Array(256);
  for(let i=0;i<256;i++) p[i]=i;
  for(let i=255;i>0;i--){const j=Math.floor(Math.random()*(i+1));[p[i],p[j]]=[p[j],p[i]];}
  for(let i=0;i<512;i++) _p[i]=p[i&255];
})();
function fade(t){return t*t*t*(t*(t*6-15)+10);}
function nlerp(t,a,b){return a+t*(b-a);}
function grad(hash,x,y,z){const g=_g[hash%12];return g[0]*x+g[1]*y+g[2]*z;}
function noise3D(x,y,z){
  const X=Math.floor(x)&255,Y=Math.floor(y)&255,Z=Math.floor(z)&255;
  x-=Math.floor(x);y-=Math.floor(y);z-=Math.floor(z);
  const u=fade(x),v=fade(y),w=fade(z);
  const A=_p[X]+Y,AA=_p[A]+Z,AB=_p[A+1]+Z;
  const B=_p[X+1]+Y,BA=_p[B]+Z,BB=_p[B+1]+Z;
  return nlerp(w,
    nlerp(v,nlerp(u,grad(_p[AA],x,y,z),grad(_p[BA],x-1,y,z)),
           nlerp(u,grad(_p[AB],x,y-1,z),grad(_p[BB],x-1,y-1,z))),
    nlerp(v,nlerp(u,grad(_p[AA+1],x,y,z-1),grad(_p[BA+1],x-1,y,z-1)),
           nlerp(u,grad(_p[AB+1],x,y-1,z-1),grad(_p[BB+1],x-1,y-1,z-1)))
  );
}

async function loadThree() {
  const THREE = await import(`${CDN}/build/three.module.js`);
  const { EffectComposer } = await import(`${CDN}/examples/jsm/postprocessing/EffectComposer.js`);
  const { RenderPass } = await import(`${CDN}/examples/jsm/postprocessing/RenderPass.js`);
  const { UnrealBloomPass } = await import(`${CDN}/examples/jsm/postprocessing/UnrealBloomPass.js`);
  const { Line2 } = await import(`${CDN}/examples/jsm/lines/Line2.js`);
  const { LineMaterial } = await import(`${CDN}/examples/jsm/lines/LineMaterial.js`);
  const { LineGeometry } = await import(`${CDN}/examples/jsm/lines/LineGeometry.js`);
  return { THREE, EffectComposer, RenderPass, UnrealBloomPass, Line2, LineMaterial, LineGeometry };
}

class _SilkWebBrain {
  constructor() {
    this._instance = null;
  }

  init(container, options = {}) {
    if (this._instance) this.destroy();
    const inst = new BrainInstance(container, options);
    this._instance = inst;
    return {
      triggerPulse: () => inst.triggerPulse(),
      setState: (s) => inst.setState(s),
      setColor: (hex) => inst.setColor(hex),
      destroy: () => { inst.destroy(); this._instance = null; },
    };
  }

  triggerPulse() { this._instance?.triggerPulse(); }
  setColor(hex) { this._instance?.setColor(hex); }
  setState(s) { this._instance?.setState(s); }
  destroy() { this._instance?.destroy(); this._instance = null; }
}

class BrainInstance {
  constructor(container, options) {
    this.container = container;
    this.color = options.color || 0xB8D4E8;
    this.destroyed = false;
    this.state = 'idle';
    this.pulseValue = 0;
    this.pulseVelocity = 0;
    this.breathSpeed = 0.05;
    this.rotationSpeed = 0.0003;
    this.mouse = { x: 0, y: 0 };
    this.mouseTarget = { x: 0, y: 0 };
    this.elapsed = 0;
    this.curveUpdateTimer = 0;
    this._raf = 0;

    this.SPHERE_RADIUS = 2.2;
    this.CURVE_COUNT = 70;
    this.DUST_COUNT = 500;
    this.NODE_COUNT = 18;
    this.POINTS_PER_CURVE = 100;
    this.CURVE_UPDATE_INTERVAL = 1 / 24;

    this._mouseMoveHandler = (e) => {
      const rect = this.container.getBoundingClientRect();
      this.mouseTarget.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      this.mouseTarget.y = ((e.clientY - rect.top) / rect.height) * 2 - 1;
    };
    document.addEventListener('mousemove', this._mouseMoveHandler);

    this._loadAndBuild();
  }

  async _loadAndBuild() {
    const { THREE, EffectComposer, RenderPass, UnrealBloomPass, Line2, LineMaterial, LineGeometry } = await loadThree();
    if (this.destroyed) return;
    this.THREE = THREE;
    this.Line2 = Line2;
    this.LineMaterial = LineMaterial;
    this.LineGeometry = LineGeometry;

    const w = this.container.clientWidth || window.innerWidth;
    const h = this.container.clientHeight || window.innerHeight;

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(60, w/h, 0.1, 100);
    this.camera.position.z = 7;

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setSize(w, h);
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.0;
    this.renderer.domElement.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:0;';
    this.container.style.position = this.container.style.position || 'relative';
    this.container.appendChild(this.renderer.domElement);

    this.composer = new EffectComposer(this.renderer);
    this.composer.addPass(new RenderPass(this.scene, this.camera));
    this.composer.addPass(new UnrealBloomPass(new THREE.Vector2(w, h), 1.2, 0.6, 0.25));

    this.brainGroup = new THREE.Group();
    this.scene.add(this.brainGroup);
    this.brainColor = new THREE.Color(this.color);

    this._buildCurves(THREE, Line2, LineMaterial, LineGeometry);
    this._buildGlow(THREE);
    this._buildDust(THREE);
    this._buildNodes(THREE);

    this.clock = new THREE.Clock();

    this._ro = new ResizeObserver(() => {
      if (this.destroyed) return;
      const cw = this.container.clientWidth;
      const ch = this.container.clientHeight;
      this.camera.aspect = cw / ch;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(cw, ch);
      this.composer.setSize(cw, ch);
      for (const obj of this.line2Objects) {
        obj.material.resolution.set(cw, ch);
      }
    });
    this._ro.observe(this.container);

    this._animate();
  }

  _buildArcPositions(cd, time) {
    const THREE = this.THREE;
    const positions = [];
    for (let j = 0; j <= this.POINTS_PER_CURVE; j++) {
      const t = j / this.POINTS_PER_CURVE;
      const angle = cd.arcStart + cd.arcLength * t;

      const p = new THREE.Vector3(
        cd.radius * Math.cos(angle),
        cd.radius * Math.sin(angle),
        0
      );

      p.applyAxisAngle(cd.tiltAxis, cd.tiltAngle);

      const noiseVal = noise3D(
        p.x * 0.5 + cd.seed * 0.1,
        p.y * 0.5 + time * this.breathSpeed,
        p.z * 0.5 + cd.seed * 0.05
      ) * 0.12;
      p.multiplyScalar(1 + noiseVal);

      positions.push(p.x, p.y, p.z);
    }
    return positions;
  }

  _buildCurves(THREE, Line2, LineMaterial, LineGeometry) {
    this.curveData = [];
    this.line2Objects = [];

    for (let i = 0; i < this.CURVE_COUNT; i++) {
      const tiltAxis = new THREE.Vector3(
        Math.random() - 0.5,
        Math.random() - 0.5,
        Math.random() - 0.5
      ).normalize();
      const tiltAngle = Math.random() * Math.PI;
      const arcStart = Math.random() * Math.PI * 2;
      const arcLength = Math.PI * (0.4 + Math.random() * 1.2);
      const radius = this.SPHERE_RADIUS + (Math.random() - 0.5) * 0.6;
      const seed = i * 13.37;

      const depthFactor = (radius - (this.SPHERE_RADIUS - 0.3)) / 0.6;
      const opacity = THREE.MathUtils.lerp(0.7, 0.15, THREE.MathUtils.clamp(depthFactor, 0, 1));

      const color = new THREE.Color().lerpColors(
        new THREE.Color(0xB8D4E8),
        new THREE.Color(0xE8F0F8),
        Math.random()
      );

      const cd = { tiltAxis, tiltAngle, arcStart, arcLength, radius, seed, opacity, color };
      this.curveData.push(cd);

      const positions = this._buildArcPositions(cd, 0);
      const geometry = new LineGeometry();
      geometry.setPositions(positions);

      const w = this.container.clientWidth || window.innerWidth;
      const h = this.container.clientHeight || window.innerHeight;

      const material = new LineMaterial({
        color: color,
        linewidth: 1.0 + Math.random() * 1.0,
        transparent: true,
        opacity: opacity,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        resolution: new THREE.Vector2(w, h),
      });

      const line = new Line2(geometry, material);
      line.computeLineDistances();
      this.brainGroup.add(line);
      this.line2Objects.push({ line, geometry, material, cd, baseOpacity: opacity });
    }
  }

  _buildGlow(THREE) {
    // Small bright white core
    const coreGeo = new THREE.SphereGeometry(0.4, 24, 24);
    this.coreMat = new THREE.MeshBasicMaterial({
      color: 0xFFFFFF,
      transparent: true,
      opacity: 0.15,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    this.brainGroup.add(new THREE.Mesh(coreGeo, this.coreMat));

    // Larger ambient glow
    const ambientGeo = new THREE.SphereGeometry(1.0, 24, 24);
    this.ambientGlowMat = new THREE.MeshBasicMaterial({
      color: 0x8AB4D0,
      transparent: true,
      opacity: 0.03,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    this.brainGroup.add(new THREE.Mesh(ambientGeo, this.ambientGlowMat));
  }

  _buildDust(THREE) {
    const COUNT = this.DUST_COUNT;
    const geo = new THREE.BufferGeometry();
    const pos = new Float32Array(COUNT * 3);
    const basePos = new Float32Array(COUNT * 3);
    const sizes = new Float32Array(COUNT);
    const alphas = new Float32Array(COUNT);

    for (let i = 0; i < COUNT; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const r = this.SPHERE_RADIUS * (0.2 + Math.random() * 0.8);
      const x = r * Math.sin(phi) * Math.cos(theta);
      const y = r * Math.cos(phi);
      const z = r * Math.sin(phi) * Math.sin(theta);
      basePos[i*3] = x; basePos[i*3+1] = y; basePos[i*3+2] = z;
      pos[i*3] = x; pos[i*3+1] = y; pos[i*3+2] = z;
      sizes[i] = 0.3 + Math.random() * 0.8;
      alphas[i] = 0.05 + Math.random() * 0.10;
    }

    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));
    geo.setAttribute('aAlpha', new THREE.BufferAttribute(alphas, 1));

    const mat = new THREE.ShaderMaterial({
      uniforms: {
        uColor: { value: this.brainColor.clone() },
        uPixelRatio: { value: Math.min(devicePixelRatio, 2) },
      },
      vertexShader: `
        attribute float aSize; attribute float aAlpha;
        uniform float uPixelRatio; varying float vAlpha;
        void main(){ vAlpha=aAlpha; vec4 mv=modelViewMatrix*vec4(position,1.0);
          gl_PointSize=aSize*uPixelRatio*(3.0/-mv.z); gl_Position=projectionMatrix*mv; }`,
      fragmentShader: `
        uniform vec3 uColor; varying float vAlpha;
        void main(){ float d=length(gl_PointCoord-0.5)*2.0; if(d>1.0)discard;
          gl_FragColor=vec4(uColor,vAlpha*(1.0-d*d)); }`,
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    });

    const points = new THREE.Points(geo, mat);
    this.brainGroup.add(points);
    this.dust = { geo, pos, basePos, mat, points, count: COUNT };
  }

  _buildNodes(THREE) {
    const COUNT = this.NODE_COUNT;
    const geo = new THREE.BufferGeometry();
    const pos = new Float32Array(COUNT * 3);
    const sizes = new Float32Array(COUNT);
    const phases = new Float32Array(COUNT);

    for (let i = 0; i < COUNT; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const r = this.SPHERE_RADIUS * (0.85 + Math.random() * 0.15);
      const x = r * Math.sin(phi) * Math.cos(theta);
      const y = r * Math.cos(phi);
      const z = r * Math.sin(phi) * Math.sin(theta);
      pos[i*3] = x; pos[i*3+1] = y; pos[i*3+2] = z;
      sizes[i] = 3.0 + Math.random() * 2.0;
      phases[i] = Math.random() * Math.PI * 2;
    }

    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));
    geo.setAttribute('aPhase', new THREE.BufferAttribute(phases, 1));

    const mat = new THREE.ShaderMaterial({
      uniforms: {
        uColor: { value: new THREE.Color(0xD8ECF8) },
        uTime: { value: 0 },
        uPixelRatio: { value: Math.min(devicePixelRatio, 2) },
      },
      vertexShader: `
        attribute float aSize; attribute float aPhase;
        uniform float uTime; uniform float uPixelRatio; varying float vAlpha;
        void main(){ float pulse=0.6+0.4*sin(uTime*0.8+aPhase); vAlpha=pulse*0.7;
          vec4 mv=modelViewMatrix*vec4(position,1.0);
          gl_PointSize=aSize*pulse*uPixelRatio*(4.0/-mv.z); gl_Position=projectionMatrix*mv; }`,
      fragmentShader: `
        uniform vec3 uColor; varying float vAlpha;
        void main(){ float d=length(gl_PointCoord-0.5)*2.0; if(d>1.0)discard;
          float alpha=vAlpha*(1.0-d*d); vec3 col=mix(uColor,vec3(1.0),0.3*(1.0-d));
          gl_FragColor=vec4(col,alpha); }`,
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    });

    const points = new THREE.Points(geo, mat);
    this.brainGroup.add(points);
    this.nodes = { geo, pos, mat, points };
  }

  _animate() {
    if (this.destroyed) return;
    this._raf = requestAnimationFrame(() => this._animate());

    const THREE = this.THREE;
    const dt = Math.min(this.clock.getDelta(), 0.05);
    this.elapsed += dt;
    const t = this.elapsed;

    // Mouse easing
    this.mouse.x += (this.mouseTarget.x - this.mouse.x) * 0.04;
    this.mouse.y += (this.mouseTarget.y - this.mouse.y) * 0.04;

    // Pulse
    this.pulseValue += this.pulseVelocity * dt * 3;
    this.pulseVelocity *= 0.93;
    if (this.pulseValue > 1) this.pulseVelocity = -this.pulseValue * 1.5;
    this.pulseValue *= 0.96;
    if (Math.abs(this.pulseValue) < 0.001) this.pulseValue = 0;

    const speakExpand = this.state === 'speaking' ? Math.sin(t * 3) * 0.03 : 0;

    // Update curves (throttled)
    this.curveUpdateTimer += dt;
    if (this.curveUpdateTimer >= this.CURVE_UPDATE_INTERVAL) {
      this.curveUpdateTimer = 0;
      for (let c = 0; c < this.CURVE_COUNT; c++) {
        const obj = this.line2Objects[c];
        const cd = obj.cd;
        const positions = this._buildArcPositions(cd, t);
        if (this.pulseValue !== 0 || speakExpand !== 0) {
          const expand = 1 + this.pulseValue * 0.1 + speakExpand;
          for (let k = 0; k < positions.length; k++) {
            positions[k] *= expand;
          }
        }
        obj.geometry.setPositions(positions);
        obj.line.computeLineDistances();
      }
    }

    // Dust breathing
    const dp = this.dust.pos, dbp = this.dust.basePos;
    for (let i = 0; i < this.dust.count; i++) {
      const bx = dbp[i*3], by = dbp[i*3+1], bz = dbp[i*3+2];
      const n = noise3D(bx*0.4+t*0.08, by*0.4+t*0.06, bz*0.4+t*0.05);
      const disp = 1 + n*0.05 + this.pulseValue*0.08 + speakExpand;
      dp[i*3]=bx*disp; dp[i*3+1]=by*disp; dp[i*3+2]=bz*disp;
    }
    this.dust.geo.attributes.position.needsUpdate = true;

    // Nodes
    this.nodes.mat.uniforms.uTime.value = t;

    // Glow
    const coreOp = 0.15 + Math.sin(t * 0.3) * 0.03 + this.pulseValue * 0.05;
    this.coreMat.opacity = THREE.MathUtils.clamp(coreOp, 0.12, 0.22);
    const ambientOp = 0.03 + Math.sin(t * 0.25 + 1) * 0.008;
    this.ambientGlowMat.opacity = ambientOp;

    if (this.state === 'speaking') {
      this.coreMat.opacity += 0.03;
      this.ambientGlowMat.opacity += 0.01;
    }

    // Rotation
    this.brainGroup.rotation.y += this.rotationSpeed;
    const tx = -this.mouse.y * 0.1;
    const tz = this.mouse.x * 0.1;
    this.brainGroup.rotation.x += (tx - this.brainGroup.rotation.x) * 0.03;
    this.brainGroup.rotation.z += (tz - this.brainGroup.rotation.z) * 0.03;

    // Speaking scale
    if (this.state === 'speaking') {
      this.brainGroup.scale.setScalar(1.0 + Math.sin(t*3)*0.015);
    } else {
      this.brainGroup.scale.lerp(new THREE.Vector3(1,1,1), 0.05);
    }

    this.composer.render();
  }

  // ── Public API ────────────────────────────────────────────────────
  triggerPulse() { this.pulseVelocity = 1.0; }

  setState(s) {
    this.state = s;
    switch(s) {
      case 'thinking':
        this.breathSpeed = 0.08;
        this.rotationSpeed = 0.0006;
        break;
      case 'speaking':
        this.breathSpeed = 0.07;
        this.rotationSpeed = 0.0004;
        break;
      default:
        this.breathSpeed = 0.05;
        this.rotationSpeed = 0.0003;
    }
  }

  setColor(hex) {
    const THREE = this.THREE;
    this.brainColor.set(hex);
    // Update line materials
    for (const obj of this.line2Objects) {
      obj.material.color.copy(this.brainColor).lerp(new THREE.Color(0xE8F0F8), Math.random() * 0.3);
    }
    // Update dust and node colors
    this.dust.mat.uniforms.uColor.value.copy(this.brainColor);
    this.nodes.mat.uniforms.uColor.value.copy(this.brainColor);
  }

  destroy() {
    this.destroyed = true;
    cancelAnimationFrame(this._raf);
    document.removeEventListener('mousemove', this._mouseMoveHandler);
    if (this._ro) this._ro.disconnect();
    if (this.renderer) {
      this.renderer.dispose();
      this.renderer.domElement.remove();
    }
    if (this.composer) this.composer.dispose();
    this.brainGroup?.traverse(obj => {
      if (obj.geometry) obj.geometry.dispose();
      if (obj.material) {
        if (Array.isArray(obj.material)) obj.material.forEach(m => m.dispose());
        else obj.material.dispose();
      }
    });
  }
}

export const SilkWebBrain = new _SilkWebBrain();

if (typeof window !== 'undefined') {
  window.SilkWebBrain = SilkWebBrain;
}
