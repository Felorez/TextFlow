// Сборка выгружаемого HTML-макета.
// Вынесено из App.vue отдельным модулем, чтобы покрыть тестами.

// Текст элементов попадает в выгружаемый файл как есть,
// поэтому спецсимволы нужно экранировать
export const escapeHTML = (value) => String(value ?? '')
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;');

export const buildHTML = (elements, canvasSize) => {
  let html = `<html>
  <head>
    <meta charset="UTF-8">
    <style>
      html, body {
        margin: 0;
        padding: 0;
        display: flex;
        justify-content: center;
        align-items: center;
        height: 100vh;
        background: #1e1e1e;
      }
      .canvas {
        position: relative;
        width: ${canvasSize.width}px;
        height: ${canvasSize.height}px;
        background: white;
        border: 1px solid #ccc;
      }
      .text {
        position: absolute;
        white-space: pre-line;
      }
    </style>
  </head>
  <body>
    <div class="canvas">`;

  elements.forEach((el) => {
    if (el.type === "table") {
        html += `<table class="custom-table" style="
          left: ${el.x}px;
          top: ${el.y}px;
          font-size: ${el.fontSize || 16}px;
          font-family: ${el.fontFamily || 'sans-serif'};
          position: absolute;
          border-collapse: collapse;
        ">`;

        el.rows.forEach((row) => {
            html += "<tr>";
            if (Array.isArray(row)) {
                row.forEach((cell) => {
                    html += `<td style="border: 1px solid black; padding: 5px;">${escapeHTML(cell)}</td>`;
                });
            }
            html += "</tr>";
        });

        html += "</table>\n";
    } else {
        html += `<div class="text" style="
          left: ${el.x}px;
          top: ${el.y}px;
          font-size: ${el.fontSize || 20}px;
          font-family: ${el.fontFamily || 'sans-serif'};
          position: absolute;
        ">${escapeHTML(el.text)}</div>\n`;
    }
  });

  html += `</div>
  </body>
</html>`;

  return html;
};
