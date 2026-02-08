import { supabase } from '@/utils/supabase/client';

// 기존 타입 정의 유지
export type Category = 'korean' | 'chinese' | 'japanese' | 'western' | 'all';

// DB에서 가져올 데이터 형태
export interface MenuCandidate {
  id: number;
  name: string;
  category: string;
}

// [핵심] DB에서 메뉴를 가져와서, 기존 코드들이 쓰기 편한 형태로 바꿔주는 함수
export const fetchMenusFromDB = async () => {
  // 1. DB에서 모든 메뉴 가져오기
  const { data, error } = await supabase
    .from('menu_candidates')
    .select('*');

  if (error) {
    console.error('메뉴 로딩 실패:', error);
    return null;
  }

  // data가 null이면 빈 객체 반환
  if (!data || data.length === 0) {
    return {
      korean: [],
      chinese: [],
      japanese: [],
      western: []
    };
  }

  // 2. 데이터를 카테고리별로 묶기 (기존 코드 호환성 유지)
  const menus: Record<string, string[]> = {
    korean: [],
    chinese: [],
    japanese: [],
    western: []
  };

  data.forEach((item: MenuCandidate) => {
    if (menus[item.category]) {
      menus[item.category].push(item.name);
    }
  });

  return menus;
};

// [뽑기용] 전체 메뉴를 평탄화(Flatten)해서 가져오는 함수 (DB 버전)
export const fetchAllMenusFromDB = async () => {
  const { data, error } = await supabase
    .from('menu_candidates')
    .select('name'); // 이름만 가져오면 됨

  if (error) {
    console.error('메뉴 로딩 실패:', error);
    return [];
  }
  
  // data가 null이거나 비어있으면 빈 배열 반환
  if (!data || data.length === 0) {
    return [];
  }
  
  // [{name: '김치찌개'}, {name: '짜장면'}] -> ['김치찌개', '짜장면'] 으로 변환
  return data.map((item: { name: string }) => item.name);
};