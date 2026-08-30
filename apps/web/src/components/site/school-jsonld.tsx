import { siteConfig } from "@/site/site-config";

export function SchoolJsonLd() {
  const { name, description, contact, socials } = siteConfig;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "EducationalOrganization",
    name,
    description,
    url: siteConfig.baseUrl,
    logo: `${siteConfig.baseUrl}${siteConfig.logo}`,
    address: {
      "@type": "PostalAddress",
      streetAddress: `${contact.addressLine1}, ${contact.addressLine2}`,
      addressLocality: contact.city,
      addressCountry: contact.country,
    },
    telephone: contact.phone,
    email: contact.email,
    sameAs: Object.values(socials),
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
}
