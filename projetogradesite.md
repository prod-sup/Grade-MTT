# Projeto: Plataforma de Gestão de Grade MTT - Suprema (Substituição de Planilhas)

## 1. Visão Geral do Produto
O objetivo é criar uma aplicação web unificada que substitua as atuais planilhas "Global MTT" e "Calendário MTT 2026". O sistema funcionará como a fonte da verdade para a grade de torneios de poker, oferecendo um ambiente de edição (Admin) no estilo planilha e um portal de visualização dinâmico (Front-end) para os usuários e parceiros montarem seus materiais de marketing.

## 2. Stack Tecnológico
- **Framework Full-Stack:** Next.js (React) com App Router.
- **Banco de Dados:** Prisma ORM com SQLite (para setup rápido, facilitando a portabilidade).
- **UI/UX:** Tailwind CSS + Shadcn UI (componentes rápidos e minimalistas). Biblioteca `react-data-grid` ou `@tanstack/react-table` para o painel Admin estilo Excel.
- **Parsing de Dados:** `xlsx` ou `papaparse` para leitura e importação das matrizes iniciais.

## 3. Controle de Acesso e Perfis (RBAC)
O sistema terá 3 níveis de interação distintos:
1. **Admin (Master):** Acesso total de edição à grade, configurações do sistema, criação e deleção de dados, e gestão da tabela de handicaps.
2. **Operacional (Read-Only Admin):** Visualiza a tela do Admin na íntegra (incluindo todas as colunas de cálculos, taxas financeiras e rake), mas com a interface totalmente bloqueada para edições. Este perfil é estratégico para garantir a integridade dos dados durante as transições da equipe na escala 12/36, servindo apenas para consulta e configuração da grade no software do jogo.
3. **Usuário Front-end (Público/Parceiros):** Acesso restrito ao portal externo filtrado, sem visão das colunas financeiras internas. Utilizam a interface apenas para visualizar dados convertidos e gerar marketing/flyers.

## 4. Regras de Negócio e Lógica Core
- **Moeda e Fuso Horário Base:** Todo dado inserido no banco de dados (via tela Admin) tem como base absoluta Moeda = USD (1.00) e Fuso Horário = GMT-3.
- **Tabela de Parâmetros (Handicap e Fuso):** A conversão cambial não utiliza APIs externas. O Admin gerenciará uma tabela manual cadastrando "Países", definindo o Multiplicador de Moeda (Handicap) e o Fuso Horário correspondente.
- **Conversão Dinâmica (Usuário Front-end):** Ao acessar o portal, o usuário seleciona um dos países pré-cadastrados. O sistema lê o multiplicador e o fuso, recalculando instantaneamente (apenas de forma visual) os valores de Buy-in, Garantido (GTD) e horários.
- **Cálculos e Fórmulas Internas:** O sistema deve manter a lógica de campos calculados estrita. **Regra de GTD:** O valor do Rake deve ser obrigatoriamente subtraído do Buy-in total *antes* de calcular o número de entradas necessárias para bater o Garantido (Field).
- **Formato de Data:** A exibição de datas deve seguir um fluxo contínuo: "Dia da Semana - DD/MM/AAAA" (Ex: Segunda-feira - 13/07/2026).

## 5. Funcionalidades do Backoffice (Admin)
- **Visualização Master:** Acesso a todo o calendário (histórico e futuro).
- **Edição em Lote (Excel-like):** Interface ágil com edição rápida em células e menus suspensos para Tipos de Torneio, Modalidades (NLH, PLO5), etc.
- **Controle de Visibilidade Diária:** Cada data possui um interruptor ("Toggle") de Visibilidade. Se inativo, o dia desaparece do portal público, mas permanece no Admin.
- **Painel de Handicaps:** Tela de CRUD simples para gerir as regras de conversão (País, Multiplicador, Fuso).

## 6. Funcionalidades do Front-end (Usuário Público)
- **Seletor de Contexto:** Menu no cabeçalho exigindo a seleção do País/Handicap para ajustar a visualização.
- **Filtro de Visão (Ocultação de Dados):** Oculta colunas financeiras sensíveis. Exibe apenas: Horário, Nome do Torneio, GTD, Buy-in, Reentry, Add-on, Blinds, Late Reg.
- **Navegação em Abas (Tabs):**
  1. **Grade Torneios:** Agrupa "Main Events" e "Side Events" sob o cabeçalho do respectivo dia.
  2. **Grade Satélites:** Fluxo de dias contendo exclusivamente o bloco de satélites online.
  3. **Eventos em Destaque:** Painel alimentado manualmente no Admin para torneios focais.
  4. **Séries:** Grade isolada temporária de uma série específica em andamento.
  5. **Cronograma Satélites Live:** Grade voltada para qualificação de eventos presenciais.

## 7. Fases de Execução para a IA (Claude Code)
Atenção IA: Para otimização de contexto, o desenvolvimento deve seguir estritamente as fases abaixo. Aguarde validação do usuário ao final de cada fase antes de prosseguir.

- **Fase 1: Setup, Modelagem e Carga de Dados Inicial:** 
  - Inicializar projeto Next.js.
  - Criar Schema Prisma (Torneios, Usuários/Perfis RBAC, Tabela de Handicaps/Países).
  - Criar script de seed preparado para ler duas abas do Excel base: a principal ("Gestão/Base USD") e a secundária ("Conversão Brasil - Handicap 5.00").
- **Fase 2: Motor de Conversão e Lógica Matemática:** Criar utilitários TypeScript para regras cambiais, fuso horário e cálculos obrigatórios (Rake/GTD).
- **Fase 3: Painel Admin, RBAC e Gestão de Handicaps:** Implementar a interface Excel-like. Aplicar bloqueio de UI para usuários "Operacionais". Criar o painel de gestão da tabela de handicaps.
- **Fase 4: Portal do Usuário e Abas Dinâmicas:** Implementar o front-end público, o seletor de contexto e a divisão pelas 5 abas solicitadas.