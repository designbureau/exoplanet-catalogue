// FWDDSImageManager — parity tweaks to match source.js colors exactly
// Key changes vs your last version:
// 1) Renderer uses premultipliedAlpha:true + alpha:true
// 2) World-space light (1,1,1).normalize(), passed directly (no view transform)
// 3) Shader uniforms match original defaults (uVisibility = 1.0 etc.)
// 4) CubeRT resolution 1024 on desktop for crisper color/contrast
// 5) Assumes your GLSL implements: world-space normal in getAlpha(),
//    brightnessToColor() identical to original, premultiply rgb by alpha.

import FWDDSDisplayObject from "./FWDDSDisplayObject";
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import sunSphereFS from "./shader/sunSphereFS.glsl";
import sunSphereVS from "./shader/sunSphereVS.glsl";
import perlinFS from "./shader/perlinFS.glsl";
import perlinVS from "./shader/perlinVS.glsl";
import glowFS from "./shader/glowFS.glsl";
import glowVS from "./shader/glowVS.glsl";
import sunRaysVS from "./shader/sunRaysVS.glsl";
import sunRaysFS from "./shader/sunRaysFS.glsl";
import sunFlaresVS from "./shader/sunFlaresVS.glsl";
import sunFlaresFS from "./shader/sunFlaresFS.glsl";

import { GUI } from "dat.gui";
import FWDDSUtils from "./FWDDSUtils";

export default class FWDDSImageManager extends FWDDSDisplayObject{

    static ERROR = 'error';
    static FIRST_IMAGE_LOADED = 'firstImageLoaded';
    static TEXTURES_LOADED = 'texturesLoaded';

    constructor(prt){
        super();
        this.prt = prt;
        this.data = this.prt.data;
        this.width = this.prt.width;
        this.height = this.prt.height;

        // 3D
        this.clock = new THREE.Clock();
        this.oldElapsedTime = 0;
        this.totalItems = this.data.sliderData.length;
        this.curId = 0;
        this.isDragging = false;
        this.destination = {x:0, y:0};
        this.cameraZ = 3;
        this.time = 0;
        this.isPlaying = true;
        this.isMobile = FWDDSUtils.isMobile;
        this._WorldTmpV3 = new THREE.Vector3();
        this.deltaTime = 0;

        // Scene + renderer (parity: premultiplied alpha)
        this.sunScene =  new THREE.Scene();
        this.sunGroup = new THREE.Group();
        this.yawPivot = new THREE.Group();   // rotates around world Y
        this.pitchPivot = new THREE.Group(); // rotates around local X
        this.sunScene.add(this.yawPivot);
        this.yawPivot.add(this.pitchPivot);
        this.pitchPivot.add(this.sunGroup);


       // renderer: make the canvas opaque black
        this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, premultipliedAlpha: true });
        // or keep alpha:true but clear with alpha 1
        this.renderer.setClearColor(0x000000, 1);  // was alpha 0

        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.outputColorSpace = THREE.SRGBColorSpace;
        this.renderer.toneMapping = THREE.NoToneMapping;
        this.renderer.toneMappingExposure = 1.0;

        this.screen.appendChild(this.renderer.domElement);

        this.camera = new THREE.PerspectiveCamera(70, this.width/this.height, 0.1, 200);
        // --- Orthographic camera ---
        const aspect = this.width / this.height;
        const viewSize = 4; // vertical size in world units; tweak to fit your carousel
        const halfH = viewSize / 2;
        const halfW = (viewSize * aspect) / 2;

        this.camera = new THREE.OrthographicCamera(
            -halfW,   // left
            halfW,   // right
            halfH,   // top
            -halfH,   // bottom
            0.1,     // near
            200      // far
        );
        this.camera.position.set(0, 0, this.cameraZ);
        this.camera.lookAt(0, 0, 0);
        this.camera.updateProjectionMatrix();
    

        // Controls
        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableRotate = false;     // we rotate the sun ourselves
        this.controls.enableZoom   = true;
        this.controls.enablePan    = false;


        
        // Load & init
        this.addPerlinCube();
        this.addSun();
        this.addGlow();
        this.addSunRays()
        this.addSunFlares();

        this.setupGUI();
        this.addRoateEvents();
        this.resize();
        this.render();
    }


    // Add rotate events
    addRoateEvents() {
        this.renderer.domElement.addEventListener('contextmenu', e => e.preventDefault());
        const el = this.renderer.domElement;
        el.style.touchAction = 'none';
        document.body.style.cursor = 'grab';
        
        this._dragButton = -1;
        this._anyPointerDown = false;   // <- NEW: any mouse button pre

        // state
        this._dragging = false;
        this._lastX = 0;
        this._lastY = 0;

        // orientations
        this._orient       = new THREE.Quaternion();
        this._targetOrient = new THREE.Quaternion();

        // initialize from the group's current orientation (IMPORTANT!)
        this._orient.copy(this.sunGroup.quaternion);
        this._targetOrient.copy(this.sunGroup.quaternion);

        // tuning
        this._SPEED_YAW   = 0.003;   // px -> rad (inverted horizontally)
        this._SPEED_PITCH = 0.003;   // px -> rad (inverted vertically)
        this._IDLE_YAW    = -0.08;   // rad/sec (negative = inverse idle)
        this._DAMP_LAMBDA = 4.0;    // damping strength (8–20 good)

        // scratch
        this._qYaw     = new THREE.Quaternion();
        this._qPitch   = new THREE.Quaternion();
        this._worldUp  = new THREE.Vector3(0, 1, 0);
        this._camRight = new THREE.Vector3();

        // handlers
        this._onPointerDown = this._onPointerDown.bind(this);
        this._onPointerMove = this._onPointerMove.bind(this);
        this._onPointerUp   = this._onPointerUp.bind(this);

        el.addEventListener('pointerdown', this._onPointerDown, { passive: false });
        el.addEventListener('pointermove', this._onPointerMove, { passive: false });
        el.addEventListener('pointerup',   this._onPointerUp,   { passive: false });
        el.addEventListener('pointerleave',this._onPointerUp,   { passive: false });
    }

    _onPointerDown(e) {
        this._anyPointerDown = true;          // <- NEW
        if (e.button !== 0) return;           // only left starts our rotation
        e.preventDefault();

        this._dragging = true;
        this._dragButton = 0;
        this._lastX = e.clientX;
        this._lastY = e.clientY;
        document.body.style.cursor = 'grabbing';

        if (this.controls) this.controls.enabled = false; // only disable for left
        e.target.setPointerCapture?.(e.pointerId);
    }

    _onPointerMove(e) {
        if (!this._dragging) return;          // only when left-dragging
        // guard: if left button not held anymore, bail (prevents right-drag from rotating)
        if ((e.buttons & 1) === 0) return;    // <- NEW (bitmask: 1 = left)
        e.preventDefault();

        const dx = e.clientX - this._lastX;
        const dy = e.clientY - this._lastY;
        this._lastX = e.clientX;
        this._lastY = e.clientY;

        const yawAngle   =  dx * this._SPEED_YAW;
        this._qYaw.setFromAxisAngle(this._worldUp, yawAngle);

        this._camRight.set(1,0,0).applyQuaternion(this.camera.quaternion).normalize();
        const pitchAngle =  dy * this._SPEED_PITCH;
        this._qPitch.setFromAxisAngle(this._camRight, pitchAngle);

        this._targetOrient.premultiply(this._qYaw);
        this._targetOrient.premultiply(this._qPitch);
        this._targetOrient.normalize();
    }

    _onPointerUp(e) {
        // if no buttons are held anymore, clear the flag
        // (on some browsers pointerup fires once per button)
        if (e.buttons === 0) this._anyPointerDown = false;   // <- NEW
        document.body.style.cursor = 'grab';
        if (this._dragButton === 0) {
            if (this.controls) this.controls.enabled = true;   // re-enable after left drag
        }
        this._dragging = false;
        this._dragButton = -1;
        e.target.releasePointerCapture?.(e.pointerId);
    }



    // Call this from render(deltaTime)
    updateRotateEvents(deltaTime) {
        // bail if dt is invalid (prevents NaN)
        if (!(deltaTime > 0) || !isFinite(deltaTime)) return;

        // idle spin when not dragging
        if (!this._dragging) {
            const dYaw = this._IDLE_YAW * deltaTime * -1;
            this._qYaw.setFromAxisAngle(this._worldUp, dYaw);
            this._targetOrient.premultiply(this._qYaw);
            this._targetOrient.normalize();
        }

        // framerate-independent damping
        const alphaRaw = 1.0 - Math.exp(-this._DAMP_LAMBDA * deltaTime);
        const alpha = Math.min(Math.max(alphaRaw, 0), 1); // clamp

        // slerp current -> target safely
        this._orient.slerpQuaternions(this._orient, this._targetOrient, alpha);

        // if any component is NaN (just in case), keep last valid
        if (Number.isNaN(this._orient.x) || Number.isNaN(this._orient.y) || Number.isNaN(this._orient.z) || Number.isNaN(this._orient.w)) {
            return; // don't apply a bad quaternion
        }

        // apply to the group
        this.sunGroup.quaternion.copy(this._orient);
    }






    // Perlin cubemap bake (use higher res on desktop like original)
    addPerlinCube(){
        this.perlinScene = new THREE.Scene();

        const res =  512; // parity with original
        this.cubeRT = new THREE.WebGLCubeRenderTarget(res, {
            format: THREE.RGBAFormat,
            type: THREE.UnsignedByteType,
            generateMipmaps: false
        });
        this.cubeCam = new THREE.CubeCamera(0.1, 100, this.cubeRT);

        this.perlinMat = new THREE.ShaderMaterial({
            vertexShader: perlinVS,
            fragmentShader: perlinFS,
            depthWrite: false,
            side: THREE.BackSide,
            uniforms: {
                uTime:              { value: 0 },
                uSpatialFrequency:  { value: 6 },
                uTemporalFrequency: { value: .1 },
                uH:                 { value: 1 },
                uContrast:          { value: .25 },
                uFlatten:           { value: .72 }
            }
        });

        const geo = new THREE.BoxGeometry(2, 2, 2, 1, 1, 1);
        this.perlinBox = new THREE.Mesh(geo, this.perlinMat);
        this.perlinScene.add(this.perlinBox);
    }

    renderPerlinCubemap(){
        if (!this.cubeCam || !this.perlinScene) return;
        this.perlinMat.uniforms.uTime.value = this.time * 0.1;
        this.cubeCam.update(this.renderer, this.perlinScene);
    }

    // Sun pass (sphere only — matches original sphere material state)
    addSun(){
        if (this.sunMesh) return;

        // Parity: world-space light (1,1,1).normalize()
        // Match original scene look: keep a warmer, asymmetric light
        this.lightDirWorld = new THREE.Vector3(1, 1, 1).normalize();

        this.settings = this.settings || {
            transitionProgress: 0.3,
            RGBDistortionProgress: 0,
            curveOffset: 0
        };

        this.sunMaterial = new THREE.ShaderMaterial({
            vertexShader: sunSphereVS,
            fragmentShader: sunSphereFS,
            transparent: true,
            premultipliedAlpha: true,          // sphere: premultiplied output
            blending: THREE.NormalBlending,
            depthWrite: true,
            uniforms: {
                uTime:              { value: 0 },
                uPerlinCube:        { value: this.cubeRT.texture },
                uFresnelPower:      { value: 1.0 },
                uFresnelInfluence:  { value: 0.8 },
                uTint:              { value: 0.2 },
                uBase:              { value: 4.0 },
                uBrightnessOffset:  { value: 1 },
                uBrightness:        { value: 0.6 },
                uVisibility:        { value: 1 },   // parity default
                uDirection:         { value: 1.0 },
                uLightView:         { value: this.lightDirWorld.clone() } // WORLD SPACE
            }
        });

        this.geometry = new THREE.SphereGeometry(1.5, 64, 64);
        this.sunMesh = new THREE.Mesh(this.geometry, this.sunMaterial);
        this.sunGroup.add(this.sunMesh);
    }


    // Add glow
    addGlow(){
        // Annular billboard: two rings (inner z=0, outer z=1) — no center vertex
        const segments = 134;
        const rSphere = 1.49;

        const positions = new Float32Array(3 * (2 * segments));
        let r = 0;
        for (let a = 0; a < segments; a++) {
            const s = (a / segments) * Math.PI * 2.0;
            const sx = Math.sin(s) * rSphere;
            const sy = Math.cos(s) * rSphere;
            // inner ring (vRadial = 0)
            positions[r++] = sx; positions[r++] = sy; positions[r++] = 0.0;
            // outer ring (vRadial = 1)
            positions[r++] = sx; positions[r++] = sy; positions[r++] = 1.0;
        }
        const indices = new Uint16Array(2 * segments * 3);

        let o = 0;
        for (let a = 0; a < segments; a++) {
            const i0 = 2 * a;
            const i1 = 2 * a + 1;
            const i2 = 2 * ((a + 1) % segments);
            const i3 = i2 + 1;
            
            // quad as two triangles
            indices[o++] = i0; indices[o++] = i1; indices[o++] = i2;
            indices[o++] = i2; indices[o++] = i1; indices[o++] = i3;
        }
        const glowGeo = new THREE.BufferGeometry();
        glowGeo.setAttribute('aPos', new THREE.Float32BufferAttribute(positions, 3));
        glowGeo.setIndex(new THREE.BufferAttribute(indices, 1));

        this.glowMaterial = new THREE.ShaderMaterial({
            vertexShader: glowVS,
            fragmentShader: glowFS,
            transparent: true,
            premultipliedAlpha: true,
            depthWrite: false,
            depthTest: false,              // draw glow on top of sphere
            blending: THREE.NormalBlending,
            side: THREE.DoubleSide,
            uniforms: {
                uViewProjection: { value: new THREE.Matrix4() },
                uRadius:        { value: 0.4 },
                uTint:          { value: 0.4 },
                uBrightness:    { value: 1.06 },
                uFalloffColor:  { value: 0.5 },
                uCamUp:         { value: new THREE.Vector3(0,1,0) },
                uCamPos:        { value: new THREE.Vector3() },
                // visibility uniforms used in includes/visibility.glsl
                uVisibility:    { value: this.sunMaterial.uniforms.uVisibility.value },
                uDirection:     { value: this.sunMaterial.uniforms.uDirection.value },
                uLightView:     { value: this.lightDirWorld.clone() }
            }
        });

        this.glowMesh = new THREE.Mesh(glowGeo, this.glowMaterial);
        this.glowMesh.frustumCulled = false;
        this.glowMesh.renderOrder = 2; // after both sun passes
        this.sunGroup.add(this.glowMesh);
    }


    updateGlow(){
        if (!this.glowMaterial) return;

        // ensure latest camera matrices (important when orbiting)
        this.camera.updateMatrixWorld(true);
        this.camera.updateProjectionMatrix();

        // Compute view matrix NOW (matrixWorldInverse may lag until render)
        const view = new THREE.Matrix4().copy(this.camera.matrixWorld).invert();
        const vp   = new THREE.Matrix4().multiplyMatrices(this.camera.projectionMatrix, view);
        this.glowMaterial.uniforms.uViewProjection.value.copy(vp);

        // camera up (world space)
        const camUp = new THREE.Vector3(0,1,0).applyQuaternion(this.camera.quaternion).normalize();
        this.glowMaterial.uniforms.uCamUp.value.copy(camUp);

        // camera world position
        const camPos = new THREE.Vector3();
        this.camera.getWorldPosition(camPos);
        this.glowMaterial.uniforms.uCamPos.value.copy(camPos);

        // keep visibility/light synced
        this.glowMaterial.uniforms.uLightView.value.copy(this.lightDirWorld);
        this.glowMaterial.uniforms.uVisibility.value = this.sunMaterial.uniforms.uVisibility.value;
        this.glowMaterial.uniforms.uDirection.value  = this.sunMaterial.uniforms.uDirection.value;
    }


    // === Add this method to FWDDSImageManager ===
    addSunRays(lowres = this.isMobile) {
        if (this.sunRaysMesh) return;

        // Match source.js counts: desktop = 4095×8, lowres = 1024×4
        const lineCount  = lowres ? 1024 : 4095;
        const lineLength = lowres ? 4    : 8;
        const sunRadius = 1.49; // matches sphere radius

        // Build ribbons geometry exactly like source.js: attributes aPos, aPos0, aWireRandom + indices
        const vertsPerSegment = 2;           // two verts per step (inner/outer)
        const stridePos = 3, strideRnd = 4;
        const totalVerts = lineCount * lineLength * vertsPerSegment;

        const aPos      = new Float32Array(totalVerts * stridePos);   // (u along ray, u across wirestrip [-1,1] in z)
        const aPos0     = new Float32Array(totalVerts * stridePos);   // base direction on unit sphere per wire
        const aWireRand = new Float32Array(totalVerts * strideRnd);   // 4 randoms per wire
        const indices   = new Uint16Array(lineCount * (lineLength - 1) * 2 * 3);

        // scratch
        const base = new THREE.Vector3();
        const jitter = new THREE.Vector3();
        const held = new THREE.Vector3();

        let ip = 0, i0 = 0, ir = 0, ii = 0;

        // Helper to randomize a unit vector (like source Xi.randomizeSphere)
        const randomUnit = (v) => {
            // uniform on sphere
            const z = Math.random() * 2 - 1;
            const t = Math.random() * Math.PI * 2;
            const r = Math.sqrt(1 - z*z);
            v.set(r * Math.cos(t), r * Math.sin(t), z);
            return v;
        };

        // Iterate wires
        for (let v = 0; v < lineCount; v++) {
            // Occasionally change the held direction + wire rand (exact pattern: change on first wire or ~10%)
            if (Math.random() < 0.1 || v === 0) {
            randomUnit(held).normalize();
            // nothing else; d,p come from Math.random in original
            var d = Math.random();
            var p = Math.random();
            }
            // base = held + small jitter, then normalize
            base.copy(held);
            randomUnit(jitter).multiplyScalar(0.025);
            base.add(jitter).normalize();

            // four randoms stored per vertex for this wire
            const rands = [d, p, Math.random(), Math.random()];

            for (let m = 0; m < lineLength; m++) {
            const vertBase = 2 * (v * lineLength + m); // two verts per step

            for (let y = 0; y <= 1; y++) {
                // aPos: (uAlong, uWire, signZ) — the original packs 3 values; here we mirror:
                aPos[ip++] = (m + 0.5) / lineLength;     // progress along ribbon (0..1)
                aPos[ip++] = (v + 0.5) / lineCount;      // wire index fraction (unused in math, but preserved)
                aPos[ip++] = 2 * y - 1;                  // -1 or +1 strip side (stored in z like source)

                // aWireRandom: copy the 4 randoms
                for (let t = 0; t < 4; t++) aWireRand[ir++] = rands[t];

                // aPos0: the unit direction of this wire
                aPos0[i0++] = base.x * sunRadius;
                aPos0[i0++] = base.y * sunRadius;
                aPos0[i0++] = base.z * sunRadius;
            }

            // indices: two tris per quad between this step and next step
            if (m < lineLength - 1) {
                const a = vertBase + 0;
                const b = vertBase + 1;
                const c = vertBase + 2;
                const d = vertBase + 3;
                indices[ii++] = a; indices[ii++] = b; indices[ii++] = c;
                indices[ii++] = c; indices[ii++] = b; indices[ii++] = d;
            }
            }
        }

        const geo = new THREE.BufferGeometry();
        geo.setAttribute('aPos',       new THREE.BufferAttribute(aPos, 3));
        geo.setAttribute('aPos0',      new THREE.BufferAttribute(aPos0, 3));
        geo.setAttribute('aWireRandom',new THREE.BufferAttribute(aWireRand, 4));
        geo.setIndex(new THREE.BufferAttribute(indices, 1));

        // Material: use your external shaders sunRaysVS/sunRaysFS with premultiplied alpha
        this.sunRaysMaterial = new THREE.ShaderMaterial({
            vertexShader:   sunRaysVS,
            fragmentShader: sunRaysFS,
            transparent: true,
            premultipliedAlpha: true,
            depthWrite: false,
            depthTest: true,
            blending: THREE.AdditiveBlending,
            side: THREE.DoubleSide,
            uniforms: {
            // matrices / camera
            uViewProjection:   { value: new THREE.Matrix4() },
            uCamPos:           { value: new THREE.Vector3() },

            // time
            uTime:             { value: 0 },

            // “includes/visibility.glsl” uniforms — mirror your sphere/glow
            uVisibility:       { value: this.sunMaterial.uniforms.uVisibility.value },
            uDirection:        { value: this.sunMaterial.uniforms.uDirection.value },
            uLightView:        { value: this.lightDirWorld.clone() },

            // params from source.js defaults
            uWidth:            { value: lowres ? 0.05 : 0.03 },  // slider min/max handled by GUI in original
            uLength:           { value: 0.45 },
            uOpacity:          { value: lowres ? 0.05 : 0.03 },  // note: 0.05 in lowres, 0.03 desktop
            uNoiseFrequency:   { value: 8.0 },
            uNoiseAmplitude:   { value: 0.4 },
            uAlphaBlended:     { value: 0.3 },
            uHueSpread:        { value: 0.2 },
            uHue:              { value: 0.2 },

            // resolution vec4(L, C, 1/L, 1/C)
            uResolution:       { value: new THREE.Vector4(lineLength, lineCount, 1/lineLength, 1/lineCount) },
            }
        });

        this.sunRaysMesh = new THREE.Mesh(geo, this.sunRaysMaterial);
        this.sunRaysMesh.frustumCulled = false;
        this.sunRaysMesh.renderOrder = 3; // sphere(0)->glow(2)->flares(?)->rays(3)
        this.sunGroup.add(this.sunRaysMesh);
    }

    // === Add this updater, called each frame ===
    updateSunRays() {
        if (!this.sunRaysMaterial) return;

        // ensure latest matrices (like in updateGlow)
        this.camera.updateMatrixWorld(true);
        this.camera.updateProjectionMatrix();

        // view-projection = P * V (use fresh inverse)
        const view = new THREE.Matrix4().copy(this.camera.matrixWorld).invert();
        const vp   = new THREE.Matrix4().multiplyMatrices(this.camera.projectionMatrix, view);
        this.sunRaysMaterial.uniforms.uViewProjection.value.copy(vp);

        // camera world position
        const camPos = new THREE.Vector3();
        this.camera.getWorldPosition(camPos);
        this.sunRaysMaterial.uniforms.uCamPos.value.copy(camPos);

        // time
        this.sunRaysMaterial.uniforms.uTime.value = this.time;

        // keep visibility & light exactly in WORLD space like source
        this.sunRaysMaterial.uniforms.uLightView.value.copy(this.lightDirWorld);
        this.sunRaysMaterial.uniforms.uVisibility.value = this.sunMaterial.uniforms.uVisibility.value;
        this.sunRaysMaterial.uniforms.uDirection.value  = this.sunMaterial.uniforms.uDirection.value;

    
    }



    // === Sun Flares (arcing “magma ribbons” around the rim) ===
    addSunFlares(lowres = this.isMobile) {
        if (this.sunFlaresMesh) return;

        // Use the actual sphere radius so flares start on the surface
        const sunRadius =  1.49;

        // Match original counts exactly: desktop 2047×16, lowres 1024×8
        const lineCount  =  2047;
        const lineLength = 16;

        // Build ribbons geometry exactly like source.js: aPos, aPos0, aPos1, aWireRandom + indices
        const aPos       = new Float32Array(lineCount * lineLength * 2 * 3);
        const aPos0      = new Float32Array(lineCount * lineLength * 2 * 3);
        const aPos1      = new Float32Array(lineCount * lineLength * 2 * 3);
        const aWireRand  = new Float32Array(lineCount * lineLength * 2 * 4);
        const indices    = new Uint16Array(lineCount * (lineLength - 1) * 2 * 3);

        const held = new THREE.Vector3();
        const d    = new THREE.Vector3(); // inner anchor direction (unit)
        const f    = new THREE.Vector3(); // inner jitter dir (unit)
        const p    = new THREE.Vector3(); // outer jitter dir (unit)
        const g    = new THREE.Vector3(); // scratch

        // writers
        let s=0, l=0, c=0, h=0, u=0;

        // initial random base
        f.set(Math.random(), Math.random(), Math.random()).normalize();

        let m = Math.random(), _p = Math.random();
        for (let y = 0; y < lineCount; y++) {
            // Occasionally choose a fresh pair of base directions + two randoms (≈2.5% or first one)
            if (Math.random() < 0.025 || y === 0) {
            d.set(Math.random()*2-1, Math.random()*2-1, Math.random()*2-1).normalize(); // center
            held.copy(d);
            g.set(Math.random()*2-1, Math.random()*2-1, Math.random()*2-1).normalize().multiplyScalar(0.4);
            held.add(g).normalize();                                                     // outer anchor
            m  = Math.random();
            _p = Math.random();
            }

            // inner dir (aPos0) = d with small jitter
            f.copy(d);
            g.set(Math.random()*2-1, Math.random()*2-1, Math.random()*2-1).normalize().multiplyScalar(0.02);
            f.add(g).normalize();

            // outer dir (aPos1) = held with slightly larger jitter
            p.copy(held);
            g.set(Math.random()*2-1, Math.random()*2-1, Math.random()*2-1).normalize().multiplyScalar(0.075);
            p.add(g).normalize();

            const rands = [m, _p, Math.random(), Math.random()];

            for (let E = 0; E < lineLength; E++) {
            const base = 2 * (y * lineLength + E);
            for (let A = 0; A <= 1; A++) {
                // aPos: (phase along, wire index frac, strip side sign)
                aPos[s++] = (E + 0.5) / lineLength;
                aPos[s++] = (y + 0.5) / lineCount;
                aPos[s++] = 2 * A - 1;

                // 4 randoms per vertex (same for the 2 verts of this step)
                for (let R = 0; R < 4; R++) aWireRand[l++] = rands[R];

                // aPos0 / aPos1: scale unit directions by the ACTUAL sphere radius
                aPos0[c++] = f.x * sunRadius; aPos0[c++] = f.y * sunRadius; aPos0[c++] = f.z * sunRadius;
                aPos1[h++] = p.x * sunRadius; aPos1[h++] = p.y * sunRadius; aPos1[h++] = p.z * sunRadius;
            }

            if (E < lineLength - 1) {
                indices[u++] = base + 0;
                indices[u++] = base + 1;
                indices[u++] = base + 2;
                indices[u++] = base + 2;
                indices[u++] = base + 1;
                indices[u++] = base + 3;
            }
            }
        }

        const geo = new THREE.BufferGeometry();
        geo.setAttribute('aPos',        new THREE.BufferAttribute(aPos, 3));
        geo.setAttribute('aPos0',       new THREE.BufferAttribute(aPos0, 3));
        geo.setAttribute('aPos1',       new THREE.BufferAttribute(aPos1, 3));
        geo.setAttribute('aWireRandom', new THREE.BufferAttribute(aWireRand, 4));
        geo.setIndex(new THREE.BufferAttribute(indices, 1));

        // Material: premultiplied alpha blending (like original)
        this.sunFlaresMaterial = new THREE.ShaderMaterial({
            vertexShader:   sunFlaresVS,
            fragmentShader: sunFlaresFS,
            transparent: true,
            premultipliedAlpha: true,
            depthWrite: false,
            depthTest: true,
            blending: THREE.NormalBlending, // premultiplied in shader; matches original
            side: THREE.DoubleSide,
            uniforms: {
            // matrices / camera
            uViewProjection: { value: new THREE.Matrix4() },
            uCamPos:         { value: new THREE.Vector3() },

            // time
            uTime:           { value: 0 },

            // visibility include — must mirror sphere/glow (WORLD space)
            uVisibility:     { value: this.sunMaterial.uniforms.uVisibility.value },
            uDirection:      { value: this.sunMaterial.uniforms.uDirection.value },
            uLightView:      { value: this.lightDirWorld.clone() },

            // Original "loops" params (desktop vs lowres)
            uWidth:          { value: lowres ? 0.01 : 0.005 },
            uAmp:            { value: 0.5 },
            uOpacity:        { value: lowres ? 3.0 : 0.2 },
            uAlphaBlended:   { value: 0.65 },
            uHueSpread:      { value: 0.16 },
            uHue:            { value: 0.0 },
            uNoiseFrequency: { value: 4.0 },
            uNoiseAmplitude: { value: 0.2 },

            // Resolution & line length (for parity with source)
            uResolution:     { value: new THREE.Vector4(lineLength, lineCount, 1/lineLength, 1/lineCount) },
            uLineLength:     { value: lineLength },
            }
        });

        this.sunFlaresMesh = new THREE.Mesh(geo, this.sunFlaresMaterial);
        this.sunFlaresMesh.frustumCulled = false;
        this.sunFlaresMesh.renderOrder = 1; // sphere(0) -> flares(1) -> glow(2) -> rays(3)
        this.sunGroup.add(this.sunFlaresMesh);
    }


    updateSunFlares() {
        if (!this.sunFlaresMaterial) return;

        // fresh P*V (like your other updaters)
        this.camera.updateMatrixWorld(true);
        this.camera.updateProjectionMatrix();
        const view = new THREE.Matrix4().copy(this.camera.matrixWorld).invert();
        const vp   = new THREE.Matrix4().multiplyMatrices(this.camera.projectionMatrix, view);
        this.sunFlaresMaterial.uniforms.uViewProjection.value.copy(vp);

        // camera pos
        const camPos = new THREE.Vector3();
        this.camera.getWorldPosition(camPos);
        this.sunFlaresMaterial.uniforms.uCamPos.value.copy(camPos);

        // time (unscaled — matches original; animation speed lives in the shader)
        this.sunFlaresMaterial.uniforms.uTime.value = this.time;

        // keep visibility & light synced in WORLD space
        this.sunFlaresMaterial.uniforms.uLightView.value.copy(this.lightDirWorld);
        this.sunFlaresMaterial.uniforms.uVisibility.value = this.sunMaterial.uniforms.uVisibility.value;
        this.sunFlaresMaterial.uniforms.uDirection.value  = this.sunMaterial.uniforms.uDirection.value;
    }


    // Resize
    resize(width, height){
        if(width & height){
            this.width = width;
            this.height = height;
        }
        this.renderer.setSize(this.width, this.height);
        this.camera.aspect = this.width / this.height;
        this.camera.updateProjectionMatrix();
        this.setGUIHeight();
    }

    stop() { this.isPlaying = false; }
    play() { if(!this.isPlaying){ this.render(); this.isPlaying = true; } }

    render() {
        if (!this.isPlaying) return;

        const elapsedTime = this.clock.getElapsedTime();
        const deltaTime =  elapsedTime - this.oldElapsedTime;
        this.deltaTime = deltaTime;
        this.oldElapsedTime = elapsedTime;
        this.time += deltaTime;

        // 2) then spin, using camera-up axis
         // idle spin (only yaw) when not dragging
        this.updateRotateEvents(deltaTime);

        this.controls.target.set(0, 0, 0);
        this.controls.update();

        this.renderPerlinCubemap();

        if(this.sunMaterial) {
             this.sunMaterial.uniforms.uTime.value = this.time * 0.04;
            // IMPORTANT: keep uLightView in WORLD space for getAlpha parity
             this.sunMaterial.uniforms.uLightView.value.copy(this.lightDirWorld);
        }
        

        this.updateGlow();
        this.updateSunRays();
        this.updateSunFlares();


        requestAnimationFrame(this.render.bind(this));
        this.renderer.render(this.sunScene, this.camera);
    }

    setupGUI(){
        GUI.TEXT_OPEN = 'Open Live Settings';
        GUI.TEXT_CLOSED = 'Close';

        this.onCheckClickGUI = this.onCheckClickGUI.bind(this);
        window.addEventListener('mousedown', this.onCheckClickGUI);

        this.gui = new GUI({ closeOnTop: false });
        this.gui.width = 104;
        this.guiDomElement = this.gui.domElement;
        this.prt.mainDO.screen.appendChild(this.guiDomElement);

        this.guiDomElement.style.position = 'absolute';
        this.guiDomElement.style.top = '0';
        this.guiDomElement.style.right = '0';
        this.gui.closed = true;

        FWDDSUtils.addClass(this.guiDomElement, 'closed');

        this.onOpenGUI = this.onOpenGUI.bind(this);
        this.onCloseGUI = this.onCloseGUI.bind(this);

        this.guiDomElement.addEventListener('click',this.onOpenGUI);
        this.closeGuiButton = this.guiDomElement.querySelector('.dg.main.a .close-button');

        // Keep your existing controls; these map to extra uniforms you use
        this.gui.add(this.settings, 'transitionProgress', 0, 0.6, 0.01).name('Transition progress').onChange(() =>{
            this.sunMaterial.uniforms.uTransitionProgress && (this.sunMaterial.uniforms.uTransitionProgress.value = this.settings.transitionProgress);
        });
        this.gui.add(this.settings, 'RGBDistortionProgress', -0.05, 0.05, 0.001).name('RGB distortion progress').onChange(() =>{
            this.sunMaterial.uniforms.uRGBDistortionProgress && (this.sunMaterial.uniforms.uRGBDistortionProgress.value = this.settings.RGBDistortionProgress);
        });
        this.gui.add(this.settings, 'curveOffset', -1,1, 0.01).name('Curve offset').onChange(() =>{
            this.sunMaterial.uniforms.uCurveOffset && (this.sunMaterial.uniforms.uCurveOffset.value = this.settings.curveOffset);
        });
    }

    onCheckClickGUI(e){
        const wc = FWDDSUtils.getViewportMouseCoordinates(e);
        let closeButtonY = this.guiDomElement.querySelector('.close-button.close-bottom').getBoundingClientRect().y;
        if(!this.gui.closed){
            if((!FWDDSUtils.hitTest(this.guiDomElement, wc.x, wc.y) || closeButtonY < wc.y)){
                this.gui.close();
                this.onCloseGUI();
            }
        }
        this.setGUIHeight();
        setTimeout(() =>{ if(this.destroyed) return; this.setGUIHeight(); }, 80);
        setTimeout(() =>{ if(this.destroyed) return; this.setGUIHeight(); }, 150);
    }

    onOpenGUI = function(){
        this.gui.width = 400;
        FWDDSUtils.removeClass(this.guiDomElement, 'closed');
        FWDDSUtils.addClass(this.guiDomElement, 'opened');
        this.guiDomElement.removeEventListener('click', this.onOpenGUI);
        this.closeGuiButton.addEventListener('click', this.onCloseGUI);
        this.setGUIHeight();
    }

    onCloseGUI = function(){
        FWDDSUtils.removeClass(this.guiDomElement, 'opened');
        FWDDSUtils.addClass(this.guiDomElement, 'closed');
        this.gui.width = 104;
        this.closeGuiButton.removeEventListener('click', this.onCloseGUI);
        setTimeout(function(){ if(this.destroyed) return; this.guiDomElement.addEventListener('click',this.onOpenGUI); this.setGUIHeight(); }.bind(this), 50);
    }

    setGUIHeight(){
        if(!this.gui) return;
        const child = FWDDSUtils.getChildren(this.guiDomElement)[1];
        const child2 = FWDDSUtils.getChildren(this.guiDomElement)[2];
        if(this.gui.closed){
            this.guiDomElement.style.height = child2.offsetHeight + 'px';
        }else{
            let sH = this.prt.height;
            let height = child.offsetHeight + child2.offsetHeight;
            if(height >= sH){ this.guiDomElement.style.height = '100%'; }
            else{ this.guiDomElement.style.height = height + 'px'; }
        }
    }
}
