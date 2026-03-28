[English](README.md) | [Português (Brasil)](README.pt-BR.md) | [Español](README.es.md)

# Push_

Push_ é um dashboard de atenção para repositórios no GitHub, feito para uma função principal: mostrar primeiro o que precisa de ação.

Ele opera em dois modos:
- `localhost`: modo local seguro, com token do GitHub só em memória para descoberta de repositórios e diagnósticos mais ricos
- `GitHub Pages`: modo público por snapshot, com dados estáticos e sem fluxo de token no navegador

## Por que existe

Muitos dashboards pessoais desperdiçam espaço com métricas de vaidade. O Push_ é guiado por sinais operacionais:
- alertas abertos
- saúde degradada do repositório
- falhas de workflow
- atividade parada
- movimento recente nos repositórios observados

## Capacidades principais

- Dashboard guiado por atenção, ordenado por pressão de problema e movimento recente
- Página de detalhe por repositório com contexto de health, workflow, security e commits recentes
- Inspeção de perfil público sem token para repositórios públicos
- Publicação por snapshot para runtime seguro no Pages
- Suporte de idioma para `en`, `pt-BR` e `es`
- Detecção automática do idioma do navegador com override manual em settings

## Modos de runtime

### Modo local seguro

- Aceita token do GitHub apenas em `localhost`
- Mantém o token só em memória na aba ativa
- Permite descobrir repositórios públicos acessíveis e escolher o que entra no dashboard

### Modo público por snapshot

- Serve JSON estático gerado antecipadamente
- Nunca aceita token no navegador
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
