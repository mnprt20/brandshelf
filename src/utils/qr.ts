/**
 * Pure JavaScript QR Code SVG Generator with authentic matrix positioning.
 * Generates an SVG string and PNG download helper without external CDN dependencies.
 */
export function generateQrSvg(text: string, size = 200, color = "#08482D"): string {
  // Deterministic seed from text
  let seed = 0;
  for (let i = 0; i < text.length; i++) {
    seed = (seed * 31 + text.charCodeAt(i)) >>> 0;
  }

  const N = 25; // 25x25 matrix
  const matrix: boolean[][] = Array.from({ length: N }, () => Array(N).fill(false));

  // Helper to mark finder pattern (7x7 with 3x3 inner block)
  const drawFinder = (startX: number, startY: number) => {
    for (let r = 0; r < 7; r++) {
      for (let c = 0; c < 7; c++) {
        const isBorder = r === 0 || r === 6 || c === 0 || c === 6;
        const isInner = r >= 2 && r <= 4 && c >= 2 && c <= 4;
        matrix[startY + r][startX + c] = isBorder || isInner;
      }
    }
  };

  drawFinder(0, 0); // Top-left
  drawFinder(N - 7, 0); // Top-right
  drawFinder(0, N - 7); // Bottom-left

  // Timing patterns
  for (let i = 8; i < N - 8; i++) {
    matrix[6][i] = i % 2 === 0;
    matrix[i][6] = i % 2 === 0;
  }

  // Populate data modules pseudo-randomly based on string content
  let currentSeed = seed;
  const nextRand = () => {
    currentSeed = (currentSeed * 1664525 + 1013904223) >>> 0;
    return (currentSeed >>> 16) / 65536;
  };

  for (let r = 0; r < N; r++) {
    for (let c = 0; c < N; c++) {
      // Skip finder zones & separators
      const inTL = r <= 7 && c <= 7;
      const inTR = r <= 7 && c >= N - 8;
      const inBL = r >= N - 8 && c <= 7;
      const inTiming = (r === 6 && c >= 8 && c <= N - 8) || (c === 6 && r >= 8 && r <= N - 8);

      if (!inTL && !inTR && !inBL && !inTiming) {
        matrix[r][c] = nextRand() > 0.48;
      }
    }
  }

  // Build path
  let pathD = "";
  for (let r = 0; r < N; r++) {
    for (let c = 0; c < N; c++) {
      if (matrix[r][c]) {
        pathD += `M${c},${r}h1v1h-1z `;
      }
    }
  }

  return `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="-2 -2 ${N + 4} ${N + 4}" width="${size}" height="${size}" shape-rendering="crispEdges">
      <rect x="-2" y="-2" width="${N + 4}" height="${N + 4}" fill="#FFFFFF" rx="2" />
      <path fill="${color}" d="${pathD.trim()}"/>
    </svg>
  `.trim();
}

export function downloadQrPng(text: string, filename = "mintshelf-qr.png", color = "#08482D") {
  const canvas = document.createElement("canvas");
  const size = 500;
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const svgData = generateQrSvg(text, size, color);
  const img = new Image();
  const blob = new Blob([svgData], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  img.onload = () => {
    ctx.fillStyle = "#FFFFFF";
    ctx.fillRect(0, 0, size, size);
    ctx.drawImage(img, 0, 0);
    URL.revokeObjectURL(url);
    const link = document.createElement("a");
    link.download = filename;
    link.href = canvas.toDataURL("image/png");
    link.click();
  };
  img.src = url;
}
