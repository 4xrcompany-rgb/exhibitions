/* 4XR 대형 기획전 설정 — 추석. 이 파일만 기획전마다 바뀐다 (공통 기능 big_event.js 가 읽음) */
(function(){
  /* 이미지 기본 경로 */
  const BF_IMG = 'https://cdn-tgreen.bizhost.kr/phpskr/tgreen09/2026/09/14/HSH/img/';

  /* 기본 설정 */
  const BF_CONFIG = {
    eventStart: new Date('2026-09-14T10:00:00+09:00'),
    eventEnd: new Date('2026-09-27T23:59:59+09:00'),
    openHour: 10,
    couponOpenHour:10,
    dailyOpenHour:0,
    rankingRefreshMs: 180000,
    productImageBaseUrl: 'https://cdn-tgreen.bizhost.kr/files/goods/',
    visual: {
      effect: 'drop',
      alt: '2026 추석 기획전 - 다 너 잘되라고 그래',
      pc: {
        bg: BF_IMG + 'top/img_top_pc.jpg',
        layers: [
          {src: BF_IMG + 'top/img_top_title01.png', left: 33.4375, top: 60.5333, width: 33.125, alt: '다 너 잘되라고 그래'},
          {src: BF_IMG + 'top/img_top_title02.png', left: 57.8646, top: 66.8000, width: 8.6979, alt: 'feat.추석', effect: 'stamp'}
        ]
      },
      mobile: {
        bg: BF_IMG + 'top/img_top_m.jpg',
        layers: [
          {src: BF_IMG + 'top/img_top_title01.png', left: 13.8667, top: 71.0000, width: 72.2667, alt: '다 너 잘되라고 그래'},
          {src: BF_IMG + 'top/img_top_title02.png', left: 67.2000, top: 75.5556, width: 18.9333, alt: 'feat.추석', effect: 'stamp'}
        ]
      }
    }
  };

  /* 관련상품 '전 상품 보기' 버튼 — 하단 · 타이틀 옆(head) 둘 다 같은 글·링크. heading = 타이틀 글자(비우면 그대로) */
  const BF_RELATED_GOODS_BUTTON = {title:'전 상품 보기', href:'/bbs/read.php?index_no=21905&boardid=plantsale', head:true, heading:'일부 관련상품',
    targets:[
      '.magazine_view_wrap > .padding_02 > .mb10',
      '.connect_product_box',
      '.discount_view .goods_list > div:first-child',
      '.goods_list_nth'
    ],
    retryMs:250, retryCount:20};

  /* 쿠폰 */
  const BF_COUPON = {infoText:'사용 금액 제한 없음', soldoutText:'SOLD OUT',
    /* 매일 갱신 선착순 쿠폰이 있을 때만 items 에 넣는다 (비우면 카드·타이머를 안 만든다) */
    daily:{rate:'', sub:'', className:'is_daily', items:[]},
    specials:[
      {rate:'10%', sub:'추석 특별 쿠폰', idx:'868', className:'is_fixed', soldout:false},
      {rate:'5%', sub:'추석 특별 쿠폰', idx:'867', className:'is_fixed', soldout:false}
    ]
  };

  /* 상품권 */
  const BF_GIFT_ITEMS = [
    {title:'[2026 추석 상품권] 30만원권', hint:'30만원 상품권 구매하기', href:'/shop/view.php?index_no=692833',
      image:BF_IMG + 'giftcard/id/img_giftcard_thum_id30.png', originalPrice:300000, discountRate:5},
    {title:'[2026 추석 상품권] 50만원권', hint:'50만원 상품권 구매하기', href:'/shop/view.php?index_no=692834',
      image:BF_IMG + 'giftcard/id/img_giftcard_thum_id50.png', originalPrice:500000, discountRate:10},
    {title:'[2026 추석 상품권] 70만원권', hint:'70만원 상품권 구매하기', href:'/shop/view.php?index_no=692835',
      image:BF_IMG + 'giftcard/id/img_giftcard_thum_id70.png', originalPrice:700000, discountRate:15}
  ];

  /* 럭키백 영역 soldout:'auto'// 'auto' = 자동 판단(기본) / true = 무조건 품절 / false = 무조건 판매중 */
  const BF_LUCKYBAG = {
    href:'/shop/view.php?index_no=692836', priceText:'59,500원',
    alt:'2026 추석 럭키백', soldout:'auto', soldoutText:'SOLD OUT',
    stage:{
      height:700,
      base:{src:BF_IMG + 'luckybag/id/page_luckybag_thum_id03.png', effect:'moonrise', order:2, alt:'2026 추석 럭키백'},
      layers:[
        {src:BF_IMG + 'luckybag/id/page_luckybag_thum_id01.png', left:5, top:28, width:90, effect:'sky', order:0, alt:'이모의 사랑 가득'},
        {src:BF_IMG + 'luckybag/id/page_luckybag_thum_id02.png', left:25, top:16, width:50, effect:'sky', order:1, alt:'상/하의 랜덤 6상품'}
      ]
    },
    buttons:[
      {label:'2026 추석 럭키백 구매하기', href:'/shop/view.php?index_no=692836', hint:'2026 추석 럭키백 구매하기', soldout:false}
    ]
  };

  /* 유의사항 모달 */
  const BF_NOTICE_MODALS = [
    {id:'coupon_notice_modal', title:'유의사항',
      items:[
        '해당 기획전 등록 상품에 한해 사용 가능한 쿠폰입니다. (일부 상품 제외)',
        '쿠폰 사용 시 등급별 추가 할인 및 등급별 선할인 또는 적립이 제한될 수 있습니다.',
        '할인/적립(%) 쿠폰은 적립금 할인 등을 제외한 실제 결제 금액에 적용됩니다.',
        '쿠폰 적용 시 한 주문, 한 상품에 한해서만 적용됩니다. (복수 발급 쿠폰 제외)',
        '각 쿠폰은 사용 기한이 정해져 있습니다.',
        '주문 후 반품/환불의 경우 사용하신 쿠폰은 소멸됩니다.',
        '발급된 쿠폰은 <strong><a href="/mypage/mycoupen.php" target="_blank">‘마이페이지 \u0026gt; 쿠폰’</a></strong> 에서 확인할 수 있습니다.'
      ]
    },
    {id:'gift_notice_modal', title:'유의사항',
      items:[
        '구매하신 상품권은 예치금으로 지급되며 9월28일(월) 오후 15시에 일괄로 지급됩니다.',
        '예치금으로 구매하신 상품은 예치금으로 환불됩니다.',
        '보유하신 예치금은 온라인과 오프라인 매장 모두 사용하실 수 있습니다.',
        '상품권은 회원 전용 상품입니다. (적립금, 쿠폰 사용 불가)',
        '예치금 지급 이후 상품권에 대한 취소나 환불은 불가능합니다.',
        '예치금은 당사 정책에 따라 현금처럼 사용 가능합니다.'
      ]
    },
    {id:'review_notice_modal', title:'유의사항',
      items:[
        '법적, 윤리적 문제가 되는 댓글은 추첨 대상에서 제외합니다.',
        '적립금은 상품 금액의 최대 7% 까지 사용 가능하며 보유 적립금은 1년 후 자동 소멸 됩니다.',
        '주문 취소, 반품, 환불 시 지급 또는 사용된 적립금은 회수되거나 재조정될 수 있습니다.',
        '이벤트성 적립금은 동일 ID 기준 중복 지급이 제한될 수 있습니다.',
        '작성 기간이 만료 된 후기는 혜택 대상에서 제외됩니다.'
      ]},
    {id:'lotto_notice_modal', title:'유의사항',
      items:[
        '본 이벤트는 1인 1회 참여만 가능합니다. (중복 응모 시 당첨 제외)',
        '최종 당첨자는 단 1명입니다.',
        '번호가 중복될 경우 먼저 댓글을 남긴 순서로 당첨이 결정됩니다.',
        '숫자 외 다른 문자, 특수기호 등이 포함된 응모는 무효 처리될 수 있습니다.',
        '당첨자는 이벤트 종료 후 무작위 추첨 번호와 대조하여 경품이 지급됩니다.',
        '복사한 번호를 응모란에 정확히 붙여넣어야 정상 접수됩니다.',
        '당첨자 발표는 9월 29일(화) 이벤트 페이지를 통해 안내됩니다.',
        '당첨자 확인 및 지급 절차를 위해 고객센터에서 유선 연락이 진행될 수 있습니다.',
        '4XR 공식 고객센터 번호로만 연락이 갑니다. (1599-1916)',
        '당첨 시 제세공과금 처리를 위해 신분증 사본 제출이 요청됩니다.',
        '연락이 되지 않거나, 요청 자료 미제출 시 당첨이 취소될 수 있습니다.',
        '부정 참여, 자동화 응모, 타인 정보 도용 등 부정행위가 확인될 경우 응모는 무효 처리되며 법적 조치가 이뤄질 수 있습니다.',
        '본 이벤트는 당사 사정에 따라 사전 고지 없이 변경 또는 조기 종료될 수 있습니다.'
      ]
    }
  ];

  /* 로또 경품 모달 */
  const BF_PRIZE_MODAL = {id:'black_fry_prize_modal', title:'당첨자 경품', reward:'1,000,000', rewardUnit:'원', notice:'예치금 100만원 · 최종 당첨자 1명 지급'};

  /* 당첨자 발표 모달 */
  const BF_WINNER_MODAL = {
    id:'black_fry_winner_modal',
    released:false, /* true 당첨자 발표 노출 */
    title:'당첨자 발표',
    video:'https://cdn-tgreen.bizhost.kr/phpskr/tgreen09/2025/11/17/HSH/img/lotto/2025_11_25_09_13_35.mp4',
    winningNumbers:['1', '2', '3', '4', '5', '6']
  };

  /* 로또 UI 문구/버튼 */
  const BF_LOTTO_UI = {
    prizeIconLabel:'당첨자 경품 리스트 보기', prizeButtonText:'당첨자 경품 클릭', prizeModalId:'black_fry_prize_modal',
    flowHtml:'⚠️ <span>[숫자 6개]</span> 선택 또는 <span>[자동 번호 생성]</span> \u0026gt; <span>[복사하기]</span> \u0026gt; <span>[응모하기]</span> 숫자 댓글에 붙여넣고 제출하면 끝!',
    winnerModalId:'black_fry_winner_modal',
    winnerButtonText:'🎥 당첨자 발표',
    storageKey:'black_fry_lotto_selected_numbers_v1',
    closedMessage:'응모가 종료되었습니다.',
    buttons:[
      {id:'black_fry_generate_btn', label:'잔소리 말고 행운 번호 받기', hint:'6개 번호 자동 선택'},
      {id:'black_fry_reset_btn', label:'리셋', hint:'선택한 번호 모두 초기화'},
      {id:'black_fry_copy_btn', label:'복사하기', hint:'선택한 번호 자동 복사'},
      {id:'black_fry_submit_btn', label:'응모하기', hint:'복사 완료 후 응모 가능', extraClass:'lotto_btn_submit'}
    ],
    noticeModalId:'lotto_notice_modal'
  };

  /* 댓글 */
  const BF_COMMENT = {slotId:'lotto_comment_slot', pageSize:10, stepSize:5, moreLabel:'더 보기', retryMs:250, retryCount:20};

  /* 멤버십 */
  const BF_MEMBERSHIP = {moreLabel:'전체 혜택 더 보기', moreHref:'/center/benefit.php',
    items:[
      {title:'첫 주문', desc:'신규 가입 시 15% 쿠폰 + 3,000P', href:'/member/join.php', icon:'gift'},
      {title:'대표 혜택', desc:'등급별 | 생일 | 데일리 쿠폰 | 전 상품 무료 배송', href:'/center/benefit.php', icon:'coupon'},
      {title:'4XR APP', desc:'모바일 앱 다운 10% 쿠폰', href:'https://www.4xr.co.kr/app/down.php', icon:'app'},
      {title:'KAKAO PLUS', desc:'카카오톡 플친 5% 쿠폰', href:'https://pf.kakao.com/_xoxoiDZ', icon:'kakao'}
    ]
  };

  /* 데일리 상품 */
  const BF_QUICK = {
    imgDir: BF_IMG + 'quick/',
    /* nameMo / descMo : 모바일에서만 다르게 쓸 문구. 안 적으면 PC 문구(name/desc)를 그대로 쓴다. */
    items: [
      {img:'quick_copn.png', fx:'drop', size:100,   alt:'고모의 잔소리 쿠폰', name:'고모의 잔소리 쿠폰', nameMo:'잔소리 쿠폰',  desc:'추석 특별', descMo:'', href:'#coupon_section',    bg:'#eef2f7'},
      {img:'quick_gift.png', fx:'pulse', size:100,     alt:'추석 상품권',       name:'추석 상품권', nameMo:'',        desc:'할인 예치금', descMo:'', href:'#gift_section',      bg:'#f6eee9'},
      {img:'quick_luckybag.png', fx:'float', size:100, alt:'사랑 가득 럭키백',     name:'사랑 가득 럭키백', nameMo:'사랑의 럭키백',      desc:'6개 59,500', descMo:'', href:'#luckybag_section',  bg:'#eef4ee'},
      {img:'quick_new.png', fx:'sway', size:100,      alt:'고모의 신상 참견',  name:'고모의 신상 참견', nameMo:'신상 참견',   desc:'매일 특가 오픈', descMo:'', href:'#daily_section',     bg:'#f3eff7'},
      {img:'quick_half.png', fx:'spin', size:85,     alt:'이모의 가격 참견',  name:'이모의 가격 참견', nameMo:'가격 참견',   desc:'반값 특가', descMo:'',     href:'#daily_section02',   bg:'#f7f2e6'},
      {img:'quick_money.png', fx:'wobble', size:100,    alt:'후기 10배',        name:'후기 10배', nameMo:'',         desc:'1건당 1만원', descMo:'', href:'#review_section',  bg:'#eaf1f4'}
    ],
    band: {title:'로또 100만원', desc:'행운 추첨 번호와 일치한 단 1명만 지급',
           btn:'번호 뽑기', href:'#lotto_section'}
  };

  const BF_TITLE_IMG = {
    coupon:     'tt_coupon.png',
    gift:       'tt_gift.png',
    luckybag:   'tt_luckybag.png',
    daily01:    'tt_daily01.png',
    daily02:    'tt_daily02.png',
    review:     'tt_review.png',
    ranking:    'tt_ranking.png',
    lotto:      'tt_lotto_100.png',
    membership: 'tt_membership.png'
  };

  const BF_DAILY_VISUAL = {
    daily_01: {src: BF_IMG + 'pd/img_pd01.jpg', srcMobile: BF_IMG + 'pd/img_pd01_m.jpg', alt: '고모의 신상 참견'},
    daily_02: {src: BF_IMG + 'pd/img_pd02.jpg', srcMobile: BF_IMG + 'pd/img_pd02_m.jpg', alt: '이모의 가격 참견'}
  };

  const BF_DAILY_DATA = {
    daily_01: {  /* 고모의 신상 참견 */
      '2026-09-14': ['692779', '691818', '689213', '688958', '688630', '688454', '688440', '688005', '687875', '692632', '692239', '692220'],
      '2026-09-15': ['692112', '691817', '689212', '688940', '688618', '688453', '688439', '688004', '687892', '692631', '692238', '692167'],
      '2026-09-16': ['692111', '691816', '689200', '689094', '688530', '688452', '688438', '688003', '687873', '692630', '692237', '692165'],
      '2026-09-17': ['692098', '691813', '689474', '689093', '688529', '688451', '688353', '687990', '687891', '692629', '692236', '692164'],
      '2026-09-18': ['692097', '691692', '689199', '689092', '688526', '688450', '688312', '687991', '692727', '692628', '692235', '692163'],
      '2026-09-19': ['692096', '691691', '689097', '688633', '688525', '688449', '688284', '687950', '692726', '692627', '692234', '692156'],
      '2026-09-20': ['692072', '691486', '689217', '689091', '688524', '688448', '688342', '687890', '687872', '692626', '692233', '692037'],
      '2026-09-21': ['692071', '691485', '689216', '689090', '688523', '688447', '688341', '687886', '692693', '692503', '692232', '692036'],
      '2026-09-22': ['692070', '689944', '689473', '689089', '688522', '688446', '688340', '687885', '692692', '692408', '692230', '692034'],
      '2026-09-23': ['692027', '689943', '689469', '689088', '688521', '688445', '688339', '687884', '692691', '692407', '692229', '692033'],
      '2026-09-24': ['691935', '689570', '689096', '688632', '688458', '688444', '688354', '687883', '692690', '692406', '692228', '692032'],
      '2026-09-25': ['691934', '689475', '689215', '689087', '688457', '688443', '688246', '687893', '692635', '692242', '692227', '692031'],
      '2026-09-26': ['691915', '689927', '689214', '688959', '688456', '688442', '688210', '687880', '692634', '692241', '692226', '692030'],
      '2026-09-27': ['691819', '689218', '689095', '688631', '688455', '688441', '688282', '687879', '692633', '692240', '692224', '692035']
    },
    daily_02: {  /* 이모의 가격 참견 */
      '2026-09-14': ['668724', '671368', '669571', '689312', '664063', '620879', '689058', '634952', '685168', '668737', '681186', '689833'],
      '2026-09-15': ['668777', '689487', '669569', '689317', '669000', '673484', '691073', '691672', '647070', '672536', '688248', '689828'],
      '2026-09-16': ['685092', '640269', '689482', '691277', '673566', '656490', '664068', '668950', '687856', '689355', '672532', '688266'],
      '2026-09-17': ['673088', '668948', '689483', '635841', '631819', '657349', '691074', '685167', '689277', '671096', '673471', '689633'],
      '2026-09-18': ['668778', '640268', '669594', '689310', '689060', '689054', '647949', '673567', '672235', '689270', '672534', '690844'],
      '2026-09-19': ['669940', '646170', '669570', '689320', '690067', '668938', '668973', '634950', '647069', '668735', '687857', '689274'],
      '2026-09-20': ['671120', '690691', '617519', '689318', '669577', '668999', '664130', '634953', '668736', '667531', '689829', '689255'],
      '2026-09-21': ['671115', '617518', '631818', '689316', '689059', '689056', '668953', '672236', '667532', '686606', '673470', '689834'],
      '2026-09-22': ['671367', '689309', '689319', '657350', '635839', '668937', '691671', '689057', '681185', '688264', '686166', '689271'],
      '2026-09-23': ['671370', '615645', '691273', '691670', '673472', '668989', '691669', '673565', '667533', '672531', '689276', '686167'],
      '2026-09-24': ['669939', '659873', '689307', '668955', '679215', '635840', '664843', '673564', '687854', '673468', '688265', '686165'],
      '2026-09-25': ['671366', '689484', '689313', '685723', '668934', '679216', '691075', '673568', '687855', '688249', '689264', '689634'],
      '2026-09-26': ['677620', '668993', '689311', '635842', '669604', '689055', '647948', '634951', '672234', '672533', '689263', '689830'],
      '2026-09-27': ['671369', '643300', '689308', '666549', '668994', '664065', '634949', '668986', '672535', '688705', '688267', '689262']
    }
  };

  window.BF_EVENT = {
    img: BF_IMG,
    config: BF_CONFIG,
    relatedButton: BF_RELATED_GOODS_BUTTON,
    coupon: BF_COUPON,
    gift: BF_GIFT_ITEMS,
    luckybag: BF_LUCKYBAG,
    noticeModals: BF_NOTICE_MODALS,
    prizeModal: BF_PRIZE_MODAL,
    winnerModal: BF_WINNER_MODAL,
    lottoUi: BF_LOTTO_UI,
    comment: BF_COMMENT,
    membership: BF_MEMBERSHIP,
    quick: BF_QUICK,
    titleImg: BF_TITLE_IMG,
    dailyVisual: BF_DAILY_VISUAL,
    dailyData: BF_DAILY_DATA
  };
})();
