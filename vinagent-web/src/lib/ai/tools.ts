import { tool } from "@langchain/core/tools";
import { z } from "zod";
import scheduleData from "../mock/schedule.json";
import coursesData from "../mock/courses.json";
import prerequisitesData from "../mock/prerequisites.json";
import studentData from "../mock/student.json";
import curriculumData from "../mock/curriculum-cttt.json";

type ScheduleEntry = (typeof scheduleData)[number];
type GenericRecord = Record<string, unknown>;
type NormalizedScheduleEntry = {
  classId: string;
  courseCode: string;
  courseNameVi: string;
  courseNameEn: string;
  credits: number;
  day: "Mon" | "Tue" | "Wed" | "Thu" | "Fri";
  startHour: number;
  endHour: number;
  room: string;
  enrolled: number;
  capacity: number;
  slotsRemaining: number;
  session: string;
  semester: string;
  seatRisk: "high" | "medium" | "low";
};

function safeNum(value: unknown, fallback = 0): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const cleaned = value.replace(",", ".").trim();
    const n = Number(cleaned);
    if (Number.isFinite(n)) return n;
  }
  return fallback;
}

function normalizeDay(raw: unknown): "Mon" | "Tue" | "Wed" | "Thu" | "Fri" {
  const v = String(raw ?? "").trim().toLowerCase();
  if (v === "2" || v === "mon" || v === "monday") return "Mon";
  if (v === "3" || v === "tue" || v === "tuesday") return "Tue";
  if (v === "4" || v === "wed" || v === "wednesday") return "Wed";
  if (v === "5" || v === "thu" || v === "thursday") return "Thu";
  if (v === "6" || v === "fri" || v === "friday") return "Fri";
  return "Mon";
}

function normalizeCourse(record: GenericRecord) {
  const code = String(record.code ?? record.ma_hp ?? record.courseCode ?? "").trim();
  if (!code) return null;
  return {
    code,
    nameVi: String(record.nameVi ?? record.ten_hp ?? record.courseNameVi ?? record.name ?? code).trim(),
    nameEn: String(record.nameEn ?? record.courseNameEn ?? record.ten_hp ?? code).trim(),
    credits: safeNum(record.credits ?? record.tc_dt, 0),
    semester: String(record.semester ?? record.ky_hoc ?? "20252"),
    department: String(record.department ?? ""),
    description: String(record.description ?? ""),
  };
}

function normalizeTimeLabel(startHour: number, endHour: number): string {
  const toClock = (hour: number) => {
    const h = Math.floor(hour);
    const m = Math.round((hour - h) * 60);
    return `${h}:${String(m).padStart(2, "0")}`;
  };
  return `${toClock(startHour)}–${toClock(endHour)}`;
}

function normalizeScheduleEntry(record: GenericRecord): NormalizedScheduleEntry | null {
  const classId = String(record.classId ?? record["Mã_lớp"] ?? record["Ma_lop"] ?? "").trim();
  const courseCode = String(record.courseCode ?? record["Mã_HP"] ?? record["Ma_HP"] ?? "").trim();
  if (!classId || !courseCode) return null;

  const startHour = safeNum(record.startHour, NaN);
  const endHour = safeNum(record.endHour, NaN);
  if (!Number.isFinite(startHour) || !Number.isFinite(endHour)) return null;

  const capacity = safeNum(record.capacity ?? record["SL_Max"], 0);
  const enrolled = safeNum(record.enrolled ?? record["SLĐK"] ?? record["SL?K"], 0);
  if (capacity <= 0) return null;
  const slotsRemaining = safeNum(record.slotsRemaining, capacity - enrolled);
  const ratio = capacity > 0 ? slotsRemaining / capacity : 0;

  let seatRisk = String(record.seatRisk ?? "").trim().toLowerCase();
  if (!seatRisk) {
    if (slotsRemaining <= 5 || ratio <= 0.1) seatRisk = "high";
    else if (slotsRemaining <= 15 || ratio <= 0.25) seatRisk = "medium";
    else seatRisk = "low";
  }

  const session =
    String(record.session ?? "").trim() ||
    (startHour < 12 ? "morning" : "afternoon");

  return {
    classId,
    courseCode,
    courseNameVi: String(record.courseNameVi ?? record["Tên_HP"] ?? record["Ten_HP"] ?? courseCode).trim(),
    courseNameEn: String(record.courseNameEn ?? record["Tên_HP_Tiếng_Anh"] ?? record["Ten_HP_Tieng_Anh"] ?? courseCode).trim(),
    credits: safeNum(record.credits, 0),
    day: normalizeDay(record.day ?? record["Thứ"] ?? record["Thu"]),
    startHour,
    endHour,
    room: String(record.room ?? record["Phòng"] ?? record["Phong"] ?? "").trim(),
    enrolled,
    capacity,
    slotsRemaining,
    session,
    semester: String(record.semester ?? record["Kỳ"] ?? record["Ky"] ?? "20252").trim(),
    seatRisk: (seatRisk === "high" || seatRisk === "medium" || seatRisk === "low" ? seatRisk : "medium") as "high" | "medium" | "low",
  };
}

const normalizedCourses = (coursesData as GenericRecord[])
  .map(normalizeCourse)
  .filter((c): c is NonNullable<typeof c> => c !== null);

const normalizedSchedule: NormalizedScheduleEntry[] = (scheduleData as GenericRecord[])
  .map(normalizeScheduleEntry)
  .filter((s): s is NonNullable<typeof s> => s !== null);

// ── Tool 1: Get Student Profile ──

export const getStudentProfileTool = tool(
  async () => {
    return JSON.stringify({
      ...studentData,
      _citation: {
        type: "sis",
        title: "Hồ sơ sinh viên — HUST dk-sis",
        detail: `${studentData.name} (${studentData.id}), ${studentData.major} năm ${studentData.year}, GPA ${studentData.gpa}. Đã hoàn thành: ${studentData.completedCourses.join(", ")}.`,
      },
    });
  },
  {
    name: "get_student_profile",
    description:
      "Lấy thông tin sinh viên: mã SV, ngành, năm, GPA, môn đã hoàn thành, preferences, bạn cùng nhóm. Gọi đầu tiên để hiểu context sinh viên.",
    schema: z.object({}),
  }
);

// ── Tool 2: Search Courses ──

export const searchCoursesTool = tool(
  async ({ query }: { query?: string }) => {
    let results = normalizedCourses;
    if (query) {
      const q = query.toLowerCase();
      results = normalizedCourses.filter(
        (c) =>
          c.code.toLowerCase().includes(q) ||
          c.nameVi.toLowerCase().includes(q) ||
          c.nameEn.toLowerCase().includes(q)
      );
    }
    return JSON.stringify({
      courses: results,
      total: results.length,
      semester: "20252",
      _citation: {
        type: "sis",
        title: "Danh mục môn học HK 20252 — HUST dk-sis",
        detail: `Tìm thấy ${results.length} môn học${query ? ` cho "${query}"` : ""}. Nguồn: Hệ thống đăng ký tín chỉ HUST.`,
      },
    });
  },
  {
    name: "search_courses",
    description:
      "Tìm kiếm các môn học có sẵn trong HK 20252. Có thể lọc theo mã môn hoặc từ khóa tên môn.",
    schema: z.object({
      query: z
        .string()
        .optional()
        .describe(
          "Từ khóa tìm kiếm (mã môn hoặc tên môn, ví dụ: 'IT3010E' hoặc 'cấu trúc dữ liệu')"
        ),
    }),
  }
);

// ── Tool 3: Check Schedule ──

export const checkScheduleTool = tool(
  async ({ course_codes }: { course_codes: string[] }) => {
    const sections = normalizedSchedule.filter((s) =>
      course_codes.includes(s.courseCode)
    );
    const now = new Date().toLocaleString("vi-VN");
    const summary = sections.map((s) => {
      const slotsRemaining = s.slotsRemaining ?? (s.capacity - s.enrolled);
      return {
        classId: s.classId,
        courseCode: s.courseCode,
        name: s.courseNameVi,
        day: s.day,
        time: normalizeTimeLabel(s.startHour, s.endHour),
        room: s.room,
        seats: `${s.enrolled}/${s.capacity}`,
        slotsRemaining,
        seatRisk: s.seatRisk,
        session: s.session,
      };
    });

    const highRisk = sections.filter((s) => s.seatRisk === "high");
    const criticalSlots = summary.filter((s) => s.slotsRemaining <= 5);
    return JSON.stringify({
      sections: summary,
      total: summary.length,
      highRiskCount: highRisk.length,
      criticalSlotsCount: criticalSlots.length,
      timestamp: now,
      _citation: {
        type: "sis",
        title: `Dữ liệu chỗ ngồi HK 20252 — dk-sis (${now})`,
        detail: `${summary.length} lớp cho ${course_codes.join(", ")}. ${highRisk.length > 0 ? `⚠ ${highRisk.length} lớp nguy cơ hết chỗ.` : "Tất cả còn chỗ."} ${criticalSlots.length > 0 ? `${criticalSlots.length} lớp còn dưới 5 chỗ!` : ""} Cập nhật: ${now}.`,
      },
    });
  },
  {
    name: "check_schedule",
    description:
      "Xem lịch các lớp học (class sections) cho một hoặc nhiều mã môn. Trả về thời gian, phòng, số chỗ đã đăng ký/sức chứa, mức rủi ro hết chỗ.",
    schema: z.object({
      course_codes: z
        .array(z.string())
        .describe(
          "Danh sách mã môn cần kiểm tra, ví dụ: ['IT3010E', 'IT3020E']"
        ),
    }),
  }
);

// ── Tool 4: Check Prerequisites ──

export const checkPrerequisitesTool = tool(
  async ({ course_codes }: { course_codes: string[] }) => {
    const prereqs = prerequisitesData as Record<
      string,
      { required?: string[]; recommended?: string[]; note?: string }
    >;
    const completed = studentData.completedCourses;

    const results = course_codes.map((code) => {
      const req = prereqs[code];
      if (!req)
        return {
          course: code,
          ok: true,
          missing: [],
          recommended: [],
          note: "Không có dữ liệu tiên quyết",
        };
      const required = Array.isArray(req.required) ? req.required : [];
      const recommended = Array.isArray(req.recommended) ? req.recommended : [];
      const missing = required.filter((r) => !completed.includes(r));
      const recMissing = recommended.filter((r) => !completed.includes(r));
      return {
        course: code,
        ok: missing.length === 0,
        missing,
        recommendedMissing: recMissing,
        note: req.note ?? "",
      };
    });

    const allOk = results.every((r) => r.ok);
    const failedCourses = results.filter((r) => !r.ok);

    return JSON.stringify({
      allOk,
      results,
      studentCompleted: completed,
      _citation: {
        type: "prerequisite",
        title: "Kiểm tra điều kiện tiên quyết — HUST dk-sis",
        detail: allOk
          ? `Sinh viên đã hoàn thành: ${completed.join(", ")}. Tất cả điều kiện tiên quyết cho ${course_codes.join(", ")} đều đáp ứng.`
          : `Thiếu tiên quyết: ${failedCourses.map((f) => `${f.course} (cần: ${f.missing.join(", ")})`).join("; ")}.`,
      },
    });
  },
  {
    name: "check_prerequisites",
    description:
      "Kiểm tra điều kiện tiên quyết cho danh sách môn mục tiêu dựa trên hồ sơ sinh viên. Trả về môn nào thiếu tiên quyết.",
    schema: z.object({
      course_codes: z
        .array(z.string())
        .describe("Danh sách mã môn cần kiểm tra tiên quyết"),
    }),
  }
);

// ── Tool 5: Generate Schedule ──

function hasTimeConflict(a: ScheduleEntry, b: ScheduleEntry): boolean {
  if (a.day !== b.day) return false;
  return a.startHour < b.endHour && b.startHour < a.endHour;
}

export const generateScheduleTool = tool(
  async ({
    target_courses,
    avoid_morning = false,
    avoid_afternoon = false,
    prefer_group_friends = false,
  }: {
    target_courses: string[];
    avoid_morning?: boolean;
    avoid_afternoon?: boolean;
    prefer_group_friends?: boolean;
  }) => {
    const sectionsByCourse: Record<string, NormalizedScheduleEntry[]> = {};
    for (const code of target_courses) {
      let sections = normalizedSchedule.filter((s) => s.courseCode === code);
      if (avoid_morning) sections = sections.filter((s) => s.startHour >= 9.5);
      if (avoid_afternoon) sections = sections.filter((s) => s.startHour < 14);
      sectionsByCourse[code] = sections;
    }

    function scorePlan(plan: NormalizedScheduleEntry[]): number {
      let score = 100;
      for (const s of plan) {
        const ratio = s.enrolled / s.capacity;
        if (ratio > 0.95) score -= 20;
        else if (ratio > 0.85) score -= 10;
        else if (ratio > 0.7) score -= 5;
        if (prefer_group_friends && s.enrolled > 80) score += 5;
      }
      return score;
    }

    function buildPlan(preferLowRisk: boolean): NormalizedScheduleEntry[] | null {
      const plan: NormalizedScheduleEntry[] = [];
      for (const code of target_courses) {
        let candidates = sectionsByCourse[code] || [];
        if (candidates.length === 0) continue;

        candidates = [...candidates].sort((a, b) =>
          preferLowRisk
            ? a.enrolled / a.capacity - b.enrolled / b.capacity
            : b.enrolled / b.capacity - a.enrolled / a.capacity
        );

        let placed = false;
        for (const candidate of candidates) {
          if (!plan.some((p) => hasTimeConflict(p, candidate))) {
            plan.push(candidate);
            placed = true;
            break;
          }
        }
        if (!placed) {
          for (const candidate of candidates) {
            if (!plan.some((p) => hasTimeConflict(p, candidate))) {
              plan.push(candidate);
              break;
            }
          }
        }
      }
      return plan.length === target_courses.length ? plan : null;
    }

    const planA = buildPlan(true);
    const planB = buildPlan(false);

    const formatPlan = (plan: NormalizedScheduleEntry[] | null) =>
      plan?.map((s) => ({
        code: s.courseCode,
        name: s.courseNameVi,
        day: s.day,
        startHour: s.startHour,
        endHour: s.endHour,
        room: s.room,
        enrolled: s.enrolled,
        capacity: s.capacity,
        seats: `${s.enrolled}/${s.capacity}`,
        slotsRemaining: s.capacity - s.enrolled,
        seatRisk: s.seatRisk,
        classId: s.classId,
      })) ?? null;

    return JSON.stringify({
      planA: formatPlan(planA),
      planB: formatPlan(planB),
      planAScore: planA ? scorePlan(planA) : 0,
      planBScore: planB ? scorePlan(planB) : 0,
      targetCourses: target_courses,
      constraints: { avoid_morning, avoid_afternoon, prefer_group_friends },
      _citation: {
        type: "sis",
        title: "Thuật toán xếp lịch — BKAgent Scheduler",
        detail: `Đã tạo ${planA ? "Plan A" : ""}${planA && planB ? " + " : ""}${planB ? "Plan B" : ""} cho ${target_courses.join(", ")}. Dữ liệu: TKB20252-FULL, ${scheduleData.length} lớp.`,
      },
    });
  },
  {
    name: "generate_schedule",
    description:
      "Tự động tạo Plan A (tối ưu) và Plan B (dự phòng) từ danh sách môn mục tiêu. Xét ràng buộc: không xung đột thời gian, ưu tiên chỗ ngồi còn nhiều, tuân thủ preferences sinh viên.",
    schema: z.object({
      target_courses: z
        .array(z.string())
        .describe("Danh sách mã môn cần xếp lịch"),
      avoid_morning: z
        .boolean()
        .optional()
        .describe("Tránh lớp buổi sáng (trước 9h30)"),
      avoid_afternoon: z
        .boolean()
        .optional()
        .describe("Tránh lớp buổi chiều (sau 14h)"),
      prefer_group_friends: z
        .boolean()
        .optional()
        .describe("Ưu tiên lớp đông (khả năng cao cùng nhóm bạn)"),
    }),
  }
);

// ── Tool 6: Get Recommended Courses from Curriculum ──

type CurriculumEntry = {
  ma_hp: string;
  ten_hp: string;
  ky_hoc: number | null;
  bat_buoc: boolean | string;
  tc_dt: number;
  ghi_chu_loai_hp: string | null;
};

export const getRecommendedCoursesTool = tool(
  async () => {
    const student = studentData;
    // Map year + current semester to curriculum semester number
    // "20252" = spring semester → year 2 spring = semester 4
    const semCode = student.currentSemester ?? "20252";
    const isSpring = semCode.endsWith("2");
    const semNum = student.year === 1
      ? (isSpring ? 2 : 1)
      : student.year === 2
        ? (isSpring ? 4 : 3)
        : student.year * 2;

    const curriculum = (curriculumData as GenericRecord[])
      .map((c) => ({
        ma_hp: String(c.ma_hp ?? c.code ?? "").trim(),
        ten_hp: String(c.ten_hp ?? c.nameVi ?? c.name ?? "").trim(),
        ky_hoc: c.ky_hoc == null ? null : safeNum(c.ky_hoc, 0),
        bat_buoc: c.bat_buoc,
        tc_dt: safeNum(c.tc_dt ?? c.credits, 0),
        ghi_chu_loai_hp: c.ghi_chu_loai_hp == null ? null : String(c.ghi_chu_loai_hp),
      }))
      .filter((c) => c.ma_hp.length > 0) as CurriculumEntry[];

    const toRequirement = (v: CurriculumEntry["bat_buoc"]) => {
      if (v === true || String(v).toLowerCase() === "true" || String(v) === "1") return "mandatory";
      if (v === false || String(v).toLowerCase() === "false" || String(v) === "0") return "optional";
      if (String(v).toLowerCase() === "chon_module") return "module";
      return "optional";
    };

    const mandatory = curriculum.filter((c) => c.ky_hoc === semNum && toRequirement(c.bat_buoc) === "mandatory");
    const optional = curriculum.filter((c) => c.ky_hoc === semNum && toRequirement(c.bat_buoc) === "optional");
    const moduleChoice = curriculum.filter((c) => c.ky_hoc === semNum && toRequirement(c.bat_buoc) === "module");

    // Filter out already completed courses
    const completed = student.completedCourses;
    const mandatoryPending = mandatory.filter((c) => !completed.includes(c.ma_hp));

    return JSON.stringify({
      semNum,
      studentYear: student.year,
      currentSemester: semCode,
      mandatoryPending: mandatoryPending.map((c) => ({
        code: c.ma_hp,
        name: c.ten_hp,
        credits: c.tc_dt,
        type: c.ghi_chu_loai_hp,
      })),
      mandatory: mandatory.map((c) => ({ code: c.ma_hp, name: c.ten_hp, credits: c.tc_dt })),
      optional: optional.map((c) => ({ code: c.ma_hp, name: c.ten_hp, credits: c.tc_dt })),
      moduleChoice: moduleChoice.map((c) => ({ code: c.ma_hp, name: c.ten_hp, credits: c.tc_dt, note: c.ghi_chu_loai_hp })),
      totalMandatoryCredits: mandatoryPending.reduce((s, c) => s + (c.tc_dt || 0), 0),
      _citation: {
        type: "sis",
        title: `CTĐT CTTT — Học kỳ ${semNum} (HK ${semCode})`,
        detail: `Sinh viên năm ${student.year}: ${mandatoryPending.length} môn bắt buộc chưa học (${mandatoryPending.map((c) => c.ma_hp).join(", ")}). Nguồn: Chương trình đào tạo CTTT HUST.`,
      },
    });
  },
  {
    name: "get_recommended_courses",
    description:
      "Lấy danh sách môn học gợi ý theo chương trình đào tạo (CTĐT) của sinh viên cho học kỳ hiện tại. Gọi khi sinh viên chưa nêu môn cụ thể.",
    schema: z.object({}),
  }
);

// ── Export all tools ──

export const allTools = [
  getStudentProfileTool,
  getRecommendedCoursesTool,
  searchCoursesTool,
  checkScheduleTool,
  checkPrerequisitesTool,
  generateScheduleTool,
];
