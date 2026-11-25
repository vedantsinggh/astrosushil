/* eslint-disable react-hooks/exhaustive-deps */
import { useEffect } from "react";
import { Helmet } from "react-helmet-async";
import { useSettingStore } from "../store/usSettingStore";

const SITE_URL = "https://astrosushil.com";

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

  const metaTitle =
    title ||
    seo?.metaTitle ||
    "Astro Sushil Kumar Singh | Guidance by Sushil Kumar Astrologer";

  const metaDescription =
    description ||
    seo?.metaDescription ||
    "Astro Sushil Kumar Singh, renowned as one of India’s most trusted astrologers.";

  return (
    <Helmet>
      <title>{metaTitle}</title>

      <meta name="description" content={metaDescription} />

      <meta
        name="keywords"
        content={keywords || seo?.metaKeywords || ""}
      />

      <link
        rel="canonical"
        href={canonical || `${SITE_URL}${window.location.pathname}`}
      />

      <meta
        property="og:title"
        content={ogTitle || title || seo?.ogTitle || metaTitle}
      />

      <meta
        property="og:description"
        content={
          ogDescription ||
          description ||
          seo?.ogDescription ||
          metaDescription
        }
      />

      <meta
        property="og:image"
        content={image || seo?.image?.url || ""}
      />

      <meta property="og:type" content="website" />

      <meta name="twitter:card" content="summary_large_image" />

      <meta
        name="twitter:title"
        content={
          twitterTitle ||
          title ||
          seo?.twitterTitle ||
          metaTitle
        }
      />

      <meta
        name="twitter:description"
        content={
          twitterDescription ||
          description ||
          seo?.twitterDescription ||
          metaDescription
        }
      />

      <meta
        name="twitter:image"
        content={
          twitterImage ||
          image ||
          seo?.twitterImage ||
          ""
        }
      />
    </Helmet>
  );
}

export default Seo;