# Plano de Remediação — Consolidado

Plano único baseado nas auditorias desta sessão (rotas, build, semântica/SEO, acessibilidade, mobile, links/menus, code-splitting, imagens, vídeos). Organizado por prioridade. Cada item indica arquivo/efeito.

---

## P0 — Crítico (fazer antes de qualquer coisa)

**1. Remover dados pessoais expostos em `/public`**
- Apagar `public/compradores_cohapm_*.xlsx` (22 MB com CPF, telefone, endereço — exposição direta LGPD).
- Migrar o conteúdo para tabela Supabase com RLS restrito a admins.
- Auditar `/public` para outros arquivos sensíveis.

**2. Corrigir signup quebrado** (apontado em auditoria anterior)
- Revisar `useAuth.tsx` / página de cadastro: fluxo, validação, confirmação de e-mail.

---

## P1 — Alto impacto, esforço baixo/médio

**3. Code-splitting de rotas**
- Em `src/App.tsx`: trocar imports estáticos por `React.lazy` para todas as páginas exceto Home/Login/NotFound. Envolver `<Routes>` em `<Suspense fallback={...}>`.
- Alvo: tirar `Admin.tsx` (2981 linhas), `AdminDashboard.tsx`, `AreaCooperado.tsx`, `PreviewImportacao.tsx` do bundle inicial.

**4. Dynamic import de libs pesadas**
- `xlsx` (7.2 MB) → `const XLSX = await import('xlsx')` dentro dos handlers de export/import (7 arquivos).
- `jspdf` + `jspdf-autotable` → dynamic import nos geradores de PDF (2 libs).
- `recharts` → já isolado em rotas admin; garantir lazy via rota.

**5. Otimizar imagens críticas (LCP)**
- Converter `hero-background.png` (2.3 MB) e variantes para WebP/AVIF (alvo <300 KB).
- Re-exportar 12 imagens da galeria Lazer (1.5–2.9 MB cada) em WebP a 400w + 1600w.
- Adicionar `loading="lazy"` nos `<img>` da galeria Lazer em `Home.tsx`.
- Adicionar `vite-plugin-image-optimizer` para compressão automática.

**6. Vídeos — poster + preload**
- Adicionar `poster`, `preload="none"` (ou `metadata`), `playsinline`, `muted` quando autoplay. Substituir embeds YouTube por `lite-youtube-embed` se houver mais de 1 visível.

**7. Links/menus quebrados**
- Substituir `href="#"` e `onClick={() => {}}` vazios por rotas reais ou remover.
- Padronizar navegação (Header/Footer/menu mobile usando mesmas rotas).

---

## P2 — Qualidade, Web Vitals e a11y

**8. Vite — `manualChunks`**
- Configurar chunks: `react`, `radix`, `charts`, `pdf`, `excel`, `supabase`.

**9. `OptimizedImage`**
- Adicionar `srcSet`/`sizes` (3 breakpoints), `width`/`height` para evitar CLS, `&format=webp` nas URLs Supabase, `fetchPriority` em LCP.

**10. Acessibilidade**
- Foco visível (ring) consistente em todos os interativos.
- `aria-label` em ícones-botão, `alt` significativo em imagens (vazio se decorativo).
- `<label>` associado a todo input; `htmlFor` correto.
- Gestão de foco em modais (trap + restore) — checar componentes Dialog custom.
- Navegação por teclado em menus dropdown.

**11. Mobile**
- Áreas de toque ≥44×44 px (botões de ícone do Header).
- Eliminar overflow horizontal (auditar containers com `w-screen`/largura fixa).
- Confirmar `<meta name="viewport">` em `index.html`.
- Menu mobile: revisar abertura/fechamento e foco.

**12. Semântica/SEO**
- `<main>`, `<nav>`, `<header>`, `<footer>` corretos por página.
- Hierarquia de headings (um `<h1>` por rota).
- `<title>` e `<meta description>` por rota (react-helmet-async ou similar).
- Open Graph + Twitter Card; sitemap.xml; robots.txt.

**13. Refatorar `Admin.tsx`** (2981 linhas)
- Quebrar por feature em subcomponentes/rotas filhas para permitir splitting interno.

**14. Prefetch após login**
- Em `useAuth.tsx`, após sucesso, `import()` das rotas privadas mais usadas.

---

## P3 — Polimento

- Remover hero duplicado (`hero-background-new.png`).
- LQIP/blurhash no `OptimizedImage`.
- Migrar `useEffect+useState` de fetch para React Query (cache, dedupe).
- Validar uso consistente de `OptimizedImage` em vez de `<img>` em listagens dinâmicas.
- Remover assets não referenciados em `/public` e `src/assets`.

---

## Ordem de execução sugerida

```text
Fase 1 (segurança):    P0.1, P0.2
Fase 2 (performance):  P1.3, P1.4, P1.5, P1.6
Fase 3 (UX/links):     P1.7, P2.10, P2.11
Fase 4 (qualidade):    P2.8, P2.9, P2.12, P2.13, P2.14
Fase 5 (polimento):    P3
```

## Métricas de sucesso

- Bundle JS inicial: >1 MB → ~300 KB gzipped.
- Peso da Home: >30 MB → <3 MB.
- LCP mobile (4G): meta <2.5 s.
- 0 arquivos com dados pessoais em `/public`.
- Lighthouse a11y ≥95.

---

Quer que eu execute em sequência (Fase 1 → Fase 5) ou prefere atacar só Fase 1+2 primeiro e revisar antes de seguir?
