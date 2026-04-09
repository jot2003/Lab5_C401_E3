import rawStudentData from "@/lib/mock/student.json";

export type StudentProfile = {
  id: string;
  name: string;
  major: string;
  program?: string;
  year: number;
  gpa: number;
  currentSemester: string;
  completedCourses: string[];
  inProgressCourses: string[];
  targetCourses: string[];
  preferences: {
    avoidMorning: boolean;
    avoidAfternoon: boolean;
    preferGroupFriends: boolean;
    priorityDays: string[];
    maxCreditsPerSemester: number;
  };
  groupFriends: Array<{ id: string; name: string }>;
  advisorId: string;
  advisorName: string;
};

type CurrentSchemaDataset = StudentProfile & {
  currentStudentId?: string;
  students: StudentProfile[];
};

const studentDataset = rawStudentData as CurrentSchemaDataset;

function toStudents(): StudentProfile[] {
  return studentDataset.students || [];
}

export function getAllStudents(): StudentProfile[] {
  return toStudents();
}

export function getCurrentStudentId(): string {
  return studentDataset.currentStudentId || toStudents()[0]?.id || "";
}

export function getStudentById(studentId: string): StudentProfile | null {
  const students = toStudents();
  return students.find((s) => s.id === studentId) || null;
}

export function getCurrentStudent(): StudentProfile {
  const students = toStudents();
  const currentId = getCurrentStudentId();
  return students.find((s) => s.id === currentId) || students[0];
}
