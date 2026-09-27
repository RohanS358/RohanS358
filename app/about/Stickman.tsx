"use client";

import { useEffect, useRef } from "react";
import { Renderer, Camera, Transform, Mesh, Program, Sphere, Cylinder, Plane, Torus, Vec3 } from "ogl";

/**
 * A stick figure, but in 3D — the /about page's one detailed object.
 *
 * Built from primitives (no model file): ink cylinders for bones, ink
 * spheres for joints, a paper head with an outline. The skeleton is a
 * handful of angles; every frame we do forward kinematics, then place
 * the meshes. Poses are named functions of time, and the figure eases
 * toward whichever pose the section on screen asks for (data-pose).
 *
 * Scroll moves the camera between three shots; the pointer steers his
 * head; "poke" makes him jump and twirl for no reason.
 */

// [leftArm a1 b1 a2 b2, rightArm ×4, leftLeg ×4, rightLeg ×4, leanX, leanZ, headRoll, bob]
type P = number[];
const S = Math.sin;

const idle = (t: number): P => [
  0.18, 0, 0.05, 0.15, 0.18, 0, 0.05, 0.15,
  0.1, 0, 0, 0, 0.1, 0, 0, 0,
  0, 0, S(t * 0.7) * 0.05, S(t * 2) * 0.012,
];

const POSES: Record<string, (t: number) => P> = {
  idle,
  wave: (t) => {
    const p = idle(t);
    p.splice(4, 4, 2.6, 0.15, 0.1 + S(t * 9) * 0.55, 0);
    p[18] = 0.12;
    return p;
  },
  point: (t) => {
    const p = idle(t);
    p.splice(4, 4, 1.45 + S(t * 2) * 0.05, 0.35, 0.05, 0);
    p[16] = -0.06;
    return p;
  },
  shrug: (t) => {
    const b = Math.max(0, S(t * 3)) * 0.12;
    const p = idle(t);
    p.splice(0, 8, 0.55 + b, 0.2, -1.9, 0.4, 0.55 + b, 0.2, -1.9, 0.4);
    p[18] = 0.25;
    return p;
  },
  think: (t) => {
    const p = idle(t);
    p.splice(4, 4, 0.25, 0.9, -0.3, 1.55);
    p.splice(0, 4, 0.6, 0.5, -1.6, 0.3); // other hand on hip-ish
    p[18] = -0.2 + S(t) * 0.05;
    return p;
  },
  dance: (t) => {
    const k = S(t * 6);
    return [
      2.2 + k * 0.4, 0.2, 0.6, 0, 0.3 - k * 0.2, 0.4, -0.9, 0.6,
      0.25, 0.2 + k * 0.2, 0, -0.5, 0.25, 0.2 - k * 0.2, 0, -0.5,
      k * 0.12, 0.05, -k * 0.2, Math.abs(k) * 0.04,
    ];
  },
  run: (t) => {
    const k = S(t * 11);
    return [
      0.12, k * 0.9, 0, 1.3, 0.12, -k * 0.9, 0, 1.3,
      0.05, -k * 0.75, 0, -0.9 - Math.max(0, k) * 0.6, 0.05, k * 0.75, 0, -0.9 - Math.max(0, -k) * 0.6,
      0, 0.25, 0, Math.abs(k) * 0.06,
    ];
  },
  celebrate: (t) => {
    const k = Math.abs(S(t * 7));
    return [
      2.7, 0.1, 0.2, 0, 2.7, 0.1, 0.2, 0,
      0.25, 0, 0, 0, 0.25, 0, 0, 0,
      0, -0.05, S(t * 3.5) * 0.15, k * 0.12,
    ];
  },
};

// Camera shots: [cam x,y,z, target x,y,z, body yaw]
const SHOTS = [
  [0, 1.1, 8.4, 0, 0.35, 0, 0],
  [1.45, 1.3, 6.3, 1.45, 1.05, 0, 0.45],
  [1.0, 1.85, 3.3, 1.05, 1.75, 0, 0.35],
];
const SHOTS_NARROW = [
  [0, 1.2, 9.5, 0, 0.1, 0, 0],
  [0, 1.6, 7.2, 0, 0.6, 0, 0.3],
  [0, 1.9, 4.6, 0, 1.3, 0, 0.2],
];

const VERT = /* glsl */ `
attribute vec3 position; attribute vec3 normal;
uniform mat4 modelViewMatrix, projectionMatrix; uniform mat3 normalMatrix;
varying vec3 vN;
void main(){ vN = normalize(normalMatrix * normal); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.); }`;
const FRAG = /* glsl */ `
precision highp float;
uniform vec3 uColor, uRim; varying vec3 vN;
void main(){
  vec3 n = normalize(vN);
  float l = smoothstep(0., .08, dot(n, normalize(vec3(.5,.7,.6))));
  float rim = pow(1. - max(n.z, 0.), 3.);
  gl_FragColor = vec4(uColor * (.78 + .22 * l) + uRim * rim * .55, 1.);
}`;
const SHADOW_FRAG = /* glsl */ `
precision highp float; uniform vec3 uColor; uniform float uA; varying vec2 vUv;
void main(){ float d = length(vUv - .5) * 2.; gl_FragColor = vec4(uColor, (1. - smoothstep(.2, 1., d)) * uA); }`;
const SHADOW_VERT = /* glsl */ `
attribute vec3 position; attribute vec2 uv; uniform mat4 modelViewMatrix, projectionMatrix; varying vec2 vUv;
void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.); }`;

const hex = (c: string) => {
  const m = c.trim().replace("#", "");
  const n = parseInt(m.length === 3 ? m.replace(/./g, "$&$&") : m, 16);
  return [(n >> 16) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
};

export default function Stickman() {
  const host = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = host.current!;
    const css = getComputedStyle(el);
    const INK = hex(css.getPropertyValue("--ink") || "#1a1714");
    const PAPER = hex(css.getPropertyValue("--paper") || "#fffdf8");
    const ACCENT = hex(css.getPropertyValue("--pink") || "#ff9c78");
    const still = matchMedia("(prefers-reduced-motion: reduce)").matches;

    const renderer = new Renderer({ dpr: Math.min(devicePixelRatio, 2), alpha: true, antialias: true });
    const gl = renderer.gl;
    el.appendChild(gl.canvas);
    const camera = new Camera(gl, { fov: 30 });
    const scene = new Transform();
    const fig = new Transform();
    fig.setParent(scene);

    const mat = (color: number[], extra = {}) =>
      new Program(gl, { vertex: VERT, fragment: FRAG, uniforms: { uColor: { value: color }, uRim: { value: ACCENT } }, ...extra });
    const ink = mat(INK);
    const paper = mat(PAPER);
    const outline = mat(INK, { cullFace: gl.FRONT });

    const R = 0.045;
    const boneGeo = new Cylinder(gl, { radiusTop: R, radiusBottom: R, height: 1, radialSegments: 16 });
    const jointGeo = new Sphere(gl, { radius: R, widthSegments: 16, heightSegments: 12 });
    const bones = Array.from({ length: 10 }, () => new Mesh(gl, { geometry: boneGeo, program: ink }));
    const joints = Array.from({ length: 11 }, () => new Mesh(gl, { geometry: jointGeo, program: ink }));
    [...bones, ...joints].forEach((m) => m.setParent(fig));

    // Head: paper sphere + inverted-hull outline, eyes and a smile ride along.
    const head = new Transform();
    head.setParent(fig);
    const HR = 0.26;
    new Mesh(gl, { geometry: new Sphere(gl, { radius: HR, widthSegments: 32, heightSegments: 24 }), program: paper }).setParent(head);
    new Mesh(gl, { geometry: new Sphere(gl, { radius: HR + 0.022, widthSegments: 32, heightSegments: 24 }), program: outline }).setParent(head);
    const eyeGeo = new Sphere(gl, { radius: 0.03 });
    const eyes = [-1, 1].map((s) => {
      const e = new Mesh(gl, { geometry: eyeGeo, program: ink });
      e.position.set(s * 0.085, 0.05, HR * 0.93);
      e.setParent(head);
      return e;
    });
    const smile = new Mesh(gl, { geometry: new Torus(gl, { radius: 0.075, tube: 0.013, arc: Math.PI * 0.8 }), program: ink });
    smile.position.set(0, -0.06, HR * 0.9);
    smile.rotation.set(-0.35, 0, -Math.PI * 0.9);
    smile.setParent(head);

    const shadow = new Mesh(gl, {
      geometry: new Plane(gl),
      program: new Program(gl, { vertex: SHADOW_VERT, fragment: SHADOW_FRAG, transparent: true, depthWrite: false, uniforms: { uColor: { value: INK }, uA: { value: 0.18 } } }),
    });
    shadow.rotation.x = -Math.PI / 2;
    shadow.setParent(scene);

    // --- kinematics ---
    const UP = new Vec3(0, 1, 0);
    const tmp = new Vec3();
    const dir = (a: number, b: number, s: number) => new Vec3(s * S(a) * Math.cos(b), -Math.cos(a) * Math.cos(b), S(b));
    const place = (m: Mesh, a: Vec3, b: Vec3) => {
      tmp.sub(b, a);
      const len = tmp.len();
      tmp.normalize();
      m.position.copy(a).add(b).scale(0.5);
      m.scale.set(1, len, 1);
      const axis = new Vec3().cross(UP, tmp);
      const angle = Math.acos(Math.min(1, Math.max(-1, UP.dot(tmp))));
      if (axis.len() < 1e-5) m.quaternion.set(0, 0, 0, 1);
      else m.quaternion.fromAxisAngle(axis.normalize(), angle);
    };
    const limb = (root: Vec3, p: P, i: number, s: number, l1: number, l2: number) => {
      const mid = root.clone().add(dir(p[i], p[i + 1], s).scale(l1));
      const end = mid.clone().add(dir(p[i] + p[i + 2], p[i + 1] + p[i + 3], s).scale(l2));
      return [mid, end];
    };

    let cur: P = idle(0);
    let target = "wave";
    let yaw = 0, pitch = 0, mx = 0, my = 0;
    let jumpY = 0, jumpV = 0, spin = 0;
    let stage = 0;
    const cam = [...SHOTS[0]];

    const pose = (t: number) => {
      const want = POSES[target](still ? 0 : t);
      cur = cur.map((v, i) => v + (want[i] - v) * 0.12);
      const p = cur;
      const pelvis = new Vec3(0, 1.0 + p[19], 0);
      const up = new Vec3(p[16], 1, p[17]).normalize();
      const neck = pelvis.clone().add(up.clone().scale(0.75));
      const shoulder = pelvis.clone().add(up.clone().scale(0.66));
      const [le, lh] = limb(shoulder, p, 0, -1, 0.42, 0.4);
      const [re, rh] = limb(shoulder, p, 4, 1, 0.42, 0.4);
      const [lk, lf] = limb(pelvis, p, 8, -1, 0.5, 0.5);
      const [rk, rf] = limb(pelvis, p, 12, 1, 0.5, 0.5);
      const headC = neck.clone().add(up.clone().scale(0.06 + HR));

      // keep the lower foot on the floor, whatever the pose does
      const drop = Math.min(lf.y, rf.y) - 0.045;
      const pts = [pelvis, neck, shoulder, le, lh, re, rh, lk, lf, rk, rf, headC];
      pts.forEach((v) => (v.y -= drop));

      const pairs: [Vec3, Vec3][] = [
        [pelvis, neck], [neck, headC.clone().sub(up.clone().scale(HR))],
        [shoulder, le], [le, lh], [shoulder, re], [re, rh],
        [pelvis, lk], [lk, lf], [pelvis, rk], [rk, rf],
      ];
      pairs.forEach(([a, b], i) => place(bones[i], a, b));
      [pelvis, neck, shoulder, le, lh, re, rh, lk, lf, rk, rf].forEach((v, i) => joints[i].position.copy(v));

      head.position.copy(headC);
      yaw += (mx * 0.6 - yaw) * 0.08;
      pitch += (my * 0.35 - pitch) * 0.08;
      head.rotation.set(pitch + p[17] * 0.5, yaw, p[18]);
    };

    // --- scroll → camera shot, sections → pose ---
    const narrow = () => innerWidth < 720;
    const readScroll = () => {
      const tl = document.getElementById("stuff");
      const wk = document.getElementById("work-list");
      const h = innerHeight;
      const a = tl ? tl.getBoundingClientRect().top : h;
      const b = wk ? wk.getBoundingClientRect().top : h * 3;
      stage = a > h ? 0 : a > 0 ? 1 - a / h : b > h ? 1 : b > 0 ? 2 - b / h : 2;
    };
    const io = new IntersectionObserver(
      (es) => es.forEach((e) => e.isIntersecting && (target = (e.target as HTMLElement).dataset.pose || "idle")),
      { rootMargin: "-45% 0px -45% 0px" },
    );
    document.querySelectorAll("[data-pose]").forEach((n) => io.observe(n));

    const onMove = (e: PointerEvent) => {
      mx = (e.clientX / innerWidth) * 2 - 1;
      my = (e.clientY / innerHeight) * 2 - 1;
    };
    const onPoke = () => {
      if (jumpY === 0) { jumpV = 4.6; spin = 0; }
    };
    const resize = () => {
      renderer.setSize(innerWidth, innerHeight);
      camera.perspective({ aspect: innerWidth / innerHeight });
    };
    resize();
    readScroll();
    addEventListener("resize", resize);
    addEventListener("scroll", readScroll, { passive: true });
    addEventListener("pointermove", onMove);
    addEventListener("stickman:poke", onPoke);

    let raf = 0, last = performance.now();
    const frame = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const t = now / 1000;

      if (jumpV || jumpY > 0) {
        jumpV -= 13 * dt;
        jumpY = Math.max(0, jumpY + jumpV * dt);
        spin = Math.min(1, spin + dt * 1.25);
        if (jumpY === 0) jumpV = 0;
      }

      const shots = narrow() ? SHOTS_NARROW : SHOTS;
      const i = Math.min(1, Math.floor(stage));
      const f = stage - i;
      const want = shots[i].map((v, k) => v + (shots[i + 1][k] - v) * f);
      for (let k = 0; k < 7; k++) cam[k] += (want[k] - cam[k]) * (still ? 1 : 0.08);

      pose(t);
      fig.position.y = jumpY;
      fig.rotation.set(0, cam[6] + yaw * 0.25 + spin * Math.PI * 2, 0);
      if (jumpY === 0) spin = 0;
      // blink every ~4s
      const blink = (t % 4.1) < 0.12 && !still ? 0.1 : 1;
      eyes.forEach((e) => e.scale.set(1, blink, 1));
      shadow.scale.set(0.9 / (1 + jumpY), 0.9 / (1 + jumpY), 1);
      shadow.program.uniforms.uA.value = 0.2 / (1 + jumpY * 2);

      camera.position.set(cam[0], cam[1], cam[2]);
      camera.lookAt([cam[3], cam[4], cam[5]]);
      renderer.render({ scene, camera });
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(raf);
      io.disconnect();
      removeEventListener("resize", resize);
      removeEventListener("scroll", readScroll);
      removeEventListener("pointermove", onMove);
      removeEventListener("stickman:poke", onPoke);
      gl.getExtension("WEBGL_lose_context")?.loseContext();
      gl.canvas.remove();
    };
  }, []);

  return (
    <>
      <div ref={host} className="stick-scene" aria-hidden="true" />
      <button className="stick-poke" onClick={() => dispatchEvent(new Event("stickman:poke"))}>
        poke him
      </button>
    </>
  );
}
