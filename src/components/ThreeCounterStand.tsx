import React, { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { generateQrSvg } from "../utils/qr";

interface Props {
  storeName: string;
  brandColor: string;
  storeUrl: string;
  height?: number;
}

export const ThreeCounterStand: React.FC<Props> = ({
  storeName,
  brandColor,
  storeUrl,
  height = 360
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [autoRotate, setAutoRotate] = useState(true);
  const autoRotateRef = useRef(true);
  autoRotateRef.current = autoRotate;

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const width = container.clientWidth || 360;
    const scene = new THREE.Scene();
    scene.background = new THREE.Color("#F5F8EF");

    // Camera
    const camera = new THREE.PerspectiveCamera(38, width / height, 0.1, 100);
    camera.position.set(0, 1.2, 3.8);

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(renderer.domElement);

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.9);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 1.4);
    dirLight.position.set(4, 8, 5);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 1024;
    dirLight.shadow.mapSize.height = 1024;
    scene.add(dirLight);

    const fillLight = new THREE.DirectionalLight(0xdbeafe, 0.6);
    fillLight.position.set(-4, 3, -2);
    scene.add(fillLight);

    // Stand Group
    const standGroup = new THREE.Group();
    scene.add(standGroup);

    // Base: Solid wood/acrylic pedestal
    const baseGeo = new THREE.BoxGeometry(1.6, 0.15, 0.9);
    const baseMat = new THREE.MeshStandardMaterial({
      color: 0x222222,
      roughness: 0.35,
      metalness: 0.1
    });
    const baseMesh = new THREE.Mesh(baseGeo, baseMat);
    baseMesh.position.y = 0.075;
    baseMesh.castShadow = true;
    baseMesh.receiveShadow = true;
    standGroup.add(baseMesh);

    // Acrylic upright slot
    const slotGeo = new THREE.BoxGeometry(1.3, 0.08, 0.12);
    const slotMat = new THREE.MeshStandardMaterial({
      color: 0xdddddd,
      roughness: 0.1,
      metalness: 0.8
    });
    const slotMesh = new THREE.Mesh(slotGeo, slotMat);
    slotMesh.position.set(0, 0.18, 0);
    slotMesh.castShadow = true;
    standGroup.add(slotMesh);

    // Generate dynamic QR canvas texture
    const canvas = document.createElement("canvas");
    canvas.width = 512;
    canvas.height = 700;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      // White glossy card background
      ctx.fillStyle = "#FFFFFF";
      ctx.fillRect(0, 0, 512, 700);

      // Card Header with Store Brand Color
      ctx.fillStyle = brandColor || "#08482D";
      ctx.fillRect(0, 0, 512, 130);

      // Store Title text
      ctx.fillStyle = "#FFFFFF";
      ctx.font = "bold 32px -apple-system, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(storeName || "MintShelf Store", 256, 60);

      ctx.fillStyle = "rgba(255, 255, 255, 0.85)";
      ctx.font = "600 18px -apple-system, sans-serif";
      ctx.fillText("SCAN TO BROWSE & ORDER", 256, 100);

      // Helper to render QR svg onto canvas
      const qrSvgString = generateQrSvg(storeUrl, 320, brandColor || "#08482D");
      const img = new Image();
      const svgBlob = new Blob([qrSvgString], { type: "image/svg+xml;charset=utf-8" });
      const url = URL.createObjectURL(svgBlob);
      img.onload = () => {
        ctx.drawImage(img, 96, 170, 320, 320);
        URL.revokeObjectURL(url);

        // Footer instructions on card
        ctx.fillStyle = "#5E5E61";
        ctx.font = "500 20px -apple-system, sans-serif";
        ctx.fillText("Open camera to scan", 256, 540);

        ctx.fillStyle = "#101410";
        ctx.font = "bold 22px -apple-system, sans-serif";
        ctx.fillText("Instant UPI & Counter Pickup", 256, 580);

        // Update Three.js texture
        cardTexture.needsUpdate = true;
      };
      img.src = url;
    }

    const cardTexture = new THREE.CanvasTexture(canvas);
    cardTexture.colorSpace = THREE.SRGBColorSpace;

    // Upright Display Card
    const cardGeo = new THREE.BoxGeometry(1.2, 1.64, 0.03);
    const cardBackMat = new THREE.MeshStandardMaterial({
      color: 0xfafafa,
      roughness: 0.4
    });
    const cardFrontMat = new THREE.MeshStandardMaterial({
      map: cardTexture,
      roughness: 0.25,
      metalness: 0.05
    });

    const cardMaterials = [
      cardBackMat, // right
      cardBackMat, // left
      cardBackMat, // top
      cardBackMat, // bottom
      cardFrontMat, // front (z+)
      cardBackMat  // back (z-)
    ];

    const cardMesh = new THREE.Mesh(cardGeo, cardMaterials);
    // Slightly lean back like a genuine tabletop counter easel stand
    cardMesh.position.set(0, 1.0, 0);
    cardMesh.rotation.x = -0.06;
    cardMesh.castShadow = true;
    cardMesh.receiveShadow = true;
    standGroup.add(cardMesh);

    // Gentle floor shadow plane
    const shadowGeo = new THREE.PlaneGeometry(3.5, 3.5);
    const shadowMat = new THREE.ShadowMaterial({ opacity: 0.25 });
    const shadowMesh = new THREE.Mesh(shadowGeo, shadowMat);
    shadowMesh.rotation.x = -Math.PI / 2;
    shadowMesh.position.y = 0.001;
    shadowMesh.receiveShadow = true;
    scene.add(shadowMesh);

    // Interactive Drag / Orbit rotation
    let isDragging = false;
    let previousMouseX = 0;
    let targetRotationY = 0;

    const handlePointerDown = (e: MouseEvent | TouchEvent) => {
      isDragging = true;
      const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
      previousMouseX = clientX;
    };

    const handlePointerMove = (e: MouseEvent | TouchEvent) => {
      if (!isDragging) return;
      const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
      const deltaX = clientX - previousMouseX;
      previousMouseX = clientX;
      targetRotationY += deltaX * 0.01;
    };

    const handlePointerUp = () => {
      isDragging = false;
    };

    const dom = renderer.domElement;
    dom.addEventListener("mousedown", handlePointerDown);
    dom.addEventListener("touchstart", handlePointerDown, { passive: true });
    window.addEventListener("mousemove", handlePointerMove);
    window.addEventListener("touchmove", handlePointerMove, { passive: true });
    window.addEventListener("mouseup", handlePointerUp);
    window.addEventListener("touchend", handlePointerUp);

    // Animation Loop
    let animId: number;
    const animate = () => {
      animId = requestAnimationFrame(animate);

      if (autoRotateRef.current && !isDragging) {
        targetRotationY += 0.008;
      }

      // Smooth damping
      standGroup.rotation.y += (targetRotationY - standGroup.rotation.y) * 0.1;

      renderer.render(scene, camera);
    };
    animate();

    // Resize observer
    const handleResize = () => {
      if (!container) return;
      const newWidth = container.clientWidth;
      camera.aspect = newWidth / height;
      camera.updateProjectionMatrix();
      renderer.setSize(newWidth, height);
    };
    window.addEventListener("resize", handleResize);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", handleResize);
      dom.removeEventListener("mousedown", handlePointerDown);
      dom.removeEventListener("touchstart", handlePointerDown);
      window.removeEventListener("mousemove", handlePointerMove);
      window.removeEventListener("touchmove", handlePointerMove);
      window.removeEventListener("mouseup", handlePointerUp);
      window.removeEventListener("touchend", handlePointerUp);

      renderer.dispose();
      cardTexture.dispose();
      baseGeo.dispose();
      baseMat.dispose();
      slotGeo.dispose();
      slotMat.dispose();
      cardGeo.dispose();
      cardBackMat.dispose();
      cardFrontMat.dispose();
      shadowGeo.dispose();
      shadowMat.dispose();

      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [storeName, brandColor, storeUrl, height]);

  return (
    <div style={{ position: "relative", width: "100%", borderRadius: "20px", overflow: "hidden", background: "#F5F8EF", border: "1px solid #E5EADF" }}>
      <div ref={containerRef} style={{ width: "100%", height: `${height}px`, cursor: "grab" }} />
      <div style={{ position: "absolute", bottom: "12px", right: "12px", display: "flex", gap: "8px", zIndex: 10 }}>
        <button
          onClick={() => setAutoRotate(!autoRotate)}
          style={{
            background: "rgba(255,255,255,0.9)",
            border: "1px solid #DCE3D6",
            padding: "6px 12px",
            borderRadius: "9999px",
            fontSize: "12px",
            fontWeight: 600,
            color: "var(--color-ink)",
            boxShadow: "0 2px 8px rgba(0,0,0,0.06)"
          }}
        >
          {autoRotate ? "Pause Spin ⏸" : "Auto Spin ↻"}
        </button>
      </div>
      <div style={{ position: "absolute", top: "12px", left: "12px", background: "rgba(255,255,255,0.9)", padding: "4px 10px", borderRadius: "9999px", fontSize: "11px", fontWeight: 700, color: "var(--color-forest)", border: "1px solid #DCE3D6" }}>
        3D Interactive Stand • Drag to Rotate
      </div>
    </div>
  );
};
