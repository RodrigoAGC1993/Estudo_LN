A prancha enviada passa a ser o layout canônico do MVP de Caderno de Plantão.
Decisões visualmente aprovadas


Narrativa como elemento principal

A prosa ocupa a maior área da tela.
A interface permanece discreta e não compete com a leitura.



Histórico progressivo e não preditivo

Mostra apenas acontecimentos já vividos.
Exibe o momento atual como “Agora — Cena em andamento”.
Não mostra cenas futuras, marcadores vazios, cadeados, títulos ocultos ou quantidade total de cenas.
A linha cronológica termina no momento atual.



Escolhas neutras

Todas possuem a mesma cor, tamanho e hierarquia.
Nenhuma opção recebe indicação visual de “correta”, “arriscada” ou “errada”.
Não há pontuação, barra de risco ou exposição dos estados internos.



Temas de aparência

Automático como padrão, acompanhando o sistema.
Claro e Escuro disponíveis manualmente.
Preferência salva separadamente da partida.
Alteração imediata, sem recarregar a página.



Versão móvel

Coluna única.
Escolhas empilhadas.
Histórico em painel sobreposto.
Configuração de aparência dentro do menu.
Indicador discreto de salvamento.



Acessibilidade

Contraste WCAG AA.
Foco visível.
Área de toque mínima de 44×44 px.
Navegação completa por teclado.
Zoom funcional até 200%.
Redução de movimento.
Cor nunca usada como único indicador.
Após a transição, o foco deve ir para o título do novo conteúdo.
Leitores de tela recebem apenas um anúncio curto, como “Nova cena carregada”, sem repetição automática de toda a prosa.



Ajuste importante no texto de ajuda
A frase:

“Pressione Enter ou Espaço para confirmar uma escolha.”

deve aparecer apenas quando houver navegação por teclado detectada ou foco dentro da área de escolhas.
Em dispositivos móveis, essa instrução não deve aparecer. Pode ser substituída por uma orientação apropriada ao toque — ou simplesmente omitida, pois os botões já deixam a interação evidente.
Também é importante distinguir:

Selecionar uma opção
Confirmar uma decisão

Caso a interface use uma etapa de confirmação, o fluxo deve ser:
Plain Text1. Jogador seleciona uma opção.2. A opção recebe destaque neutro de seleção.3. Aparecem as ações:   “Rever opções” e “Confirmar decisão”.4. Somente após confirmar a decisão, o estado é alterado.5. Depois da confirmação, não existe desfazer.`Mostrar mais linhas
Isso reduz toques acidentais sem diminuir o peso narrativo.
Pequenos refinamentos recomendados
Cabeçalho
O cabeçalho deve permanecer compacto:

ícone do livro;
nome do projeto;
nome do caso;
histórico;
configurações;
aparência.

No celular, deixar apenas:

menu;
ícone ou título;
configurações.

Status de salvamento
O indicador “Salvo” deve ser discreto e não competir com a história.
Estados possíveis:

Salvando…
Salvo
Salvamento indisponível

O status não deve permanecer piscando nem gerar notificações repetitivas.
Histórico
O histórico deve registrar a escolha de maneira factual:
Plain Text23h40 — O ECG quenteVocê interrompeu o médico.Mostrar mais linhas
Não usar:
Plain TextVocê fez a escolha correta.Tempo poupado: 6 minutos.Confiança da equipe: +1.Mostrar mais linhas
Tema claro
O tema claro deve conservar a mesma identidade literária:

bege claro no fundo;
superfícies brancas suaves;
texto grafite;
detalhes em âmbar escuro;
bordas discretas.

Não deve parecer um sistema administrativo hospitalar.
Tema escuro
O tema escuro aprovado utiliza:

fundo azul-marinho quase preto;
superfícies azul-acinzentadas;
texto branco quebrado;
detalhes em âmbar;
vermelho somente para atenção real, nunca para classificar escolhas.

Registro canônico para o projeto
Você pode informar ao Kiro:
Plain TextREFERÊNCIA VISUAL APROVADAA imagem Designer.png é a referência visual canônica do MVP.A implementação deve preservar:- narrativa como elemento dominante;- histórico progressivo e não preditivo;- ausência total de cenas futuras no histórico;- temas Automático, Claro e Escuro;- escolhas visualmente neutras;- layout mobile em coluna única;- aparência clínica, literária e sóbria;- acessibilidade integrada;- ausência de pontos, scores, barras de progresso e estados internos.A imagem é uma referência de direção visual, não uma especificação absoluta de pixels.Em caso de conflito:1. requirements.md prevalece no comportamento;2. design.md prevalece na arquitetura e acessibilidade;3. Designer.png prevalece na direção visual;4. os documentos narrativos prevalecem no conteúdo textual.Não copiar da imagem qualquer elemento que contradiga os documentos aprovados.A interface final não deve exibir:- “Cena X de Y”;- cenas futuras;- nomes de cenas não visitadas;- finais ainda não alcançados;- escolhas alternativas depois da confirmação;- estados internos;- pontuação;- classificação visual das opções.Mostrar mais linhas
Assim, o layout fica oficialmente aprovado como referência visual do produto, mas permanece subordinado às regras funcionais e de acessibilidade já definidas.