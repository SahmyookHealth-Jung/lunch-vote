// utils/menuData.ts

export type Category = 'korean' | 'chinese' | 'japanese' | 'western' | 'all';

export interface Menu {
  id: number;
  name: string;
  category: Category;
  img?: string; // 나중에 이미지 넣을 때를 대비
}

export const MENUS: Record<string, string[]> = {
  korean: [
    "김치찌개", "된장찌개", "부대찌개", "비빔밥", "불고기", 
    "삼겹살", "제육볶음", "떡볶이", "순대국", "갈비탕", 
    "닭갈비", "찜닭", "족발/보쌈", "감자탕", "칼국수", 
    "냉면", "콩국수", "김밥", "설렁탕", "육개장"
  ],
  chinese: [
    "짜장면", "짬뽕", "탕수육", "볶음밥", "마파두부", 
    "양꼬치", "마라탕", "마라샹궈", "깐풍기", "유린기", 
    "딤섬", "동파육", "고추잡채", "울면", "군만두"
  ],
  japanese: [
    "초밥(스시)", "돈카츠", "라멘", "우동", "소바(메밀국수)", 
    "가츠동(돈까스덮밥)", "규동(소고기덮밥)", "사케동(연어덮밥)", 
    "텐동(튀김덮밥)", "오코노미야키", "타코야키", "스키야키", 
    "카레라이스", "회(사시미)", "나베"
  ],
  western: [
    "피자", "토마토 파스타", "크림 파스타", "스테이크", "수제버거", 
    "샐러드", "샌드위치", "리조또", "그라탕", "바베큐 폭립", 
    "브런치", "타코/부리또", "감바스", "라자냐", "치킨(프라이드)"
  ]
};

// 전체 메뉴를 평탄화(Flatten)해서 가져오는 함수 (뽑기용)
export const getAllMenus = () => {
  return [
    ...MENUS.korean,
    ...MENUS.chinese,
    ...MENUS.japanese,
    ...MENUS.western
  ];
};