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

export default function Home() {
  const router = useRouter();
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

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-indigo-50 via-white to-purple-50">
      <main className="flex w-full max-w-md flex-col items-center px-6 py-12">
        <h1 className="mb-12 text-center text-4xl font-bold tracking-tight text-indigo-900 sm:text-5xl">
          오늘 뭐 먹지?
        </h1>

        <form
          onSubmit={handleCreateRoom}
          className="flex w-full flex-col gap-4 rounded-2xl bg-white/80 p-8 shadow-lg shadow-indigo-100/50 backdrop-blur sm:p-10"
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

          {error && (
            <p
              role="alert"
              className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700"
            >
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={isPending}
            className="mt-2 w-full rounded-xl bg-indigo-600 px-4 py-3 font-semibold text-white shadow-md shadow-indigo-200 transition hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-60 disabled:hover:bg-indigo-600"
          >
            {isPending ? "만드는 중…" : "방 만들기"}
          </button>
        </form>

        <p className="mt-8 text-center text-sm text-indigo-600/80">
          점심 메뉴를 함께 정해보세요
        </p>

        {/* 최근 방문한 방 */}
        <section className="mt-12 w-full max-w-md">
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
