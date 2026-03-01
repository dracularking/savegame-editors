# 保存编辑器工作逻辑

此文档描述了整个编辑器的运行流程和内部逻辑，方便维护和理解。

1. **启动与校验**
   - 页面加载后用户通过文件选择器选择 `game_data.sav` 存档。
   - 调用 `SavegameEditor.checkValidSavegame()`，该函数区分 Wii U/ Switch 两种字节序，通过检查文件大小和头部哈希确定版本并调用 `_getOffsets()` 初始化偏移表。

2. **动态构建偏移表**
   - `_getOffsets()` 使用对象的 `Hashes` 数组（hash 与名称交替）遍历存档内容，查找对应哈希的地址。
   - 找到时将 `offset + 4` 存入 `this.Offsets`，同时记录原哈希到 `this.Headers`。
   - 结果是运行时生成的 `Offsets` 对象，后续代码使用如 `Offsets.RUPEES`、`Offsets.FLAGS_WEAPON` 等键读写数据。

3. **界面初始化**
   - `preload()` 用于构造 DOM 元素，包括物品下拉选择器、坐标选择、骑马选项等，并设置所有事件监听。
   - 准备 `selectItem` 元素及其分类，以便物品列表可随时编辑。

4. **读取并展示数据**
   - `load()` 将统计数据（货币、生命、耐力、坐骑等）从 `tempFile` 读取并设置到表单。
   - 清空各类物品容器并遍历最大槽位，依次加载每个物品名和数量，添加到对应的分类 div 中。
   - 根据物品类别统计武器/弓/盾的 modifier 数量并生成对应的编辑控件。
   - 载入地图标记、骑马信息、载入提示图标等。

5. **编辑及交互逻辑**
   - 用户可直接在表格中修改数量、通过下拉菜单更换物品、调整 modifier 值等。
   - 编辑动作调用如 `_writeString64`、`_writeValue` 系列私有方法写回 `tempFile`，利用偏移计算保证写入准确。
   - 还包含解锁 Korok、添加地图标记、设置坐标等快捷操作。

6. **保存变更**
   - 点击保存时执行 `save()`，遍历所有可编辑字段并将当前表单值写回对应偏移。
   - 数组循环写入奖励、坐标、物品数量、modifier 等，并保持文件格式一致。

7. **辅助工具与功能**
   - 包含字符串读写、公私地址搜索、hash 查找、地图钉迭代、坐标计算等辅助函数。
   - 还支持通过延迟加载 `zelda-botw.master.js` 来扩展 Master Mode 编辑功能。

总的来说，项目采用 `读取存档 -> 解析偏移 -> 建立 GUI -> 用户交互 -> 写回存档` 的模式，所有数据访问均基于运行时生成的偏移表，保证对多版本、多平台的兼容性。

**示例说明**

以 `game_data_WiiU_1.1.sav` 为例，具体处理过程如下：

1. 读取文件头，检测到长度 **897 160**、哈希 **0x24ee**；
2. 判定为 “v1.1 (Wii U)” 并设定字节序为小端；
3. 调用 `_getOffsets()` 扫文件来定位各种 hash 对应的数据块；
4. 把找到的地址保存到 `SavegameEditor.Offsets`，后续界面渲染与修改使用这些偏移。

这种基于动态扫描哈希的机制让编辑器既能识别版本，也能适应版本间的字段移动，不需要写死常量表。

## 本地启动与访问（开发调试）

### 1) 在项目目录启动（推荐）
在 `h:\codespace\game\savegame-editors\zelda-botw` 目录执行：

```bash
python -m http.server 5500
```

浏览器访问：

```text
http://127.0.0.1:5500/
```

### 2) 在上一级目录启动
在 `h:\codespace\game\savegame-editors` 目录执行：

```bash
python -m http.server 5500
```

浏览器访问：

```text
http://127.0.0.1:5500/zelda-botw/
```

### 常见问题

- `ERR_SSL_PROTOCOL_ERROR`
  - 原因：本地服务是 HTTP，但地址被打开成了 `https://...`。
  - 处理：改用 `http://127.0.0.1:5500/...`，不要用 `https://`。

- `Master editor requires HTTP/HTTPS ... CORS restrictions`
  - 原因：使用 `file://` 直接打开页面时，`master` 标签需要加载 `javascript/zelda-botw.hashes.csv`，会被浏览器 CORS 限制。
  - 处理：通过本地 HTTP 服务访问页面（如上两种方式），不要用 `file://`。

### 功能影响说明

- 普通编辑功能（物品、词条、坐标等）在 `file://` 下通常可用。
- `Master editor` 依赖加载 `zelda-botw.hashes.csv`，建议始终在 HTTP 环境使用。

### 3) 一键启动（Windows）
在项目根目录双击：

```text
start-local.bat
```

若你还没创建该文件，可使用下面内容：

```bat
@echo off
setlocal
set "PROJECT_DIR=%~dp0"
for %%I in ("%PROJECT_DIR%..") do set "ROOT_DIR=%%~fI"
cd /d "%ROOT_DIR%"
start "" "http://127.0.0.1:5500/zelda-botw/"
python -m http.server 5500
```

## 打包为可执行文件（EXE）

### 方案：内嵌本地服务 + 桌面窗口
项目已提供：

```text
desktop_app.py
build-exe.bat
```

在项目根目录双击：

```text
build-exe.bat
```

打包成功后输出：

```text
dist\\BOTWSaveEditor.exe
```

说明：
- `desktop_app.py` 会在本机启动一个仅本地可访问的 HTTP 服务并打开桌面窗口。
- 不再需要手动开浏览器输入地址。
- 仍保留你现有的前端代码结构（`index.html + javascript + assets`）。

