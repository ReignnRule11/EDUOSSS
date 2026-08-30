import { siteConfig } from "@/site/site-config";

export function MapEmbed() {
  return (
    <div className="overflow-hidden rounded-2xl border">
      <iframe
        title={`Map showing ${siteConfig.name} location`}
        src={siteConfig.contact.mapEmbedUrl}
        width="100%"
        height="400"
        style={{ border: 0 }}
        allowFullScreen
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
        className="block w-full"
      />
    </div>
  );
}
