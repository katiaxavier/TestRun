# Redesign UI TestRun — tema claro/escuro, cores da marca, animações e componentes

## Contexto

O frontend (React 19 + Vite + framer-motion + Recharts, estilo em `src/index.css` com variáveis CSS) tem hoje um único tema escuro **azulado** (`#0d0f14/#13161e`) que não conversa com a identidade da marca. O usuário quer um redesign completo: layout otimizado, paleta revisada mantendo o laranja `#ff6002`, animações de transição e micro-interação, componentes modernizados "fugindo levemente do padrão" sem comprometer UX, e um toggle claro/escuro.

**Decisões alinhadas com o usuário:**
- **Estética "quente e sofisticada"**: tema claro creme (`#fffeee` base, `#ffffff` superfícies, tinta `#161616`), tema escuro carvão quente (`#161616` base, cinzas quentes no lugar dos darks azulados), cantos bem arredondados, sombras suaves, laranja como acento (gradiente sutil `#ff6002→#dd4012`). Secundárias: `#3f3f3f`, `#818b9d`.
- **Tema padrão segue o sistema** (matchMedia); toggle manual persiste em `localStorage.theme`.
- **Tipografia**: corpo/UI = **DM Sans** (fonte da marca); títulos/números = **Bricolage Grotesque** (complementar com personalidade; usuário vetou Roboto/Inter/Montserrat); **DM Mono** para código/chaves Jira.
- Manter a arquitetura CSS atual (variáveis + classes globais) — **não** adotar Tailwind (está no package.json mas nunca foi ativado no Vite).

Convenção do repo: salvar este plano também como `PLANO-REDESIGN-UI.md` na raiz (arquivo novo, sem sobrescrever os PLANO-*.md existentes) — primeiro passo da implementação.

## 1. Sistema de tokens (`frontend/src/index.css`, bloco linhas 4–49)

`:root` = tema escuro (fallback) + `:root[data-theme="light"]` como override; o atributo `data-theme` é sempre gravado no `<html>` por script (fonte única, toggle manual vence o sistema). `color-scheme: dark`/`light` em cada bloco (conserta scrollbar/date picker nativos e permite remover o `filter: invert(1)` da linha 179, que quebraria no claro).

Escala completa, todo token de cor com par light:
- **Superfícies dark (carvão quente)**: `--bg-base:#161616`, `--bg-surface:#1e1d1a`, `--bg-elevated:#26241f`, `--bg-overlay:#2e2b26`, `--bg-subtle` (novo — corrige bug do DropdownMenu que referencia token inexistente), bordas `#3a372f/#2b2924`, textos `#f2efe6/#a8a294/#736e60`.
- **Superfícies light (creme)**: `--bg-base:#fffeee`, `--bg-surface:#ffffff`, `--bg-elevated:#faf8ea`, `--bg-subtle:#f6f4e4`, bordas `#e6e2cf/#efecdc`, textos `#161616/#3f3f3f/#818b9d`.
- **Marca**: `--accent:#ff6002`, `--accent-hover:#dd4012`, `--accent-subtle`, `--accent-grad: linear-gradient(135deg,#ff6002,#dd4012)`, `--on-accent`, `--brand-slate:#818b9d`, `--brand-gray:#3f3f3f`.
- **Status**: versões vivas no dark, escurecidas no light (contraste sobre creme); pares `-bg`.
- **Caixas semânticas**: `--danger-bg/border`, `--info-bg/border`, `--warning-bg/border` (substituem os rgba repetidos nos .tsx).
- **Severidade/gráficos**: `--sev-gravissima…--sev-trivial` (+ `-bg`), `--chart-grid`, `--chart-axis`, `--chart-muted` (substitui `#555e76`).
- **Forma**: radii maiores (`--radius-sm:10px`, `--radius:16px`, `--radius-lg:22px`, `--radius-xl:28px`, `--radius-full`), sombras suaves por tema, `--overlay-scrim`.
- **Fontes**: `--font-body` (DM Sans), `--font-display` (Bricolage Grotesque), `--font-mono` (DM Mono). Fontes via `<link>` no `index.html` com preconnect (remover `@import` do Inter da linha 1 do CSS).

## 2. Tema: provider, toggle e anti-flash

- **`frontend/index.html`**: script inline no `<head>` antes do bundle — lê `localStorage.theme`, senão `matchMedia('(prefers-color-scheme: dark)')`, e grava `document.documentElement.dataset.theme`. + `<meta name="theme-color">`.
- **Novo `src/context/ThemeContext.tsx`**: `theme`/`toggleTheme`; sem chave salva, escuta mudanças do sistema ao vivo; efeito sincroniza `dataset.theme` e o meta theme-color (`#161616`/`#fffeee`). Montado em `main.tsx` (cobre LoginPage e loading).
- **Novo `src/components/ThemeToggle.tsx`**: botão ícone Sol/Lua (Phosphor) com morph animado (`AnimatePresence mode="wait"` + rotate/scale). Colocado no **TopBar** (cluster à direita, `margin-left:auto`) e no canto do **LoginPage** (que não tem TopBar).

## 3. Tokenização das paletas de dados (pré-requisito dos 2 temas)

- `src/utils/priority.ts`: `PRIORITY_COLORS`/`SEVERITY_COLORS` (12 hex + 6 rgba) → `var(--sev-*)`/`var(--sev-*-bg)`; assinaturas intactas — consumidores (QualidadeTab, EficienciaTab, JiraIssuesPage, ExecutionRunPage) continuam funcionando. Recharts resolve `fill="var(--…)"` em SVG (técnica que `dashboard/shared.ts bandColor` já usa — não muda).
- `src/pages/ExecutionRunPage.tsx:24-27`: mapa `STATUS_COLORS` → `var(--status-*)`.
- `src/pages/dashboard/QualidadeTab.tsx:19`: `#555e76` → `var(--chart-muted)`; grids/eixos/tooltips dos gráficos → `--chart-grid/--chart-axis/--bg-overlay`.
- `src/components/ExecutionCard.tsx:15-27`: rgba de status → tokens.

## 4. Redesign visual (index.css + componentes base)

- **Tipografia**: `body` → DM Sans; `.page-title`, `.stat-value`, `.modal-title`, títulos → `--font-display`; `code`/chaves Jira → DM Mono. `html` 17px → 16px (DM Sans rende maior que Inter; revisar densidade).
- **Botões**: `.btn-primary` com gradiente laranja e formato **pill** (`--radius-full`) — o "leve fora do padrão"; hover eleva com sombra; `.btn-danger` → tokens; **remover** `.btn-create-batch` (linhas 74–104, legada) migrando usos para `.btn`.
- **Cards**: `--radius-lg`, sombra de repouso no tema claro (creme pede sombra), hover com elevação via motion.
- **Tabs ≠ filtros**: novas classes `.tabs/.tab` com **pill ativa animada via `layoutId`** (framer); `.filters` mantida para filtros reais, retokenizada (remover slates hardcoded `#94A3B8` etc., linhas 116–160).
- **Tabelas**: wrapper com borda + `--radius`, `thead` com `--bg-subtle`.
- **Modal/Drawer**: modal `--radius-xl`; drawer com cantos esquerdos arredondados; overlay via `--overlay-scrim`.
- **DropdownMenu.tsx**: estilos extraídos para classes `.menu/.menu-item`, hover corrigido (`--bg-subtle` agora existe), sombra hardcoded → `var(--shadow-md)`.
- **Login**: card `--radius-xl` + `--shadow-lg`, gradiente radial sutil de fundo com accent a ~4%, entrada animada.
- Badges, tags, toasts (barra lateral de status), empty states, scrollbar, spinner: retokenizados/refinados.

## 5. Layout

- `.page`: `max-width: 3200px` → `1680px`; padding `clamp(1.25rem, 2.5vw, 2.5rem)`; `.page-header` margin 3rem → 2rem.
- **TopBar**: fundo translúcido `color-mix(... 85%, transparent)` + `backdrop-filter: blur(12px)`; cluster direito com ThemeToggle.
- **Sidebar**: indicador ativo vira `layoutId` (substitui `::before`); `.sidebar-context` com radius novo.
- `.cards-grid`: minmax 440px → 400px (com max-width menor, 440 força coluna única cedo).

## 6. Animações

- **Novo `src/utils/motion.ts`**: variants compartilhados (`fadeInUp`, `fadeIn`, `staggerContainer`, `springSnappy`, `springSoft`, `pageTransition`) — hoje tudo é inline e repetido em 12 arquivos.
- **Transições de rota** (`App.tsx`): extrair `<AnimatedRoutes/>` com `AnimatePresence mode="wait" initial={false}` + `<Routes location={location} key={location.pathname}>`; cada página embrulhada em novo `src/components/PageTransition.tsx` (fade + 8px, ~0.18s — exit curto para não atrasar navegação).
- **Micro-interações**: `whileHover/whileTap` em botões primários e cards clicáveis; pill de tabs e indicador da sidebar com `layoutId`; morph sol/lua no toggle; novo `src/components/CountUp.tsx` (useMotionValue) nos `.stat-value` do dashboard; toasts com spring.
- **Reduced motion**: `<MotionConfig reducedMotion="user">` no App + bloco CSS `@media (prefers-reduced-motion: reduce)`.

## 7. Limpeza das ~36 cores hardcoded nos .tsx

| Caso | Onde | Vira |
|---|---|---|
| Caixas de erro `rgba(239,68,68,*)` | LoginPage:23, SuitesPage:127/303-304, SuiteDetailPage:71, ExecutionFormModal:110, BatchExecutionModal:90 | nova classe `.alert-danger` (`--danger-*`) |
| Chips azuis `rgba(59,130,246,*)` | ExecutionRunPage:170/1735-1736, BatchExecutionModal:64/67 | `--info-*` |
| Tags amarelas `rgba(255,209,90,.18)` | SuiteBatchTable:125, BatchCard:28 | `--warning-bg` (aposentar `--tertiary*`) |
| `#fff` | SuiteBatchTable:16, SuiteCard:16, ExecutionRunPage:575/989 | `--on-accent`/`--text-primary` |
| Sombra DropdownMenu:43 | | `var(--shadow-md)` |

## Fases de execução

1. **Fundações** — `PLANO-REDESIGN-UI.md` na raiz · `index.html` (fontes, anti-flash, theme-color) · tokens novos no `index.css` (sem quebrar o resto) · `ThemeContext.tsx` · `ThemeToggle.tsx` · `main.tsx` · `TopBar.tsx` · `motion.ts`. ✓ App abre nos 2 temas sem flash, toggle persiste.
2. **Paletas de dados** — `priority.ts` · `QualidadeTab` · `ExecutionRunPage` (só linhas 24-27) · `ExecutionCard` · grids/eixos de `OperacaoTab`/`EficienciaTab`. ✓ Gráficos legíveis nos 2 temas.
3. **Redesign global** — `index.css` completo (§4/§5) + componentes base: `Modal`, `DropdownMenu`, `Tooltip`, `StatusBadge`, `PageHeader`, `SidebarSelect`, `InfoTooltip`, `Sidebar` (layoutId).
4. **Rotas animadas** — `App.tsx` (AnimatedRoutes + MotionConfig) · `PageTransition.tsx` · `CountUp.tsx`.
5. **Páginas** — Login, HomePage (tabs novas), Suites, SuiteDetail, Execuções, Executions, JiraIssues, BatchExecution + modais/cards associados (alertas/chips → tokens, stagger nos grids, CountUp nos stats).
6. **ExecutionRunPage.tsx** (1826 linhas, por último): chips, `#fff`, drawer com novos radii, filtros retokenizados, variants migrados para `motion.ts`.
7. **Verificação** — `npm run build` (tsc) · `npm run dev` com checagem visual página a página **nos 2 temas** (gráficos, badges, alertas, modais/drawers, date picker no light) · primeira visita sem localStorage segue o sistema · `prefers-reduced-motion` · grep final por hex/rgba soltos em `.tsx`.

**Riscos**: exit de rota longo atrasa navegação (manter ≤0.15s); html 17→16px mexe em todos os rem (revisar densidade); `color-mix`/`backdrop-filter` pedem browser moderno (ok para ferramenta interna).
