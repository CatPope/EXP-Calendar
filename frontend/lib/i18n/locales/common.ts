import type { NamespaceDict } from "../dict";

// namespace: common — 공용/네비/공통 컴포넌트.
export const common: NamespaceDict = {
  ko: {
    // login
    loginTagline: "일정을 완료할 때마다 EXP와 코인을 얻고, 칭호를 모아 보세요.",
    loginNeedSignup: "등록되지 않은 계정입니다. 회원가입을 진행해주세요.",
    loginAlreadyExists: "이미 가입된 계정입니다. 로그인으로 전환했습니다.",
    loginGooglePreparing: "Google 로그인 준비 중...",
    loginGoogleUnconfigured: "이메일로 시작하기",
    devSignup: "회원가입",
    devLogin: "로그인",
    emailPlaceholder: "이메일",
    passwordPlaceholder: "비밀번호",
    displayNamePlaceholder: "표시 이름",
    processing: "처리 중...",
    switchToLogin: "이미 계정이 있나요? 로그인",
    switchToSignup: "계정이 없나요? 회원가입",
    // onboarding
    tendencyEasy: "쉬움 (EASY)",
    tendencyEasyDesc: "1.2x 보상 — 부담 없이 시작합니다.",
    tendencyNormal: "보통 (NORMAL)",
    tendencyNormalDesc: "1.0x 보상 — 균형 잡힌 진행.",
    tendencyHard: "어려움 (HARD)",
    tendencyHardDesc: "0.8x 보상 — 도전자에게 추천.",
    onboardingTitle: "시작하기 전에...",
    onboardingSubtitle: "난이도 성향을 선택하세요. 언제든 변경할 수 있습니다.",
    saving: "저장 중...",
    getStarted: "시작하기",
    // home
    brandLoading: "EXP Calendar 로딩 중...",
    // offline
    offlineMetaTitle: "오프라인 — EXP Calendar",
    offlineTitle: "오프라인 상태",
    offlineBody: "네트워크 연결이 끊어졌습니다. 다시 연결되면 자동으로 동기화됩니다.",
    // nav
    navCalendar: "캘린더",
    navShop: "상점",
    navShowcase: "쇼케이스",
    navPersona: "페르소나",
    logout: "로그아웃",
    // HUD
    openMenu: "메뉴 열기",
    todayLabel: "오늘",
    // reward toast
    scheduleComplete: "일정 완료!",
    levelUp: "레벨 업! → Lv. {level}",
    newTitle: "신규 칭호",
    dailyCapReached: "일일 코인 한도에 도달했습니다.",
    // generic
    loading: "불러오는 중...",
    close: "닫기",
    // error boundary
    errorBoundaryTitle: "문제가 발생했습니다",
    errorBoundaryBody: "화면을 표시하는 중 오류가 발생했습니다. 다시 시도해 주세요.",
    retry: "다시 시도"
  },
  en: {
    // login
    loginTagline: "Earn EXP and Coins every time you complete a schedule, and collect Titles.",
    loginNeedSignup: "This account is not registered. Please sign up.",
    loginAlreadyExists: "This account already exists. Switched to log in.",
    loginGooglePreparing: "Preparing Google sign-in...",
    loginGoogleUnconfigured: "Get started with email",
    devSignup: "Sign Up",
    devLogin: "Log In",
    emailPlaceholder: "Email",
    passwordPlaceholder: "Password",
    displayNamePlaceholder: "Display name",
    processing: "Processing...",
    switchToLogin: "Already have an account? Log in",
    switchToSignup: "No account? Sign up",
    // onboarding
    tendencyEasy: "Easy (EASY)",
    tendencyEasyDesc: "1.2x reward — start with no pressure.",
    tendencyNormal: "Normal (NORMAL)",
    tendencyNormalDesc: "1.0x reward — a balanced pace.",
    tendencyHard: "Hard (HARD)",
    tendencyHardDesc: "0.8x reward — recommended for challengers.",
    onboardingTitle: "Before you start...",
    onboardingSubtitle: "Choose your difficulty preference. You can change it anytime.",
    saving: "Saving...",
    getStarted: "Get Started",
    // home
    brandLoading: "Loading EXP Calendar...",
    // offline
    offlineMetaTitle: "Offline — EXP Calendar",
    offlineTitle: "You're Offline",
    offlineBody: "The network connection was lost. It will sync automatically once reconnected.",
    // nav
    navCalendar: "Calendar",
    navShop: "Shop",
    navShowcase: "Showcase",
    navPersona: "Persona",
    logout: "Log out",
    // HUD
    openMenu: "Open menu",
    todayLabel: "Today",
    // reward toast
    scheduleComplete: "Schedule complete!",
    levelUp: "Level up! → Lv. {level}",
    newTitle: "New Title",
    dailyCapReached: "You've reached the daily Coins cap.",
    // generic
    loading: "Loading...",
    close: "Close",
    // error boundary
    errorBoundaryTitle: "Something went wrong",
    errorBoundaryBody: "An error occurred while rendering the screen. Please try again.",
    retry: "Try again"
  },
  ja: {
    // login
    loginTagline: "予定を完了するたびにEXPとコインを獲得し、称号を集めましょう。",
    loginNeedSignup: "登録されていないアカウントです。新規登録を進めてください。",
    loginAlreadyExists: "すでに登録済みのアカウントです。ログインに切り替えました。",
    loginGooglePreparing: "Googleログインを準備中...",
    loginGoogleUnconfigured: "メールで始める",
    devSignup: "新規登録",
    devLogin: "ログイン",
    emailPlaceholder: "メールアドレス",
    passwordPlaceholder: "パスワード",
    displayNamePlaceholder: "表示名",
    processing: "処理中...",
    switchToLogin: "すでにアカウントをお持ちですか？ログイン",
    switchToSignup: "アカウントがありませんか？新規登録",
    // onboarding
    tendencyEasy: "易しい (EASY)",
    tendencyEasyDesc: "1.2x報酬 — 気軽に始められます。",
    tendencyNormal: "普通 (NORMAL)",
    tendencyNormalDesc: "1.0x報酬 — バランスの取れた進行。",
    tendencyHard: "難しい (HARD)",
    tendencyHardDesc: "0.8x報酬 — 挑戦者におすすめ。",
    onboardingTitle: "始める前に...",
    onboardingSubtitle: "難易度の傾向を選択してください。いつでも変更できます。",
    saving: "保存中...",
    getStarted: "始める",
    // home
    brandLoading: "EXP Calendar 読み込み中...",
    // offline
    offlineMetaTitle: "オフライン — EXP Calendar",
    offlineTitle: "オフライン状態",
    offlineBody: "ネットワーク接続が切断されました。再接続されると自動的に同期されます。",
    // nav
    navCalendar: "カレンダー",
    navShop: "ショップ",
    navShowcase: "ショーケース",
    navPersona: "ペルソナ",
    logout: "ログアウト",
    // HUD
    openMenu: "メニューを開く",
    todayLabel: "今日",
    // reward toast
    scheduleComplete: "予定を完了しました！",
    levelUp: "レベルアップ！ → Lv. {level}",
    newTitle: "新しい称号",
    dailyCapReached: "1日のコイン上限に達しました。",
    // generic
    loading: "読み込み中...",
    close: "閉じる",
    // error boundary
    errorBoundaryTitle: "問題が発生しました",
    errorBoundaryBody: "画面の表示中にエラーが発生しました。もう一度お試しください。",
    retry: "再試行"
  }
};
