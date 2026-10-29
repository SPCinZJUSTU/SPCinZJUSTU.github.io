---
title: hexo 自定义 blog homepage 的实现
date: 2026-10-26
---

在多个 AI（主要是 dpsk）的帮助下，把 hexo 模板的主页换了。

主要就是 `layout/layout.ejs` 直接搬空变成 `<%- body %>`，然后复制到其他的 ejs 中。
然后自定义 `index.ejs` 为自己想要的主界面。

CSS 单独写在 `index.ejs` 里，`<%- css('css/style') %>` 是原来的 css，在后面添加新的 css 可以覆盖掉原来的。
然后就是一些素材调用，主题的素材文件在 `source/css/images` 里。要在 `_config.yml` 中命名一下，然后在 `_variable` 里 url 变量名。

Hexo 的结构就是通过 `layout.ejs` 合成模板，然后 `<%- body %>` 导向以 layout 属性为文件名的 ejs 然后整合起来。CSS 是直接合成没有导向，所以如果要自己单独设计不一样的 css 可以塞在 ejs 里。

---

# 关于Hexo 模板与dpsk对话记录

## 问题一：`<%- body %>` 在 EJS 中有定义还是 Hexo 自己的定义

> `<%- body %>` 中的 `body` 变量是 **Hexo 自己定义的**，而 `<%- %>` 这个标签语法则是 **EJS 本身提供的**。

>**🤖 Dpsk：**1. **`<%- %>` 是 EJS 语法**：在 EJS 模板引擎中，`<%-` 是一个"非转义输出"标签，用于将变量的原始值直接输出到页面中，不进行 HTML 转义。这是 EJS 的标准功能。
2. **`body` 变量是 Hexo 的约定**：Hexo 使用 EJS 作为模板引擎之一。在 Hexo 的"布局"（Layout）机制中，`body` 是一个特殊的局部变量。Hexo 在渲染时会自动将具体页面的内容注入到这个变量里，你需要在布局文件中使用 `<%- body %>` 来显示这些内容。Hexo 官方文档明确说明："一个布局文件必须要能显示 `body` 变量的内容，如此一来模板的内容才会被显示。"
所以，你看到的这行代码，是 **Hexo 利用 EJS 的语法，来输出它自己内部定义的 `body` 变量**。


p.s. 简单来说就是在复制了layout.ejs后将layout.ejs中的```ejs<section id="main"><%- body %></section>```替换成 xxx.ejs 中的内容```ejs<section id="main"><%- partial('_partial/article', {post: page, index: false}) %></section>```

---

## 问题二：Hexo CSS / Stylus 合成规则

>**🤖 Dpsk：Hexo 本身并没有一个全局的、强制性的"CSS/Stylus 合成规则"。实际上，最终的合成效果完全取决于**你所使用的主题是如何编写其 `main.styl`（或类似入口文件）的**。Hexo 只提供了基础的 Stylus 渲染能力，而具体的文件合并与导入顺序，是由主题作者在 Stylus 代码中通过 `@import` 指令和逻辑判断来决定的。
**核心机制：渲染器只负责编译，不负责组织**
Hexo 官方通过 `hexo-renderer-stylus` 插件将 `.styl` 文件编译为 `.css`。这个渲染器提供了 `stylus:renderer` 过滤器，允许开发者在编译前注入变量或插件（如 `nib`），但它**不会**自动去扫描并合并你所有的 Stylus 文件。
真正把零散的 `.styl` 文件"合成"一个 CSS 文件的，是主题源码里的那个入口文件（通常叫 `main.styl`）。它利用 Stylus 的 `@import` 语法，按特定顺序将变量、混入、基础样式、组件样式等拉进来，最终编译成一个完整的 CSS。
**不同主题的合成逻辑（举例）**
由于规则由主题决定，不同主题的做法差异很大：
**NexT 主题（旧版/经典结构）**：它的 `main.styl` 会定义变量 `$variables` 和 `$mixins`，然后通过循环导入 `_variables/` 和 `_mixins/` 下的文件。最关键的一步是在文件末尾导入 `_custom/custom.styl`，利用 CSS 的层叠特性，让自定义样式能够覆盖前面的默认样式。
**Fluid 主题**：它遵循更严格的分层导入，顺序通常是：变量 → 函数/混入 → 页面特定样式 → 用户注入点。它还支持在特定阶段（如 `injects.style`）插入用户自定义的 Stylus 文件，从而精确控制编译顺序。
**Butterfly 主题**：除了常规的 Stylus 导入，它还通过 `stylus:renderer` 过滤器，将 Hexo 根目录 `_config.yml` 里的配置（如代码高亮设置、语言）转换成 Stylus 变量，注入到编译作用域中，供样式文件使用。
如果你想改变样式的合并方式，通常有以下两种路径：
1.**修改主题的 `main.styl`**：这是最直接的方式。你可以调整 `@import` 的顺序，或者添加新的导入行来引入你自己的 `.styl` 文件。不过，直接修改主题源文件在主题更新时可能会被覆盖，需要留意。
2.**利用主题提供的扩展点**：许多成熟主题都预留了"自定义样式"入口（如 NexT 的 `_custom/` 目录，或 Fluid 的 `injects` 配置）。把你自己的 Stylus 代码写在这些指定位置，主题的入口文件会自动把它合并进去，且通常放在最后以保证优先级。
另外，如果你不想用 Stylus，也可以安装 `hexo-plugin-css-compactor` 这类插件，在生成阶段对**已经生成的 CSS 文件**进行合并、压缩和去重，但这属于后处理，和 Stylus 源码的组织是两回事。

---

## 问题三：如何根据不同 layout 合成不同的 CSS 文件

>**🤖 Dpsk：在 Hexo 中，并没有一个内置的"根据 layout 自动合成不同 CSS 文件"的开关。标准的构建流程是：所有 Stylus/CSS 源文件最终编译并合并成**一个**主样式文件（如 `main.css`）。要实现"不同 layout 使用不同 CSS"，通常不是在编译阶段生成多个独立的 CSS 文件，而是在**模板渲染阶段**，根据当前页面的 layout 类型，有条件地加载不同的样式表，或者给 `<body>` 添加特定的类名来触发差异化样式。
**方案一：在布局模板中条件加载 CSS（最直接**
这是最符合你字面需求的做法。在你主题的 `layout.ejs`（或基础模板）的 `<head>` 区域，利用 EJS 的逻辑判断或 Hexo 的 Helper 函数，根据当前页面的类型引入不同的 `<link>` 标签。
例如，你可以判断当前是否为文章页或独立页面：
```ejs
<% if (is_post()) { %>
  <link rel="stylesheet" href="/css/post-styles.css">
<% } else if (is_page()) { %>
  <link rel="stylesheet" href="/css/page-styles.css">
<% } else { %>
  <link rel="stylesheet" href="/css/default-styles.css">
<% } %>