import { useMemo } from "react";
import katex from "katex";

export function MathPreview({
  equation,
  displayMode = true,
  className,
}: {
  equation: string;
  displayMode?: boolean;
  className?: string;
}) {
  const html = useMemo(() => {
    try {
      return katex.renderToString(equation || "", {
        displayMode,
        throwOnError: false,
        output: "html",
      });
    } catch {
      return `<span class="text-destructive text-sm">Invalid LaTeX</span>`;
    }
  }, [equation, displayMode]);

  return <span className={className} dangerouslySetInnerHTML={{ __html: html }} />;
}
