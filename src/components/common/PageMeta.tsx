import { useEffect, type ReactNode } from "react";
import { HelmetProvider, Helmet } from "react-helmet-async";

const PageMeta = ({
  title,
  description,
}: {
  title: string;
  description: string;
}) => {
  // Helmet applies the title on the next animation frame, which browsers
  // pause in background tabs: a page opened with Ctrl+click / "Open in new
  // tab" kept the default title until focused. Set it directly as well.
  useEffect(() => {
    if (title) document.title = title;
  }, [title]);

  return (
    <Helmet>
      <title>{title}</title>
      <meta name="description" content={description} />
    </Helmet>
  );
};

export const AppWrapper = ({ children }: { children: ReactNode }) => (
  <HelmetProvider>{children}</HelmetProvider>
);

export default PageMeta;
