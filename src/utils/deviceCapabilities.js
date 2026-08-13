// client/src/utils/deviceCapabilities.js
export function supportsCriticalCSS() {
  // Must pass all
  const hasHas = CSS.supports?.('selector(:has(*))') ?? false;
  const hasContainer = CSS.supports?.('container-type: inline-size') ?? false;
  // 'clip' value (not clip-path)
  const hasOverflowClip = CSS.supports?.('(overflow: clip) or (overflow-x: clip)') ?? false;
  return hasHas && hasContainer && hasOverflowClip;
}

export function isLikelyPhone() {
  const ua = (navigator.userAgent || '').toLowerCase();
  const isPhoneUA =
    /iphone|android(?!.*tablet)|windows phone|mobile/.test(ua);
  const smallViewport = Math.min(window.innerWidth, screen.width || window.innerWidth) <= 640;
  const coarse = matchMedia('(pointer: coarse)').matches || matchMedia('(any-pointer: coarse)').matches;
  const noHover = !matchMedia('(hover: hover)').matches && !matchMedia('(any-hover: hover)').matches;
  return isPhoneUA && smallViewport && coarse && noHover;
}

export function hasDesktopInputs() {
  const hover = matchMedia('(hover: hover)').matches || matchMedia('(any-hover: hover)').matches;
  const finePointer = matchMedia('(pointer: fine)').matches || matchMedia('(any-pointer: fine)').matches;
  return hover && finePointer;
}


// TEMP
function isFirefox() {
  return /firefox/i.test(navigator.userAgent);
}

export function evaluateGate() {
  const reasons = [];
  const cssOK = supportsCriticalCSS();
  if (!cssOK) reasons.push('unsupported-css');
  // Over-allow: only flag “phone” when we’re confident
  if (isLikelyPhone() && !hasDesktopInputs()) reasons.push('phone');

  // Block Safari (modern WebKit) only
  if (isModernWebKit()) reasons.push('webkit');

  const ok = reasons.length === 0;
  return { ok, reasons };
}

export function getBrowser() {
  const userAgent = navigator.userAgent;

  if (userAgent.includes("Firefox/")) {
    return "Firefox";
  } else if (userAgent.includes("Edg/")) {
    return "Edge";
  } else if (userAgent.includes("Chrome/")) {
    return "Chrome";
  } else if (
    userAgent.includes("Safari/") &&
    !userAgent.includes("Chrome/") &&
    !userAgent.includes("Edg/")
  ) {
    return "Safari";
  } else {
    return "Unknown";
  }
}

export function isModernWebKit() {
  try {
    return !!(window.CSS && CSS.supports && CSS.supports('(-webkit-nbsp-mode: space)'));
  } catch {
    return false;
  }
}