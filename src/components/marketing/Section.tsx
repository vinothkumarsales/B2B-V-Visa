import type { ElementType, ReactNode } from 'react';

type Tone = 'canvas' | 'panel' | 'ink';

/** A ruled band. Depth comes from rules and background steps, never shadow. */
export function Section({
  children,
  tone = 'canvas',
  ruled = false,
  ruleTop = false,
  ruleBottom = true,
  className = '',
  id,
  as: Tag = 'section',
}: {
  children: ReactNode;
  tone?: Tone;
  ruled?: boolean;
  ruleTop?: boolean;
  ruleBottom?: boolean;
  className?: string;
  id?: string;
  as?: ElementType;
}) {
  const toneClass = tone === 'panel' ? 'mk-panel' : tone === 'ink' ? 'mk-ink' : '';
  return (
    <Tag
      id={id}
      className={[
        'mk-section',
        toneClass,
        ruled ? 'mk-ruled' : '',
        ruleTop ? 'mk-rule-t' : '',
        ruleBottom ? 'mk-rule-b' : '',
        className,
      ].filter(Boolean).join(' ')}
    >
      <div className="mk-container">{children}</div>
    </Tag>
  );
}

export function Eyebrow({ children }: { children: ReactNode }) {
  return <p className="mk-eyebrow">{children}</p>;
}

/** Left-aligned by default — the system does not centre section headers. */
export function SectionHeader({
  eyebrow,
  title,
  lead,
  action,
  align = 'left',
}: {
  eyebrow?: string;
  title: string;
  lead?: string;
  action?: ReactNode;
  align?: 'left' | 'center';
}) {
  return (
    <div
      className={
        align === 'center'
          ? 'mx-auto max-w-2xl text-center'
          : 'flex flex-col gap-6 md:flex-row md:items-end md:justify-between'
      }
    >
      <div className={align === 'center' ? '' : 'max-w-2xl'}>
        {eyebrow && <Eyebrow>{eyebrow}</Eyebrow>}
        <h2 className="mk-h2 mt-3 text-foreground">{title}</h2>
        {lead && <p className="mk-lead mk-prose mt-4">{lead}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
