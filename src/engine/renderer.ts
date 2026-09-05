import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { SMAAPass } from 'three/examples/jsm/postprocessing/SMAAPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { SSAOPass } from 'three/examples/jsm/postprocessing/SSAOPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import type { QualitySettings } from './quality';

/** Mild chromatic aberration + film-feel — temporal smear via jittered UV. */
const ChromaticVignetteShader = {
  uniforms: {
    tDiffuse: { value: null as THREE.Texture | null },
    amount: { value: 0.0018 },
    vignette: { value: 0.55 },
    time: { value: 0 },
    grain: { value: 0.035 },
  },
  vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse;
    uniform float amount;
    uniform float vignette;
    uniform float time;
    uniform float grain;
    varying vec2 vUv;

    float hash(vec2 p) {
      return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
    }

    void main() {
      vec2 uv = vUv;
      vec2 d = uv - 0.5;
      float dist = length(d);
      // TAA-ish: tiny temporal UV wobble
      vec2 jitter = vec2(hash(vec2(time, uv.x)), hash(vec2(uv.y, time * 1.3))) - 0.5;
      uv += jitter * 0.00055;

      float ca = amount * (0.4 + dist * 1.6);
      float r = texture2D(tDiffuse, uv + d * ca).r;
      float g = texture2D(tDiffuse, uv).g;
      float b = texture2D(tDiffuse, uv - d * ca).b;
      vec3 col = vec3(r, g, b);

      float vig = smoothstep(0.95, 0.25, dist * vignette + dist);
      col *= vig;

      float n = hash(uv * vec2(1920.0, 1080.0) + time) - 0.5;
      col += n * grain;

      // ACES-ish tone map
      col = col * (2.51 * col + 0.03) / (col * (2.43 * col + 0.59) + 0.14);
      gl_FragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
    }
  `,
};

export class GameRenderer {
  readonly renderer: THREE.WebGLRenderer;
  readonly composer: EffectComposer;
  private readonly bloom: UnrealBloomPass;
  private readonly ssao: SSAOPass;
  private readonly smaa: SMAAPass;
  private readonly grade: ShaderPass;
  private readonly clock = new THREE.Clock();

  constructor(
    canvas: HTMLCanvasElement,
    scene: THREE.Scene,
    camera: THREE.PerspectiveCamera,
    quality: QualitySettings,
  ) {
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: false,
      powerPreference: 'high-performance',
      alpha: false,
    });
    if (!this.renderer.capabilities.isWebGL2) {
      console.warn('WebGL2 not available; falling back to WebGL1 context capabilities.');
    }
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, quality.pixelRatioCap));
    this.renderer.setSize(window.innerWidth, window.innerHeight, false);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    this.composer = new EffectComposer(this.renderer);
    this.composer.addPass(new RenderPass(scene, camera));

    this.ssao = new SSAOPass(scene, camera, window.innerWidth, window.innerHeight);
    this.ssao.kernelRadius = 12;
    this.ssao.minDistance = 0.002;
    this.ssao.maxDistance = 0.12;
    this.ssao.enabled = quality.ssaoEnabled;
    this.composer.addPass(this.ssao);

    this.bloom = new UnrealBloomPass(
      new THREE.Vector2(window.innerWidth, window.innerHeight),
      quality.bloomStrength,
      0.55,
      0.85,
    );
    this.composer.addPass(this.bloom);

    this.grade = new ShaderPass(ChromaticVignetteShader);
    this.composer.addPass(this.grade);

    this.smaa = new SMAAPass(window.innerWidth, window.innerHeight);
    this.smaa.enabled = quality.smaaEnabled;
    this.composer.addPass(this.smaa);

    this.composer.addPass(new OutputPass());

    window.addEventListener('resize', () => this.resize(camera));
  }

  applyQuality(quality: QualitySettings): void {
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, quality.pixelRatioCap));
    this.bloom.strength = quality.bloomStrength;
    this.ssao.enabled = quality.ssaoEnabled;
    this.smaa.enabled = quality.smaaEnabled;
    this.resize();
  }

  resize(camera?: THREE.PerspectiveCamera): void {
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.renderer.setSize(w, h, false);
    this.composer.setSize(w, h);
    this.ssao.setSize(w, h);
    this.smaa.setSize(w, h);
    if (camera) {
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    }
  }

  render(_scene: THREE.Scene, _camera: THREE.Camera): void {
    this.grade.uniforms.time.value = this.clock.getElapsedTime();
    this.composer.render();
  }
}
