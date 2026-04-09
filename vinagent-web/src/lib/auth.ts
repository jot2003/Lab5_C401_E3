import {
  getStudentById as getStudentByIdFromData,
  type StudentProfile,
} from "@/lib/student-data";

const SESSION_KEY = "bkagent.currentUser";

export type AuthResult = {
  ok: boolean;
  message: string;
};

function isBrowser() {
  return typeof window !== "undefined";
}

export function getStudentById(studentId: string): StudentProfile | null {
  return getStudentByIdFromData(studentId);
}

function normalizeName(name: string): string {
  return name
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .toLowerCase();
}

export function loginAccount(studentId: string, studentName: string): AuthResult {
  const normalizedId = studentId.trim();
  const normalizedName = normalizeName(studentName);

  if (!normalizedId || !normalizedName) {
    return { ok: false, message: "Vui lòng nhập đầy đủ mã sinh viên và họ tên." };
  }

  const student = getStudentById(normalizedId);
  if (!student) {
    return { ok: false, message: "Mã sinh viên không tồn tại trong hệ thống HUST." };
  }

  if (normalizeName(student.name) !== normalizedName) {
    return { ok: false, message: "Họ tên không khớp với mã sinh viên. Vui lòng kiểm tra lại." };
  }

  if (isBrowser()) {
    window.localStorage.setItem(SESSION_KEY, normalizedId);
  }

  return { ok: true, message: "Đăng nhập thành công. Xin chào, " + student.name + "!" };
}

export function logoutAccount() {
  if (!isBrowser()) return;
  window.localStorage.removeItem(SESSION_KEY);
}

export function getCurrentStudent(): StudentProfile | null {
  if (!isBrowser()) return null;
  const currentId = window.localStorage.getItem(SESSION_KEY);
  if (!currentId) return null;
  return getStudentById(currentId);
}

export function verifyCurrentStudent(): AuthResult {
  const student = getCurrentStudent();
  if (!student) {
    return { ok: false, message: "Chưa có phiên đăng nhập hợp lệ." };
  }

  const source = getStudentById(student.id);
  const valid = Boolean(source && source.name === student.name);
  if (!valid) {
    return { ok: false, message: "Thông tin người dùng không khớp dữ liệu gốc." };
  }

  return { ok: true, message: "Xác thực thành công. Dữ liệu hợp lệ với hệ thống HUST." };
}
