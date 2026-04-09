import type { Citation } from "./citations";
import scheduleData from "./mock/schedule.json";
import prerequisitesData from "./mock/prerequisites.json";
import { getCurrentStudent } from "./student-data";

export type PlannerFlow = "happy" | "lowConfidence" | "failure";

export type ToolSnapshot = {
  prerequisitesOk: boolean;
  seatRisk: "low" | "medium" | "high";
  dataFresh: boolean;
  sourceTimestamp: string;
};

export type ReasonWithCitation = {
  text: string;
  citationIds: number[];
};

export type PlannerDecision = {
  flow: PlannerFlow;
  confidenceScore: number;
  reasons: ReasonWithCitation[];
  needsPlanBFallback: boolean;
  toolSnapshot: ToolSnapshot;
  citations: Citation[];
};

/**
 * Ước lượng seat risk theo từng môn mục tiêu:
 * - high: mọi lớp của ít nhất 1 môn đều high
 * - medium: có môn tệ nhất ở mức medium
 * - low: mỗi môn đều có ít nhất 1 lựa chọn low
 */
function checkSeatRisk(targetCourses: string[]): { risk: ToolSnapshot["seatRisk"]; details: string } {
  const offerings = scheduleData.filter((s) => targetCourses.includes(s.courseCode));
  if (offerings.length === 0) {
    return { risk: "medium", details: "Chưa có dữ liệu lớp học cho danh sách môn mục tiêu." };
  }

  let hasAnyCourseAllHigh = false;
  let hasAnyCourseNoLow = false;
  const details: string[] = [];

  for (const courseCode of targetCourses) {
    const classes = offerings.filter((s) => s.courseCode === courseCode);
    if (classes.length === 0) {
      hasAnyCourseNoLow = true;
      details.push(`${courseCode}: chưa có lớp mở`);
      continue;
    }

    const hasLow = classes.some((c) => c.seatRisk === "low");
    const hasMedium = classes.some((c) => c.seatRisk === "medium");
    const hasHigh = classes.some((c) => c.seatRisk === "high");
    const allHigh = classes.every((c) => c.seatRisk === "high");

    if (allHigh) {
      hasAnyCourseAllHigh = true;
    }
    if (!hasLow) {
      hasAnyCourseNoLow = true;
    }

    const bestTier = hasLow ? "low" : hasMedium ? "medium" : "high";
    const maxEnrollment = Math.max(...classes.map((c) => c.enrolled / c.capacity));
    const maxPct = Math.round(maxEnrollment * 100);
    details.push(`${courseCode}: tốt nhất ${bestTier}, lớp đông nhất ${maxPct}%`);

    if (hasHigh) {
      const hotClass = classes.find((c) => c.seatRisk === "high");
      if (hotClass) {
        details.push(`${courseCode} lớp rủi ro cao: ${hotClass.classId} (${hotClass.enrolled}/${hotClass.capacity})`);
      }
    }
  }

  if (hasAnyCourseAllHigh) {
    return { risk: "high", details: details.join("; ") };
  }
  if (hasAnyCourseNoLow) {
    return { risk: "medium", details: details.join("; ") };
  }
  return { risk: "low", details: details.join("; ") };
}

/** Kiểm tra điều kiện tiên quyết từ prerequisites.json + hồ sơ sinh viên */
function checkPrerequisites(targetCourses: string[]): {
  ok: boolean;
  missing: { course: string; missing: string[] }[];
} {
  const completedCourses = getCurrentStudent().completedCourses;
  const prereqs = prerequisitesData as Record<string, { required: string[]; recommended: string[]; note: string }>;
  const missing: { course: string; missing: string[] }[] = [];

  for (const code of targetCourses) {
    const req = prereqs[code];
    if (!req) continue;
    const missingReqs = req.required.filter((r) => !completedCourses.includes(r));
    if (missingReqs.length > 0) {
      missing.push({ course: code, missing: missingReqs });
    }
  }

  return { ok: missing.length === 0, missing };
}

function normalizePrompt(prompt: string) {
  return prompt.trim().toLowerCase();
}

function runMockTools(prompt: string): ToolSnapshot & { seatDetail: string; prereqMissing: { course: string; missing: string[] }[] } {
  const normalized = normalizePrompt(prompt);

  // Phát hiện keyword override cho demo scenario
  const staleDataSignal = normalized.includes("stale") || normalized.includes("high risk") || normalized.includes("dữ liệu cũ");
  const forcePrereqFail = normalized.includes("missing prereq") || normalized.includes("thiếu điều kiện");

  // Xác định danh sách môn mục tiêu từ prompt hoặc dùng hồ sơ hiện tại
  const targetCourses = forcePrereqFail
    ? ["IT3160E", "IT3190E", "IT3080"]
    : normalized.includes("giai tich 2") || normalized.includes("giải tích 2") || normalized.includes("mi1131")
      ? ["MI1131"]
      : getCurrentStudent().targetCourses;

  const prereqCheck = checkPrerequisites(targetCourses);
  const seatCheck = checkSeatRisk(targetCourses);

  // Keyword override: near full / waitlist
  const seatRiskOverride: ToolSnapshot["seatRisk"] | null =
    normalized.includes("near full") || normalized.includes("gần đầy")
      ? "high"
      : normalized.includes("waitlist") || normalized.includes("danh sách chờ")
        ? "medium"
        : null;

  const seatRisk: ToolSnapshot["seatRisk"] = seatRiskOverride ?? (staleDataSignal ? "high" : seatCheck.risk);

  return {
    prerequisitesOk: forcePrereqFail ? false : prereqCheck.ok,
    seatRisk,
    dataFresh: !staleDataSignal,
    sourceTimestamp: "14:15 09/04/2026",
    seatDetail: seatCheck.details,
    prereqMissing: forcePrereqFail
      ? [{ course: "IT3160E", missing: ["IT3010E", "IT3020E"] }]
      : prereqCheck.missing,
  };
}

export function evaluatePlannerDecision(prompt: string): PlannerDecision {
  const normalized = normalizePrompt(prompt);
  const toolSnapshot = runMockTools(normalized);
  const reasons: ReasonWithCitation[] = [];
  const citations: Citation[] = [];
  let citationCounter = 1;

  function addCitation(type: Citation["type"], title: string, detail: string): number {
    const id = citationCounter++;
    citations.push({ id, type, title, detail, timestamp: toolSnapshot.sourceTimestamp });
    return id;
  }

  let score = 100;
  let isUnclearIntent = false;

  if (!normalized) {
    score -= 45;
    const cid = addCitation("regulation", "Hệ thống phân tích yêu cầu", "Không phát hiện ràng buộc hoặc môn học cụ thể trong yêu cầu.");
    reasons.push({ text: "Chưa nhập yêu cầu cụ thể về học kỳ.", citationIds: [cid] });
  }

  if (
    normalized.includes("khong chac") ||
    normalized.includes("không chắc") ||
    normalized.includes("khong ro") ||
    normalized.includes("không rõ") ||
    normalized.includes("help")
  ) {
    isUnclearIntent = true;
    score -= 30;
    const cid = addCitation("regulation", "Bộ phân tích ý định", "Ý định người dùng không đủ rõ ràng để tự động tạo kế hoạch.");
    reasons.push({ text: "Ý định chưa rõ ràng, cần làm rõ trước khi tạo kế hoạch.", citationIds: [cid] });
  }

  if (!isUnclearIntent && !toolSnapshot.prerequisitesOk) {
    score -= 25;
    const missingList = toolSnapshot.prereqMissing
      .map((m) => `${m.course} (thiếu: ${m.missing.join(", ")})`)
      .join("; ");
    const cid = addCitation(
      "prerequisite",
      "Kiểm tra điều kiện tiên quyết — HUST dk-sis",
      `Phát hiện thiếu điều kiện tiên quyết: ${missingList}. Sinh viên cần hoàn thành các môn này trước.`
    );
    reasons.push({ text: `Thiếu điều kiện tiên quyết: ${missingList}.`, citationIds: [cid] });
  }

  if (!isUnclearIntent && toolSnapshot.seatRisk === "medium") {
    score -= 10;
    const cid = addCitation(
      "sis",
      "Dữ liệu SIS HK 20252 — tình trạng chỗ ngồi",
      `${toolSnapshot.seatDetail} Tỷ lệ đăng ký 70–85%, nên giữ phương án dự phòng.`
    );
    reasons.push({ text: "Rủi ro hết chỗ ở mức trung bình, nên giữ Plan B dự phòng.", citationIds: [cid] });
  }

  if (!isUnclearIntent && toolSnapshot.seatRisk === "high") {
    score -= 20;
    const cid = addCitation(
      "sis",
      "Dữ liệu SIS HK 20252 — tình trạng chỗ ngồi",
      `${toolSnapshot.seatDetail} Rủi ro hết chỗ rất cao. Nguồn: HUST dk-sis, cập nhật ${toolSnapshot.sourceTimestamp}.`
    );
    reasons.push({ text: "Rủi ro hết chỗ cao — IT3100E còn 6/140 chỗ. Cần kích hoạt Plan B ngay.", citationIds: [cid] });
  }

  if (!isUnclearIntent && !toolSnapshot.dataFresh) {
    score -= 25;
    const cid = addCitation(
      "sis",
      "Kiểm tra độ mới dữ liệu SIS",
      `Dữ liệu SIS cập nhật lần cuối lúc ${toolSnapshot.sourceTimestamp}. TTL đã vượt ngưỡng 5 phút — nguy cơ sai lệch chỗ ngồi.`
    );
    reasons.push({ text: "Dữ liệu đã cũ, nguy cơ đăng ký thất bại tăng cao.", citationIds: [cid] });
  }

  const confidenceScore = Math.max(0, Math.min(100, score));
  const needsPlanBFallback = toolSnapshot.seatRisk === "high" || !toolSnapshot.dataFresh;

  if (!toolSnapshot.dataFresh || confidenceScore < 45) {
    return { flow: "failure", confidenceScore, reasons, needsPlanBFallback, toolSnapshot, citations };
  }

  if (confidenceScore < 80) {
    return { flow: "lowConfidence", confidenceScore, reasons, needsPlanBFallback, toolSnapshot, citations };
  }

  const happyCid1 = addCitation(
    "sis",
    "Dữ liệu SIS HK 20252 — xác nhận lịch",
    "Tất cả lớp trong Plan A còn chỗ và không có xung đột lịch. Nguồn: TKB20252-FULL, cập nhật 09/04/2026."
  );
  const happyCid2 = addCitation(
    "prerequisite",
    "Kiểm tra điều kiện tiên quyết — HUST dk-sis",
    `Sinh viên đã hoàn thành: ${getCurrentStudent().completedCourses.join(", ")}. Tất cả điều kiện tiên quyết cho HK 20252 đều đáp ứng.`
  );
  const communityCid = addCitation(
    "community",
    "Dữ liệu cộng đồng — xu hướng đăng ký ngành CS",
    "75% sinh viên năm 3 ngành CS chọn IT3010E + IT3100E + IT3080 cùng học kỳ. Tỷ lệ hoàn thành: 89%."
  );
  reasons.push({
    text: "Độ tin cậy đạt ngưỡng an toàn — lịch không xung đột, điều kiện tiên quyết đủ.",
    citationIds: [happyCid1, happyCid2, communityCid],
  });
  return { flow: "happy", confidenceScore, reasons, needsPlanBFallback, toolSnapshot, citations };
}
