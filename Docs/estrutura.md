# Arquitetura: Motor de Mala Direta (SVG para PNG)

Este documento descreve a estrutura e as decisões arquiteturais adotadas na implementação da API de Mala Direta, localizada no diretório `/server`.

## Objetivo
O motor de mala direta tem como foco a **Velocidade Máxima**. O objetivo é receber um layout/template vetorial em formato JSON (representando as propriedades SVG criadas no frontend), um array com os dados dos usuários (mala direta) e renderizar milhares de arquivos `.png` de alta qualidade em poucos segundos.

## Tecnologias Utilizadas no Backend

O servidor opera de forma totalmente isolada do Frontend React, mas compartilha da mesma lógica de renderização e cálculo.

- **Node.js (Express)**: Exposição do endpoint `/api/generate`.
- **Node Canvas (`canvas`)**: Módulo escrito em C++ (Cairo) para processamento ultra rápido no servidor. É usado **exclusivamente para medir a largura das fontes textuais em pixels**, permitindo o cálculo matemático idêntico ao navegador para quebra de linhas (word-wrap) dentro de caixas delimitadas, sem a necessidade de um Headless Browser pesando a memória.
- **Resvg (`@resvg/resvg-js`)**: Renderizador SVG profissional escrito em Rust. Responsável por receber a string SVG já montada e gerar os buffers de imagens (PNG) com precisão.
- **Adm-Zip (`adm-zip`)**: Utilizado para empacotar as imagens renderizadas na memória RAM e devolver todas em um único arquivo `.zip` pelo endpoint em um único request.

## Fluxo Lógico (Pipeline)

A rota `POST /api/generate` segue o fluxo:

1. **Recepção**: Recebe o payload contendo o array de `objects` (o design do canvas) e o array de `data` (os registros do banco de dados).
2. **Iteração**: Para cada registro na array de `data`, o sistema chama a função isomórfica de motor SVG (`objectsToSVG`).
3. **Parse & Measurement**: 
   - A função intercepta todo o texto e busca pela regex de campos customizados `<\`campo\`>`.
   - Havendo "match", o dado do BD é inserido no lugar do texto.
   - A função `wrapTextSegments` invoca o `canvasCtx.measureText(text).width` do C++.
   - Uma matriz de `<tspan>` é construída para garantir a quebra de linha visualmente correta.
4. **Montagem da String**: O SVG é concatenado.
5. **Renderização**: A string SVG é repassada ao interpretador Rust (`new Resvg()`) que a converte nativamente para pixels.
6. **Delivery**: O Buffer da imagem é injetado no arquivo ZIP, que é finalmente retornado ao cliente como `application/zip`.

## Por que não PDF?
A conversão nativa de SVG para PDF no backend via Node (sem abrir um Chromium via Puppeteer) sofre com limitações técnicas devido à complexidade da estrutura visual do SVG (clip-paths, backgrounds tracejados).
Sendo assim, optou-se exclusivamente pela geração de **PNG**, resultando em um sistema extremamente mais leve e capaz de suportar um throughput absurdo de requisições por segundo.

## Sistema de Coordenadas, Resolução (DPI) e Imagens Rasterizadas

### Editor (Frontend)
O editor vetorial e o `react-svg-canvas` rodam operando **nativamente na resolução padrão da web (96 DPI)**. Isso significa que as coordenadas matemáticas e tensões de caixas delimitadoras operam sem distorções no frontend.
Para garantir a fidelidade visual perante ao usuário, foi implementada uma camada de abstração (Display Zoom Factor = 2.12x). Essa camada desconecta o zoom do motor gráfico do zoom exibido na Toolbar, de forma que o tamanho físico de uma folha de 100x75mm seja perfeitamente representado na tela do monitor quando a UI exibir "100%".

### Exportação e Qualidade de Impressão
Apesar de rodar em 96 DPI na tela, o formato final de saída (imagens e exportação via `resvg-js`) **não fica limitado a essa densidade**. Como SVG é independente de escala, na hora de imprimir (ex: gerar um PNG), nós multiplicamos a escala do vetor. Um documento de 100x75mm operado a 96 DPI pode ser perfeitamente exportado em **300 DPI**, resultando em um canvas fotográfico nítido de cerca de `1181 x 886 pixels` sem perder nenhuma resolução de textos ou geometrias.

### Upload de Imagens Externas (PNG/JPG)
Como as imagens externas (fotos, logos jpeg) são rasterizadas, é necessário garantir que elas tenham pixels suficientes para a resolução final da impressora. Uma imagem de baixa qualidade importada para o sistema continuará de baixa qualidade na impressão.
Por isso, na futura implementação do Upload, deverá ser executada a seguinte otimização:
- A resolução máxima exigida por este formato em 300 DPI é de `1181 x 886`.
- Se o usuário subir uma foto de 4K (3840x2160 pixels, pesando ~5MB), a imagem excederá o que a impressora pode utilizar, gastando processamento e memória da aplicação desnecessariamente.
- O Frontend deverá **redimensionar (downscale) a imagem** para o limiar de ~1200px **antes de gerar o SVG Base64** ou adicionar ao Canvas.
Isso mantém os arquivos super leves no navegador (causando reduções massivas de memória, de `5MB` para `~200KB`), garantindo que o SVG permaneça ultra-rápido de salvar, renderizar e animar sem nenhum gargalo, preservando perfeitamente a definição fotográfica de 300 DPI exigida para impressão.
