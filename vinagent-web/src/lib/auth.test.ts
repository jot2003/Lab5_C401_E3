import { beforeEach, describe, expect, it } from "vitest";

import {
  getCurrentStudent,
  getStudentById,
  loginAccount,
  logoutAccount,
  registerAccount,
  verifyCurrentStudent,
} from "./auth";

describe("auth login/register flows", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("registers a valid student id", () => {
    const result = registerAccount("20210001", "secret123");
    expect(result.ok).toBe(true);
  });

  it("rejects unknown student id at register", () => {
    const result = registerAccount("unknown-id", "secret123");
    expect(result.ok).toBe(false);
    expect(result.message).toMatch(/Không tìm thấy người dùng/i);
  });

  it("logs in after successful register", () => {
    registerAccount("20210001", "secret123");

    const result = loginAccount("20210001", "secret123");
    expect(result.ok).toBe(true);

    const student = getCurrentStudent();
    expect(student?.id).toBe("20210001");
  });

  it("fails login with wrong password", () => {
    registerAccount("20210001", "secret123");

    const result = loginAccount("20210001", "wrong-password");
    expect(result.ok).toBe(false);
    expect(result.message).toMatch(/Mật khẩu không chính xác/i);
  });

  it("verifies current logged-in student against source data", () => {
    registerAccount("20210001", "secret123");
    loginAccount("20210001", "secret123");

    const result = verifyCurrentStudent();
    expect(result.ok).toBe(true);
  });

  it("clears session on logout", () => {
    registerAccount("20210001", "secret123");
    loginAccount("20210001", "secret123");

    logoutAccount();
    expect(getCurrentStudent()).toBeNull();
  });

  it("can find student from mock source", () => {
    const student = getStudentById("20210001");
    expect(student).not.toBeNull();
    expect(student?.name).toBe("Nguyễn Văn An");
  });
});
