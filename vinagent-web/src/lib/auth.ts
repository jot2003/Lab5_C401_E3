import {
  getStudentById as getStudentByIdFromData,
  type StudentProfile,
} from "@/lib/student-data";

const ACCOUNTS_KEY = "vinagent.accounts";
const SESSION_KEY = "vinagent.currentUser";

type StoredAccount = {
  studentId: string;
  password: string;
  createdAt: string;
};

export type AuthResult = {
  ok: boolean;
  message: string;
};

function isBrowser() {
  return typeof window !== "undefined";
}

function readAccounts(): StoredAccount[] {
  if (!isBrowser()) return [];
  const raw = window.localStorage.getItem(ACCOUNTS_KEY);
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (item): item is StoredAccount =>
        typeof item?.studentId === "string" &&
        typeof item?.password === "string" &&
        typeof item?.createdAt === "string",
    );
  } catch {
    return [];
  }
}

function writeAccounts(accounts: StoredAccount[]) {
  if (!isBrowser()) return;
  window.localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(accounts));
}

export function getStudentById(studentId: string): StudentProfile | null {
  return getStudentByIdFromData(studentId);
}

export function registerAccount(studentId: string, password: string): AuthResult {
  const normalizedId = studentId.trim();

  if (!normalizedId || !password) {
    return { ok: false, message: "Vui lòng nhập đầy đủ mã sinh viên và mật khẩu." };
  }

  if (password.length < 6) {
    return { ok: false, message: "Mật khẩu phải có ít nhất 6 ký tự." };
  }

  const student = getStudentById(normalizedId);
  if (!student) {
    return { ok: false, message: "Không tìm thấy người dùng trong student.json." };
  }

  const accounts = readAccounts();
  const existed = accounts.some((acc) => acc.studentId === normalizedId);
  if (existed) {
    return { ok: false, message: "Tài khoản đã tồn tại. Hãy đăng nhập." };
  }

  const nextAccounts = [
    ...accounts,
    { studentId: normalizedId, password, createdAt: new Date().toISOString() },
  ];
  writeAccounts(nextAccounts);

  return { ok: true, message: "Đăng ký thành công. Bạn có thể đăng nhập ngay." };
}

export function loginAccount(studentId: string, password: string): AuthResult {
  const normalizedId = studentId.trim();
  if (!normalizedId || !password) {
    return { ok: false, message: "Vui lòng nhập đầy đủ mã sinh viên và mật khẩu." };
  }

  const student = getStudentById(normalizedId);
  if (!student) {
    return { ok: false, message: "Mã sinh viên không tồn tại trong student.json." };
  }

  const accounts = readAccounts();
  const account = accounts.find((acc) => acc.studentId === normalizedId);
  if (!account) {
    return { ok: false, message: "Chưa có tài khoản. Vui lòng đăng ký trước." };
  }

  if (account.password !== password) {
    return { ok: false, message: "Mật khẩu không chính xác." };
  }

  if (isBrowser()) {
    window.localStorage.setItem(SESSION_KEY, normalizedId);
  }

  return { ok: true, message: "Đăng nhập thành công." };
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

  return { ok: true, message: "Đối chiếu thành công với dữ liệu trong student.json." };
}
