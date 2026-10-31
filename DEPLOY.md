# Despliegue en Cloudflare Pages

1. Instala la dependencia nueva: `npm install -D vite-plugin-pwa`
2. Comprueba en local: `npm run build && npm run preview` (DevTools → Application → Manifest / Service Workers).
3. Sube los cambios a GitHub.
4. Cloudflare → Workers & Pages → Create → Pages → Connect to Git → elige `stella-final`.
   - Framework preset: Vue (o None)
   - Build command: `npm run build`
   - Build output directory: `dist`
   - Variable de entorno `NODE_VERSION` = `20`
5. Deploy. Abre la URL `*.pages.dev` en el móvil y usa "Instalar app" / "Añadir a pantalla de inicio".

Notas
- Las peticiones a Supabase nunca se cachean (siempre red). Sin conexión se abre la app con lo último guardado en local.
- Tras cada deploy el service worker se actualiza solo; se ve la versión nueva al abrir la app una segunda vez.
- Los iconos de `public/icons/` son provisionales: sustitúyelos por los tuyos con los mismos nombres y tamaños (192, 512 y 512 maskable).
- Si Supabase restringe orígenes (CORS / Auth → URL Configuration), añade el dominio `*.pages.dev`.
