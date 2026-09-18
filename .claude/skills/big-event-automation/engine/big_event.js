/* 4XR 대형 기획전 (공통 기능) — 게시글에서 settings 파일(window.BF_EVENT)을 먼저 불러온 뒤 이 파일을 불러온다.
   섹션 틀(HTML)이 없는 섹션은 그냥 건너뛴다(빈 구좌는 만들지 않는다). */
(function(){
  'use strict';

  /* 설정 : 게시글이 먼저 불러온 settings 파일(window.BF_EVENT). 날짜는 글자로 와도 된다 */
  const BF_EVENT = window.BF_EVENT || {};
  const BF_IMG = BF_EVENT.img || '';
  const BF_CONFIG = BF_EVENT.config || {};
  const BF_RELATED_GOODS_BUTTON = BF_EVENT.relatedButton || {};
  const BF_COUPON = BF_EVENT.coupon || {};
  const BF_GIFT_ITEMS = BF_EVENT.gift || [];
  const BF_LUCKYBAG = BF_EVENT.luckybag || {};
  const BF_NOTICE_MODALS = BF_EVENT.noticeModals || [];
  const BF_PRIZE_MODAL = BF_EVENT.prizeModal || {};
  const BF_WINNER_MODAL = BF_EVENT.winnerModal || {};
  const BF_LOTTO_UI = BF_EVENT.lottoUi || {};
  const BF_COMMENT = BF_EVENT.comment || {};
  const BF_MEMBERSHIP = BF_EVENT.membership || {};
  const BF_QUICK = BF_EVENT.quick || {};
  const BF_TITLE_IMG = BF_EVENT.titleImg || {};
  const BF_DAILY_VISUAL = BF_EVENT.dailyVisual || {};
  const BF_DAILY_DATA = BF_EVENT.dailyData || {};
  BF_CONFIG.eventStart = new Date(BF_CONFIG.eventStart);
  BF_CONFIG.eventEnd = new Date(BF_CONFIG.eventEnd);

  /* 공통 */
  const BF_PRODUCT_CACHE = new Map();
  const BF_RANKING_STATE = {allItems:[], items:[], page:1};

  function isMobileView(){return !!(window.matchMedia && window.matchMedia('(max-width:768px)').matches);}
  function getRankingPageSize(){return isMobileView() ? 12 : 10;}

  function qs(selector, scope){return (scope || document).querySelector(selector);}
  function qsa(selector, scope){return Array.from((scope || document).querySelectorAll(selector));}
  function cleanText(value){return (value || '').replace(/\s+/g, ' ').trim();}
  function pad(num){return String(num).padStart(2, '0');}
  function text(el, selector){const node = selector ? qs(selector, el) : el; return node ? cleanText(node.textContent) : '';}
  function retryUntil(fn, ms, count){
    if(fn()) return;
    let tries = 0;
    const timer = window.setInterval(() => { tries += 1; if(fn() || tries >= count) window.clearInterval(timer); }, ms);
  }
  function escapeHtml(value){return String(value || '').replace(/[&<>"]/g, ch => ({'&':'\u0026amp;', '<':'\u0026lt;', '>':'\u0026gt;', '"':'\u0026quot;'}[ch]));}
  function escapeAttr(value){return escapeHtml(value).replace(/'/g, '\u0026#39;');}
  function absUrl(value, base){
    if(!value) return '';
    const clean = String(value).trim();
    if(!clean || clean === '#') return '';
    try {return new URL(clean, base || location.origin).href;} catch(e){return clean;}
  }
  function metaContent(doc, selector){return cleanText(qs(selector, doc)?.getAttribute('content'));}
  function pickText(el, selectors){
    for(const selector of selectors){const value = text(el, selector); if(value) return value;}
    return '';
  }
  function pickAttr(el, selectors, attrs){
    for(const selector of selectors){
      const node = qs(selector, el);
      if(!node) continue;
      for(const name of attrs){const value = node.getAttribute(name); if(value && value.trim()) return value.trim();}
    }
    return '';
  }
  function formatPrice(value){
    const source = cleanText(value);
    if(!source) return '';
    if(source.indexOf('원') > -1) return source.replace(/\s*원$/, '원');
    const numberOnly = source.replace(/[^\d]/g, '');
    return numberOnly ? Number(numberOnly).toLocaleString() + '원' : source;
  }
  function discountPrice(original, rate){return Math.round(Number(original || 0) * (100 - Number(rate || 0)) / 100);}

  /* 날짜/시간 */
  /* 대한민국 시간(KST) 기준
     - 선착순 자동 쿠폰: 매일 10:00 갱신
     - 데일리 상품 영역: 매일 00:00 갱신 */
  function getKstShiftDate(date){return new Date(date.getTime() + 9 * 60 * 60 * 1000);}
  function ymdFromKstShift(shifted){return shifted.getUTCFullYear() + '-' + pad(shifted.getUTCMonth() + 1) + '-' + pad(shifted.getUTCDate());}
  function getKstDateKey(date){return ymdFromKstShift(getKstShiftDate(date));}
  function getKstShiftedSaleDate(now, openHour){
    const shifted = getKstShiftDate(now);
    const hour = Number(openHour);
    if(Number.isFinite(hour) && shifted.getUTCHours() < hour) shifted.setUTCDate(shifted.getUTCDate() - 1);
    return ymdFromKstShift(shifted);
  }
  function getCouponSaleDate(now){return getKstShiftedSaleDate(now, BF_CONFIG.couponOpenHour ?? BF_CONFIG.openHour ?? 10);}
  function getDailySaleDate(now){return getKstDateKey(now);}
  function getKstDateRangeByHour(dateKey, openHour, options){
    const hour = Number(openHour) || 0;
    const start = new Date(dateKey + 'T' + pad(hour) + ':00:00+09:00');
    const defaultEnd = new Date(start.getTime() + 24 * 60 * 60 * 1000 - 1000);
    const shouldClampToEventEnd = !(options && options.noEventEndClamp);
    const end = shouldClampToEventEnd && defaultEnd.getTime() > BF_CONFIG.eventEnd.getTime() ? BF_CONFIG.eventEnd : defaultEnd;
    return {start, end};
  }
  function getCouponDateRange(dateKey){return getKstDateRangeByHour(dateKey, BF_CONFIG.couponOpenHour ?? BF_CONFIG.openHour ?? 10, {noEventEndClamp:true});}
  function getDailyDateRange(dateKey){return getKstDateRangeByHour(dateKey, BF_CONFIG.dailyOpenHour ?? 0);}
  function formatCountdown(diff){
    const d = Math.floor(diff / 86400000);
    const h = Math.floor((diff % 86400000) / 3600000);
    const m = Math.floor((diff % 3600000) / 60000);
    const s = Math.floor((diff % 60000) / 1000);
    return {d, h, m, s};
  }

  /* HTML 관리 요소 */
  function renderVisualImages(){
    const visual = BF_CONFIG.visual || {};
    const effect = visual.effect || 'fade_up';
    const visualItems = [
      {selector:'.visual_img_pc', set:visual.pc},
      {selector:'.visual_img_m', set:visual.mobile}
    ];

    visualItems.forEach(item => {
      const wrap = qs(item.selector);
      if(!wrap || !item.set || !item.set.bg) return;
      const layers = (item.set.layers || []).map((layer, index) =>
        `<img class="visual_layer fxl_${escapeAttr(layer.effect || effect)}" src="${escapeAttr(layer.src)}" alt="${escapeAttr(layer.alt || '')}"
          style="left:${layer.left}%; top:${layer.top}%; width:${layer.width}%; --bf-visual-order:${index};">`).join('');
      wrap.innerHTML = `<img class="visual_bg" src="${escapeAttr(item.set.bg)}" alt="${escapeAttr(visual.alt || '')}">${layers}`;
    });

    function startVisual(wrap){
      if(!wrap || wrap.classList.contains('is_in')) return;
      wrap.classList.add('is_in');
    }
    visualItems.forEach(item => {
      const wrap = qs(item.selector);
      if(!wrap) return;
      const bg = qs('.visual_bg', wrap);
      if(!bg) return;
      if(bg.complete) setTimeout(() => startVisual(wrap), 120);
      else {
        bg.addEventListener('load', () => setTimeout(() => startVisual(wrap), 120));
        bg.addEventListener('error', () => startVisual(wrap));
      }
      setTimeout(() => startVisual(wrap), 2600);
    });
  }

  /* gift_section */
  function renderGiftSection(){
    const grid = qs('#black_fry_gift_grid');
    if(!grid) return;
    grid.innerHTML = BF_GIFT_ITEMS.map((item, index) => {
      const salePrice = discountPrice(item.originalPrice, item.discountRate);
      const hintText = item.hint || (item.title + ' 구매하기');
      return `<div class="gift_item" style="--bf-gift-order:${index};">
        <a href="${escapeAttr(item.href)}" class="gift_card bf_gift_purchase_hint_target" target="_blank" aria-label="${escapeAttr(hintText)}">
          <div class="gift_visual_wrap">
            <div class="gift_visual_inner">
              <img src="${escapeAttr(item.image)}" alt="${escapeAttr(item.title + ' 이미지')}">
            </div>
          </div>
          <span class="bf_gift_purchase_hint_text">${escapeHtml(hintText)}</span>
        </a>
        <div class="gift_price_box">
          <div class="gift_sale_row">
            <h5 class="gift_original_price">${Number(item.originalPrice).toLocaleString()}원</h5>
            <h4 class="gift_sale_price">${salePrice.toLocaleString()}원</h4>
            <h6 class="gift_discount_rate">${Number(item.discountRate)}%</h6>
          </div>
        </div>
      </div>`;
    }).join('');
  }

  /* lotto_section */
  function renderLottoSection(){
    const prizeActions = qs('#black_fry_lotto_prize_actions');
    const flowSupport = qs('#black_fry_lotto_flow_support');
    const actionRow = qs('#black_fry_lotto_action_row');

    if(prizeActions){
      prizeActions.innerHTML = `<button class="prize_hint_btn" data-bf-modal="${escapeAttr(BF_LOTTO_UI.prizeModalId)}" type="button" aria-label="${escapeAttr(BF_LOTTO_UI.prizeIconLabel)}"></button>
        <button class="notice_open_btn prize_hint_text" data-bf-modal="${escapeAttr(BF_LOTTO_UI.prizeModalId)}" type="button">${escapeHtml(BF_LOTTO_UI.prizeButtonText)}</button>`;
    }

    if(flowSupport){
      flowSupport.innerHTML = `<div class="lotto-flow-mustread"><h5>${BF_LOTTO_UI.flowHtml}</h5></div>
        <p class="lotto_entry_count is_pc" hidden></p>
        <div id="winnerButtonWrap" hidden>
          <button class="btn-winner" data-bf-modal="${escapeAttr(BF_LOTTO_UI.winnerModalId)}" id="black_fry_show_winner_btn" type="button">${escapeHtml(BF_LOTTO_UI.winnerButtonText)}</button>
        </div>`;
    }

    if(actionRow){
      actionRow.innerHTML = `<div class="lotto_controls">
          ${BF_LOTTO_UI.buttons.map(btn => `<button class="lotto_btn ${btn.extraClass ? escapeAttr(btn.extraClass) + ' ' : ''}bf_lotto_hint_btn" id="${escapeAttr(btn.id)}" type="button" data-bf-lotto-hint="${escapeAttr(btn.hint)}">${escapeHtml(btn.label)}</button>`).join('')}
        </div>
        <div class="lotto_notice_line">
          <button class="notice_open_btn" data-bf-modal="${escapeAttr(BF_LOTTO_UI.noticeModalId)}" type="button">유의사항 +</button>
        </div>`;
    }
  }

  function renderMembershipSection(){
    const box = qs('#black_fry_membership_box');
    const pcMoreBtn = qs('#black_fry_membership_more_pc');

    if(pcMoreBtn){
      pcMoreBtn.href = BF_MEMBERSHIP.moreHref;
      pcMoreBtn.textContent = BF_MEMBERSHIP.moreLabel;
    }

    if(!box) return;

    const cards = BF_MEMBERSHIP.items.map((item, index) => `<a class="membership_card" href="${escapeAttr(item.href)}" target="_blank" rel="noopener" style="--bf-membership-order:${index};">
        <div class="membership_card_head">
          <span class="membership_icon membership_icon_${escapeAttr(item.icon)}" aria-hidden="true"></span>
          <h4>${escapeHtml(item.title)}</h4>
        </div>
        <h5 class="membership_desc">${escapeHtml(item.desc)}</h5>
      </a>`).join('');

    box.innerHTML = `<div class="membership_grid">${cards}</div>
      <a class="membership_join_btn membership_join_btn_mo" href="${escapeAttr(BF_MEMBERSHIP.moreHref)}" target="_blank" rel="noopener">${escapeHtml(BF_MEMBERSHIP.moreLabel)}</a>`;
  }

  function luckybagButtonTemplate(btn, index, isAllSoldout, soldoutText){
    const buttonSoldout = isAllSoldout || !!btn.soldout;
    const buttonSoldoutText = btn.soldoutText || soldoutText || 'SOLD OUT';
    const orderStyle = `--bf-luckybag-btn-order:${index};`;
    const labelHtml = `<span class="luckybag_btn_label">${escapeHtml(btn.label)}</span>`;

    if(buttonSoldout){
      return `<span class="luckybag_buy_btn is_soldout" role="button" aria-disabled="true" aria-label="${escapeAttr(buttonSoldoutText)}" style="${orderStyle}">${labelHtml}</span>`;
    }

    return `<a class="luckybag_buy_btn" href="${escapeAttr(btn.href)}" target="_blank" rel="noopener" style="${orderStyle}">${labelHtml}</a>`;
  }

  function luckybagProductNumber(){
    const from = (BF_LUCKYBAG.buttons && BF_LUCKYBAG.buttons[0] && BF_LUCKYBAG.buttons[0].href) || BF_LUCKYBAG.href || '';
    const m = String(from).match(/index_no=(\d+)/);
    return m ? m[1] : '';
  }
  async function checkLuckybagSoldout(){
    if(BF_LUCKYBAG.soldout !== 'auto') return;     /* true/false 로 적어 뒀으면 그 값을 그대로 쓴다 */
    if(!/(^|\.)4xr\.co\.kr$/i.test(location.hostname)){
      console.info('[4XR] 럭키백 품절 자동 판단은 몰(4xr.co.kr) 안에서만 됩니다. 지금은 ' +
        (location.hostname || '로컬 파일') + ' 이라 건너뜁니다. 확인용으로 보려면 BF_LUCKYBAG.soldout 을 true 로 두세요.');
      return;
    }
    const number = luckybagProductNumber();
    if(!number) return;
    try{
      const info = await fetchProductInfo(number);
      if(!info || !info.soldout) return;
      BF_LUCKYBAG.soldout = true;
      renderLuckybagSection();
    }catch(e){
      console.info('[4XR] 럭키백 상품 페이지를 읽지 못했습니다.', e);
    }
  }

  function renderLuckybagSection(){
    const price = qs('#black_fry_luckybag_price');
    const area = qs('#black_fry_luckybag_area');
    const imageHint = BF_LUCKYBAG.imageHint || '럭키백 구매하기';
    const isSoldout = BF_LUCKYBAG.soldout === true;
    const soldoutText = BF_LUCKYBAG.soldoutText || 'SOLD OUT';
    const imageOpenTag = isSoldout
      ? `<div class="luckybag_image_wrap bf_luckybag_purchase_hint_target is_soldout" id="black_fry_luckybag_box" aria-label="${escapeAttr(soldoutText)}" aria-disabled="true">`
      : `<a href="${escapeAttr(BF_LUCKYBAG.href)}" class="luckybag_image_wrap bf_luckybag_purchase_hint_target" id="black_fry_luckybag_box" target="_blank" rel="noopener" aria-label="${escapeAttr(imageHint)}">`;
    const imageCloseTag = isSoldout ? '</div>' : '</a>';
    if(price) price.textContent = BF_LUCKYBAG.priceText;
    if(!area) return;
    const stage = BF_LUCKYBAG.stage;
    const stageHtml = stage ? `<div class="luckybag_stage" style="--lb-stage-h:${stage.height || 800};">
          <div class="lb_frame">
            ${(stage.layers || []).map(layer => `<img class="lb_layer fxl_${escapeAttr(layer.effect || 'fade_up')}" src="${escapeAttr(layer.src)}" alt="${escapeAttr(layer.alt || '')}"
              style="left:${layer.left}%; top:${layer.top}%; width:${layer.width}%; --bf-lb-order:${layer.order || 0};">`).join('')}
            <img class="lb_base fxl_${escapeAttr(stage.base.effect || 'drop')}" src="${escapeAttr(stage.base.src)}" alt="${escapeAttr(stage.base.alt || BF_LUCKYBAG.alt)}"
              style="--bf-lb-order:${stage.base.order || 0};">
          </div>
        </div>`
      : `<img src="${escapeAttr(BF_LUCKYBAG.image)}" alt="${escapeAttr(BF_LUCKYBAG.alt)}" loading="lazy" decoding="async">`;
    area.innerHTML = `${imageOpenTag}
        <div class="luckybag_image_inner">${stageHtml}</div>
        <div class="soldout_overlay">${escapeHtml(soldoutText)}</div>
        ${isSoldout ? '' : `<span class="bf_luckybag_purchase_hint_text">${escapeHtml(imageHint)}</span>`}
      ${imageCloseTag}
      <div class="luckybag_buy_btns">
        ${BF_LUCKYBAG.buttons.map((btn, index) => luckybagButtonTemplate(btn, index, isSoldout, soldoutText)).join('')}
      </div>`;
  }
  function modalShell(modal, inner, contentClass){
    return `<div class="bf_modal" id="${escapeAttr(modal.id)}" role="dialog" aria-modal="true" aria-labelledby="${escapeAttr(modal.id)}_title">
      <div class="bf_modal_content${contentClass ? ' ' + contentClass : ''}">
        <button type="button" class="bf_modal_close" data-bf-close aria-label="닫기">×</button>
        ${inner}
      </div>
    </div>`;
  }

  function noticeModalTemplate(modal){
    return modalShell(modal, `<h2 class="bf_modal_title" id="${escapeAttr(modal.id)}_title">${escapeHtml(modal.title)}</h2>
        <ul class="bf_modal_list">${modal.items.map(item => `<li>${item}</li>`).join('')}</ul>`);
  }

  function prizeModalTemplate(modal){
    return modalShell(modal, `<div class="prize_body">
          <h2 class="prize_cap" id="${escapeAttr(modal.id)}_title">${escapeHtml(modal.title)}</h2>
          <strong class="prize_amount"><span class="bf_countup">${escapeHtml(modal.reward)}</span>${modal.rewardUnit ? `<i>${escapeHtml(modal.rewardUnit)}</i>` : ''}</strong>
        </div>
        <div class="prize_bar"><p>${escapeHtml(modal.notice)}</p></div>`);
  }

  function winnerModalTemplate(modal){
    const numbers = Array.from({length:6}, (_, index) => (modal.winningNumbers && modal.winningNumbers[index]) ? String(modal.winningNumbers[index]) : '');
    const numberValues = numbers.map((value, index) => `<span class="winner_number_value" aria-label="당첨 번호 ${index + 1}">${escapeHtml(value || '-')}</span>`).join('');
    return modalShell(modal, `<h2 class="bf_modal_title winner_modal_title" id="${escapeAttr(modal.id)}_title">${escapeHtml(modal.title)}</h2>
        <video id="black_fry_winner_video" controls muted playsinline preload="metadata">
          <source src="${escapeAttr(modal.video)}" type="video/mp4">
        </video>
        <div class="winner_numbers_box" aria-label="당첨 번호 표시 영역">
          <h4 class="winner_numbers_label">당첨 번호 :</h4>
          <div class="winner_numbers_values" aria-live="polite">${numberValues}</div>
        </div>`, 'winner_modal_content');
  }

  function renderModals(){
    const root = qs('#black_fry_modal_root');
    if(!root) return;
    root.innerHTML = BF_NOTICE_MODALS.map(noticeModalTemplate).join('') + prizeModalTemplate(BF_PRIZE_MODAL) + winnerModalTemplate(BF_WINNER_MODAL);
  }

  function syncWinnerButtonWrap(){
    const wrap = qs('#winnerButtonWrap');
    if(!wrap) return;
    const canShowWinner = !!(BF_WINNER_MODAL && BF_WINNER_MODAL.released && BF_WINNER_MODAL.video);
    wrap.hidden = !canShowWinner;
  }

  function renderManagedContent(){
    renderVisualImages();
    renderLottoSection();
    renderGiftSection();
    renderLuckybagSection();
    checkLuckybagSoldout();
    renderMembershipSection();
    renderDailyVisuals();
    renderTitleImages();
    renderQuickSection();
    renderModals();
    syncWinnerButtonWrap();
  }

/* -------- 기능 영역 -------- */
  /* 메인 타이머 */
  function initMainTimer(){
    const timer = qs('#black_fry_main_timer');
    const label = qs('#black_fry_time_label');
    const section = qs('#time_section');
    if(!timer || !label) return;

    function setTimerText(value){
      timer.textContent = String(value || '');
    }

    function setTimeState(state){
      if(!section) return;
      section.classList.toggle('is_deadline_day', state === 'deadline');
      section.classList.toggle('is_closed', state === 'closed');
    }

    function update(){
      const now = new Date();
      let target = BF_CONFIG.eventEnd;

      if(now < BF_CONFIG.eventStart){
        label.textContent = 'UP TO 76% 시작까지';
        setTimeState('normal');
        target = BF_CONFIG.eventStart;
      } else if(now > BF_CONFIG.eventEnd){
        label.textContent = '이벤트 종료';
        setTimeState('closed');
        setTimerText('CLOSED');
        return;
      } else {
        label.textContent = 'UP TO 76% 종료까지';
        setTimeState(getKstDateKey(now) === getKstDateKey(BF_CONFIG.eventEnd) ? 'deadline' : 'normal');
      }

      const time = formatCountdown(Math.max(0, target.getTime() - now.getTime()));
      setTimerText(`${pad(time.d)}:${pad(time.h)}:${pad(time.m)}:${pad(time.s)}`);
    }
    update();
    setInterval(update, 1000);
  }

  /* 모달 */
  function closeModal(modal){if(!modal) return; modal.classList.remove('is_active'); qsa('video', modal).forEach(video => {try{video.pause(); video.currentTime = 0;}catch(e){}});}
  function closeActiveModals(){qsa('.bf_modal.is_active').forEach(closeModal);}
  function initModals(){
    document.addEventListener('click', function(e){
      const openBtn = e.target.closest('[data-bf-modal]');
      const closeBtn = e.target.closest('[data-bf-close]');
      if(openBtn){
        e.preventDefault();
        const modal = qs('#' + openBtn.getAttribute('data-bf-modal'));
        if(modal){modal.classList.add('is_active'); runCountUp(modal);}
      }
      if(closeBtn){
        e.preventDefault();
        closeModal(closeBtn.closest('.bf_modal'));
      }
      if(e.target.classList && e.target.classList.contains('bf_modal')) closeModal(e.target);
    });
    document.addEventListener('keydown', function(e){if(e.key === 'Escape') closeActiveModals();});
  }

  function scrollToSection(target, offset){
    let tries = 0;
    const aim = () => {
      if(!target || tries >= 10) return;
      const top = target.getBoundingClientRect().top;
      if(Math.abs(top - offset) <= 4) return;
      window.scrollTo({top:top + window.pageYOffset - offset, behavior:'smooth'});
      tries += 1;
      window.setTimeout(aim, 220);
    };
    aim();
  }

  /* 금액 카운트업 */
  function countUpEl(el){
    if(!el || el.dataset.bfCounted === '1') return;
    const m = String(el.textContent || '').trim().match(/^([^0-9]*)([0-9,]+)([\s\S]*)$/);
    if(!m) return;
    const target = Number(m[2].replace(/,/g, ''));
    if(!isFinite(target) || target <= 0) return;
    el.dataset.bfCounted = '1';
    if(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const pre = m[1], post = m[3], dur = 900, t0 = performance.now();
    const step = now => {
      const p = Math.min(1, (now - t0) / dur);
      const eased = 1 - Math.pow(1 - p, 3);
      el.textContent = pre + Math.round(target * eased).toLocaleString() + post;
      if(p < 1) window.requestAnimationFrame(step);
    };
    el.textContent = pre + '0' + post;
    window.requestAnimationFrame(step);
  }
  function runCountUp(scope){qsa('.bf_countup', scope || document).forEach(countUpEl);}
  function quickCopy(pc, mo){
    const a = escapeHtml(pc || '');
    if(!mo) return a;
    return `<span class="bf_copy_pc">${a}</span><span class="bf_copy_mo">${escapeHtml(mo)}</span>`;
  }

  function renderQuickSection(){
    const host = qs('[data-role="quick_list"]');
    const band = qs('#black_fry_quick_band');
    const items = (BF_QUICK && BF_QUICK.items) || [];
    if(!host || !items.length){qs('#quick_section')?.remove(); return;}
    host.innerHTML = items.map((item, index) => `<a class="quick_item${item.fx ? ' quick_fx_' + item.fx : ''}" href="${escapeAttr(item.href || '#')}"
        style="background:${escapeAttr(item.bg || '#f2f4f6')}; --quick-img:${Number(item.size) > 0 ? Number(item.size) : 100}; --quick-order:${index};">
        <span class="quick_thumb">${item.img ? `<img src="${escapeAttr((BF_QUICK.imgDir || '') + item.img)}" alt="${escapeAttr(item.alt || '')}" loading="lazy" decoding="async">` : ''}</span>
        <strong class="quick_name">${quickCopy(item.name, item.nameMo)}</strong>
        <em class="quick_desc">${quickCopy(item.desc, item.descMo)}</em>
      </a>`).join('');
    if(band && BF_QUICK.band){
      band.setAttribute('href', BF_QUICK.band.href || '#lotto_section');
      const t = qs('.quick_band_title', band), d = qs('.quick_band_desc', band), b = qs('.quick_band_btn', band);
      if(t) t.textContent = BF_QUICK.band.title || '';
      if(d) d.textContent = BF_QUICK.band.desc || '';
      if(b) b.textContent = BF_QUICK.band.btn || '';
    } else if(band){ band.remove(); }
  }

  function renderTitleImages(){
    qsa('[data-title-img]').forEach(el => {
      const file = BF_TITLE_IMG[el.dataset.titleImg];
      if(!file) return;
      const src = BF_IMG + 'pd/title/' + file;
      const text = (el.textContent || '').trim();
      const probe = new Image();
      probe.onload = function(){
        el.innerHTML = '<img src="' + escapeAttr(src) + '" alt="' + escapeAttr(text) + '" decoding="async">';
      };
      probe.src = src;
    });
  }

  function renderDailyVisuals(){
    qsa('[data-daily-visual]').forEach(el => {
      const item = BF_DAILY_VISUAL[el.dataset.dailyVisual];
      if(!item || !item.src){el.remove(); return;}
      const mob = item.srcMobile || '';
      const img = `<img src="${escapeAttr(item.src)}" alt="${escapeAttr(item.alt || '')}" loading="lazy" decoding="async">`;
      el.innerHTML = mob ? `<picture><source media="(max-width:768px)" srcset="${escapeAttr(mob)}">${img}</picture>` : img;
      const source = el.querySelector('source'), pic = el.querySelector('img');
      if(source) pic.addEventListener('error', () => { source.remove(); pic.src = item.src; }, {once:true});   /* 모바일 이미지가 없으면 PC 이미지로 */
    });
  }

  /* 화면에 들어오면 한 번만 cb (IntersectionObserver 가 없으면 바로) */
  function onceVisible(targets, cb, opts){
    if(!('IntersectionObserver' in window)){ targets.forEach(cb); return; }
    const io = new IntersectionObserver(entries => entries.forEach(e => { if(e.isIntersecting){ io.unobserve(e.target); cb(e.target); } }), opts);
    targets.forEach(t => io.observe(t));
  }

  function initCountUp(){
    const els = qsa('.bf_countup');
    if(!els.length) return;
    if(!('IntersectionObserver' in window)) return;
    onceVisible(els, countUpEl, {threshold:0.4});
  }

  /* sticky_section */
  function initSticky(){
    const links = qsa('#sticky_section .sticky_link, .bf_mobile_sticky_clone .sticky_link');

    function updateStickyUnderline(bar){
      if(!bar) return;
      const activeItem = qs('.sticky_item.is_active', bar);
      if(!activeItem){
        bar.style.setProperty('--bf-sticky-underline-opacity', '0');
        return;
      }
      const inset = 8;
      const left = activeItem.offsetLeft + inset;
      const width = Math.max(22, activeItem.offsetWidth - (inset * 2));
      bar.style.setProperty('--bf-sticky-underline-left', left + 'px');
      bar.style.setProperty('--bf-sticky-underline-width', width + 'px');
      bar.style.setProperty('--bf-sticky-underline-opacity', '1');
    }

    function updateAllStickyUnderlines(){
      qsa('#sticky_section, .bf_mobile_sticky_clone').forEach(updateStickyUnderline);
    }

    function setActiveStickyByHash(hash){
      links.forEach(link => {
        const active = link.getAttribute('href') === hash;
        link.parentElement.classList.toggle('is_active', active);
      });
      updateAllStickyUnderlines();
    }

    function centerStickyLink(link){
      const bar = link && link.closest ? link.closest('#sticky_section, .bf_mobile_sticky_clone') : null;
      const item = link && link.closest ? link.closest('.sticky_item') : null;
      if(!bar || !item) return;
      try {item.scrollIntoView({behavior:'smooth', block:'nearest', inline:'center'});} catch(e){
        bar.scrollLeft = item.offsetLeft - (bar.clientWidth - item.clientWidth) / 2;
      }
    }
    links.forEach(link => link.addEventListener('click', function(e){
      const target = qs(link.getAttribute('href'));
      if(!target) return;
      e.preventDefault();
      setActiveStickyByHash(link.getAttribute('href'));
      const fixedSticky = qs('.bf_mobile_sticky_clone.is_show');
      const stickyTop = fixedSticky ? (parseFloat(fixedSticky.style.getPropertyValue('--bf-mobile-sticky-top')) || 0) : 0;
      const offset = (fixedSticky ? fixedSticky.offsetHeight : (qs('#sticky_section')?.offsetHeight || 54)) + stickyTop;
      scrollToSection(target, offset);
      centerStickyLink(link);
    }));
    if(!('IntersectionObserver' in window)){
      updateAllStickyUnderlines();
      return;
    }
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if(entry.isIntersecting) setActiveStickyByHash('#' + entry.target.id);
      });
    }, {rootMargin:'-55% 0px -40% 0px', threshold:0});
    links.forEach(link => {const target = qs(link.getAttribute('href')); if(target) observer.observe(target);});
    window.addEventListener('resize', updateAllStickyUnderlines, {passive:true});
    window.setTimeout(updateAllStickyUnderlines, 80);
    window.setTimeout(updateAllStickyUnderlines, 500);
  }

  function initMobileStickyClone(){
    const source = qs('#sticky_section');
    if(!source || source.dataset.bfMobileStickyCloneReady === '1') return null;
    source.dataset.bfMobileStickyCloneReady = '1';

    const clone = source.cloneNode(true);
    clone.removeAttribute('id');
    clone.classList.add('bf_mobile_sticky_clone');
    clone.setAttribute('aria-hidden', 'true');
    document.body.appendChild(clone);

    const mq = window.matchMedia('(max-width:768px)');
    let ticking = false;
    let syncing = false;

    function getSafeTopOffset(){
      if(!mq.matches) return 0;
      let maxBottom = 0;
      const wrapper = qs('#wrapper_ey');
      const nodes = document.querySelectorAll('body *');
      nodes.forEach(function(el){
        if(!el || el === source || el === clone || source.contains(el) || clone.contains(el)) return;
        if(wrapper && wrapper.contains(el)) return;
        const style = window.getComputedStyle(el);
        if(style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') return;
        if(style.position !== 'fixed' && style.position !== 'sticky' && style.position !== '-webkit-sticky') return;
        const rect = el.getBoundingClientRect();
        if(rect.width < 160 || rect.height < 20 || rect.height > 120) return;
        if(rect.bottom <= 0 || rect.top > 8) return;
        maxBottom = Math.max(maxBottom, Math.ceil(rect.bottom));
      });
      return maxBottom;
    }

    function applyTopOffset(){
      const top = getSafeTopOffset();
      clone.style.setProperty('--bf-mobile-sticky-top', top + 'px');
      return top;
    }

    function stickyHeight(){
      return Math.max(54, source.offsetHeight || clone.offsetHeight || 56);
    }

    function setCloneHeight(){
      const h = stickyHeight() + 'px';
      clone.style.height = h;
      clone.style.minHeight = h;
    }

    function setShown(show){
      clone.classList.toggle('is_show', show);
      source.classList.toggle('bf_sticky_source_hidden', show);
      clone.setAttribute('aria-hidden', show ? 'false' : 'true');
      source.setAttribute('aria-hidden', show ? 'true' : 'false');
      if(show) clone.scrollLeft = source.scrollLeft;
      window.requestAnimationFrame(function(){
        [source, clone].forEach(function(bar){
          const activeItem = bar && bar.querySelector ? bar.querySelector('.sticky_item.is_active') : null;
          if(!activeItem) return;
          const inset = 8;
          bar.style.setProperty('--bf-sticky-underline-left', (activeItem.offsetLeft + inset) + 'px');
          bar.style.setProperty('--bf-sticky-underline-width', Math.max(22, activeItem.offsetWidth - (inset * 2)) + 'px');
          bar.style.setProperty('--bf-sticky-underline-opacity', '1');
        });
      });
    }

    function update(){
      ticking = false;
      setCloneHeight();
      if(!mq.matches){
        setShown(false);
        clone.style.setProperty('--bf-mobile-sticky-top', '0px');
        return;
      }
      const fixedTop = applyTopOffset();
      const rect = source.getBoundingClientRect();
      const wrapper = qs('#wrapper_ey');
      const wrapBottom = wrapper ? wrapper.getBoundingClientRect().bottom : Infinity;
      setShown(rect.top <= fixedTop && wrapBottom > fixedTop + stickyHeight());
    }

    function requestUpdate(){
      if(ticking) return;
      ticking = true;
      window.requestAnimationFrame(update);
    }

    function syncScroll(from, to){
      if(syncing) return;
      syncing = true;
      to.scrollLeft = from.scrollLeft;
      window.requestAnimationFrame(function(){syncing = false;});
    }

    source.addEventListener('scroll', function(){syncScroll(source, clone);}, {passive:true});
    clone.addEventListener('scroll', function(){syncScroll(clone, source);}, {passive:true});
    window.addEventListener('scroll', requestUpdate, {passive:true});
    document.addEventListener('scroll', requestUpdate, true);
    window.addEventListener('resize', requestUpdate, {passive:true});
    window.addEventListener('orientationchange', function(){window.setTimeout(requestUpdate, 120);}, {passive:true});
    if(mq.addEventListener) mq.addEventListener('change', requestUpdate);
    else if(mq.addListener) mq.addListener(requestUpdate);

    requestUpdate();
    window.setTimeout(requestUpdate, 250);
    window.setTimeout(requestUpdate, 900);
    return clone;
  }

  /* 쿠폰 */
  function couponUrl(idx){return `/mypage/rcoupen.php?idx=${encodeURIComponent(idx)}`;}
  function getDailyCouponItems(){return BF_COUPON.daily.items || [];}
  function getActiveCoupon(){
    const items = getDailyCouponItems();
    const nowDate = new Date();
    const now = nowDate.getTime();
    const today = getCouponSaleDate(nowDate);
    const sortedItems = items.slice().sort((a, b) => String(a.date || '').localeCompare(String(b.date || '')));
    const firstItem = sortedItems[0];
    const lastItem = sortedItems[sortedItems.length - 1];
    let active = items.find(item => item.date === today);
    if(!active && firstItem && today < firstItem.date) active = firstItem;
    if(!active && lastItem && today > lastItem.date) active = lastItem;
    active = active || firstItem || {idx:''};

    const range = active.date ? getCouponDateRange(active.date) : null;
    const isBeforeOpen = !!(range && now < range.start.getTime());
    const isExpired = !!(range && now > range.end.getTime());
    return Object.assign({}, BF_COUPON.daily, active, {
      daily:true,
      sub:BF_COUPON.daily.sub || '',
      isBeforeOpen,
      isAvailable:!!(range && !isBeforeOpen && !isExpired)
    });
  }
  function getCouponCards(){
    const daily = getDailyCouponItems().length ? [getActiveCoupon()] : [];
    return daily.concat((BF_COUPON.specials || []).map(item => Object.assign({}, item, {daily:false})));
  }
  function initCoupons(){
    const grid = qs('#black_fry_coupon_grid');
    if(!grid) return;
    const coupons = getCouponCards();
    grid.innerHTML = coupons.map((coupon, index) => {
      const isSoldout = coupon.soldout === true;
      const isBeforeOpen = coupon.daily === true && coupon.isBeforeOpen === true;
      const isDisabledDaily = coupon.daily === true && coupon.isAvailable === false;
      const cardClass = `coupon_card ${coupon.className || (coupon.daily ? 'is_daily' : 'is_fixed')}${isSoldout ? ' is_soldout' : ''}${isBeforeOpen ? ' is_before_open' : ''}`;
      const statusText = isSoldout ? (BF_COUPON.soldoutText || 'SOLD OUT') : (isBeforeOpen ? '10시 OPEN' : '');
      const label = `${coupon.rate} 쿠폰 ${isSoldout ? '품절' : (isBeforeOpen ? '오픈 전' : '다운로드')}`;
      const body = `
        <div class="coupon_left">
          <h2 class="coupon_rate">${escapeHtml(coupon.rate)}</h2>
          <h5 class="coupon_sub">${escapeHtml(coupon.sub)}<span class="coupon_info" tabindex="0">ⓘ<span class="coupon_info_box">${escapeHtml(BF_COUPON.infoText || '')}</span></span></h5>
        </div>
        ${statusText ? `<span class="coupon_soldout_text" aria-hidden="true">${escapeHtml(statusText)}</span>` : `<span class="coupon_down" aria-hidden="true"><svg class="coupon_down_svg" viewBox="0 0 36 36" focusable="false" aria-hidden="true"><path d="M18 5v17"></path><path d="M10.5 15.5 18 23l7.5-7.5"></path><path d="M8 29h20"></path></svg></span>`}`;
      if(isSoldout || isDisabledDaily){
        return `<div class="${escapeAttr(cardClass)}" aria-label="${escapeAttr(label)}" aria-disabled="true" style="--bf-coupon-order:${index};">${body}</div>`;
      }
      return `<a class="${escapeAttr(cardClass)}" href="${couponUrl(coupon.idx)}" target="_blank" aria-label="${escapeAttr(label)}" style="--bf-coupon-order:${index};">${body}</a>`;
    }).join('');
    qsa('.coupon_info', grid).forEach(info => info.addEventListener('click', e => {e.preventDefault(); e.stopPropagation();}));
  }

  function initCouponTimer(){
    const timer = qs('#black_fry_coupon_timer');
    if(!timer) return;
    if(!getDailyCouponItems().length){timer.remove(); return;}
    const couponDates = getDailyCouponItems().map(item => item.date).sort();
    const firstCouponDate = couponDates[0] || '';
    const lastCouponDate = couponDates[couponDates.length - 1] || '';
    const finalCouponEnd = lastCouponDate ? getCouponDateRange(lastCouponDate).end : BF_CONFIG.eventEnd;
    let lastCouponRenderKey = '';
    function update(){
      const nowDate = new Date();
      const now = nowDate.getTime();
      if(now > finalCouponEnd.getTime()){timer.textContent = '종료'; return;}
      let activeDate = getCouponSaleDate(nowDate);
      if(couponDates.length){
        if(activeDate < firstCouponDate) activeDate = firstCouponDate;
        if(activeDate > lastCouponDate) activeDate = lastCouponDate;
      }
      const range = getCouponDateRange(activeDate);
      const isBeforeOpen = now < range.start.getTime();
      const couponRenderKey = `${activeDate}:${isBeforeOpen ? 'before' : 'open'}`;
      if(couponRenderKey !== lastCouponRenderKey){
        lastCouponRenderKey = couponRenderKey;
        initCoupons();
      }
      const target = isBeforeOpen ? range.start : range.end;
      const time = formatCountdown(Math.max(0, target.getTime() - now));
      timer.textContent = `${isBeforeOpen ? '오픈까지' : '종료까지'} ${time.d}일 ${time.h}시간 ${time.m}분 ${time.s}초`;
    }
    update();
    setInterval(update, 1000);
  }

  /* 상품 정보 */
  function getProductImage(doc, number, html){
    const candidates = [];
    function normalize(src){
      if(!src) return '';
      let value = String(src).trim().replace(/\\\//g, '/').replace(/^url\((.*)\)$/i, '$1').replace(/^["']|["']$/g, '').replace(/[),;]+$/g, '');
      if(!value || value.indexOf('data:') === 0) return '';
      if(value.indexOf('//') === 0) value = location.protocol + value;
      return absUrl(value);
    }
    function push(value){
      if(!value) return;
      const raw = String(value).replace(/\\\//g, '/');
      raw.split(',').forEach(chunk => {
        const src = normalize(chunk.trim().split(/\s+/)[0]);
        if(src && !candidates.includes(src)) candidates.push(src);
      });
      const matches = raw.match(/(?:https?:)?\/\/[^'"\s<>),]+?\.(?:webp|jpe?g|png|gif)(?:\?[^'"\s<>),]*)?|\/(?:files\/goods|shopimages|phpskr|upload|data)[^'"\s<>),]+?\.(?:webp|jpe?g|png|gif)(?:\?[^'"\s<>),]*)?/gi) || [];
      matches.forEach(match => {const src = normalize(match); if(src && !candidates.includes(src)) candidates.push(src);});
    }
    qsa('img, source', doc).forEach(el => ['src','srcset','data-src','data-srcset','data-original','data-lazy','data-ori','data-image','data-thumb','data-url'].forEach(name => push(el.getAttribute(name))));
    ['meta[property="og:image"]','meta[name="og:image"]','meta[property="twitter:image"]','meta[name="twitter:image"]','meta[itemprop="image"]','link[rel="image_src"]'].forEach(selector => push(qs(selector, doc)?.getAttribute('content') || qs(selector, doc)?.getAttribute('href')));
    push(html || '');
    const clean = candidates.map(src => src.split(/(?=https?:\/\/)/)[0]).filter((src, index, arr) => src && arr.indexOf(src) === index);
    const goods = clean.filter(src => src.indexOf('/files/goods/') > -1);
    const same = goods.filter(src => src.indexOf('/files/goods/' + number + '/') > -1);
    function rank(src){
      const file = decodeURIComponent((src.split('?')[0].split('#')[0].split('/').pop() || ''));
      const match = file.match(/[_-](\d+)\.(?:webp|jpe?g|png|gif)$/i);
      return match ? Number(match[1]) : 999;
    }
    function pick(list){return list.length ? list.slice().sort((a,b) => rank(a) - rank(b))[0] : '';}
    return pick(same) || pick(goods) || pick(clean) || '';
  }
  function getBrandInfo(doc){
    const links = qsa('a[href]', doc);
    const brandLink = qs('.brand a[href]', doc) || qs('a[href*="brand_goods.php"]', doc) || qs('a[href*="brand="]', doc) || links.find(link => qs('.brand', link));
    const brandEl = qs('.brand', doc) || (brandLink ? qs('.brand', brandLink) : null);
    let brand = cleanText(brandLink?.textContent || brandEl?.textContent || metaContent(doc, 'meta[property="product:brand"]') || metaContent(doc, 'meta[name="brand"]')).replace(/^#/, '');
    if(!brand || brand === '브랜드') brand = '4XR';
    return {brand, brandUrl: brandLink ? absUrl(brandLink.getAttribute('href')) : ''};
  }
  function getProductName(doc){
    const invalid = ['내 보유 쿠폰','관련상품','EVENT','PRODUCT','유의사항','댓글 작성하기','룩북 보러 가기','브랜드 바로 가기'];
    function valid(value){
      const name = cleanText(value);
      if(!name || invalid.includes(name)) return false;
      if(/쿠폰|장바구니|로그인|회원가입|마이페이지|검색|공유|닫기/.test(name)) return false;
      return /[가-힣A-Za-z0-9]/.test(name);
    }
    const title = cleanText(metaContent(doc, 'meta[property="og:title"]') || metaContent(doc, 'meta[name="title"]') || text(qs('title', doc))).replace(/\s*[-|]\s*4XR.*$/i, '').replace(/\s*::.*$/i, '');
    if(valid(title)) return title;
    const selectors = ['.goods_view_name','.goods_name','.view_tit','.item_detail_tit','.prd_name','[class*="goods"][class*="name"]','[class*="product"][class*="name"]','h1','h2'];
    for(const selector of selectors){
      const found = qsa(selector, doc).map(el => cleanText(el.textContent)).find(valid);
      if(found) return found;
    }
    return '';
  }
  function getProductPricing(doc){
    const bodyText = cleanText(doc.body?.textContent || '');
    const pattern = bodyText.match(/([\d,]+)\s*원\s*(\d{1,3})\s*%\s*([\d,]+)\s*원/);
    if(pattern) return {price:formatPrice(pattern[3]), originalPrice:formatPrice(pattern[1]), discount:pattern[2] + '%'};
    const metaPrice = metaContent(doc, 'meta[property="product:price:amount"]') || metaContent(doc, 'meta[property="og:price:amount"]');
    if(metaPrice) return {price:formatPrice(metaPrice), originalPrice:'', discount:''};
    const selectors = ['.sale_price','.sell_price','.dc_price','.discount_price','.goods_price','.item_price','[class*="sale"][class*="price"]','[class*="sell"][class*="price"]'];
    for(const selector of selectors){const value = text(qs(selector, doc)); if(/\d/.test(value)) return {price:formatPrice(value), originalPrice:'', discount:''};}
    const priceText = text(qs('[class*="price"]', doc));
    return {price:/\d/.test(priceText) ? formatPrice(priceText) : '', originalPrice:'', discount:''};
  }
  function getReviewCount(doc){
    const reviewBtn = qsa('button, a', doc).find(el => text(el).indexOf('구매후기') > -1);
    const countText = text(qs('.count_ey', reviewBtn)) || text(qs('.count_ey', doc)) || text(reviewBtn) || '';
    const match = countText.match(/구매후기\s*(\d+)\s*건/) || countText.match(/(\d+)\s*건/) || countText.match(/(\d+)/) || cleanText(doc.body?.textContent || '').match(/구매후기\s*(\d+)\s*건/);
    const count = match ? Number(match[1]) : 0;
    return count > 0 ? String(count) : '';
  }

  function getSoldout(doc, html){
    if(/_NB_PD_USE\s*=\s*['"]N['"]/.test(html || '')) return true;
    const soldoutClass = qsa('a.isopen2, button.isopen2, .isopen2', doc).some(el => text(el).indexOf('품절') > -1 || (el.getAttribute('href') || '').indexOf('품절') > -1);
    const soldoutText = qsa('a, button', doc).some(el => text(el) === '품절');
    return soldoutClass || soldoutText;
  }
  async function fetchProductInfo(number){
    if(BF_PRODUCT_CACHE.has(number)) return BF_PRODUCT_CACHE.get(number);
    const fallback = {number, brand:'4XR', brandUrl:'', name:'상품번호 ' + number, price:'', originalPrice:'', discount:'', img:BF_CONFIG.productImageBaseUrl + number + '/0_0.webp', reviewCount:'', soldout:false};
    try{
      const response = await fetch('/shop/view.php?index_no=' + encodeURIComponent(number), {credentials:'same-origin'});
      if(!response.ok) throw new Error('response_' + response.status);
      const html = await response.text();
      const doc = new DOMParser().parseFromString(html, 'text/html');
      const brand = getBrandInfo(doc);
      const pricing = getProductPricing(doc);
      const info = {
        number,
        brand:brand.brand,
        brandUrl:brand.brandUrl,
        name:getProductName(doc) || fallback.name,
        price:pricing.price || fallback.price,
        originalPrice:pricing.originalPrice || '',
        discount:pricing.discount || '',
        img:getProductImage(doc, number, html) || fallback.img,
        reviewCount:getReviewCount(doc),
        soldout:getSoldout(doc, html)
      };
      BF_PRODUCT_CACHE.set(number, info);
      return info;
    } catch(error){
      console.warn('[SALMOKJI_BLACK_FRY] 상품 정보를 불러오지 못했습니다.', number, error);
      BF_PRODUCT_CACHE.set(number, fallback);
      return fallback;
    }
  }

  function scrollChildIntoScroller(scroller, child){
    if(!scroller || !child) return;
    if(!(window.matchMedia && window.matchMedia('(max-width:768px)').matches)) return;
    try{
      const scrollerRect = scroller.getBoundingClientRect();
      const childRect = child.getBoundingClientRect();
      const diff = (childRect.left + childRect.width / 2) - (scrollerRect.left + scrollerRect.width / 2);
      if(Math.abs(diff) < 8) return;
      scroller.scrollTo({left:scroller.scrollLeft + diff, behavior:'auto'});
    } catch(e){
    }
  }

  /* daily_section / product */
  function productSkeleton(number, state){
    const stateClass = state === 'future' ? 'is_future' : (state === 'expired' ? 'is_expired' : '');
    if(state === 'future'){
      return `<div class="product_card is_loading is_future" data-product-number="${escapeAttr(number)}"><div class="product_thumb"><h5 class="product_badge">Loading</h5></div><h5 class="product_future_text">오픈 예정</h5></div>`;
    }
    return `<div class="product_card is_loading ${stateClass}" data-product-number="${escapeAttr(number)}"><div class="product_thumb"><h5 class="product_badge">Loading</h5></div><h5 class="product_brand">Loading</h5><h4 class="product_name" title="상품번호 ${escapeAttr(number)}">상품번호 ${escapeHtml(number)}</h4><h5 class="product_price"><span class="product_current">Loading</span></h5></div>`;
  }
  function productCard(product, state){
    const isFuture = state === 'future';
    const isExpired = state === 'expired';
    const isSoldout = !!product.soldout;
    const link = `/shop/view.php?index_no=${encodeURIComponent(product.number)}`;
    const badge = isFuture ? '<h5 class="product_badge">COMING SOON</h5>' : (isSoldout ? '<h5 class="product_badge">SOLD OUT</h5>' : '');
    const imageHtml = product.img ? `<img src="${escapeAttr(product.img)}" alt="${escapeAttr(product.name || '상품 이미지')}" loading="lazy" decoding="async">` : '<h5 class="product_badge">NO IMAGE</h5>';
    const thumb = isFuture ? `<div class="product_thumb">${imageHtml}${badge}</div>` : `<a class="product_thumb" href="${escapeAttr(link)}" target="_blank">${imageHtml}${badge}</a>`;
    if(isFuture){
      return `<div class="product_card is_future" data-product-number="${escapeAttr(product.number)}">${thumb}<h5 class="product_future_text">오픈 예정</h5></div>`;
    }
    const brandHtml = product.brandUrl ? `<a href="${escapeAttr(product.brandUrl)}" target="_blank">${escapeHtml(product.brand || '')}</a>` : escapeHtml(product.brand || '');
    const hasOriginal = product.originalPrice && product.originalPrice !== product.price;
    const reviewCount = Number(String(product.reviewCount || '').replace(/[^\d]/g, ''));
    const reviewHtml = reviewCount > 0 ? `<span class="product_review">(${reviewCount})</span>` : '';
    const price = isExpired ? '<h5 class="product_price"><span class="product_expired_price">할인 종료</span></h5>' : isSoldout ? '<h5 class="product_price"><span class="product_sale">SOLD OUT</span></h5>' : `<h5 class="product_price"><span class="product_current">${escapeHtml(product.price || '')}</span>${hasOriginal ? `<span class="product_original">${escapeHtml(product.originalPrice)}</span>` : ''}${product.discount ? `<span class="product_sale">${escapeHtml(product.discount)}</span>` : ''}${reviewHtml}</h5>`;
    return `<div class="product_card ${isExpired ? 'is_expired' : ''} ${isSoldout ? 'is_soldout' : ''}" data-product-number="${escapeAttr(product.number)}">${thumb}<h5 class="product_brand">${brandHtml}</h5><h4 class="product_name" title="${escapeAttr(product.name || '')}">${escapeHtml(product.name || '')}</h4>${price}</div>`;
  }
  function initDaily(section){
    const key = section.getAttribute('data-daily-key');
    const data = BF_DAILY_DATA[key] || {};
    const tabs = qs('[data-role="daily_tabs"]', section);
    const items = qs('[data-role="daily_items"]', section);
    const timer = qs('[data-role="daily_timer"]', section);
    const dates = Object.keys(data).sort();
    if(!tabs || !items || !timer) return;
    if(!dates.length){items.innerHTML = '<div class="bf_placeholder">상품 데이터 입력 영역</div>'; return;}

    function getAutoActiveDate(){
      const currentDate = getDailySaleDate(new Date());
      const usable = dates.filter(d => state(d) !== 'expired');
      if(!usable.length) return dates[dates.length - 1];
      if(usable.includes(currentDate)) return currentDate;
      return usable.find(d => d > currentDate) || usable[0];
    }

    let activeDate = getAutoActiveDate();

    function state(dateKey){
      const range = getDailyDateRange(dateKey);
      const now = Date.now();
      if(now < range.start.getTime()) return 'future';
      if(now > range.end.getTime()) return 'expired';
      return 'active';
    }
    function updateTimer(){
      const range = getDailyDateRange(activeDate);
      const now = Date.now();
      if(now < range.start.getTime()){timer.textContent = '오픈 예정'; return;}
      if(now > range.end.getTime()){timer.textContent = '종료'; return;}
      const diff = Math.max(0, range.end.getTime() - now);
      const time = formatCountdown(diff);
      const totalHours = Math.floor(diff / 3600000);
      timer.textContent = `종료까지 ${totalHours}시간 ${time.m}분 ${time.s}초`;
    }
    function syncTabs(dateKey){
      qsa('.daily_tab', tabs).forEach(btn => {
        btn.classList.toggle('is_active', btn.dataset.date === dateKey);
        const expired = state(btn.dataset.date) === 'expired';
        btn.classList.toggle('is_disabled', expired);
        btn.disabled = expired;
        btn.classList.toggle('is_future', state(btn.dataset.date) === 'future');
      });
    }

    function render(dateKey, opts){
      if(state(dateKey) === 'expired' && !(opts && opts.allowExpired)) return;
      activeDate = dateKey;
      syncTabs(dateKey);
      scrollChildIntoScroller(tabs, qs('.daily_tab.is_active', tabs));
      enableDragScroll(tabs);
      updateTimer();
      const currentState = state(dateKey);
      const numbers = (data[dateKey] || []).slice(0, 12).map(String);
      items.innerHTML = numbers.map(number => productSkeleton(number, currentState)).join('');
      Promise.all(numbers.map(fetchProductInfo)).then(products => {
        if(activeDate !== dateKey) return;
        items.innerHTML = products.map(product => productCard(product, currentState)).join('');
      });
    }
    dates.forEach(dateKey => {
      const d = new Date(dateKey + 'T00:00:00+09:00');
      const weekdayLabels = ['일', '월', '화', '수', '목', '금', '토'];
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'daily_tab';
      btn.dataset.date = dateKey;
      btn.textContent = `${d.getMonth() + 1}.${d.getDate()} ${weekdayLabels[d.getDay()] || ''}`;
      if(state(dateKey) === 'expired'){btn.classList.add('is_disabled'); btn.disabled = true;}
      if(state(dateKey) === 'future') btn.classList.add('is_future');
      btn.addEventListener('click', () => {
        if(state(dateKey) === 'expired') return;
        render(dateKey);
      });
      tabs.appendChild(btn);
    });
    render(activeDate, {allowExpired:true});
    setInterval(() => {
      const autoDate = getAutoActiveDate();
      if(autoDate && autoDate !== activeDate && state(activeDate) === 'expired'){
        render(autoDate, {allowExpired:true});
        return;
      }
      syncTabs(activeDate);
      updateTimer();
    }, 1000);
  }


  /*성능 최적화 */
  function initLazyDailySections(){
    const sections = qsa('[data-daily-key]');
    if(!sections.length) return;
    const started = new WeakSet();
    const start = section => {
      if(started.has(section)) return;
      started.add(section);
      initDaily(section);
    };
    onceVisible(sections, start, {rootMargin:'220px 0px', threshold:0.01});
  }

  function initLazyRanking(){
    const section = qs('#ranking_section');
    if(!section) return;
    let started = false;
    let timerId = null;
    const start = () => {
      if(started) return;
      started = true;
      loadRanking();
      timerId = setInterval(() => loadRanking({silent:true}), BF_CONFIG.rankingRefreshMs);
      section.dataset.rankingTimerId = String(timerId);
    };
    onceVisible([section], start, {rootMargin:'260px 0px', threshold:0.01});
  }

  /* lotto_section */
  function initLotto(){
    const wrap = qs('#black_fry_lotto_numbers');
    const message = qs('#black_fry_lotto_message');
    if(!wrap) return;

    const selected = new Set();
    let hasCopied = false;

    const generateBtn = qs('#black_fry_generate_btn');
    const resetBtn = qs('#black_fry_reset_btn');
    const copyBtn = qs('#black_fry_copy_btn');
    const submitBtn = qs('#black_fry_submit_btn');
    const selectedCount = qs('#black_fry_lotto_selected_count');

    function isLottoClosed(){return new Date() > BF_CONFIG.eventEnd;}

    function getSelectedArray(){return Array.from(selected).sort((a,b) => a - b);}

    function loadSelected(){
      try{
        const saved = JSON.parse(localStorage.getItem(BF_LOTTO_UI.storageKey) || '[]');
        if(!Array.isArray(saved)) return;
        saved.map(Number).filter(num => Number.isInteger(num) && num >= 1 && num <= 50).slice(0, 6).forEach(num => selected.add(num));
      }catch(e){}
    }

    function saveSelected(){
      try{localStorage.setItem(BF_LOTTO_UI.storageKey, JSON.stringify(getSelectedArray()));}catch(e){}
    }

    function clearSaved(){
      try{localStorage.removeItem(BF_LOTTO_UI.storageKey);}catch(e){}
    }

    function setDisabled(btn, disabled){
      if(!btn) return;
      btn.disabled = !!disabled;
      btn.setAttribute('aria-disabled', disabled ? 'true' : 'false');
    }

    function updateButtons(){
      const closed = isLottoClosed();
      const hasSix = selected.size === 6;
      if(selectedCount) selectedCount.textContent = closed ? '응모 종료' : `${selected.size}/6 선택`;
      setDisabled(generateBtn, closed);
      setDisabled(copyBtn, closed || !hasSix);
      setDisabled(submitBtn, closed || !hasSix || !hasCopied);
      setDisabled(resetBtn, selected.size === 0);
      qsa('.lotto_number', wrap).forEach(btn => {btn.disabled = closed; btn.setAttribute('aria-disabled', closed ? 'true' : 'false');});
      if(closed && message) message.textContent = BF_LOTTO_UI.closedMessage;
    }

    function sync(){
      qsa('.lotto_number', wrap).forEach(btn => btn.classList.toggle('is_selected', selected.has(Number(btn.dataset.num))));
      saveSelected();
      updateButtons();
    }

    for(let i = 1; i <= 50; i++){
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'lotto_number';
      btn.dataset.num = i;
      btn.textContent = i;
      btn.setAttribute('aria-label', `${i}번 직접 선택`);
      btn.title = `${i}번 직접 선택`;
      btn.addEventListener('click', () => {
        if(isLottoClosed()) return;
        const n = Number(btn.dataset.num);
        if(selected.has(n)) selected.delete(n);
        else if(selected.size < 6) selected.add(n);
        else alert('최대 6개까지만 선택 가능');
        hasCopied = false;
        if(message) message.textContent = '';
        sync();
      });
      wrap.appendChild(btn);
    }

    loadSelected();
    sync();

    generateBtn?.addEventListener('click', () => {
      if(isLottoClosed()) return;
      selected.clear();
      while(selected.size < 6) selected.add(Math.floor(Math.random() * 50) + 1);
      hasCopied = false;
      sync();
      if(message) message.textContent = '';
    });

    resetBtn?.addEventListener('click', () => {
      selected.clear();
      hasCopied = false;
      clearSaved();
      sync();
      if(message) message.textContent = isLottoClosed() ? BF_LOTTO_UI.closedMessage : '';
    });

    copyBtn?.addEventListener('click', async () => {
      if(!message) return;
      if(isLottoClosed()){message.textContent = BF_LOTTO_UI.closedMessage; updateButtons(); return;}
      if(selected.size !== 6){message.textContent = '숫자 6개를 선택해주세요.'; updateButtons(); return;}
      const result = getSelectedArray().join(', ');
      try {await navigator.clipboard.writeText(result); message.textContent = '복사 완료 : ' + result;} catch(e){message.textContent = result;}
      hasCopied = true;
      updateButtons();
    });

    submitBtn?.addEventListener('click', () => {
      if(isLottoClosed()){alert(BF_LOTTO_UI.closedMessage); updateButtons(); return;}
      if(selected.size !== 6){alert('6개의 번호를 선택해야 응모할 수 있어요.'); updateButtons(); return;}
      if(!hasCopied){alert('번호를 복사해주세요.'); updateButtons(); return;}
      const target = qs('#link_sh_comment');
      if(target) window.scrollTo({top:target.getBoundingClientRect().top + window.pageYOffset - 100, behavior:'smooth'});
    });

    setInterval(updateButtons, 1000);
  }

  /* ranking_section */
  function normalizeWon(value){
    const source = cleanText(value).replace(/원/g, '');
    const match = source.match(/\d{1,3}(?:,\d{3})+|\d+/);
    return match ? match[0] + '원' : '';
  }
  function normalizePercent(value){
    const match = cleanText(value).match(/\d{1,3}%/);
    return match ? match[0] : '';
  }
  function parseRankingPriceData(el){
    const raw = pickText(el, ['.price_box', '.price', '.prd_price', '.product_price']) || text(el);
    const currentText = pickText(el, ['.price_box .current_price', '.price_box .sell_price', '.current_price', '.sell_price', '.dc_price', '.sale_price']);
    const originalText = pickText(el, ['.price_box .ori_price', '.price_box .original_price', '.ori_price', '.original_price', '.consumer_price', '.price_box del', 'del']);
    const discountText = pickText(el, ['.price_box .sale', '.price_box .discount', '.price_box .discount_rate', '.price_box .per', '.sale_rate', '.discount_rate']);
    const priceMatches = cleanText(raw).replace(/원/g, ' ').match(/\d{1,3}(?:,\d{3})+/g) || [];
    const current = normalizeWon(currentText) || normalizeWon(priceMatches[0] || '');
    const original = normalizeWon(originalText) || normalizeWon(priceMatches[1] || '');
    const discount = normalizePercent(discountText) || normalizePercent(raw);
    return {price:current, originalPrice:(original && original !== current ? original : ''), discount};
  }
  function rankingPriceHtml(item, reviewHtml){
    if(!item.price && !item.originalPrice && !item.discount) return `<h5 class="ranking_price">${reviewHtml}</h5>`;
    return `<h5 class="ranking_price">${item.price ? `<span class="ranking_current">${escapeHtml(item.price)}</span>` : ''}${item.originalPrice ? `<span class="ranking_original">${escapeHtml(item.originalPrice)}</span>` : ''}${item.discount ? `<span class="ranking_sale">${escapeHtml(item.discount)}</span>` : ''}${reviewHtml}</h5>`;
  }
  function parseRankingItems(doc){
    const baseUrl = 'https://www.4xr.co.kr';
    const selectors = [
      '.base_slider_list.list_mode.ranking_big.pb80 .product',
      '.base_slider_list.list_mode.ranking_big .product',
      '.base_slider_list.list_mode.ranking_small .product',
      '.base_slider_list.list_mode .product',
      '.base_slider_list .product'
    ];
    let rawNodes = [];
    selectors.forEach(selector => {rawNodes = rawNodes.concat(qsa(selector, doc));});
    if(!rawNodes.length){rawNodes = qsa('a[href*="/shop/view.php?index_no="]', doc).map(a => a.closest('li, .product, div') || a);}
    const seen = new Set();
    const items = [];
    rawNodes.forEach(el => {
      const a = (el.matches && el.matches('a[href*="/shop/view.php?index_no="]')) ? el : qs('a[href*="/shop/view.php?index_no="]', el);
      if(!a) return;
      const href = absUrl(a.getAttribute('href'), baseUrl);
      const keyMatch = href.match(/index_no=\d+/);
      const key = keyMatch ? keyMatch[0] : href;
      const productNumber = keyMatch ? keyMatch[0].replace('index_no=', '') : '';
      if(!key || seen.has(key)) return;
      seen.add(key);
      const imgSrc = pickAttr(el, ['img'], ['data-src', 'data_src', 'data-original', 'data-original-src', 'data-lazy', 'src']);
      const imgAlt = pickAttr(el, ['img'], ['alt']);
      const name = pickText(el, ['.p_conts', '.p_name', '.name', '.goods_name', '.product_name', '.prd_name', '.infor_box a', '.infor_box']) || imgAlt || '상품명 확인 필요';
      const brand = pickText(el, ['.brand', '.brand_name', '.p_brand', '.p_name a', '.infor_box .p_name']);
      const priceData = parseRankingPriceData(el);
      items.push({rank:items.length + 1, href, number:productNumber, img:absUrl(imgSrc, baseUrl), brand, name:name.replace(/^\d+\s*/, '').trim(), ...priceData});
    });
    return items.slice(0, 100).map((item, index) => ({...item, rank:index + 1}));
  }
  async function fetchRankingHtml(){
    const urlGroups = [
      ['/ranking/goods_list.php?cate=01', '/ranking/goods_list.php?cate=01&page=2'],
      ['https://www.4xr.co.kr/ranking/goods_list.php?cate=01', 'https://www.4xr.co.kr/ranking/goods_list.php?cate=01&page=2']
    ];
    let lastError = null;
    for(const urls of urlGroups){
      const fragments = [];
      for(const url of urls){
        try{
          const res = await fetch(url, {credentials:'include', cache:'no-store'});
          if(!res.ok) throw new Error('status_' + res.status);
          const html = await res.text();
          if(html) fragments.push(`<div data-bf-ranking-page="${fragments.length + 1}">${html}</div>`);
        } catch(e){
          lastError = e;
          if(!fragments.length) break;
        }
      }
      if(fragments.length) return fragments.join('');
    }
    throw lastError || new Error('ranking_fetch_failed');
  }
  async function loadRanking(options){
    const silent = !!(options && options.silent);
    const grid = qs('#black_fry_ranking_grid');
    const pager = qs('#black_fry_ranking_pager');
    const update = qs('#black_fry_ranking_update');
    if(!grid) return;
    if(!silent){
      rankingMsg(grid, 'Loading...');
      if(pager) pager.innerHTML = '';
    }
    try{
      const html = await fetchRankingHtml();
      const doc = new DOMParser().parseFromString(html, 'text/html');
      BF_RANKING_STATE.allItems = parseRankingItems(doc);
      if(!BF_RANKING_STATE.allItems.length) throw new Error('ranking_empty');
      BF_RANKING_STATE.items = BF_RANKING_STATE.allItems.slice(0, 100);
      BF_RANKING_STATE.page = 1;
      const updateText = (doc.body.textContent.match(/\d{2}-\d{2}\s+\d{2}:\d{2}\s*갱신/) || [])[0];
      if(update) update.textContent = updateText || '최근 갱신 : ' + new Date().toLocaleTimeString('ko-KR', {hour:'2-digit', minute:'2-digit'});
      renderRanking();
    } catch(e){
      console.warn('[SALMOKJI_BLACK_FRY] ranking load failed:', e);
      if(!silent){
        if(update) update.textContent = 'Loading Failed';
        rankingMsg(grid, 'Loading Failed');
      }
    }
  }
  function rankingMsg(grid, text){ grid.innerHTML = '<div class="bf_placeholder">' + text + '</div>'; }
  function hydrateRankingReviews(pageItems){
    pageItems.forEach(item => {
      if(!item.number || item.reviewCount) return;
      fetchProductInfo(item.number).then(product => {
        const count = Number(String(product.reviewCount || '').replace(/[^\d]/g, ''));
        if(count <= 0) return;
        item.reviewCount = String(count);
        const target = qs(`#black_fry_ranking_grid .ranking_card[data-product-number="${item.number}"] [data-role="ranking_review"]`);
        if(target) target.textContent = `(${count})`;
      });
    });
  }
  function initRankingResize(){
    if(!window.matchMedia) return;
    const mq = window.matchMedia('(max-width:768px)');
    let wasMobile = mq.matches;
    const onChange = () => {
      if(wasMobile === mq.matches) return;
      wasMobile = mq.matches;
      if(BF_RANKING_STATE.items.length){BF_RANKING_STATE.page = 1; renderRanking();}
    };
    if(mq.addEventListener) mq.addEventListener('change', onChange);
    else if(mq.addListener) mq.addListener(onChange);
  }

  function renderRanking(){
    const grid = qs('#black_fry_ranking_grid');
    const pager = qs('#black_fry_ranking_pager');
    if(!grid) return;
    const pageSize = getRankingPageSize();
    const pageCount = Math.max(1, Math.ceil(BF_RANKING_STATE.items.length / pageSize));
    if(BF_RANKING_STATE.page > pageCount) BF_RANKING_STATE.page = pageCount;
    const start = (BF_RANKING_STATE.page - 1) * pageSize;
    const pageItems = BF_RANKING_STATE.items.slice(start, start + pageSize);
    if(!pageItems.length){
      rankingMsg(grid, 'Loading...');
      if(pager) pager.innerHTML = '';
      return;
    }
    grid.innerHTML = pageItems.map(item => {
      const rankNum = parseInt(item.rank, 10) || 0;
      const rankClass = rankNum <= 3 ? 'ranking_rank_top' : (rankNum <= 10 ? 'ranking_rank_mid' : 'ranking_rank_low');
      const reviewCount = Number(String(item.reviewCount || '').replace(/[^\d]/g, ''));
      const reviewHtml = reviewCount > 0 ? `<span class="ranking_review">(${reviewCount})</span>` : '<span class="ranking_review" data-role="ranking_review"></span>';
      return `<a class="ranking_card" href="${escapeAttr(item.href)}" target="_blank" data-product-number="${escapeAttr(item.number || '')}">
        <h5 class="ranking_rank ${rankClass}">${escapeHtml(item.rank)}</h5>
        <div class="ranking_thumb">${item.img ? `<img src="${escapeAttr(item.img)}" alt="${escapeAttr(item.name)}" loading="lazy" decoding="async">` : ''}</div>
        ${item.brand ? `<h5 class="ranking_brand">${escapeHtml(item.brand)}</h5>` : ''}
        <h4 class="ranking_name" title="${escapeAttr(item.name || '')}">${escapeHtml(item.name)}</h4>
        ${rankingPriceHtml(item, reviewHtml)}
      </a>`;
    }).join('');
    hydrateRankingReviews(pageItems);
    if(!pager) return;
    if(pageCount <= 1){pager.innerHTML = ''; return;}
    pager.innerHTML = `<button type="button" class="ranking_page_btn" data-page="${Math.max(1, BF_RANKING_STATE.page - 1)}" aria-label="이전 페이지" ${BF_RANKING_STATE.page === 1 ? 'disabled' : ''}>‹</button>
      <h5 class="ranking_page_state">${BF_RANKING_STATE.page} / ${pageCount}</h5>
      <button type="button" class="ranking_page_btn" data-page="${Math.min(pageCount, BF_RANKING_STATE.page + 1)}" aria-label="다음 페이지" ${BF_RANKING_STATE.page === pageCount ? 'disabled' : ''}>›</button>`;
    qsa('[data-page]', pager).forEach(btn => btn.addEventListener('click', () => {
      if(btn.disabled) return;
      BF_RANKING_STATE.page = Number(btn.dataset.page);
      renderRanking();
    }));
  }


  function initScrollAnimations(){
    const wrapper = qs('#wrapper_ey');
    if(!wrapper) return;

    qsa('#membership_section .membership_card', wrapper).forEach((card, index) => {
      card.style.setProperty('--bf-membership-order', index);
    });

    const sections = qsa('.section_ey', wrapper);

    const timeSec = qs('#time_section', wrapper);
    if(timeSec){
      const show = () => timeSec.classList.add('bf_is_visible');
      onceVisible([timeSec], show, {threshold:0, rootMargin:'0px 0px -8% 0px'});
      window.setTimeout(() => {
        const r = timeSec.getBoundingClientRect();
        if(r.top < window.innerHeight && r.bottom > 0) show();
      }, 1200);
    }

    if(!sections.length) return;

    onceVisible(sections, section => section.classList.add('bf_is_visible'), {threshold:0, rootMargin:'-52% 0px -47% 0px'});
  }

  function enableDragScroll(el){
    if(!el || el.dataset.bfDragScroll === '1') return;
    el.dataset.bfDragScroll = '1';
    let down = false, captured = false, startX = 0, startLeft = 0, moved = 0;

    el.addEventListener('pointerdown', e => {
      if(e.pointerType === 'touch') return;
      down = true; moved = 0; captured = false;
      startX = e.clientX; startLeft = el.scrollLeft;
    });
    el.addEventListener('pointermove', e => {
      if(!down) return;
      const dx = e.clientX - startX;
      moved = Math.max(moved, Math.abs(dx));
      if(moved <= 3) return;
      if(!captured){
        try{ el.setPointerCapture(e.pointerId); captured = true; }catch(err){}
      }
      el.scrollLeft = startLeft - dx;
      el.style.cursor = 'grabbing';
    });
    function end(e){
      if(!down) return;
      down = false; el.style.cursor = '';
      if(captured){
        try{ el.releasePointerCapture(e.pointerId); }catch(err){}
        captured = false;
      }
      if(moved > 6){
        const block = ev => { ev.preventDefault(); ev.stopPropagation(); };
        el.addEventListener('click', block, {capture:true, once:true});
      }
    }
    el.addEventListener('pointerup', end);
    el.addEventListener('pointercancel', end);
    window.addEventListener('pointerup', end);
    el.addEventListener('wheel', e => {
      if(el.scrollWidth <= el.clientWidth) return;
      if(Math.abs(e.deltaY) <= Math.abs(e.deltaX)) return;
      el.scrollLeft += e.deltaY;
      e.preventDefault();
    }, {passive:false});
  }

  function initTabDragScroll(){
    qsa('[data-role="daily_tabs"], [data-role="quick_list"], #sticky_section, .bf_mobile_sticky_clone').forEach(enableDragScroll);
  }

  function initStickyMoreHint(){
    qsa('#sticky_section, .bf_mobile_sticky_clone').forEach(bar => {
      if(bar.bfMoreHintReady) return;
      bar.bfMoreHintReady = true;
      qsa('.bf_sticky_more', bar).forEach(el => el.remove());
      const hint = document.createElement('span');
      hint.className = 'bf_sticky_more';
      hint.setAttribute('aria-hidden', 'true');
      bar.appendChild(hint);
      const sync = () => {
        queued = false;
        if(!bar.clientWidth) return;
        bar.classList.toggle('bf_has_more', bar.scrollWidth - bar.clientWidth - bar.scrollLeft > 4);
      };
      let queued = false;
      const ask = () => {
        if(queued) return;
        queued = true;
        window.requestAnimationFrame(sync);
      };
      bar.addEventListener('scroll', ask, {passive:true});
      window.addEventListener('scroll', ask, {passive:true});
      window.addEventListener('resize', ask);
      sync();
      window.setTimeout(sync, 600);
    });
  }

  /* 기능 함수: 게시판 댓글 영역 이동 + 10개 단위 페이지네이션 */
  function initCommentArea(){
    const slot = document.getElementById(BF_COMMENT.slotId);
    if(!slot) return;

    function moveArea(){
      const area = qs('.comment_area');
      if(!area) return null;
      if(!slot.contains(area)){
        const host = area.parentNode;
        slot.appendChild(area);
        const paging = qs('.tail_paging');
        if(paging && !area.contains(paging)) area.appendChild(paging);
        if(host && !host.id && !host.textContent.trim()) host.remove();
      }
      return area;
    }

    function setupPaging(area){
      qsa('.btn_box a', area).forEach(link => {
        if(link.dataset.bfNoJump === '1') return;
        link.dataset.bfNoJump = '1';
        link.addEventListener('click', e => e.preventDefault());
      });

      const list = qs('#bbs_tail', area);
      if(!list) return;

      let moreBtn = qs('.comment_more', area);
      if(!moreBtn){
        moreBtn = document.createElement('button');
        moreBtn.type = 'button';
        moreBtn.className = 'comment_more';
        list.parentNode.insertBefore(moreBtn, list.nextSibling);
      }

      let pager = qs('.comment_pager', area);
      if(!pager){
        pager = document.createElement('div');
        pager.className = 'comment_pager';
        moreBtn.parentNode.insertBefore(pager, moreBtn.nextSibling);
      }

      const pageSize = Number(BF_COMMENT.pageSize) || 10;
      const step = Math.min(Number(BF_COMMENT.stepSize) || pageSize, pageSize);
      let page = 1;
      let shown = step;
      let lastCount = -1;
      let lastServer = '';

      function pageButton(label, target, opts){
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.textContent = label;
        if(opts && opts.current) btn.classList.add('is_current');
        if(opts && opts.disabled) btn.disabled = true;
        else btn.addEventListener('click', () => {page = target; shown = step; render();});
        return btn;
      }

      let size = pageSize;
      moreBtn.addEventListener('click', () => {shown = Math.min(shown + step, size); render();});

      function render(){
        const items = Array.from(list.children).filter(el => el.tagName === 'LI');
        /* 게시판이 여러 페이지(서버에서 50개씩)면 우리 페이저는 끄고 게시판 페이저 하나만 — 두 벌이 겹치지 않게 */
        const tailPaging = qs('.tail_paging', area);
        const serverLinks = tailPaging ? qsa('.page a', tailPaging) : [];
        const serverPaged = serverLinks.length > 1;
        size = serverPaged ? Math.max(items.length, 1) : pageSize;
        const current = serverLinks.find(a => a.classList.contains('current'));
        const server = current ? current.textContent.trim() : '';
        if(server !== lastServer){ if(lastServer){page = 1; shown = step;} lastServer = server; }
        const total = Math.max(1, Math.ceil(items.length / size));
        if(items.length !== lastCount){
          if(lastCount !== -1 && items.length < lastCount){page = 1; shown = step;}
          lastCount = items.length;
        }
        if(page > total) page = total;
        if(page < 1) page = 1;

        const from = (page - 1) * size;
        const onPage = Math.min(size, Math.max(0, items.length - from));
        if(shown > onPage) shown = Math.max(step, onPage);
        items.forEach((li, i) => {li.hidden = !(i >= from && i < from + shown);});

        /* 더보기 */
        const rest = onPage - shown;
        moreBtn.hidden = rest <= 0;
        if(rest > 0) moreBtn.textContent = BF_COMMENT.moreLabel || '더 보기';

        pager.textContent = '';
        if(items.length > size){
          pager.appendChild(pageButton('‹', page - 1, {disabled:page <= 1}));
          for(let n = 1; n <= total; n += 1) pager.appendChild(pageButton(String(n), n, {current:n === page}));
          pager.appendChild(pageButton('›', page + 1, {disabled:page >= total}));
        }

        if(tailPaging){
          tailPaging.hidden = !serverPaged;
          serverLinks.forEach(a => { const n = String(Number(a.textContent)); if(n !== 'NaN' && a.textContent !== n) a.textContent = n; });   /* 01 → 1 */
          qsa('.page_prev, .page_next', tailPaging).forEach(a => a.classList.toggle('is_end', /^javascript:alert/i.test(a.getAttribute('href') || '')));
        }
      }

      render();
      if('MutationObserver' in window){
        let timer = null;
        new MutationObserver(() => {
          clearTimeout(timer);
          timer = setTimeout(render, 60);
        }).observe(list, {childList:true});
      }
    }

    function attempt(){
      const area = moveArea();
      if(area){setupPaging(area); return true;}
      return false;
    }
    retryUntil(attempt, BF_COMMENT.retryMs, BF_COMMENT.retryCount);
  }

  function initLottoEntryCount(){
    const boxes = qsa('#lotto_section .lotto_entry_count');
    if(!boxes.length) return;

    function paint(source){
      const n = parseInt(String(source.textContent || '').replace(/[^0-9]/g, ''), 10);
      if(isNaN(n)) return;
      const label = document.createElement('span');
      const strong = document.createElement('strong');
      strong.textContent = n.toLocaleString('ko-KR');
      label.appendChild(document.createTextNode('현재 '));
      label.appendChild(strong);
      label.appendChild(document.createTextNode('건 응모 중'));
      boxes.forEach(box => {
        box.textContent = '';
        box.appendChild(label.cloneNode(true));
        box.hidden = false;
      });
    }

    function attach(){
      const source = qs('.comment_area .re_count') || qs('.re_count');
      if(!source) return false;
      paint(source);
      if('MutationObserver' in window){
        new MutationObserver(() => paint(source)).observe(source, {childList:true, characterData:true, subtree:true});
      }
      return true;
    }

    retryUntil(attach, BF_COMMENT.retryMs, BF_COMMENT.retryCount);
  }

  /* 기능 함수: 관련상품 하단 버튼 생성/삽입 */
  function initRelatedGoodsButton(){
    const config = BF_RELATED_GOODS_BUTTON;
    if(!config.href) return;
    const isAnchor = String(config.href).charAt(0) === '#';

    function findTargets(){
      for(const selector of config.targets){
        const found = qsa(selector);
        if(found.length) return found;
      }
      return [];
    }

    function placeIn(targets){
      targets.slice(0, 1).forEach(target => {
        let box = qs('.item_btn_con', target);
        if(!box){
          box = document.createElement('div');
          box.className = 'item_btn_con';
          box.innerHTML = '<a></a>';
          target.appendChild(box);
        }

        const link = qs('a', box);
        if(!link) return;
        link.href = config.href;
        link.textContent = config.title;
        if(isAnchor){
          link.removeAttribute('target');
          link.removeAttribute('rel');
        } else {
          link.target = '_blank';
          link.rel = 'noopener';
        }
      });
    }

    function applyButton(){
      const targets = findTargets();
      if(!targets.length) return false;
      placeIn(targets);
      return true;
    }

    retryUntil(applyButton, config.retryMs, config.retryCount);

    /* 타이틀 '일부 관련상품' + 옆 '전 상품 보기' */
    function addHeadLink(){
      const head = document.getElementById('link_sh_relation');
      if(!head) return false;
      if(!config.head || qs('.bf_rs_all', head)) return true;
      const walker = document.createTreeWalker(head, NodeFilter.SHOW_TEXT);
      let t = null, n;
      while((n = walker.nextNode())){ if(n.nodeValue.trim()){ t = n; break; } }
      if(!t) return true;
      if(config.heading) t.nodeValue = t.nodeValue.replace(t.nodeValue.trim(), config.heading);
      const box = t.parentElement; box.classList.add('bf_rs_titled');
      const a = document.createElement('a');
      a.className = 'bf_rs_all' + (/^m\./i.test(location.hostname) ? ' is_mo' : '');
      a.textContent = config.title; a.href = config.href;
      if(!isAnchor){ a.target = '_blank'; a.rel = 'noopener'; }
      box.appendChild(a);
      return true;
    }
    retryUntil(addHeadLink, config.retryMs, 40);
  }

  function initCouponInfoTouch(){
    function closeCouponInfo(except){
      qsa('#coupon_section .coupon_info.is_open').forEach(el => {
        if(el !== except) el.classList.remove('is_open');
      });
    }
    document.addEventListener('click', function(e){
      const info = e.target && e.target.closest ? e.target.closest('#coupon_section .coupon_info') : null;
      if(info){
        e.preventDefault();
        e.stopPropagation();
        const willOpen = !info.classList.contains('is_open');
        closeCouponInfo(info);
        info.classList.toggle('is_open', willOpen);
        return;
      }
      closeCouponInfo(null);
    }, true);
    document.addEventListener('keydown', function(e){
      if(e.key === 'Escape') closeCouponInfo(null);
    });
  }

  function initTouchHints(){
    const selector = '#lotto_section .bf_lotto_hint_btn, #gift_section .bf_gift_purchase_hint_target, #luckybag_section .bf_luckybag_purchase_hint_target';
    function isTouchMode(){
      return window.matchMedia && (window.matchMedia('(max-width:768px)').matches || window.matchMedia('(hover:none) and (pointer:coarse)').matches);
    }
    function showHint(el){
      if(!el || !isTouchMode()) return;
      el.classList.add('bf_touch_hint_show');
      if(el.__bfTouchHintTimer) clearTimeout(el.__bfTouchHintTimer);
      el.__bfTouchHintTimer = setTimeout(() => {
        el.classList.remove('bf_touch_hint_show');
      }, 900);
    }
    const onTap = e => {
      const target = e.target && e.target.closest ? e.target.closest(selector) : null;
      if(target) showHint(target);
    };
    document.addEventListener('pointerdown', onTap, {passive:true});
    document.addEventListener('click', onTap, {passive:true});
    document.addEventListener('keydown', function(e){
      if(e.key === 'Escape') qsa('.bf_touch_hint_show').forEach(el => el.classList.remove('bf_touch_hint_show'));
    });
  }

  /* 초기화 */
  document.addEventListener('DOMContentLoaded', function(){
    renderManagedContent();
    initRelatedGoodsButton();
    initTabDragScroll();
    initCommentArea();
    initLottoEntryCount();
    initMainTimer();
    initCoupons();
    initCouponTimer();
    initModals();
    initCouponInfoTouch();
    initTouchHints();
    initMobileStickyClone();
    initStickyMoreHint();
    initSticky();
    initCountUp();
    initLazyDailySections();
    initLotto();
    initScrollAnimations();
    initRankingResize();
    initLazyRanking();
  });
})();

