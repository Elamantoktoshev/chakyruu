import { assetUrl, openingLayers, type LayerAnchor, type LayerMotion, type OpeningLayer, type TemplateManifest } from '@chakyruu/shared';
import type { CSSProperties } from 'react';
import { LayerImage } from './LayerImage';
import './layered.css';

/** Base position of a layer on the 9:16 stage; the motion is added on top. */
const ANCHOR_CLASS: Readonly<Record<LayerAnchor, string>> = {
  fill: 'inset-0',
  center: 'left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2',
  left: 'bottom-[12%] left-0',
  right: 'bottom-[12%] right-0',
  top: 'left-1/2 top-0 -translate-x-1/2',
  bottom: 'bottom-0 left-1/2 -translate-x-1/2',
};

/** x / y are % of the stage (container units), so the same numbers work in a card and full screen. */
export function motionTransform({ x = 0, y = 0, rotate = 0, scale = 1 }: LayerMotion): string {
  return `translate(${x}cqw, ${y}cqh) rotate(${rotate}deg) scale(${scale})`;
}

function motionVars(layer: OpeningLayer): CSSProperties {
  return {
    '--t-from': motionTransform(layer.from),
    '--t-to': motionTransform({ ...layer.from, ...layer.to }),
    '--o-from': String(layer.from.opacity ?? 1),
    '--o-to': String(layer.to.opacity ?? layer.from.opacity ?? 1),
    '--dur': `${layer.durationMs}ms`,
    '--delay': `${layer.delayMs}ms`,
  } as CSSProperties;
}

type Props = {
  manifest: TemplateManifest;
  /** Name on the closed cover (guest name or the hosts). */
  doorLabel?: string;
};

/**
 * The layered opening of an illustrated template. Closed: the cover with the guest's name.
 * When an ancestor gets `.is-opening` (OpeningOverlay, catalog card hover) every layer plays its
 * from → to motion. Transform and opacity only.
 */
export function LayeredScene({ manifest, doorLabel }: Props) {
  const layers = openingLayers(manifest);
  const { palette } = manifest;
  return (
    <div className="layered-stage absolute inset-0 overflow-hidden" style={{ backgroundColor: palette.background }}>
      <div className="layered-poster absolute inset-0">
        <LayerImage src={assetUrl(manifest, 'cover.webp')} label="Обложка" palette={palette} blurDataUrl={manifest.placeholders['cover.webp']} isFill isEager />
        {doorLabel && (
          <p
            className="absolute inset-x-6 bottom-[22%] text-center font-serif text-[clamp(18px,7cqw,34px)] leading-tight drop-shadow-lg"
            style={{ color: palette.isDark ? palette.accent : '#fff' }}
          >
            {doorLabel}
          </p>
        )}
      </div>
      {layers.map((layer) => (
        <div
          key={layer.id}
          className={`layered-anchor absolute ${ANCHOR_CLASS[layer.anchor]}`}
          style={{ width: layer.anchor === 'fill' ? '100%' : `${layer.widthPct}%`, zIndex: layer.zIndex + 1 }}
        >
          <div className="layered-motion h-full w-full" style={motionVars(layer)}>
            <LayerImage
              src={assetUrl(manifest, layer.file)}
              label={layer.label}
              palette={palette}
              blurDataUrl={manifest.placeholders[layer.file]}
              isFill={layer.anchor === 'fill'}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
