"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { useFBX, useTexture, useAnimations, Center } from "@react-three/drei";
import * as THREE from "three";
import { clone as cloneSkeleton } from "three/examples/jsm/utils/SkeletonUtils.js";

interface Props {
  level: number;
  size?: number;
  className?: string;
  withFrame?: boolean;
}

interface Tier {
  skin: string;
  rim: string | null;
  label: string;
}

const SKIN_BY_TIER: Record<string, Tier> = {
  Common:     { skin: "/characters/Skins/skaterMaleA.png",   rim: null,      label: "Common" },
  CommonPlus: { skin: "/characters/Skins/skaterFemaleA.png", rim: "#06D6A0", label: "Common+" },
  Rare:       { skin: "/characters/Skins/criminalMaleA.png", rim: "#8B5CF6", label: "Rare" },
  Epic:       { skin: "/characters/Skins/cyborgFemaleA.png", rim: "#FFD700", label: "Epic" },
  Legendary:  { skin: "/characters/Skins/cyborgFemaleA.png", rim: "#FF6B6B", label: "Legendary" },
};

function tierKeyFromLevel(level: number): keyof typeof SKIN_BY_TIER {
  if (level >= 50) return "Legendary";
  if (level >= 20) return "Epic";
  if (level >= 10) return "Rare";
  if (level >= 5)  return "CommonPlus";
  return "Common";
}

const MODEL_URL = "/characters/Model/characterMedium.fbx";
const IDLE_URL = "/characters/Animations/idle.fbx";
const JUMP_URL = "/characters/Animations/jump.fbx";

function CharacterModel({ tier, jumping }: { tier: Tier; jumping: boolean }) {
  const groupRef = useRef<THREE.Group>(null);
  const baseModel = useFBX(MODEL_URL);
  const idleFbx = useFBX(IDLE_URL);
  const jumpFbx = useFBX(JUMP_URL);
  const texture = useTexture(tier.skin);

  // Each instance needs its own skinned mesh tree so the animation mixer
  // doesn't fight with siblings.
  const model = useMemo(() => cloneSkeleton(baseModel), [baseModel]);

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

  // Idle loops continuously as the base state.
  useEffect(() => {
    actions.idle?.reset().fadeIn(0.2).play();
    return () => {
      mixer.stopAllAction();
    };
  }, [actions, mixer]);

  // On hover (detail view) play jump once, then settle back into idle.
  useEffect(() => {
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
  }, [jumping, actions]);

  return (
    <Center top>
      <group ref={groupRef} scale={0.012} rotation={[0, Math.PI, 0]}>
        <primitive object={model} />
      </group>
    </Center>
  );
}

export default function Character3D({ level, size = 64, className = "", withFrame = false }: Props) {
  const tier = SKIN_BY_TIER[tierKeyFromLevel(level)];
  const [hover, setHover] = useState(false);

  const canvas = (
    <div
      style={{ width: size, height: size }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      <Canvas
        camera={{ position: [0, 0.4, 2.4], fov: 28 }}
        gl={{ antialias: true, alpha: true, preserveDrawingBuffer: false }}
        dpr={[1, 2]}
      >
        <ambientLight intensity={0.7} />
        <directionalLight position={[2, 3, 2]} intensity={1.1} />
        <directionalLight position={[-2, 1, -2]} intensity={0.4} color={tier.rim ?? "#ffffff"} />
        <Suspense fallback={null}>
          <CharacterModel tier={tier} jumping={hover} />
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
        borderColor: tier.rim ?? undefined,
        boxShadow: tier.rim ? `0 0 16px -2px ${tier.rim}55` : undefined,
      }}
      aria-label={`Lv.${level} ${tier.label} 캐릭터`}
    >
      {canvas}
    </div>
  );
}

useFBX.preload(MODEL_URL);
useFBX.preload(IDLE_URL);
useFBX.preload(JUMP_URL);
