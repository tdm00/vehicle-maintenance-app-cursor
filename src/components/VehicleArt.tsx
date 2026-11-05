import type { BodyType } from '../domain/types';

function Wheel({ cx, cy = 78 }: { cx: number; cy?: number }) {
  return (
    <g>
      <circle cx={cx} cy={cy} r="13" fill="#1c1915" />
      <circle cx={cx} cy={cy} r="5" fill="#f6f1e6" />
    </g>
  );
}

function Windows({ d }: { d: string }) {
  return <path d={d} fill="#fffaf2" fillOpacity="0.55" />;
}

export function VehicleArt({ bodyType, color, className = '' }: { bodyType: BodyType; color: string; className?: string }) {
  return (
    <svg viewBox="0 0 240 104" className={className} aria-hidden="true">
      <ellipse cx="120" cy="94" rx="78" ry="6" fill="#1c1915" opacity="0.12" />
      {bodyType === 'car' ? (
        <g>
          <path
            fill={color}
            stroke="#1c1915"
            strokeWidth="2"
            d="M38 78h164c6 0 10-6 8-12l-12-18c-8-14-22-24-40-26l-28-6c-18-2-36 4-46 16L62 58c-6 8-16 12-24 14-4 2-4 6 0 6z"
          />
          <Windows d="M92 36c12-8 28-10 42-6l22 8c6 2 10 8 12 14H86l6-16z" />
          <Wheel cx={86} />
          <Wheel cx={176} />
        </g>
      ) : null}
      {bodyType === 'truck' ? (
        <g>
          <path
            fill={color}
            stroke="#1c1915"
            strokeWidth="2"
            d="M24 78V58h92v-8l28-6 24-16h36l16 22 8 10v18H24z"
          />
          <path d="M116 58h8v20" stroke="#1c1915" strokeWidth="2" fill="none" />
          <Windows d="M150 48l20-14h28l10 14H150z" />
          <Wheel cx={72} />
          <Wheel cx={186} />
        </g>
      ) : null}
      {bodyType === 'van' ? (
        <g>
          <path
            fill={color}
            stroke="#1c1915"
            strokeWidth="2"
            d="M32 78V42c0-10 8-16 16-16h118c16 0 26 8 34 20l12 18v14H32z"
          />
          <Windows d="M56 36h78v16H56z" />
          <path d="M148 36v42" stroke="#1c1915" strokeWidth="2" />
          <Wheel cx={78} />
          <Wheel cx={184} />
        </g>
      ) : null}
      {bodyType === 'suv' ? (
        <g>
          <path
            fill={color}
            stroke="#1c1915"
            strokeWidth="2"
            d="M40 72h160l8-16-18-14c-8-16-22-24-42-26H108C86 16 70 26 58 42L46 58c-4 6-8 10-6 14z"
          />
          <Windows d="M96 28h52l16 16H88l8-16z" />
          <Wheel cx={84} cy={82} />
          <Wheel cx={178} cy={82} />
        </g>
      ) : null}
    </svg>
  );
}
