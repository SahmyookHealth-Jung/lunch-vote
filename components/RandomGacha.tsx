"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { fetchAllMenusFromDB } from "@/utils/menuData";

const ROLL_DURATION_MS = 2500;
const ROLL_INTERVAL_MS = 80;

export interface RandomGachaProps {
  onCreateRoomWithMenu: (menuName: string) => void | Promise<void>;
  isPending?: boolean;
}

export default function RandomGacha({ onCreateRoomWithMenu, isPending = false }: RandomGachaProps) {
  const [rolling, setRolling] = useState(false);
  const [displayText, setDisplayText] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  
  // DB에서 메뉴 로딩
  const [menus, setMenus] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadMenus = async () => {
      setLoading(true);
      const menusList = await fetchAllMenusFromDB();
      setMenus(menusList);
      setLoading(false);
    };
    loadMenus();
  }, []);

  const startRoll = useCallback(() => {
    if (rolling || menus.length === 0) return;
    setRolling(true);
    setResult(null);
    let elapsed = 0;
    intervalRef.current = setInterval(() => {
      elapsed += ROLL_INTERVAL_MS;
      setDisplayText(menus[Math.floor(Math.random() * menus.length)] ?? "");
      if (elapsed >= ROLL_DURATION_MS) {
        if (intervalRef.current) clearInterval(intervalRef.current);
        intervalRef.current = null;
        const final = menus[Math.floor(Math.random() * menus.length)] ?? menus[0];
        setDisplayText(final);
        setResult(final);
        setRolling(false);
      }
    }, ROLL_INTERVAL_MS);
  }, [rolling, menus]);

  const handleAgain = useCallback(() => {
    setResult(null);
    setDisplayText(null);
    startRoll();
  }, [startRoll]);

  // 로딩 화면
  if (loading) {
    return (
      <div className="flex min-h-[200px] w-full items-center justify-center rounded-2xl border border-gray-200/80 bg-white/80 p-6 shadow-md backdrop-blur-sm sm:p-8">
        <p className="text-gray-500">메뉴 불러오는 중…</p>
      </div>
    );
  }

  return (
    <div className="w-full rounded-2xl border border-gray-200/80 bg-white/80 p-6 shadow-md backdrop-blur-sm sm:p-8">
      <div className="flex min-h-[160px] flex-col items-center justify-center gap-5 sm:min-h-[200px] sm:gap-6">
        {!result ? (
          <>
            <div
              className="flex min-h-[3.5rem] w-full items-center justify-center rounded-xl border-2 border-dashed border-gray-200 bg-[#F9F9F9] px-4 py-4 text-center text-lg font-semibold leading-snug text-gray-800 sm:min-h-[4rem] sm:text-xl"
              aria-live="polite"
            >
              {displayText ?? "메뉴를 뽑아보세요"}
            </div>
            <button
              type="button"
              onClick={startRoll}
              disabled={rolling}
              className="flex min-h-[52px] w-full items-center justify-center rounded-xl bg-[#FF6B00] py-4 text-lg font-bold leading-none text-white shadow-md transition hover:bg-[#e55f00] disabled:opacity-70 sm:min-h-[56px] sm:py-5 sm:text-xl"
            >
              {rolling ? "뽑는 중…" : "🎲 메뉴 뽑기"}
            </button>
          </>
        ) : (
          <>
            <p className="text-center text-sm font-medium text-gray-500">
              뽑은 메뉴
            </p>
            <p className="text-center text-2xl font-bold leading-tight text-gray-800 sm:text-3xl">
              {result}
            </p>
            <div className="flex w-full flex-col gap-3 sm:flex-row sm:gap-4">
              <button
                type="button"
                onClick={handleAgain}
                className="flex min-h-[48px] flex-1 items-center justify-center rounded-xl border-2 border-gray-200 py-3 font-semibold leading-tight text-gray-700 transition hover:bg-gray-50"
              >
                다시 뽑기
              </button>
              <button
                type="button"
                onClick={() => onCreateRoomWithMenu(result)}
                disabled={isPending}
                className="flex min-h-[48px] flex-1 items-center justify-center rounded-xl bg-[#FF6B00] py-3 font-semibold leading-tight text-white shadow-md transition hover:bg-[#e55f00] disabled:opacity-60"
              >
                <span className="block text-center leading-tight">
                  {isPending ? (
                    "만드는 중…"
                  ) : (
                    <>
                      이걸로 결정
                      <br />
                      (방 만들기)
                    </>
                  )}
                </span>
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
