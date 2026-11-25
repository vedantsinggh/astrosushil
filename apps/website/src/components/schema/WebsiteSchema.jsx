import { Helmet } from "react-helmet-async";

const WEBSITE_SCHEMA = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  "@id": "https://astrosushil.com/#website",
  url: "https://astrosushil.com/",
  name: "Astro Sushil",
  publisher: {
    "@id": "https://astrosushil.com/#organization",
  },
  inLanguage: "en-IN",
};

// Homepage only — links back to OrganizationSchema via @id, so keep both @id values in sync.
function WebsiteSchema() {
  return (
    <Helmet>
      <script type="application/ld+json">
        {JSON.stringify(WEBSITE_SCHEMA)}
      </script>
    </Helmet>
  );
}

export default WebsiteSchema;
