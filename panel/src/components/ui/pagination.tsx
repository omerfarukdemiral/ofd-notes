import { LinkButton } from "./button";

export type SearchParamsRecord = Record<string, string | string[] | undefined>;

/** Mevcut filtreleri koruyarak yalnızca sayfa numarasını değiştiren sorgu üretir. */
export function buildQueryString(
  params: SearchParamsRecord,
  overrides: SearchParamsRecord = {},
) {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries({ ...params, ...overrides })) {
    const single = Array.isArray(value) ? value[0] : value;
    if (single) search.set(key, single);
  }
  return search.toString();
}

export function Pagination({
  page,
  pageCount,
  params,
  pageParam = "sayfa",
}: {
  page: number;
  pageCount: number;
  params: SearchParamsRecord;
  pageParam?: string;
}) {
  if (pageCount <= 1) return null;

  const prevDisabled = page <= 1;
  const nextDisabled = page >= pageCount;

  return (
    <nav
      aria-label="Sayfalama"
      className="flex items-center justify-between gap-3 border-t border-line px-5 py-3"
    >
      <LinkButton
        href={`?${buildQueryString(params, { [pageParam]: String(page - 1) })}`}
        variant="secondary"
        size="sm"
        aria-disabled={prevDisabled}
        tabIndex={prevDisabled ? -1 : undefined}
        className={prevDisabled ? "pointer-events-none opacity-50" : ""}
      >
        Önceki
      </LinkButton>

      <span className="text-[13px] text-muted">
        Sayfa {page} / {pageCount}
      </span>

      <LinkButton
        href={`?${buildQueryString(params, { [pageParam]: String(page + 1) })}`}
        variant="secondary"
        size="sm"
        aria-disabled={nextDisabled}
        tabIndex={nextDisabled ? -1 : undefined}
        className={nextDisabled ? "pointer-events-none opacity-50" : ""}
      >
        Sonraki
      </LinkButton>
    </nav>
  );
}
