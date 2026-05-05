# Plano consolidado — Segurança, Performance e Mídia

Ordem por severidade. Cada bloco é independente e pode ser aplicado isoladamente, mas recomendo seguir a ordem.

---

## 🔴 CRÍTICO — Bloco P0 (esforço: ~45 min)

Riscos reais de exploração imediata. Resolver primeiro.

### 1. RLS na tabela `rate_limits`
- **Causa:** tabela sem políticas — qualquer usuário autenticado pode ler/zerar contadores e burlar throttling.
- **Correção:** habilitar RLS, política `service_role only` (negar tudo a `authenticated`/`anon`).

### 2. Edge functions admin sem checagem de role
- **Funções afetadas:** `criar-cooperado`, `upload-cooperados-lote`, `reset-senha-cooperado`, `excluir-cooperado` (e similares).
- **Causa:** usam `SERVICE_ROLE_KEY` mas só validam JWT, não verificam se o caller é `admin`. Qualquer cooperado autenticado consegue invocar e criar/excluir usuários.
- **Correção:** após `getClaims()`, chamar `has_role(userId, 'admin')` server-side; retornar 403 caso falhe.

### 3. Bloqueio de auto-promoção em `user_roles`
- **Causa:** política atual permite que o próprio usuário insira seu role.
- **Correção:** política `INSERT/UPDATE/DELETE` em `user_roles` apenas para `has_role(auth.uid(),'admin')`.

### 4. Realtime / leak de PII em `profiles`
- **Causa:** `profiles` exposto por publication realtime sem filtro.
- **Correção:** remover `profiles` do `supabase_realtime` ou restringir colunas via view.

---

## 🟠 ALTO — Bloco P1 (esforço: ~1h)

### 5. Trigger anti-tampering em `profiles`
- **Causa:** cooperado pode editar `cpf`, `email`, `quadra`, `lote` do próprio perfil.
- **Correção:** `BEFORE UPDATE` trigger que reverte alteração desses campos se caller não for admin.

### 6. `obra_fotos.uploaded_by` sem `ON DELETE SET NULL`
- **Causa:** excluir um admin quebra FKs e impede delete em cascata.
- **Correção:** alterar FK para `ON DELETE SET NULL`.

### 7. Hardening de uploads (bucket `obra-fotos` público)
- **Causa:** sem limite de tamanho/MIME — risco de abuso de storage.
- **Correção:** definir `file_size_limit` e `allowed_mime_types` no bucket.

### 8. `verify_jwt` explícito em funções públicas vs privadas
- **Correção:** auditoria do `config.toml` + validação `getClaims()` em todas funções privadas.

---

## 🟡 MÉDIO — Bloco P2 (esforço: ~45 min)

### 9. Leaked Password Protection (HIBP)
- **Correção:** ativar via `configure_auth` (`password_hibp_enabled: true`).

### 10. Política de senha mínima
- **Correção:** mínimo 8 caracteres + complexidade.

### 11. Índices faltantes (performance + segurança via DoS)
- `obra_fotos(categoria, created_at)`, `profiles(cpf)`, `user_roles(user_id)`, `compradores_cohapm(chave_vinculacao)`.
- Drop de ~7 índices duplicados detectados pelo linter.

### 12. Validação de input nas edge functions
- **Correção:** Zod schemas em `criar-cooperado`, `upload-cooperados-lote`, `reset-senha-cooperado`.

---

## 🟢 BAIXO — Bloco P3 (esforço: ~1h)

### 13. Headers de segurança (CSP, X-Frame-Options, Referrer-Policy)
- Via `index.html` `<meta>` + edge function de proxy se necessário.

### 14. Performance de mídia
- `OptimizedImage` com `srcset` (400/800/1600) já existe → substituir `<img>` puro restantes em `Home.tsx` e galerias.
- `cacheControl: '31536000'` em todos os uploads de `obra-fotos`.
- Sugerir trocar upload de vídeo por embed YouTube/Vimeo (custo de egress).

### 15. Limpeza de findings ignoráveis no scanner
- Marcar como `ignore` os findings que são intencionais (ex.: bucket `obra-fotos` público para a galeria pública), com justificativa em `security-memory`.

---

## Resumo executivo

| Prioridade | Itens | Esforço | Reduz superfície de ataque |
|---|---|---|---|
| 🔴 P0 | 4 | ~45 min | ~70% |
| 🟠 P1 | 4 | ~1h | ~20% |
| 🟡 P2 | 4 | ~45 min | ~7% |
| 🟢 P3 | 3 | ~1h | ~3% (perf/UX) |

**Total: ~3h30 para zerar todos os 13 findings do scanner + endurecer o resto.**

---

## Aprovação

Posso aplicar **tudo de uma vez** ou apenas **P0+P1** primeiro (cobre 90% do risco em ~1h45). Me diga qual caminho prefere.
