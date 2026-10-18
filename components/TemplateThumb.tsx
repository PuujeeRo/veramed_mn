// A tiny wireframe of a product page layout, for the editor's layout
// picker — so "Showcase" vs "Minimal" is something the manager sees, not a
// name they have to guess at. Tinted with the product's own colour theme.

import { PageTemplate } from "@/lib/types";
import { ProductAccent, accentClass } from "@/lib/accents";

const bar = "rounded-sm bg-fg/15";

export default function TemplateThumb({ id, accent }: { id: PageTemplate; accent: ProductAccent }) {
  const img = `${accentClass(accent)} accent-tile rounded`;
  return (
    <div aria-hidden="true" className="aspect-[4/3] overflow-hidden rounded-md border border-line bg-surface p-1.5">
      {id === "showcase" && (
        <div className="flex h-full flex-col gap-1">
          <div className={`${accentClass(accent)} accent-hero flex flex-1 items-center justify-between gap-1 rounded px-1.5`}>
            <div className="flex w-1/3 flex-col gap-0.5">
              <span className="h-1.5 w-full rounded-sm bg-white/80" />
              <span className="h-1.5 w-2/3 rounded-sm bg-white/60" />
            </div>
            <span className="h-[70%] w-1/4 rounded-sm bg-white/85" />
            <span className="h-2 w-1/5 rounded-full bg-white/80" />
          </div>
          <span className={`${bar} h-1 w-3/4`} />
          <span className={`${bar} h-1 w-1/2`} />
        </div>
      )}
      {id === "classic" && (
        <div className="grid h-full grid-cols-2 gap-1.5">
          <span className={img} />
          <div className="flex flex-col gap-1 pt-0.5">
            <span className={`${bar} h-1.5 w-full`} />
            <span className={`${bar} h-1 w-3/4`} />
            <span className={`${bar} h-1 w-2/3`} />
            <span className="mt-auto h-2.5 w-1/2 rounded-full bg-brand-600/70" />
          </div>
        </div>
      )}
      {id === "gallery-first" && (
        <div className="grid h-full grid-cols-[3fr_2fr] gap-1.5">
          <div className="flex flex-col gap-1">
            <span className={`${img} flex-1`} />
            <div className="flex gap-0.5">
              <span className={`${img} h-2 flex-1 opacity-70`} />
              <span className={`${img} h-2 flex-1 opacity-70`} />
              <span className={`${img} h-2 flex-1 opacity-70`} />
            </div>
          </div>
          <div className="flex flex-col gap-1 pt-0.5">
            <span className={`${bar} h-1.5 w-full`} />
            <span className="h-2.5 w-3/4 rounded-full bg-brand-600/70" />
            <span className={`${bar} h-1 w-full`} />
          </div>
        </div>
      )}
      {id === "minimal" && (
        <div className="mx-auto flex h-full w-3/5 flex-col gap-1">
          <span className={`${bar} h-1.5 w-full`} />
          <span className="h-2 w-1/2 rounded-full bg-brand-600/70" />
          <span className={`${img} flex-1`} />
        </div>
      )}
    </div>
  );
}
