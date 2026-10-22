/**
 * Curved Video Carousel geometry pure function.
 * Matches exact specs:
 * - Card pitch: 196u
 * - Distance d = |t| / 706
 * - Width = (170 + 48 * d^2)u
 * - Pushed centre: x = 720 + t * (1 + 0.083 * (t / 706)^2)
 * - Vertical edge height = (280 + 92 * q^2.6)u
 * - Vertical centre sits at (687 - 12 * d^2)u
 */
export interface CardGeometry {
  index: number;
  unpushedOffset: number;
  centreX: number;
  centreY: number;
  width: number;
  leftHeight: number;
  rightHeight: number;
  clipPath: string;
}

export function computeCardGeometry(t: number, index = 0): CardGeometry {
  const edgeNorm = 706;
  const pushFactor = 0.083;

  const ratio = t / edgeNorm;
  const centreX = 720 + t * (1 + pushFactor * Math.pow(ratio, 2));

  // Normalized distance d from unpushed or centre
  const d = Math.abs(t) / edgeNorm;

  // Width of card
  const width = 170 + 48 * Math.pow(d, 2);

  // Vertical centre
  const centreY = 687 - 12 * Math.pow(d, 2);

  const absDist = Math.abs(centreX - 720);
  const innerDist = absDist > 0 ? Math.max(0, absDist - (width * 0.2)) : 0;
  const outerDist = absDist > 0 ? absDist + (width * 0.4) : 0;

  const qLeft = t >= 0 ? innerDist / edgeNorm : outerDist / edgeNorm;
  const qRight = t >= 0 ? outerDist / edgeNorm : innerDist / edgeNorm;

  const leftHeight = 280 + 92 * Math.pow(qLeft, 2.6);
  const rightHeight = 280 + 92 * Math.pow(qRight, 2.6);

  const diff = (rightHeight - leftHeight) / 2;
  const yTopLeft = Math.max(0, diff);
  const yTopRight = Math.max(0, -diff);
  const yBottomLeft = yTopLeft + leftHeight;
  const yBottomRight = yTopRight + rightHeight;

  const clipPath = `polygon(0px ${yTopLeft.toFixed(1)}px, ${width.toFixed(1)}px ${yTopRight.toFixed(1)}px, ${width.toFixed(1)}px ${yBottomRight.toFixed(1)}px, 0px ${yBottomLeft.toFixed(1)}px)`;

  return {
    index,
    unpushedOffset: t,
    centreX,
    centreY,
    width,
    leftHeight,
    rightHeight,
    clipPath
  };
}

export function computeCarouselLayout(scrollOffset: number): CardGeometry[] {
  const pitch = 196;
  const numCards = 10;
  const totalSpan = pitch * numCards;
  const cards: CardGeometry[] = [];

  for (let i = 0; i < numCards; i++) {
    let rawX = (i * pitch - (scrollOffset % totalSpan));
    while (rawX < -totalSpan / 2) rawX += totalSpan;
    while (rawX > totalSpan / 2) rawX -= totalSpan;

    cards.push(computeCardGeometry(rawX, i));
  }
  return cards;
}
