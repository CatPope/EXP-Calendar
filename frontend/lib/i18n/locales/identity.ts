import type { NamespaceDict } from "../dict";

// namespace: identity — 페르소나·칭호 메인(열람)/설정(편집) [v1.4].
export const identity: NamespaceDict = {
  ko: {
    // page titles
    title: "페르소나 · 칭호",
    subtitle: "내 캐릭터 정체성 관리",
    settingsTitle: "페르소나 · 칭호 설정",

    // header actions
    edit: "편집 · 관리",
    titlesCount: "획득 {n}개",

    // identity card
    myIdentity: "내 정체성",
    currentSkin: "현재 스킨",
    skinLabel: "외형",
    toneLabel: "말투 · 성격",
    ratingLabel: "등급",

    // active titles section
    activeTitlesSection: "칭호 · 장착·전시 중",
    manageTitles: "칭호 관리",
    equip: "장착",
    unequip: "장착 해제",
    display: "전시",
    undisplay: "전시 해제",
    equipped: "장착됨",
    displayed: "전시",
    notDisplayed: "미전시",
    noActiveTitles: "장착 또는 전시 중인 칭호가 없습니다.",

    // penalty banner
    penaltyActive: "페널티 활성",
    penaltyBanner: "전시 중인 〈{name}〉 칭호에 페널티가 적용 중입니다",
    recoverInSettings: "설정에서 복구",

    // read-only info boxes
    history: "역사 · 배경",
    thoughts: "자주 하는 생각",
    noHistory: "역사·배경이 설정되지 않았습니다.",
    noThoughts: "자주 하는 생각이 설정되지 않았습니다.",

    // settings page — skin section
    skinSection: "스킨 (외형)",
    changeSkin: "스킨 변경",
    skinNote: "새 스킨은 [스킨 뽑기]에서 획득할 수 있습니다.",

    // settings page — persona section
    makePersonality: "성격 만들기",
    name: "이름",
    namePlaceholder: "캐릭터 이름",
    nameCounter: "{n}/16",
    toneFieldLabel: "말투 · 성격",
    tonePlaceholder: "예) 무뚝뚝하지만 속마음은 따뜻함",
    toneCounter: "{n}/60",
    historyFieldLabel: "역사 · 배경",
    historyPlaceholder: "캐릭터의 이야기나 배경을 적어보세요",
    historyCounter: "{n}/300",
    thoughtsFieldLabel: "자주 하는 생각",
    thoughtsPlaceholder: "캐릭터가 자주 생각하는 것들",
    thoughtsCounter: "{n}/200",
    save: "저장",
    saving: "저장 중...",
    reset: "되돌리기",
    saveSuccess: "페르소나를 저장했습니다.",
    statusNote: "상태 메시지(대사)는 [통계·등급]에서 수정합니다.",

    // settings page — titles section
    titlesSection: "칭호 장착 · 전시",
    titlesLoading: "칭호 불러오는 중...",
    titlesEmpty: "보유한 칭호가 없습니다.",
    acquiredAt: "획득: {date}",
    penalty: "페널티",
    penaltyLabel: "페널티: {modifier}",

    // settings page — penalty recovery section
    recoverSection: "페널티 · 강등 복구",
    recoverNormal: "정상 완료로 복구",
    recoverNormalDesc: "일정을 정상적으로 완료하면 페널티가 해제됩니다.",
    useDefense: "방어권 사용 ({n})",
    useDefenseNone: "방어권 없음",
    defenseSuccess: "방어권을 사용했습니다. 페널티가 복구되었습니다.",
    defensePartial: "방어권을 사용했습니다.",

    // all-titles catalog (v1.4)
    allTitlesSection: "전체 칭호",
    progress: "진행 {cur}/{max}",
    locked: "잠김",
    lockedHint: "조건 달성 시 획득",

    // AI 페르소나 한마디
    aiTitle: "나의 한마디",
    aiDesc: "하고 싶은 말을 입력하면 내 페르소나 말투로 변환해 쇼케이스/프로필에 게시합니다.",
    aiPlaceholder: "예: 오늘은 정말 열심히 했다.",
    aiCounter: "{n}/300",
    convert: "변환",
    converting: "변환 중...",
    postShowcase: "쇼케이스 게시",
    posting: "게시 중...",
    resultTitle: "변환 결과",
    aiPostSuccess: "쇼케이스에 게시되었습니다.",
    aiNeedConvert: "먼저 변환 버튼을 눌러 결과를 확인한 뒤 게시해 주세요. 텍스트를 수정했다면 다시 변환이 필요합니다.",

    // cosmetics
    cosmeticSection: "코스메틱",
    cosmeticEmpty: "상점에서 코스메틱을 구매하세요.",
    cosmeticEquip: "장착",
    cosmeticEquipped: "장착됨",
    cosmeticUnequip: "장착 안 함",
    cos_hat: "픽셀 모자",
    cos_crown: "황금 왕관",
    cos_aura: "네온 오라",
    cos_bg_space: "배경: 우주",
    cos_bg_forest: "숲 배경",

    // common
    loading: "불러오는 중...",
    back: "← 메인",
    penalty_section_heading: "페널티 복구"
  },
  en: {
    title: "Persona · Titles",
    subtitle: "Manage your character identity",
    settingsTitle: "Persona · Titles Settings",

    edit: "Edit · Manage",
    titlesCount: "{n} acquired",

    myIdentity: "My Identity",
    currentSkin: "Current Skin",
    skinLabel: "Appearance",
    toneLabel: "Tone · Personality",
    ratingLabel: "Rating",

    activeTitlesSection: "Titles · Equipped & Displayed",
    manageTitles: "Manage Titles",
    equip: "Equip",
    unequip: "Unequip",
    display: "Display",
    undisplay: "Undisplay",
    equipped: "Equipped",
    displayed: "Displayed",
    notDisplayed: "Not Displayed",
    noActiveTitles: "No titles are equipped or displayed.",

    penaltyActive: "Penalty Active",
    penaltyBanner: "The title 〈{name}〉 on display has an active penalty",
    recoverInSettings: "Recover in settings",

    history: "History · Background",
    thoughts: "Frequent Thoughts",
    noHistory: "No history or background set.",
    noThoughts: "No frequent thoughts set.",

    skinSection: "Skin (Appearance)",
    changeSkin: "Change Skin",
    skinNote: "New skins can be obtained from [Skin Draw].",

    makePersonality: "Create Personality",
    name: "Name",
    namePlaceholder: "Character name",
    nameCounter: "{n}/16",
    toneFieldLabel: "Tone · Personality",
    tonePlaceholder: "e.g. Aloof but warm inside",
    toneCounter: "{n}/60",
    historyFieldLabel: "History · Background",
    historyPlaceholder: "Write your character's story or background",
    historyCounter: "{n}/300",
    thoughtsFieldLabel: "Frequent Thoughts",
    thoughtsPlaceholder: "Things your character often thinks about",
    thoughtsCounter: "{n}/200",
    save: "Save",
    saving: "Saving...",
    reset: "Reset",
    saveSuccess: "Persona saved.",
    statusNote: "Status message (dialogue) is edited in [Stats & Rating].",

    titlesSection: "Title Equip · Display",
    titlesLoading: "Loading titles...",
    titlesEmpty: "You have no titles.",
    acquiredAt: "Acquired: {date}",
    penalty: "Penalty",
    penaltyLabel: "Penalty: {modifier}",

    recoverSection: "Penalty · Demotion Recovery",
    recoverNormal: "Recover via normal completion",
    recoverNormalDesc: "Complete schedules normally to remove penalties.",
    useDefense: "Use Defense Ticket ({n})",
    useDefenseNone: "No defense tickets",
    defenseSuccess: "Defense ticket used. Penalty cleared.",
    defensePartial: "Defense ticket used.",

    // all-titles catalog (v1.4)
    allTitlesSection: "All Titles",
    progress: "Progress {cur}/{max}",
    locked: "Locked",
    lockedHint: "Unlock by completing the condition",

    aiTitle: "My Voice",
    aiDesc: "Type something and it's converted into your persona's voice and published to your showcase/profile.",
    aiPlaceholder: "e.g. I really worked hard today.",
    aiCounter: "{n}/300",
    convert: "Convert",
    converting: "Converting...",
    postShowcase: "Post to Showcase",
    posting: "Posting...",
    resultTitle: "Converted Result",
    aiPostSuccess: "Posted to the showcase.",
    aiNeedConvert: "Press Convert first to preview the result before publishing. If you edited the text, convert again.",

    // cosmetics
    cosmeticSection: "Cosmetics",
    cosmeticEmpty: "Purchase cosmetics from the shop.",
    cosmeticEquip: "Equip",
    cosmeticEquipped: "Equipped",
    cosmeticUnequip: "Unequip",
    cos_hat: "Pixel Hat",
    cos_crown: "Golden Crown",
    cos_aura: "Neon Aura",
    cos_bg_space: "Background: Space",
    cos_bg_forest: "Forest Background",

    loading: "Loading...",
    back: "← Main",
    penalty_section_heading: "Penalty Recovery"
  },
  ja: {
    title: "ペルソナ · 称号",
    subtitle: "キャラクターのアイデンティティ管理",
    settingsTitle: "ペルソナ · 称号設定",

    edit: "編集 · 管理",
    titlesCount: "{n}個取得",

    myIdentity: "マイアイデンティティ",
    currentSkin: "現在のスキン",
    skinLabel: "外見",
    toneLabel: "口調 · 性格",
    ratingLabel: "評価",

    activeTitlesSection: "称号 · 装備·展示中",
    manageTitles: "称号管理",
    equip: "装備",
    unequip: "装備解除",
    display: "展示",
    undisplay: "展示解除",
    equipped: "装備中",
    displayed: "展示",
    notDisplayed: "非展示",
    noActiveTitles: "装備または展示中の称号がありません。",

    penaltyActive: "ペナルティ有効",
    penaltyBanner: "展示中の〈{name}〉称号にペナルティが適用されています",
    recoverInSettings: "設定で復旧",

    history: "歴史 · 背景",
    thoughts: "よく考えること",
    noHistory: "歴史・背景が設定されていません。",
    noThoughts: "よく考えることが設定されていません。",

    skinSection: "スキン（外見）",
    changeSkin: "スキン変更",
    skinNote: "新しいスキンは[スキンガチャ]で入手できます。",

    makePersonality: "性格作成",
    name: "名前",
    namePlaceholder: "キャラクター名",
    nameCounter: "{n}/16",
    toneFieldLabel: "口調 · 性格",
    tonePlaceholder: "例）無愛想だが心は温かい",
    toneCounter: "{n}/60",
    historyFieldLabel: "歴史 · 背景",
    historyPlaceholder: "キャラクターの話や背景を書いてください",
    historyCounter: "{n}/300",
    thoughtsFieldLabel: "よく考えること",
    thoughtsPlaceholder: "キャラクターがよく考えること",
    thoughtsCounter: "{n}/200",
    save: "保存",
    saving: "保存中...",
    reset: "元に戻す",
    saveSuccess: "ペルソナを保存しました。",
    statusNote: "ステータスメッセージ（セリフ）は[統計・評価]で編集します。",

    titlesSection: "称号装備 · 展示",
    titlesLoading: "称号を読み込み中...",
    titlesEmpty: "称号を所持していません。",
    acquiredAt: "取得: {date}",
    penalty: "ペナルティ",
    penaltyLabel: "ペナルティ: {modifier}",

    recoverSection: "ペナルティ · 降格復旧",
    recoverNormal: "正常完了で復旧",
    recoverNormalDesc: "スケジュールを正常に完了するとペナルティが解除されます。",
    useDefense: "防御券使用 ({n})",
    useDefenseNone: "防御券なし",
    defenseSuccess: "防御券を使用しました。ペナルティが復旧されました。",
    defensePartial: "防御券を使用しました。",

    // all-titles catalog (v1.4)
    allTitlesSection: "全称号",
    progress: "進行 {cur}/{max}",
    locked: "ロック中",
    lockedHint: "条件達成で取得可能",

    aiTitle: "私のひとこと",
    aiDesc: "言いたいことを入力すると、ペルソナの口調に変換してショーケース・プロフィールに投稿します。",
    aiPlaceholder: "例：今日は本当に頑張った。",
    aiCounter: "{n}/300",
    convert: "変換",
    converting: "変換中...",
    postShowcase: "ショーケースに投稿",
    posting: "投稿中...",
    resultTitle: "変換結果",
    aiPostSuccess: "ショーケースに投稿しました。",
    aiNeedConvert: "先に変換ボタンを押して結果を確認してから投稿してください。テキストを編集した場合は再変換が必要です。",

    // cosmetics
    cosmeticSection: "コスメティック",
    cosmeticEmpty: "ショップでコスメティックを購入してください。",
    cosmeticEquip: "装備",
    cosmeticEquipped: "装備中",
    cosmeticUnequip: "装備解除",
    cos_hat: "ピクセル帽子",
    cos_crown: "黄金の王冠",
    cos_aura: "ネオンオーラ",
    cos_bg_space: "背景：宇宙",
    cos_bg_forest: "森の背景",

    loading: "読み込み中...",
    back: "← メイン",
    penalty_section_heading: "ペナルティ復旧"
  }
};
