import type { ComponentProps } from "react";
import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";

import { cn } from "@/lib/utils";

const components: Components = {
  a({ href, children, node: _node, ...props }) {
    const external = typeof href === "string" && /^https?:\/\//.test(href);
    return (
      <a href={href} {...props} {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}>
        {children}
      </a>
    );
  },
  // Headings inside content never compete with the page outline.
  h1: ({ node: _node, ...props }) => <h3 {...props} />,
  h2: ({ node: _node, ...props }) => <h3 {...props} />,
  h3: ({ node: _node, ...props }) => <h4 {...props} />,
  img: ({ node: _node, alt, ...props }) => <img alt={alt ?? ""} loading="lazy" decoding="async" {...props} />,
};

/**
 * Renders Markdown safely: raw HTML in the source is ignored (not rendered),
 * so content from the dashboard can't inject scripts or markup.
 */
export function Markdown({
  children,
  className,
  ...props
}: { children: string } & Omit<ComponentProps<"div">, "children">) {
  if (!children.trim()) return null;
  return (
    <div className={cn("prose-content", className)} {...props}>
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components} skipHtml>
        {children}
      </ReactMarkdown>
    </div>
  );
}
