import React, { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import axios from 'axios';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function SiteHead() {
  const [design, setDesign] = useState(null);

  useEffect(() => {
    axios.get(`${API}/site/design`).then(res => setDesign(res.data)).catch(() => {});
  }, []);

  if (!design) return null;

  const seo = design.seo || {};
  const geo = design.geo_aio || {};
  const siteTitle = design.site_title || 'ArchHub';

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": geo.site_type || "WebSite",
    "name": siteTitle,
    "url": window.location.origin,
    ...(seo.description && { "description": seo.description }),
    ...(geo.org_name && {
      "publisher": {
        "@type": "Organization",
        "name": geo.org_name
      }
    }),
    ...(geo.site_desc && { "about": geo.site_desc }),
    "potentialAction": {
      "@type": "SearchAction",
      "target": `${window.location.origin}/articles?search={search_term_string}`,
      "query-input": "required name=search_term_string"
    }
  };

  return (
    <Helmet>
      <title>{siteTitle}</title>
      {design.favicon_url && <link rel="icon" href={design.favicon_url} />}
      {seo.description && <meta name="description" content={seo.description} />}
      {seo.keywords && <meta name="keywords" content={seo.keywords} />}
      <meta property="og:title" content={siteTitle} />
      {seo.description && <meta property="og:description" content={seo.description} />}
      {seo.og_image && <meta property="og:image" content={seo.og_image} />}
      <meta property="og:type" content="website" />
      <meta property="og:url" content={window.location.href} />
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={siteTitle} />
      {seo.description && <meta name="twitter:description" content={seo.description} />}
      {seo.og_image && <meta name="twitter:image" content={seo.og_image} />}
      <script type="application/ld+json">{JSON.stringify(jsonLd)}</script>
    </Helmet>
  );
}
