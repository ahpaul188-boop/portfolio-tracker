type Props = {
  market: string;
};

export function MarketBadge({ market }: Props) {
  const isHk = market === "HK";
  return (
    <span
      className={`ui-pill shrink-0 ${
        isHk
          ? "bg-amber-50 text-amber-700"
          : "bg-[var(--accent-soft)] text-[var(--accent-deep)]"
      }`}
    >
      {market}
    </span>
  );
}
