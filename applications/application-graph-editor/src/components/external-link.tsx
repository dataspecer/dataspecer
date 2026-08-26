import { ExternalLink as ExternalLinkIcon } from 'lucide-react';

export function ExternalLink({ href, label }: { href: string; label: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="inline-flex items-center gap-1 font-normal text-blue-600 hover:underline"
      title={label}
    >
      <ExternalLinkIcon size={11} />
      open
    </a>
  );
}
