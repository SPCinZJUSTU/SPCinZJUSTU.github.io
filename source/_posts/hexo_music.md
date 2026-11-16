---
title: "Hexo + Swup 页面转场与 APlayer 背景音乐调试记录"
date: 2026-11-16 09:24:00
categories:
  - 技术记录
  - Hexo
tags:
  - Hexo
  - Swup
  - APlayer
  - MetingJS
  - JavaScript
---

# Hexo + Swup 页面转场与 APlayer 背景音乐调试记录

最近在给 Hexo 博客添加 Swup 页面转场和 APlayer 背景音乐时，遇到了一些问题：

- 页面切换时，云层遮罩显示和隐藏不稳定。
- 从归档页跳转到首页后，播放器仍然存在。
- 首页本身没有引入 MetingJS，却可能出现播放器容器。
- 修改 Swup 的 `page:view` 钩子后，云层遮罩和播放器的行为又出现了相互影响的情况。

这篇文章记录整个排查过程，以及目前确认的代码结构和需要继续验证的地方。

## 一、项目结构与实现思路

当前页面使用 Swup 4.10.0 实现局部页面切换。

页面主要结构如下：

```html
<body>
  <div id="swup-container">
    <!-- 页面主体内容 -->
  </div>

  <!-- 页面切换时保留的云层遮罩 -->
  <div id="cloudOverlay">
    <!-- 云层动画 -->
  </div>

  <!-- 背景音乐播放器 -->
  <div id="bgm-player"></div>
</body>
```

这里有一个重要设计：

**`#swup-container` 内部的内容会随着 Swup 页面切换而替换，而容器外部的元素不会因为这次局部替换而自动消失。**

因此，云层遮罩和背景音乐播放器如果放在 `#swup-container` 外部，就可以在页面切换时继续保留。

这种结构适合实现持续播放的背景音乐，但也意味着需要额外处理不同页面的播放器显示状态。

## 二、问题一：云层遮罩无法正常隐藏

### 1. 问题现象

页面加载和切换时，云层遮罩有时会一直停留在页面上，导致页面内容无法正常显示。

手动在浏览器控制台执行：

```js
document.querySelector('#cloudOverlay')
  .classList.remove('is-active');
```

却可以正常移除遮罩。

这说明至少在执行这条命令时，页面中可以找到对应的遮罩元素，并且移除 `is-active` 类能够改变它的显示状态。

### 2. 原因排查

原本的代码使用了一个变量 `overlay`：

```js
function hideLoading() {
  if (!overlay) return;

  overlay.classList.remove('is-active');
}
```

排查过程中发现，直接在控制台访问 `overlay` 时出现了：

```text
overlay is not defined
```

这提示 `overlay` 变量可能没有在当前代码作用域中定义，或者当前执行环境无法访问它。

因此，改成每次执行函数时重新查询 DOM：

```js
function hideLoading() {
  const el = document.querySelector('#cloudOverlay');

  if (!el) return;

  el.classList.remove('is-active');

  setTimeout(() => {
    el.classList.remove(
      'mode-loading',
      'mode-navigating',
      'was-active'
    );
  }, 800);
}
```

这样可以避免依赖一个可能失效或无法访问的旧变量引用。

### 3. Swup 生命周期钩子

当前使用的 Swup 钩子如下：

```js
if (window.swupInstance) {

  window.swupInstance.hooks.on('visit:start', function () {
    const el = document.querySelector('#cloudOverlay');

    if (!el) return;

    console.log('[云层] 开始显示');

    el.classList.remove('mode-loading');
    el.classList.add('mode-navigating', 'is-active');
  });

  window.swupInstance.hooks.on('page:view', function () {
    console.log('[云层] page:view 触发');
    hideLoading();
  });

  window.swupInstance.hooks.on('visit:end', function () {
    console.log('[云层] visit:end 触发');
    hideLoading();
  });

} else {
  console.error('[Swup] 未找到 Swup 实例');
}
```

这里需要注意：

- `visit:start`：开始一次页面访问时显示转场遮罩。
- `page:view`：新页面内容显示后执行隐藏逻辑。
- `visit:end`：访问流程结束后再次执行隐藏逻辑。

`page:view` 和 `visit:end` 都调用 `hideLoading()`，是为了在不同生命周期阶段执行遮罩清理。

## 三、问题二：首页没有 MetingJS，为什么还有播放器？

### 1. 页面现象

预期行为是：

- 归档页等配置了背景音乐的页面显示播放器。
- 首页等没有配置背景音乐的页面不显示播放器。

但是实际检查时，首页出现了播放器相关的 DOM 容器。

当时使用控制台检查：

```js
({
  player: !!document.querySelector('#bgm-player'),
  meting: !!document.querySelector('meting-js'),
  aplayer: !!document.querySelector('.aplayer')
});
```

返回结果：

```js
{
  player: true,
  meting: false,
  aplayer: false
}
```

这几个结果分别表示：

| 检查项 | 结果 | 含义 |
|---|---|---|
| `#bgm-player` | `true` | 播放器容器存在 |
| `meting-js` | `false` | 页面没有对应的自定义元素 |
| `.aplayer` | `false` | 当前检查时没有找到 APlayer 渲染出的 DOM |

需要注意：这组结果只能说明当时的 DOM 状态，不能单独证明 APlayer 实例已经初始化，也不能证明音乐正在播放。

### 2. 检查 MetingJS 初始化代码

当前的 `metingjs.ejs` 中，实际使用的是直接请求歌单数据，再创建 APlayer 实例的方式。

核心代码如下：

```js
var playlistId = '5068325488';

var apiUrl =
  'https://api.i-meto.com/meting/api?server=netease&type=playlist&id='
  + playlistId;

fetch(apiUrl)
  .then(function (res) {
    return res.json();
  })
  .then(function (songs) {

    var audio = songs.map(function (s) {
      return {
        name: s.title,
        artist: s.author,
        url: s.url,
        cover: s.pic,
        lrc: s.lrc
      };
    });

    window.bgmplayer = new APlayer({
      container: bgmContainer,
      fixed: true,
      autoplay: true,
      volume: 0.3,
      listFolded: true,
      audio: audio
    });

    window.bgmplayer.__testId = 'initial';

    console.log('APlayer 初始化成功');
  })
  .catch(function (err) {
    console.error('歌单加载失败', err);
  });
```

这里发现一个关键点：

**虽然代码加载了 MetingJS 的 JavaScript 文件，但实际播放器是通过 `new APlayer()` 创建的，并没有创建 `<meting-js>` 元素。**

所以不能通过：

```js
document.querySelector('meting-js')
```

来判断播放器是否启用。

更重要的是，需要检查：

```js
window.bgmplayer
```

它是否已经存在，以及 APlayer 是否真正完成初始化。

## 四、问题三：不同页面需要不同的播放器显示状态

### 1. 确定预期行为

经过排查，决定采用以下逻辑：

- 当前页面配置了背景音乐：显示播放器。
- 当前页面没有配置背景音乐：隐藏播放器。
- Swup 切换页面后：重新判断新页面是否需要显示播放器。

由于 `#bgm-player` 位于 `#swup-container` 外部，它不会随着页面内容替换自动消失，因此需要使用页面标记来判断当前页面的状态。

### 2. 在需要播放器的页面添加标记

以 `archive.ejs` 为例。

找到：

```ejs
<body>
<div id="swup-container">
    <div id="wrap">
```

修改为：

```ejs
<body>
<div id="swup-container">

    <div id="bgm-page-enabled" hidden></div>

    <div id="wrap">
```

这里的 `#bgm-page-enabled` 是一个标记：

- 存在：当前页面需要显示播放器。
- 不存在：当前页面不需要显示播放器。

首页如果不需要背景音乐，就不要添加这个标记。

注意：标记必须放在 `#swup-container` 内部。因为 Swup 会替换这个容器的内容，页面切换后才能根据新页面的标记重新判断。

### 3. 添加播放器显示控制函数

在原来的 Swup `if...else` 代码块结束之后，再添加以下代码：

```js
function updateBgmPageVisibility() {

  const player = document.querySelector('#bgm-player');

  if (!player) return;

  const enabled = !!document.querySelector('#bgm-page-enabled');

  player.style.display = enabled ? '' : 'none';

  console.log(
    '[BGM] 当前页面播放器：',
    enabled ? '显示' : '隐藏'
  );
}

updateBgmPageVisibility();

if (window.swupInstance) {

  window.swupInstance.hooks.on('page:view', function () {
    updateBgmPageVisibility();
  });

}
```

这里有一个容易出错的地方。

原来的代码是：

```js
if (window.swupInstance) {

  // Swup 相关代码

} else {

  console.error('[Swup] 未找到 Swup 实例');

}
```

新增代码必须放在这个完整结构之后，而不是放在 `if` 和 `else` 之间。

正确结构：

```js
if (window.swupInstance) {

  // 原来的 Swup 代码

} else {

  console.error('[Swup] 未找到 Swup 实例');

}

// 新增播放器控制代码放在这里
```

这样可以避免破坏原有的 JavaScript 条件判断结构。

## 五、目前发现的一个重要问题：脚本加载时机

进一步检查后，发现 `metingjs.ejs` 不只是播放器代码，还包含 Swup 初始化代码。

而当前归档页中通过以下方式引入：

```ejs
<%- partial('_partial/music/metingjs') %>
```

如果这个 partial 只在 `archive.ejs` 中引入，那么从首页通过 Swup 跳转到归档页时，需要特别注意：

**Swup 替换页面内容，并不等于浏览器重新执行新页面 HTML 中的所有脚本。**

因此，即使归档页包含播放器初始化代码，也不能直接假设从首页切换过去时，播放器初始化脚本一定会重新执行。

这可能是播放器在不同导航方式下表现不一致的原因之一。

### 后续建议的结构

如果希望播放器跨页面持续存在，同时又能根据页面配置决定显示或隐藏，可以考虑把结构调整为：

1. 将 `#bgm-player` 放在所有页面共用的布局中，并放在 `#swup-container` 外部。
2. 将 APlayer 初始化代码放在共用位置，只初始化一次。
3. 将 Swup 初始化代码也放在共用位置，避免重复初始化。
4. 每个页面只负责提供自己的 `#bgm-page-enabled` 标记。
5. 使用 Swup 的 `page:view` 钩子更新播放器显示状态。

不过，这一步还需要结合首页模板和 `_partial/after-footer.ejs` 的实际内容确认插入位置，不能直接盲目移动代码。

## 六、这次调试中总结出的经验

### 1. 先确认 DOM，再修改逻辑

遇到元素无法显示或隐藏时，先检查：

```js
document.querySelector('#cloudOverlay');
document.querySelector('#bgm-player');
document.querySelector('.aplayer');
```

确认元素是否存在，再判断是不是 CSS 或 JavaScript 的问题。

### 2. 区分播放器容器和播放器实例

以下三个概念并不相同：

- `#bgm-player`：播放器容器。
- `.aplayer`：APlayer 创建的 DOM。
- `window.bgmplayer`：JavaScript 中保存的 APlayer 实例。

不能只检查容器是否存在，就认为播放器已经初始化成功。

### 3. 注意 Swup 的页面替换范围

放在 `#swup-container` 外部的元素会保留。

这既是实现全站背景音乐的优势，也意味着需要手动管理它们在不同页面中的状态。

### 4. 不要把新增代码插入原有条件判断中间

添加代码时，尤其要注意 JavaScript 的大括号和 `if...else` 结构。

新增独立功能时，优先放在原有完整代码块之后，避免破坏原来的逻辑。

### 5. 每次只修改一个问题

这次调试中，云层遮罩和背景音乐两个功能存在交叉影响。

更稳妥的调试顺序应该是：

1. 单独确认云层遮罩能够正常显示和隐藏。
2. 单独确认 APlayer 能够正常初始化。
3. 确认 Swup 切换时不会重复初始化播放器。
4. 最后添加页面标记，实现不同页面的显示控制。

这样可以减少多个问题同时出现时的排查难度。

## 七、当前进度与待验证事项

目前已经梳理出播放器和云层遮罩的基本结构，但不能将所有问题都视为已经彻底解决。

接下来需要逐项验证：

- [ ] 云层遮罩能否在首次加载时正常显示和隐藏。
- [ ] Swup 页面切换时，`visit:start` 是否正常触发。
- [ ] `page:view` 是否在每次页面切换后触发。
- [ ] 首页是否确实没有 `#bgm-page-enabled` 标记。
- [ ] 归档页是否存在 `#bgm-page-enabled` 标记。
- [ ] `window.bgmplayer` 是否成功创建。
- [ ] 从首页进入归档页时，APlayer 是否能够正常初始化。
- [ ] 从归档页返回首页时，播放器是否按预期隐藏。
- [ ] 连续切换页面时，是否出现重复初始化或重复事件监听。

---

## 结语

这次问题看起来是一个简单的播放器显示问题，但实际上涉及了 DOM 结构、JavaScript 作用域、Swup 生命周期、APlayer 实例管理以及页面脚本加载时机。

最重要的收获是：

**在使用 Swup 实现局部页面切换时，不能完全按照传统的整页刷新思路处理 JavaScript。**

页面被替换，不代表所有脚本都会重新执行；页面元素被保留，也不代表它们的状态会自动适应新页面。

只有明确区分页面内容、全局元素和全局 JavaScript 实例，才能让页面转场与背景音乐稳定地协同工作。