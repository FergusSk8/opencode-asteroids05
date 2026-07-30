# Plano: Corrixer o erro do GitHub Action do opencode

## Estado
Aprobado polo usuario: tomar o path de `GITHUB_TOKEN` do runner (alternativa documentada).

## Diagnóstico raíz

O erro

```
Run opencode github run
  Failed to parse JSON
  Creating comment...
  Error: Unexpected error
  undefined is not an object (evaluating 'p.rest')
  Error: Process completed with exit code 1.
```

provén de `packages/opencode/src/cli/cmd/github.handler.ts` no handler `githubRun`:

1. `exchangeForAppToken()` (liñas 988-1011) chama a
   `https://api.opencode.ai/exchange_github_app_token` para trocar o JWT OIDC
   (necesario por `id-token: write`) por un installation access token da OpenCode App.
2.devolveu un body **non-JSON** (páxina HTML 5xx de gateway/Cloudflare, ou baleiro).
   O `await response.json()` lanza `Failed to parse JSON`.
3. Por iso `octoRest = new Octokit({ auth: appToken })` (liña 482) **non se executa**
   -> `octoRest` queda `undefined`.
4. O catch block tenta publicar un comentario de fallback en `createComment()`
   (liña 1264): fai `console.log("Creating comment...")` e logo
   `octoRest.rest.issues.createComment(...)` -> `octoRest.rest` é `undefined`
   (minificado como `p`) -> `undefined is not an object (evaluating 'p.rest')`.
5. Esa segunda excepción foi do catch e o step remata con código 1.

### Non é a causa
- `permissions:` en read-only -> irrelevante no path da App (usa installation token
  da App, non o `GITHUB_TOKEN` do workflow).
- Nome da env var `OPENCODE_API_KEY` -> confirmado CORRECTO para o provider
  `opencode-go` (catálogo models.dev + código `provider.ts:1527`).
- Model id `opencode-go/glm-5.2` -> válido.
- Secret configurado -> autentica o provider LLM, non o intercambio de tokens.

### Causa probable
Outage transitorio do backend de OpenCode en `api.opencode.ai`, OU a OpenCode App
está instalada na conta pero sen acceso a este repositorio específico.

## Estratexia elixida

Bypassar o intercambio OIDC→App token por completo, pasando ao path alternativo
documentado co `GITHUB_TOKEN` nativo do runner. Con `use_github_token: true`, o
handler (liña 470-477) le `process.env["GITHUB_TOKEN"]` e salta
`getOidcToken()` + `exchangeForAppToken()`. Sen chamada a
`exchange_github_app_token`, non hai `Failed to parse JSON`.

Consecuencia visible: os comentarios/PRs asinaranos como `github-actions[bot]`
en vez da OpenCode App.

## Cambios a aplicar a `.github/workflows/opencode.yml`

Antes (actual):

```yaml
    permissions:
      id-token: write
      contents: read
      pull-requests: read
      issues: read
    steps:
      - name: Checkout repository
        uses: actions/checkout@v6
        with:
          persist-credentials: false

      - name: Run opencode
        uses: anomalyco/opencode/github@latest
        env:
          OPENCODE_API_KEY: ${{ secrets.OPENCODE_API_KEY }}
        with:
          model: opencode-go/glm-5.2
```

Despois:

```yaml
    permissions:
      id-token: write
      contents: write
      pull-requests: write
      issues: write
    steps:
      - name: Checkout repository
        uses: actions/checkout@v6
        with:
          persist-credentials: false

      - name: Run opencode
        uses: anomalyco/opencode/github@latest
        env:
          OPENCODE_API_KEY: ${{ secrets.OPENCODE_API_KEY }}
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        with:
          model: opencode-go/glm-5.2
          use_github_token: true
```

### Tres cambios concretos
1. `permissions:` -> `contents`, `pull-requests`, `issues` de `read` a `write`.
   O `GITHUB_TOKEN` do runner herda estes scopes; sen eles, `createComment` /
   `createPR` / push devolverían 403.
2. `env:` -> engadir `GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}`. Con
   `use_github_token: true`, o handler le esa env var (liña 471); se falta lanza
   `GITHUB_TOKEN environment variable is not set...`.
3. `with:` -> engadir `use_github_token: true`. Desactiva o path da App e activa o
   do runner, saltando o endpoint defectuoso.

`id-token: write` é innecesario agora, pero é inofensivo deixalo.

## Verificación

Despois do commit/push:
1. Abrir un issue de proba no repo (ou un PR) e comentar `/oc` (ou `/opencode`).
2. Ir a Actions -> workflow "opencode" -> ver que o step "Run opencode" pase.
3. Debe chegar un comentario de `github-actions[bot]` coa resposta, en vez de erro.
4. Se aínda falla con `Failed to parse JSON` -> o bug é noutro:intercambiar a
   estratexia a "investigar a App installation" (github.com/apps/opencode-agent
   -> Configure -> seleccionar este repo).