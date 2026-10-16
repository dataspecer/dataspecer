import { useQueryParamsContext } from "../context/query-params-context";

function domainMapUrl(packageId: string): string {
  const base = import.meta.env.VITE_SLOVNIKY_AI ?? "http://localhost:5180";
  return base + "/domain-areas?package-iri=" + encodeURIComponent(packageId);
}

export const DomainMapLink = () => {
  const { packageId } = useQueryParamsContext();
  const href = packageId ? domainMapUrl(packageId) : undefined;

  return (
    <a
      href={href}
      title={href ? "Open the domain map for this vocabulary" : "Open a package before using the domain map"}
      aria-disabled={href === undefined}
      onClick={(event) => {
        if (href === undefined) {
          event.preventDefault();
        }
      }}
      className="my-auto mr-2 inline-flex items-center gap-2 rounded border border-white/50 bg-white/15 px-2 py-1 text-white hover:bg-white/25 aria-disabled:cursor-default aria-disabled:opacity-60"
    >
      <span className="inline-flex h-6 w-6 items-center justify-center rounded bg-white text-[11px] font-bold leading-none text-[#5438dc]">
        AI
      </span>
      <span className="text-sm font-semibold leading-none">Domain map</span>
    </a>
  );
};
