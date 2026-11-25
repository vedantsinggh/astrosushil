import { Helmet } from "react-helmet-async";

const ORGANIZATION_SCHEMA = {
  "@context": "https://schema.org",
  "@type": "Organization",
  "@id": "https://astrosushil.com/#organization",
  name: "Astro Sushil",
  legalName: "Astro Sushil",
  url: "https://astrosushil.com/",
  logo: {
    "@type": "ImageObject",
    url: "https://astrosushil.com/logo/logo.webp",
  },
  image: "https://astrosushil.com/favicon.ico",
  founder: {
    "@type": "Person",
    name: "Astro Sushil Kumar Singh",
  },
  email: "connect@astrosushil.com",
  telephone: "+91-9621127233",
  contactPoint: [
    {
      "@type": "ContactPoint",
      telephone: "+91-9621127233",
      contactType: "customer support",
      areaServed: "IN",
      availableLanguage: ["English", "Hindi"],
    },
    {
      "@type": "ContactPoint",
      telephone: "+91-6393551359",
      contactType: "customer support",
      areaServed: "IN",
      availableLanguage: ["English", "Hindi"],
    },
  ],
  address: {
    "@type": "PostalAddress",
    streetAddress: "Cleo County Apartment, Sector 121",
    addressLocality: "Noida",
    addressRegion: "Uttar Pradesh",
    postalCode: "201307",
    addressCountry: "IN",
  },
  sameAs: [
    "https://www.facebook.com/astrosushilofficial/",
    "https://www.instagram.com/astrosushil/?hl=en",
    "https://x.com/astrosushil",
    "https://www.youtube.com/@astrosushil",
  ],
};

// Rendered once at the app root (see App.jsx) so it lands in <head> on every page without duplicating.
function OrganizationSchema() {
  return (
    <Helmet>
      <script type="application/ld+json">
        {JSON.stringify(ORGANIZATION_SCHEMA)}
      </script>
    </Helmet>
  );
}

export default OrganizationSchema;
