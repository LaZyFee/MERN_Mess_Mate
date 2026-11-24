/**
 * Decorative month grid for the auth brand panel. It mirrors the real Meals
 * grid: a portion eaten, an absence, or "not entered yet". Server component.
 */
const PATTERN = "11h11x1" + "t11h11q" + "1x11t11" + "11h111t" + "1uuuuuu";
const TODAY_INDEX = 28;

const LABEL = { 1: "1", t: "¾", h: "½", q: "¼", x: "–", u: "" };

const CELL = {
  1: "bg-(--brand-on) text-(--brand-bg)",
  t: "bg-(--brand-on)/70 text-(--brand-bg)",
  h: "bg-(--brand-on)/45 text-(--brand-fg)",
  q: "bg-(--brand-on)/25 text-(--brand-fg)",
  x: "border border-(--brand-mute)/50 text-(--brand-mute)",
  u: "border border-dashed border-(--brand-mute)/40",
};

const LEGEND = [
  { key: "1", text: "Portion eaten" },
  { key: "x", text: "Absent" },
  { key: "u", text: "Not entered yet" },
];

export default function MealTally({ className = "" }) {
  return (
    <figure className={className} aria-hidden="true">
      <div className="grid max-w-xs grid-cols-7 gap-1.5">
        {PATTERN.split("").map((state, index) => (
          <span
            key={index}
            className={`grid aspect-square place-items-center rounded-lg text-xs font-semibold ${CELL[state]} ${
              index === TODAY_INDEX ? "ring-2 ring-(--brand-fg) ring-offset-2 ring-offset-(--brand-bg)" : ""
            }`}
          >
            {LABEL[state]}
          </span>
        ))}
      </div>
      <figcaption className="mt-4 flex max-w-xs flex-wrap gap-x-4 gap-y-1 text-xs text-(--brand-mute)">
        {LEGEND.map((item) => (
          <span key={item.key} className="inline-flex items-center gap-1.5">
            <span className={`size-3 rounded ${CELL[item.key]}`} />
            {item.text}
          </span>
        ))}
      </figcaption>
    </figure>
  );
}
