/* eslint-disable react-hooks/exhaustive-deps */
import { useEffect } from "react";
import { Helmet } from "react-helmet-async";
import { useSettingStore } from "../store/usSettingStore";

const SITE_URL = "https://astrosushil.com";

const resolveAssetUrl = (value) => {
  if (!value) return "";
  if (value.startsWith("http://") || value.startsWith("https://")) return value;
  return `${SITE_URL}${value.startsWith("/") ? "" : "/"}${value}`;
};

function Seo({
  page,
  canonical,

  title,
  description,
  keywords,
  image,

  ogTitle,
  ogDescription,
  twitterTitle,
  twitterDescription,
  twitterImage,
}) {
  const { seo, fetchSeoByPage } = useSettingStore();

  useEffect(() => {
    if (page) {
      fetchSeoByPage(page);
    }
  }, [page]);

  const pageSeo = page ? seo : null;

  const metaTitle =
    title ||
    pageSeo?.metaTitle ||
    "Astro Sushil Kumar Singh | Guidance by Sushil Kumar Astrologer";

  const metaDescription =
    description ||
    pageSeo?.metaDescription ||
    "Astro Sushil Kumar Singh, renowned as one of India’s most trusted astrologers.";

  const metaImage = resolveAssetUrl(image || pageSeo?.image?.url || "");
  const metaTwitterImage = resolveAssetUrl(
    twitterImage || image || pageSeo?.twitterImage || pageSeo?.image?.url || "",
  );

  return (
    <Helmet>
      <title>{metaTitle}</title>

      <meta name="description" content={metaDescription} />

      <meta
        name="keywords"
        content={keywords || pageSeo?.metaKeywords || ""}
      />

      <link
        rel="canonical"
        href={canonical || `${SITE_URL}${window.location.pathname}`}
      />

      <meta
        property="og:title"
        content={ogTitle || title || pageSeo?.ogTitle || metaTitle}
      />

      <meta
        property="og:description"
        content={
          ogDescription ||
          description ||
          pageSeo?.ogDescription ||
          metaDescription
        }
      />

      <meta property="og:image" content={metaImage} />

      <meta property="og:type" content="website" />

      <meta name="twitter:card" content="summary_large_image" />

      <meta
        name="twitter:title"
        content={
          twitterTitle ||
          title ||
          pageSeo?.twitterTitle ||
          metaTitle
        }
      />

      <meta
        name="twitter:description"
        content={
          twitterDescription ||
          description ||
          pageSeo?.twitterDescription ||
          metaDescription
        }
      />

      <meta name="twitter:image" content={metaTwitterImage} />
    </Helmet>
  );
}

export default Seo;