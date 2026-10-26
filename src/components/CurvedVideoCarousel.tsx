import React, { useRef, useEffect, useState } from "react";
import { computeCarouselLayout, CardGeometry } from "../utils/heroGeometry";
import { HERO_CAROUSEL_PRODUCTS, CarouselProduct } from "../config/carouselProducts";

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
        const prod: CarouselProduct = HERO_CAROUSEL_PRODUCTS[card.index % HERO_CAROUSEL_PRODUCTS.length];

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
              borderRadius: "16px",
              overflow: "hidden",
              backgroundColor: "#1B3B2B",
              boxShadow: "0 14px 28px rgba(0,0,0,0.18), 0 10px 10px rgba(0,0,0,0.12)"
            }}
          >
            {/* Full-bleed Product Image */}
            <img
              src={prod.image}
              alt={prod.title}
              loading="eager"
              onError={(e) => {
                // Reliable fallback
                e.currentTarget.src = "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=600&auto=format&fit=crop&q=80";
              }}
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
                display: "block"
              }}
            />

            {/* Top Category Badge */}
            <div
              style={{
                position: "absolute",
                top: "10px",
                left: "10px",
                right: "10px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                pointerEvents: "none"
              }}
            >
              <span
                style={{
                  backgroundColor: "rgba(255, 255, 255, 0.92)",
                  backdropFilter: "blur(8px)",
                  color: "var(--color-forest)",
                  padding: "3px 8px",
                  borderRadius: "9999px",
                  fontSize: "10.5px",
                  fontWeight: 700,
                  boxShadow: "0 2px 6px rgba(0,0,0,0.12)",
                  whiteSpace: "nowrap"
                }}
              >
                {prod.category}
              </span>
              <span
                style={{
                  backgroundColor: "rgba(0, 0, 0, 0.55)",
                  backdropFilter: "blur(6px)",
                  color: "#FFFFFF",
                  padding: "2px 6px",
                  borderRadius: "9999px",
                  fontSize: "9.5px",
                  fontWeight: 600,
                  whiteSpace: "nowrap"
                }}
              >
                {prod.tag}
              </span>
            </div>

            {/* Bottom Gradient + Title & Price */}
            <div
              style={{
                position: "absolute",
                bottom: 0,
                left: 0,
                right: 0,
                padding: "36px 12px 12px",
                background: "linear-gradient(to top, rgba(7, 34, 22, 0.95) 0%, rgba(7, 34, 22, 0.72) 55%, rgba(7, 34, 22, 0) 100%)",
                display: "flex",
                flexDirection: "column",
                justifyContent: "flex-end",
                pointerEvents: "none"
              }}
            >
              <div
                style={{
                  color: "#FFFFFF",
                  fontSize: "13px",
                  fontWeight: 700,
                  lineHeight: "16px",
                  textShadow: "0 1px 3px rgba(0,0,0,0.6)",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis"
                }}
              >
                {prod.title}
              </div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginTop: "3px"
                }}
              >
                <span
                  style={{
                    color: "#A7F3D0",
                    fontSize: "13px",
                    fontWeight: 800,
                    letterSpacing: "-0.01em"
                  }}
                >
                  {prod.price}
                </span>
                <span
                  style={{
                    fontSize: "10px",
                    color: "rgba(255,255,255,0.9)",
                    backgroundColor: "rgba(255,255,255,0.2)",
                    padding: "1px 5px",
                    borderRadius: "4px",
                    fontWeight: 600
                  }}
                >
                  {prod.theme}
                </span>
              </div>
            </div>

            {/* Shopping Bag Glass Icon */}
            <div
              style={{
                position: "absolute",
                bottom: "10px",
                right: "10px",
                width: "26px",
                height: "26px",
                borderRadius: "50%",
                backgroundColor: "rgba(255, 255, 255, 0.45)",
                backdropFilter: "blur(6px)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "12px",
                pointerEvents: "none"
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
