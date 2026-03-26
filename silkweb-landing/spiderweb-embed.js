/**
 * SilkWeb Hero — 3D Interactive Spider Web
 * Embeddable version. Usage:
 *
 *   <script src="spiderweb-embed.js"></script>
 *   <div id="silkweb-hero" style="width:100%;height:600px;"></div>
 *   <script>SilkWebHero.init('silkweb-hero')</script>
 *
 * API:
 *   SilkWebHero.init(containerId, options?)
 *   SilkWebHero.setOpacity(0-1)
 *   SilkWebHero.pause()
 *   SilkWebHero.resume()
 *   SilkWebHero.destroy()
 */
(function () {
  'use strict';

  const THREE_CDN = 'https://cdn.jsdelivr.net/npm/three@0.163.0/build/three.module.js';
  const BLOOM_COMPOSER = 'https://cdn.jsdelivr.net/npm/three@0.163.0/examples/jsm/postprocessing/EffectComposer.js';
  const BLOOM_RENDER = 'https://cdn.jsdelivr.net/npm/three@0.163.0/examples/jsm/postprocessing/RenderPass.js';
  const BLOOM_PASS = 'https://cdn.jsdelivr.net/npm/three@0.163.0/examples/jsm/postprocessing/UnrealBloomPass.js';

  let _instance = null;

  window.SilkWebHero = {
    init: function (containerId, options) {
      if (_instance) _instance.destroy();
      _instance = new SilkWebInstance(containerId, options || {});
      return _instance;
    },
    setOpacity: function (v) { if (_instance) _instance.opacity = Math.max(0, Math.min(1, v)); },
    pause: function () { if (_instance) _instance.paused = true; },
    resume: function () { if (_instance) _instance.paused = false; },
    destroy: function () { if (_instance) { _instance.destroy(); _instance = null; } },
  };

  function SilkWebInstance(containerId, opts) {
    const self = this;
    self.container = document.getElementById(containerId);
    if (!self.container) { console.error('SilkWebHero: container not found:', containerId); return; }

    self.opacity = opts.opacity !== undefined ? opts.opacity : 1;
    self.paused = false;
    self._destroyed = false;
    self._rafId = null;

    // Load Three.js via dynamic import
    self._boot(opts);
  }

  SilkWebInstance.prototype._boot = async function (opts) {
    const self = this;
    let THREE, EffectComposer, RenderPass, UnrealBloomPass;

    try {
      const [threeModule, composerModule, renderModule, bloomModule] = await Promise.all([
        import(THREE_CDN),
        import(BLOOM_COMPOSER),
        import(BLOOM_RENDER),
        import(BLOOM_PASS),
      ]);
      THREE = threeModule;
      EffectComposer = composerModule.EffectComposer;
      RenderPass = renderModule.RenderPass;
      UnrealBloomPass = bloomModule.UnrealBloomPass;
    } catch (e) {
      console.error('SilkWebHero: failed to load Three.js', e);
      return;
    }

    if (self._destroyed) return;

    // ─── Config ──────────────────────────────────────────────────
    const CFG = {
      spokes: 10,
      spiralRings: 22,
      webRadius: 5.2,
      spiralStart: 0.6,
      sagAmount: 0.12,
      threadColor: new THREE.Color(0x94A3B8),
      nodeColor: new THREE.Color(0x4F46E5),
      centerGlow: new THREE.Color(0x6366F1),
      particleColor: new THREE.Color(0xCBD5E1),
      mouseInfluence: 1.8,
      mouseRadius: 3.0,
      ambientWind: 0.003,
      windSpeed: 0.4,
      autoRotate: 0.00012,
      cameraAngle: 15 * Math.PI / 180,
      bloomStr: 0.35,
      bloomRad: 0.6,
      bloomThr: 0.2,
      particles: 120,
    };

    // ─── State ───────────────────────────────────────────────────
    const mouse = new THREE.Vector2(9999, 9999);
    const mouseW = new THREE.Vector3(9999, 9999, 0);
    let scrollY = 0;
    let isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

    // ─── Scene ───────────────────────────────────────────────────
    const rect = self.container.getBoundingClientRect();
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, rect.width / rect.height, 0.1, 100);
    camera.position.set(0, 1.2, 9);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(rect.width, rect.height);
    renderer.setClearColor(0x000000, 0);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;

    const canvas = renderer.domElement;
    canvas.style.position = 'absolute';
    canvas.style.top = '0';
    canvas.style.left = '0';
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    canvas.style.pointerEvents = 'none';
    canvas.style.zIndex = '0';

    self.container.style.position = self.container.style.position || 'relative';
    self.container.appendChild(canvas);
    self._canvas = canvas;

    // Post-processing
    const composer = new EffectComposer(renderer);
    composer.addPass(new RenderPass(scene, camera));
    composer.addPass(new UnrealBloomPass(
      new THREE.Vector2(rect.width, rect.height),
      CFG.bloomStr, CFG.bloomRad, CFG.bloomThr
    ));

    // Lights
    scene.add(new THREE.AmbientLight(0xffffff, 0.4));
    const dir = new THREE.DirectionalLight(0xf0f4ff, 0.8);
    dir.position.set(-5, 8, 5);
    scene.add(dir);
    const rim = new THREE.DirectionalLight(0xe0e7ff, 0.3);
    rim.position.set(5, -3, 8);
    scene.add(rim);

    // ─── Web Build ───────────────────────────────────────────────
    const webGroup = new THREE.Group();
    webGroup.rotation.x = CFG.cameraAngle;
    scene.add(webGroup);

    const nodes = [];
    const threads = [];

    function addN(x, y, z) {
      const p = new THREE.Vector3(x, y, z);
      const i = nodes.length;
      nodes.push({ pos: p.clone(), rest: p.clone(), vel: new THREE.Vector3() });
      return i;
    }

    const centerIdx = addN(0, 0, 0);
    const spokeAngles = [];
    const ringNodes = [];

    for (let i = 0; i < CFG.spokes; i++) {
      spokeAngles.push((i / CFG.spokes) * Math.PI * 2 + (Math.random() - 0.5) * 0.15);
    }

    for (let r = 0; r < CFG.spiralRings; r++) {
      ringNodes[r] = [];
      const prog = (r + 1) / CFG.spiralRings;
      const rad = CFG.spiralStart + (CFG.webRadius - CFG.spiralStart) * prog;
      const rj = 1 + (Math.random() - 0.5) * 0.08;

      for (let s = 0; s < CFG.spokes; s++) {
        const a = spokeAngles[s];
        const rr = rad * rj * (1 + (Math.random() - 0.5) * 0.05);
        ringNodes[r][s] = addN(Math.cos(a) * rr, Math.sin(a) * rr, (Math.random() - 0.5) * 0.15);
      }
    }

    // Spokes
    for (let s = 0; s < CFG.spokes; s++) {
      const t = [centerIdx];
      for (let r = 0; r < CFG.spiralRings; r++) t.push(ringNodes[r][s]);
      threads.push(t);
    }

    // Spirals
    for (let r = 1; r < CFG.spiralRings; r++) {
      if (r < 3 && Math.random() > 0.5) continue;
      const t = [];
      for (let s = 0; s <= CFG.spokes; s++) t.push(ringNodes[r][s % CFG.spokes]);
      threads.push(t);
    }

    // Sag
    for (const seg of threads) {
      if (seg.length < 3) continue;
      for (let i = 1; i < seg.length - 1; i++) {
        const n = nodes[seg[i]], p = nodes[seg[i - 1]], nx = nodes[seg[i + 1]];
        const d = p.rest.distanceTo(nx.rest);
        const t2 = n.rest.clone().sub(p.rest).length() / d;
        const sf = 4 * t2 * (1 - t2);
        n.rest.y -= sf * CFG.sagAmount * 0.3 * d;
        n.pos.copy(n.rest);
      }
    }

    // Thread materials + lines
    const tMat = new THREE.LineBasicMaterial({ color: CFG.threadColor, transparent: true, opacity: 0.55 });
    const threadObjs = [];
    for (const seg of threads) {
      const pos = new Float32Array(seg.length * 3);
      for (let i = 0; i < seg.length; i++) {
        const p = nodes[seg[i]].pos;
        pos[i * 3] = p.x; pos[i * 3 + 1] = p.y; pos[i * 3 + 2] = p.z;
      }
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      const l = new THREE.Line(g, tMat.clone());
      webGroup.add(l);
      threadObjs.push({ line: l, idx: seg });
    }

    // Node points
    const nPos = new Float32Array(nodes.length * 3);
    for (let i = 0; i < nodes.length; i++) {
      nPos[i * 3] = nodes[i].pos.x; nPos[i * 3 + 1] = nodes[i].pos.y; nPos[i * 3 + 2] = nodes[i].pos.z;
    }
    const nGeom = new THREE.BufferGeometry();
    nGeom.setAttribute('position', new THREE.BufferAttribute(nPos, 3));
    const nMat = new THREE.PointsMaterial({
      color: CFG.nodeColor, size: 0.06, transparent: true, opacity: 0.9,
      sizeAttenuation: true, blending: THREE.AdditiveBlending,
    });
    const nodePts = new THREE.Points(nGeom, nMat);
    webGroup.add(nodePts);

    // Center glow
    const cMat1 = new THREE.SpriteMaterial({ color: CFG.centerGlow, transparent: true, opacity: 0.6, blending: THREE.AdditiveBlending });
    const cSpr1 = new THREE.Sprite(cMat1); cSpr1.scale.set(1, 1, 1); webGroup.add(cSpr1);
    const cMat2 = new THREE.SpriteMaterial({ color: CFG.centerGlow, transparent: true, opacity: 0.2, blending: THREE.AdditiveBlending });
    const cSpr2 = new THREE.Sprite(cMat2); cSpr2.scale.set(2.2, 2.2, 1); webGroup.add(cSpr2);

    // Particles
    const pCount = CFG.particles;
    const pPos = new Float32Array(pCount * 3);
    const pData = [];
    for (let i = 0; i < pCount; i++) {
      const a = Math.random() * Math.PI * 2, rd = 1.5 + Math.random() * 5;
      const x = Math.cos(a) * rd, y = Math.sin(a) * rd, z = (Math.random() - 0.5) * 3;
      pPos[i * 3] = x; pPos[i * 3 + 1] = y; pPos[i * 3 + 2] = z;
      pData.push({
        bx: x, by: y, bz: z,
        sx: (Math.random() - 0.5) * 0.003, sy: (Math.random() - 0.5) * 0.003, sz: (Math.random() - 0.5) * 0.001,
        ph: Math.random() * Math.PI * 2,
      });
    }
    const pGeom = new THREE.BufferGeometry();
    pGeom.setAttribute('position', new THREE.BufferAttribute(pPos, 3));
    const pMat = new THREE.PointsMaterial({
      color: CFG.particleColor, size: 0.04, transparent: true, opacity: 0.35,
      sizeAttenuation: true, blending: THREE.AdditiveBlending,
    });
    const parts = new THREE.Points(pGeom, pMat);
    scene.add(parts);

    // ─── Interaction ─────────────────────────────────────────────
    const rc = new THREE.Raycaster();
    const plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);

    function onMouse(mx, my) {
      const r2 = self.container.getBoundingClientRect();
      mouse.x = ((mx - r2.left) / r2.width) * 2 - 1;
      mouse.y = -((my - r2.top) / r2.height) * 2 + 1;
      rc.setFromCamera(mouse, camera);
      const t = new THREE.Vector3();
      rc.ray.intersectPlane(plane, t);
      if (t) {
        const inv = new THREE.Matrix4().copy(webGroup.matrixWorld).invert();
        t.applyMatrix4(inv);
        mouseW.copy(t);
      }
    }

    const _onMM = (e) => onMouse(e.clientX, e.clientY);
    const _onTM = (e) => { if (e.touches.length) onMouse(e.touches[0].clientX, e.touches[0].clientY); };
    const _onTE = () => mouseW.set(9999, 9999, 0);
    const _onScroll = () => { scrollY = window.scrollY || 0; };
    const _onResize = () => {
      const r2 = self.container.getBoundingClientRect();
      camera.aspect = r2.width / r2.height;
      camera.updateProjectionMatrix();
      renderer.setSize(r2.width, r2.height);
      composer.setSize(r2.width, r2.height);
    };

    window.addEventListener('mousemove', _onMM, { passive: true });
    window.addEventListener('touchmove', _onTM, { passive: true });
    window.addEventListener('touchend', _onTE, { passive: true });
    window.addEventListener('scroll', _onScroll, { passive: true });
    window.addEventListener('resize', _onResize);

    self._cleanup = () => {
      window.removeEventListener('mousemove', _onMM);
      window.removeEventListener('touchmove', _onTM);
      window.removeEventListener('touchend', _onTE);
      window.removeEventListener('scroll', _onScroll);
      window.removeEventListener('resize', _onResize);
    };

    // ─── Animation ───────────────────────────────────────────────
    const clock = new THREE.Clock();
    let elapsed = 0;

    function tick() {
      if (self._destroyed) return;
      self._rafId = requestAnimationFrame(tick);
      if (self.paused) return;

      const dt = Math.min(clock.getDelta(), 0.05);
      elapsed += dt;

      webGroup.rotation.z += CFG.autoRotate;
      webGroup.position.y = -scrollY * 0.0004;

      const wx = Math.sin(elapsed * CFG.windSpeed) * CFG.ambientWind;
      const wy = Math.cos(elapsed * CFG.windSpeed * 0.7) * CFG.ambientWind * 0.6;

      let msx = 0, msy = 0;
      if (isMobile) { msx = Math.sin(elapsed * 0.3) * 0.15; msy = Math.cos(elapsed * 0.25) * 0.1; }

      for (let i = 0; i < nodes.length; i++) {
        const n = nodes[i];
        const wd = new THREE.Vector3(
          wx * (1 + n.rest.length() * 0.3) + msx * 0.02,
          wy * (1 + n.rest.length() * 0.3) + msy * 0.02,
          Math.sin(elapsed * 0.5 + n.rest.x * 0.5) * 0.002
        );
        let md = new THREE.Vector3();
        if (mouseW.x < 1000) {
          const diff = new THREE.Vector3().subVectors(n.rest, mouseW);
          const dist = diff.length();
          if (dist < CFG.mouseRadius) {
            const s = (1 - dist / CFG.mouseRadius);
            const e2 = s * s * (3 - 2 * s) * CFG.mouseInfluence;
            md.copy(diff).normalize().multiplyScalar(e2 * 0.3);
            md.z += e2 * 0.15;
          }
        }
        const tgt = n.rest.clone().add(wd).add(md);
        const f = tgt.clone().sub(n.pos).multiplyScalar(3.5);
        n.vel.add(f.multiplyScalar(dt));
        n.vel.multiplyScalar(0.85);
        n.pos.add(n.vel.clone().multiplyScalar(dt));
      }

      for (const { line, idx: seg } of threadObjs) {
        const a = line.geometry.attributes.position;
        for (let i = 0; i < seg.length; i++) {
          const p = nodes[seg[i]].pos;
          a.array[i * 3] = p.x; a.array[i * 3 + 1] = p.y; a.array[i * 3 + 2] = p.z;
        }
        a.needsUpdate = true;
      }

      const na = nodePts.geometry.attributes.position;
      for (let i = 0; i < nodes.length; i++) {
        na.array[i * 3] = nodes[i].pos.x; na.array[i * 3 + 1] = nodes[i].pos.y; na.array[i * 3 + 2] = nodes[i].pos.z;
      }
      na.needsUpdate = true;

      cSpr1.position.copy(nodes[0].pos);
      cSpr2.position.copy(nodes[0].pos);
      const pulse = 0.55 + Math.sin(elapsed * 1.2) * 0.08;
      cMat1.opacity = pulse * self.opacity;
      cMat2.opacity = pulse * 0.35 * self.opacity;

      const pa = parts.geometry.attributes.position;
      for (let i = 0; i < pCount; i++) {
        const d = pData[i];
        pa.array[i * 3] = d.bx + Math.sin(elapsed * d.sx * 100 + d.ph) * 0.5;
        pa.array[i * 3 + 1] = d.by + Math.cos(elapsed * d.sy * 100 + d.ph) * 0.5;
        pa.array[i * 3 + 2] = d.bz + Math.sin(elapsed * d.sz * 80 + d.ph * 2) * 0.3;
      }
      pa.needsUpdate = true;

      pMat.opacity = (0.25 + Math.sin(elapsed * 0.8) * 0.1) * self.opacity;
      nMat.opacity = 0.9 * self.opacity;

      for (const { line, idx: seg } of threadObjs) {
        const avg = nodes[seg[Math.floor(seg.length / 2)]].rest.length();
        line.material.opacity = (0.3 + 0.7 * (1 - avg / CFG.webRadius)) * 0.55 * self.opacity;
      }

      composer.render();
    }

    tick();
  };

  SilkWebInstance.prototype.destroy = function () {
    this._destroyed = true;
    if (this._rafId) cancelAnimationFrame(this._rafId);
    if (this._cleanup) this._cleanup();
    if (this._canvas && this._canvas.parentNode) this._canvas.parentNode.removeChild(this._canvas);
  };
})();
