import { tool } from "@langchain/core/tools";
import { z } from "zod";
import scheduleData from "../mock/schedule.json";
import coursesData from "../mock/courses.json";
import prerequisitesData from "../mock/prerequisites.json";
import studentData from "../mock/student.json";

type ScheduleEntry = (typeof scheduleData)[number];

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
    let results = coursesData;
    if (query) {
      const q = query.toLowerCase();
      results = coursesData.filter(
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
    const sections = scheduleData.filter((s) =>
      course_codes.includes(s.courseCode)
    );
    const summary = sections.map((s) => ({
      classId: s.classId,
      courseCode: s.courseCode,
      name: s.courseNameVi,
      day: s.day,
      time: `${s.startHour}:00–${s.endHour > Math.floor(s.endHour) ? Math.floor(s.endHour) + ":30" : s.endHour + ":00"}`,
      room: s.room,
      seats: `${s.enrolled}/${s.capacity}`,
      seatRisk: s.seatRisk,
      session: s.session,
    }));

    const highRisk = sections.filter((s) => s.seatRisk === "high");
    return JSON.stringify({
      sections: summary,
      total: summary.length,
      highRiskCount: highRisk.length,
      timestamp: new Date().toLocaleString("vi-VN"),
      _citation: {
        type: "sis",
        title: "Dữ liệu SIS HK 20252 — lịch và chỗ ngồi",
        detail: `${summary.length} lớp cho ${course_codes.join(", ")}. ${highRisk.length > 0 ? `⚠ ${highRisk.length} lớp gần đầy.` : "Tất cả còn chỗ."} Cập nhật: ${new Date().toLocaleString("vi-VN")}.`,
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
      { required: string[]; recommended: string[]; note: string }
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
      const missing = req.required.filter((r) => !completed.includes(r));
      const recMissing = req.recommended.filter((r) => !completed.includes(r));
      return {
        course: code,
        ok: missing.length === 0,
        missing,
        recommendedMissing: recMissing,
        note: req.note,
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
    const sectionsByCourse: Record<string, ScheduleEntry[]> = {};
    for (const code of target_courses) {
      let sections = scheduleData.filter((s) => s.courseCode === code);
      if (avoid_morning) sections = sections.filter((s) => s.startHour >= 9.5);
      if (avoid_afternoon) sections = sections.filter((s) => s.startHour < 14);
      sectionsByCourse[code] = sections;
    }

    function scorePlan(plan: ScheduleEntry[]): number {
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

    function buildPlan(preferLowRisk: boolean): ScheduleEntry[] | null {
      const plan: ScheduleEntry[] = [];
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

    const formatPlan = (plan: ScheduleEntry[] | null) =>
      plan?.map((s) => ({
        code: s.courseCode,
        name: s.courseNameVi,
        day: s.day,
        startHour: s.startHour,
        endHour: s.endHour,
        room: s.room,
        seats: `${s.enrolled}/${s.capacity}`,
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

// ── Export all tools ──

export const allTools = [
  getStudentProfileTool,
  searchCoursesTool,
  checkScheduleTool,
  checkPrerequisitesTool,
  generateScheduleTool,
];
