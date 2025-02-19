<script setup>
import { ref, reactive } from "vue";
import { Splitpanes, Pane } from 'splitpanes';
import 'splitpanes/dist/splitpanes.css';

// Размер холста (по умолчанию 800x600)
const canvasSize = reactive({ width: 800, height: 600 });

// Список элементов (текстов)
const elements = ref([]);

const scale = ref(1);
const originX = ref("50%");
const originY = ref("50%");
const targetOriginX = ref(50);
const targetOriginY = ref(50);

// Функция линейной интерполяции (Lerp)
const lerp = (start, end, t) => start + (end - start) * t;

// Анимация сглаживания
const smoothUpdate = () => {
  originX.value = `${lerp(parseFloat(originX.value), targetOriginX.value, 0.1)}%`;
  originY.value = `${lerp(parseFloat(originY.value), targetOriginY.value, 0.1)}%`;

  // Продолжаем анимацию, если еще не достигли цели
  if (
    Math.abs(parseFloat(originX.value) - targetOriginX.value) > 0.1 ||
    Math.abs(parseFloat(originY.value) - targetOriginY.value) > 0.1
  ) {
    requestAnimationFrame(smoothUpdate);
  }
};

const handleWheel = (event) => {
  if (event.ctrlKey) {
    event.preventDefault();

    // Получаем координаты мыши относительно конструктора
    const rect = event.currentTarget.getBoundingClientRect();
    targetOriginX.value = ((event.clientX - rect.left) / rect.width) * 100;
    targetOriginY.value = ((event.clientY - rect.top) / rect.height) * 100;

    // Запускаем сглаживание
    smoothUpdate();

    // Обновляем масштаб
    scale.value += event.deltaY * -0.001;
    scale.value = Math.max(0.5, Math.min(3, scale.value)); // Ограничение масштаба
  }
};

// Добавить текст
const addText = () => {
  elements.value.push({
    id: Date.now(),
    text: "Текст",
    x: 50,
    y: 50,
  });
};

// Изменение размера холста
const updateCanvasSize = () => {
  if (canvasSize.width < 100) canvasSize.width = 100;
  if (canvasSize.height < 100) canvasSize.height = 100;
};

// Перемещение
let selectedElement = null;
const startMove = (event, element) => {
  selectedElement = element;
  document.addEventListener("mousemove", move);
  document.addEventListener("mouseup", stopMove);
};

const move = (event) => {
  if (selectedElement) {
    selectedElement.x += event.movementX;
    selectedElement.y += event.movementY;
  }
};

const stopMove = () => {
  document.removeEventListener("mousemove", move);
  document.removeEventListener("mouseup", stopMove);
  selectedElement = null;
};

// Генерация HTML-кода
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
</script>

<template>
  <splitpanes class="app">
    <!-- Панель управления -->
    
    <pane class="panel" max-size="33.33%" min-size="10%" size="15%">
      <label>Ширина: <input type="number" v-model="canvasSize.width" @change="updateCanvasSize" /></label>
      <label>Высота: <input type="number" v-model="canvasSize.height" @change="updateCanvasSize" /></label>
      <button @click="addText">Добавить текст</button>
      <button @click="generateHTML">Сохранить HTML</button>
    </pane>

    <!-- Область конструктора -->
    <pane class="constructor" @wheel="handleWheel">
      <div class="canvas" :style="{ 
        width: canvasSize.width + 'px', 
        height: canvasSize.height + 'px',
        transform: `scale(${scale})` , 
        transformOrigin: `${originX} ${originY}`,
        transition: 'transform 0.2s ease-out'
      }">
        <div
          v-for="el in elements"
          :key="el.id"
          class="text"
          :style="{ left: el.x + 'px', top: el.y + 'px' }"
          @mousedown="(event) => startMove(event, el)"
          contenteditable="true"
          @input="(event) => el.text = event.target.innerText"
        >
          {{ el.text }}
        </div>
      </div>
    </pane>
  </splitpanes>
</template>

<style>
.app {
  display: flex;
  height: 100vh;
}

.panel {
  width: 250px;
  padding: 10px;
  background: #eee;
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.splitpanes--vertical>.splitpanes__splitter {
  border: none;
  border-color: rgb(211, 211, 211);
  border-left: 1px solid grey;
  background-color: lightgray;
  min-width: 10px;
  cursor: ew-resize;
}

.constructor {
  flex: 1;
  display: flex;
  justify-content: center;
  align-items: center;
  background: lightgray;
}
.canvas {
  position: relative;
  background: white;
}
.text {
  position: absolute;
  font-size: 20px;
  cursor: move;
  padding: 5px;
  background: rgba(255, 255, 255, 0.8);
  border: 1px solid #ccc;
}

button {
  padding: 5px;
}
input {
  width: 100px;
}
</style>
