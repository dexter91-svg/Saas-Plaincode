import type { NextPageContext } from "next";

type Props = { statusCode?: number };

function ErrorPage({ statusCode }: Props) {
  const code = statusCode ?? 500;
  return (
    <main
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
        fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, sans-serif",
      }}
    >
      <div style={{ maxWidth: 520 }}>
        <h1 style={{ margin: 0, fontSize: 28, lineHeight: 1.2 }}>Something went wrong</h1>
        <p style={{ marginTop: 10, color: "#64748b" }}>
          {code === 404 ? "This page could not be found." : "An unexpected error occurred."}
        </p>
      </div>
    </main>
  );
}

ErrorPage.getInitialProps = ({ res, err }: NextPageContext) => {
  const statusCode = res ? res.statusCode : err ? (err as { statusCode?: number }).statusCode : 404;
  return { statusCode };
};

export default ErrorPage;

