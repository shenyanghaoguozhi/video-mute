// ==============================
// 一键运行说明：
// 1. 安装 Node.js
// 2. 新建文件夹，把本文件保存为 main.js
// 3. 执行：npm init -y
// 4. 安装依赖：npm install electron fluent-ffmpeg ffmpeg-static
// 5. package.json 里加："start": "electron ."
// 6. 执行：npm start
// ==============================

const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const ffmpeg = require('fluent-ffmpeg');
const ffmpegPath = require('ffmpeg-static');

ffmpeg.setFfmpegPath(ffmpegPath);

function createWindow() {
  const win = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });

  win.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`);
}

app.whenReady().then(createWindow);

ipcMain.handle('select-files', async () => {
  const result = await dialog.showOpenDialog({
    properties: ['openFile', 'multiSelections'],
    filters: [{ name: 'Videos', extensions: ['mp4'] }]
  });
  return result.filePaths;
});

ipcMain.on('start-process', (event, files) => {
  files.forEach((file, index) => {
    const output = file.replace('.mp4', '_mute.mp4');

    ffmpeg(file)
      .outputOptions('-an')
      .on('progress', (progress) => {
        event.sender.send('progress', {
          file,
          percent: progress.percent || 0
        });
      })
      .on('end', () => {
        event.sender.send('done', { file, output });
      })
      .on('error', (err) => {
        event.sender.send('error', { file, err: err.message });
      })
      .save(output);
  });
});

// ================= UI =================
const html = `
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<title>批量消音工具</title>
<style>
body { font-family: Arial; background:#0f172a; color:#fff; padding:20px; }
button { padding:10px 20px; margin:10px; background:#22c55e; border:none; border-radius:8px; cursor:pointer; }
.file { margin:10px 0; }
.bar { height:10px; background:#334155; border-radius:5px; overflow:hidden; }
.fill { height:100%; width:0%; background:#22c55e; }
</style>
</head>
<body>
<h2>MP4 批量消音（桌面专业版）</h2>
<button onclick="selectFiles()">选择视频</button>
<button onclick="start()">开始处理</button>
<div id="list"></div>

<script>
const { ipcRenderer } = require('electron');
let files = [];

async function selectFiles() {
  files = await ipcRenderer.invoke('select-files');
  const list = document.getElementById('list');
  list.innerHTML = '';

  files.forEach(f => {
    const div = document.createElement('div');
    div.className = 'file';
    div.innerHTML = `
      <div>${f}</div>
      <div class='bar'><div class='fill' id='${f}'></div></div>
    `;
    list.appendChild(div);
  });
}

function start() {
  ipcRenderer.send('start-process', files);
}

ipcRenderer.on('progress', (e, data) => {
  const el = document.getElementById(data.file);
  if (el) el.style.width = data.percent + '%';
});

ipcRenderer.on('done', (e, data) => {
  const el = document.getElementById(data.file);
  if (el) el.style.width = '100%';
});

ipcRenderer.on('error', (e, data) => {
  alert('错误: ' + data.err);
});
</script>
</body>
</html>
`;
