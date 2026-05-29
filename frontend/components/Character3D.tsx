"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { useFBX, useTexture, useAnimations } from "@react-three/drei";
import * as THREE from "three";
import { clone as cloneSkeleton } from "three/examples/jsm/utils/SkeletonUtils.js";
import { skinById, skinFromLevel, type SkinDef, type SkinId } from "@/lib/character";

interface Props {
  level: number;
  size?: number;
  className?: string;
  withFrame?: boolean;
  /** 명시 스킨. 없으면 level 기반 기본 스킨. */
  skin?: SkinId;
  /** idle/jump 애니메이션 재생 여부. 리스트 썸네일은 false로 정적 렌더. */
  animated?: boolean;
}

const MODEL_URL = "/characters/Model/characterMedium.fbx";
const IDLE_URL = "/characters/Animations/idle.fbx";
const JUMP_URL = "/characters/Animations/jump.fbx";

function CharacterModel({ skin, animated, jumping }: { skin: SkinDef; animated: boolean; jumping: boolean }) {
  const groupRef = useRef<THREE.Group>(null);
  const baseModel = useFBX(MODEL_URL);
  const idleFbx = useFBX(IDLE_URL);
  const jumpFbx = useFBX(JUMP_URL);
  const texture = useTexture(skin.url);

  // Each instance needs its own skinned mesh tree so the animation mixer
  // doesn't fight with siblings. Normalize to a fixed height centered on the
  // origin so camera framing is deterministic regardless of the FBX's native
  // scale (the raw Kenney model is ~hundreds of units tall).
  const model = useMemo(() => {
    const cloned = cloneSkeleton(baseModel);
    const box = new THREE.Box3().setFromObject(cloned);
    const size = new THREE.Vector3();
    const center = new THREE.Vector3();
    box.getSize(size);
    box.getCenter(center);
    const targetHeight = 1.5;
    const scale = size.y > 0 ? targetHeight / size.y : 1;
    cloned.scale.setScalar(scale);
    cloned.position.set(-center.x * scale, -center.y * scale, -center.z * scale);
    return cloned;
  }, [baseModel]);

  // Name the clips so useAnimations exposes actions.idle / actions.jump.
  const clips = useMemo(() => {
    const out: THREE.AnimationClip[] = [];
    const idle = idleFbx.animations[0];
    const jump = jumpFbx.animations[0];
    if (idle) {
      idle.name = "idle";
      out.push(idle);
    }
    if (jump) {
      jump.name = "jump";
      out.push(jump);
    }
    return out;
  }, [idleFbx, jumpFbx]);

  useEffect(() => {
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.flipY = false;
    texture.needsUpdate = true;
  }, [texture]);

  // Apply the chosen skin texture to every mesh material in the cloned model.
  useEffect(() => {
    model.traverse((child) => {
      const mesh = child as THREE.Mesh;
      if (!(mesh as { isMesh?: boolean }).isMesh) return;
      const apply = (m: THREE.Material) => {
        const std = m as THREE.MeshStandardMaterial;
        const newMat = std.clone() as THREE.MeshStandardMaterial;
        newMat.map = texture;
        newMat.transparent = false;
        newMat.needsUpdate = true;
        return newMat;
      };
      if (Array.isArray(mesh.material)) {
        mesh.material = mesh.material.map(apply);
      } else {
        mesh.material = apply(mesh.material);
      }
    });
  }, [model, texture]);

  const { actions, mixer } = useAnimations(clips, groupRef);

  // Idle loops continuously as the base state — only when animated.
  useEffect(() => {
    if (!animated) return;
    actions.idle?.reset().fadeIn(0.2).play();
    return () => {
      mixer.stopAllAction();
    };
  }, [actions, mixer, animated]);

  // On hover (detail view) play jump once, then settle back into idle.
  useEffect(() => {
    if (!animated) return;
    const jump = actions.jump;
    const idle = actions.idle;
    if (!jump || !idle) return;
    if (jumping) {
      jump.reset();
      jump.setLoop(THREE.LoopOnce, 1);
      jump.clampWhenFinished = false;
      idle.fadeOut(0.15);
      jump.fadeIn(0.15).play();
    } else {
      jump.fadeOut(0.2);
      idle.reset().fadeIn(0.2).play();
    }
  }, [jumping, actions, animated]);

  return (
    <group ref={groupRef} rotation={[0, Math.PI, 0]}>
      <primitive object={model} />
    </group>
  );
}

export default function Character3D({
  level,
  size = 64,
  className = "",
  withFrame = false,
  skin,
  animated = true,
}: Props) {
  const skinDef = skin ? skinById(skin) : skinFromLevel(level);
  const [hover, setHover] = useState(false);

  const canvas = (
    <div
      style={{ width: size, height: size }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      <Canvas
        camera={{ position: [0, 0.1, 3.2], fov: 30 }}
        gl={{ antialias: true, alpha: true, preserveDrawingBuffer: false }}
        dpr={[1, 2]}
      >
        <ambientLight intensity={0.7} />
        <directionalLight position={[2, 3, 2]} intensity={1.1} />
        <directionalLight position={[-2, 1, -2]} intensity={0.4} color={skinDef.rim ?? "#ffffff"} />
        <Suspense fallback={null}>
          <CharacterModel skin={skinDef} animated={animated} jumping={animated && hover} />
        </Suspense>
      </Canvas>
    </div>
  );

  if (!withFrame) {
    return <div className={className}>{canvas}</div>;
  }
  return (
    <div
      className={`inline-flex items-center justify-center rounded-lg bg-surface-2 border p-2 ${className}`}
      style={{
        width: size + 16,
        height: size + 16,
        borderColor: skinDef.rim ?? undefined,
        boxShadow: skinDef.rim ? `0 0 16px -2px ${skinDef.rim}55` : undefined,
      }}
      aria-label={`Lv.${level} ${skinDef.label} 캐릭터`}
    >
      {canvas}
    </div>
  );
}

useFBX.preload(MODEL_URL);
useFBX.preload(IDLE_URL);
useFBX.preload(JUMP_URL);
