[English](README.md) | [Português (Brasil)](README.pt-BR.md) | [Español](README.es.md)

# push_

push_ é um dashboard de atenção para repositórios no GitHub, feito para uma função principal: mostrar primeiro o que precisa de ação.

Ele opera em três modos:
- `desktop` (Tauri): app nativo para Windows/macOS/Linux, com dashboard completo, token salvo no keyring do sistema e acesso aos seus repositórios privados
- `localhost`: modo local seguro, com token do GitHub só em memória para descoberta de repositórios e diagnósticos mais ricos, incluindo seus repositórios privados
- `GitHub Pages`: modo público por snapshot, com dados estáticos, sem fluxo de token no navegador e sem qualquer dado de repositório privado

## Por que existe

Muitos dashboards pessoais desperdiçam espaço com métricas de vaidade. O push_ é guiado por sinais operacionais:
- alertas abertos
- saúde degradada do repositório
- falhas de workflow
- atividade parada
- movimento recente nos repositórios observados

## Capacidades principais

- Dashboard guiado por atenção, ordenado por pressão de problema e movimento recente
- Página de detalhe por repositório com contexto de health, workflow, security e commits recentes
- Pontuação de health por repositório com o contexto de alertas, workflows e atividade que a geram
- Modos de visualização Balanced, Detailed e Full para controlar o quanto uma página de repositório mostra
- Logos reais de repositório com fallback para iniciais (sem cards genéricos de preview do GitHub)
- Inspeção de perfil público sem token para repositórios públicos
- Descoberta e acompanhamento de repositórios privados apenas nos runtimes `desktop` e `localhost`, por opt-in e nunca no snapshot publicado
- Publicação por snapshot para runtime seguro no Pages
- Suporte de idioma para `en`, `pt-BR` e `es`
- Detecção automática do idioma do navegador com override manual em settings

## Modos de runtime

### Modo desktop (Tauri)

- App nativo construído com Tauri 2, sem depender do navegador
- O token do GitHub é salvo no keyring do sistema (`tauri-plugin-keyring-store`), nunca em `localStorage`
- A sessão é restaurada do keyring na abertura e validada contra a API do GitHub
- Titlebar customizada por plataforma com controles nativos de janela
- Sincronia de tema com o SO (`light`/`dark`) além dos 7 temas nomeados do app

```bash
npm run tauri:dev    # rodar em desenvolvimento
npm run tauri:build  # gerar o instalador (NSIS no Windows)
```

### Modo local seguro

- Aceita token do GitHub apenas em `localhost`
- Mantém o token só em memória na aba ativa
- Permite descobrir todo repositório acessível, público e privado, e escolher o que entra no dashboard
- Agrupa a lista em Públicos, Privados, Forks e Outros, com ações de selecionar e limpar por grupo
- Informa quantos repositórios estão no escopo do token conectado e quantos deles são privados

### Modo público por snapshot

- Serve JSON estático gerado antecipadamente
- Nunca aceita token no navegador
- Nunca lista, lê ou publica um repositório privado: a geração de snapshot recusa uma entrada privada
- Mantém deep links e inspeção de repositório público de forma segura

## Instalação

```bash
npm ci
```

Opcional, mas recomendado:

```bash
npm run hooks:install
```

Isso instala o hook rastreado em `.githooks/pre-push`, para que cada `push` execute o gate local antes de sair.

## Uso local

Iniciar a aplicação:

```bash
npm run dev
```

Iniciar com sincronização nova de snapshot:

```bash
npm run dev:snapshot
```

Gerar os dados de snapshot manualmente:

```bash
npm run data:sync
```

## Snapshot e modo público

- O site publicado lê os dados de snapshot em `data/`
- A geração de snapshot pode rodar localmente ou no GitHub Actions
- O modo de perfil público pode inspecionar dados públicos do GitHub sem autenticação

## Modelo de segurança

- O runtime publicado no GitHub Pages não aceita token
- Nenhum token é persistido em `localStorage`, `sessionStorage`, cookies ou no bundle estático
- O modo local seguro mantém credenciais só em memória
- O modo desktop salva o token no keyring do sistema operacional, não em arquivos
- Conteúdo de repositório privado nunca é gravado no cache local nem em snapshot publicado: no cache local só podem aparecer nomes de repositórios públicos, e o restante é reconstruído a partir do token
- Validações sensíveis bloqueiam regressões comuns antes do `push`

## Validação e gates de qualidade

Comandos principais:

```bash
npm run lint
npm run type-check
npm run test:ci
npm run validate
```

Cobertura do gate:
- lint e tipagem estática
- testes
- integridade das chaves de locale e verificação de jargão reservado
- consistência de documentação
- checagens de padrões seguros de código
- checagens de padrões do repositório
- auditoria do build público

O workflow do GitHub Pages usa o mesmo ponto de entrada:

```bash
npm run audit
```

## Releases

As releases são cortadas ao enviar uma tag `vX.Y.Z` e executadas pelo protocolo
reutilizável de release do [`mafhper/release-core`](https://github.com/mafhper/release-core)
(o caller fica em `.github/workflows/release.yml`; o contrato, em
`.github/release.config.json`).

- Arte da release por linha: `docs/images/releases/release.webp` (nova linha `major.minor` exige nova imagem)
- Notas editoriais: `.github/release-notes/` (em inglês, linguagem direta)

Suba as versões de desktop e acrescente a entrada no change log localmente:

```bash
npm run release -- minor
```

Depois commite, crie a tag e envie para disparar o build de release:

```bash
git tag vX.Y.Z && git push origin main && git push origin vX.Y.Z
```
