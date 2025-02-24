<template>
  <splitpanes class="app">
    <!-- Панель управления -->
    <pane class="panel" max-size="33.33%" min-size="17%" size="20%">
      <label>Ширина: <input type="number" v-model="canvasSize.width" @change="updateCanvasSize" /></label>
      <label>Высота: <input type="number" v-model="canvasSize.height" @change="updateCanvasSize" /></label>
      
      <button @click="addText">Добавить текст</button>
      <button @click="addTable">Добавить таблицу</button>
      <button @click="generateHTML">Сохранить HTML</button>

      <div class="alignment-panel" v-if="selectedElement">
        <div class="alignment-group">
          <button @click="align('left')" class="alignment-btn left" title="Align Left"></button>
          <button @click="align('center')" class="alignment-btn center" title="Align Center"></button>
          <button @click="align('right')" class="alignment-btn right" title="Align Right"></button>
        </div>

        <div class="alignment-group">
          <button @click="align('top')" class="alignment-btn top" title="Align Top"></button>
          <button @click="align('middle')" class="alignment-btn middle" title="Align Middle"></button>
          <button @click="align('bottom')" class="alignment-btn bottom" title="Align Bottom"></button>
        </div>
      </div>

      <div class="position-panel" v-if="selectedElement">
        <label class="position-label">Position</label>
        <div class="position-inputs">
          <div class="position-input-group">
            <label for="posX">X</label>
            <input 
            type="text" 
            id="posX"
            v-model.number="selectedElement.x"
            @input="positionUpdate"/>
          </div>
          <div class="position-input-group">
            <label for="posY">Y</label>
            <input 
            type="text"
            id="posY"
            v-model.number="selectedElement.y"
            @input="positionUpdate"/>
          </div>
        </div>
      </div>

      <div class="nebula-container" v-if="selectedElement">
        <div class="nebula-label">Layout</div>

        <div class="nebula-label">Dimensions</div>
        <div class="nebula-row">
          <input 
          class="nebula-input" 
          type="text" 
          v-model.number="selectedElement.width"
          :disabled="!selectedElement.isWidthResizable"/>
          <span style="margin: 0 5px;">x</span>
          <input 
          class="nebula-input" 
          type="text" 
          v-model.number="selectedElement.height"
          :disabled="!selectedElement.isHeightResizable"/>
        </div>

        <div class="nebula-label">Resizing</div>
        <div class="nebula-actions">
          <button class="nebula-btn" @click="toggleResizable(false)">⇄</button>
          <button class="nebula-btn" @click="selectedElement.isHeightResizable = false">☰</button>
          <button class="nebula-btn" @click="toggleResizable(true)">▦</button>
        </div>
      </div>
    </pane>

    <!-- Область конструктора -->
    <pane class="constructor">
      <ScrollOverlay
        wheel-unlock-key="Control"
        style="width: 100%; height: 100%;"
      >
        <template #overlay>
          <VueZoomable 
          id="vue-zoomable"
          selector="#canvas"
          style="width: 100%; height: 100%;"
          :class="{ 'add-text-cursor': addMode }"
          :minZoom="0.3"
          :maxZoom="2"
          :dblClickZoomStep="0"
          :wheelZoomStep="0.05"
          :pan-enabled=isPanEnabled
          :enableControlButton="false"
          v-model:pan="pan"
          v-model:zoom="zoom">
            <div id="canvas">
              <div class="ruler-wrapper">
                <div class="ruler horizontal">
                  <div class="ruler-controls ruler-control" :style="{ position: 'absolute', left: rulerControl.x + 'px' }">
                  </div>
                  <div v-for="mark in horizontalMarks" :key="mark" class="ruler-mark" :style="{ left: mark + 'px' }">
                    <span class="ruler-label" v-if="mark % 50 === 0">{{ mark }}</span>
                  </div>
                </div>
              </div>
              <div 
              class="canva"
              :style="{ 
                width: canvasSize.width + 'px', 
                height: canvasSize.height + 'px'
              }"
              @click="onCanvasClick">
                <div 
                v-for="el in elements"
                :key="el.id"
                class="container-element"
                >
                  <div
                    v-if="'text' in el"
                    class="text resizable"
                    :data-id="el.id"
                    :class="{ selected: selectedElement && selectedElement.id === el.id }"
                    :style="style(el)"
                    :contenteditable="el.isEditing"
                    @dblclick="el.isEditing = true"
                    @blur="el.isEditing = false"
                    @input="inputText($event, el)"
                    @click="selectElement(el)"
                  >
                  Текст
                  </div>
                  <table
                   v-if="'rows' in el"
                   contenteditable="true" 
                   class="table-element resizable"
                   :data-id="el.id"
                   :style="style(el)"
                   @input="(e) => onTableInput(e, el)">
                    <tr v-for="(row, rowIndex) in el.rows" :key="rowIndex">
                      <td
                        v-for="(cell, cellIndex) in row"
                        :key="cellIndex"
                        contenteditable="true"
                      >
                        {{ cell }}
                      </td>
                    </tr>
                  </table>
                </div>
              </div>
            </div>
          </VueZoomable>
        </template>
      </ScrollOverlay>
    </pane>
  </splitpanes>
</template>

<script setup>
import { ref, reactive, onMounted, onBeforeUnmount, computed } from "vue";
import { Splitpanes, Pane } from 'splitpanes';
import 'splitpanes/dist/splitpanes.css';
import interact from 'interactjs';
import "vue-zoomable/dist/style.css";
import { VueZoomable, ScrollOverlay } from "vue-zoomable";

let dxsum = 0, dysum = 0;

const zoom = ref(1);
const pan = ref({ x: 100, y: 100 });

// Размер холста (по умолчанию 800x600)
const canvasSize = reactive({ width: 800, height: 600 });

const rulerControl = ref({x: 0, y: 0});

const isPanEnabled = ref(true);

// Список элементов (текстов)
const elements = ref([]);

// Выбранный элемент
const selectedElement = ref(null);

const addMode = ref(false);

const whatsMode = ref({});

let scope = ref([
  {x: 8, y: 8, maxX: -15, maxY: -8, equX: 0, equY: 0}
])

const horizontalMarks = computed(() => {
  const marks = [];
  const step = 10;
  for (let i = 0; i <= canvasSize.width; i += step) {
    marks.push(i);
  }
  return marks;
});

const inputText = (event, el) => {
  el.text = event.target.innerText;
  const elDom = document.querySelector(`[data-id="${selectedElement.value.id}"]`);

  el.width = elDom.offsetWidth;
  el.height = elDom.offsetHeight;
}

const positionUpdate = () => {
  if (!selectedElement.value) return;

  dxsum = selectedElement.value.x;
  dysum = selectedElement.value.y;
}

const align = (alignment) => {
    let x, y;

    let A = {
      x: 0,
      y: 0,
      width: canvasSize.width,
      height: canvasSize.height
    };

    let B = selectedElement.value;

    switch (alignment) {
        case "middle":
            x = B.x;
            y = (A.height - B.height) / 2;
            break;
        case "center":
            x = (A.width - B.width) / 2;
            y = B.y;
            break;
        case "left":
            x = A.x + rulerControl.value.x;
            y = B.y;
            break;
        case "right":
            x = A.width - B.width;
            y = B.y;
            break;
        case "top":
            x = B.x;
            y = A.y;
            break;
        case "bottom":
            x = B.x;
            y = A.height - B.height;
            break;
        case "top-left":
            x = A.x;
            y = A.y;
            break;
        case "top-right":
            x = A.x + A.width - B.width;
            y = A.y;
            break;
        case "bottom-left":
            x = A.x;
            y = A.y + A.height - B.height;
            break;
        case "bottom-right":
            x = A.x + A.width - B.width;
            y = A.y + A.height - B.height;
            break;
        default:
            throw new Error("Unknown alignment type");
    }

    [B.x, B.y] = [x, y];
    [dxsum, dysum] = [x, y];
    console.log(selectedElement.value);
}

const inputKey = (e) => {
  if ((e.key === 'Delete' || e.key === 'Del') && selectedElement.value) {
    elements.value = elements.value.filter(el => el.id !== selectedElement.value.id);
    selectedElement.value = null;
  }
}

const addText = () => {
  addMode.value = true;
  
  whatsMode.value = {
      id: Date.now(),
      text: "Текст",
      x: 0,
      y: 0,
      width: 73,
      height: 46,
      isEditing: false,
      isWidthResizable: false,
      isHeightResizable: false
  };
};

const addTable = () => {
  addMode.value = true;

  const defaultRows = [
    ["Ячейка 1-1", "Ячейка 1-2", "Ячейка 1-3"],
    ["Ячейка 2-1", "Ячейка 2-2", "Ячейка 2-3"],
    ["Ячейка 3-1", "Ячейка 3-2", "Ячейка 3-3"]
  ];

  whatsMode.value = {
    id: Date.now(),
    type: "table",
    rows: defaultRows,
    x: 0,
    y: 0,
    width: null,
    height: null,
    isWidthResizable: false,
    isHeightResizable: false
  };
};

const style = (el) => {
  return {
    position: 'absolute',
    left: el.x + 'px',
    top: el.y + 'px',
    width: el.isWidthResizable ? el.width + 'px' : 'auto',
    height: el.isHeightResizable ? el.height + 'px' : 'auto',
  }
};

const toggleResizable = (boolArgument) => {
  selectedElement.value.isWidthResizable = boolArgument;
  selectedElement.value.isHeightResizable = boolArgument;
};

const onCanvasClick = (e) => {
  if (!addMode.value) return;

  const canva = e.currentTarget;
  const rect = canva.getBoundingClientRect();

  whatsMode.value.x = Math.floor((e.clientX - rect.left) / zoom.value);
  whatsMode.value.y = Math.floor((e.clientY - rect.top) / zoom.value);

  [dxsum, dysum] = [whatsMode.value.x, whatsMode.value.y];

  elements.value.push({ ...whatsMode.value });

  addMode.value = false;
};

const selectElement = (el) => {
  selectedElement.value = el;
  [dxsum, dysum] = [el.x, el.y];
};

const generateHTML = () => {
  let html = `<html>
              \  <head>
              \   <style>
                      html, body {
                        margin: 0;
                        padding: 0;
                        display: flex;
                        justify-content: center;
                        align-items: center;
                        background: #1e1e1e; /* Для наглядности */
                      }

                      .canvas {
                        position: relative;
                        width: ${canvasSize.width}px;
                        height: ${canvasSize.height}px;
                        background: white;
                        border: 1px solid #ccc;
                      }
              \        .text { position: absolute; font-size: 20px; cursor: move; }
              \      </style>
              \  </head>
              \<body>
              \<div class="canvas">`;


  elements.value.forEach((el) => {
    html += `<div class="text" style="left: ${el.x}px; top: ${el.y}px;">${el.text}</div>\n`;
  });

  html += `</div>\n</body>\n</html>`;

  // Создание и скачивание файла
  const blob = new Blob([html], { type: "text/html" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = "canvas.html";
  link.click();
};

document.addEventListener('click', (event) => {
  if (selectedElement.value) {
    const elDom = document.querySelector(`[data-id="${selectedElement.value.id}"]`);
    const panel = document.querySelector(`.panel`);

    if (panel && panel.contains(event.target)) {
      return;
    }

    if (elDom && !elDom.contains(event.target)) {
      selectedElement.value.isEditing = false;
      selectedElement.value = null;
    }
  }
});

onMounted(() => {
  interact('.ruler-control')
  .draggable({
    modifiers: [
      interact.modifiers.snap({
        targets: [
          interact.snappers.grid({ x: 1, y: 1 })
        ],
        range: canvasSize.width,
        relativePoints: [ { x: 0, y: 0 } ]
      })
    ],
    listeners: {
      move (event) {
        isPanEnabled.value = false;

        rulerControl.value.x += Math.floor(event.dx / zoom.value);

        if (rulerControl.value.x <= 0) {
          rulerControl.value.x = 0;
        }

        if (rulerControl.value.x >= (canvasSize.width - 20)) {
          rulerControl.value.x = (canvasSize.width - 20);
        }

        scope.value[1] = ({
          x: rulerControl.value.x + 8,
          y: 8,
          maxX: rulerControl.value.x - 15,
          maxY: rulerControl.value.y - 8,
          equX: rulerControl.value.x,
          equY: 0
        })

        setTimeout(() => {
          isPanEnabled.value = true;
        }, 1000);

        if (!selectedElement.value) return;

        let el = selectedElement.value;

        for (const border of scope.value) {
              if (dxsum < border.x && dxsum > border.maxX) {
                  el.x = border.equX;
                  dxsum = el.x;
                  break;
              }
              if (dxsum >= border.x || dxsum <= border.maxX) {
                  el.x = dxsum;
              }
          }

          for (const border of scope.value) {
              if (dysum < border.y && dysum >= border.maxY) {
                  el.y = border.equY;
                  dysum = el.y;
                  break;
              }
              if (dysum >= border.y || dysum <= border.maxY) {
                  el.y = dysum;
              }
          }
      }
    },
    inertia: true
  })

  interact('.resizable')
  .draggable({
      listeners: {
        move (event) {
          isPanEnabled.value = false;
          
          const id = event.target.getAttribute("data-id");
          const el = elements.value.find(e => e.id == id);
          if (!el || el.isEditing) return;

          selectedElement.value = el;

          dxsum += Math.floor(event.dx / zoom.value);
          dysum += Math.floor(event.dy / zoom.value);

          for (const border of scope.value) {
              if (dxsum < border.x && dxsum > border.maxX) {
                  el.x = border.equX;
                  break;
              }
              if (dxsum >= border.x || dxsum <= border.maxX) {
                  el.x = dxsum;
              }
          }

          for (const border of scope.value) {
              if (dysum < border.y && dysum >= border.maxY) {
                  el.y = border.equY;
                  break;
              }
              if (dysum >= border.y || dysum <= border.maxY) {
                  el.y = dysum;
              }
          }

          setTimeout(() => {
            isPanEnabled.value = true;
          }, 500);
        }
      },
      cursorChecker () {
        return null
      },
      inertia: true
    })
  
  .resizable({
    edges: { top: true, left: true, bottom: true, right: true },
    margin: 5,
    listeners: {
      move (event) {
        isPanEnabled.value = false;

        const target = event.target;
        const id = target.getAttribute('data-id');
        const el = elements.value.find(e => e.id == id);
        if (!el || !selectedElement.value) return;

        el.isWidthResizable = true;
        el.isHeightResizable = true;

        el.width = Math.floor(event.rect.width / zoom.value);
        el.height = Math.floor(event.rect.height / zoom.value);

        el.x += event.deltaRect.left;
        dxsum += event.deltaRect.left;
        el.y += event.deltaRect.top;
        dysum += event.deltaRect.top;

        console.log(123);

        setTimeout(() => {
            isPanEnabled.value = true;
        }, 750);
      }
    },
    invert: 'reposition'
  });
  window.addEventListener('keydown', inputKey);
});

onBeforeUnmount(() => {
  window.removeEventListener('keydown', inputKey);
});

</script>

<style>
.app {
  display: flex;
  height: 100vh;
}

.panel {
  width: 250px;
  padding: 10px;
  background: #2c2c2c;
  display: flex;
  flex-direction: column;
  gap: 10px;
  color: white;
}

.splitpanes--vertical>.splitpanes__splitter {
  border: none;
  border-color: rgb(211, 211, 211);
  border-left: 1px solid #4a4a4a;
  background-color: #1e1e1e;
  min-width: 10px;
  cursor: ew-resize;
}

.constructor {
  flex: 1;
  display: flex;
  justify-content: center;
  min-width: 600px;
  overflow: auto;
  align-items: center;
  background: #1e1e1e;
}
.canva {
  position: relative;
  flex-shrink: 0;
  background: white;
}

.text {
  position: absolute;
  font-size: 20px;
  white-space: pre-wrap;
  box-sizing: border-box;
}

/* Стили для выделенной панели свойств */
.properties-panel {
  margin-top: 20px;
  padding: 10px;
  background: #3c3c3c;
  border: 1px solid #555;
  font-size: 14px;
}

.add-text-cursor {
  cursor: crosshair; /* Или другой желаемый стиль курсора */
}

.table-element {
  width: 100%;
  height: 100%;
  border-collapse: collapse;
}
.table-element td {
  border: 1px solid #ccc;
  padding: 5px;
  min-width: 50px;
  min-height: 30px;
  white-space: pre-wrap;
}

.selected {
  border: 2px dashed blue;
}

.alignment-panel {
  display: inline-flex;
  margin-top: 20%;
  gap: 8px; /* Расстояние между группами кнопок */
  background: #2b2b2b; /* Цвет фона, похожий на темную тему Figma */
  border-radius: 6px;
  font-family: sans-serif;
}

/* Группа кнопок (горизонтальные и вертикальные) */
.alignment-group {
  display: flex;
  gap: 4px; /* Расстояние между кнопками внутри группы */
}

/* Стили для кнопок */
.alignment-btn {
  width: 32px;
  height: 32px;
  background: #3c3c3c;
  background-size: 30px 30px;
  background-size: contain;
  filter: invert(1);
  border: none;
  border-radius: 4px;
  cursor: pointer;
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.2s;
}

.ruler-wrapper {
  width: 100%;
  height: 40px;
  margin-bottom: 10px;
  pointer-events: none;
}
.ruler.horizontal {
  position: absolute;
  top: 20px;
  left: 0;
  width: 100%;
  height: 20px;
  background: #eee;
  border-bottom: 1px solid #ccc;
  font-size: 10px;
}
.ruler.horizontal .ruler-mark {
  position: absolute;
  bottom: 0;
  width: 1px;
  height: 5px;
  background: #333;
}
.ruler.horizontal .ruler-label {
  position: absolute;
  bottom: 5px;
  transform: translateX(-50%);
  color: #333;
}

.ruler-control {
  pointer-events: auto;
  position: relative;
  z-index: 10;
  width: 15px;
  height: 15px;
  border-left: 2px solid transparent;
  border-right: 15px solid transparent;
  border-top: 15px solid rgb(27, 27, 27);
}

.position-panel {
  display: flex;
  flex-direction: column;
  gap: 6px;
  background-color: #2c2c2c; /* Тёмный фон */
  color: #fff;              /* Белый текст */
  width: 100px;            /* Можно задать нужную ширину */
  font-family: sans-serif; /* Базовый шрифт */
}

.position-label {
  font-size: 14px;
  color: #ccc;   /* Цвет надписи “Position” */
}

.position-inputs {
  display: flex;
  flex-direction: row;
  gap: 8px;      /* Расстояние между группами (X / Y) */
}

.position-input-group {
  display: flex;
  background-color: #3c3c3c;
  border-radius: 4px;
  padding: 5px;
  align-items: flex-start;
  gap: 10px;
}

.position-input-group label {
  font-size: 12px;
  color: #aaa;
}

.position-input-group input {
  background-color: #3c3c3c;
  border: none;
  width: 50px;           /* Ширина поля */
  color: #fff;
  font-size: 14px;
  outline: none;
}

/* Ховер-эффект */
.position-input-group input:hover {
  border-color: #666;
}

/* Фокус-эффект */
.position-input-group input:focus {
  border-color: #aaa;
}

.nebula-container {
  background: #2b2b2b;
  border-radius: 8px;
  width: 250px;
}

.nebula-label {
  font-size: 14px;
  font-weight: bold;
  color: #ccc;
  margin-bottom: 10px;
}
.nebula-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
}
.nebula-input {
  width: 50%;
  padding: 5px;
  background: #333;
  border: none;
  color: white;
  text-align: center;
  border-radius: 4px;
}
.nebula-actions {
  display: flex;
  justify-content: space-between;
}
.nebula-btn {
  background: #444;
  border: none;
  padding: 8px;
  border-radius: 4px;
  cursor: pointer;
  width: 30%;
  text-align: center;
  font-size: 16px;
  color: white;
}
.nebula-btn:hover {
  background: #555;
}

/* Ховер-эффект */
.alignment-btn:hover {
  background: #4c4c4c;
}

/* Активное состояние (для примера) */
.alignment-btn:active {
  background: #5c5c5c;
}

.alignment-btn.left {
  background-image: url("assets/alignment-left.svg");
}
.alignment-btn.center {
  background-image: url("assets/alignment-center.svg");
}
.alignment-btn.right {
  background-image: url("assets/alignment-right.svg");
}
.alignment-btn.top {
  background-image: url("assets/alignment-top.svg");
}
.alignment-btn.middle {
  background-image: url("assets/alignment-middle.svg");
}
.alignment-btn.bottom {
  background-image: url("assets/alignment-bottom.svg");
}
</style>