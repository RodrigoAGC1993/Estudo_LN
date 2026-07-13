# Caderno de Plantão

*Histórias que não cabem no prontuário.*

**[Jogar agora →](https://rodrigoagc1993.github.io/Estudo_LN/)**

## O que é

Caderno de Plantão é uma experiência narrativa clínica gamificada para estudantes e profissionais em início de carreira nas áreas de enfermagem e medicina.

O produto combina narrativa em estilo light novel, decisões clínicas sob pressão, consequências interpessoais e múltiplos desfechos determinados pelo estado acumulado das escolhas do jogador.

## Caso 01 — As Balas

O MVP implementa o primeiro caso completo:

- Personagem jogável: Jéssica (técnica de enfermagem, primeiro plantão)
- 4 cenas narrativas com decisões clínicas
- 4 classes de desfecho (trágico, grave, bom, excelente)
- Debriefing final com análise das escolhas
- Salvamento automático no navegador

## Objetivo pedagógico

O sistema testa competências além do conhecimento técnico:

- Percepção de informações inseridas no ruído narrativo
- Priorização e comunicação
- Vigilância e segurança do paciente
- Trabalho em equipe
- Tomada de decisão sob pressão
- Reconhecimento tardio da cadeia causal de um erro

## Stack técnica

| Camada | Tecnologia |
|--------|-----------|
| UI | Preact + Zustand |
| Build | Vite + TypeScript |
| Testes | Vitest + fast-check (property-based) |
| Deploy | GitHub Pages (branch `gh-pages`) |
| CI/CD | GitHub Actions |

Arquitetura em 7 camadas: Domain → Content → Engine → Persistence → Validation → UI → Composition.

## Estrutura do repositório

```
├── caderno-de-plantao/     # Aplicação (código-fonte, testes, build)
├── Casos/                  # Light novel completa (LV 2.0, rotas)
├── Documentacao/canon/     # Bíblia do projeto, modelo de tom, personagens
├── .github/workflows/      # CI/CD pipeline
└── .kiro/specs/            # Spec de desenvolvimento (requirements, design, tasks)
```

## Desenvolvimento local

```bash
cd caderno-de-plantao
npm install
npm run dev        # servidor local em http://localhost:5173
npm run test       # rodar testes (408 specs)
npm run build      # build de produção em dist/
npm run validate   # validação estrutural do caso JSON
```

## Documentos canônicos

Ordem de precedência em caso de conflito:

1. **Bíblia do Projeto v2** — regras gerais obrigatórias
2. **Cena-modelo "Ele dormiu?"** — referência de tom e estrutura
3. **LV completo do Caso 01** — conteúdo e lógica específicos

## Restrições de design

- Não reescrever a narrativa canônica
- Não simplificar as escolhas
- Não transformar a experiência em quiz
- Não mostrar variáveis internas ao jogador
- Não apresentar uma opção como obviamente correta
- Não depender de IA para executar uma partida
- Acessibilidade WCAG 2.1 AA obrigatória

## Princípio central

> A informação clínica aparece dentro da narrativa. O jogador deve perceber, decidir e somente no final compreender a cadeia causal de suas escolhas.
