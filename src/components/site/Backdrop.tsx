"use client";

import { usePathname } from "next/navigation";
import { motion, useReducedMotion, useScroll, useTransform } from "framer-motion";

// Tab order left to right. The backdrop is a wide strip of glows and the
// visible window slides along it as you move between tabs: later tabs slide
// the background left, earlier ones slide it back right.
const TABS = ["/", "/education", "/experience", "/projects", "/skills", "/contact"];
const STEP_VW = 34; // how far the strip moves per tab

// Positions on the strip (vw/vh from the top-left of the first screen).
const BLOBS = [
  { x: 15, y: -5, scale: 1.1, color: 0 },
  { x: 62, y: 50, scale: 0.9, color: 1 },
  { x: 108, y: 5, scale: 1.2, color: 2 },
  { x: 150, y: 70, scale: 1, color: 0 },
  { x: 195, y: 10, scale: 1.1, color: 1 },
  { x: 240, y: 65, scale: 1.2, color: 2 },
];

const COLORS = [
  "radial-gradient(closest-side, color-mix(in srgb, var(--accent) calc(var(--glow) * 100%), transparent), transparent)",
  "radial-gradient(closest-side, color-mix(in srgb, var(--accent-2) calc(var(--glow) * 100%), transparent), transparent)",
  "radial-gradient(closest-side, color-mix(in srgb, var(--accent) calc(var(--glow) * 70%), transparent), transparent)",
];

/**
 * Fixed full-page background: soft accent glows that drift per page and
 * parallax with scroll, a faint grid fading out from the top, and film grain.
 * Purely decorative (aria-hidden, no pointer events); static with reduced motion.
 */
export function Backdrop() {
  const pathname = usePathname();
  const reduceMotion = useReducedMotion();
  const { scrollY } = useScroll();
  const parallax = useTransform(scrollY, [0, 3000], [0, -300]);

  const section = "/" + (pathname.split("/")[1] ?? "");
  const index = Math.max(0, TABS.indexOf(section));
  const slide = `${-index * STEP_VW}vw`;
  const spring = reduceMotion ? { duration: 0 } : { type: "spring" as const, stiffness: 40, damping: 18, mass: 1.4 };

  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <motion.div className="absolute inset-0" style={reduceMotion ? undefined : { y: parallax }}>
        <motion.div data-tab-index={index} className="absolute top-0 left-0 will-change-transform" initial={false} animate={{ x: slide }} transition={spring}>
          {BLOBS.map((blob, i) => (
            <div
              key={i}
              className="absolute h-[70vmax] w-[70vmax] -translate-x-1/2 -translate-y-1/2"
              style={{
                left: `${blob.x}vw`,
                top: `${blob.y}vh`,
                transform: `translate(-50%, -50%) scale(${blob.scale})`,
                background: COLORS[blob.color],
              }}
            />
          ))}
        </motion.div>
      </motion.div>
      <motion.div
        className="backdrop-grid absolute inset-0"
        initial={false}
        animate={{ backgroundPositionX: `${-index * STEP_VW * 0.6}vw` }}
        transition={spring}
      />
      <div className="backdrop-grain absolute inset-0" />
    </div>
  );
}
