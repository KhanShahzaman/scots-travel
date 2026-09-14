import { AuthProvider } from "@/components/auth-provider";
import { SiteFooter } from "@/components/site-footer";
import { SiteNav } from "@/components/site-nav";
import { defaultGlobalContent, getCmsGlobalContent } from "@/lib/cms-content";
import "./globals.css";

async function loadGlobalContent() {
  try {
    return await getCmsGlobalContent();
  } catch (error) {
    console.error("GLOBAL_CONTENT_LOAD_ERROR", error);
    return defaultGlobalContent;
  }
}

export async function generateMetadata() {
  const globalContent = await loadGlobalContent();

  return {
    title: globalContent.defaultSeo?.title || globalContent.siteName || "Scot Travels",
    description: globalContent.defaultSeo?.description || "Airport transfer booking app",
    alternates: globalContent.defaultSeo?.canonicalUrl
      ? { canonical: globalContent.defaultSeo.canonicalUrl }
      : undefined,
    openGraph: {
      title: globalContent.defaultSeo?.title || globalContent.siteName || "Scot Travels",
      description: globalContent.defaultSeo?.description || "Airport transfer booking app",
      images: globalContent.defaultSeo?.ogImage ? [globalContent.defaultSeo.ogImage] : undefined,
    },
  };
}

export default async function RootLayout({ children }) {
  const globalContent = await loadGlobalContent();

  return (
    <html lang="en">
      <body className="bg-[var(--site-bg)] text-slate-900 antialiased ">
        <AuthProvider>
          <div className="flex min-h-screen flex-col justify-between">
          <SiteNav globalContent={globalContent} />
          <main className="mx-auto w-full px-4 py-0">{children}</main>
          <SiteFooter globalContent={globalContent} />          
          </div>
        </AuthProvider>
      </body>
    </html>
  );
}
