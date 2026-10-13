# JSON-LD Templates — xSypher (Finding SCH-001)
# Ready-to-paste. `{...}` placeholders apne values se badlein.

## 1) Organization — linked version (lib/entity-schema.ts generateOrganizationJsonLd mein)
```json
{
  "@context": "https://schema.org",
  "@type": "Organization",
  "@id": "https://xsypher.com/#organization",
  "name": "xSypher",
  "url": "https://xsypher.com",
  "logo": { "@type": "ImageObject", "url": "https://xsypher.com/xsypher-logo-full.png" },
  "sameAs": [
    "https://x.com/xSypherTech",
    "https://github.com/anwariqbaldawar",
    "https://www.linkedin.com/in/anwar-iqbal-dawar-6564ba37a"
  ]
}
```

## 2) NewsArticle — publisher ko @id se link karo (lib/seo.ts generateNewsArticleJsonLd)
```json
"publisher": { "@id": "https://xsypher.com/#organization" }
```
(poori inline Organization object hata do; `@id` reference kaafi hai.)

## 3) Author Person — enhance (lib/entity-schema.ts generatePersonJsonLd)
```json
{
  "@context": "https://schema.org",
  "@type": "Person",
  "@id": "https://xsypher.com/author/anwar-iqbal-dawar#person",
  "name": "Anwar Iqbal Dawar",
  "url": "https://xsypher.com/author/anwar-iqbal-dawar",
  "jobTitle": "Founder & Editor-in-Chief",
  "worksFor": { "@id": "https://xsypher.com/#organization" },
  "sameAs": [
    "https://github.com/ANWARDAWAR",
    "https://www.linkedin.com/in/anwar-iqbal-dawar-6564ba37a",
    "https://x.com/engr_anwardawar"
  ]
}
```

## 4) BreadcrumbList — category page (app/(public)/category/[slug]/page.tsx mein add karo)
```json
{
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  "itemListElement": [
    { "@type": "ListItem", "position": 1, "name": "Home", "item": "https://xsypher.com" },
    { "@type": "ListItem", "position": 2, "name": "{Category name}", "item": "https://xsypher.com/category/{slug}" }
  ]
}
```

## Validation (apply ke baad)
- https://search.google.com/test/rich-results (article + category)
- https://validator.schema.org/ (paste JSON-LD)
