"use client";

import { useState, useTransition, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Trophy,
  Dices,
  Heart,
  Vote,
} from "lucide-react";
import { supabase } from "@/utils/supabase/client";
import {
  getVotingHistory,
  addToVotingHistory,
  removeFromVotingHistory,
  type VotingHistoryItem,
} from "@/utils/voting-history";
import WorldCup from "@/components/WorldCup";
import RandomGacha from "@/components/RandomGacha";
import FoodTinder from "@/components/FoodTinder";
import LiveTicker from "@/components/LiveTicker";

const TABS = [
  { id: 0, label: "음식 이상형 월드컵", short: "월드컵", Icon: Trophy },
  { id: 1, label: "랜덤 메뉴 뽑기", short: "뽑기", Icon: Dices },
  { id: 2, label: "땡기는 음식 O/X", short: "O/X", Icon: Heart },
  { id: 3, label: "투표 방 만들기", short: "투표", Icon: Vote },
] as const;

export default function Home() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState(0);
  const [roomTitle, setRoomTitle] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [history, setHistory] = useState<VotingHistoryItem[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    setHistory(getVotingHistory());
  }, [mounted]);

  async function handleCreateRoom(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    const trimmedTitle = roomTitle.trim();
    if (!trimmedTitle) {
      setError("방 제목을 입력해주세요.");
      return;
    }

    startTransition(async () => {
      try {
        const { data, error: insertError } = await supabase
          .from("rooms")
          .insert({ title: trimmedTitle })
          .select("id")
          .single();

        if (insertError) {
          setError(
            insertError.message ?? "방 생성에 실패했습니다. 다시 시도해주세요."
          );
          return;
        }

        if (!data?.id) {
          setError("방이 생성되었지만 ID를 가져오지 못했습니다.");
          return;
        }

        addToVotingHistory({ id: data.id, title: trimmedTitle });
        router.push(`/room/${data.id}`);
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "알 수 없는 오류가 발생했습니다.";
        setError(message);
      }
    });
  }

  async function handleCreateRoomWithMenu(menuName: string) {
    setError(null);
    startTransition(async () => {
      try {
        const { data, error: roomError } = await supabase
          .from("rooms")
          .insert({ title: `오늘 뭐 먹지? - ${menuName}` })
          .select("id")
          .single();

        if (roomError || !data?.id) {
          setError(
            roomError?.message ?? "방 생성에 실패했습니다. 다시 시도해주세요."
          );
          return;
        }

        await supabase.from("candidates").insert({
          room_id: data.id,
          name: menuName,
          link: null,
        });

        addToVotingHistory({ id: data.id, title: `오늘 뭐 먹지? - ${menuName}` });
        router.push(`/room/${data.id}`);
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "알 수 없는 오류가 발생했습니다.";
        setError(message);
      }
    });
  }

  async function handleCreateRoomWithMenus(menuNames: string[]) {
    setError(null);
    if (menuNames.length === 0) return;
    startTransition(async () => {
      try {
        const title =
          menuNames.length === 1
            ? `오늘 뭐 먹지? - ${menuNames[0]}`
            : "오늘 뭐 먹지? - 푸드 틴더";
        const { data, error: roomError } = await supabase
          .from("rooms")
          .insert({ title })
          .select("id")
          .single();

        if (roomError || !data?.id) {
          setError(
            roomError?.message ?? "방 생성에 실패했습니다. 다시 시도해주세요."
          );
          return;
        }

        for (const name of menuNames) {
          await supabase.from("candidates").insert({
            room_id: data.id,
            name,
            link: null,
          });
        }

        addToVotingHistory({ id: data.id, title });
        router.push(`/room/${data.id}`);
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "알 수 없는 오류가 발생했습니다.";
        setError(message);
      }
    });
  }

  return (
    <div className="min-h-screen bg-[#F9F9F9]">
      <LiveTicker />
      <main className="mx-auto flex w-full max-w-[680px] flex-1 flex-col px-4 py-8 sm:px-6 sm:py-12">
        <h1 className="title-gradient mb-2 text-center text-4xl font-bold tracking-tight sm:text-5xl">
          오늘 뭐 먹지?
        </h1>
        <p className="mb-10 text-center text-sm text-gray-500 sm:mb-12">
          점심 메뉴를 함께 정해보세요
        </p>

        {/* Feature Navigation - 2x2 Glassmorphism Cards */}
        <div
          role="tablist"
          aria-label="기능 선택"
          className="mb-8 grid grid-cols-2 gap-4 sm:gap-5"
        >
          {TABS.map((tab) => {
            const Icon = tab.Icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={isActive}
                aria-controls={`panel-${tab.id}`}
                id={`tab-${tab.id}`}
                onClick={() => setActiveTab(tab.id)}
                className={`flex flex-col items-center justify-center gap-2 rounded-xl border bg-white/80 px-4 py-6 shadow-md backdrop-blur-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-lg sm:gap-3 sm:py-8 ${
                  isActive
                    ? "border-[#FF6B00] border-2 bg-[#FFF5EF] shadow-[0_4px_14px_rgba(255,107,0,0.12)]"
                    : "border-gray-200/80 hover:border-gray-300 hover:shadow-xl"
                }`}
              >
                <Icon
                  className={`h-7 w-7 sm:h-8 sm:w-8 ${
                    isActive ? "text-[#FF6B00]" : "text-gray-500"
                  }`}
                  strokeWidth={1.8}
                />
                <span
                  className={`text-center text-sm font-semibold sm:text-base ${
                    isActive ? "text-[#FF6B00]" : "text-gray-700"
                  }`}
                >
                  <span className="hidden sm:inline">{tab.label}</span>
                  <span className="sm:hidden">{tab.short}</span>
                </span>
              </button>
            );
          })}
        </div>

        {error && (
          <p
            role="alert"
            className="mb-4 w-full rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700"
          >
            {error}
          </p>
        )}

        {/* Panels */}
        <div
          id="panel-0"
          role="tabpanel"
          aria-labelledby="tab-0"
          hidden={activeTab !== 0}
          className="w-full"
        >
          {activeTab === 0 && (
            <WorldCup
              onCreateRoomWithMenu={handleCreateRoomWithMenu}
              isPending={isPending}
            />
          )}
        </div>
        <div
          id="panel-1"
          role="tabpanel"
          aria-labelledby="tab-1"
          hidden={activeTab !== 1}
          className="w-full"
        >
          {activeTab === 1 && (
            <RandomGacha
              onCreateRoomWithMenu={handleCreateRoomWithMenu}
              isPending={isPending}
            />
          )}
        </div>
        <div
          id="panel-2"
          role="tabpanel"
          aria-labelledby="tab-2"
          hidden={activeTab !== 2}
          className="w-full"
        >
          {activeTab === 2 && (
            <FoodTinder
              onCreateRoomWithMenus={handleCreateRoomWithMenus}
              isPending={isPending}
            />
          )}
        </div>
        <div
          id="panel-3"
          role="tabpanel"
          aria-labelledby="tab-3"
          hidden={activeTab !== 3}
          className="w-full"
        >
          {activeTab === 3 && (
            <form
              onSubmit={handleCreateRoom}
              className="flex w-full flex-col gap-4 rounded-2xl border border-gray-200/80 bg-white/80 p-6 shadow-md backdrop-blur-sm sm:p-8"
            >
              <label htmlFor="room-title" className="sr-only">
                방 제목 입력
              </label>
              <input
                id="room-title"
                type="text"
                value={roomTitle}
                onChange={(e) => setRoomTitle(e.target.value)}
                placeholder="방 제목 입력"
                disabled={isPending}
                className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-gray-800 placeholder:text-gray-400 focus:border-[#FF6B00] focus:outline-none focus:ring-2 focus:ring-[#FF6B00]/20 disabled:opacity-60"
                maxLength={100}
                autoComplete="off"
              />
              <button
                type="submit"
                disabled={isPending}
                className="flex min-h-[48px] w-full items-center justify-center rounded-xl bg-[#FF6B00] px-4 py-3 font-semibold text-white shadow-md transition hover:bg-[#e55f00] focus:outline-none focus:ring-2 focus:ring-[#FF6B00]/40 focus:ring-offset-2 disabled:opacity-60"
              >
                {isPending ? "만드는 중…" : "방 만들기"}
              </button>
            </form>
          )}
        </div>

        {/* Recent Rooms - Floating Card / Ticket */}
        <section className="mt-12 w-full">
          <h2 className="mb-4 text-lg font-semibold text-gray-800">
            최근 방문한 방
          </h2>
          {!mounted ? (
            <div className="rounded-2xl border border-gray-200/80 bg-white/80 py-8 text-center text-sm text-gray-500 shadow-sm backdrop-blur-sm">
              불러오는 중…
            </div>
          ) : history.length === 0 ? (
            <div className="rounded-2xl border border-gray-200/80 bg-white/80 py-8 text-center text-sm text-gray-500 shadow-sm backdrop-blur-sm">
              아직 방문한 방이 없습니다.
            </div>
          ) : (
            <ul className="flex flex-col gap-3">
              {history.map((item) => (
                <li
                  key={item.id}
                  className="group relative rounded-2xl border border-gray-200/80 bg-white/90 py-4 pl-5 pr-12 shadow-sm backdrop-blur-sm transition-all hover:shadow-md"
                >
                  <Link
                    href={`/room/${item.id}`}
                    className="block min-w-0 text-left"
                  >
                    <span className="block font-bold text-gray-800 truncate">
                      {item.title}
                    </span>
                    <span className="mt-0.5 block text-xs font-normal text-gray-500">
                      {new Date(item.visitedAt).toLocaleDateString("ko-KR", {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </Link>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      removeFromVotingHistory(item.id);
                      setHistory(getVotingHistory());
                    }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-2 text-gray-300 opacity-0 transition-opacity hover:bg-gray-100 hover:text-gray-600 group-hover:opacity-100"
                    aria-label={`${item.title} 삭제`}
                  >
                    <span className="text-base leading-none">×</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
    </div>
  );
}
