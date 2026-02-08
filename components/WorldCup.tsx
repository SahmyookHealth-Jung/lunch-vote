"use client";

import { useState, useEffect, useCallback } from "react";
import confetti from "canvas-confetti";
import { MENUS, getAllMenus } from "@/utils/menuData";
import type { Category } from "@/utils/menuData";

const CATEGORY_LABELS: { key: Category; label: string }[] = [
  { key: "korean", label: "한식" },
  { key: "chinese", label: "중식" },
  { key: "japanese", label: "일식" },
  { key: "western", label: "양식" },
  { key: "all", label: "전체" },
];

function shuffle<T>(arr: T[]): T[] {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

function getMenusByCategory(category: Category): string[] {
  if (category === "all") return getAllMenus();
  return [...(MENUS[category] ?? [])];
}

export interface WorldCupProps {
  onCreateRoomWithMenu: (menuName: string) => void | Promise<void>;
  isPending?: boolean;
}

export default function WorldCup({ onCreateRoomWithMenu, isPending = false }: WorldCupProps) {
  const [step, setStep] = useState<"category" | "game" | "champion">("category");
  const [category, setCategory] = useState<Category | null>(null);
  const [currentRound, setCurrentRound] = useState<string[]>([]);
  const [matchIndex, setMatchIndex] = useState(0);
  const [nextRoundWinners, setNextRoundWinners] = useState<string[]>([]);
  const [champion, setChampion] = useState<string | null>(null);

  const startGame = useCallback((cat: Category) => {
    setCategory(cat);
    const list = getMenusByCategory(cat);
    const picked = shuffle(list).slice(0, 8);
    if (picked.length < 8) {
      setCurrentRound(picked);
    } else {
      setCurrentRound(picked);
    }
    setMatchIndex(0);
    setNextRoundWinners([]);
    setChampion(null);
    setStep("game");
  }, []);

  const pickWinner = useCallback(
    (winner: string) => {
      let next = [...nextRoundWinners, winner];
      const pairCount = Math.floor(currentRound.length / 2);
      const hasBye = currentRound.length % 2 === 1;
      if (hasBye && next.length === pairCount) {
        next = [...next, currentRound[currentRound.length - 1]];
      }
      const roundComplete = next.length === pairCount + (hasBye ? 1 : 0);
      if (roundComplete) {
        if (next.length === 1) {
          setChampion(next[0]);
          setStep("champion");
          confetti({ particleCount: 80, spread: 70, origin: { y: 0.7 } });
        } else {
          setCurrentRound(next);
          setMatchIndex(0);
          setNextRoundWinners([]);
        }
      } else {
        setNextRoundWinners(next);
        setMatchIndex((i) => i + 1);
      }
    },
    [currentRound, nextRoundWinners]
  );

  useEffect(() => {
    if (step !== "champion" || !champion) return;
    const t = setTimeout(() => {
      confetti({ particleCount: 40, spread: 60, origin: { y: 0.8 } });
    }, 300);
    return () => clearTimeout(t);
  }, [step, champion]);

  if (step === "category") {
    return (
      <div className="w-full rounded-2xl bg-white/90 p-6 shadow-lg shadow-indigo-100/50 backdrop-blur">
        <h2 className="mb-4 text-center text-lg font-semibold text-indigo-900">
          카테고리를 선택하세요
        </h2>
        <div className="flex flex-wrap justify-center gap-2">
          {CATEGORY_LABELS.map(({ key, label }) => (
            <button
              key={key}
              type="button"
              onClick={() => startGame(key)}
              className="rounded-xl bg-indigo-100 px-4 py-3 font-medium text-indigo-800 transition hover:bg-indigo-200"
            >
              {label}
            </button>
          ))}
        </div>
      </div>
    );
  }

  if (step === "champion" && champion) {
    return (
      <div className="w-full rounded-2xl bg-white/90 p-6 shadow-lg shadow-indigo-100/50 backdrop-blur">
        <p className="mb-2 text-center text-sm font-medium text-indigo-500">
          🏆 우승 메뉴
        </p>
        <p className="mb-6 text-center text-2xl font-bold text-indigo-900 sm:text-3xl">
          {champion}
        </p>
        <button
          type="button"
          onClick={() => onCreateRoomWithMenu(champion)}
          disabled={isPending}
          className="flex min-h-[48px] w-full items-center justify-center rounded-xl bg-indigo-600 py-3 font-semibold leading-tight text-white shadow-md transition hover:bg-indigo-700 disabled:opacity-60"
        >
          <span className="block text-center">
            {isPending ? "만드는 중…" : "이 메뉴로 투표 방 만들기"}
          </span>
        </button>
        <button
          type="button"
          onClick={() => {
            setStep("category");
            setCategory(null);
          }}
          className="mt-3 flex min-h-[44px] w-full items-center justify-center rounded-xl border border-indigo-200 py-2 text-sm font-medium leading-tight text-indigo-700 hover:bg-indigo-50"
        >
          처음부터 다시 하기
        </button>
      </div>
    );
  }

  const left = currentRound[matchIndex * 2];
  const right = currentRound[matchIndex * 2 + 1];
  const roundLabel =
    currentRound.length === 8 ? "8강" : currentRound.length === 4 ? "4강" : "결승";

  if (!left || !right) {
    return (
      <div className="w-full rounded-2xl bg-white/90 p-6 text-center text-indigo-600">
        메뉴가 부족해요. 다른 카테고리를 선택해 주세요.
        <button
          type="button"
          onClick={() => setStep("category")}
          className="mt-3 block w-full rounded-xl border border-indigo-200 py-2 text-sm font-medium"
        >
          카테고리 다시 선택
        </button>
      </div>
    );
  }

  return (
    <div className="w-full rounded-2xl bg-white/90 p-4 shadow-lg shadow-indigo-100/50 backdrop-blur sm:p-6">
      <p className="mb-4 text-center text-sm font-semibold text-indigo-500">
        {roundLabel}
      </p>
      <div className="grid grid-cols-2 gap-3 sm:gap-4">
        <button
          type="button"
          onClick={() => pickWinner(left)}
          className="flex min-h-[80px] items-center justify-center rounded-xl border-2 border-indigo-200 bg-white px-3 py-4 text-base font-semibold text-indigo-900 transition hover:border-indigo-400 hover:bg-indigo-50 sm:min-h-[100px] sm:text-lg"
        >
          {left}
        </button>
        <button
          type="button"
          onClick={() => pickWinner(right)}
          className="flex min-h-[80px] items-center justify-center rounded-xl border-2 border-indigo-200 bg-white px-3 py-4 text-base font-semibold text-indigo-900 transition hover:border-indigo-400 hover:bg-indigo-50 sm:min-h-[100px] sm:text-lg"
        >
          {right}
        </button>
      </div>
      <p className="mt-3 text-center text-xs text-indigo-400">VS</p>
    </div>
  );
}
