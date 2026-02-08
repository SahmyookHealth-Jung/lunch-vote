"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { useEffect, useState, useCallback, useRef } from "react";
import confetti from "canvas-confetti";
import { supabase } from "@/utils/supabase/client";
import { addToVotingHistory } from "@/utils/voting-history";

const PARTICIPANT_STORAGE_KEY = (roomId: string) =>
  `lunch-vote-participant-${roomId}`;

type Room = { id: string; title: string };
type Candidate = { id: string; room_id: string; name: string; link: string | null };
type Participant = { id: string; room_id: string; nickname: string };
type VoteCount = Record<string, number>;

const ROULETTE_COLORS = [
  "#6366f1", "#8b5cf6", "#ec4899", "#f43f5e",
  "#f97316", "#eab308", "#22c55e", "#14b8a6",
];

export default function RoomDetailPage() {
  const params = useParams();
  const roomId = typeof params.id === "string" ? params.id : "";

  const [participantId, setParticipantId] = useState<string | null>(null);
  const [room, setRoom] = useState<Room | null>(null);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [voteCounts, setVoteCounts] = useState<VoteCount>({});
  const [myVoteCandidateId, setMyVoteCandidateId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 입장 화면 상태
  const [nickname, setNickname] = useState("");
  const [entryError, setEntryError] = useState<string | null>(null);
  const [entryPending, setEntryPending] = useState(false);

  // 후보 등록 폼
  const [candidateName, setCandidateName] = useState("");
  const [candidateLink, setCandidateLink] = useState("");
  const [addError, setAddError] = useState<string | null>(null);
  const [addPending, setAddPending] = useState(false);

  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // 결과 모달 & 룰렛
  const [isResultOpen, setIsResultOpen] = useState(false);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [rouletteSpinning, setRouletteSpinning] = useState(false);
  const [rouletteRotation, setRouletteRotation] = useState(0);
  const [rouletteWinner, setRouletteWinner] = useState<Participant | null>(null);
  const roulettePrevRotation = useRef(0);

  /** Realtime 이벤트 시 로딩 UI 없이 후보·투표만 갱신 */
  const refreshListAndVotes = useCallback(async () => {
    if (!roomId) return;
    try {
      const { data: candidatesData, error: candidatesError } = await supabase
        .from("candidates")
        .select("id, room_id, name, link")
        .eq("room_id", roomId)
        .order("created_at", { ascending: true });

      if (candidatesError) return;
      const list = (candidatesData as Candidate[]) ?? [];
      setCandidates(list);

      const candidateIds = list.map((c) => c.id);
      if (candidateIds.length === 0) {
        setVoteCounts({});
      } else {
        const { data: votesData } = await supabase
          .from("votes")
          .select("candidate_id")
          .in("candidate_id", candidateIds);
        const counts: VoteCount = {};
        candidateIds.forEach((id) => (counts[id] = 0));
        votesData?.forEach((v: { candidate_id: string }) => {
          counts[v.candidate_id] = (counts[v.candidate_id] ?? 0) + 1;
        });
        setVoteCounts(counts);
      }

      const storedParticipantId =
        typeof window !== "undefined"
          ? localStorage.getItem(PARTICIPANT_STORAGE_KEY(roomId))
          : null;
      if (storedParticipantId) {
        const { data: myVote } = await supabase
          .from("votes")
          .select("candidate_id")
          .eq("participant_id", storedParticipantId)
          .maybeSingle();
        setMyVoteCandidateId(
          (myVote as { candidate_id: string } | null)?.candidate_id ?? null
        );
      }
    } catch {
      // 무시
    }
  }, [roomId]);

  const loadData = useCallback(async () => {
    if (!roomId) return;

    setLoading(true);
    setError(null);

    try {
      const { data: roomData, error: roomError } = await supabase
        .from("rooms")
        .select("id, title")
        .eq("id", roomId)
        .single();

      if (roomError || !roomData) {
        setError("방을 찾을 수 없습니다.");
        setRoom(null);
        setCandidates([]);
        setVoteCounts({});
        setMyVoteCandidateId(null);
        setLoading(false);
        return;
      }

      setRoom(roomData as Room);

      const { data: candidatesData, error: candidatesError } = await supabase
        .from("candidates")
        .select("id, room_id, name, link")
        .eq("room_id", roomId)
        .order("created_at", { ascending: true });

      if (candidatesError) {
        setError("후보 목록을 불러오지 못했습니다.");
        setLoading(false);
        return;
      }

      setCandidates((candidatesData as Candidate[]) ?? []);

      const candidateIds = ((candidatesData as Candidate[]) ?? []).map(
        (c) => c.id
      );

      if (candidateIds.length === 0) {
        setVoteCounts({});
      } else {
        const { data: votesData } = await supabase
          .from("votes")
          .select("candidate_id")
          .in("candidate_id", candidateIds);

        const counts: VoteCount = {};
        candidateIds.forEach((id) => (counts[id] = 0));
        votesData?.forEach((v: { candidate_id: string }) => {
          counts[v.candidate_id] = (counts[v.candidate_id] ?? 0) + 1;
        });
        setVoteCounts(counts);
      }

      const storedParticipantId =
        typeof window !== "undefined"
          ? localStorage.getItem(PARTICIPANT_STORAGE_KEY(roomId))
          : null;

      if (storedParticipantId) {
        setParticipantId(storedParticipantId);
        const { data: myVote } = await supabase
          .from("votes")
          .select("candidate_id")
          .eq("participant_id", storedParticipantId)
          .maybeSingle();
        setMyVoteCandidateId(
          (myVote as { candidate_id: string } | null)?.candidate_id ?? null
        );
      } else {
        setMyVoteCandidateId(null);
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "데이터를 불러오지 못했습니다."
      );
    } finally {
      setLoading(false);
    }
  }, [roomId]);

  useEffect(() => {
    if (!roomId) return;
    loadData();
  }, [roomId, loadData]);

  useEffect(() => {
    if (!roomId || typeof window === "undefined") return;
    const stored = localStorage.getItem(PARTICIPANT_STORAGE_KEY(roomId));
    setParticipantId(stored);
  }, [roomId]);

  // Supabase Realtime: candidates / votes 변경 시 전체 리스트 다시 불러오기
  useEffect(() => {
    if (!roomId) return;

    const fetchCandidates = () => {
      refreshListAndVotes();
    };

    const channel = supabase
      .channel(`room-updates-${roomId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "candidates",
          filter: `room_id=eq.${roomId}`,
        },
        () => {
          fetchCandidates();
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "votes" },
        () => {
          fetchCandidates();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [roomId, refreshListAndVotes]);

  // 모달 열릴 때 참여자 목록 로드 & 폭죽
  useEffect(() => {
    if (!isResultOpen || !roomId) return;

    const duration = 2500;
    const end = Date.now() + duration;
    const frame = () => {
      confetti({
        particleCount: 3,
        angle: 60,
        spread: 55,
        origin: { x: 0 },
        colors: ["#6366f1", "#8b5cf6", "#ec4899"],
      });
      confetti({
        particleCount: 3,
        angle: 120,
        spread: 55,
        origin: { x: 1 },
        colors: ["#6366f1", "#8b5cf6", "#ec4899"],
      });
      if (Date.now() < end) requestAnimationFrame(frame);
    };
    frame();

    (async () => {
      const { data } = await supabase
        .from("participants")
        .select("id, room_id, nickname")
        .eq("room_id", roomId)
        .order("created_at", { ascending: true });
      setParticipants((data as Participant[]) ?? []);
    })();
  }, [isResultOpen, roomId]);

  /** 1등 후보 (동점이면 랜덤 1명) */
  function getFirstPlaceName(): string {
    if (candidates.length === 0) return "—";
    let maxCount = 0;
    const tops: Candidate[] = [];
    candidates.forEach((c) => {
      const n = voteCounts[c.id] ?? 0;
      if (n > maxCount) {
        maxCount = n;
        tops.length = 0;
        tops.push(c);
      } else if (n === maxCount) tops.push(c);
    });
    if (tops.length === 0) return "—";
    return tops[Math.floor(Math.random() * tops.length)].name;
  }

  function handleOpenResult() {
    setIsResultOpen(true);
    setRouletteWinner(null);
    setRouletteRotation(0);
    roulettePrevRotation.current = 0;
  }

  function handleSpinRoulette() {
    if (participants.length === 0) {
      alert("참여자가 없어요. 입장한 사람이 있어야 룰렛을 돌릴 수 있어요.");
      return;
    }
    if (rouletteSpinning) return;

    setRouletteSpinning(true);
    setRouletteWinner(null);

    const winnerIndex = Math.floor(Math.random() * participants.length);
    const n = participants.length;
    const segmentDeg = 360 / n;
    const winnerMidDeg = (2 * winnerIndex + 1) * (segmentDeg / 2);
    const fullSpins = 6;
    const totalDeg = roulettePrevRotation.current + 360 * fullSpins + (360 - winnerMidDeg);

    setRouletteRotation(totalDeg);
    roulettePrevRotation.current = totalDeg;

    const duration = 5000;
    setTimeout(() => {
      setRouletteWinner(participants[winnerIndex]);
      setRouletteSpinning(false);
    }, duration);
  }

  async function handleEntry(e: React.FormEvent) {
    e.preventDefault();
    setEntryError(null);
    const trimNick = nickname.trim();
    if (!trimNick) {
      setEntryError("닉네임을 입력해주세요.");
      return;
    }
    if (!roomId) {
      setEntryError("방 정보를 찾을 수 없습니다.");
      return;
    }

    setEntryPending(true);
    try {
      const { data, error: insertError } = await supabase
        .from("participants")
        .insert({ room_id: roomId, nickname: trimNick })
        .select("id")
        .single();

      if (insertError) {
        setEntryError(
          insertError.message ?? "입장에 실패했습니다. 다시 시도해주세요."
        );
        return;
      }
      if (!data?.id) {
        setEntryError("입장 처리 중 오류가 발생했습니다.");
        return;
      }
      localStorage.setItem(PARTICIPANT_STORAGE_KEY(roomId), data.id);
      setParticipantId(data.id);
      addToVotingHistory({
        id: roomId,
        title: room?.title ?? "방",
      });
    } catch (err) {
      setEntryError(
        err instanceof Error ? err.message : "입장 중 오류가 발생했습니다."
      );
    } finally {
      setEntryPending(false);
    }
  }

  function handleCopyLink() {
    if (typeof window === "undefined") return;
    const url = window.location.href;
    navigator.clipboard.writeText(url).then(
      () => {
        setToastMessage("링크가 복사되었습니다!");
        setTimeout(() => setToastMessage(null), 2500);
      },
      () => {}
    );
  }

  async function handleVote(candidateId: string) {
    if (!participantId) return;

    const isCurrentVote = myVoteCandidateId === candidateId;
    try {
      if (isCurrentVote) {
        const { error: deleteError } = await supabase
          .from("votes")
          .delete()
          .eq("participant_id", participantId)
          .eq("candidate_id", candidateId);

        if (deleteError) {
          console.error("[votes DELETE 에러]", deleteError);
          alert(`투표 취소에 실패했습니다. (RLS 또는 권한을 확인해주세요)\n${deleteError.message}`);
          return;
        }
        setMyVoteCandidateId(null);
      } else {
        // 한 명당 한 표: 기존 투표 삭제 후 새 투표 INSERT
        await supabase
          .from("votes")
          .delete()
          .eq("participant_id", participantId);

        const { error: insertError } = await supabase.from("votes").insert({
          candidate_id: candidateId,
          participant_id: participantId,
        });

        if (insertError) {
          console.error("[votes INSERT 에러]", insertError);
          alert(`투표에 실패했습니다. (RLS 또는 권한을 확인해주세요)\n${insertError.message}`);
          return;
        }
        setMyVoteCandidateId(candidateId);
      }
      await refreshListAndVotes();
    } catch (err) {
      console.error("[handleVote 에러]", err);
      alert("투표 처리 중 오류가 발생했습니다.");
      refreshListAndVotes();
    }
  }

  function openNaverMap() {
    const query = encodeURIComponent(candidateName.trim() || "식당");
    window.open(`https://map.naver.com/p/search/${query}`, "_blank", "noopener");
  }

  async function handleAddCandidate(e: React.FormEvent) {
    e.preventDefault();
    setAddError(null);
    const name = candidateName.trim();
    if (!name) {
      setAddError("식당 이름을 입력해주세요.");
      return;
    }
    if (!roomId) return;

    setAddPending(true);
    try {
      const { error: insertError } = await supabase.from("candidates").insert({
        room_id: roomId,
        name,
        link: candidateLink.trim() || null,
      });

      if (insertError) {
        setAddError(
          insertError.message ?? "등록에 실패했습니다. 다시 시도해주세요."
        );
        return;
      }
      setCandidateName("");
      setCandidateLink("");
      await refreshListAndVotes();
    } catch (err) {
      setAddError(
        err instanceof Error ? err.message : "등록 중 오류가 발생했습니다."
      );
    } finally {
      setAddPending(false);
    }
  }

  if (!roomId) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F9F9F9] px-4">
        <p className="text-red-600">잘못된 경로입니다.</p>
      </div>
    );
  }

  if (loading && !room) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F9F9F9] px-4">
        <p className="text-gray-500">불러오는 중…</p>
      </div>
    );
  }

  if (error && !room) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-[#F9F9F9] px-4">
        <p className="text-center text-red-600">{error}</p>
        <Link
          href="/"
          className="rounded-xl bg-[#FF6B00] px-4 py-2.5 font-medium text-white shadow-md transition hover:-translate-y-0.5 hover:bg-[#e55f00] hover:shadow-lg"
        >
          홈으로
        </Link>
      </div>
    );
  }

  // Step A: 입장 화면 (닉네임 미입력)
  if (!participantId && room) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F9F9F9] px-4">
        <div className="w-full max-w-sm rounded-2xl border border-gray-200/80 bg-white p-8 shadow-lg backdrop-blur-sm">
          <p className="mb-4 text-center text-5xl" aria-hidden>
            👋
          </p>
          <h2 className="mb-6 text-center text-xl font-bold text-gray-800">
            닉네임을 입력하세요
          </h2>
          <form onSubmit={handleEntry} className="flex flex-col gap-4">
            <input
              type="text"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              placeholder="닉네임을 입력하세요"
              disabled={entryPending}
              maxLength={20}
              className="h-14 w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-lg text-gray-800 placeholder:text-gray-400 focus:border-[#FF6B00] focus:outline-none focus:ring-2 focus:ring-[#FF6B00]/20 disabled:opacity-60"
              autoComplete="off"
            />
            {entryError && (
              <p role="alert" className="text-sm text-red-600">
                {entryError}
              </p>
            )}
            <button
              type="submit"
              disabled={entryPending}
              className="h-14 w-full rounded-xl bg-[#FF6B00] py-3 font-semibold text-white shadow-md transition hover:-translate-y-0.5 hover:bg-[#e55f00] hover:shadow-lg disabled:translate-y-0 disabled:opacity-60"
            >
              {entryPending ? "입장 중…" : "입장하기"}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // Step B: 투표 화면
  return (
    <div className="min-h-screen bg-[#F9F9F9] pb-28">
      <div className="mx-auto max-w-2xl px-4 py-6">
        {/* 상단: 방 제목 + 공유 */}
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl">
            {room?.title ?? "투표 방"}
          </h1>
          <button
            type="button"
            onClick={handleCopyLink}
            className="shrink-0 rounded-full bg-gray-100 px-4 py-2 text-sm font-medium text-gray-600 transition hover:bg-gray-200"
          >
            링크 복사
          </button>
        </div>

        {error && (
          <p role="alert" className="mb-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">
            {error}
          </p>
        )}

        {/* 후보 리스트 */}
        <section className="mb-8 rounded-2xl bg-white p-5 shadow-lg">
          <h2 className="mb-4 text-lg font-semibold text-gray-800">
            후보 리스트
          </h2>
          {candidates.length === 0 ? (
            <p className="rounded-xl border border-dashed border-gray-200 bg-gray-50 py-8 text-center text-gray-500">
              아직 등록된 식당이 없어요. 아래에서 추가해보세요.
            </p>
          ) : (
            <ul className="flex flex-col gap-3">
              {candidates.map((c) => {
                const count = voteCounts[c.id] ?? 0;
                const isVoted = myVoteCandidateId === c.id;
                return (
                  <li
                    key={c.id}
                    className={`rounded-2xl border-2 bg-white p-4 shadow-md transition ${
                      isVoted
                        ? "border-[#FF6B00] shadow-[#FF6B00]/10"
                        : "border-gray-200"
                    }`}
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium text-gray-900">
                        {c.name}
                      </span>
                      <span className="text-gray-500" title="투표 수">
                        👍 {count}
                      </span>
                    </div>
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      {c.link && (
                        <a
                          href={c.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-[#FF6B00] underline hover:text-[#e55f00]"
                        >
                          네이버 지도에서 보기
                        </a>
                      )}
                      <button
                        type="button"
                        onClick={() => handleVote(c.id)}
                        className={
                          isVoted
                            ? "rounded-xl bg-[#FF6B00] px-4 py-2 text-sm font-medium text-white shadow transition hover:-translate-y-0.5 hover:bg-[#e55f00]"
                            : "rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
                        }
                      >
                        {isVoted ? "투표함" : "투표하기"}
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        {/* 식당 등록 폼 */}
        <section className="rounded-2xl border border-orange-100 bg-orange-50/60 p-6 shadow-lg">
          <h2 className="mb-4 text-lg font-semibold text-gray-800">
            식당 등록
          </h2>
          <form onSubmit={handleAddCandidate} className="flex flex-col gap-4">
            <input
              type="text"
              value={candidateName}
              onChange={(e) => setCandidateName(e.target.value)}
              placeholder="식당 이름"
              disabled={addPending}
              className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-gray-800 placeholder:text-gray-400 focus:border-[#FF6B00] focus:outline-none focus:ring-2 focus:ring-[#FF6B00]/20 disabled:opacity-60"
              autoComplete="off"
            />
            <button
              type="button"
              onClick={openNaverMap}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#03C75A] py-3 text-sm font-medium text-white shadow transition hover:-translate-y-0.5 hover:bg-[#02b350]"
            >
              <span className="inline-flex h-6 w-6 items-center justify-center rounded bg-white/20 text-xs font-bold">
                N
              </span>
              네이버 지도로 찾기
            </button>
            <input
              type="url"
              value={candidateLink}
              onChange={(e) => setCandidateLink(e.target.value)}
              placeholder="식당 링크 (붙여넣기)"
              disabled={addPending}
              className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-gray-800 placeholder:text-gray-400 focus:border-[#FF6B00] focus:outline-none focus:ring-2 focus:ring-[#FF6B00]/20 disabled:opacity-60"
            />
            {addError && (
              <p role="alert" className="text-sm text-red-600">
                {addError}
              </p>
            )}
            <button
              type="submit"
              disabled={addPending}
              className="w-full rounded-xl border-2 border-[#FF6B00] bg-white py-2.5 font-medium text-[#FF6B00] transition hover:bg-[#FF6B00]/5 disabled:opacity-60"
            >
              {addPending ? "등록 중…" : "등록하기"}
            </button>
          </form>
        </section>

        {/* 투표 종료 및 결과 보기 - 하단 고정 */}
        <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-gray-200/80 bg-[#F9F9F9]/95 px-4 py-4 backdrop-blur-sm">
          <div className="mx-auto max-w-2xl">
            <button
              type="button"
              onClick={handleOpenResult}
              className="w-full rounded-2xl bg-[#FF6B00] py-4 text-lg font-semibold text-white shadow-lg transition hover:-translate-y-0.5 hover:bg-[#e55f00] hover:shadow-xl"
            >
              투표 종료 및 결과 보기
            </button>
          </div>
        </div>

        <div className="mt-6 text-center">
          <Link
            href="/"
            className="text-sm text-gray-600 underline hover:text-[#FF6B00]"
          >
            홈으로
          </Link>
        </div>
      </div>

      {/* 결과 발표 모달 */}
      {isResultOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="result-modal-title"
        >
          <div className="relative max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-gray-200 bg-white p-8 shadow-2xl">
            <button
              type="button"
              onClick={() => setIsResultOpen(false)}
              className="absolute right-4 top-4 rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
              aria-label="모달 닫기"
            >
              <span className="text-2xl leading-none">×</span>
            </button>

            <h2 id="result-modal-title" className="mb-2 text-center text-sm font-medium text-[#FF6B00]">
              🏆 1등 식당
            </h2>
            <p className="mb-8 text-center text-3xl font-bold text-gray-900">
              {getFirstPlaceName()}
            </p>

            <div className="mb-6 border-t border-gray-200 pt-6">
              <button
                type="button"
                onClick={handleSpinRoulette}
                disabled={rouletteSpinning}
                className="w-full rounded-xl border-2 border-gray-200 bg-gray-50 py-3 text-base font-medium text-gray-700 transition hover:border-[#FF6B00]/30 hover:bg-orange-50/50 disabled:opacity-60"
              >
                ☕️ 후식 내기 룰렛 돌리기
              </button>
            </div>

            {/* 룰렛 원판 */}
            {participants.length > 0 && (
              <div className="flex flex-col items-center gap-4">
                <div className="relative flex h-[280px] w-[280px] items-center justify-center">
                  <div
                    className="absolute top-2 z-10 h-0 w-0 border-l-[12px] border-r-[12px] border-t-[20px] border-l-transparent border-r-transparent border-t-gray-900"
                    aria-hidden
                  />
                  <div
                    className="relative h-[260px] w-[260px] shrink-0 rounded-full border-4 border-white shadow-xl"
                    style={{
                      transform: `rotate(${rouletteRotation}deg)`,
                      transition: rouletteSpinning
                        ? "transform 5s cubic-bezier(0.2, 0.8, 0.2, 1)"
                        : "none",
                    }}
                  >
                    <div
                      className="absolute inset-0 rounded-full"
                      style={{
                        background: `conic-gradient(${participants
                          .map(
                            (_, i) =>
                              `${ROULETTE_COLORS[i % ROULETTE_COLORS.length]} ${(i * 360) / participants.length}deg ${((i + 1) * 360) / participants.length}deg`
                          )
                          .join(", ")})`,
                      }}
                      aria-hidden
                    />
                    <div className="absolute inset-0 flex items-center justify-center overflow-hidden rounded-full">
                      {participants.map((p, i) => {
                        const n = participants.length;
                        const angleDeg = (2 * i + 1) * (180 / n);
                        const angleRad = (angleDeg * Math.PI) / 180;
                        const r = 72;
                        const x = r * Math.sin(angleRad);
                        const y = -r * Math.cos(angleRad);
                        return (
                          <div
                            key={p.id}
                            className="absolute left-1/2 top-1/2 max-w-[4rem] truncate text-center text-sm font-semibold text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]"
                            style={{
                              transform: `translate(-50%, -50%) translate(${x}px, ${y}px) rotate(${angleDeg}deg)`,
                            }}
                          >
                            {p.nickname}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {rouletteWinner && !rouletteSpinning && (
                  <div className="w-full rounded-xl bg-orange-50 border border-orange-100 p-4 text-center">
                    <p className="text-xs font-medium text-[#FF6B00]">☕️ 커피 쏠 사람</p>
                    <p className="mt-1 text-2xl font-bold text-gray-900">
                      {rouletteWinner.nickname}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* 공유 링크 복사 토스트 */}
      {toastMessage && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-24 left-1/2 z-50 -translate-x-1/2 rounded-xl bg-gray-800 px-5 py-3 text-sm font-medium text-white shadow-lg"
        >
          {toastMessage}
        </div>
      )}
    </div>
  );
}
