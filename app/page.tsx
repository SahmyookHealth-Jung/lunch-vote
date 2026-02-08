"use client";

import { useState, useTransition, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/utils/supabase/client";
import {
  getVotingHistory,
  addToVotingHistory,
  removeFromVotingHistory,
  type VotingHistoryItem,
} from "@/utils/voting-history";
import WorldCup from "@/components/WorldCup";
import RandomGacha from "@/components/RandomGacha";

const TABS = [
  { id: 0, label: "🏆 음식 이상형 월드컵", short: "월드컵" },
  { id: 1, label: "🎰 랜덤 메뉴 뽑기", short: "뽑기" },
  { id: 2, label: "🗳️ 투표 방 만들기", short: "투표" },
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

  return (
    <div className="flex min-h-screen justify-center bg-gradient-to-br from-indigo-50 via-white to-purple-50">
      <main className="flex w-full max-w-md flex-col items-center px-4 py-8 sm:px-6 sm:py-12">
        <h1 className="mb-6 text-center text-3xl font-bold tracking-tight text-indigo-900 sm:mb-8 sm:text-4xl">
          오늘 뭐 먹지?
        </h1>

        {/* 탭 메뉴 */}
        <div
          role="tablist"
          aria-label="미니게임 모드 선택"
          className="mb-6 flex w-full gap-1 rounded-xl bg-indigo-100/80 p-1.5 sm:mb-8"
        >
          {TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={activeTab === tab.id}
              aria-controls={`panel-${tab.id}`}
              id={`tab-${tab.id}`}
              onClick={() => setActiveTab(tab.id)}
              className={`flex min-h-[44px] min-w-0 flex-1 items-center justify-center rounded-lg px-2 py-3 text-center text-sm font-medium leading-snug transition sm:min-h-[52px] sm:px-3 sm:text-base ${
                activeTab === tab.id
                  ? "bg-white text-indigo-800 shadow-sm"
                  : "text-indigo-600 hover:text-indigo-800"
              }`}
            >
              <span className="hidden sm:inline">{tab.label}</span>
              <span className="sm:hidden">{tab.short}</span>
            </button>
          ))}
        </div>

        {error && (
          <p
            role="alert"
            className="mb-4 w-full rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700"
          >
            {error}
          </p>
        )}

        {/* 탭 1: 월드컵 */}
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

        {/* 탭 2: 랜덤 뽑기 */}
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

        {/* 탭 3: 투표 방 만들기 */}
        <div
          id="panel-2"
          role="tabpanel"
          aria-labelledby="tab-2"
          hidden={activeTab !== 2}
          className="w-full"
        >
          {activeTab === 2 && (
            <form
              onSubmit={handleCreateRoom}
              className="flex w-full flex-col gap-4 rounded-2xl bg-white/80 p-6 shadow-lg shadow-indigo-100/50 backdrop-blur sm:p-8"
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
                className="w-full rounded-xl border border-indigo-200 bg-white px-4 py-3 text-indigo-900 placeholder:text-indigo-300 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 disabled:opacity-60"
                maxLength={100}
                autoComplete="off"
              />

              <button
                type="submit"
                disabled={isPending}
                className="flex min-h-[48px] w-full items-center justify-center rounded-xl bg-indigo-600 px-4 py-3 font-semibold leading-tight text-white shadow-md transition hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-60"
              >
                {isPending ? "만드는 중…" : "방 만들기"}
              </button>
            </form>
          )}
        </div>

        <p className="mt-6 text-center text-sm text-indigo-600/80 sm:mt-8">
          점심 메뉴를 함께 정해보세요
        </p>

        {/* 최근 방문한 방 */}
        <section className="mt-10 w-full max-w-md sm:mt-12">
          <h2 className="mb-3 text-lg font-semibold text-indigo-900">
            🕒 최근 방문한 방
          </h2>
          {!mounted ? (
            <p className="rounded-xl border border-indigo-100 bg-white/60 py-6 text-center text-sm text-indigo-500">
              불러오는 중…
            </p>
          ) : history.length === 0 ? (
            <p className="rounded-xl border border-indigo-100 bg-white/60 py-6 text-center text-sm text-indigo-600">
              아직 방문한 방이 없습니다.
            </p>
          ) : (
            <ul className="flex flex-col gap-2">
              {history.map((item) => (
                <li
                  key={item.id}
                  className="flex items-center gap-2 rounded-xl border border-indigo-100 bg-white/80 shadow-sm transition hover:bg-white"
                >
                  <Link
                    href={`/room/${item.id}`}
                    className="min-w-0 flex-1 px-4 py-3 text-left font-medium text-indigo-900 hover:text-indigo-700"
                  >
                    <span className="block truncate">{item.title}</span>
                    <span className="mt-0.5 block text-xs font-normal text-indigo-500">
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
                    className="shrink-0 rounded-lg p-2 text-indigo-400 hover:bg-indigo-50 hover:text-indigo-700"
                    aria-label={`${item.title} 삭제`}
                  >
                    [X]
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
