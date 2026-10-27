(function($){
  // Search
  var $searchWrap = $('#search-form-wrap'),
    isSearchAnim = false,
    searchAnimDuration = 200;

  var startSearchAnim = function(){
    isSearchAnim = true;
  };

  var stopSearchAnim = function(callback){
    setTimeout(function(){
      isSearchAnim = false;
      callback && callback();
    }, searchAnimDuration);
  };

  $('.nav-search-btn').on('click', function(){
    if (isSearchAnim) return;

    startSearchAnim();
    $searchWrap.addClass('on');
    stopSearchAnim(function(){
      $('.search-form-input').focus();
    });
  });

  $('.search-form-input').on('blur', function(){
    startSearchAnim();
    $searchWrap.removeClass('on');
    stopSearchAnim();
  });

  // Share
  $('body').on('click', function(){
    $('.article-share-box.on').removeClass('on');
  }).on('click', '.article-share-link', function(e){
    e.stopPropagation();

    var $this = $(this),
      url = $this.attr('data-url'),
      encodedUrl = encodeURIComponent(url),
      id = 'article-share-box-' + $this.attr('data-id'),
      title = $this.attr('data-title'),
      offset = $this.offset();

    if ($('#' + id).length){
      var box = $('#' + id);

      if (box.hasClass('on')){
        box.removeClass('on');
        return;
      }
    } else {
      var html = [
        '<div id="' + id + '" class="article-share-box">',
          '<input class="article-share-input" value="' + url + '">',
          '<div class="article-share-links">',
            '<a href="https://twitter.com/intent/tweet?text=' + encodeURIComponent(title) + '&url=' + encodedUrl + '" class="article-share-twitter" target="_blank" title="Twitter"><span class="fa fa-twitter"></span></a>',
            '<a href="https://www.facebook.com/sharer.php?u=' + encodedUrl + '" class="article-share-facebook" target="_blank" title="Facebook"><span class="fa fa-facebook"></span></a>',
            '<a href="http://pinterest.com/pin/create/button/?url=' + encodedUrl + '" class="article-share-pinterest" target="_blank" title="Pinterest"><span class="fa fa-pinterest"></span></a>',
            '<a href="https://www.linkedin.com/shareArticle?mini=true&url=' + encodedUrl + '" class="article-share-linkedin" target="_blank" title="LinkedIn"><span class="fa fa-linkedin"></span></a>',
          '</div>',
        '</div>'
      ].join('');

      var box = $(html);

      $('body').append(box);
    }

    $('.article-share-box.on').hide();

    box.css({
      top: offset.top + 25,
      left: offset.left
    }).addClass('on');
  }).on('click', '.article-share-box', function(e){
    e.stopPropagation();
  }).on('click', '.article-share-box-input', function(){
    $(this).select();
  }).on('click', '.article-share-box-link', function(e){
    e.preventDefault();
    e.stopPropagation();

    window.open(this.href, 'article-share-box-window-' + Date.now(), 'width=500,height=450');
  });

  // Caption
  $('.article-entry').each(function(i){
    $(this).find('img').each(function(){
      if ($(this).parent().hasClass('fancybox') || $(this).parent().is('a')) return;

      var alt = this.alt;

      if (alt) $(this).after('<span class="caption">' + alt + '</span>');

      $(this).wrap('<a href="' + this.src + '" data-fancybox=\"gallery\" data-caption="' + alt + '"></a>')
    });

    $(this).find('.fancybox').each(function(){
      $(this).attr('rel', 'article' + i);
    });
  });

  if ($.fancybox){
    $('.fancybox').fancybox();
  }

  // Mobile nav
  var $container = $('#container'),
    isMobileNavAnim = false,
    mobileNavAnimDuration = 200;

  var startMobileNavAnim = function(){
    isMobileNavAnim = true;
  };

  var stopMobileNavAnim = function(){
    setTimeout(function(){
      isMobileNavAnim = false;
    }, mobileNavAnimDuration);
  }

  $('#main-nav-toggle').on('click', function(){
    if (isMobileNavAnim) return;

    startMobileNavAnim();
    $container.toggleClass('mobile-nav-on');
    stopMobileNavAnim();
  });

  $('#wrap').on('click', function(){
    if (isMobileNavAnim || !$container.hasClass('mobile-nav-on')) return;

    $container.removeClass('mobile-nav-on');
  });


  const overlay = document.getElementById('cloudOverlay');
  const COVER_DURATION = 600;   // 与 CSS transition 时长一致
  const FLAG_KEY = 'cloud-transition-entering';
  const LOAD_FLAG_KEY = 'cloud-load-shown';

  /* ================= 载入动画 ================= */

  /*
   * 页面一开始就显示载入云层（HTML 里先不加 is-active，
   * 在脚本里立即加上，避免无 JS 时遮罩永久挡住页面）。
   * 等 window.load 或超时后再散开。
   */
  function showLoading() {
    overlay.classList.add('mode-loading', 'is-active');
  }

  function hideLoading() {
    overlay.classList.remove('is-active');
    // 过渡结束后清理模式类，避免影响后续转场
    setTimeout(() => {
      overlay.classList.remove('mode-loading');
    }, COVER_DURATION);
  }

function finish() {
  // 如果当前是 was-active，先换成 is-active
  if (overlay.classList.contains('was-active')) {
    // 先把 transition 设为 none，移除 was-active
    overlay.style.transition = 'none';
    overlay.classList.remove('was-active');
    overlay.classList.add('is-active');
    // 强制重排，让“无过渡 + opacity:1”生效
    void overlay.offsetWidth;
    // 恢复过渡
    overlay.style.transition = '';
  } else if (!overlay.classList.contains('is-active')) {
    // 如果既不是 was-active 也不是 is-active，先加上 is-active 并强制瞬间生效
    overlay.style.transition = 'none';
    overlay.classList.add('is-active');
    void overlay.offsetWidth;
    overlay.style.transition = '';
  }

  // 此时云层一定是 is-active 且 opacity:1，过渡已恢复
  // 下一帧移除 is-active，触发淡出
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      overlay.classList.remove('is-active');
    });
  });
}
function existLoading() {
  if (!overlay) return;

  // 1. 先加 was-active：瞬间盖住，无动画
  overlay.classList.add('was-active');

  // 2. 加载完成后，把 was-active 换成 is-active
  //    先移除 was-active，再加 is-active，让过渡接管
  function finish() {
    // 移除无过渡状态
    overlay.classList.remove('was-active');
    // 强制重排，确保浏览器已经应用了“移除 was-active 后回到基础状态”的样式
    void overlay.offsetWidth;
    // 加 is-active：此时基础状态是 opacity:0，is-active 是 opacity:1，
    // 过渡恢复，但这里我们是要“保持盖住”而不是淡入
    // 所以更稳妥的做法是直接切到 is-active 后立刻准备淡出
    overlay.classList.add('is-active');

    // 下一帧再移除 is-active，触发淡出
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        overlay.classList.remove('is-active');
      });
    });
  }

  if (document.readyState === 'complete') {
    finish();
  } else {
    window.addEventListener('load', finish);
    setTimeout(finish, 6000); // 兜底
  }
}



// 页面打开时调用
existLoading();
  // 页面资源加载完成后淡出载入层
if (document.readyState === 'complete') {
  finishLoading();
} else {
  window.addEventListener('load', finishLoading);
  setTimeout(finishLoading, 6000);
}
  // 用 load 事件保证图片、字体等也就绪；同时加一个最大等待时间兜底
  let loadingHidden = false;
function finishLoading() {
  // console.log('finishLoading called', document.readyState);
  // 1. 移除 is-loading，恢复过渡
  document.body.classList.remove('is-loading');

  // 2. 等一帧，确保“过渡恢复”已生效（此时云层仍是 is-active，opacity:1）
  requestAnimationFrame(() => {
    // 3. 再等一帧，确保浏览器已经用“带过渡”的样式重新计算过
    requestAnimationFrame(() => {
      // 4. 移除 is-active，opacity 1→0，淡出触发
      overlay.classList.remove('is-active');
    });
  });
}
  if (document.readyState === 'complete') {
    // 如果脚本执行时页面已经加载完（缓存等极端情况）
    finishLoading();
  } else {
    window.addEventListener('load', finishLoading);
    // 兜底：最多等 6 秒，避免某个资源卡住导致云层一直不散
    setTimeout(finishLoading, 6000);
  }

  /* ================= 转场动画 ================= */

  function navigateWithCloud(url) {
    // 切换为转场模式文案
    overlay.classList.remove('mode-loading');
    overlay.classList.add('mode-navigating', 'is-active');
    sessionStorage.setItem(FLAG_KEY, '1');
    setTimeout(() => {
      window.location.href = url;
    }, COVER_DURATION);
  }

  // 事件委托：统一处理所有链接
  document.addEventListener('click', (e) => {
    if (e.ctrlKey || e.metaKey || e.shiftKey || e.altKey || e.button !== 0) return;

    const link = e.target.closest('a');
    if (!link) return;

    if (link.target === '_blank') return;
    if (link.hasAttribute('download')) return;
    if (link.hasAttribute('data-no-transition')) return;

    const href = link.getAttribute('href');
    if (!href || href.startsWith('#')) return;
    if (href.startsWith('javascript:')) return;

    let url;
    try {
      url = new URL(link.href, location.href);
    } catch {
      return;
    }
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return;

    e.preventDefault();
    navigateWithCloud(link.href);
  });

  /*
   * 新页面加载后的"云散开"：
   * 如果是从转场跳转过来的，载入层已经被上面的 showLoading 打开了，
   * 这里只需要在 load 完成后淡出即可，和载入动画自然衔接。
   *
   * 所以不需要额外逻辑——转场标记会在页面加载时被载入动画覆盖掉，
   * 用户看到的就是"云盖着 → 新页面加载中 → 云散开"的连续过程。
   * 清理标记，避免刷新时误触发。
   */
  if (sessionStorage.getItem(FLAG_KEY) === '1') {
    sessionStorage.removeItem(FLAG_KEY);
    // 标记仅用于说明"本页是转场来的"，载入动画已经覆盖了视觉表现
  }

  function resetOverlay() {
  const overlay = document.getElementById('cloudOverlay');
  if (overlay) {
    overlay.classList.remove('is-active', 'was-active', 'mode-loading', 'mode-navigating');
  }
  document.body.classList.remove('is-loading');
  const content = document.getElementById('content');
  if (content) content.classList.remove('is-leaving');
}

// 从 bfcache 恢复时复位
window.addEventListener('pageshow', (e) => {
  if (e.persisted) resetOverlay();
});

// 离开前复位，避免缓存了“盖住”状态
window.addEventListener('pagehide', () => {
  resetOverlay();
});



})(jQuery);