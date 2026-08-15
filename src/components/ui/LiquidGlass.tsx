"use client";

import { type CSSProperties, type ElementType, type ReactNode } from "react";

/**
 * Liquid Glass — Apple-style translucent material for React / Next.js.
 *
 * Requires `liquid-glass.css` to be imported once (e.g. in app/layout.tsx).
 * The refraction layer needs the SVG filter in the DOM; render <LiquidGlassDefs />
 * once near the root, or pass `refract` and drop <LiquidGlassDefs /> in your layout.
 *
 * Works over ANY busy background (gradient, image, aurora). Over a flat color the
 * effect is invisible by design — that is how real glass behaves.
 */

type LiquidGlassProps = {
  children?: ReactNode;
  /** Render as a different element/component (default: "div"). e.g. "button", "nav". */
  as?: ElementType;
  /** Frost strength in px. Default 8. */
  blur?: number;
  /** White fill alpha 0–1. Default 0.1. */
  tint?: number;
  /** Corner radius in px, or a CSS length string. Default 24. */
  radius?: number | string;
  /** Enable the SVG refraction layer (needs <LiquidGlassDefs />). Default false. */
  refract?: boolean;
  className?: string;
  style?: CSSProperties;
  [key: string]: unknown;
};

export function LiquidGlass({
  children,
  as: Tag = "div",
  blur = 8,
  tint = 0.1,
  radius = 24,
  refract = false,
  className = "",
  style,
  ...rest
}: LiquidGlassProps) {
  const vars = {
    "--lg-blur": `${blur}px`,
    "--lg-tint": String(tint),
    "--lg-radius": typeof radius === "number" ? `${radius}px` : radius,
  } as CSSProperties;

  return (
    <Tag
      className={["lg", refract ? "lg--refract" : "", className]
        .filter(Boolean)
        .join(" ")}
      style={{ ...vars, ...style }}
      {...rest}
    >
      {children}
    </Tag>
  );
}

/**
 * The SVG refraction filter. Render ONCE near the root of the app (e.g. at the
 * bottom of the <body> in app/layout.tsx). Safe to render even if unused.
 *
 * `scale` controls refraction strength (0 = off, ~40–70 = strong).
 */
export function LiquidGlassDefs({ scale = 58 }: { scale?: number }) {
  return (
    <svg
      width={0}
      height={0}
      style={{ position: "absolute" }}
      aria-hidden="true"
      focusable="false"
    >
      <filter
        id="lg-distort"
        x="-20%"
        y="-20%"
        width="140%"
        height="140%"
        colorInterpolationFilters="sRGB"
      >
        <feTurbulence
          type="fractalNoise"
          baseFrequency="0.008 0.012"
          numOctaves={2}
          seed={7}
          result="turb"
        />
        <feGaussianBlur in="turb" stdDeviation={2.4} result="soft" />
        <feDisplacementMap
          id="lg-disp"
          in="SourceGraphic"
          in2="soft"
          scale={scale}
          xChannelSelector="R"
          yChannelSelector="G"
        />
      </filter>
    </svg>
  );
}

export default LiquidGlass;
