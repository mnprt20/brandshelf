import React, { useRef, useEffect, useState } from "react";
import { computeCarouselLayout, CardGeometry } from "../utils/heroGeometry";

interface Props {
  scaleUnit: number;
}

export const CurvedVideoCarousel: React.FC<Props> = ({ scaleUnit }) => {
  const [offset, setOffset] = useState(0);
  const isDragging = useRef(false);
  const startX = useRef(0);
  const lastOffset = useRef(0);
  const velocity = useRef(0);
  const lastTimestamp = useRef(0);
  const [videoFailed, setVideoFailed] = useState(false);

  useEffect(() => {
    let animId: number;

    const tick = (time: number) => {
      if (!lastTimestamp.current) lastTimestamp.current = time;
      const dt = Math.min((time - lastTimestamp.current) / 1000, 0.1);
      lastTimestamp.current = time;

      if (!isDragging.current) {
        if (Math.abs(velocity.current) > 2) {
          setOffset(prev => prev + velocity.current * dt);
          velocity.current *= Math.pow(0.05, dt);
        } else {
          setOffset(prev => prev + 50 * dt);
        }
      }
      animId = requestAnimationFrame(tick);
    };

    animId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animId);
  }, []);

  const onPointerDown = (e: React.PointerEvent) => {
    isDragging.current = true;
    startX.current = e.clientX;
    lastOffset.current = offset;
    velocity.current = 0;
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!isDragging.current) return;
    const dx = (e.clientX - startX.current) / (scaleUnit || 1);
    const newOffset = lastOffset.current - dx;
    velocity.current = -dx * 20;
    setOffset(newOffset);
  };

  const onPointerUp = () => {
    isDragging.current = false;
  };

  const cards: CardGeometry[] = computeCarouselLayout(offset);

  const videoPoster = "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=600&auto=format&fit=crop&q=80";
  const videoLoop = "https://d2ol7oe51mr4n9.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/04fd3d5f-99d7-476e-98a4-46c08518ffb3.mp4";

  return (
    <div
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerLeave={onPointerUp}
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        width: "1440px",
        height: "1080px",
        overflow: "hidden",
        pointerEvents: "auto",
        cursor: isDragging.current ? "grabbing" : "grab",
        userSelect: "none"
      }}
    >
      {cards.map(card => {
        const col = card.index % 5;
        const row = Math.floor(card.index / 5);
        const tileW = card.width;
        const tileH = Math.max(card.leftHeight, card.width / 0.7111);

        return (
          <div
            key={card.index}
            style={{
              position: "absolute",
              left: `${card.centreX - card.width / 2}px`,
              top: `${card.centreY - card.leftHeight / 2}px`,
              width: `${card.width}px`,
              height: `${Math.max(card.leftHeight, card.rightHeight)}px`,
              clipPath: card.clipPath,
              borderRadius: "15px",
              overflow: "hidden",
              backgroundColor: "#E2EBD6"
            }}
          >
            {!videoFailed ? (
              <video
                src={videoLoop}
                poster={videoPoster}
                autoPlay
                muted
                loop
                playsInline
                onError={() => setVideoFailed(true)}
                style={{
                  position: "absolute",
                  width: `${tileW * 5}px`,
                  height: `${tileH * 2}px`,
                  left: `-${col * tileW}px`,
                  top: `-${row * tileH}px`,
                  objectFit: "cover"
                }}
              />
            ) : (
              <div
                style={{
                  width: "100%",
                  height: "100%",
                  background: "linear-gradient(135deg, #08482D, #2B6E4F)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#FFFFFF",
                  fontSize: "24px"
                }}
              >
                🌿
              </div>
            )}
            <div
              style={{
                position: "absolute",
                bottom: "12px",
                left: "12px",
                width: "32px",
                height: "32px",
                borderRadius: "50%",
                backgroundColor: "rgba(255, 255, 255, 0.55)",
                backdropFilter: "blur(6px)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "14px"
              }}
            >
              🛍️
            </div>
          </div>
        );
      })}
    </div>
  );
};
