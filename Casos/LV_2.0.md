
LV_2.0
Caderno de Plantão — Histórias que não cabem no prontuário
Documento técnico — Fluxograma lógico completo (FASE A)
1. Visão Geral
Este documento descreve o fluxograma lógico completo do Caso 01 — 'As Balas', servindo como documentação base para implementação do light novel clínico gamificado. Não contém prosa literária final, apenas a lógica de cenas, decisões, variáveis e desfechos.
2. Personagem Jogável
Nome: Jéssica
Função: Técnica de Enfermagem
Contexto: Técnica novata em plantão noturno de UPA 24h
3. Variáveis Globais
Variáveis internas não visíveis ao jogador, utilizadas para cálculo de rotas e finais.
Variável	Tipo	Descrição
tempo_atrasado	Inteiro (0–3)	Minutos/perda de tempo acumulada
voltaren_comunicado	Boolean	Uso prévio de AINE comunicado ou não
heparina_segura	Boolean	Processo seguro de preparo/administração
vigilancia_ativa	Inteiro (0–2)	Nível de vigilância clínica
confianca_equipe	Inteiro (-2 a +2)	Clima interpessoal
acao_critica_a_tempo	Boolean	Reconhecimento e ação na deterioração
4. Estrutura Geral do Caso
O caso é estruturado em cinco cenas sequenciais, com ramificações baseadas nas decisões do jogador.
CENA 1 — ECG quente (decisão estruturante)
CENA 2 — Informação do Voltaren (decisão moduladora)
CENA 3 — Heparina e segurança medicamentosa (decisão técnica)
CENA 4 — Silêncio e deterioração clínica (decisão crítica)
CENA 5 — Cálculo de desfecho
5. Cena 1 — ECG Quente
Decisão estruturante que define a rota emocional inicial da personagem.
Escolha	Descrição	tempo_atrasado	confianca_equipe
1A	Interromper o médico diretamente	+0	-1
1B	Levar o ECG à enfermeira	+1	0
1C	Guardar no prontuário	+2	-1
1D	Repetir o ECG	+1	0
6. Cena 2 — Informação do Voltaren
Decisão moduladora presente em todas as rotas. O impacto é tardio.
Escolha	Ação	voltaren_comunicado	confianca_equipe
2A	Comunicar imediatamente	true	+1
2B	Guardar para depois	false	0
2C	Ignorar/minimizar	false	-1
7. Cena 3 — Heparina
Decisão técnica relacionada à segurança do paciente.
Escolha	Ação	heparina_segura	confianca_equipe
3A	Dupla checagem e cálculo	true	+1
3B	Cálculo rápido individual	true	0
3C	Delegar sem conferir	false	-1
8. Cena 4 — 'Ele Dormiu?'
Decisão crítica de reconhecimento de deterioração clínica. Só ocorre se tempo_atrasado ≥ 1.
Escolha	Ação	acao_critica_a_tempo	vigilancia_ativa
4A	Chamar ajuda imediatamente	true	+2
4B	Observar antes de agir	false	+1
4C	Manter fluxo/transporte	false	0
9. Lógica de Desfechos
9.1 Final Excelente
Condições:
- tempo_atrasado ≤ 1
- acao_critica_a_tempo = true
- heparina_segura = true
9.2 Final Bom
Condições:
- tempo_atrasado ≤ 2
- acao_critica_a_tempo = true
9.3 Final Grave
Condições:
- acao_critica_a_tempo = false
- vigilancia_ativa ≥ 1
9.4 Final Trágico
Condições:
- acao_critica_a_tempo = false
- tempo_atrasado ≥ 2
- vigilancia_ativa = 0
10. Notas para Implementação
O sistema é baseado em estados acumulativos. Variáveis não devem ser expostas ao jogador. As consequências interpessoais devem aparecer em cena, e a revelação do erro ocorre apenas no debriefing final.
