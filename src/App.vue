<template>
  <splitpanes class="app">
    <!-- Панель управления -->
    <pane class="panel" max-size="33.33%" min-size="10%" size="15%">
      <label>Ширина: <input type="number" v-model="canvasSize.width" @change="updateCanvasSize" /></label>
      <label>Высота: <input type="number" v-model="canvasSize.height" @change="updateCanvasSize" /></label>
      <button @click="addText">Добавить текст</button>
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
        <template #default="{ disableInteraction }">
          <VueZoomable 
          id="vue-zoomable"
          selector="#canvas"
          style="width: 100%; height: 100%;"
          :minZoom="0.3"
          :maxZoom="2"
          :dblClickZoomStep="0.4"
          :wheelZoomStep="0.05"
          :pan-enabled=isPanEnabled
          :enableControlButton="false"
          v-model:pan="pan"
          v-model:zoom="zoom">
            <div id="canvas">
              <div class="canva" :style="{ 
                width: canvasSize.width + 'px', 
                height: canvasSize.height + 'px'
                }">
                <div
                  v-for="el in elements"
                  :key="el.id"
                  class="text resizable"
                  :data-id="el.id"
                  :style="{ left: el.x + 'px', top: el.y + 'px', width: el.width + 'px', height: el.height + 'px' }"
                  contenteditable="true"
                  @input="(event) => el.text = event.target.innerText"
                  @click="selectElement(el)"
                >
                Текст
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

const addText = () => {
  elements.value.push({
    id: Date.now(),
    text: "Текст",
    x: 50,
    y: 50,
    width: 150,
    height: 50,
  });
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

          // Обновляем координаты элемента
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

        setTimeout(() => {
            isPanEnabled.value = true;
        }, 750);
      }
    },
    inertia: true
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
</style>
