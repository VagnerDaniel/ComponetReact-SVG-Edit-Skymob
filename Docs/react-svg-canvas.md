# Biblioteca `react-svg-canvas`

Este documento registra detalhes importantes, peculiaridades e boas práticas de integração da biblioteca `react-svg-canvas` no nosso projeto, especificamente para evitar regressões e documentar a resolução de bugs históricos complexos (como o bug do pivô multiplicador e a falha de sincronização do zoom).

## 1. Sistema de Coordenadas e as Funções de Tradução

A biblioteca exporta nativamente o contexto do canvas com duas funções principais que causam muita confusão devido aos seus nomes:

- **`translateTo(x, y)`**: Traduz coordenadas **DA Tela (Screen)** **PARA o Canvas (SVG)**. Essa função pega uma coordenada em pixels da tela (já descontando o deslocamento/bounding box do container) e a divide pelo `zoom/scale` atual da matriz.
  - **Uso correto**: Capturar um evento do mouse (ex: `e.clientX`) e descobrir qual o equivalente interno no palco SVG.
- **`translateFrom(x, y)`**: Traduz coordenadas **DO Canvas (SVG)** **PARA a Tela (Screen)**. Essa função multiplica a coordenada pelo `zoom/scale` atual da matriz.
  - **Cuidado**: Se você passar coordenadas do mouse para essa função enquanto a tela estiver em um zoom de 200%, ela multiplicará o movimento por 2. Quando esse valor for re-renderizado pelo canvas, ele sofrerá o zoom de 200% novamente, resultando em um movimento 4 vezes mais rápido que o mouse na tela. Foi isso que gerou o famoso **Bug do "Foguete"** no pivô de rotação.

### Como fazemos a tradução correta no `EditorCanvas.tsx`:
Para mitigar a confusão, abandonamos o uso direto dos helpers do contexto da biblioteca para as coordenadas do mouse, e reimplementamos de forma explícita e determinística no hook `getCanvasCoordinates`:

```tsx
const getCanvasCoordinates = useCallback((clientX: number, clientY: number): [number, number] => {
  const svgEl = containerRef.current?.querySelector("svg")
  if (!svgEl) return [clientX, clientY]
  
  const rect = svgEl.getBoundingClientRect()
  const localX = clientX - rect.left
  const localY = clientY - rect.top
  
  const [scale, , , , tx, ty] = matrix
  return [(localX - tx) / scale, (localY - ty) / scale]
}, [matrix])
```
*Note que fazemos exatamente o que o `translateTo` faria: dividimos pelo `scale`.*

## 2. A Dupla Sincronização do Zoom

A biblioteca `react-svg-canvas` gerencia a matriz de transformação (`matrix`) internamente. No entanto, nós temos controles de UI na nossa barra de ferramentas que dependem de um estado global no Zustand (`storeZoom`).

Historicamente, a barra de ferramentas atualizava o Zustand, mas a biblioteca não ficava sabendo. E se o usuário desse zoom com a rodinha do mouse (scroll), a biblioteca atualizava o canvas, mas o Zustand não ficava sabendo, deixando a UI morta.

Para resolver isso, implementamos uma **Sincronização de Duas Vias**:

### Caminho 1: Mouse Scroll -> Canvas -> Zustand (UI)
Quando o usuário dá zoom pelo mouse, a biblioteca altera a matriz interna e dispara o evento `onContextReady`. Capturamos esse evento para atualizar o Zustand se houver divergência:

```tsx
onContextReady={(ctx) => {
  const newMatrix = [...ctx.matrix] as [number, number, number, number, number, number]
  setMatrix(newMatrix)
  if (Math.abs(newMatrix[0] - useEditorStore.getState().zoom) > 0.001) {
    useEditorStore.getState().setZoom(newMatrix[0])
  }
}}
```

### Caminho 2: Zustand (UI) -> Canvas
Quando o usuário edita a barra de zoom, o Zustand muda. Um `useEffect` no `EditorCanvas` escuta essa mudança e injeta a nova matriz dentro da instância da biblioteca usando o `SvgCanvasHandle.setMatrix`, preservando o centro atual do viewport visual:

```tsx
useEffect(() => {
  if (Math.abs(storeZoom - matrix[0]) > 0.001 && canvasRef.current) {
    // Cálculo avançado de ancoragem para que o canvas não "pule" ao dar zoom pela Toolbar
    const svgEl = containerRef.current?.querySelector("svg")
    if (svgEl) {
      const rect = svgEl.getBoundingClientRect()
      const viewCenterX = rect.width / 2
      const viewCenterY = rect.height / 2
      
      const startScale = matrix[0]
      const startCenterX = (viewCenterX - matrix[4]) / startScale
      const startCenterY = (viewCenterY - matrix[5]) / startScale
      
      const newTx = viewCenterX - startCenterX * storeZoom
      const newTy = viewCenterY - startCenterY * storeZoom
      
      canvasRef.current.setMatrix([storeZoom, 0, 0, storeZoom, newTx, newTy])
    }
  }
}, [storeZoom, matrix])
```

## 3. Comportamentos de Propagação (Event Capture)
A biblioteca injeta nos eventos de ponteiro (como `onPointerDown`) a instrução de parada de propagação (`e.stopPropagation()`) e também previne o padrão (`e.preventDefault()`). 
- Isso significa que cliques no canvas **não removem o foco** de inputs que estiverem ativos fora dele.
- Para interceptar interações e fechar modais/popups de fora quando o usuário clica no SVG, **sempre utilize event listeners no documento na fase de captura (capture: true)**, como fizemos no `handleClickOutside` da UI de zoom.

## Conclusão
A biblioteca tem uma base matemática matricial robusta. Nunca mude os dados nativos que a biblioteca provê (especialmente a assinatura da matriz `[scale, skew, skew, scale, translateX, translateY]`), pois ela é essencial para o fluxo de re-renderização performática das camadas gráficas do sistema. Sempre use `getCanvasCoordinates` para lidar com qualquer evento de mouse sobre o editor.
