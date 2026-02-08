"use client";

import { useState, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { getAllMenus } from "@/utils/menuData";

function shuffle<T>(arr: T[]): T[] {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

const SWIPE_THRESHOLD = 80;
const CARD_EXIT_OFFSET = 400;

export interface FoodTinderProps {
  onCreateRoomWithMenus: (menuNames: string[]) => void | Promise<void>;
  isPending?: boolean;
}

export default function FoodTinder({
  onCreateRoomWithMenus,
  isPending = false,
}: FoodTinderProps) {
  const [menus, setMenus] = useState<string[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [likedMenus, setLikedMenus] = useState<string[]>([]);
  const [showResult, setShowResult] = useState(false);
  const [exitDirection, setExitDirection] = useState<"left" | "right" | null>(null);
  const [isExiting, setIsExiting] = useState(false);
  const [dragX, setDragX] = useState(0);

  useEffect(() => {
    setMenus(shuffle(getAllMenus()));
  }, []);

  const currentMenu = menus[currentIndex];
  const swipedCount = currentIndex;

  useEffect(() => {
    if (menus.length > 0 && currentIndex >= menus.length) setShowResult(true);
  }, [menus.length, currentIndex]);

  const goNext = useCallback(() => {
    if (currentIndex >= menus.length) return;
    setCurrentIndex((i) => i + 1);
    if (currentIndex + 1 >= 10 || currentIndex + 1 >= menus.length) {
      setShowResult(true);
    }
  }, [currentIndex, menus.length]);

  const handleLike = useCallback(() => {
    if (!currentMenu || isExiting) return;
    setIsExiting(true);
    setExitDirection("right");
    setLikedMenus((prev) => [...prev, currentMenu]);
    setTimeout(() => {
      goNext();
      setExitDirection(null);
      setIsExiting(false);
    }, 200);
  }, [currentMenu, isExiting, goNext]);

  const handleDislike = useCallback(() => {
    if (!currentMenu || isExiting) return;
    setIsExiting(true);
    setExitDirection("left");
    setTimeout(() => {
      goNext();
      setExitDirection(null);
      setIsExiting(false);
    }, 200);
  }, [currentMenu, isExiting, goNext]);

  const handleDragEnd = useCallback(
    (_: unknown, info: { offset: { x: number }; velocity: { x: number } }) => {
      if (isExiting || !currentMenu) return;
      const { offset } = info;
      if (offset.x > SWIPE_THRESHOLD) {
        setLikedMenus((prev) => [...prev, currentMenu]);
        setExitDirection("right");
        setIsExiting(true);
        setTimeout(() => {
          goNext();
          setExitDirection(null);
          setIsExiting(false);
        }, 200);
      } else if (offset.x < -SWIPE_THRESHOLD) {
        setExitDirection("left");
        setIsExiting(true);
        setTimeout(() => {
          goNext();
          setExitDirection(null);
          setIsExiting(false);
        }, 200);
      }
    },
    [currentMenu, isExiting, goNext]
  );

  const handleEndGame = useCallback(() => {
    setShowResult(true);
  }, []);

  const handleReset = useCallback(() => {
    setMenus(shuffle(getAllMenus()));
    setCurrentIndex(0);
    setLikedMenus([]);
    setShowResult(false);
  }, []);

  // 결과 화면
  if (showResult) {
    return (
      <div className="w-full rounded-2xl border border-gray-200/80 bg-white/80 p-6 shadow-md backdrop-blur-sm sm:p-8">
        <h2 className="mb-4 text-center text-lg font-semibold text-gray-800">
          👍 좋아요한 메뉴
        </h2>
        {likedMenus.length === 0 ? (
          <p className="mb-6 text-center text-gray-500">
            좋아요한 메뉴가 없어요.
          </p>
        ) : (
          <ul className="mb-6 max-h-[200px] overflow-y-auto rounded-xl border border-gray-200 bg-[#F9F9F9] p-4">
            {likedMenus.map((name, i) => (
              <li
                key={`${name}-${i}`}
                className="border-b border-gray-200 py-2 last:border-0"
              >
                <span className="font-medium text-gray-800">{name}</span>
              </li>
            ))}
          </ul>
        )}
        <div className="flex flex-col gap-3">
          {likedMenus.length > 0 && (
            <button
              type="button"
              onClick={() => onCreateRoomWithMenus(likedMenus)}
              disabled={isPending}
              className="flex min-h-[48px] w-full items-center justify-center rounded-xl bg-[#FF6B00] py-3 font-semibold leading-tight text-white shadow-md transition hover:bg-[#e55f00] disabled:opacity-60"
            >
              {isPending ? "만드는 중…" : "이 메뉴들로 투표방 만들기"}
            </button>
          )}
          <button
            type="button"
            onClick={handleReset}
            className="flex min-h-[44px] w-full items-center justify-center rounded-xl border border-gray-200 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            다시 하기
          </button>
        </div>
      </div>
    );
  }

  // 로딩 (메뉴 셔플 직후)
  if (menus.length === 0) {
    return (
      <div className="flex min-h-[200px] w-full items-center justify-center rounded-2xl border border-gray-200/80 bg-white/80 text-gray-500 shadow-md backdrop-blur-sm">
        준비 중…
      </div>
    );
  }

  // 카드 다 씀
  if (!currentMenu) {
    return (
      <div className="flex min-h-[200px] w-full items-center justify-center rounded-2xl border border-gray-200/80 bg-white/80 text-gray-500 shadow-md backdrop-blur-sm">
        결과를 불러오는 중…
      </div>
    );
  }

  return (
    <div className="w-full rounded-2xl border border-gray-200/80 bg-white/80 p-4 shadow-md backdrop-blur-sm sm:p-6">
      <p className="mb-3 text-center text-sm font-medium text-gray-500">
        {swipedCount} / 10장 넘김 · 오른쪽 좋아요, 왼쪽 싫어요
      </p>

      <div className="relative flex min-h-[220px] w-full items-center justify-center sm:min-h-[260px]">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentIndex}
            className="absolute flex h-full w-full cursor-grab items-center justify-center active:cursor-grabbing"
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.3}
            onDrag={(_, info) => setDragX(info.offset.x)}
            onDragEnd={handleDragEnd}
            onDragStart={() => setDragX(0)}
            initial={{ x: 0, opacity: 1 }}
            animate={{
              x:
                exitDirection === "left"
                  ? -CARD_EXIT_OFFSET
                  : exitDirection === "right"
                    ? CARD_EXIT_OFFSET
                    : 0,
              opacity: exitDirection ? 0.8 : 1,
            }}
            transition={{ duration: exitDirection ? 0.2 : 0 }}
            style={{ touchAction: "pan-y" }}
          >
            <div
              className={`flex min-h-[180px] w-full flex-1 items-center justify-center rounded-2xl px-4 py-6 transition-colors sm:min-h-[220px] ${
                exitDirection === "right"
                  ? "bg-green-100"
                  : exitDirection === "left"
                    ? "bg-red-100"
                    : dragX > SWIPE_THRESHOLD
                      ? "bg-green-100"
                      : dragX < -SWIPE_THRESHOLD
                        ? "bg-red-100"
                        : "bg-[#F9F9F9]"
              }`}
            >
              <span className="text-center text-2xl font-bold text-gray-800 sm:text-3xl">
                {currentMenu}
              </span>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="mt-6 flex justify-center gap-6">
        <button
          type="button"
          onClick={handleDislike}
          disabled={isExiting}
          className="flex h-14 w-14 items-center justify-center rounded-full border-2 border-red-200 bg-white text-red-500 shadow-md transition hover:bg-red-50 disabled:opacity-50 sm:h-16 sm:w-16"
          aria-label="싫어요"
        >
          <span className="text-xl font-bold sm:text-2xl">✕</span>
        </button>
        <button
          type="button"
          onClick={handleLike}
          disabled={isExiting}
          className="flex h-14 w-14 items-center justify-center rounded-full border-2 border-green-200 bg-white text-green-600 shadow-md transition hover:bg-green-50 disabled:opacity-50 sm:h-16 sm:w-16"
          aria-label="좋아요"
        >
          <span className="text-xl font-bold sm:text-2xl">○</span>
        </button>
      </div>

      <button
        type="button"
        onClick={handleEndGame}
        className="mt-4 w-full rounded-xl border border-gray-200 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
      >
        중단하고 결과 보기
      </button>
    </div>
  );
}
