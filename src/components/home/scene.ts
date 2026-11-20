/**
 * The home hero's scene, built once from the themeable animated logo: its
 * markup for HeroScene.astro, and its timing rules for the page's head, with
 * their hash for the page's Content Security Policy (ADR 0002).
 */
import { createHash } from "node:crypto";
import animatedLogo from "../../assets/animated/logo-9c-animated.themeable.svg?raw";
import { heroScene } from "../../lib/hero-scene";

export const scene = heroScene(animatedLogo);

/** The CSP source of the <style> element holding exactly `scene.css`. */
export const sceneCssHash =
  `sha256-${createHash("sha256").update(scene.css).digest("base64")}` as const;
