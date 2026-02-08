"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/utils/supabase/client";

const TICKER_STORAGE_KEY = "lunch-vote-ticker-closed";

type TickerItem = {
  id: string;
  name: string;
  room_id: string;
};

const MESSAGES: ((name: string) => React.ReactNode)[] = [
  (name) => (
    <>
      지금 누군가 <span className="font-semibold text-[#FF6B00]">[{name}]</span>을(를) 후보에 등록했습니다! 🔥
    </>
  ),
  (name) => (
    <>
      서울 어딘가에서 <span className="font-semibold text-[#FF6B00]">[{name}]</span> 투표 중! 🥓
    </>
  ),
  (name) => (
    <>
      방금 <span className="font-semibold text-[#FF6B00]">[{name}]</span>이(가) 등록됐어요 ✨
    </>
  ),
  (name) => (
    <>
      <span className="font-semibold text-[#FF6B00]">[{name}]</span> 후보 등록! 오늘 메뉴 후보에 합류 🍽️
    </>
  ),
  (name) => (
    <>
      어디선가 <span className="font-semibold text-[#FF6B00]">[{name}]</span> 투표가 진행 중이에요 📍
    </>
  ),
];

function pickMessage(name: string, index: number): React.ReactNode {
  return MESSAGES[index % MESSAGES.length](name);
}

function getInitialVisible(): boolean {
  if (typeof window === "undefined") return true;
  return sessionStorage.getItem(TICKER_STORAGE_KEY) !== "true";
}

export default function LiveTicker() {
  const [visible, setVisible] = useState<boolean | null>(null);
  const [items, setItems] = useState<TickerItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setVisible(getInitialVisible());
  }, []);

  const handleClose = useCallback(() => {
    setVisible(false);
    if (typeof window !== "undefined") {
      sessionStorage.setItem(TICKER_STORAGE_KEY, "true");
    }
  }, []);

  const fetchCandidates = useCallback(async () => {
    const { data, error } = await supabase
      .from("candidates")
      .select("id, name, room_id")
      .order("created_at", { ascending: false })
      .limit(10);

    if (!error && data?.length) {
      setItems(data as TickerItem[]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchCandidates();
  }, [fetchCandidates]);

  useEffect(() => {
    const channel = supabase
      .channel("live-ticker-candidates")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "candidates" },
        () => {
          fetchCandidates();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchCandidates]);

  if (visible === null || !visible) return null;

  if (loading && items.length === 0) {
    return (
      <div className="relative flex h-10 w-full items-center justify-center border-b border-gray-200 bg-white/95 px-4 backdrop-blur-sm">
        <span className="text-sm text-gray-500">실시간 투표 불러오는 중…</span>
        <button
          type="button"
          onClick={handleClose}
          className="absolute right-2 top-1/2 z-10 -translate-y-1/2 rounded p-1.5 text-gray-400 transition hover:bg-gray-100 hover:text-gray-600"
          aria-label="티커 닫기"
        >
          <span className="text-lg leading-none">×</span>
        </button>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="relative flex h-10 w-full items-center justify-center border-b border-gray-200 bg-white/95 px-4 backdrop-blur-sm">
        <span className="text-sm text-gray-500">
          아직 등록된 후보가 없어요. 첫 번째로 등록해 보세요!
        </span>
        <button
          type="button"
          onClick={handleClose}
          className="absolute right-2 top-1/2 z-10 -translate-y-1/2 rounded p-1.5 text-gray-400 transition hover:bg-gray-100 hover:text-gray-600"
          aria-label="티커 닫기"
        >
          <span className="text-lg leading-none">×</span>
        </button>
      </div>
    );
  }

  const tickerContent = items.map((item, i) => (
    <span
      key={item.id}
      className="shrink-0 cursor-default whitespace-nowrap text-sm font-medium text-gray-700"
    >
      {pickMessage(item.name, i)}
    </span>
  ));

  return (
    <div
      className="relative flex h-10 w-full items-center overflow-hidden border-b border-gray-200 bg-white/95 py-2 backdrop-blur-sm"
      aria-label="실시간 점심 투표 현황"
    >
      <span className="z-10 ml-2 shrink-0 rounded bg-[#FFF5EF] px-2 py-0.5 text-xs font-medium text-[#FF6B00]">
        Live
      </span>
      <div className="flex min-w-0 flex-1 overflow-hidden pr-10">
        <div className="flex animate-marquee items-center gap-8 whitespace-nowrap py-1 pl-4">
          {tickerContent}
          <span className="shrink-0 text-gray-300" aria-hidden>
            •
          </span>
          {tickerContent}
          <span className="shrink-0 text-gray-300" aria-hidden>
            •
          </span>
        </div>
      </div>
      <button
        type="button"
        onClick={handleClose}
        className="absolute right-2 top-1/2 z-10 -translate-y-1/2 rounded p-1.5 text-gray-400 transition hover:bg-gray-100 hover:text-gray-600"
        aria-label="티커 닫기"
      >
        <span className="text-lg leading-none">×</span>
      </button>
    </div>
  );
}
