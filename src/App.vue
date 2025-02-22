<template>
  <splitpanes class="app">
    <!-- Панель управления -->
    <pane class="panel" max-size="33.33%" min-size="10%" size="15%">
      <label>Ширина: <input type="number" v-model="canvasSize.width" @change="updateCanvasSize" /></label>
      <label>Высота: <input type="number" v-model="canvasSize.height" @change="updateCanvasSize" /></label>
      <button @click="addText">Добавить текст</button>
      <button @click="addTable">Добавить таблицу</button>
      <button @click="generateHTML">Сохранить HTML</button>
      <!-- Вывод свойств выбранного элемента -->
      <div v-if="selectedElement" class="properties-panel">
        <h3>Свойства</h3>
        <p>Left: {{ selectedElement.x }}px</p>
        <p>Top: {{ selectedElement.y }}px</p>
        <p>Width: {{ selectedElement.width }}px</p>
        <p>Height: {{ selectedElement.height }}px</p>
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
          :dblClickZoomStep="0.4"
          :wheelZoomStep="0.05"
          :pan-enabled=isPanEnabled
          :enableControlButton="false"
          v-model:pan="pan"
          v-model:zoom="zoom">
            <div id="canvas">
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
                    :style="textStyle(el)"
                    contenteditable="true"
                    @input="(event) => el.text = event.target.innerText"
                    @click="selectElement(el)"
                  >
                  Текст
                  </div>
                  <table
                   v-if="'rows' in el"
                   contenteditable="true" 
                   class="table-element resizable"
                   :data-id="el.id"
                   :style="tableStyle(el)"
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
import { ref, reactive, onMounted } from "vue";
import { Splitpanes, Pane } from 'splitpanes';
import 'splitpanes/dist/splitpanes.css';
import interact from 'interactjs';
import "vue-zoomable/dist/style.css";
import { VueZoomable, ScrollOverlay } from "vue-zoomable";

const zoom = ref(1);
const pan = ref({ x: 100, y: 100 });

// Размер холста (по умолчанию 800x600)
const canvasSize = reactive({ width: 800, height: 600 });

const isPanEnabled = ref(true);

// Список элементов (текстов)
const elements = ref([]);

// Выбранный элемент
const selectedElement = ref(null);

const addMode = ref(false);

const whatsMode = ref({});

const addText = () => {
  addMode.value = true;
  
  whatsMode.value = {
      id: Date.now(),
      text: "Текст",
      x: 0,
      y: 0,
      width: null,
      height: null,
      offset: { x: 0, y: 0 }
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
    offset: { x: 0, y: 0 }
  };
};

const textStyle = (el) => {
  return {
    position: 'absolute',
    left: el.x + 'px',
    top: el.y + 'px',
    width: el.width !== null ? el.width + 'px' : 'auto',
    height: el.height !== null ? el.height + 'px' : 'auto',
    transform: `translate(${el.offset.x}px, ${el.offset.y}px)`
  }
};

const tableStyle = (el) => {
  return {
    position: 'absolute',
    left: el.x + 'px',
    top: el.y + 'px',
    width: el.width !== null ? el.width + 'px' : 'auto',
    height: el.height !== null ? el.height + 'px' : 'auto',
    transform: `translate(${el.offset.x}px, ${el.offset.y}px)`
  }
};

const onCanvasClick = (e) => {
  if (!addMode.value) return;

  const canva = e.currentTarget;
  const rect = canva.getBoundingClientRect();

  whatsMode.value.x = (e.clientX - rect.left) / zoom.value;
  whatsMode.value.y = (e.clientY - rect.top) / zoom.value;

  elements.value.push({ ...whatsMode.value });

  addMode.value = false;
};

const selectElement = (el) => {
  selectedElement.value = el;
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

onMounted(() => {
  interact('.resizable')
  .draggable({
      listeners: {
        move (event) {
          isPanEnabled.value = false;
          // Ищем элемент в массиве по data-id
          const id = event.target.getAttribute("data-id");
          const el = elements.value.find(e => e.id == id);
          if (!el) return;

          el.x += event.dx / zoom.value;
          el.y += event.dy / zoom.value;

          setTimeout(() => {
            isPanEnabled.value = true;
          }, 500);
        }
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
        if (!el) return;

        el.width = event.rect.width / zoom.value;
        el.height = event.rect.height / zoom.value;

        el.offset.x +=  event.deltaRect.left
        el.offset.y += event.deltaRect.top

        setTimeout(() => {
            isPanEnabled.value = true;
        }, 750);
      }
    },
    invert: 'reposition'
  });
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
  cursor: move;
  padding: 5px;
  background: rgba(255, 255, 255, 0.8);
  border: 1px solid #ccc;
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
</style>