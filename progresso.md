# Progresso do Projeto: Componente React SVG Edit (SkyMob)

Este documento acompanha resumidamente as etapas e o progresso do desenvolvimento do editor de etiquetas em SVG.

## Início do Projeto
- **Data e Hora de Início:** 26 de Maio de 2026, por volta das 20:00h.

## Passos Realizados (Milestones)

### 1. Estruturação Inicial (26/05/2026)
- Busca de projetos prontos.
- Busca de referências em projetos open-source  
- Escolha de um motor SVG (react-svg-canvas)
- Definição da Arquitetura do projeto
- **Escolha da Stack e Tecnologias:**
  - **Framework/UI:** React 19 com TypeScript
  - **Bundler/Build:** Vite
  - **Estilização:** Tailwind CSS v4 + Tailwind Animate
  - **Motor Gráfico (SVG):** `react-svg-canvas`
  - **Gerenciamento de Estado:** Zustand + Immer (para controle imutável)
  - **Atalhos de Teclado:** `react-hotkeys-hook`
  - **Ícones:** `lucide-react`
  - **Utilitários:** `clsx` para classes condicionais

### 1. Estruturação Inicial (27/05/2026)
- Criação da estrutura base do projeto.
- Implementação inicial do Canvas.
- Painel de ferramentas (toolbar).
- Painéis de Propriedades, Layers e Campos.
- Toolbar superior.
- Funcionalidades básicas de redimensionamento e seleção de objetos implementadas.

### 2. Motor de Interações, Matemática e UX (28/05/2026)
- Adicionado rotação.
- Adicionado Pivôs aos objetos, para alterar o eixo de rotação.
- Ajustes finos no comportamento dos objetos dentro do canvas.
- Melhorias na interface de usuário e correção de bugs básicos na manipulação dos elementos.
- **Correção do "Bug do Foguete" (Pivô):** Substituição do que multiplicava a aceleração do mouse sob zoom por um cálculo de conversão de coordenadas estrito via `getBoundingClientRect()`, estabilizando a movimentação e rotação.
- **Sincronização Dupla-Via de Zoom:** Resolução da falha, o Scroll do mouse e a barra de ferramentas (UI) estão sincronizados.
- **Escala de UI Cosmética (100% Virtual):** Implementação de uma escala em que um Zoom interno de 2.0x (melhor visualização no monitor) é exibido na UI como "100%", garantindo uma leitura de área mais confortável sem afetar as medidas físicas na exportação.
- **Delimitação do Palco (Artboard):** Criação de um retângulo absoluto de fundo (Stage) com dimensões físicas exatas (ex: 100x75mm) e uma leve sombra, dando um limite visual real às marcações do Grid de réguas.
- **Polimentos de UI (UX Refinements):**
  - Redução no tamanho dos *handles* de seleção (pontos azuis) para cerca de 1/3 do tamanho original para evitar clique acidental e poluição visual.
  - Aperfeiçoamento da funcionalidade do input de Zoom, permitindo alteração rápida via tecla `Enter` ou clique forçado fora da janela para descartar edição.

### 3. Deixar versionado e coisas afins (29/05/2026)
- Ajustes no projeto
- Envio para o github
- Criação do arquivo progresso.md
- criação de uma page no github


---
*Este arquivo serve como um registro do histórico principal e pode ser atualizado conforme novas funcionalidades críticas forem concluídas.*
