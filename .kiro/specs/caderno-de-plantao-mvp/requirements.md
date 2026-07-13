# Requirements Document

## Introduction

Este documento define os requisitos funcionais e não-funcionais para o MVP web do **Caderno de Plantão**, implementando exclusivamente o Caso 01 — "As Balas", com Jéssica como única personagem jogável.

O MVP valida o modelo de dados de caso, o motor narrativo baseado em grafo direcionado de nós narrativos com escolhas/estados/condições, a aplicação de efeitos invisíveis, transições condicionais, seleção determinística de desfecho, debriefing causal, salvamento local, retomada de sessão, interface narrativa responsiva, acessibilidade e validação estrutural de arquivos de caso.

### Decisões Canônicas

1. **Cena 4 sempre executada** — A Cena 4 ("Ele Dormiu?") ocorre em TODAS as rotas, independentemente do valor de `tempo_atrasado`. O estado acumulado modifica a intensidade da deterioração, a margem de resposta, a posição da equipe e os desfechos alcançáveis.
2. **`acao_critica_a_tempo` é anulável** — Valor inicial: `null`. Após a Cena 4: `true` (ação crítica em tempo) ou `false` (confirmação tardia ou não-ação). O cálculo de desfecho NÃO pode prosseguir enquanto este estado permanecer `null`.
3. **Ordem de precedência dos desfechos** (ordem de avaliação, NÃO ranking positivo): Trágico (avaliado primeiro) → Grave → Excelente → Bom → Erro de conteúdo se nenhuma regra for satisfeita. Condições severas PREVALECEM sobre condições positivas.
4. **Formato do debriefing** — Não exibe obrigatoriamente nomes de estados ou valores brutos. Traduz estados e escolhas em explicações humanas e causais. Diferencia: decisão adequada, decisão defensável mas incompleta, processo inseguro sem dano confirmado, atraso, omissão, fator protetor, fator sistêmico, decisão crítica. Não reduz a análise a "acertou" ou "errou".
5. **Consequências interpessoais** — Cada cena de decisão possui pelo menos um beat interpessoal (imediato ou diferido) com variante para cada faixa narrativa. Três faixas baseadas em `confianca_equipe`: (a) <= -1: distância, dúvida ou ausência de reconhecimento; (b) = 0: resposta operacional neutra; (c) >= 1: reconhecimento sutil ou cooperação mais fluida. O beat não revela se a escolha foi correta ou errada.
6. **Estrutura de grafo** — Cenas representadas como grafo direcionado de nós narrativos, diferenciando nós de decisão de nós de progressão. Nós de progressão utilizam uma Ação_de_Continuidade ("Continuar") que não é escolha clínica, não aplica efeitos e não aparece no debriefing.
7. **Motor independente do caso** — O motor narrativo deve ser capaz de executar qualquer arquivo de caso válido. O MVP exibe apenas o Caso 01; catálogo e navegação entre casos estão fora de escopo.
8. **Sessão e persistência** — O MVP armazena uma sessão em andamento e apenas a última conclusão. Não há histórico completo de partidas.
9. **Consulta durante gameplay** — O jogador PODE consultar histórico textual e escolhas confirmadas. O jogador NÃO pode desfazer uma escolha.
10. **Offline** — A aplicação deve ser capaz de operar offline após carregamento inicial. A estratégia técnica será definida no design.md.
11. **Domínio dos estados** — Todo estado inteiro deve declarar `minimum` e `maximum`. O validador rejeita efeitos que ultrapassem o domínio declarado.
12. **Renomeação** — O estado `heparina_segura` é renomeado para `processo_heparina_seguro`, representando qualidade do processo de segurança, não confirmação automática de dano.

---

## Glossary

- **Motor_Narrativo**: Componente responsável por interpretar o grafo direcionado de nós narrativos, avaliar condições, aplicar efeitos de estado e determinar transições entre cenas.
- **Nó_Narrativo**: Unidade atômica de conteúdo narrativo que contém prosa e metadados. Pode ser de decisão ou de progressão.
- **Nó_de_Decisão**: Nó narrativo que contém escolhas e exige seleção do jogador para avançar, gerando consequências sobre estados invisíveis.
- **Nó_de_Progressão**: Nó narrativo sem escolhas clínicas. Apresenta conteúdo narrativo e disponibiliza uma Ação_de_Continuidade para o jogador avançar.
- **Ação_de_Continuidade**: Ação neutra ("Continuar" ou "Ver debriefing") utilizada em nós de progressão e no EndingNode. Não é uma escolha clínica, não aplica efeitos sobre estados invisíveis, não cria ConfirmedChoice, não incrementa sequence, não aparece no debriefing como decisão e apenas avança para o próximo nó apresentável do grafo.
- **Escolha**: Opção apresentada ao jogador dentro de um nó de decisão, com efeitos associados sobre estados invisíveis. Formalmente distinta da Ação_de_Continuidade.
- **Grafo_Narrativo**: Estrutura de grafo direcionado que organiza todos os nós narrativos de um caso, suas conexões e transições condicionais.
- **Estado_Invisível**: Variável interna acumulativa que influencia transições e desfechos sem ser revelada ao jogador durante a partida. Suporta tipos: inteiro (com minimum e maximum), booleano, enum e booleano anulável.
- **Domínio_de_Estado**: Declaração de limites (minimum, maximum) para estados inteiros. Efeitos que possam produzir valores fora do domínio são rejeitados pelo Validador_Estrutural em tempo de validação. Não há clamping silencioso em nenhuma camada do sistema.
- **Efeito**: Modificação aplicada a um ou mais estados invisíveis como consequência de uma escolha. Constitui uma atualização atômica — confirmação da escolha e aplicação de efeitos ocorrem como operação indivisível.
- **Condição**: Expressão lógica avaliada sobre estados invisíveis para determinar disponibilidade de transições ou cálculo de desfechos.
- **Transição_Condicional**: Aresta no grafo narrativo cuja ativação depende da avaliação de uma ou mais condições.
- **Desfecho**: Resultado final da partida, determinado deterministicamente pela combinação de estados invisíveis acumulados. O resultado deve ser coerente e rastreável.
- **Debriefing**: Tela pós-desfecho que traduz a cadeia causal das decisões do jogador em explicações humanas sobre o impacto de cada escolha. Diferencia categorias de análise sem reduzir a "acertou/errou".
- **Beat_Interpessoal**: Fragmento narrativo que mostra consequência interpessoal de uma decisão, vinculado a uma faixa narrativa. Pode ser imediato ou diferido. Não revela se a escolha foi correta.
- **Faixa_Narrativa**: Banda de variação para consequências interpessoais, agrupando valores de `confianca_equipe` em três categorias de resposta.
- **Arquivo_de_Caso**: Estrutura de dados que contém toda a definição lógica e narrativa de um caso clínico, incluindo o grafo narrativo completo.
- **Sessão**: Instância de uma partida em andamento, incluindo o nó atual e os estados acumulados.
- **Jogador**: Usuário que interage com a aplicação realizando escolhas narrativas.
- **Interface_Narrativa**: Camada de apresentação responsável por exibir prosa, escolhas, histórico consultável e transições visuais.
- **Validador_Estrutural**: Componente que verifica a integridade, coerência e conformidade dos arquivos de caso antes da execução.
- **Caso_01**: O caso "As Balas", caso-manifesto do projeto, definido nos documentos canônicos.
- **Jéssica**: Personagem jogável do Caso 01, técnica de enfermagem novata.

---

## Requirements

### Requisito 1: Modelo de Dados de Caso

**User Story:** Como desenvolvedor, quero um modelo de dados estruturado para representar casos clínicos como grafos direcionados, para que o motor narrativo possa interpretar e executar qualquer caso válido de forma determinística.

#### Acceptance Criteria

1. THE Arquivo_de_Caso SHALL representar cenas como um grafo direcionado de nós narrativos, cada nó contendo identificador único, tipo (decisão ou progressão), conteúdo textual e referências de saída.
2. THE Arquivo_de_Caso SHALL diferenciar nós de decisão (com escolhas e consequências) de nós de progressão (com Ação_de_Continuidade sem efeitos).
3. THE Arquivo_de_Caso SHALL definir cada escolha com identificador único, texto de apresentação e lista de efeitos sobre estados invisíveis.
4. THE Arquivo_de_Caso SHALL declarar todos os estados invisíveis do caso com nome, tipo (inteiro, booleano, enum ou booleano anulável) e valor inicial. Para estados inteiros, SHALL declarar também `minimum` e `maximum`.
5. THE Arquivo_de_Caso SHALL definir desfechos como conjuntos nomeados de condições sobre estados invisíveis, com prioridade explícita para resolução de conflitos na seguinte ordem de avaliação: Trágico, Grave, Excelente, Bom.
6. THE Arquivo_de_Caso SHALL declarar metadados do caso incluindo título, personagem jogável, versão do esquema e versão do caso.
7. WHEN o Arquivo_de_Caso contiver transições condicionais, THE Arquivo_de_Caso SHALL especificar a expressão lógica e o nó destino para cada transição.
8. THE Arquivo_de_Caso SHALL definir confirmação de escolha como atualização atômica: a seleção e a aplicação dos efeitos ocorrem como operação indivisível, impedindo aplicação duplicada de efeitos após recarga.
9. THE Arquivo_de_Caso SHALL definir para cada nó de decisão pelo menos um beat interpessoal por faixa narrativa (confiança <= -1, confiança = 0, confiança >= 1), podendo ser imediato ou diferido, com relação causal registrada.

---

### Requisito 2: Motor Narrativo — Execução de Nós e Escolhas

**User Story:** Como jogador, quero avançar pela narrativa fazendo escolhas e vivenciando progressões, para que eu viva a experiência clínica de forma imersiva e interativa.

#### Acceptance Criteria

1. WHEN o jogador selecionar uma escolha em um nó de decisão, THE Motor_Narrativo SHALL aplicar todos os efeitos associados àquela escolha sobre os estados invisíveis da sessão como operação atômica.
2. WHEN todos os efeitos de uma escolha forem aplicados, THE Motor_Narrativo SHALL transicionar a sessão para o próximo nó narrativo conforme definido pelo grafo do caso.
3. WHEN o nó atual for um nó de progressão, THE Motor_Narrativo SHALL apresentar o conteúdo narrativo e disponibilizar a Ação_de_Continuidade ("Continuar") para o jogador avançar manualmente ao próximo nó, sem aplicar efeitos.
4. THE Motor_Narrativo SHALL apresentar no mínimo 3 escolhas por nó de decisão, conforme regra canônica.
5. THE Motor_Narrativo SHALL preservar a ordem de apresentação das escolhas conforme definida no arquivo de caso.
6. THE Motor_Narrativo SHALL impedir que o jogador avance sem selecionar uma escolha quando o nó atual for um nó de decisão.
7. THE Motor_Narrativo SHALL impedir aplicação duplicada de efeitos em caso de recarga da página ou restauração de sessão, garantindo idempotência da confirmação.
8. WHEN uma escolha for confirmada ou uma Ação_de_Continuidade for acionada, THE Interface_Narrativa SHALL bloquear múltiplas ativações (duplo clique, duplo toque, repetição de tecla) até a conclusão da transição.
9. WHEN a transição para o novo nó for concluída, THE Interface_Narrativa SHALL mover o foco para o novo conteúdo narrativo.

---

### Requisito 3: Estados Invisíveis e Efeitos

**User Story:** Como jogador, quero que minhas decisões tenham consequências reais sobre o desfecho, sem que eu veja explicitamente os mecanismos internos, para que a experiência simule a ambiguidade de decisões clínicas reais.

#### Acceptance Criteria

1. THE Motor_Narrativo SHALL manter todos os estados invisíveis ocultos da interface durante toda a partida, incluindo nomes, valores e efeitos aplicados.
2. WHEN uma escolha for selecionada, THE Motor_Narrativo SHALL aplicar os efeitos de forma acumulativa sobre os estados existentes, respeitando o domínio (minimum/maximum) definido no arquivo de caso para estados inteiros.
3. THE Motor_Narrativo SHALL suportar efeitos do tipo incremento/decremento para estados inteiros, atribuição para estados booleanos, atribuição para estados enum e atribuição para estados booleanos anuláveis.
4. THE Motor_Narrativo SHALL garantir que a aplicação de efeitos seja determinística, produzindo o mesmo resultado final para a mesma sequência de escolhas.
5. THE Motor_Narrativo SHALL suportar estados com valor inicial `null` (tipo booleano anulável), reconhecendo que o cálculo de desfecho não pode prosseguir enquanto um estado crítico obrigatório permanecer `null`.
6. IF um efeito puder resultar em valor fora do domínio declarado para um estado inteiro, THEN THE Validador_Estrutural SHALL rejeitar o arquivo de caso antes de sua publicação ou execução em produção.
7. IF uma violação de domínio ocorrer em runtime apesar da validação, THEN THE Motor_Narrativo SHALL interromper a atualização atômica, preservar o último estado válido e sinalizar um erro controlado de conteúdo.
8. THE Motor_Narrativo SHALL NOT corrigir, saturar ou aplicar clamping silenciosamente a valores fora do domínio.

---

### Requisito 4: Transições Condicionais

**User Story:** Como designer de caso, quero que certas cenas só ocorram ou se modifiquem dependendo do estado acumulado, para que a narrativa se ramifique de forma coerente com as decisões anteriores.

#### Acceptance Criteria

1. WHEN o Motor_Narrativo avaliar uma transição condicional, THE Motor_Narrativo SHALL verificar a expressão lógica associada contra os estados invisíveis atuais da sessão.
2. WHEN a condição de uma transição condicional for verdadeira, THE Motor_Narrativo SHALL direcionar a sessão para o nó destino especificado.
3. WHEN a condição de uma transição condicional for falsa, THE Motor_Narrativo SHALL seguir o fluxo padrão definido no grafo do caso.
4. THE Motor_Narrativo SHALL avaliar transições condicionais na ordem de prioridade definida no arquivo de caso quando múltiplas transições forem possíveis a partir de um mesmo nó.

---

### Requisito 5: Seleção Determinística de Desfecho

**User Story:** Como jogador, quero que o final da história seja uma consequência coerente e rastreável das minhas escolhas acumuladas, para que eu compreenda no debriefing a cadeia causal dos meus atos.

#### Acceptance Criteria

1. WHEN o jogador alcançar o nó final do caso, THE Motor_Narrativo SHALL avaliar todas as regras de desfecho na seguinte ordem de precedência: Trágico (primeiro), Grave, Excelente, Bom — condições severas prevalecem sobre condições positivas.
2. WHEN mais de uma regra de desfecho for satisfeita, THE Motor_Narrativo SHALL selecionar o desfecho avaliado primeiro conforme a ordem de precedência (Trágico > Grave > Excelente > Bom).
3. THE Motor_Narrativo SHALL garantir que exatamente um desfecho seja selecionado para qualquer combinação válida de estados finais.
4. IF nenhuma regra de desfecho for satisfeita, THEN THE Motor_Narrativo SHALL sinalizar erro de conteúdo, impedindo apresentação de resultado indefinido. Um caso com caminho válido sem desfecho não pode ser carregado em produção.
5. IF o estado `acao_critica_a_tempo` permanecer `null` no momento do cálculo de desfecho, THEN THE Motor_Narrativo SHALL sinalizar erro de conteúdo, impedindo cálculo com estado crítico indefinido.
6. FOR ALL sequências válidas de escolhas, THE Motor_Narrativo SHALL produzir o mesmo desfecho quando repetidas com os mesmos estados iniciais (determinismo).
7. THE Motor_Narrativo SHALL suportar os quatro tipos de desfecho do Caso 01: Excelente, Bom, Grave e Trágico.

---

### Requisito 6: Debriefing Causal

**User Story:** Como jogador, quero compreender após o desfecho como cada decisão contribuiu para o resultado final, para que eu aprenda sobre a cadeia causal de erros e acertos clínicos.

#### Acceptance Criteria

1. WHEN o desfecho for apresentado, THE Interface_Narrativa SHALL exibir uma tela de debriefing estruturada nas seguintes seções: (a) Seu desfecho, (b) O que você percebeu, (c) Onde o risco aumentou, (d) O que protegeu o paciente, (e) O que levar para o próximo plantão, (f) Revisão clínica opcional e sujeita a validação profissional.
2. THE Interface_Narrativa SHALL traduzir no debriefing cada estado e escolha em explicações humanas e causais, sem exibir obrigatoriamente nomes de variáveis ou valores brutos.
3. THE Interface_Narrativa SHALL diferenciar no debriefing as seguintes categorias de análise: decisão adequada, decisão defensável mas incompleta, processo inseguro sem dano confirmado, atraso, omissão, fator protetor, fator sistêmico e decisão crítica. O debriefing NÃO deve reduzir a análise a "acertou" ou "errou".
4. THE Interface_Narrativa SHALL apresentar consequências interpessoais no debriefing utilizando três faixas narrativas baseadas em `confianca_equipe`: (a) confiança <= -1: distância, dúvida ou ausência de reconhecimento; (b) confiança = 0: resposta operacional neutra; (c) confiança >= 1: reconhecimento sutil ou cooperação mais fluida.
5. THE Interface_Narrativa SHALL apresentar o debriefing somente após a conclusão do desfecho, nunca durante a partida.
6. THE Interface_Narrativa SHALL permitir que o jogador inicie uma nova partida ou retorne ao início a partir da tela de debriefing.
7. THE Interface_Narrativa SHALL incluir aviso de que a revisão clínica é opcional e sujeita a validação profissional.

---

### Requisito 7: Salvamento Local de Progresso

**User Story:** Como jogador, quero que meu progresso seja salvo automaticamente no navegador, para que eu possa interromper a sessão e retomá-la depois sem perder o avanço.

#### Acceptance Criteria

1. WHEN o jogador completar uma escolha (atualização atômica confirmada) ou acionar uma Ação_de_Continuidade, THE Motor_Narrativo SHALL salvar automaticamente o estado completo da sessão no armazenamento local do navegador.
2. THE Motor_Narrativo SHALL persistir no salvamento os seguintes campos: `schemaVersion`, `caseId`, `caseVersion`, `sessionId`, `currentNodeId`, `states` (todos os estados invisíveis incluindo valores `null`), `confirmedChoices` (histórico de escolhas), `visitedNodes`, `sessionStatus` e `updatedAt`.
3. IF o armazenamento local estiver indisponível ou cheio, THEN THE Motor_Narrativo SHALL informar ao jogador que o progresso não pôde ser salvo e permitir a continuidade da partida sem salvamento.
4. THE Motor_Narrativo SHALL manter no máximo uma sessão em andamento e apenas a última conclusão por caso, sem histórico completo de partidas anteriores.
5. THE Motor_Narrativo SHALL garantir que a restauração de sessão salva não aplique efeitos duplicados — o salvamento registra o estado resultante, não os efeitos pendentes.
6. IF `schemaVersion` ou `caseVersion` do salvamento forem incompatíveis com a versão atual, THEN THE Motor_Narrativo SHALL invalidar o save com mensagem clara ao jogador. Migração de saves está fora do escopo do MVP.

---

### Requisito 8: Retomada de Sessão

**User Story:** Como jogador, quero retomar uma partida salva de onde parei, para que eu não precise repetir decisões já tomadas.

#### Acceptance Criteria

1. WHEN o jogador acessar a aplicação e existir uma sessão salva para o Caso 01, THE Interface_Narrativa SHALL oferecer a opção de retomar a partida ou iniciar uma nova.
2. WHEN o jogador escolher retomar, THE Motor_Narrativo SHALL restaurar o nó atual, os estados invisíveis e o histórico de escolhas a partir do salvamento local sem reaplicar efeitos.
3. WHEN o jogador escolher iniciar nova partida e existir sessão salva, THE Motor_Narrativo SHALL substituir a sessão salva pela nova sessão.
4. IF o salvamento local estiver corrompido ou incompatível com a versão atual do caso (schemaVersion ou caseVersion), THEN THE Motor_Narrativo SHALL descartar a sessão salva, informar o jogador com mensagem clara e oferecer início de nova partida.

---

### Requisito 9: Interface Narrativa Responsiva

**User Story:** Como jogador, quero ler a narrativa e fazer escolhas de forma confortável em qualquer dispositivo, para que a experiência funcione tanto em celulares quanto em desktops.

#### Acceptance Criteria

1. THE Interface_Narrativa SHALL apresentar o conteúdo narrativo em layout de leitura otimizado para dispositivos com largura mínima de 320px.
2. THE Interface_Narrativa SHALL adaptar tipografia, espaçamento e disposição de escolhas proporcionalmente ao tamanho da tela.
3. THE Interface_Narrativa SHALL garantir que as escolhas sejam acessíveis por toque em dispositivos móveis com área de toque mínima de 44x44 pixels.
4. THE Interface_Narrativa SHALL apresentar transições entre nós narrativos de forma fluida, sem recarregamento completo da página.
5. THE Interface_Narrativa SHALL manter a prosa como elemento central visual, sem elementos decorativos que compitam com a leitura.
6. THE Interface_Narrativa SHALL disponibilizar acesso ao histórico textual de cenas visitadas e escolhas confirmadas durante a partida, sem permitir desfazer escolhas.

---

### Requisito 10: Acessibilidade

**User Story:** Como jogador com deficiência visual ou motora, quero que a aplicação seja navegável por teclado e compatível com leitores de tela, para que eu possa participar da experiência narrativa.

#### Acceptance Criteria

1. THE Interface_Narrativa SHALL ser completamente navegável por teclado, incluindo seleção de escolhas e navegação entre telas.
2. THE Interface_Narrativa SHALL utilizar marcação semântica que permita a leitores de tela identificar prosa narrativa, escolhas disponíveis e informações de estado da interface.
3. THE Interface_Narrativa SHALL manter contraste mínimo de 4.5:1 entre texto e fundo conforme WCAG 2.1 nível AA.
4. THE Interface_Narrativa SHALL fornecer indicação visual de foco para todos os elementos interativos.
5. THE Interface_Narrativa SHALL comunicar mudanças de conteúdo dinâmico através de regiões ARIA live quando aplicável.
6. THE Interface_Narrativa SHALL garantir que cor não seja o único indicador de significado em nenhum elemento.
7. THE Interface_Narrativa SHALL suportar preferência de movimento reduzido (prefers-reduced-motion), desativando ou simplificando animações quando o sistema operacional indicar essa preferência.
8. THE Interface_Narrativa SHALL permitir ajuste de tamanho de fonte pelo jogador e manter funcionalidade completa com zoom de até 200%.

---

### Requisito 11: Validação Estrutural de Arquivos de Caso

**User Story:** Como desenvolvedor, quero validar a integridade dos arquivos de caso antes da execução, para que erros de estrutura sejam detectados em tempo de desenvolvimento e não durante a experiência do jogador.

#### Acceptance Criteria

1. WHEN um arquivo de caso for carregado, THE Validador_Estrutural SHALL detectar identificadores duplicados entre nós, escolhas ou estados.
2. WHEN um arquivo de caso for carregado, THE Validador_Estrutural SHALL detectar nós inalcançáveis (sem arestas de entrada a partir do nó inicial).
3. WHEN um arquivo de caso for carregado, THE Validador_Estrutural SHALL detectar nós sem saída (dead-end) que não sejam nós de desfecho.
4. WHEN um arquivo de caso for carregado, THE Validador_Estrutural SHALL detectar escolhas sem destino definido.
5. WHEN um arquivo de caso for carregado, THE Validador_Estrutural SHALL detectar ciclos não autorizados no grafo narrativo.
6. WHEN um arquivo de caso for carregado, THE Validador_Estrutural SHALL detectar referências a estados não declarados em efeitos ou condições.
7. WHEN um arquivo de caso for carregado, THE Validador_Estrutural SHALL detectar efeitos incompatíveis com o tipo do estado alvo (ex: incremento em booleano, atribuição numérica em enum).
8. WHEN um arquivo de caso for validado, THE Validador_Estrutural SHALL detectar qualquer escolha ou sequência válida de escolhas cujos efeitos possam produzir valor fora do domínio declarado de um estado inteiro.
9. WHEN um arquivo de caso for carregado, THE Validador_Estrutural SHALL detectar condições contraditórias dentro de uma mesma regra de desfecho.
10. WHEN um arquivo de caso for carregado, THE Validador_Estrutural SHALL detectar desfechos inalcançáveis (nenhuma combinação válida de estados satisfaz suas condições).
11. WHEN um arquivo de caso for carregado, THE Validador_Estrutural SHALL detectar caminhos no grafo que não conduzem a nenhum desfecho.
12. WHEN um arquivo de caso for carregado, THE Validador_Estrutural SHALL detectar regras de desfecho com sobreposição (mesma combinação de estados satisfaz múltiplas regras sem que a prioridade resolva o conflito).
13. WHEN um arquivo de caso for carregado, THE Validador_Estrutural SHALL detectar estados críticos obrigatórios que permanecem `null` em algum caminho que alcança o cálculo de desfecho.
14. WHEN um arquivo de caso for carregado, THE Validador_Estrutural SHALL verificar que todo nó de decisão contenha no mínimo 3 escolhas.
15. WHEN um arquivo de caso for carregado, THE Validador_Estrutural SHALL verificar presença de conteúdo obrigatório (metadados, nó inicial, pelo menos um desfecho).
16. WHEN um arquivo de caso for carregado, THE Validador_Estrutural SHALL verificar compatibilidade da versão do esquema declarada com a versão suportada pelo motor.
17. WHEN um arquivo de caso for carregado, THE Validador_Estrutural SHALL verificar que todas as sequências válidas de escolhas alcançam exatamente um desfecho.
18. WHEN um arquivo de caso for carregado, THE Validador_Estrutural SHALL verificar que todos os quatro desfechos declarados são alcançáveis por pelo menos uma sequência válida.
19. WHEN um arquivo de caso for carregado, THE Validador_Estrutural SHALL verificar que nenhuma regra de desfecho prioritária é completamente inutilizada por outra regra de menor prioridade.
20. WHEN um arquivo de caso for carregado, THE Validador_Estrutural SHALL verificar que nenhuma condição de desfecho depende de estado fora do domínio declarado.
21. IF o Validador_Estrutural encontrar erros, THEN THE Validador_Estrutural SHALL reportar todos os erros encontrados com localização e descrição, impedindo a execução e publicação do caso.
22. WHEN um arquivo de caso passar em todas as validações, THE Validador_Estrutural SHALL autorizar a execução do caso pelo Motor Narrativo.

---

### Requisito 12: Execução Completa do Caso 01

**User Story:** Como jogador, quero jogar o Caso 01 — "As Balas" do início ao fim, para que eu viva a experiência completa de Jéssica em seu plantão noturno.

#### Acceptance Criteria

1. THE Motor_Narrativo SHALL executar as 4 cenas de decisão do Caso 01 (ECG Quente, Voltaren, Heparina, Ele Dormiu?) na sequência definida pelo documento canônico LV_2.0, sendo a Cena 4 ("Ele Dormiu?") SEMPRE executada em todas as rotas.
2. THE Motor_Narrativo SHALL utilizar o estado acumulado até a Cena 4 para modificar a intensidade da deterioração clínica, a margem de resposta disponível, a posição da equipe e os desfechos alcançáveis.
3. THE Motor_Narrativo SHALL implementar os 6 estados invisíveis do Caso 01: `tempo_atrasado` (inteiro, initial: 0, min: 0, max: 3), `voltaren_comunicado` (booleano, initial: false), `processo_heparina_seguro` (booleano, initial: false), `vigilancia_ativa` (inteiro, initial: 0, min: 0, max: 2), `confianca_equipe` (inteiro, initial: 0, min: -2, max: 2), `acao_critica_a_tempo` (booleano anulável, initial: null).
4. THE Motor_Narrativo SHALL calcular o desfecho do Caso 01 avaliando as regras na seguinte ordem de precedência: Trágico (primeiro), Grave, Excelente, Bom — condições severas prevalecem sobre condições positivas.
5. IF `acao_critica_a_tempo` permanecer `null` ao alcançar o cálculo de desfecho, THEN THE Motor_Narrativo SHALL sinalizar erro de conteúdo.
6. THE Motor_Narrativo SHALL apresentar o desfecho correspondente após a última cena, seguido pelo debriefing causal.
7. THE Interface_Narrativa SHALL apresentar a narrativa em primeira pessoa de Jéssica, utilizando a prosa canônica disponível no arquivo Rotas_As_Balas.md.
8. THE Interface_Narrativa SHALL apresentar consequências interpessoais durante as cenas utilizando três faixas narrativas: (a) confiança <= -1: distância, dúvida ou ausência de reconhecimento; (b) confiança = 0: resposta operacional neutra; (c) confiança >= 1: reconhecimento sutil ou cooperação mais fluida. O beat interpessoal não revela se a escolha foi correta ou errada.

---

## Requisitos Não-Funcionais

### RNF-1: Desempenho

1. THE Interface_Narrativa SHALL apresentar o conteúdo de um novo nó narrativo em até 300ms após a confirmação de escolha ou Ação_de_Continuidade.
2. THE Motor_Narrativo SHALL completar o cálculo de desfecho em até 100ms.

### RNF-2: Compatibilidade

1. THE Interface_Narrativa SHALL funcionar nos navegadores Chrome, Firefox, Safari e Edge em suas duas versões estáveis mais recentes.
2. THE Interface_Narrativa SHALL funcionar sem conexão à internet após o carregamento inicial (offline-capable). A estratégia técnica de implementação offline será definida no design.md.

### RNF-3: Armazenamento

1. THE Motor_Narrativo SHALL utilizar exclusivamente armazenamento local do navegador (localStorage ou IndexedDB), sem dependência de servidor remoto.

### RNF-4: Manutenibilidade

1. THE Arquivo_de_Caso SHALL utilizar formato legível por humanos (JSON ou similar) para facilitar edição e versionamento.
2. THE Motor_Narrativo SHALL ser independente do conteúdo narrativo específico, permitindo carregamento de diferentes casos válidos sem alteração de código.

### RNF-5: Restrições do MVP

1. THE Motor_Narrativo SHALL executar sem chamadas a APIs externas ou modelos de IA durante a partida.
2. THE Interface_Narrativa SHALL operar sem autenticação, backend ou sincronização em nuvem.
3. THE Interface_Narrativa SHALL apresentar exclusivamente o Caso 01, sem estrutura de catálogo ou navegação entre múltiplos casos. O motor narrativo é estruturalmente capaz de executar outros casos válidos.

---

## Premissas

1. O conteúdo narrativo final (prosa literária) para todas as rotas e desfechos será fornecido como entrada para o sistema, não gerado pela aplicação.
2. O documento Rotas_As_Balas.md contém prosa parcialmente disponível — nem todos os trechos estão em forma final executável.
3. O MVP não exigirá versionamento de saves entre diferentes versões do arquivo de caso (save incompatível será descartado com mensagem clara).
4. O jogador terá conhecimento básico de navegação web (ler e clicar/tocar).
5. A experiência é single-player, sem componentes sociais ou competitivos.
6. Não há requisito de analytics, telemetria ou coleta de dados no MVP.
7. A validação estrutural será executada em tempo de desenvolvimento, não em runtime de produção.
8. A deterioração clínica na Cena 4 não é causada por `tempo_atrasado` — o estado acumulado modifica intensidade, margem e posição, não causa o evento.
9. O MVP armazena uma sessão em andamento e apenas a última conclusão. Não mantém histórico completo de todas as partidas.
10. Migração de saves entre versões está fora do escopo do MVP.

---

## Ambiguidades Remanescentes

Nenhuma ambiguidade pendente. Todas as ambiguidades identificadas nas revisões anteriores foram resolvidas por decisão canônica.

**Ambiguidades resolvidas:**
- ~~Ambiguidade 1 (Cena 4 condicionada)~~: Resolvida — Cena 4 é SEMPRE executada.
- ~~Ambiguidade 2 (Prioridade de desfechos)~~: Resolvida — ordem de avaliação definida: Trágico > Grave > Excelente > Bom.
- ~~Ambiguidade 3 (Conteúdo do debriefing)~~: Resolvida — formato definido com seções estruturadas e categorias de análise.
- ~~Ambiguidade 4 (Prosa da Cena 4 não condicionada)~~: Removida — Cena 4 é sempre executada.
- ~~Ambiguidade 5 (Consequências interpessoais)~~: Resolvida — cada cena de decisão possui pelo menos um beat por faixa; B.4 permanece aberta apenas como produção editorial.

---

## Lacunas Identificadas

### Categoria B — Lacunas Narrativas (produção editorial)

| ID | Descrição | Impacto | Status |
|----|-----------|---------|--------|
| B.1 | Rotas_As_Balas.md contém prosa que funciona como referência de estilo e fragmentos, não necessariamente como texto final executável para todas as rotas | Conteúdo a ser entregue separadamente | Aberta |
| B.2 | Prosa dos 4 desfechos em Rotas_As_Balas.md é extremamente resumida (1-2 frases cada) — requer expansão editorial | Conteúdo de desfecho | Aberta |
| B.4 | Beats interpessoais para todas as cenas de decisão nas três faixas narrativas não possuem prosa final completa | Conteúdo em cena | Aberta |
| B.5 | Texto do debriefing (com categorias de análise diferenciadas) não possui prosa canônica definida | Conteúdo pós-jogo | Aberta |

### Categoria D — Lacunas Clínicas

| ID | Descrição | Impacto | Status |
|----|-----------|---------|--------|
| D.1 | Validação clínica do conteúdo do debriefing requer revisão por profissional qualificado — o debriefing explica raciocínio clínico e categoriza decisões | Precisão médica | Aberta |
| D.2 | A adequação das consequências de cada escolha ao realismo clínico requer validação profissional | Credibilidade pedagógica | Aberta |

### Categoria E — Lacunas Técnicas

| ID | Descrição | Impacto | Status |
|----|-----------|---------|--------|
| E.1 | Formato específico do arquivo de caso (JSON Schema, YAML, ou outro) não definido | Implementação do modelo de dados | Resolvida pelo design (JSON + JSON Schema + Ajv) |
| E.2 | Estratégia de migração de saves quando o schema do caso mudar em futuras versões não definida para além do MVP | Evolução pós-MVP | Aberta (pós-MVP) |
| E.3 | Mecanismo de carregamento offline (Service Worker, cache manifest) não especificado — a ser definido no design.md | Implementação offline | Resolvida pelo design (Service Worker + Workbox) |

---

## Condições de Desfecho — Caso 01

As condições de desfecho são avaliadas na ordem abaixo. A primeira regra satisfeita determina o resultado.

| Ordem | Desfecho | Condições |
|-------|----------|-----------|
| 1º | **Trágico** | `acao_critica_a_tempo = false` AND `vigilancia_ativa = 0` AND (`tempo_atrasado >= 2` OR `processo_heparina_seguro = false`) |
| 2º | **Grave** | `acao_critica_a_tempo = false` AND NOT condição_trágica |
| 3º | **Excelente** | `acao_critica_a_tempo = true` AND `tempo_atrasado <= 1` AND `processo_heparina_seguro = true` AND `voltaren_comunicado = true` |
| 4º | **Bom** | `acao_critica_a_tempo = true` AND NOT condição_excelente |
| — | **Erro de conteúdo** | Nenhuma regra satisfeita (falha de validação — caso não pode ser publicado) |

**Pré-condição**: `acao_critica_a_tempo` deve ser não-null. Se permanecer `null`, é sinalizado erro de conteúdo antes da avaliação.

### Análise de Cobertura

**Partição 1** — `acao_critica_a_tempo = false`:
- Se `vigilancia_ativa = 0` AND (`tempo_atrasado >= 2` OR `processo_heparina_seguro = false`) → **Trágico**
- Caso contrário (i.e., `vigilancia_ativa >= 1`, OU (`tempo_atrasado <= 1` AND `processo_heparina_seguro = true`)) → **Grave**
- Cobertura: completa para todo caso com `acao_critica = false`. ✓

**Partição 2** — `acao_critica_a_tempo = true`:
- Se `tempo_atrasado <= 1` AND `processo_heparina_seguro = true` AND `voltaren_comunicado = true` → **Excelente**
- Caso contrário → **Bom**
- Cobertura: completa para todo caso com `acao_critica = true`. ✓

**Conclusão**: Todas as combinações válidas de estados finais (dentro dos domínios declarados) produzem exatamente um desfecho. Não existem gaps que resultem em erro de conteúdo para o Caso 01 com as regras definidas.

---

## Matriz de Rastreabilidade

| Requisito | README.md | Bíblia v2 | Modelo_Tom | Personagens | LV_2.0 | Rotas_As_Balas | Decisões Canônicas |
|-----------|-----------|-----------|------------|-------------|--------|----------------|-------------------|
| R1 — Modelo de Dados (Grafo) | Caso inicial MVP | §5, §6 | — | — | §3, §4 | — | DC-6, DC-11 |
| R2 — Motor Narrativo | Princípio central | §7, §9 | Decisão | — | §4–§8 | Todas as rotas | DC-6 |
| R3 — Estados Invisíveis | Restrições (não mostrar) | §8 | Estados impactados | — | §3 | — | DC-2, DC-11, DC-12 |
| R4 — Transições Condicionais | — | §6 | — | — | §4 (estrutura grafo) | — | DC-1, DC-6 |
| R5 — Seleção de Desfecho | — | §12 | — | — | §9 | Cena 5 | DC-3 |
| R6 — Debriefing | Objetivo pedagógico | §12 | — | — | §10 | — | DC-4, DC-5 |
| R7 — Salvamento Local | Caso inicial MVP | — | — | — | — | — | DC-8 |
| R8 — Retomada de Sessão | Caso inicial MVP | — | — | — | — | — | DC-8, DC-9 |
| R9 — Interface Responsiva | — | §9 | Prosa canônica | — | — | Padrão de leitura | DC-9 |
| R10 — Acessibilidade | Restrições (cor) | — | — | — | — | — | — |
| R11 — Validação Estrutural | — | §14, §16 | — | — | Estrutura completa | — | DC-2, DC-6, DC-11 |
| R12 — Execução Caso 01 | Caso inicial MVP | §13 | Cena-modelo | Jéssica | §4–§9 completo | Todas as cenas | DC-1, DC-3, DC-5, DC-11, DC-12 |
| RNF-4 — Manutenibilidade | — | §14 | — | — | — | — | DC-7 |
| RNF-5 — Restrições MVP | Restrições | §14 | — | — | — | — | DC-7 |

**Legenda DC (Decisões Canônicas):**
- DC-1: Cena 4 sempre executada
- DC-2: `acao_critica_a_tempo` anulável
- DC-3: Ordem de precedência de desfechos (Trágico > Grave > Excelente > Bom)
- DC-4: Formato do debriefing (seções + categorias de análise)
- DC-5: Faixas narrativas interpessoais com beats obrigatórios
- DC-6: Grafo direcionado com nós diferenciados e Ação_de_Continuidade
- DC-7: Motor independente / escopo MVP
- DC-8: Sessão e persistência (campos definidos)
- DC-9: Consulta durante gameplay / sem undo
- DC-10: Offline
- DC-11: Domínio dos estados (min/max obrigatórios)
- DC-12: Renomeação `heparina_segura` → `processo_heparina_seguro`

---

*Documento finalizado. Todas as ambiguidades resolvidas. Lacunas B.1, B.2, B.4 e B.5 permanecem abertas como produção editorial. D.1 e D.2 permanecem abertas como validação clínica. E.1 foi resolvida pelo design (JSON + JSON Schema + Ajv). E.3 foi resolvida pelo design (Service Worker + Workbox). E.2 permanece pós-MVP.*

---

## Adendo — Lacunas Técnicas Resolvidas pelo Design

| ID | Descrição Original | Resolução |
|----|--------------------|-----------| 
| E.1 | Formato do arquivo de caso não definido | Resolvida: JSON + JSON Schema + Ajv (tooling/build) |
| E.3 | Mecanismo offline não especificado | Resolvida: Service Worker com Workbox (vite-plugin-pwa) |
| E.2 | Estratégia de migração de saves | Permanece pós-MVP — save incompatível é descartado |

---

## Adendo — Requisitos Complementares (derivados do design aprovado)

### RC-1: Confirmação de Escolha em Dois Passos

**User Story:** Como jogador, quero confirmar minha decisão antes que ela seja irreversível, para que toques ou cliques acidentais não alterem o rumo da história.

#### Acceptance Criteria

1. WHEN o jogador selecionar uma opção em um nó de decisão, THE Interface_Narrativa SHALL destacar visualmente a opção sem alterar estados narrativos.
2. THE Interface_Narrativa SHALL apresentar as ações "Rever opções" e "Confirmar decisão" após a seleção.
3. WHEN o jogador acionar "Confirmar decisão", THE Interface_Narrativa SHALL enviar o comando à Engine e bloquear controles até a conclusão.
4. WHEN o jogador acionar "Rever opções", THE Interface_Narrativa SHALL retornar ao estado de seleção sem enviar comando à Engine.

---

### RC-2: Histórico Não Preditivo

**User Story:** Como jogador, quero que o histórico mostre apenas o que já vivi, para que a interface não revele o futuro da narrativa.

#### Acceptance Criteria

1. THE Interface_Narrativa SHALL apresentar no histórico somente nós já visitados e escolhas já confirmadas.
2. THE Interface_Narrativa SHALL NOT apresentar no histórico cenas futuras, títulos não revelados, contagem total de cenas, marcadores vazios ou finais não alcançados.
3. WHEN o nó atual ainda não tiver título revelado pela narrativa, THE Interface_Narrativa SHALL exibir "Cena em andamento" como posição atual.
4. AFTER o desfecho, THE Interface_Narrativa SHALL mostrar apenas a rota percorrida, sem revelar rotas alternativas ou outros finais.

---

### RC-3: Temas Visuais

**User Story:** Como jogador, quero escolher entre tema claro, escuro ou automático, para que a leitura seja confortável em qualquer ambiente.

#### Acceptance Criteria

1. THE Interface_Narrativa SHALL suportar três modos de tema: system (padrão), light e dark.
2. WHEN theme = system, THE Interface_Narrativa SHALL acompanhar `prefers-color-scheme` do sistema operacional.
3. THE Interface_Narrativa SHALL aplicar mudança de tema imediatamente, sem recarregar a página.
4. THE Interface_Narrativa SHALL persistir preferência de tema em chave separada (`cdp_preferences`), sem misturar com ActiveSessionSnapshot ou LastCompletionRecord.
5. IF localStorage estiver indisponível, THEN THE Interface_Narrativa SHALL aplicar preferência apenas em memória sem interromper a partida.

---

### RC-4: Preferências Visuais Isoladas da Sessão Narrativa

**User Story:** Como jogador, quero que minhas preferências visuais não afetem meu progresso na história, para que mudar tema ou fonte não altere minha sessão.

#### Acceptance Criteria

1. THE Interface_Narrativa SHALL armazenar preferências visuais (tema, fontScale, reducedMotionOverride) em storage separado dos dados de sessão narrativa.
2. Alterar qualquer preferência visual SHALL NOT modificar estados invisíveis, histórico de escolhas, desfecho calculado ou snapshot da partida.

---

*Adendo aplicado ao requirements.md aprovado. Nenhum requisito existente foi alterado.*
