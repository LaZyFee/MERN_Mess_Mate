import "./globals.css";

// Next.js config exports (not React components)
// eslint-disable-next-line react-refresh/only-export-components
export const metadata = {
  title: "MealMate — Meal & Cost Tracker",
  description:
    "Meal, expense and money tracking for shared living, backed by a real double-entry ledger.",
};

// eslint-disable-next-line react-refresh/only-export-components
export const viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Set theme before paint to avoid flash; mm_theme is the only readable cookie */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var m=document.cookie.match(/mm_theme=(dark|light)/);var t=m?m[1]:(window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light');document.documentElement.setAttribute('data-theme',t);}catch(e){}})();`,
          }}
        />
      </head>
      <body>{children}</body>
    </html>
  );
}