type FeedJsonLinkProps = {
  href: string;
  label?: string;
  className?: string;
};

export function FeedJsonLink({ href, label = "JSON", className }: FeedJsonLinkProps) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={className ?? "text-xs text-violet-400/90 hover:text-violet-300"}
    >
      {label}
    </a>
  );
}
