import {
  Bike, BookOpen, Camera, Cloud, Code2, Coffee, Compass, Dribbble, Facebook, Feather, Flower2,
  Github, Globe, Heart, Instagram, Leaf, Linkedin, Mail, Map, Moon, Mountain, Music, PenLine,
  Plane, Send, Sparkles, Star, Sun, Sunrise, Trees, Twitter, Waves, Youtube,
  type LucideIcon,
} from 'lucide-react';

/**
 * One registry for every icon the site can draw.
 *
 * The admin icon pickers read from these maps and the backend validates against
 * the same names (`App\Support\IconLibrary`), so the owner can never save an
 * icon that the public page would silently replace with a fallback.
 */

export const favoriteIcons: Record<string, LucideIcon> = {
  leaf: Leaf, camera: Camera, coffee: Coffee, code: Code2, compass: Compass, mountain: Mountain,
  music: Music, book: BookOpen, heart: Heart, sun: Sun, sunrise: Sunrise, moon: Moon,
  cloud: Cloud, feather: Feather, flower: Flower2, map: Map, pen: PenLine, star: Star,
  sparkles: Sparkles, bike: Bike, plane: Plane, globe: Globe, waves: Waves, trees: Trees,
};

export const socialIcons: Record<string, LucideIcon> = {
  github: Github, instagram: Instagram, email: Mail, linkedin: Linkedin, twitter: Twitter,
  facebook: Facebook, youtube: Youtube, telegram: Send, dribbble: Dribbble, website: Globe,
};

export const favoriteIconNames = Object.keys(favoriteIcons);
export const socialIconNames = Object.keys(socialIcons);

export const favoriteIcon = (name: string): LucideIcon => favoriteIcons[name] || Heart;

export const socialIcon = (name: string): LucideIcon =>
  socialIcons[name.toLowerCase()] || (name.toLowerCase().includes('mail') ? Mail : Globe);
