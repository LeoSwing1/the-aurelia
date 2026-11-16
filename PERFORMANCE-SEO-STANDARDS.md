# The Aurelia — Performance, SEO and Audit Standards

## Objective
Build for excellent Core Web Vitals, accessibility, technical SEO and fast rendering. A 100 Lighthouse score is a target, not a guarantee: scores vary with hosting region, device, network, third-party scripts, image payloads and test conditions. Never claim a 100 score until the production URL has been tested repeatedly.

## Implemented in this update
- Removed remote Google Fonts CSS imports that delayed first paint; use system font fallbacks until licensed font files are self-hosted.
- Added page title templates, descriptions, Open Graph and Twitter metadata.
- Added `robots.txt` and `sitemap.xml` routes; admin and API paths are disallowed.
- Added basic Hotel JSON-LD without inventing an address, phone number, rating or price.
- Added responsive viewport, skip link, visible keyboard focus and reduced-motion support.
- Enabled AVIF/WebP image output and Unsplash remote image allowlisting for Next Image adoption.
- Enabled compression, package import optimization and baseline security response headers.

## Required before production
1. Set `NEXT_PUBLIC_SITE_URL` to the hotel's verified canonical domain.
2. Replace all remote placeholder images with approved hotel photographs, compress them to AVIF/WebP and use `next/image` with accurate `sizes`; mark only the actual LCP hero image as priority.
3. Replace CSS background hero images with a responsive optimized image or locally hosted optimized asset; CSS backgrounds are not automatically optimized by Next Image.
4. Add verified hotel address, telephone, geo coordinates, check-in/out, amenities and social links to metadata/schema only after management supplies them.
5. Add unique title/description and canonical URL per public page; add real Open Graph image after brand assets are received.
6. Keep admin pages `noindex`; ensure no private data is rendered into public HTML.
7. Defer analytics, chat widgets, maps and marketing scripts until consent/need; load third-party scripts after interaction where possible.
8. Test forms, keyboard navigation, contrast, screen readers, 404/500 states, mobile breakpoints and all internal links.

## Performance budgets
- Core Web Vitals targets at the 75th percentile: LCP <= 2.5s, INP <= 200ms, CLS <= 0.1.
- Initial JS: keep route-level client components small; prefer Server Components and avoid unnecessary client-side libraries.
- Images: responsive dimensions, modern formats, lazy-load below-the-fold imagery, avoid layout shifts with explicit aspect ratios.
- Fonts: self-host WOFF2, subset weights and use `font-display: swap` if/when custom fonts are added.
- Avoid autoplay video, heavy carousels and blocking third-party embeds.

## Local checks (Windows CMD)
```cmd
npm install
npm run lint
npm run typecheck
npm run build
npm run dev
npm run audit:performance
```

Run Lighthouse against the deployed production URL on mobile and desktop at least three times. Review the median, not a single run. Also run PageSpeed Insights and Search Console after the domain is live. Record the date, URL, device profile and scores. Fix all critical issues and retest.

## 100% audit policy
Aim for 100 in Lighthouse SEO, Accessibility and Best Practices where the actual content and integrations permit; aim for the strongest repeatable Performance score while meeting Core Web Vitals. A perfect lab score does not guarantee real-user speed or search rankings. Do not use hidden text, keyword stuffing, fake reviews, fabricated business details or accessibility overlays to inflate scores.


## Build configuration fixes (November 2026)

- Tailwind CSS v4, `@tailwindcss/postcss`, and PostCSS are declared as development dependencies.
- `postcss.config.mjs` uses the Tailwind v4 PostCSS plugin.
- ESLint ignores generated Next.js output, dependencies, and build folders.
- Internal admin navigation uses `next/link`.

These changes address the missing Tailwind module and generated-file lint noise. They do not constitute a verified production build or a measured Lighthouse score; run the local validation commands in the README after installing dependencies.

## Image optimisation update
- The homepage LCP hero and public-page hero media now use `next/image` with responsive sizing and AVIF/WebP output.
- Content gallery cards use `next/image` with explicit intrinsic dimensions and responsive `sizes` to reduce layout shift and unnecessary downloads.
- Replace all Unsplash design references with hotel-owned, approved photography before production; the current images are still illustrative references, not photographs of the property.
