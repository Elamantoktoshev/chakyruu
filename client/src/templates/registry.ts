import { TEMPLATE_KEYS, isTemplateKey, type TemplateKey } from '@chakyruu/shared';
import { lazy, type ComponentType, type LazyExoticComponent } from 'react';
import type { TemplateProps } from './types';

type Loader = () => Promise<{ default: ComponentType<TemplateProps> }>;

/** One chunk per template: the guest downloads only the design of their invitation. */
export const TEMPLATE_LOADERS: Readonly<Record<TemplateKey, Loader>> = {
  classic: () => import('./classic'),
  minimal: () => import('./minimal'),
  alatoo: () => import('./alatoo'),
  nazik: () => import('./nazik'),
  bala: () => import('./bala'),
  batyr: () => import('./batyr'),
  yubiley: () => import('./yubiley'),
  shyrdak: () => import('./shyrdak'),
};

const lazyTemplates = Object.fromEntries(TEMPLATE_KEYS.map((key) => [key, lazy(TEMPLATE_LOADERS[key])])) as Record<
  TemplateKey,
  LazyExoticComponent<ComponentType<TemplateProps>>
>;

/** Unknown keys (old data) fall back to Classic instead of breaking the page. */
export function templateComponent(componentKey: string): LazyExoticComponent<ComponentType<TemplateProps>> {
  return lazyTemplates[isTemplateKey(componentKey) ? componentKey : 'classic'];
}
