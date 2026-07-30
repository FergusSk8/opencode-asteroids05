# Plano: Corrixer o "Author identity unknown" do action opencode

## Estado
Aprobado polo usuario: xa está aplicado o fix anterior (`use_github_token: true` +
`GITHUB_TOKEN` + permisos `write`). Eso resolveu o `Failed to parse JSON`. Agora
aparece un novo erro de git identity.

## Erro actual

```
Author identity unknown

*** Please tell me who you are.

Run
  git config --global user.email "you@example.com"
  git config --global user.name "Your Name"

fatal: empty ident name (for runner@runnervm7i58z...) not allowed
```

## Diagnóstico raíz

No `github.handler.ts`, o método `configureGit()` (que setea `user.name` e
`user.email` de git dentro do runner) só se invoca no path da App. No handler
(liña ~488) vese:

```ts
if (!useGithubToken) {
  await configureGit(...)   // só se configura cando se usa a OpenCode App
}
```

Mentres tanto, `actions/checkout@v6` con `persist-credentials: false` NON setea
`user.name`/`user.email` (sese hábito, o checkout só persiste ou non o token, non
a identidade de commit). Resultado: cando opencode tenta facer
`git commit`/`git push` (porque xera unha branch e un PR para aplicar o cambio
pedido), git nega con "Author identity unknown / empty ident name not allowed".

NON é un bug do opencode; é o esperado no path de `GITHUB_TOKEN` puro: o workflow
ten que prover a identidade.

## Cambio a aplicar a `.github/workflows/opencode.yml`

Engadir un paso novo "Configure git identity" entre o checkout e o "Run opencode":

Estado actual (despois do fix anterior):

```yaml
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

Estado modificado:

```yaml
    steps:
      - name: Checkout repository
        uses: actions/checkout@v6
        with:
          persist-credentials: false

      - name: Configure git identity
        run: |
          git config user.name "github-actions[bot]"
          git config user.email "41898282+github-actions[bot]@users.noreply.github.com"

      - name: Run opencode
        uses: anomalyco/opencode/github@latest
        env:
          OPENCODE_API_KEY: ${{ secrets.OPENCODE_API_KEY }}
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        with:
          model: opencode-go/glm-5.2
          use_github_token: true
```

### Notas
- O email `41898282+github-actions[bot]@users.noreply.github.com` é o enderezo
  noreply canónico de `github-actions[bot]` (o ID de usuario 41898282 é o fixo
  para ese bot en github.com). Os commits asinaránse a nome de github-actions bot.
- `git config` sen `--global` afecta só ao repo checheado no runner, que é o que
  se quere (o runner é efémero). `--global` tamén funcionaría pero non é preciso.
- Este paso execútase no working dir do checkout, onde precisamos que exista a
  identidade.

## Opcional: commits a nome do usuario que lanza o /oc

Se preferirías que os commits leven a identidade do usuario que pediu o /oc
(rather than github-actions bot), pódese usar o actor do evento:

```yaml
      - name: Configure git identity
        run: |
          git config user.name "${{ github.actor }}"
          git config user.email "${{ github.actor_id }}+${{ github.actor }}@users.noreply.github.com"
```

`github.actor_id` está dispoñible en actions recentes. Recomendo o fixo bot por
simplicidade e porque o bot ten os permisos garantidos vía `permissions: write`.

## Verificación

Despois do commit/push:
1. Repetir o `/oc` nun issue/PR do repo.
2. O step "Configure git identity" pasa cun check verde.
3. O "Run opencode" xa non falla con "Author identity unknown".
4. Opencode crea a branch/PR e os commits levan `github-actions[bot]` como autor.